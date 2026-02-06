import logging
import re
import urllib.parse

import httpx
from config import settings
from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from middleware.rate_limit import RateLimitMiddleware
from models import ErrorResponse, InfoRequest
from services.downloader import extract_video_info

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AnyVid Downloader API",
    description="Universal video downloader backend powered by yt-dlp",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=[
        "Content-Disposition",
        "Content-Length",
        "Content-Range",
        "Accept-Ranges",
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
    ],
)

# Rate limiting
app.add_middleware(RateLimitMiddleware)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "anyvid-api"}


@app.post("/api/info")
async def get_video_info(request: InfoRequest):
    try:
        result = await extract_video_info(request.url)
        return result
    except ValueError as e:
        error_msg = str(e)
        error_type = "extraction_error"

        lower_msg = error_msg.lower()
        if "private" in lower_msg:
            error_type = "private_video"
        elif "age" in lower_msg or "sign in" in lower_msg or "login" in lower_msg:
            error_type = "age_restricted"
        elif "not supported" in lower_msg or "unsupported" in lower_msg:
            error_type = "unsupported_site"
        elif "unavailable" in lower_msg or "removed" in lower_msg:
            error_type = "unavailable"
        elif "copyright" in lower_msg:
            error_type = "copyright"
        elif "timed out" in lower_msg or "timeout" in lower_msg:
            error_type = "timeout"
        elif "geo" in lower_msg or "country" in lower_msg:
            error_type = "geo_restricted"

        return JSONResponse(
            status_code=400,
            content=ErrorResponse(
                error=error_msg,
                error_type=error_type,
            ).model_dump(),
        )
    except Exception:
        logger.exception("Unexpected error in /api/info")
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error="An unexpected error occurred. Please try again.",
                error_type="server_error",
            ).model_dump(),
        )


def _sanitize_filename(name: str) -> str:
    """Sanitize a filename, removing unsafe characters."""
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name)
    name = name.strip(". ")
    if not name:
        name = "download"
    if len(name) > 200:
        name = name[:200]
    return name


@app.get("/api/download")
async def download_proxy(
    request: Request,
    url: str = Query(
        ..., min_length=5, max_length=4096, description="Direct format URL"
    ),
    filename: str = Query("video", max_length=250, description="Desired filename"),
    ext: str = Query("mp4", max_length=10, description="File extension"),
):
    """
    Proxy a download stream from the direct format URL.
    Supports HTTP range requests for resumable downloads and seeking.
    """
    decoded_url = urllib.parse.unquote(url)

    if not re.match(r"^https?://", decoded_url, re.IGNORECASE):
        return JSONResponse(
            status_code=400,
            content=ErrorResponse(
                error="Invalid download URL.",
                error_type="invalid_url",
            ).model_dump(),
        )

    safe_filename = _sanitize_filename(filename)
    full_filename = f"{safe_filename}.{ext}"

    # Build upstream request headers, forwarding range if present
    upstream_headers: dict[str, str] = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Encoding": "identity",
    }

    range_header = request.headers.get("range")
    if range_header:
        upstream_headers["Range"] = range_header

    try:
        client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=15.0, read=120.0, write=30.0, pool=30.0),
            follow_redirects=True,
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=5),
        )

        upstream_response = await client.send(
            client.build_request("GET", decoded_url, headers=upstream_headers),
            stream=True,
        )

        if upstream_response.status_code >= 400:
            await upstream_response.aclose()
            await client.aclose()
            return JSONResponse(
                status_code=502,
                content=ErrorResponse(
                    error="Failed to fetch file from source. The link may have expired.",
                    error_type="upstream_error",
                ).model_dump(),
            )

        response_headers: dict[str, str] = {
            "Content-Disposition": f'attachment; filename="{full_filename}"',
            "Accept-Ranges": "bytes",
            "Access-Control-Expose-Headers": "Content-Disposition, Content-Length, Content-Range, Accept-Ranges",
        }

        # Forward content headers from upstream
        content_length = upstream_response.headers.get("content-length")
        if content_length:
            response_headers["Content-Length"] = content_length

        content_range = upstream_response.headers.get("content-range")
        if content_range:
            response_headers["Content-Range"] = content_range

        content_type = upstream_response.headers.get(
            "content-type", "application/octet-stream"
        )

        status_code = upstream_response.status_code

        async def stream_content():
            try:
                async for chunk in upstream_response.aiter_bytes(
                    chunk_size=settings.DOWNLOAD_CHUNK_SIZE
                ):
                    yield chunk
            finally:
                await upstream_response.aclose()
                await client.aclose()

        return StreamingResponse(
            content=stream_content(),
            status_code=status_code,
            headers=response_headers,
            media_type=content_type,
        )

    except httpx.TimeoutException:
        return JSONResponse(
            status_code=504,
            content=ErrorResponse(
                error="Download timed out. The source server is not responding.",
                error_type="timeout",
            ).model_dump(),
        )
    except httpx.HTTPError as e:
        logger.error(f"HTTP error during download proxy: {e}")
        return JSONResponse(
            status_code=502,
            content=ErrorResponse(
                error="Failed to connect to the download source.",
                error_type="upstream_error",
            ).model_dump(),
        )
    except Exception:
        logger.exception("Unexpected error in /api/download")
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error="An unexpected error occurred during download.",
                error_type="server_error",
            ).model_dump(),
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        log_level="info",
    )

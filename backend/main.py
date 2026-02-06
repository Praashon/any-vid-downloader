import asyncio
import logging
import re
import shutil
import subprocess
import urllib.parse
import os
import uuid

import httpx
from config import settings
from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from middleware.rate_limit import RateLimitMiddleware
from models import ErrorResponse, InfoRequest, CookieRequest
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


@app.post("/api/cookies")
async def update_cookies(request: CookieRequest):
    """
    Update the cookies.txt file for age-restricted content.
    """
    if not settings.COOKIES_PATH:
        # Fallback if not configured env, though we set it in config.py
        # Ideally we should construct a default path if None
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error="Server configuration error: COOKIES_PATH not set.",
                error_type="server_error",
            ).model_dump(),
        )

    try:
        # Ensure directory exists if path contains directories
        directory = os.path.dirname(settings.COOKIES_PATH)
        if directory and not os.path.exists(directory):
            os.makedirs(directory)

        with open(settings.COOKIES_PATH, "w") as f:
            f.write(request.content)
        
        logger.info("Cookies updated via API")
        return {"success": True, "message": "Cookies updated successfully"}
    except Exception as e:
        logger.error(f"Failed to save cookies: {e}")
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error="Failed to save cookies.",
                error_type="server_error",
            ).model_dump(),
        )


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

    # Allow http/https OR our custom merge: scheme
    if not re.match(r"^(https?://|merge:)", decoded_url, re.IGNORECASE):
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
        # Check if it's a special merge URL from our downloader
        if decoded_url.startswith("merge:"):
            # Format: merge:VIDEO_ID+AUDIO_ID:WEBPAGE_URL
            try:
                parts = decoded_url[6:].split(":", 1)
                ids = parts[0]
                webpage_url = parts[1]
                return await stream_ffmpeg_merge(webpage_url, ids, full_filename)
            except Exception:
                logger.exception("Failed to parse merge URL")
                return JSONResponse(
                    status_code=400,
                    content=ErrorResponse(
                        error="Invalid merge URL format.",
                        error_type="invalid_url",
                    ).model_dump(),
                )

        # Standard Proxy Logic
        # (Re-use client if still open or create new one if closed/needed)
        if client.is_closed:
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

        encoded_filename = urllib.parse.quote(full_filename)
        response_headers: dict[str, str] = {
            "Content-Disposition": f"attachment; filename*=utf-8''{encoded_filename}",
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



async def resolve_stream_urls(webpage_url: str, format_ids: str) -> tuple[str, str] | None:
    """
    Use yt-dlp -g to resolve the direct HTTP URLs for the given format IDs.
    Returns (video_url, audio_url) or None on failure.
    """
    ytdlp_path = shutil.which("yt-dlp") or "venv/bin/yt-dlp"

    # Command: yt-dlp -g -f [video_id]+[audio_id] [url]
    cmd = [
        ytdlp_path,
        "-g",
        "-f", format_ids,
        "--quiet",
        "--no-warnings",
    ]

    if settings.COOKIES_PATH and os.path.exists(settings.COOKIES_PATH):
        cmd.extend(["--cookies", settings.COOKIES_PATH])
        
    cmd.append(webpage_url)
    
    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            logger.error(f"Failed to resolve stream URLs: {stderr.decode()}")
            return None
            
        urls = stdout.decode().strip().split("\n")
        if len(urls) >= 2:
            return (urls[0], urls[1])
        elif len(urls) == 1:
             # Should be 2 for merge, but maybe single stream requested?
             # For merge prefix we expect 2.
             return (urls[0], urls[0])
        else:
            return None

    except Exception as e:
        logger.error(f"Error resolving stream URLs: {e}")
        return None


async def stream_ffmpeg_merge(webpage_url: str, format_ids: str, filename: str):
    """
    Download video and audio separately using yt-dlp to named pipes,
    then use ffmpeg to mux them in real-time.
    This bypasses YouTube throttling by letting yt-dlp handle the network connection.
    """
    logger.info(f"Starting unthrottled pipe merge for {webpage_url} (formats: {format_ids})")
    
    # Parse format IDs (vid+aud)
    try:
        vid_id, aud_id = format_ids.split("+")
    except ValueError:
        return JSONResponse(status_code=400, content={"error": "Invalid format IDs"})

    # Create temporary named pipes
    run_id = uuid.uuid4().hex[:8]
    base_tmp = "/tmp"  # Ensure we use a valid temp dir
    vid_pipe = os.path.join(base_tmp, f"vid_{run_id}.pipe")
    aud_pipe = os.path.join(base_tmp, f"aud_{run_id}.pipe")

    try:
        if not os.path.exists(vid_pipe):
            os.mkfifo(vid_pipe)
        if not os.path.exists(aud_pipe):
            os.mkfifo(aud_pipe)
    except OSError as e:
        logger.error(f"Failed to create named pipes: {e}")
        return JSONResponse(status_code=500, content={"error": "Server OS error"})

    # Executables
    ytdlp_path = shutil.which("yt-dlp") or "venv/bin/yt-dlp"
    ffmpeg_path = shutil.which("ffmpeg")

    if not ffmpeg_path:
         return JSONResponse(status_code=500, content={"error": "ffmpeg not found"})

    cookies_args = []
    if settings.COOKIES_PATH and os.path.exists(settings.COOKIES_PATH):
        cookies_args = ["--cookies", settings.COOKIES_PATH]

    # 1. Start Audio Downloader (Background)
    # yt-dlp -f [id] -o [pipe] [url]
    aud_cmd = [ytdlp_path, "-f", aud_id, "-o", aud_pipe, "--quiet", "--no-warnings", *cookies_args, webpage_url]
    aud_process = subprocess.Popen(aud_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

    # 2. Start Video Downloader (Background)
    vid_cmd = [ytdlp_path, "-f", vid_id, "-o", vid_pipe, "--quiet", "--no-warnings", *cookies_args, webpage_url]
    vid_process = subprocess.Popen(vid_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

    # 3. Start FFmpeg Muxer (Reading from pipes)
    # ffmpeg -y -i vid.pipe -i aud.pipe -c copy -movflags frag_keyframe+empty_moov -f mp4 -
    ffmpeg_cmd = [
        ffmpeg_path,
        "-y",
        "-i", vid_pipe,
        "-i", aud_pipe,
        "-c", "copy",
        "-movflags", "frag_keyframe+empty_moov",
        "-f", "mp4",
        "-"
    ]
    
    logger.info(f"FFmpeg command: {' '.join(ffmpeg_cmd)}")

    try:
        ffmpeg_process = subprocess.Popen(
            ffmpeg_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            bufsize=64 * 1024
        )
    except Exception as e:
        logger.error(f"FFmpeg start failed: {e}")
        # Cleanup processes if ffmpeg fails immediately
        aud_process.kill()
        vid_process.kill()
        return JSONResponse(status_code=500, content={"error": "Muxer failed to start"})

    async def stream_cleanup_gen():
        try:
            while True:
                # Read output from ffmpeg stdout
                chunk = await asyncio.get_running_loop().run_in_executor(
                    None, ffmpeg_process.stdout.read, 64 * 1024
                )
                if not chunk:
                    break
                yield chunk
            
            # Wait for completion
            ffmpeg_process.wait()
            aud_process.wait()
            vid_process.wait()

            if ffmpeg_process.returncode != 0:
                err = ffmpeg_process.stderr.read().decode()
                # Broken pipe is normal if client disconnects
                if "Broken pipe" not in err:
                     logger.error(f"FFmpeg error: {err}")

        except Exception as e:
            logger.error(f"Streaming error: {e}")
            ffmpeg_process.kill()
            aud_process.kill()
            vid_process.kill()
        finally:
            # Terminate if still running
            if ffmpeg_process.poll() is None: ffmpeg_process.terminate()
            if aud_process.poll() is None: aud_process.terminate()
            if vid_process.poll() is None: vid_process.terminate()
            
            # Remove pipes
            if os.path.exists(vid_pipe): os.remove(vid_pipe)
            if os.path.exists(aud_pipe): os.remove(aud_pipe)

    encoded_filename = urllib.parse.quote(filename)
    return StreamingResponse(
        content=stream_cleanup_gen(),
        headers={
            "Content-Disposition": f"attachment; filename*=utf-8''{encoded_filename}",
        },
        media_type="video/mp4",
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


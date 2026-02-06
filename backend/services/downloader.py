from __future__ import annotations

import asyncio
import logging
import re
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import yt_dlp
from config import settings
from models import FormatInfo, InfoResponse
from pydantic import ValidationError

logger = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(max_workers=4)


def _build_ydl_opts() -> dict:
    opts: dict = {
        "quiet": True,
        "no_warnings": True,
        "no_color": True,
        "skip_download": True,
        "ignoreerrors": False,
        "geo_bypass": True,
        "socket_timeout": 15,
        "extractor_retries": 2,
        "nocheckcertificate": True,
        # IMPORTANT: When using cookies, yt-dlp might fail if User-Agent doesn't match the one in cookies
        # We purposely leave "user_agent" unspecified so yt-dlp uses its default or we can try to force a generic one.
        # Often it helps to NOT set a custom user agent if we are using cookies.
    }
    if settings.COOKIES_PATH:
        opts["cookiefile"] = settings.COOKIES_PATH
        # Some sites (like Pornhub) are very sensitive to User-Agent mismatch if cookies are present.
        # We can try to force a common browser UA if extraction fails, but standard yt-dlp behavior is usually safer.
    
    if settings.PROXY_URL:
        opts["proxy"] = settings.PROXY_URL
    return opts


def _format_duration(seconds: int | None) -> str:
    if seconds is None or seconds < 0:
        return ""
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"


def _get_quality_label(f: dict[str, Any]) -> str:
    height = f.get("height")
    width = f.get("width")
    fps = f.get("fps")
    abr = f.get("abr")
    tbr = f.get("tbr")
    vcodec = f.get("vcodec") or "none"
    acodec = f.get("acodec") or "none"

    has_video = vcodec != "none" and height is not None
    has_audio = acodec != "none"

    if has_video:
        if height is not None:
            if height >= 2160:
                label = "4K"
            elif height >= 1440:
                label = "1440p"
            elif height >= 1080:
                label = "1080p"
            elif height >= 720:
                label = "720p"
            elif height >= 480:
                label = "480p"
            elif height >= 360:
                label = "360p"
            elif height >= 240:
                label = "240p"
            elif height >= 144:
                label = "144p"
            else:
                label = f"{height}p"
        else:
            label = "Video"

        if fps and fps > 30:
            label += f" {int(fps)}fps"

        return label
    elif has_audio:
        if abr:
            return f"{int(abr)}kbps"
        elif tbr:
            return f"{int(tbr)}kbps"
        return "Audio"
    else:
        return "Unknown"


def _build_format_label(f: dict[str, Any]) -> str:
    vcodec = f.get("vcodec") or "none"
    acodec = f.get("acodec") or "none"
    ext = f.get("ext", "mp4")

    has_video = vcodec != "none" and vcodec is not None
    has_audio = acodec != "none" and acodec is not None

    quality = _get_quality_label(f)

    if has_video and has_audio:
        return f"{quality} {ext.upper()} (Video + Audio)"
    elif has_video:
        return f"{quality} {ext.upper()} (Video Only)"
    elif has_audio:
        return f"Audio {ext.upper()} ({quality})"
    else:
        return f"{quality} {ext.upper()}"


def _sort_key(fmt: FormatInfo) -> tuple:
    """
    Sorting priority:
    1. Merged (video+audio) first, then video-only, then audio-only
    2. Higher resolution first
    3. Higher bitrate first
    """
    if fmt.has_video and fmt.has_audio:
        category = 0
    elif fmt.has_video and not fmt.has_audio:
        category = 1
    else:
        category = 2

    height = fmt.height or 0
    tbr = fmt.tbr or 0
    abr = fmt.abr or 0

    return (category, -height, -tbr, -abr)


def _extract_formats(info: dict[str, Any]) -> list[FormatInfo]:
    raw_formats = info.get("formats") or []
    formats: list[FormatInfo] = []
    seen_labels: set[str] = set()

    for f in raw_formats:
        format_id = f.get("format_id", "")
        url = f.get("url") or f.get("manifest_url") or ""
        if not url:
            continue

        # Skip formats that are fragments/manifests without direct URLs
        protocol = f.get("protocol", "")
        if protocol in ("m3u8", "m3u8_native", "f4m", "f4f", "ism"):
            # We allow m3u8_native as yt-dlp can handle it, but skip others
            if protocol != "m3u8_native":
                continue

        vcodec = f.get("vcodec") or "none"
        acodec = f.get("acodec") or "none"
        height = f.get("height")
        ext = f.get("ext", "mp4")

        has_video = vcodec != "none" and vcodec is not None
        has_audio = acodec != "none" and acodec is not None

        # Skip storyboard/image formats
        if ext in ("mhtml", "json"):
            continue
        if vcodec and "storyboard" in vcodec.lower():
            continue

        label = _build_format_label(f)
        quality = _get_quality_label(f)

        # Deduplicate: keep first occurrence of each label
        dedup_key = f"{label}_{ext}"
        if dedup_key in seen_labels:
            continue
        seen_labels.add(dedup_key)

        fmt = FormatInfo(
            format_id=format_id,
            label=label,
            quality=quality,
            extension=ext,
            filesize=f.get("filesize"),
            filesize_approx=f.get("filesize_approx"),
            is_audio=has_audio and not has_video,
            is_video_only=has_video and not has_audio,
            has_video=has_video,
            has_audio=has_audio,
            height=height,
            width=f.get("width"),
            fps=f.get("fps"),
            vcodec=vcodec if vcodec != "none" else None,
            acodec=acodec if acodec != "none" else None,
            tbr=f.get("tbr"),
            abr=f.get("abr"),
            url=url,
        )
        formats.append(fmt)

    formats.sort(key=_sort_key)
    return formats


def _add_best_merged_format(
    info: dict[str, Any], formats: list[FormatInfo]
) -> list[FormatInfo]:
    """
    Prepend a 'Best Quality' virtual format that tells the download endpoint
    to let yt-dlp pick the best merged format.
    """
    # Prefer original webpage URL for the best format as it allows yt-dlp to pick streams
    best_url = info.get("webpage_url") or info.get("url")
    best_height = None
    best_ext = info.get("ext", "mp4")

    # Attempt to find what the best height might be from available formats
    best_video = None
    best_audio = None
    
    if formats:
        # Separate video-only and audio-only streams
        video_only = [f for f in formats if f.is_video_only and f.format_id]
        audio_only = [f for f in formats if f.is_audio and f.format_id]
        
        # Sort to find best
        # Video: precedence by height, then tbr
        video_only.sort(key=lambda x: (x.height or 0, x.tbr or 0), reverse=True)
        # Audio: precedence by abr
        audio_only.sort(key=lambda x: (x.abr or 0), reverse=True)
        
        if video_only:
            best_video = video_only[0]
        if audio_only:
            best_audio = audio_only[0]

        # Use best video specs for the label
        if best_video:
            best_height = best_video.height
            best_ext = "mp4" # Force container to MP4 for the merged output
    
    if not best_url or not best_video or not best_audio:
        # Fallback to original logic or just return formats if we can't build a merge
        return formats

    # Construct specific merge URL
    # Format: merge:VIDEO_ID+AUDIO_ID:WEBPAGE_URL
    # This allows main.py to resolve the exact streams quickly.
    merge_url = f"merge:{best_video.format_id}+{best_audio.format_id}:{best_url}"

    quality = "Best"
    if best_height:
        if best_height >= 2160:
            quality = "4K"
        elif best_height >= 1440:
            quality = "1440p"
        elif best_height >= 1080:
            quality = "1080p"
        elif best_height >= 720:
            quality = "720p"

    best_format = FormatInfo(
        format_id="best",
        label=f"Best Quality (Merged) {best_ext.upper()}",
        quality=quality,
        extension=best_ext,
        is_audio=False,
        is_video_only=False,
        has_video=True,
        has_audio=True,
        height=best_height,
        url=merge_url,
    )

    return [best_format] + formats


def _sync_extract_info(url: str) -> InfoResponse:
    opts = _build_ydl_opts()

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info: dict[str, Any] | None = ydl.extract_info(url, download=False)  # type: ignore[assignment]
    except yt_dlp.utils.DownloadError as e:  # type: ignore[attr-defined]
        error_msg = str(e)
        # Clean up yt-dlp error messages
        error_msg = re.sub(r"^ERROR:\s*", "", error_msg)
        raise ValueError(error_msg)
    except Exception:
        logger.exception("Unexpected error during extraction")
        raise ValueError("Failed to extract video information")

    if info is None:
        raise ValueError("Could not extract video information from this URL")

    # Handle playlists - take the first entry
    if info.get("_type") == "playlist":
        entries = info.get("entries") or []
        if entries:
            entry: dict[str, Any] | None = entries[0]
            if entry is None:
                raise ValueError("Playlist is empty or entries are unavailable")
            info = entry
        else:
            raise ValueError("Playlist is empty")

    try:
        formats = _extract_formats(info)

        # Build best audio format
        audio_formats = [f for f in formats if f.is_audio]
        video_formats = [f for f in formats if f.has_video]

        # Add best merged if we have separate streams
        if video_formats:
            formats = _add_best_merged_format(info, formats)

        # Build best audio MP3 option using yt-dlp's bestaudio
        if audio_formats or video_formats:
            best_audio_url = ""
            best_abr = 0.0
            for af in audio_formats:
                afbr = af.abr or af.tbr or 0
                if afbr > best_abr:
                    best_abr = afbr
                    best_audio_url = af.url

            if not best_audio_url and formats:
                # Use any format URL; the download endpoint will extract audio
                best_audio_url = formats[0].url

            if best_audio_url:
                mp3_format = FormatInfo(
                    format_id="bestaudio_mp3",
                    label=f"Audio MP3 ({int(best_abr)}kbps)" if best_abr else "Audio MP3",
                    quality=f"{int(best_abr)}kbps" if best_abr else "Audio",
                    extension="mp3",
                    is_audio=True,
                    is_video_only=False,
                    has_video=False,
                    has_audio=True,
                    abr=best_abr if best_abr else None,
                    url=best_audio_url,
                )
                formats.append(mp3_format)

        duration = info.get("duration")
        if isinstance(duration, float):
            duration = int(duration)

        thumbnail = info.get("thumbnail")
        thumbnails = info.get("thumbnails") or []
        if not thumbnail and thumbnails:
            thumbnail = thumbnails[-1].get("url")

        description = info.get("description") or ""
        if len(description) > 300:
            description = description[:300] + "..."

        return InfoResponse(
            success=True,
            title=info.get("title") or info.get("fulltitle") or "Untitled",
            thumbnail=thumbnail,
            duration=duration,
            duration_string=_format_duration(duration),
            uploader=info.get("uploader") or info.get("channel") or "",
            uploader_url=info.get("uploader_url") or info.get("channel_url"),
            webpage_url=info.get("webpage_url") or url,
            view_count=info.get("view_count"),
            upload_date=info.get("upload_date"),
            description=description if description else None,
            extractor=info.get("extractor") or info.get("extractor_key") or "",
            formats=formats,
        )
    except ValidationError as e:
        logger.error(f"Validation error during info processing: {e}")
        raise ValueError("Video data format is invalid or unsupported")
    except Exception as e:
        logger.exception("Unexpected error during info processing")
        raise ValueError("Failed to process video information")


async def extract_video_info(url: str) -> InfoResponse:
    loop = asyncio.get_event_loop()
    try:
        result = await asyncio.wait_for(
            loop.run_in_executor(_executor, _sync_extract_info, url),
            timeout=settings.INFO_TIMEOUT,
        )
        return result
    except asyncio.TimeoutError:
        raise ValueError(
            "Request timed out. The video might be too large or the site is slow."
        )


def get_direct_url(video_url: str, format_id: str) -> dict:
    """
    Re-extract a fresh direct URL for a given format, since URLs can expire.
    Returns dict with 'url', 'ext', 'title' keys.
    """
    opts = _build_ydl_opts()
    opts["format"] = format_id

    with yt_dlp.YoutubeDL(opts) as ydl:
        info: dict[str, Any] | None = ydl.extract_info(video_url, download=False)  # type: ignore[assignment]

    if info is None:
        raise ValueError("Could not re-extract format URL")

    if info.get("_type") == "playlist":
        entries = info.get("entries") or []
        if entries:
            info = entries[0]

    return {
        "url": info.get("url") or "",
        "ext": info.get("ext", "mp4"),
        "title": info.get("title", "video"),
    }

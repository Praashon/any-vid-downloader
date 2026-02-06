import re

from pydantic import BaseModel, Field, field_validator


class InfoRequest(BaseModel):
    url: str = Field(
        ..., min_length=5, max_length=2048, description="Video URL to parse"
    )

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^https?://", v, re.IGNORECASE):
            raise ValueError("URL must start with http:// or https://")
        # Basic sanity check - reject obviously malicious inputs
        if any(c in v for c in ["\n", "\r", "\x00"]):
            raise ValueError("URL contains invalid characters")
        return v


class FormatInfo(BaseModel):
    format_id: str = Field(..., description="yt-dlp format identifier")
    label: str = Field(..., description="Human-readable label like '1080p MP4'")
    quality: str = Field(
        "", description="Quality string like '1080p', '720p', '320kbps'"
    )
    extension: str = Field("mp4", description="File extension")
    filesize: int | None = Field(None, description="File size in bytes, if known")
    filesize_approx: int | None = Field(
        None, description="Approximate file size in bytes"
    )
    is_audio: bool = Field(False, description="Whether this is an audio-only format")
    is_video_only: bool = Field(
        False, description="Whether this is video-only (no audio)"
    )
    has_video: bool = Field(True, description="Whether the format contains video")
    has_audio: bool = Field(True, description="Whether the format contains audio")
    height: int | None = Field(None, description="Video height in pixels")
    width: int | None = Field(None, description="Video width in pixels")
    fps: float | None = Field(None, description="Frames per second")
    vcodec: str | None = Field(None, description="Video codec")
    acodec: str | None = Field(None, description="Audio codec")
    tbr: float | None = Field(None, description="Total bitrate in kbps")
    abr: float | None = Field(None, description="Audio bitrate in kbps")
    url: str = Field("", description="Direct download URL")

    @property
    def display_size(self) -> str:
        size = self.filesize or self.filesize_approx
        if size is None:
            return ""
        if size < 1024:
            return f"{size} B"
        elif size < 1024 * 1024:
            return f"{size / 1024:.1f} KB"
        elif size < 1024 * 1024 * 1024:
            return f"{size / (1024 * 1024):.1f} MB"
        else:
            return f"{size / (1024 * 1024 * 1024):.2f} GB"


class InfoResponse(BaseModel):
    success: bool = True
    title: str = Field("", description="Video title")
    thumbnail: str | None = Field(None, description="Thumbnail URL")
    duration: int | None = Field(None, description="Duration in seconds")
    duration_string: str = Field("", description="Human-readable duration like '5:32'")
    uploader: str = Field("", description="Uploader/channel name")
    uploader_url: str | None = Field(None, description="URL to uploader's page")
    webpage_url: str = Field("", description="Original webpage URL")
    view_count: int | None = Field(None, description="View count if available")
    upload_date: str | None = Field(None, description="Upload date as YYYYMMDD")
    description: str | None = Field(None, description="Video description (truncated)")
    extractor: str = Field("", description="Name of the site/extractor used")
    formats: list[FormatInfo] = Field(
        default_factory=list, description="Available formats"
    )


class ErrorResponse(BaseModel):
    success: bool = False
    error: str = Field(..., description="Error message")
    error_type: str = Field("unknown", description="Error category")


class DownloadRequest(BaseModel):
    url: str = Field(..., description="Direct format URL to proxy")
    filename: str = Field("video", description="Desired filename for download")

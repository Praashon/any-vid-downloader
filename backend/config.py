import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
        ).split(",")
        if origin.strip()
    ]

    RATE_LIMIT_RPM: int = int(os.getenv("RATE_LIMIT_RPM", "30"))

    # Path to cookies.txt for age-restricted content
    COOKIES_PATH: str = os.getenv("COOKIES_PATH", "cookies.txt")
    
    PROXY_URL: str | None = os.getenv("PROXY_URL")

    DOWNLOAD_CHUNK_SIZE: int = 64 * 1024  # 64KB chunks for streaming
    INFO_TIMEOUT: int = 30  # seconds to wait for yt-dlp info extraction
    MAX_URL_LENGTH: int = 2048


settings = Settings()

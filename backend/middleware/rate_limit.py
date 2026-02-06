import time
from collections import defaultdict

from config import settings
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple in-memory sliding window rate limiter.
    Limits requests per IP address based on RATE_LIMIT_RPM setting.
    """

    def __init__(self, app):
        super().__init__(app)
        self.rpm = settings.RATE_LIMIT_RPM
        self.window = 60.0  # 1 minute window
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._last_cleanup = time.monotonic()
        self._cleanup_interval = 300.0  # cleanup stale entries every 5 minutes

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()
        if request.client:
            return request.client.host
        return "unknown"

    def _cleanup_stale(self, now: float) -> None:
        if now - self._last_cleanup < self._cleanup_interval:
            return
        self._last_cleanup = now
        stale_keys = []
        for ip, timestamps in self._requests.items():
            if not timestamps or timestamps[-1] < now - self.window:
                stale_keys.append(ip)
        for key in stale_keys:
            del self._requests[key]

    def _is_rate_limited(self, client_ip: str) -> tuple[bool, int]:
        now = time.monotonic()
        self._cleanup_stale(now)

        cutoff = now - self.window
        timestamps = self._requests[client_ip]

        # Remove expired timestamps
        while timestamps and timestamps[0] < cutoff:
            timestamps.pop(0)

        if len(timestamps) >= self.rpm:
            retry_after = int(timestamps[0] - cutoff) + 1
            return True, max(retry_after, 1)

        timestamps.append(now)
        remaining = self.rpm - len(timestamps)
        return False, remaining

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Skip rate limiting for health checks and static assets
        path = request.url.path
        if path in ("/health", "/favicon.ico"):
            return await call_next(request)

        # Only rate limit API endpoints
        if not path.startswith("/api/"):
            return await call_next(request)

        client_ip = self._get_client_ip(request)
        is_limited, value = self._is_rate_limited(client_ip)

        if is_limited:
            return Response(
                content='{"success": false, "error": "Rate limit exceeded. Please try again later.", "error_type": "rate_limit"}',
                status_code=429,
                media_type="application/json",
                headers={
                    "Retry-After": str(value),
                    "X-RateLimit-Limit": str(self.rpm),
                    "X-RateLimit-Remaining": "0",
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.rpm)
        response.headers["X-RateLimit-Remaining"] = str(value)
        return response

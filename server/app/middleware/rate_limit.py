"""Simple in-memory rate limiter for login attempts."""
from datetime import datetime, timedelta
from fastapi import HTTPException, Request
from collections import defaultdict
import asyncio


class RateLimiter:
    def __init__(self, max_attempts: int = 5, window_seconds: int = 60):
        self.max_attempts = max_attempts
        self.window = timedelta(seconds=window_seconds)
        self.attempts: dict[str, list[datetime]] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def check(self, key: str):
        async with self._lock:
            now = datetime.utcnow()
            # Clean old attempts
            self.attempts[key] = [t for t in self.attempts[key] if now - t < self.window]

            if len(self.attempts[key]) >= self.max_attempts:
                retry_after = int((self.attempts[key][0] + self.window - now).total_seconds())
                raise HTTPException(
                    status_code=429,
                    detail=f"Terlalu banyak percobaan login. Coba lagi dalam {retry_after} detik.",
                    headers={"Retry-After": str(retry_after)},
                )

            self.attempts[key].append(now)

    async def reset(self, key: str):
        async with self._lock:
            self.attempts.pop(key, None)


# Global rate limiter instance
login_limiter = RateLimiter(max_attempts=5, window_seconds=60)

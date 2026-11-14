"""People first: background analysis yields the single inference lane to interactive requests.

One process, one event loop, so a counter and a timestamp are enough. Background work checks
`background_allowed()` before starting an item; an item already running finishes (a few seconds).
"""
import time
from contextlib import asynccontextmanager

QUIET_SECONDS = 180  # stay out of the way between follow-up questions; the model keeps the project data it just read
_active = 0
_last_finished = 0.0


@asynccontextmanager
async def interactive():
    global _active, _last_finished
    _active += 1
    try:
        yield
    finally:
        _active -= 1
        _last_finished = time.monotonic()


def background_allowed():
    return _active == 0 and time.monotonic() - _last_finished >= QUIET_SECONDS

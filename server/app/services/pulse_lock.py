"""Single-process prototype guard. Not a distributed/multi-worker lock."""
from contextlib import asynccontextmanager

_active_topics: set[str] = set()


class CrawlInProgress(Exception):
    pass


@asynccontextmanager
async def topic_crawl_guard(topic_id: str):
    # No await between check and add: atomic within the server's event loop.
    if topic_id in _active_topics:
        raise CrawlInProgress()
    _active_topics.add(topic_id)
    try:
        yield
    finally:
        _active_topics.discard(topic_id)

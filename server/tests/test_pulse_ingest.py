"""Tests for Pulse ingest helpers."""
from app.services.ingest.rss import parse_rss_feed

SAMPLE_RSS = """<?xml version="1.0"?>
<rss version="2.0"><channel>
<title>Google News</title>
<item>
  <title>TNI gelar bakti sosial di Jakarta</title>
  <link>https://example.com/a</link>
  <pubDate>Fri, 06 Jun 2026 08:00:00 GMT</pubDate>
  <description>Kegiatan bakti sosial berlangsung lancar.</description>
  <source url="https://news.example.com">News Example</source>
</item>
</channel></rss>"""


def test_parse_rss_returns_items():
    items = parse_rss_feed(SAMPLE_RSS)
    assert len(items) == 1
    it = items[0]
    assert it["url"] == "https://example.com/a"
    assert it["title"] == "TNI gelar bakti sosial di Jakarta"
    assert it["source"] == "rss"
    assert it["platform"] == "news"
    assert it["published_at"] is not None


def test_parse_empty_feed():
    assert parse_rss_feed("<rss><channel></channel></rss>") == []


from app.services.ingest.browserless import is_allowed, extract_title, extract_text


def test_is_allowed_empty_allowlist_allows_all():
    assert is_allowed("https://anything.com/x", []) is True


def test_is_allowed_matches_domain_and_subdomain():
    allow = ["example.com"]
    assert is_allowed("https://example.com/a", allow) is True
    assert is_allowed("https://news.example.com/a", allow) is True
    assert is_allowed("https://evil.com/a", allow) is False


def test_extract_title_and_text():
    html = "<html><head><title> Berita TNI </title></head><body><script>x=1</script><p>Isi konten.</p></body></html>"
    assert extract_title(html) == "Berita TNI"
    text = extract_text(html)
    assert "Isi konten." in text
    assert "x=1" not in text


import pytest
from app.models.pulse import WatchTopic, Issue, SourceItem
from app.services.pulse import ingest_items
from sqlalchemy import select


@pytest.fixture
async def topic(db):
    t = WatchTopic(id="topic-1", label="Test", query="tni")
    db.add(t)
    await db.flush()
    return t


@pytest.mark.asyncio
async def test_ingest_groups_near_duplicates(db, topic):
    raws = [
        {"source": "rss", "platform": "news", "url": "https://a.com/1",
         "title": "TNI Gelar Bakti Sosial!", "text": ""},
        {"source": "rss", "platform": "news", "url": "https://b.com/2",
         "title": "tni gelar bakti sosial", "text": ""},
        {"source": "rss", "platform": "news", "url": "https://c.com/3",
         "title": "Harga kopi lokal naik tajam", "text": ""},
    ]
    created = await ingest_items(db, topic, raws)
    assert created == 3
    issues = (await db.execute(select(Issue).where(Issue.topic_id == topic.id))).scalars().all()
    assert len(issues) == 2  # 2 near-dup grouped, 1 distinct
    items = (await db.execute(select(SourceItem))).scalars().all()
    assert len(items) == 3


@pytest.mark.asyncio
async def test_ingest_dedupes_same_url(db, topic):
    raw = {"source": "rss", "platform": "news", "url": "https://a.com/x", "title": "Halo", "text": ""}
    first = await ingest_items(db, topic, [raw])
    second = await ingest_items(db, topic, [raw])
    assert first == 1
    assert second == 0

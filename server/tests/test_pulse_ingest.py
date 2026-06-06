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

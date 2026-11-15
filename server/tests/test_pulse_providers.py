"""Offline provider contracts: never use real credentials or network."""
from datetime import datetime
from types import SimpleNamespace

import httpx
import pytest
from sqlalchemy import select

from app.models.pulse import WatchTopic, SourceItem
from app.services.pulse import ingest_items


@pytest.mark.asyncio
async def test_bootstrap_is_idempotent_and_manual(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    first = await client.post("/api/admin/pulse/bootstrap", headers=h)
    assert first.status_code == 200
    second = await client.post("/api/admin/pulse/bootstrap", headers=h)
    assert first.json() == second.json()
    topics = second.json()["topics"]
    assert [t["label"] for t in topics] == ["GERAK", "Isu Penyadapan Presiden"]
    assert all(t["sources"] == ["rss", "social", "youtube"] and not t["is_active"] for t in topics)


@pytest.mark.asyncio
async def test_new_routes_require_admin(client, user_token):
    for method, path in [("get", "analytics"), ("post", "bootstrap")]:
        assert (await getattr(client, method)(f"/api/admin/pulse/{path}")).status_code == 403
        assert (await getattr(client, method)(f"/api/admin/pulse/{path}", headers={"Authorization": f"Bearer {user_token}"})).status_code == 403


@pytest.mark.asyncio
async def test_analytics_observed_engagement_and_unknown_locations(client, db, admin_token):
    t = WatchTopic(label="Test", query="test")
    db.add(t)
    await db.flush()
    rows = [
        {"source": "youtube", "platform": "youtube", "url": "https://youtube.com/watch?v=a", "author": "A", "published_at": datetime(2026, 1, 2), "metrics": {"views": 999999, "likes": 2, "comments": 1, "location": "Jakarta"}},
        {"source": "xpoz", "platform": "x", "url": "https://x.com/i/status/2", "author": "B", "published_at": datetime(2026, 1, 2), "metrics": {"likes": 5, "comments": 2, "shares": 3}},
    ]
    assert await ingest_items(db, t, rows) == 2
    assert await ingest_items(db, t, rows) == 0
    res = await client.get("/api/admin/pulse/analytics", params={"topic_id": t.id}, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert set(data) == {"total_mentions", "platforms", "timeline", "influencers", "locations", "unknown_location_count", "posts", "metric_totals", "network", "measures"}  # measures: the zone and rule versions (day_v1)
    assert data["total_mentions"] == 2
    assert data["timeline"] == [{"date": "2026-01-02", "count": 2}]
    assert data["platforms"] == [{"platform": "x", "count": 1}, {"platform": "youtube", "count": 1}]
    assert data["influencers"][0] == {"key": "x:b", "author": "B", "platform": "x", "mentions": 1, "engagement": 10, "interaction_posts": 1, "url": "https://x.com/i/status/2"}
    assert data["influencers"][1]["engagement"] == 3
    assert data["locations"] == [] and data["unknown_location_count"] == 2


@pytest.mark.asyncio
async def test_xpoz_one_page_normalization(monkeypatch):
    from app.services.ingest.xpoz import fetch_xpoz_items
    requests = []
    async def respond(request):
        requests.append(request)
        assert request.url.path == "/api/data/twitter/posts/live"
        assert request.url.params["q"] == "GERAK"
        assert "cursor" not in request.url.params
        assert request.headers["authorization"] == "Bearer fake"
        return httpx.Response(200, json={"results": [{"id": "123", "authorUsername": "alice", "text": "GERAK", "createdAt": "2026-01-02T00:00:00Z", "likeCount": 4, "replyCount": 2, "retweetCount": 3, "viewCount": 1000}], "has_more": True, "next_page_cursor": "ignored"})
    original = httpx.AsyncClient
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kw: original(transport=httpx.MockTransport(respond), **kw))
    items = await fetch_xpoz_items("GERAK", "fake")
    assert len(requests) == 1 and len(items) == 1
    assert items[0]["metrics"]["engagement"] == 9
    assert items[0]["metrics"].get("reach", 0) == 0


@pytest.mark.asyncio
async def test_youtube_one_search_one_batch(monkeypatch):
    from app.services.ingest.youtube import fetch_youtube_items
    paths = []
    async def respond(request):
        paths.append(request.url.path)
        assert "key" not in request.url.params
        assert request.headers["x-goog-api-key"] == "fake"
        if request.url.path.endswith("search"):
            assert request.url.params["maxResults"] == "50"
            assert request.url.params["regionCode"] == "ID"
            assert request.url.params["relevanceLanguage"] == "id"
            return httpx.Response(200, json={"items": [{"id": {"videoId": "abc"}}], "nextPageToken": "ignored"})
        assert request.url.params["id"] == "abc"
        return httpx.Response(200, json={"items": [{"id": "abc", "snippet": {"title": "GERAK", "channelTitle": "Author", "channelId": "UC-123", "publishedAt": "2026-01-02T00:00:00Z"}, "statistics": {"viewCount": "9000", "likeCount": "7", "commentCount": "2"}}]})
    original = httpx.AsyncClient
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kw: original(transport=httpx.MockTransport(respond), **kw))
    items = await fetch_youtube_items("GERAK", "fake", pages=1)
    assert paths == ["/youtube/v3/search", "/youtube/v3/videos"]
    # Default is two bounded search pages; a second page with nothing new adds no statistics call.
    paths.clear()
    assert len(await fetch_youtube_items("GERAK", "fake")) == 1
    assert paths == ["/youtube/v3/search", "/youtube/v3/videos", "/youtube/v3/search"]
    assert items[0]["metrics"]["engagement"] == 9
    assert items[0]["metrics"]["views"] == 9000
    assert "reach" not in items[0]["metrics"]
    assert items[0]["metrics"]["author_id"] == "UC-123"


@pytest.mark.asyncio
async def test_paid_gate_errors_and_persisted_run(db, monkeypatch):
    from app.services.pulse import crawl_topic_run
    from app.models.pulse import PulseCrawlRun
    from app.services.ingest import xpoz
    t = WatchTopic(label="Test", query="test", sources=["xpoz", "youtube"])
    db.add(t)
    await db.flush()
    settings = SimpleNamespace(XPOZ_API_KEY="fake", YOUTUBE_API_KEY="", XPOZ_MODE="rest_live")
    async def failed(*args):
        raise RuntimeError("SECRET MUST NOT APPEAR")
    monkeypatch.setattr(xpoz, "fetch_xpoz_items", failed)
    scheduled = await crawl_topic_run(db, t, settings)
    assert scheduled["providers"]["xpoz"]["status"] == "manual_only"
    manual = await crawl_topic_run(db, t, settings, manual=True)
    assert manual["providers"]["xpoz"]["status"] == "error"
    assert manual["providers"]["youtube"]["status"] == "not_configured"
    assert "SECRET" not in str(manual)
    runs = (await db.execute(select(PulseCrawlRun))).scalars().all()
    assert len(runs) == 2 and runs[-1].providers == manual["providers"]


@pytest.mark.asyncio
@pytest.mark.parametrize("sse", [False, True])
async def test_mcp_stored_one_tool_call(monkeypatch, sse):
    import json
    from app.services.ingest.xpoz import fetch_xpoz_stored_items
    methods = []
    async def respond(request):
        assert str(request.url) == "https://mcp.xpoz.ai/mcp"
        message = json.loads(request.content)
        methods.append(message["method"])
        if message["method"] == "initialize":
            return httpx.Response(200, headers={"Mcp-Session-Id": "test-session"}, json={"jsonrpc": "2.0", "id": 1, "result": {"protocolVersion": "2025-03-26", "capabilities": {}, "serverInfo": {"name": "test", "version": "1"}}})
        assert request.headers["mcp-session-id"] == "test-session"
        if message["method"] == "notifications/initialized":
            return httpx.Response(202)
        assert message["method"] == "tools/call"
        assert message["params"]["name"] == "getTwitterPostsByKeywords"
        args = message["params"]["arguments"]
        assert args["query"] == "GERAK" and args["forceLatest"] is False
        assert args["responseType"] == "fast" and args["limit"] == 300
        body = {"jsonrpc": "2.0", "id": 2, "result": {"content": [{"type": "text", "text": json.dumps({"data": [{"id": "123", "text": "GERAK", "authorUsername": "a", "likeCount": 0}]})}]}}
        return httpx.Response(200, headers={"Content-Type": "text/event-stream"}, text="event: message\ndata: " + json.dumps(body) + "\n\n") if sse else httpx.Response(200, json=body)
    original = httpx.AsyncClient
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kw: original(transport=httpx.MockTransport(respond), **kw))
    items = await fetch_xpoz_stored_items("GERAK", "fake")
    assert methods == ["initialize", "notifications/initialized", "tools/call"]
    assert len(items) == 1 and items[0]["metrics"]["engagement"] == 0
    assert "comments" not in items[0]["metrics"]


@pytest.mark.asyncio
async def test_analytics_missing_stats_and_stable_channels(client, db, admin_token):
    t = WatchTopic(label="channels", query="channels")
    db.add(t)
    await db.flush()
    await ingest_items(db, t, [
        {"source": "youtube", "platform": "youtube", "url": "https://youtube.com/1", "author": "Same name", "metrics": {"author_id": "UC1", "likes": 0}},
        {"source": "youtube", "platform": "youtube", "url": "https://youtube.com/2", "author": "Same name", "metrics": {"author_id": "UC2", "views": 999}},
        {"source": "rss", "platform": "news", "url": "https://news.com/3", "author": "News"},
    ])
    res = await client.get("/api/admin/pulse/analytics", params={"topic_id": t.id}, headers={"Authorization": f"Bearer {admin_token}"})
    influencers = res.json()["influencers"]
    assert len(influencers) == 3
    assert influencers[0]["engagement"] == 0
    assert sum(i["engagement"] is None for i in influencers) == 2


def test_settings_server_relative_and_credentials_only(monkeypatch, tmp_path):
    from app import config
    observed = []
    def fake_dotenv(path, **kwargs):
        observed.append(path)
        return {"XPOZ_API_KEY": "fixture-x", "YOUTUBE_API_KEY": "fixture-y", "DATABASE_URL": "must-not-import"}
    monkeypatch.setattr(config, "dotenv_values", fake_dotenv)
    monkeypatch.delenv("XPOZ_API_KEY", raising=False)
    monkeypatch.delenv("YOUTUBE_API_KEY", raising=False)
    monkeypatch.chdir(tmp_path)
    settings = config.Settings(_env_file=None)
    assert observed == [config.SERVER_DIR.parent / "services/listening-api/.env"]
    assert config.Settings.model_config["env_file"] == config.SERVER_DIR / ".env"
    assert settings.XPOZ_API_KEY.get_secret_value() == "fixture-x"
    assert settings.YOUTUBE_API_KEY.get_secret_value() == "fixture-y"
    assert settings.DATABASE_URL != "must-not-import"
    assert "fixture-x" not in repr(settings)
    monkeypatch.setenv("XPOZ_API_KEY", "injected")
    assert config.Settings(_env_file=None).XPOZ_API_KEY.get_secret_value() == "injected"


@pytest.mark.asyncio
@pytest.mark.parametrize("status", [401, 403, 429, 500])
async def test_rest_error_never_retried(monkeypatch, status):
    from app.services.ingest.xpoz import fetch_xpoz_items
    from app.services.pulse import _provider_error
    requests = []
    async def respond(request):
        requests.append(request)
        return httpx.Response(status, json={"error": "do-not-expose-secret"})
    original = httpx.AsyncClient
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kw: original(transport=httpx.MockTransport(respond), **kw))
    with pytest.raises(httpx.HTTPStatusError) as caught:
        await fetch_xpoz_items("test", "fake")
    assert len(requests) == 1
    result = _provider_error(caught.value, "xpoz")
    assert result["http_status"] == status
    assert "do-not-expose" not in str(result) and "https://" not in str(result)
    if status == 403:
        assert result["status"] == "plan_restricted"


@pytest.mark.asyncio
async def test_crawl_route_reports_providers_and_repeat_dedup(client, db, admin_token, monkeypatch):
    from app.services.ingest import rss
    async def fixture_rss(query):
        return [{"source": "rss", "url": "https://example.com/story", "title": "Story"}] * 2
    monkeypatch.setattr(rss, "fetch_rss_items", fixture_rss)
    t = WatchTopic(label="route", query="route", sources=["rss"])
    db.add(t)
    await db.flush()
    h = {"Authorization": f"Bearer {admin_token}"}
    path = f"/api/admin/pulse/topics/{t.id}"
    first = (await client.post(path + "/crawl", headers=h)).json()
    second = (await client.post(path + "/crawl", headers=h)).json()
    assert first["ingested"] == 1 and second["ingested"] == 0
    assert first["providers"]["rss"]["status"] == "success"
    runs = (await client.get(path + "/runs", headers=h)).json()
    assert len(runs) == 2 and all(run["manual"] for run in runs)
    assert (await client.delete(path, headers=h)).status_code == 200


def test_youtube_seed_query_translation():
    from app.services.ingest.youtube import youtube_query
    assert youtube_query("(penyadapan OR disadap OR penyadapan) AND presiden") == "penyadapan presiden|disadap presiden"


@pytest.mark.parametrize("payload", [
    'success: true\ndata[1]{id,authorUsername,text,likeCount,replyCount,retweetCount}:\n  123,fixture,"Fixture, with \\"quotes\\"",0,null,3\ncount: 1',
    'success: true\ndata:\n  results[1]{id,authorUsername,text,likeCount,replyCount,retweetCount}:\n    123,fixture,"Fixture, with \\"quotes\\"",0,null,3',
    'data[1]:\n  - id: 123\n    authorUsername: fixture\n    text: "Fixture, with \\"quotes\\""\n    likeCount: 0\n    replyCount: null\n    retweetCount: 3',
])
def test_xpoz_compact_text_formats(payload):
    from app.services.ingest.xpoz import parse_tool_text, _stored_rows, normalize_posts
    items = normalize_posts(_stored_rows(parse_tool_text(payload)))
    assert len(items) == 1
    assert items[0]["text"] == 'Fixture, with "quotes"'
    assert items[0]["metrics"]["engagement"] == 3
    assert "comments" not in items[0]["metrics"]


def test_xpoz_compact_pending_does_not_become_empty_success():
    from app.services.ingest.xpoz import parse_tool_text, _stored_rows, XpozToolError
    with pytest.raises(XpozToolError) as error:
        _stored_rows(parse_tool_text("operationId: synthetic-operation\nstatus: running"))
    assert error.value.code == "pending"


@pytest.mark.asyncio
async def test_webhook_fails_closed_and_new_topics_inactive(client, admin_token, monkeypatch):
    from app.routers import pulse
    monkeypatch.setattr(pulse, "get_settings", lambda: SimpleNamespace(PULSE_WEBHOOK_SECRET=""))
    assert (await client.post("/api/admin/pulse/webhook/n8n", json={"topic_id": "none", "url": "https://example.com"})).status_code == 503
    response = await client.post("/api/admin/pulse/topics", headers={"Authorization": f"Bearer {admin_token}"}, json={"label": "manual", "query": "manual"})
    assert response.json()["is_active"] is False


@pytest.mark.asyncio
async def test_repeat_ingest_refreshes_metrics_and_global_dedup(db):
    from app.services.pulse import pulse_analytics
    from app.models.pulse import Issue
    topics = [WatchTopic(label=str(i), query=str(i)) for i in range(2)]
    db.add_all(topics)
    await db.flush()
    raw = {"source": "youtube", "platform": "youtube", "url": "https://youtube.com/watch?v=shared", "author": "Author", "metrics": {"likes": 3, "comments": 1, "views": 999}}
    for t in topics:
        assert await ingest_items(db, t, [raw]) == 1
    updated = {**raw, "metrics": {"likes": 7, "comments": 2, "views": 9999}}
    assert await ingest_items(db, topics[0], [updated]) == 0
    issue = (await db.execute(select(Issue).where(Issue.topic_id == topics[0].id))).scalar_one()
    assert issue.engagement_total == 9 and issue.score == 9 and issue.item_count == 1
    assert issue.reach_total == 0
    data = await pulse_analytics(db)
    assert data["total_mentions"] == 1 and data["influencers"][0]["engagement"] == 9
    assert (await pulse_analytics(db, topics[1].id))["total_mentions"] == 1


@pytest.mark.asyncio
async def test_issue_unknown_stats_null(client, db, admin_token):
    t = WatchTopic(label="unknown", query="unknown")
    db.add(t)
    await db.flush()
    await ingest_items(db, t, [{"source": "rss", "url": "https://example.com/unknown"}])
    h = {"Authorization": f"Bearer {admin_token}"}
    issue = (await client.get("/api/admin/pulse/issues", params={"topic_id": t.id}, headers=h)).json()[0]
    assert issue["reach_total"] is None and issue["engagement_total"] is None
    detail = (await client.get(f"/api/admin/pulse/issues/{issue['id']}", headers=h)).json()
    assert detail["reach_total"] is None and detail["engagement_total"] is None


@pytest.mark.asyncio
async def test_same_topic_concurrent_crawl_conflicts(client, db, admin_token, monkeypatch):
    import asyncio
    from app.services.ingest import rss
    entered, release = asyncio.Event(), asyncio.Event()
    async def slow_rss(query):
        entered.set()
        await release.wait()
        return []
    monkeypatch.setattr(rss, "fetch_rss_items", slow_rss)
    t = WatchTopic(label="lock", query="lock", sources=["rss"])
    db.add(t)
    await db.flush()
    h = {"Authorization": f"Bearer {admin_token}"}
    path = f"/api/admin/pulse/topics/{t.id}/crawl"
    task = asyncio.create_task(client.post(path, headers=h))
    try:
        await asyncio.wait_for(entered.wait(), 2)
        second = await asyncio.wait_for(client.post(path, headers=h), 2)
        assert second.status_code == 409
    finally:
        release.set()
        first = await task
    assert first.status_code == 200
    assert (await client.post(path, headers=h)).status_code == 200


@pytest.mark.asyncio
async def test_project_crawl_collects_instagram_and_tiktok_with_the_shared_provider_key(db, monkeypatch):
    from app.services.pulse import crawl_topic_run
    from app.services.ingest import xpoz
    t = WatchTopic(label="Sosial", query="isu contoh", sources=["instagram", "tiktok"])
    db.add(t)
    await db.flush()
    calls = []
    async def social(query, key, platform, limit=5, **kwargs):
        calls.append((query, key, platform, limit))
        return []
    monkeypatch.setattr(xpoz, "fetch_xpoz_social_items", social)
    async def tiktok(query, key, **window):
        calls.append((query, key, "tiktok", sorted(window)))
        return []
    monkeypatch.setattr(xpoz, "fetch_xpoz_tiktok_items", tiktok)
    settings = SimpleNamespace(XPOZ_API_KEY="fake", YOUTUBE_API_KEY="", XPOZ_MODE="mcp_stored")
    scheduled = await crawl_topic_run(db, t, settings)
    assert scheduled["providers"]["instagram"]["status"] == "manual_only" and not calls
    manual = await crawl_topic_run(db, t, settings, manual=True)
    assert calls == [("isu contoh", "fake", "instagram", 300), ("isu contoh", "fake", "tiktok", ["end", "start"])]   # TikTok: the wide search over the last week
    assert manual["providers"]["instagram"]["status"] == manual["providers"]["tiktok"]["status"] == "success"
    assert (await crawl_topic_run(db, t, SimpleNamespace(XPOZ_API_KEY=""), manual=True))["providers"]["tiktok"]["status"] == "not_configured"


@pytest.mark.asyncio
async def test_interactions_follow_the_measures_rule_in_analytics_and_issue_card(client, db, admin_token):
    """interactions_v1 on the server paths: a digit string counts; a float, a negative number and `true` are not
    reported; the source's own total stands in only when none of the three is reported; unknown is never 0."""
    from app.services.ingest.common import observed_engagement
    t = WatchTopic(label="measures", query="measures")
    db.add(t)
    await db.flush()
    await ingest_items(db, t, [
        {"source": "xpoz", "platform": "x", "url": "https://x.com/i/status/31", "author": "A", "title": "satu",
         "metrics": {"likes": "12", "comments": 2.5, "shares": -1, "views": 99}},
        {"source": "xpoz", "platform": "x", "url": "https://x.com/i/status/32", "author": "B", "title": "dua",
         "metrics": {"likes": True, "comments": -3, "shares": 1.5}},
        {"source": "youtube", "platform": "youtube", "url": "https://youtube.com/watch?v=33", "author": "C", "title": "tiga",
         "metrics": {"author_id": "UC3", "views": 10, "engagement": 40}},
    ])
    assert observed_engagement({"likes": "12", "comments": 2.5, "shares": -1}) == 12
    assert observed_engagement({"likes": True, "comments": -3, "shares": 1.5}) is None
    assert observed_engagement({"views": 10, "engagement": 40}) == 40
    h = {"Authorization": f"Bearer {admin_token}"}
    data = (await client.get("/api/admin/pulse/analytics", params={"topic_id": t.id}, headers=h)).json()
    posts = {post["author"]: post for post in data["posts"]}
    assert [posts[name]["metrics"]["engagement"] for name in "ABC"] == [12, None, 40]
    assert [posts[name]["measures"]["interactions"] for name in "ABC"] == [12, None, 40]
    assert data["metric_totals"]["engagement"] == {"value": 52, "coverage": 2}
    assert data["metric_totals"]["shares"] == {"value": None, "coverage": 0}
    assert {row["author"]: row["engagement"] for row in data["influencers"]} == {"A": 12, "B": None, "C": 40}
    issues = (await client.get("/api/admin/pulse/issues", params={"topic_id": t.id}, headers=h)).json()
    by_title = {issue["title"]: issue for issue in issues}
    assert by_title["dua"]["engagement_total"] is None, "nothing reported and no stored total: unknown in the issue card"
    assert by_title["tiga"]["engagement_total"] == 40


@pytest.mark.asyncio
async def test_project_without_any_reported_interaction_reads_unknown(client, db, admin_token):
    """Review Focus 4: no post reports an interaction. Totals are unknown, never 0, in analytics and the network."""
    t = WatchTopic(label="nothing", query="nothing")
    db.add(t)
    await db.flush()
    await ingest_items(db, t, [
        {"source": "xpoz", "platform": "x", "url": f"https://x.com/i/status/4{index}", "author": "Sama",
         "title": f"posting {index}", "metrics": {"views": 5}} for index in range(2)])
    data = (await client.get("/api/admin/pulse/analytics", params={"topic_id": t.id},
                             headers={"Authorization": f"Bearer {admin_token}"})).json()
    assert data["metric_totals"]["engagement"] == {"value": None, "coverage": 0}
    assert data["influencers"][0]["engagement"] is None
    assert [account["engagement"] for account in data["network"]["accounts"]] == [None]


@pytest.mark.asyncio
async def test_interaction_totals_in_issue_card_and_influencers_carry_their_post_count(client, db, admin_token):
    t = WatchTopic(label="counted", query="counted")
    db.add(t)
    await db.flush()
    rows = [{"source": "xpoz", "platform": "x", "url": f"https://x.com/i/status/5{index}", "author": "Sama", "title": "judul sama",
             "metrics": metrics} for index, metrics in enumerate([{"likes": "4"}, {"views": 2, "engagement": 6}, {"likes": True}])]
    await ingest_items(db, t, rows)
    h = {"Authorization": f"Bearer {admin_token}"}
    issue = (await client.get("/api/admin/pulse/issues", params={"topic_id": t.id}, headers=h)).json()[0]
    assert (issue["engagement_total"], issue["interaction_posts"]) == (10, 2)
    data = (await client.get("/api/admin/pulse/analytics", params={"topic_id": t.id}, headers=h)).json()
    assert (data["influencers"][0]["engagement"], data["influencers"][0]["interaction_posts"]) == (10, 2)


@pytest.mark.asyncio
async def test_influencers_and_network_count_one_account_by_account_v1(client, db, admin_token):
    """account_v1: an X handle written two ways, a renamed YouTube channel and a Threads account with an id on one row
    only are one account each. The row carries its `key`; the name shown is the most recently published one; the
    network has the same accounts under the same names."""
    t = WatchTopic(label="akun", query="akun")
    db.add(t)
    await db.flush()

    def row(n, platform, author, day, metrics=None):
        return {"source": "youtube" if platform == "youtube" else "xpoz", "platform": platform, "url": f"https://example.com/akun/{n}",
                "author": author, "title": f"posting {n} tentang topik berbeda {n * 7}", "published_at": datetime(2026, 11, day, 8),
                "metrics": {"likes": 1, **(metrics or {})}}
    await ingest_items(db, t, [
        row(1, "x", "Okezonenews", 10), row(2, "x", "@okezonenews", 11),
        row(3, "youtube", "Kanal Lama", 10, {"author_id": "UC1"}), row(4, "youtube", "Kanal Baru", 12, {"author_id": "UC1"}),
        row(5, "threads", "@Warga.Solo", 12, {"author_id": "1789"}), row(6, "threads", "warga.solo", 9),
    ])
    data = (await client.get("/api/admin/pulse/analytics", params={"topic_id": t.id}, headers={"Authorization": f"Bearer {admin_token}"})).json()
    rows = {r["key"]: (r["author"], r["mentions"], r["engagement"]) for r in data["influencers"]}
    assert rows == {"x:okezonenews": ("@okezonenews", 2, 2), "youtube:UC1": ("Kanal Baru", 2, 2), "threads:warga.solo": ("@Warga.Solo", 2, 2)}
    assert {post["measures"]["account"] for post in data["posts"]} == set(rows)
    network = data["network"]
    assert {a["id"]: (a["label"], a["posts"]) for a in network["accounts"]} == {key: (name, n) for key, (name, n, _) in rows.items()}
    assert {node["id"]: node["label"] for node in network["nodes"]} == {key: name for key, (name, _, _) in rows.items()}


@pytest.mark.asyncio
async def test_a_post_without_a_name_belongs_to_its_channel_and_its_row_has_no_name(client, db, admin_token):
    """account_v1: a YouTube post whose name is only spaces belongs to its channel by id. The row and the node carry
    no name (None, never a made-up one), and a row tied with it on every figure still sorts."""
    t = WatchTopic(label="tanpa nama", query="tanpa nama")
    db.add(t)
    await db.flush()
    await ingest_items(db, t, [
        {"source": "youtube", "platform": "youtube", "url": "https://youtube.com/watch?v=n1", "author": "  ", "title": "video pertama tanpa nama kanal",
         "published_at": datetime(2026, 11, 10, 8), "metrics": {"author_id": "UC1", "likes": 1}},
        {"source": "youtube", "platform": "youtube", "url": "https://youtube.com/watch?v=n2", "author": "Kanal", "title": "rekaman kedua dari kanal lain",
         "published_at": datetime(2026, 11, 10, 9), "metrics": {"author_id": "UC2", "likes": 1}},
    ])
    res = await client.get("/api/admin/pulse/analytics", params={"topic_id": t.id}, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert [(r["key"], r["author"]) for r in data["influencers"]] == [("youtube:UC2", "Kanal"), ("youtube:UC1", None)]
    assert {n["id"]: n["label"] for n in data["network"]["nodes"]} == {"youtube:UC1": None, "youtube:UC2": "Kanal"}


@pytest.mark.asyncio
async def test_issue_card_counts_the_accounts_of_a_group_by_account_v1(client, db, admin_token):
    """account_v1 in the issue card's `grouping.authors`: an X handle written two ways and a Threads account with an id
    on one row only are one account each."""
    t = WatchTopic(label="kartu akun", query="kartu akun")
    db.add(t)
    await db.flush()
    rows = [("x", "Okezonenews", {}), ("x", "@okezonenews", {}), ("threads", "@Warga.Solo", {"author_id": "1789"}), ("threads", "warga.solo", {})]
    await ingest_items(db, t, [{"source": "xpoz", "platform": platform, "url": f"https://example.com/kartu/{index}", "author": author,
                                "title": "judul yang sama untuk satu kelompok", "metrics": {"likes": 1, **metrics}}
                               for index, (platform, author, metrics) in enumerate(rows)])
    issues = (await client.get("/api/admin/pulse/issues", params={"topic_id": t.id}, headers={"Authorization": f"Bearer {admin_token}"})).json()
    assert [issue["grouping"]["authors"] for issue in issues] == [2]


@pytest.mark.asyncio
async def test_snapshot_figures_follow_the_reported_rule_at_ingest(db):
    """A whole-number float is stored as a whole number; '²' and '٣' are not digits of a reported figure and do not
    stop the ingest."""
    from app.models.pulse_monitor import MetricSnapshot
    from app.services.pulse import snapshot_metrics
    assert snapshot_metrics({"likes": 5.0, "comments": "²", "shares": "٣", "views": "7"}) == {"likes": 5, "comments": None, "shares": None, "views": 7}
    t = WatchTopic(label="snap", query="snap")
    db.add(t)
    await db.flush()
    assert await ingest_items(db, t, [{"source": "xpoz", "platform": "x", "url": "https://x.com/i/status/61", "author": "A",
                                       "metrics": {"likes": 5.0, "comments": "²", "shares": "٣"}}]) == 1
    snapshot = (await db.execute(select(MetricSnapshot).where(MetricSnapshot.topic_id == t.id))).scalar_one()
    assert snapshot.metrics == {"likes": 5, "comments": None, "shares": None, "views": None}

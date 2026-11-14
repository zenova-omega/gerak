"""Tests for Pulse API."""
import pytest

H = lambda tok: {"Authorization": f"Bearer {tok}"}


@pytest.mark.asyncio
async def test_analytics_posts_and_metric_coverage(client, admin_token):
    topic = (await client.post('/api/admin/pulse/topics', json={'label': 'Metrics', 'query': 'metrics'}, headers=H(admin_token))).json()['id']
    for index, metrics in enumerate([{'likes': 10, 'comments': 2, 'shares': 3, 'views': 100}, {}]):
        await client.post('/api/admin/pulse/webhook/n8n', json={
            'topic_id': topic, 'url': f'https://example.com/post/{index}',
            'platform': 'x', 'author': 'Author', 'text': 'Sample post', 'metrics': metrics,
        })
    response = await client.get('/api/admin/pulse/analytics', params={'topic_id': topic}, headers=H(admin_token))
    data = response.json()
    assert len(data['posts']) == 2
    assert data['metric_totals']['engagement'] == {'value': 15, 'coverage': 1}
    assert data['metric_totals']['views'] == {'value': 100, 'coverage': 1}
    assert data['metric_totals']['shares'] == {'value': 3, 'coverage': 1}
    assert data['posts'][0]['text'] == 'Sample post'
    assert data['influencers'][0]['mentions'] == 2
    other = await client.get('/api/admin/pulse/analytics', params={'topic_id': 'absent'}, headers=H(admin_token))
    assert other.json()['metric_totals']['views'] == {'value': None, 'coverage': 0}


@pytest.fixture(autouse=True)
async def configured_webhook(client, monkeypatch):
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "PULSE_WEBHOOK_SECRET", "test-webhook-only")
    client.headers["X-Webhook-Secret"] = "test-webhook-only"


@pytest.mark.asyncio
async def test_create_and_list_topic(client, admin_token):
    res = await client.post("/api/admin/pulse/topics", json={
        "label": "Franchise X", "query": "franchise x",
    }, headers=H(admin_token))
    assert res.status_code == 200
    topic_id = res.json()["id"]

    res = await client.get("/api/admin/pulse/topics", headers=H(admin_token))
    assert res.status_code == 200
    assert any(t["id"] == topic_id for t in res.json())


@pytest.mark.asyncio
async def test_create_topic_requires_admin(client, user_token):
    res = await client.post("/api/admin/pulse/topics", json={
        "label": "X", "query": "x",
    }, headers=H(user_token))
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_update_and_delete_topic(client, admin_token):
    res = await client.post("/api/admin/pulse/topics", json={"label": "A", "query": "a"}, headers=H(admin_token))
    topic_id = res.json()["id"]

    res = await client.put(f"/api/admin/pulse/topics/{topic_id}", json={"is_active": False}, headers=H(admin_token))
    assert res.status_code == 200
    assert res.json()["is_active"] is False

    res = await client.delete(f"/api/admin/pulse/topics/{topic_id}", headers=H(admin_token))
    assert res.status_code == 200

    res = await client.get("/api/admin/pulse/topics", headers=H(admin_token))
    assert all(t["id"] != topic_id for t in res.json())


@pytest.mark.asyncio
async def test_webhook_creates_issue_and_list_issues(client, admin_token):
    res = await client.post("/api/admin/pulse/topics", json={"label": "T", "query": "t"}, headers=H(admin_token))
    topic_id = res.json()["id"]

    res = await client.post("/api/admin/pulse/webhook/n8n", json={
        "topic_id": topic_id, "url": "https://x.com/1",
        "title": "Berita penting hari ini", "text": "isi",
    })
    assert res.status_code == 200
    assert res.json()["ingested"] == 1

    res = await client.get("/api/admin/pulse/issues", params={"topic_id": topic_id}, headers=H(admin_token))
    assert res.status_code == 200
    issues = res.json()
    assert len(issues) == 1
    issue_id = issues[0]["id"]

    res = await client.get(f"/api/admin/pulse/issues/{issue_id}", headers=H(admin_token))
    assert res.status_code == 200
    assert len(res.json()["source_items"]) == 1


@pytest.mark.asyncio
async def test_webhook_unknown_topic_404(client):
    res = await client.post("/api/admin/pulse/webhook/n8n", json={
        "topic_id": "nope", "url": "https://x.com/2", "title": "x",
    })
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_enrich_without_ai_keeps_sentiment_null(client, admin_token):
    res = await client.post("/api/admin/pulse/topics", json={"label": "E", "query": "e"}, headers=H(admin_token))
    topic_id = res.json()["id"]
    await client.post("/api/admin/pulse/webhook/n8n", json={
        "topic_id": topic_id, "url": "https://x.com/e1", "title": "isu", "text": "konten",
    })
    issues = (await client.get("/api/admin/pulse/issues", params={"topic_id": topic_id}, headers=H(admin_token))).json()
    issue_id = issues[0]["id"]
    res = await client.post(f"/api/admin/pulse/issues/{issue_id}/enrich", headers=H(admin_token))
    assert res.status_code == 200
    assert res.json()["sentiment"] is None  # no AI key in tests


@pytest.mark.asyncio
async def test_webhook_accepts_timezone_aware_published_at(client, admin_token):
    res = await client.post("/api/admin/pulse/topics", json={"label": "TZ", "query": "tz"}, headers=H(admin_token))
    topic_id = res.json()["id"]
    res = await client.post("/api/admin/pulse/webhook/n8n", json={
        "topic_id": topic_id, "url": "https://x.com/tz1",
        "title": "berita", "text": "isi", "published_at": "2026-06-06T08:00:00Z",
    })
    assert res.status_code == 200
    assert res.json()["ingested"] == 1

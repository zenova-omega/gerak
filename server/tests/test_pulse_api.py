"""Tests for Pulse API."""
import pytest

H = lambda tok: {"Authorization": f"Bearer {tok}"}


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

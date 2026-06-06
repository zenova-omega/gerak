"""Tests for the Scheduler (distribution) feature."""
import pytest

H = lambda t: {"Authorization": f"Bearer {t}"}


@pytest.mark.asyncio
async def test_accounts_crud(client, admin_token):
    res = await client.post("/api/admin/scheduler/accounts", json={
        "label": "Brand IG", "platform": "instagram", "handle": "@brand",
    }, headers=H(admin_token))
    assert res.status_code == 200
    aid = res.json()["id"]
    assert res.json()["status"] == "connected"

    res = await client.get("/api/admin/scheduler/accounts", headers=H(admin_token))
    assert any(a["id"] == aid for a in res.json())

    res = await client.delete(f"/api/admin/scheduler/accounts/{aid}", headers=H(admin_token))
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_accounts_require_admin(client, user_token):
    res = await client.post("/api/admin/scheduler/accounts", json={
        "label": "x", "platform": "x",
    }, headers=H(user_token))
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_post_lifecycle_and_publish(client, admin_token):
    res = await client.post("/api/admin/scheduler/posts", json={
        "caption": "Halo dunia", "platforms": ["instagram", "x"],
        "scheduled_at": "2026-06-10T09:00:00",
    }, headers=H(admin_token))
    assert res.status_code == 200
    pid = res.json()["id"]
    assert res.json()["status"] == "scheduled"

    res = await client.put(f"/api/admin/scheduler/posts/{pid}", json={"caption": "Halo dunia (edit)"}, headers=H(admin_token))
    assert res.json()["caption"] == "Halo dunia (edit)"

    res = await client.post(f"/api/admin/scheduler/posts/{pid}/publish", headers=H(admin_token))
    assert res.status_code == 200
    assert res.json()["status"] == "published"
    assert res.json()["published_at"] is not None

    res = await client.get("/api/admin/scheduler/posts", headers=H(admin_token))
    assert any(p["id"] == pid and p["status"] == "published" for p in res.json())

    res = await client.delete(f"/api/admin/scheduler/posts/{pid}", headers=H(admin_token))
    assert res.status_code == 200

"""Tests for the Studio (AI content) feature."""
import pytest

H = lambda t: {"Authorization": f"Bearer {t}"}


@pytest.mark.asyncio
async def test_captions_mock_returns_n_variants(client, admin_token):
    res = await client.post("/api/admin/studio/captions", json={
        "prompt": "Bakti sosial TNI AD di Jakarta", "tone": "positif", "n": 4,
    }, headers=H(admin_token))
    assert res.status_code == 200
    data = res.json()
    assert data["tone"] == "positif"
    assert len(data["variants"]) == 4
    assert all(isinstance(v, str) and v for v in data["variants"])


@pytest.mark.asyncio
async def test_captions_requires_admin(client, user_token):
    res = await client.post("/api/admin/studio/captions", json={"prompt": "x"}, headers=H(user_token))
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_meme_mock(client, admin_token):
    res = await client.post("/api/admin/studio/meme", json={"prompt": "Semangat prajurit"}, headers=H(admin_token))
    assert res.status_code == 200
    data = res.json()
    assert data["top_text"]
    assert "bottom_text" in data
    assert data["image_url"] is None


@pytest.mark.asyncio
async def test_drafts_crud(client, admin_token):
    res = await client.post("/api/admin/studio/drafts", json={
        "kind": "caption", "prompt": "test", "tone": "netral",
        "payload": {"variants": ["a", "b"]},
    }, headers=H(admin_token))
    assert res.status_code == 200
    did = res.json()["id"]

    res = await client.get("/api/admin/studio/drafts", headers=H(admin_token))
    assert any(d["id"] == did for d in res.json())

    res = await client.delete(f"/api/admin/studio/drafts/{did}", headers=H(admin_token))
    assert res.status_code == 200

    res = await client.get("/api/admin/studio/drafts", headers=H(admin_token))
    assert all(d["id"] != did for d in res.json())

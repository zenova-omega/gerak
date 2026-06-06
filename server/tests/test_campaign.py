"""Tests for the Campaign (orchestration) feature."""
import pytest

H = lambda t: {"Authorization": f"Bearer {t}"}


@pytest.mark.asyncio
async def test_requires_admin(client, user_token):
    res = await client.post("/api/admin/campaigns", json={"name": "x"}, headers=H(user_token))
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_campaign_crud_and_pipeline(client, admin_token):
    res = await client.post("/api/admin/campaigns", json={
        "name": "Kampanye Bakti Sosial", "objective": "Naikkan citra positif",
    }, headers=H(admin_token))
    assert res.status_code == 200
    cid = res.json()["id"]
    assert res.json()["status"] == "draft"
    assert set(res.json()["pipeline"].keys()) == {"listen", "create", "distribute", "engage"}

    res = await client.put(f"/api/admin/campaigns/{cid}", json={
        "status": "active",
        "pipeline": {"listen": "Isu baksos", "create": "3 caption", "distribute": "IG+TikTok", "engage": "Ajak outlet"},
    }, headers=H(admin_token))
    assert res.json()["status"] == "active"
    assert res.json()["pipeline"]["create"] == "3 caption"

    res = await client.get("/api/admin/campaigns", headers=H(admin_token))
    assert any(c["id"] == cid for c in res.json())

    res = await client.delete(f"/api/admin/campaigns/{cid}", headers=H(admin_token))
    assert res.status_code == 200

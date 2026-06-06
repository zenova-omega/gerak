"""Tests for the Rally (consent-based engagement reminder) feature."""
import pytest

H = lambda t: {"Authorization": f"Bearer {t}"}

RALLY = {
    "title": "Dukung post bakti sosial",
    "post_url": "https://instagram.com/p/abc",
    "talking_points": "Sebutkan kegiatan baksos; tulis dengan kalimatmu sendiri.",
    "target": "Semua outlet",
}


@pytest.mark.asyncio
async def test_create_requires_admin(client, user_token):
    res = await client.post("/api/admin/rally", json=RALLY, headers=H(user_token))
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_create_ack_and_progress(client, admin_token, user_token):
    res = await client.post("/api/admin/rally", json=RALLY, headers=H(admin_token))
    assert res.status_code == 200
    rid = res.json()["id"]
    assert res.json()["ack_count"] == 0

    # member sees it in active
    res = await client.get("/api/rally/active", headers=H(user_token))
    assert any(r["id"] == rid for r in res.json())

    # member self-reports engagement
    res = await client.post(f"/api/rally/{rid}/ack", headers=H(user_token))
    assert res.status_code == 200
    assert res.json()["acked"] is True

    # second ack is idempotent
    res = await client.post(f"/api/rally/{rid}/ack", headers=H(user_token))
    assert res.json()["already"] is True

    # no longer in active for that member
    res = await client.get("/api/rally/active", headers=H(user_token))
    assert all(r["id"] != rid for r in res.json())

    # admin sees progress
    res = await client.get("/api/admin/rally", headers=H(admin_token))
    row = next(r for r in res.json() if r["id"] == rid)
    assert row["ack_count"] == 1

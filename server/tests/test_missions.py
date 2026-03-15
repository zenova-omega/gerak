"""Tests for mission endpoints."""
import pytest


@pytest.mark.asyncio
async def test_list_missions(client, user_token, sample_mission):
    res = await client.get("/api/missions", headers={
        "Authorization": f"Bearer {user_token}"
    })
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_get_mission(client, user_token, sample_mission):
    res = await client.get(f"/api/missions/{sample_mission.id}", headers={
        "Authorization": f"Bearer {user_token}"
    })
    assert res.status_code == 200
    assert res.json()["title"] == "Test Mission"


@pytest.mark.asyncio
async def test_create_mission_as_admin(client, admin_token):
    res = await client.post("/api/missions", json={
        "type": "KONTEN", "title": "Video Challenge",
        "description": "Create a video", "xp_reward": 300,
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert res.json()["title"] == "Video Challenge"


@pytest.mark.asyncio
async def test_create_mission_as_user(client, user_token):
    res = await client.post("/api/missions", json={
        "type": "KONTEN", "title": "Should Fail",
    }, headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_join_mission(client, user_token, sample_mission):
    res = await client.post(f"/api/missions/{sample_mission.id}/join", headers={
        "Authorization": f"Bearer {user_token}"
    })
    assert res.status_code == 200
    assert res.json()["status"] == "TERDAFTAR"


@pytest.mark.asyncio
async def test_join_mission_twice(client, user_token, sample_mission):
    # First join
    await client.post(f"/api/missions/{sample_mission.id}/join", headers={
        "Authorization": f"Bearer {user_token}"
    })
    # Second join should fail
    res = await client.post(f"/api/missions/{sample_mission.id}/join", headers={
        "Authorization": f"Bearer {user_token}"
    })
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_submit_mission(client, user_token, sample_mission):
    # Join first
    await client.post(f"/api/missions/{sample_mission.id}/join", headers={
        "Authorization": f"Bearer {user_token}"
    })
    # Submit
    res = await client.post(f"/api/missions/{sample_mission.id}/submit",
        params={"caption": "My submission", "platform": "instagram"},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "SUBMITTED"


@pytest.mark.asyncio
async def test_delete_mission_as_admin(client, admin_token, sample_mission):
    res = await client.delete(f"/api/missions/{sample_mission.id}", headers={
        "Authorization": f"Bearer {admin_token}"
    })
    assert res.status_code == 200
    assert res.json()["deleted"] == True


@pytest.mark.asyncio
async def test_mission_not_found(client, user_token):
    res = await client.get("/api/missions/nonexistent", headers={
        "Authorization": f"Bearer {user_token}"
    })
    assert res.status_code == 404

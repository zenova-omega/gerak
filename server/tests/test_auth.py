"""Tests for authentication endpoints."""
import pytest


@pytest.mark.asyncio
async def test_health(client):
    res = await client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_login_success(client, regular_user):
    res = await client.post("/api/auth/login", json={
        "nrp": "TEST001", "password": "user1234"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["nrp"] == "TEST001"


@pytest.mark.asyncio
async def test_login_wrong_password(client, regular_user):
    res = await client.post("/api/auth/login", json={
        "nrp": "TEST001", "password": "wrong"
    })
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client):
    res = await client.post("/api/auth/login", json={
        "nrp": "NOBODY", "password": "test1234"
    })
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_get_me(client, user_token):
    res = await client.get("/api/auth/me", headers={
        "Authorization": f"Bearer {user_token}"
    })
    assert res.status_code == 200
    assert res.json()["nrp"] == "TEST001"


@pytest.mark.asyncio
async def test_get_me_no_token(client):
    res = await client.get("/api/auth/me")
    assert res.status_code == 403  # No auth header


@pytest.mark.asyncio
async def test_register_as_admin(client, admin_token):
    res = await client.post("/api/auth/register", json={
        "nrp": "NEW001", "name": "New User", "password": "newuser123",
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert res.json()["nrp"] == "NEW001"


@pytest.mark.asyncio
async def test_register_as_non_admin(client, user_token):
    res = await client.post("/api/auth/register", json={
        "nrp": "NEW002", "name": "New User 2", "password": "newuser123",
    }, headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 403  # Non-admin cannot register users


@pytest.mark.asyncio
async def test_refresh_token(client, regular_user):
    # First login
    login_res = await client.post("/api/auth/login", json={
        "nrp": "TEST001", "password": "user1234"
    })
    refresh = login_res.json()["refresh_token"]

    # Refresh
    res = await client.post("/api/auth/refresh", json={
        "refresh_token": refresh
    })
    assert res.status_code == 200
    assert "access_token" in res.json()

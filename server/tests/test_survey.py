"""Tests for the Survey/polling feature."""
import pytest

H = lambda t: {"Authorization": f"Bearer {t}"}

SURVEY_PAYLOAD = {
    "title": "Kepuasan Kegiatan",
    "description": "Polling singkat",
    "questions": [
        {"type": "single", "text": "Pilih satu", "options": ["A", "B", "C"], "order": 0},
        {"type": "rating", "text": "Nilai 1-5", "rating_max": 5, "order": 1},
        {"type": "yesno", "text": "Setuju?", "order": 2},
        {"type": "text", "text": "Saran?", "required": False, "order": 3},
    ],
}


async def _make_open_survey(client, admin_token):
    s = (await client.post("/api/admin/surveys", json=SURVEY_PAYLOAD, headers=H(admin_token))).json()
    await client.post(f"/api/admin/surveys/{s['id']}/publish", headers=H(admin_token))
    return s


@pytest.mark.asyncio
async def test_create_and_get_survey(client, admin_token):
    res = await client.post("/api/admin/surveys", json=SURVEY_PAYLOAD, headers=H(admin_token))
    assert res.status_code == 200
    sid = res.json()["id"]
    assert len(res.json()["questions"]) == 4
    res = await client.get(f"/api/admin/surveys/{sid}", headers=H(admin_token))
    assert res.status_code == 200
    assert res.json()["title"] == "Kepuasan Kegiatan"


@pytest.mark.asyncio
async def test_create_requires_admin(client, user_token):
    res = await client.post("/api/admin/surveys", json=SURVEY_PAYLOAD, headers=H(user_token))
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_publish_creates_mission_and_active_visible(client, admin_token, user_token):
    s = (await client.post("/api/admin/surveys", json=SURVEY_PAYLOAD, headers=H(admin_token))).json()
    res = await client.post(f"/api/admin/surveys/{s['id']}/publish", headers=H(admin_token))
    assert res.status_code == 200
    assert res.json()["status"] == "open"
    assert res.json()["mission_id"]
    res = await client.get("/api/surveys/active", headers=H(user_token))
    assert any(x["id"] == s["id"] for x in res.json())


@pytest.mark.asyncio
async def test_respond_awards_xp_and_blocks_duplicate(client, admin_token, user_token):
    s = await _make_open_survey(client, admin_token)
    qids = [q["id"] for q in s["questions"]]
    answers = {"answers": [
        {"question_id": qids[0], "value": "A"},
        {"question_id": qids[1], "value": 4},
        {"question_id": qids[2], "value": True},
        {"question_id": qids[3], "value": "bagus"},
    ]}
    res = await client.post(f"/api/surveys/{s['id']}/respond", json=answers, headers=H(user_token))
    assert res.status_code == 200
    assert res.json()["xp_awarded"] == 50
    res2 = await client.post(f"/api/surveys/{s['id']}/respond", json=answers, headers=H(user_token))
    assert res2.status_code == 400
    res3 = await client.get("/api/surveys/active", headers=H(user_token))
    assert all(x["id"] != s["id"] for x in res3.json())


@pytest.mark.asyncio
async def test_results_aggregation(client, admin_token, user_token):
    s = await _make_open_survey(client, admin_token)
    qids = [q["id"] for q in s["questions"]]
    await client.post(f"/api/surveys/{s['id']}/respond", json={"answers": [
        {"question_id": qids[0], "value": "A"},
        {"question_id": qids[1], "value": 4},
        {"question_id": qids[2], "value": True},
        {"question_id": qids[3], "value": "bagus"},
    ]}, headers=H(user_token))
    res = await client.get(f"/api/admin/surveys/{s['id']}/results", headers=H(admin_token))
    assert res.status_code == 200
    data = res.json()
    assert data["response_count"] == 1
    qmap = {q["id"]: q for q in data["questions"]}
    a_bucket = next(d for d in qmap[qids[0]]["distribution"] if d["label"] == "A")
    assert a_bucket["count"] == 1
    assert qmap[qids[1]]["average"] == 4
    assert "bagus" in qmap[qids[3]]["texts"]

import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_main_application_mounts_response_analysis_with_authentication():
    async with AsyncClient(transport=ASGITransport(app=app),base_url='http://test') as client:
        response=await client.get('/api/admin/pulse/response-analysis?topic_id=test')
    assert response.status_code in (401,403)

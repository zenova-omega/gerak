from types import SimpleNamespace
import pytest
from app.services.ai import get_ai_service


def test_local_provider_needs_no_cloud_key():
    provider = get_ai_service(SimpleNamespace(AI_PROVIDER='ollama', OLLAMA_MODEL='qwen2.5:14b'))
    assert provider is not None
    assert provider.model == 'qwen2.5:14b'


@pytest.mark.asyncio
async def test_local_status_identifies_local_processing(client, admin_token, monkeypatch):
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), 'AI_PROVIDER', 'ollama')
    response = await client.get('/api/admin/pulse/sentiment/status', headers={'Authorization':f'Bearer {admin_token}'})
    assert response.json()['configured'] is True
    assert response.json()['local'] is True
    assert response.json()['provider'] == 'ollama'

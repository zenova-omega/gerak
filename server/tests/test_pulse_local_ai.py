from types import SimpleNamespace
import pytest
from app.services.ai import get_ai_service


def test_local_provider_needs_no_cloud_key():
    provider = get_ai_service(SimpleNamespace(AI_PROVIDER='ollama', OLLAMA_MODEL='qwen2.5:14b'))
    assert provider is not None
    assert provider.model == 'qwen2.5:14b'


@pytest.mark.asyncio
async def test_local_analysis_counts_as_configured_without_saying_where_it_runs(client, admin_token, monkeypatch):
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), 'AI_PROVIDER', 'ollama')
    response = await client.get('/api/admin/pulse/sentiment/status', headers={'Authorization':f'Bearer {admin_token}'})
    assert response.json()['configured'] is True
    assert not {'local', 'provider', 'model'} & set(response.json())


def test_the_local_client_outlasts_the_longest_wait_a_route_allows():
    # Every caller sets its own deadline with asyncio.wait_for; the longest is the summary route's 170 s.
    # A shorter limit here would end a long answer early, whatever the route allows.
    from app.services.ai.providers import ollama
    assert ollama.REQUEST_TIMEOUT.read >= 175
    assert ollama.REQUEST_TIMEOUT.connect <= 10

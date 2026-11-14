import httpx
import pytest

from app.config import Settings


def test_threads_token_is_loaded_as_secret(tmp_path):
    (tmp_path / 'THREADS_ACCESS_TOKEN').write_text('test-token')
    settings = Settings(_env_file=None, _secrets_dir=tmp_path)
    assert hasattr(settings, 'THREADS_ACCESS_TOKEN')
    assert settings.THREADS_ACCESS_TOKEN.get_secret_value() == 'test-token'
    assert 'test-token' not in repr(settings)


@pytest.mark.asyncio
async def test_connection_checks_identity_permissions_and_posts():
    from app.services.threads_connection import check_connection
    seen = []
    def respond(request):
        seen.append(request.url.path)
        assert request.headers['authorization'] == 'Bearer test-token'
        assert 'test-token' not in str(request.url)
        payloads = {
            '/v1.0/me': {'id': '123', 'username': 'zenova.tech.group'},
            '/v1.0/me/permissions': {'data': [{'permission': 'threads_basic', 'status': 'granted'}]},
            '/v1.0/me/threads': {'data': []},
        }
        return httpx.Response(200, json=payloads[request.url.path])
    async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
        result = await check_connection('test-token', client=client)
    assert result['connected'] is True
    assert result['username'] == 'zenova.tech.group'
    assert result['permissions'] == ['threads_basic']
    assert result['posts_readable'] is True
    assert result['sample_posts_count'] == 0
    assert len(seen) == 3


@pytest.mark.asyncio
async def test_wrong_account_stops_before_reading_posts():
    from app.services.threads_connection import check_connection
    def respond(request):
        assert request.url.path == '/v1.0/me'
        return httpx.Response(200, json={'id': '9', 'username': 'other'})
    async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
        result = await check_connection('test-token', client=client)
    assert result['connected'] is False
    assert result['reason'] == 'account_mismatch'


@pytest.mark.asyncio
async def test_error_response_never_echoes_token():
    from app.services.threads_connection import check_connection
    def respond(request):
        return httpx.Response(400, json={'error': {'message': 'secret test-token', 'code': 190}})
    async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
        result = await check_connection('test-token', client=client)
    assert result['connected'] is False
    assert result['error_code'] == 190
    assert 'test-token' not in str(result)


@pytest.mark.asyncio
async def test_permissions_denied_does_not_claim_all_access():
    from app.services.threads_connection import check_connection
    def respond(request):
        if request.url.path == '/v1.0/me':
            return httpx.Response(200, json={'id': '1', 'username': 'zenova.tech.group'})
        return httpx.Response(403, json={'error': {'code': 10}})
    async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
        result = await check_connection('test-token', client=client)
    assert result['connected'] is True
    assert result['permissions_verified'] is False
    assert result['posts_readable'] is False


@pytest.mark.asyncio
async def test_network_errors_are_sanitized():
    from app.services.threads_connection import check_connection
    def respond(request):
        raise httpx.ConnectError('secret test-token', request=request)
    async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
        result = await check_connection('test-token', client=client)
    assert result['connected'] is False
    assert result['reason'] == 'network_error'
    assert 'test-token' not in str(result)

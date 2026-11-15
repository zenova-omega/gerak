"""Read-only Threads connection diagnostic. Never return raw provider errors or tokens."""
import asyncio
import json
from datetime import datetime, timezone

import httpx

BASE_URL = 'https://graph.threads.net/v1.0'


async def _read(client, token, path, params=None, body=None):
    """One read. With `body`, the request is posted with the platform's "treat this as a GET" field, which keeps what
    it carries (a token being asked about) in the request body and out of the address."""
    try:
        if body is None:
            response = await client.get(
                BASE_URL + path, params=params,
                headers={'Authorization': f'Bearer {token}'},
                follow_redirects=False, timeout=20,
            )
        else:
            response = await client.post(
                BASE_URL + path, data={'method': 'GET', **body},
                headers={'Authorization': f'Bearer {token}'},
                follow_redirects=False, timeout=20,
            )
        payload = response.json()
    except httpx.HTTPError:
        return None, {'reason': 'network_error'}
    except ValueError:
        return None, {'reason': 'invalid_response'}
    if not isinstance(payload, dict):
        return None, {'reason': 'invalid_response'}
    if response.status_code != 200 or 'error' in payload:
        error = payload.get('error', {})
        code = error.get('code') if isinstance(error, dict) else None
        return None, {'reason': 'api_error', 'http_status': response.status_code,
                      'error_code': code if isinstance(code, int) else None}
    return payload, None


SEARCH_PERMISSION = 'threads_keyword_search'


async def describe_token(client, token):
    """What the platform says about a token: its permissions, whether it may search by keyword, and until when it
    lasts. `search_permission` is None when the permissions could not be read (unknown is not the same as refused)."""
    payload, error = await _read(client, token, '/debug_token', body={'input_token': token})
    data = (payload or {}).get('data')
    if error or not isinstance(data, dict) or data.get('is_valid') is False:
        return {'permissions_verified': False, 'permissions': [], 'search_permission': None, 'expires_at': None, 'application': None,
                'error': error or {'reason': 'invalid_token' if isinstance(data, dict) else 'invalid_response'}}
    permissions = sorted({scope for scope in data.get('scopes') or [] if isinstance(scope, str)
                          and scope.startswith('threads_') and scope.replace('_', '').isalpha()})
    expires, application = data.get('expires_at'), data.get('application')
    return {'permissions_verified': True, 'permissions': permissions, 'search_permission': SEARCH_PERMISSION in permissions,
            'expires_at': datetime.fromtimestamp(expires, timezone.utc).replace(tzinfo=None).isoformat() if isinstance(expires, int) and expires > 0 else None,
            'application': application if isinstance(application, str) and len(application) <= 80 else None, 'error': None}


async def check_connection(token, *, client=None, expected_username='zenova.tech.group'):
    if not token:
        return {'connected': False, 'reason': 'not_configured'}
    if client is None:
        async with httpx.AsyncClient() as session:
            return await check_connection(token, client=session, expected_username=expected_username)
    profile, error = await _read(client, token, '/me', {'fields': 'id,username'})
    if error:
        return {'connected': False, **error}
    if profile.get('username') != expected_username:
        return {'connected': False, 'reason': 'account_mismatch'}
    # Return the expected username, not arbitrary provider content.
    result = {'connected': True, 'username': expected_username}
    described = await describe_token(client, token)
    result.update({key: described[key] for key in ('permissions_verified', 'permissions', 'search_permission', 'expires_at')})
    if described.get('error'):
        result['permissions_error'] = described['error']
    posts, error = await _read(client, token, '/me/threads', {'fields': 'id', 'limit': 5})
    result['posts_readable'] = not error and isinstance(posts.get('data'), list)
    result['sample_posts_count'] = len(posts['data']) if result['posts_readable'] else None
    if error:
        result['posts_error'] = error
    return result


if __name__ == '__main__':
    from app.config import get_settings
    result = asyncio.run(check_connection(get_settings().THREADS_ACCESS_TOKEN.get_secret_value()))
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if result.get('connected') and result.get('posts_readable') else 1)

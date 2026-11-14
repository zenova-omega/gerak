"""Read-only Threads connection diagnostic. Never return raw provider errors or tokens."""
import asyncio
import json
import httpx

BASE_URL = 'https://graph.threads.net/v1.0'


async def _read(client, token, path, params=None):
    try:
        response = await client.get(
            BASE_URL + path, params=params,
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
    permissions, error = await _read(client, token, '/me/permissions')
    result['permissions_verified'] = not error and isinstance(permissions.get('data'), list)
    result['permissions'] = sorted({
        row['permission'] for row in (permissions or {}).get('data', [])
        if isinstance(row, dict) and row.get('status') == 'granted'
        and isinstance(row.get('permission'), str)
        and row['permission'].startswith('threads_')
        and row['permission'].replace('_', '').isalpha()
    })
    if error:
        result['permissions_error'] = error
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

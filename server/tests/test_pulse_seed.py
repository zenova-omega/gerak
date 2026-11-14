import pytest


@pytest.mark.asyncio
async def test_seed_project_roundtrip_and_update_preserves_anchor(client, admin_token):
    headers = {'Authorization': f'Bearer {admin_token}'}
    result = await client.post('/api/admin/pulse/topics', headers=headers, json={
        'label': 'Trace', 'query': 'sample caption', 'sources': ['xpoz'],
        'seed_post': {'url': 'https://x.com/example/status/123?utm_source=test'},
    })
    assert result.status_code == 200
    topic = result.json()
    assert topic.get('seed_post', {}).get('url') == 'https://x.com/example/status/123'
    assert topic['is_active'] is False
    saved = await client.put(f"/api/admin/pulse/topics/{topic['id']}", headers=headers, json={'query': 'new caption'})
    assert saved.json()['seed_post'] == topic['seed_post']
    listed = (await client.get('/api/admin/pulse/topics', headers=headers)).json()
    assert next(t for t in listed if t['id'] == topic['id'])['seed_post'] == topic['seed_post']
    preview = await client.get('/api/admin/pulse/seed-preview', params={'url': topic['seed_post']['url']}, headers=headers)
    assert preview.status_code == 200
    assert preview.json()['status'] == 'not_collected'
    assert preview.json()['post'] is None


@pytest.mark.asyncio
@pytest.mark.parametrize('url', ['http://127.0.0.1/private', 'https://x.com.evil.com/a/status/1', 'https://x.com/user', 'javascript:alert(1)'])
async def test_seed_rejects_non_post_urls(client, admin_token, url):
    result = await client.post('/api/admin/pulse/topics', headers={'Authorization': f'Bearer {admin_token}'}, json={
        'label': 'Invalid', 'query': 'sample', 'seed_post': {'url': url},
    })
    assert result.status_code == 422


@pytest.mark.asyncio
async def test_preview_matches_stored_post_without_fabricating_metrics(client, admin_token, db):
    from app.models.pulse import SourceItem
    headers = {'Authorization': f'Bearer {admin_token}'}
    topic = (await client.post('/api/admin/pulse/topics', headers=headers, json={'label':'Source','query':'caption'})).json()
    db.add(SourceItem(topic_id=topic['id'], source='xpoz', platform='x', url='https://twitter.com/example/status/123?s=20', title='Observed caption', text='Body', author='example', metrics=None))
    await db.flush()
    preview = await client.get('/api/admin/pulse/seed-preview', params={'url':'https://x.com/example/status/123'}, headers=headers)
    assert preview.status_code == 200
    assert preview.json()['status'] == 'stored'
    assert preview.json()['post']['title'] == 'Observed caption'
    assert preview.json()['post']['metrics'] == {}

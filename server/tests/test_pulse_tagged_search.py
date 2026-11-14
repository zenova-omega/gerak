import json
import pytest
from app.services.pulse_search import parse_groups

def test_group_validation():
    assert parse_groups(None, 'Hello')['main'] == ['hello']
    assert parse_groups(json.dumps({'main':[' Ayo ', 'ayo']}))['main'] == ['ayo']
    for raw in ['[]', '{', '{}', '{"main":[1]}', '{"main":["a"]}']:
        with pytest.raises((ValueError, TypeError)):
            parse_groups(raw)

@pytest.mark.asyncio
async def test_keyword_groups_apply_before_limit_and_handle_nulls(client, admin_token, db):
    from app.models.pulse import WatchTopic, SourceItem
    db.add(WatchTopic(id='tags-topic', label='Tags', query='test'))
    await db.flush()
    for i, text in enumerate(['presiden disadap', 'penyadapan presiden', 'presiden disadap promo', 'disadap saja', 'persiden lain']):
        db.add(SourceItem(id=f'tags-{i}', topic_id='tags-topic', platform='news', source='rss',
                          url=f'https://example.com/tags/{i}', text=text, title=None, author=None))
    await db.flush()
    params={'keywords':json.dumps({'main':['disadap','penyadapan'],'required':['presiden'],'excluded':['promo']})}
    response=await client.get('/api/admin/pulse/search',params=params,headers={'Authorization':f'Bearer {admin_token}'})
    assert response.status_code == 200
    assert {p['id'] for p in response.json()['posts']} == {'tags-0','tags-1'}
    assert response.json()['scope'] == 'stored_only'
    assert (await client.get('/api/admin/pulse/search',params=params)).status_code in (401,403)

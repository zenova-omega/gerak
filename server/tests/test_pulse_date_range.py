import pytest
from datetime import datetime
from app.models.pulse import SourceItem
from app.models.pulse_monitor import MetricSnapshot


@pytest.mark.asyncio
async def test_global_period_filters_posts_ranking_and_network_in_wib(client, admin_token, db):
    headers={'Authorization':f'Bearer {admin_token}'}
    topic=(await client.post('/api/admin/pulse/topics',headers=headers,json={'label':'Period','query':'period'})).json()['id']
    for name, stamp, likes in [('Before',datetime(2026,11,9,16,59),99),('Inside',datetime(2026,11,9,17),5),('End',datetime(2026,11,10,16,59,59),2),('After',datetime(2026,11,10,17),100),('Unknown',None,1000)]:
        db.add(SourceItem(topic_id=topic,source='xpoz',platform='x',author=name,url=f'https://x.com/{name}/status/1',text=name,published_at=stamp,metrics={'likes':likes}))
    await db.flush()
    response=await client.get('/api/admin/pulse/analytics',headers=headers,params={'topic_id':topic,'from':'2026-11-10','to':'2026-11-10'})
    assert response.status_code==200
    data=response.json()
    assert data['total_mentions']==2
    assert {p['author'] for p in data['posts']}=={'Inside','End'}
    assert {a['author'] for a in data['influencers']}=={'Inside','End'}
    assert data['network']['total_posts']==2
    assert all('issue_id' in p for p in data['posts'])
    inside=next(p for p in data['posts'] if p['author']=='Inside')
    assert inside.get('first_observed_at') is None
    db.add(MetricSnapshot(item_id=inside['id'],topic_id=topic,observed_at=datetime(2026,11,11),metrics={}))
    db.add(MetricSnapshot(item_id=inside['id'],topic_id=topic,observed_at=datetime(2026,11,12),metrics={}))
    await db.flush()
    repeated=(await client.get('/api/admin/pulse/analytics',headers=headers,params={'topic_id':topic})).json()
    assert next(p for p in repeated['posts'] if p['id']==inside['id'])['first_observed_at']=='2026-11-11T00:00:00'
    bad=await client.get('/api/admin/pulse/analytics',headers=headers,params={'from':'2026-11-11','to':'2026-11-10'})
    assert bad.status_code==422

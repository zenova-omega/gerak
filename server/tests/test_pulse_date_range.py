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


@pytest.mark.asyncio
async def test_analytics_days_follow_day_v1_and_each_post_carries_its_measures(client, admin_token, db):
    from app.services.pulse_measures import RULES, zone
    headers={'Authorization':f'Bearer {admin_token}'}
    topic=(await client.post('/api/admin/pulse/topics',headers=headers,json={'label':'Day rule','query':'dayrule'})).json()['id']
    for name, stamp in [('Late',datetime(2026,11,10,17,0)),('Evening',datetime(2026,11,10,23,30)),('DateOnly',datetime(2026,11,11)),('Morning',datetime(2026,11,10,16,59,59))]:
        db.add(SourceItem(topic_id=topic,source='xpoz',platform='x',author=name,url=f'https://x.com/{name}/status/9',text=name,published_at=stamp,metrics={'likes':1}))
    await db.flush()
    data=(await client.get('/api/admin/pulse/analytics',headers=headers,params={'topic_id':topic,'from':'2026-11-11','to':'2026-11-11'})).json()
    posts={p['author']:p for p in data['posts']}
    assert set(posts)=={'Late','Evening','DateOnly'}, '17:00 UTC and later is the next day in the zone; a date-only post keeps its date'
    assert data['timeline']==[{'date':'2026-11-11','count':3}]
    assert posts['Late']['measures']['day']=='2026-11-11' and posts['Late']['measures']['clock'] is True
    assert posts['DateOnly']['measures']['day']=='2026-11-11' and posts['DateOnly']['measures']['clock'] is False
    assert set(posts['Late']['measures'])=={'day','clock','interactions','account','tone'}
    offset,name=zone()
    assert data['measures']=={'zone':{'offset_minutes':offset,'name':name},'rules':RULES}


@pytest.fixture
def wit(monkeypatch):
    """The installation set to WIT (UTC+9): every period and day must follow it, nothing may assume seven hours."""
    from app.services import pulse_measures
    monkeypatch.setattr(pulse_measures, 'zone', lambda: (540, 'WIT'))


@pytest.mark.asyncio
async def test_analytics_and_alert_periods_follow_the_installation_zone(client, admin_token, db, wit):
    from app.models.pulse import Issue
    from app.models.pulse_monitor import PulseAlert
    headers={'Authorization':f'Bearer {admin_token}'}
    topic=(await client.post('/api/admin/pulse/topics',headers=headers,json={'label':'Zone','query':'zone'})).json()['id']
    db.add(Issue(id='zone-issue',topic_id=topic,title='Zone'))
    for name, stamp in [('Before',datetime(2026,11,10,14,59)),('First',datetime(2026,11,10,15,0)),('Last',datetime(2026,11,11,14,59,59)),('After',datetime(2026,11,11,15,0))]:
        db.add(SourceItem(topic_id=topic,issue_id='zone-issue',source='xpoz',platform='x',author=name,url=f'https://x.com/{name}/status/7',text=name,published_at=stamp,metrics={}))
    db.add(PulseAlert(id='zone-alert',dedup_key='zone-alert',topic_id=topic,issue_id='zone-issue',kind='recent_cluster',title='Zone',
                      window_start=datetime(2026,11,1),window_end=datetime(2026,11,30),evidence_ids=[]))
    await db.flush()
    params={'topic_id':topic,'from':'2026-11-11','to':'2026-11-11'}
    data=(await client.get('/api/admin/pulse/analytics',headers=headers,params=params)).json()
    assert {p['author'] for p in data['posts']}=={'First','Last'}
    assert data['timeline']==[{'date':'2026-11-11','count':2}]
    alert=(await client.get('/api/admin/pulse/monitor/alerts/zone-alert/analysis',headers=headers,params={'from':'2026-11-11','to':'2026-11-11'})).json()
    assert {p['author'] for p in alert['posts']}=={'First','Last'}

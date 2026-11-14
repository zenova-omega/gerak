import pytest
from sqlalchemy import select
from app.models.pulse_monitor import MonitorSchedule, CrawlJob


@pytest.mark.asyncio
async def test_project_query_is_independent_and_does_not_start_crawling(client, admin_token, db):
    headers = {'Authorization': f'Bearer {admin_token}'}
    projects = []
    for name in ('Project pertama', 'Project kedua'):
        response = await client.post('/api/admin/pulse/topics', headers=headers,
                                     json={'label': name, 'query': name, 'sources': ['rss']})
        assert response.status_code == 200
        projects.append(response.json())
        assert response.json()['is_active'] is False
    query = '("penyadapan" OR "disadap") AND "presiden" NOT "film"'
    response = await client.put('/api/admin/pulse/topics/' + projects[0]['id'], headers=headers,
                               json={'label': 'Penyadapan Presiden', 'query': query})
    assert response.status_code == 200
    response = await client.get('/api/admin/pulse/topics', headers=headers)
    rows = {row['id']: row for row in response.json()}
    assert rows[projects[0]['id']]['query'] == query
    assert rows[projects[1]['id']]['query'] == 'Project kedua'
    assert list((await db.execute(select(MonitorSchedule))).scalars()) == []
    assert list((await db.execute(select(CrawlJob))).scalars()) == []

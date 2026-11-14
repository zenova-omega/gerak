import httpx
import pytest
from app.services import pulse_comments as service


@pytest.mark.asyncio
async def test_comments_one_page_plaintext_dedup_and_sort(monkeypatch):
    calls = []
    async def handler(request):
        calls.append(request)
        assert request.url.params['maxResults'] == '50'
        assert request.url.params['order'] == 'relevance'
        assert request.url.params['textFormat'] == 'plainText'
        assert 'key' not in request.url.params
        return httpx.Response(200, json={'nextPageToken': 'do-not-follow', 'items': [
            {'snippet': {'topLevelComment': {'id': 'a', 'snippet': {'textDisplay': '<b>plain text</b>', 'authorDisplayName': 'A', 'likeCount': 1}}, 'totalReplyCount': 2}},
            {'snippet': {'topLevelComment': {'id': 'b', 'snippet': {'textDisplay': 'Second', 'authorDisplayName': 'B', 'likeCount': 8}}}},
            {'snippet': {'topLevelComment': {'id': 'b', 'snippet': {'textDisplay': 'Second', 'likeCount': 8}}}},
        ]})
    original = httpx.AsyncClient
    monkeypatch.setattr(service.httpx, 'AsyncClient', lambda **kw: original(transport=httpx.MockTransport(handler), **kw))
    result = await service.fetch_comments('abc123', 'test-key')
    assert len(calls) == 1
    assert result['has_more'] is True
    assert [r['id'] for r in result['items']] == ['b', 'a']
    assert result['items'][1]['text'] == '<b>plain text</b>'
    assert result['items'][1]['replies'] == 2


@pytest.mark.asyncio
@pytest.mark.parametrize('reason', ['commentsDisabled', 'quotaExceeded'])
async def test_remote_failure_is_safe_status_not_remote_text(monkeypatch, reason):
    original = httpx.AsyncClient
    monkeypatch.setattr(service.httpx, 'AsyncClient', lambda **kw: original(transport=httpx.MockTransport(lambda req: httpx.Response(403, json={'error': {'message': 'secret-text', 'errors': [{'reason': reason}]}})), **kw))
    result = await service.fetch_comments('abc123', 'test-key')
    assert result['status'] == reason
    assert 'secret-text' not in str(result)


@pytest.mark.asyncio
async def test_collection_selects_five_and_cached_repeat_does_not_fetch(db, monkeypatch):
    from app.models.pulse import WatchTopic, SourceItem
    topic = WatchTopic(label='test', query='test')
    db.add(topic)
    await db.flush()
    for i in range(7):
        db.add(SourceItem(topic_id=topic.id, source='youtube', platform='youtube', url=f'https://www.youtube.com/watch?v=video{i}', metrics={'likes': i}))
    await db.flush()
    calls = []
    async def fake(video, key):
        calls.append(video)
        return {'status': 'success', 'items': [{'id': video, 'text': 'real fixture', 'likes': 2}], 'has_more': False}
    monkeypatch.setattr(service, 'fetch_comments', fake)
    result = await service.collect_top_comments(db, topic.id, 'test-key')
    assert calls == ['video6', 'video5', 'video4', 'video3', 'video2']
    assert result['comments'] == 5
    await service.collect_top_comments(db, topic.id, 'test-key')
    assert len(calls) == 5


@pytest.mark.asyncio
async def test_comments_collection_requires_admin(client, user_token):
    response = await client.post('/api/admin/pulse/topics/test/comments', headers={'Authorization': f'Bearer {user_token}'})
    assert response.status_code == 403


@pytest.mark.asyncio
@pytest.mark.parametrize('payload,status', [
    ({'error': {'errors': {'unexpected': 'object'}}}, 403),
    ({'items': [{'snippet': {'topLevelComment': {'id': 'a', 'snippet': {'textDisplay': 'hello', 'authorDisplayName': {'bad': True}, 'publishedAt': ['bad']}}}}]}, 200),
])
async def test_malformed_comment_metadata_cannot_escape_as_renderable_objects(monkeypatch, payload, status):
    original = httpx.AsyncClient
    monkeypatch.setattr(service.httpx, 'AsyncClient', lambda **kw: original(transport=httpx.MockTransport(lambda req: httpx.Response(status, json=payload)), **kw))
    result = await service.fetch_comments('abc123', 'fake')
    if status == 403:
        assert result['status'] == 'provider_error'
    else:
        assert result['items'][0]['author'] is None
        assert result['items'][0]['published_at'] is None


@pytest.mark.asyncio
async def test_all_topics_retains_comment_snapshot_from_older_shared_video(db):
    from datetime import datetime
    from app.models.pulse import WatchTopic, SourceItem
    from app.services.pulse import pulse_analytics
    a, b = WatchTopic(label='A', query='A'), WatchTopic(label='B', query='B')
    db.add_all([a, b])
    await db.flush()
    snapshot = {'status': 'success', 'items': [{'id': 'c', 'text': 'hi'}], 'fetched_at': '2026-11-11T01:00:00Z'}
    for topic, time, metrics in [(a, datetime(2026, 11, 10), {'comment_snapshot': snapshot, 'likes': 2}), (b, datetime(2026, 11, 11), {'likes': 4})]:
        db.add(SourceItem(topic_id=topic.id, source='youtube', platform='youtube', url='https://www.youtube.com/watch?v=shared', crawled_at=time, metrics=metrics))
    await db.flush()
    result = await pulse_analytics(db)
    assert len(result['posts']) == 1
    assert result['posts'][0]['metrics']['likes'] == 4
    assert result['posts'][0]['metrics']['comment_snapshot'] == snapshot


def _item(platform, url, metrics=None, id_=None):
    from app.models.pulse import SourceItem
    return SourceItem(id=id_ or platform, topic_id='ct', source='xpoz', platform=platform, url=url, text='t', metrics=metrics or {})


def test_comment_target_needs_a_real_provider_id():
    from app.services import pulse_comments as service
    assert service.comment_target(_item('x', 'https://x.com/i/status/123')) == ('x', '123')
    assert service.comment_target(_item('tiktok', 'https://www.tiktok.com/@a/video/987')) == ('tiktok', '987')
    assert service.comment_target(_item('youtube', 'https://www.youtube.com/watch?v=abc_1')) == ('youtube', 'abc_1')
    assert service.comment_target(_item('instagram', 'https://www.instagram.com/p/Cx/')) is None  # link alone is not enough
    assert service.comment_target(_item('instagram', 'https://www.instagram.com/p/Cx/', {'provider_post_id': '11_22'})) == ('instagram', '11_22')
    assert service.comment_target(_item('news', 'https://news.example/a')) is None
    assert service.comment_target(_item('x', 'https://x.com/someone')) is None


def test_provider_comments_are_normalised_and_unsafe_rows_dropped():
    from app.services.ingest import xpoz
    rows = [{'id': '5', 'text': 'setuju', 'authorUsername': 'a', 'createdAt': '2026-11-12T01:00:00Z', 'likeCount': 9, 'replyCount': 2},
            {'id': '6', 'text': '   '}, {'id': '<script>', 'text': 'x'}, 'bukan objek', {'id': '7', 'text': 'kedua', 'likeCount': '40'}]
    items = xpoz.normalize_comments('x', rows, 'https://x.com/i/status/1')
    assert [(c['id'], c['likes'], c['replies']) for c in items] == [('7', 40, None), ('5', 9, 2)]
    assert items[1]['url'] == 'https://x.com/i/status/5' and items[1]['author'] == 'a'
    social = xpoz.normalize_comments('tiktok', [{'id': '9', 'text': 'halo', 'username': 'u', 'likeCount': 1}], 'https://www.tiktok.com/@a/video/1')
    assert social[0]['url'] == 'https://www.tiktok.com/@a/video/1' and social[0]['author'] == 'u'


@pytest.mark.asyncio
async def test_project_collection_is_bounded_ordered_and_stops_on_quota(db, monkeypatch):
    from app.models.pulse import WatchTopic
    from app.services import pulse_comments as service
    from app.services.ingest import xpoz
    from app.config import get_settings
    db.add(WatchTopic(id='ct', label='c', query='c', is_active=False)); await db.flush()
    db.add_all([_item('x', 'https://x.com/i/status/1', {'comments': 5}, 'few'), _item('x', 'https://x.com/i/status/2', {'comments': 50}, 'many'),
                _item('tiktok', 'https://www.tiktok.com/@a/video/3', {'comments': 20}, 'tt'), _item('x', 'https://x.com/i/status/4', {'comments': 0}, 'none'),
                _item('news', 'https://news.example/a', {}, 'news'), _item('youtube', 'https://www.youtube.com/watch?v=vid', {'comments': 9}, 'yt')])
    await db.flush()
    settings = get_settings()
    monkeypatch.setattr(settings, 'XPOZ_API_KEY', type(settings.XPOZ_API_KEY)('k'))
    monkeypatch.setattr(settings, 'YOUTUBE_API_KEY', type(settings.YOUTUBE_API_KEY)(''))
    calls = []

    async def fake(platform, post_id, key, url, limit=300):
        calls.append((platform, post_id))
        if platform == 'tiktok':
            raise xpoz.XpozToolError('rate_limited')
        return {'items': [{'id': '1', 'text': 'k', 'author': None, 'published_at': None, 'likes': 1, 'replies': None, 'url': url}], 'has_more': False}
    monkeypatch.setattr(xpoz, 'fetch_xpoz_comments', fake)
    result = await service.collect_project_comments(db, 'ct', settings, max_posts=3)
    # most-commented first; the rate-limited provider stops and its post stays for a later batch
    assert calls == [('x', '2'), ('tiktok', '3')]
    assert [(r['post_id'], r['status']) for r in result['posts']] == [('many', 'success'), ('tt', 'rate_limited'), ('yt', 'not_configured')]
    assert result['stopped'] == ['xpoz', 'youtube'] and result['comments'] == 1
    coverage = result['coverage']
    assert coverage['eligible'] == 5 and coverage['collected'] == 1 and coverage['not_requestable'] == 1
    again = await service.collect_project_comments(db, 'ct', settings, max_posts=1)
    assert [r['post_id'] for r in again['posts']] == ['tt']  # collected posts are never fetched twice

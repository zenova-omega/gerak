"""Pictures of the people who comment on X, TikTok and Instagram, and for YouTube comments stored before pictures were kept.

The supplier's comment lists for X, TikTok and Instagram carry no picture. Those commenters are looked up through
the paid profile lanes that already serve post accounts, the most-liked comments first, and the picture is attached
to each comment as `profile_image_url` when comments are read. (A YouTube comment gets it when it is collected:
see test_pulse_comment_photos.py. Here only the fill-in for comments that were already stored.)
"""
from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest

from app.models.pulse import SourceItem, WatchTopic
from app.models.pulse_monitor import MonitorSchedule, WorkerPolicy, WorkerUsage
from app.models.pulse_profiles import PulseAccountProfile
from app.services import pulse_profiles as service
from app.services.ingest import xpoz

NOW = datetime(2026, 11, 17, 3, 0)


async def project(db, label):
    topic = WatchTopic(label=label, query=label.lower())
    db.add(topic)
    await db.flush()
    await db.execute(MonitorSchedule.__table__.update().values(enabled=False))
    await db.execute(PulseAccountProfile.__table__.delete())
    db.add(MonitorSchedule(topic_id=topic.id, provider='rss', enabled=True))
    service._no_pictures.clear()
    return topic


def stored(comment_id, author, likes, **extra):
    return {'id': comment_id, 'author': author, 'text': 'Komentar ' + comment_id, 'published_at': '2026-11-12T03:49:00', 'likes': likes, 'replies': 0, 'url': 'https://example.com/c', **extra}


def post(topic, platform, key, author, items, metrics=None, status='success'):
    urls = {'youtube': f'https://www.youtube.com/watch?v={key}', 'x': f'https://x.com/a/status/{key}', 'tiktok': f'https://www.tiktok.com/@a/video/{key}', 'instagram': f'https://www.instagram.com/p/{key}/'}
    return SourceItem(id=f'{platform}-{key}', topic_id=topic.id, source='t', platform=platform, url=urls[platform], text='t', author=author,
                      metrics={**(metrics or {}), 'comment_snapshot': {'status': status, 'fetched_at': '2026-11-14T11:18:00+00:00', 'items': items}})


@pytest.mark.asyncio
async def test_stored_youtube_comments_get_their_pictures_without_losing_anything(db):
    topic = await project(db, 'Foto komentar')
    db.add_all([
        post(topic, 'youtube', 'vidAAAAAAA1', 'Kanal', [stored('a', 'Satu', 9, sentiment={'label': 'negative'}), stored('b', 'Dua', 5), stored('c', 'Tiga', 1)]),
        post(topic, 'youtube', 'vidAAAAAAA2', 'Kanal', [stored('d', 'Empat', 2, profile_image_url='https://yt3.ggpht.com/d')]),      # already has pictures
        post(topic, 'youtube', 'vidAAAAAAA3', 'Kanal', [], status='commentsDisabled'),
        post(topic, 'x', '111', '@a', [stored('x1', 'warga', 3)])])
    await db.flush()
    targets = await service.comment_photo_targets(db, limit=5)
    assert targets == [{'item_id': 'youtube-vidAAAAAAA1', 'video': 'vidAAAAAAA1', 'pages': 1}], 'only YouTube posts whose stored comments lack pictures'
    filled = await service.merge_comment_photos(db, 'youtube-vidAAAAAAA1', {'a': 'https://yt3.ggpht.com/a', 'c': 'https://yt3.ggpht.com/c', 'zzz': 'https://yt3.ggpht.com/z'}, NOW)
    assert filled == 2
    snapshot = (await db.get(SourceItem, 'youtube-vidAAAAAAA1', populate_existing=True)).metrics['comment_snapshot']
    assert [item.get('profile_image_url') for item in snapshot['items']] == ['https://yt3.ggpht.com/a', None, 'https://yt3.ggpht.com/c']
    assert snapshot['items'][0]['sentiment'] == {'label': 'negative'} and snapshot['items'][0]['text'] == 'Komentar a' and len(snapshot['items']) == 3
    assert snapshot['photos_at'] and snapshot['fetched_at'] == '2026-11-14T11:18:00+00:00', 'the comments themselves are not fetched again'
    assert await service.comment_photo_targets(db, limit=5) == [], 'asked once: a comment whose author shows no picture is not asked for again'


@pytest.mark.asyncio
async def test_a_step_fills_pictures_from_a_fresh_read_and_does_not_mark_a_post_when_the_read_carried_none(db, monkeypatch):
    topic = await project(db, 'Isi foto')
    db.add_all([post(topic, 'youtube', 'vidBBBBBBB1', 'Kanal', [stored('a', 'Satu', 9), stored('b', 'Dua', 5)]),
                post(topic, 'youtube', 'vidBBBBBBB2', 'Kanal', [stored('c', 'Tiga', 1)])])
    await db.flush()
    asked = []

    async def read_again(video, key, pages):
        asked.append((video, pages))
        if video == 'vidBBBBBBB1':
            return {'status': 'success', 'items': [stored('a', 'Satu', 9, profile_image_url='https://yt3.ggpht.com/a'), stored('b', 'Dua', 5)]}
        return {'status': 'success', 'items': [stored('c', 'Tiga', 1)]}      # the collector does not keep pictures (yet): nothing to learn
    monkeypatch.setattr(service, 'fetch_all_comments', read_again)
    await service.ensure_profile_policy(db)
    await db.execute(WorkerPolicy.__table__.update().where(WorkerPolicy.provider.in_(('profiles_x', 'profiles_ig', 'profiles_tt'))).values(daily_limit=0, blocked_reason=None))
    await db.execute(WorkerPolicy.__table__.update().where(WorkerPolicy.provider == 'profiles').values(daily_limit=40, blocked_reason=None))
    await db.execute(WorkerUsage.__table__.delete().where(WorkerUsage.day == '2026-11-17'))
    result = await service.collect_profiles(db, SimpleNamespace(XPOZ_API_KEY='', YOUTUBE_API_KEY='k'), NOW)
    assert result['status'] == 'collected' and result['comment_photos'] == 1 and sorted(asked) == [('vidBBBBBBB1', 1), ('vidBBBBBBB2', 1)]
    first = (await db.get(SourceItem, 'youtube-vidBBBBBBB1', populate_existing=True)).metrics['comment_snapshot']
    second = (await db.get(SourceItem, 'youtube-vidBBBBBBB2', populate_existing=True)).metrics['comment_snapshot']
    assert first['items'][0]['profile_image_url'] == 'https://yt3.ggpht.com/a' and first.get('photos_at')
    assert 'photos_at' not in second, 'a read without any picture proves nothing, so the post is not marked as done'
    assert await service.comment_photo_targets(db) == [], 'and it is not read again by this process either'


@pytest.mark.asyncio
async def test_commenters_wait_for_a_lookup_most_liked_first_and_people_already_known_are_not_bought_again(db):
    topic = await project(db, 'Komentator')
    db.add_all([
        post(topic, 'x', '111', 'penulis_x', [stored('1', 'Warga_Satu', 5), stored('2', 'warga_dua', 90), stored('3', 'penulis_x', 400), stored('4', 'nama tidak sah!', 999), stored('5', 'warga_dua', 2)],
             metrics={'author_id': '900'}),
        post(topic, 'tiktok', '222', 'kreator', [stored('6', 'tt.satu', 7), stored('7', 'tt_dua', 70)], metrics={'author_username': 'kreator'}),
        post(topic, 'instagram', '333', 'akun_ig', [stored('8', 'ig.satu', 1), stored('9', 'ig_dua', 10), stored('10', 'ig_tiga', 5)], metrics={'author_username': 'akun_ig'})])
    db.add_all([PulseAccountProfile(platform='instagram', key='ig_dua', photo_type='image/jpeg', photo_bytes=b'x', checked_at=NOW),         # looked up before
                PulseAccountProfile(platform='x', key='u:warga_satu', photo_url='https://pbs.twimg.com/w_200x200.jpg', checked_at=NOW - timedelta(days=40))])   # too old: asked again
    await db.flush()
    waiting = await service.waiting_accounts(db, NOW)
    assert waiting['x_commenters'] == ['warga_dua', 'warga_satu'], 'most liked first, each name once, never an account that posts in the project or a name that cannot be an account'
    assert waiting['tiktok_commenters'] == ['tt_dua', 'tt.satu']
    assert waiting['instagram_commenters'] == ['ig_tiga', 'ig.satu']


@pytest.mark.asyncio
async def test_a_step_looks_commenters_up_beside_post_accounts_stores_them_and_charges_the_same_lanes(db, monkeypatch):
    topic = await project(db, 'Langkah')
    db.add_all([
        post(topic, 'x', '111', 'penulis_x', [stored('1', 'warga_satu', 5), stored('2', 'warga_dua', 90)], metrics={'author_id': '900'}),
        post(topic, 'tiktok', '222', 'kreator', [stored('6', 'tt.satu', 7)], metrics={'author_username': 'kreator'})])
    await db.flush()
    asked = {}

    async def by_id(ids, key):
        asked['ids'] = ids
        return {'900': {'photo_url': 'https://pbs.twimg.com/p_200x200.jpg', 'followers': 10, 'location': 'Jakarta', 'based_in': 'Indonesia'}}

    async def by_name(names, key):
        asked['names'] = names
        return {'warga_dua': {'photo_url': 'https://pbs.twimg.com/dua_200x200.jpg', 'followers': 3, 'location': None, 'based_in': None}}

    async def tiktok(username, key):
        asked.setdefault('tiktok', []).append(username)
        return {'photo_url': 'https://cdn.example.com/' + username + '.jpg', 'followers': 1}

    async def picture(url):
        return ('image/jpeg', b'bytes')
    monkeypatch.setattr(service, 'fetch_xpoz_profiles', by_id)
    monkeypatch.setattr(service, 'fetch_xpoz_profiles_by_username', by_name)
    monkeypatch.setattr(service, 'fetch_xpoz_tiktok_user', tiktok)
    monkeypatch.setattr(service, 'fetch_image', picture)
    await service.ensure_profile_policy(db)
    await db.execute(WorkerPolicy.__table__.update().where(WorkerPolicy.provider.in_(('profiles', 'profiles_ig'))).values(daily_limit=0, blocked_reason=None))
    await db.execute(WorkerPolicy.__table__.update().where(WorkerPolicy.provider.in_(('profiles_x', 'profiles_tt'))).values(daily_limit=40, blocked_reason=None))
    await db.execute(WorkerUsage.__table__.delete().where(WorkerUsage.day == '2026-11-17'))
    result = await service.collect_profiles(db, SimpleNamespace(XPOZ_API_KEY='k', YOUTUBE_API_KEY=''), NOW)
    assert result['status'] == 'collected'
    assert asked == {'ids': ['900'], 'names': ['warga_dua', 'warga_satu'], 'tiktok': ['kreator', 'tt.satu']}
    assert (await db.get(PulseAccountProfile, ('x', 'u:warga_dua'))).photo_url == 'https://pbs.twimg.com/dua_200x200.jpg'
    assert (await db.get(PulseAccountProfile, ('x', 'u:warga_satu'))).checked_at == NOW, 'asked and not found: remembered, so it is not bought again every step'
    assert (await db.get(PulseAccountProfile, ('tiktok', 'tt.satu'))).photo_type == 'image/jpeg'
    assert (await db.get(WorkerUsage, 'profiles_x:2026-11-17', populate_existing=True)).used == 2, 'one call for the accounts, one for the commenters'
    assert (await db.get(WorkerUsage, 'profiles_tt:2026-11-17', populate_existing=True)).used == 2
    assert (await service.waiting_accounts(db, NOW))['x_commenters'] == []

    # Reading: every comment gets the picture that is known for its author; the stored comments are left as they were.
    posts = [{'platform': 'x', 'author': 'penulis_x', 'metrics': {'author_id': '900', 'comment_snapshot': {'status': 'success', 'items': [stored('1', 'warga_satu', 5), stored('2', 'Warga_Dua', 90)]}}},
             {'platform': 'tiktok', 'author': 'kreator', 'metrics': {'author_username': 'kreator', 'comment_snapshot': {'status': 'success', 'items': [stored('6', 'tt.satu', 7)]}}},
             {'platform': 'youtube', 'author': 'Kanal', 'metrics': {'comment_snapshot': {'status': 'success', 'items': [stored('y', 'Warga', 1, profile_image_url='https://yt3.ggpht.com/y')]}}}]
    original = posts[0]['metrics']['comment_snapshot']['items']
    await service.attach_profiles(db, posts)
    x_items = posts[0]['metrics']['comment_snapshot']['items']
    assert [item.get('profile_image_url') for item in x_items] == [None, 'https://pbs.twimg.com/dua_200x200.jpg']
    assert original[1].get('profile_image_url') is None, 'the list that was read is not changed in place'
    assert posts[1]['metrics']['comment_snapshot']['items'][0]['profile_image_url'].startswith('/admin/pulse/profiles/photo/tiktok/tt.satu?v=')
    assert posts[2]['metrics']['comment_snapshot']['items'][0]['profile_image_url'] == 'https://yt3.ggpht.com/y'


@pytest.mark.asyncio
async def test_a_refused_lookup_is_not_followed_by_a_second_paid_call_in_the_same_step(db, monkeypatch):
    topic = await project(db, 'Tolak')
    db.add(post(topic, 'x', '111', 'penulis_x', [stored('1', 'warga_satu', 5)], metrics={'author_id': '900'}))
    await db.flush()
    calls = []

    async def refused(ids, key):
        calls.append('ids')
        raise xpoz.XpozToolError('insufficient_credits')

    async def by_name(names, key):
        calls.append('names')
        return {}
    monkeypatch.setattr(service, 'fetch_xpoz_profiles', refused)
    monkeypatch.setattr(service, 'fetch_xpoz_profiles_by_username', by_name)
    await service.ensure_profile_policy(db)
    await db.execute(WorkerPolicy.__table__.update().where(WorkerPolicy.provider.in_(('profiles', 'profiles_ig', 'profiles_tt'))).values(daily_limit=0, blocked_reason=None))
    await db.execute(WorkerPolicy.__table__.update().where(WorkerPolicy.provider == 'profiles_x').values(daily_limit=40, blocked_reason=None))
    await db.execute(WorkerUsage.__table__.delete().where(WorkerUsage.day == '2026-11-17'))
    result = await service.collect_profiles(db, SimpleNamespace(XPOZ_API_KEY='k', YOUTUBE_API_KEY=''), NOW)
    assert calls == ['ids'] and result['status'] == 'provider_stopped' and result['stopped'] == ['insufficient_credits']
    assert await db.get(PulseAccountProfile, ('x', 'u:warga_satu')) is None, 'nothing was asked, so the commenter still waits'


def test_x_accounts_can_be_asked_by_username_and_are_returned_under_it():
    rows = [{'id': '12', 'username': 'Warga_Dua', 'profileImageUrl': 'https://pbs.twimg.com/profile_images/1/a_normal.jpg', 'followersCount': '340', 'location': 'Bandung'},
            {'id': '13', 'username': None, 'profileImageUrl': 'https://pbs.twimg.com/profile_images/1/b_normal.jpg'}]
    assert xpoz.normalize_profiles(rows, by='username') == {'warga_dua': {'photo_url': 'https://pbs.twimg.com/profile_images/1/a_200x200.jpg', 'followers': 340, 'location': 'Bandung', 'based_in': None}}
    assert set(xpoz.normalize_profiles(rows)) == {'12', '13'}, 'by account id, as before'


def test_a_batch_is_shared_between_post_accounts_and_commenters():
    assert service._shared(['a1', 'a2', 'a3', 'a4', 'a5'], ['c1', 'c2', 'c3'], 4) == ['a1', 'a2', 'c1', 'c2'], 'half each when both wait'
    assert service._shared(['a1'], ['c1', 'c2', 'c3'], 4) == ['a1', 'c1', 'c2', 'c3'], 'commenters take what accounts leave'
    assert service._shared(['a1', 'a2', 'a3', 'a4', 'a5'], ['c1'], 4) == ['a1', 'a2', 'c1', 'a3'], 'and accounts what commenters leave'
    assert service._shared(['a1', 'a2', 'a3'], [], 2) == ['a1', 'a2'] and service._shared([], [], 4) == []
    assert service.commenter_key('x', '@Warga_Dua') == 'u:warga_dua' and service.commenter_key('x', 'nama tidak sah!') is None
    assert service.commenter_key('tiktok', 'TT.Satu') == 'tt.satu' and service.commenter_key('youtube', 'Siapa') is None


@pytest.mark.asyncio
@pytest.mark.parametrize('lookup,account', [(xpoz.fetch_xpoz_instagram_user, 'akun_hilang'), (xpoz.fetch_xpoz_tiktok_user, 'akun.hilang')])
async def test_an_account_the_supplier_cannot_find_is_an_empty_answer_not_a_failure(monkeypatch, lookup, account):
    """Seen 15 Nov 2026: for a renamed or deleted account the supplier answers status "no_data". Read as a failure,
    the account was never noted as looked up, stayed first in line, and the whole lane stopped on it at every step."""
    async def ready(client):
        return None

    async def answer(client, message):
        return {'structuredContent': {'status': 'no_data', 'message': 'User not found for username: ' + account}}
    monkeypatch.setattr(xpoz, '_initialize', ready)
    monkeypatch.setattr(xpoz, '_rpc', answer)
    assert await lookup(account, 'k') == {}

    async def refused(client, message):
        return {'structuredContent': {'status': 'no_data', 'error': 'Insufficient credits'}}
    monkeypatch.setattr(xpoz, '_rpc', refused)
    with pytest.raises(xpoz.XpozToolError):
        await lookup(account, 'k')


@pytest.mark.asyncio
async def test_a_lane_moves_past_an_account_that_does_not_exist_and_does_not_ask_for_it_again(db, monkeypatch):
    topic = await project(db, 'Akun hilang')
    db.add_all([post(topic, 'tiktok', '221', 'hilang', [], metrics={'author_username': 'hilang'}),
                post(topic, 'tiktok', '222', 'kreator', [stored('6', 'tt.satu', 7)], metrics={'author_username': 'kreator'})])
    await db.flush()
    asked = []

    async def tiktok(username, key):
        asked.append(username)
        return {} if username == 'hilang' else {'photo_url': 'https://cdn.example.com/' + username + '.jpg', 'followers': 1}

    async def picture(url):
        return ('image/jpeg', b'bytes')
    monkeypatch.setattr(service, 'fetch_xpoz_tiktok_user', tiktok)
    monkeypatch.setattr(service, 'fetch_image', picture)
    await service.ensure_profile_policy(db)
    await db.execute(WorkerPolicy.__table__.update().where(WorkerPolicy.provider.in_(('profiles', 'profiles_ig', 'profiles_x'))).values(daily_limit=0, blocked_reason=None))
    await db.execute(WorkerPolicy.__table__.update().where(WorkerPolicy.provider == 'profiles_tt').values(daily_limit=40, blocked_reason=None))
    await db.execute(WorkerUsage.__table__.delete().where(WorkerUsage.day == '2026-11-17'))
    result = await service.collect_profiles(db, SimpleNamespace(XPOZ_API_KEY='k', YOUTUBE_API_KEY=''), NOW)
    assert result['status'] == 'collected' and result['stopped'] == [] and sorted(asked) == ['hilang', 'kreator', 'tt.satu']
    missing = await db.get(PulseAccountProfile, ('tiktok', 'hilang'))
    assert missing is not None and missing.checked_at == NOW and missing.photo_type is None, 'noted as looked up, with no picture'
    waiting = await service.waiting_accounts(db, NOW)
    assert waiting['tiktok_lookup'] == [] and waiting['tiktok_commenters'] == []


async def tiktok_only(db):
    await service.ensure_profile_policy(db)
    await db.execute(WorkerPolicy.__table__.update().where(WorkerPolicy.provider.in_(('profiles', 'profiles_ig', 'profiles_x'))).values(daily_limit=0, blocked_reason=None))
    await db.execute(WorkerPolicy.__table__.update().where(WorkerPolicy.provider == 'profiles_tt').values(daily_limit=40, blocked_reason=None))
    await db.execute(WorkerUsage.__table__.delete().where(WorkerUsage.day == '2026-11-17'))
    service._unanswered.clear()


@pytest.mark.asyncio
async def test_one_account_without_an_answer_does_not_stop_the_batch_and_goes_to_the_back_of_the_line(db, monkeypatch):
    """Seen 15 Nov 2026: the supplier took longer than we wait for one account it had to look for. That is not a
    refusal: the rest of the batch is still asked, the lane is not paused, and the account is tried last next time."""
    topic = await project(db, 'Lambat')
    db.add_all([post(topic, 'tiktok', str(220 + n), name, [], metrics={'author_username': name, 'likes': 100 - n}) for n, name in enumerate(('lambat', 'kedua', 'ketiga'))])
    await db.flush()
    asked = []

    async def tiktok(username, key):
        asked.append(username)
        if username == 'lambat':
            raise TimeoutError()
        return {'photo_url': 'https://cdn.example.com/' + username + '.jpg', 'followers': 1}

    async def picture(url):
        return ('image/jpeg', b'bytes')
    monkeypatch.setattr(service, 'fetch_xpoz_tiktok_user', tiktok)
    monkeypatch.setattr(service, 'fetch_image', picture)
    await tiktok_only(db)
    first = (await service.waiting_accounts(db, NOW))['tiktok_lookup']
    assert first[0] == 'lambat' and sorted(first) == ['kedua', 'ketiga', 'lambat']
    result = await service.collect_profiles(db, SimpleNamespace(XPOZ_API_KEY='k', YOUTUBE_API_KEY=''), NOW)
    assert asked == first and result['status'] == 'collected' and result['stopped'] == [], 'no pause for one slow account'
    assert await db.get(PulseAccountProfile, ('tiktok', 'lambat')) is None, 'nothing was learned about it, so it still waits'
    assert (await db.get(WorkerUsage, 'profiles_tt:2026-11-17', populate_existing=True)).used == 2, 'only answered calls are counted'
    db.add(post(topic, 'tiktok', '229', 'baru', [], metrics={'author_username': 'baru'}))
    await db.flush()
    plan = await service.plan_lookups(db, SimpleNamespace(XPOZ_API_KEY='k', YOUTUBE_API_KEY=''), NOW)
    assert plan['tiktok_lookup'] == ['baru', 'lambat'], 'accounts not yet tried come first'
    service._unanswered.clear()


@pytest.mark.asyncio
async def test_two_accounts_in_a_row_without_an_answer_end_the_batch_as_the_supplier_being_unreachable(db, monkeypatch):
    topic = await project(db, 'Putus')
    db.add_all([post(topic, 'tiktok', str(230 + n), name, [], metrics={'author_username': name}) for n, name in enumerate(('satu', 'dua', 'tiga', 'empat'))])
    await db.flush()
    asked = []

    async def tiktok(username, key):
        asked.append(username)
        raise TimeoutError()
    monkeypatch.setattr(service, 'fetch_xpoz_tiktok_user', tiktok)
    await tiktok_only(db)
    result = await service.collect_profiles(db, SimpleNamespace(XPOZ_API_KEY='k', YOUTUBE_API_KEY=''), NOW)
    assert len(asked) == 2 and result['status'] == 'provider_stopped' and result['stopped'] == ['provider_error']
    service._unanswered.clear()

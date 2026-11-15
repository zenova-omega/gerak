"""Instagram profile pictures arrive as signed links that stop working after a few days.
The picture itself is kept, so an account does not lose its face, and the browser no longer asks Instagram for it."""
import uuid
from datetime import datetime, timedelta

import pytest

from app.models.pulse import SourceItem, WatchTopic
from app.models.pulse_monitor import MonitorSchedule, WorkerPolicy
from app.models.pulse_profiles import PulseAccountProfile
from app.services import pulse_profiles as service
from app.services.ingest import site_icon
from app.services.ingest.xpoz import normalize_instagram_user

NOW = datetime(2026, 11, 14, 10, 0)
JPEG = b'\xff\xd8\xff\xe0' + b'0' * 600


def link(expires):
    return f'https://scontent-cdg6-1.cdninstagram.com/v/t51/a.jpg?stp=dst-jpg&oe={int(expires.timestamp()):X}&_nc_sid=1'


def test_an_instagram_account_is_recognised_by_its_username():
    assert service.profile_key('instagram', 'CNN Indonesia', {'author_username': 'CNN.Indonesia'}) == 'cnn.indonesia'
    assert service.profile_key('instagram', '@gibran_rakabuming', {}) == 'gibran_rakabuming'
    assert service.profile_key('instagram', 'Nama Dengan Spasi', {}) is None
    assert service.profile_key('instagram', None, None) is None


def test_a_signed_link_tells_when_it_stops_working():
    from datetime import timezone
    when = datetime(2026, 11, 18, 19, 39, 33, tzinfo=timezone.utc)
    assert service.link_expires(link(when)) == when.replace(tzinfo=None)
    assert service.link_expires('https://pbs.twimg.com/profile_images/1/a_200x200.jpg') is None
    assert service.link_expires('https://example.com/a.jpg?oe=bukan-hex') is None
    assert service.link_expires(None) is None


@pytest.mark.asyncio
async def test_only_a_small_real_image_is_kept(monkeypatch):
    answers = {}
    async def fake(client, url, limit):
        return answers.get(url)
    monkeypatch.setattr(site_icon, '_get', fake)
    answers['https://a.example.com/ok.jpg'] = ('https://a.example.com/ok.jpg', 'image/jpeg', JPEG)
    answers['https://a.example.com/page'] = ('https://a.example.com/page', 'text/html; charset=utf-8', b'<html>')
    answers['https://a.example.com/fake.jpg'] = ('https://a.example.com/fake.jpg', 'image/jpeg', b'<html>not an image</html>')
    answers['https://a.example.com/huge.jpg'] = ('https://a.example.com/huge.jpg', 'image/jpeg', b'\xff\xd8\xff' + b'0' * site_icon.PHOTO_BYTES)
    assert await site_icon.fetch_image('https://a.example.com/ok.jpg') == ('image/jpeg', JPEG)
    for refused in ('https://a.example.com/page', 'https://a.example.com/fake.jpg', 'https://a.example.com/huge.jpg', 'https://a.example.com/gone.jpg'):
        assert await site_icon.fetch_image(refused) is None


def test_the_provider_answer_becomes_a_picture_link_and_a_follower_count():
    payload = {'status': 'success', 'data': {'id': '40746213775', 'username': 'akun', 'profilePicUrl': 'https://scontent-cdg6-1.cdninstagram.com/v/a.jpg?oe=6A000000', 'followerCount': 775322}}
    assert normalize_instagram_user(payload) == {'photo_url': 'https://scontent-cdg6-1.cdninstagram.com/v/a.jpg?oe=6A000000', 'followers': 775322}
    assert normalize_instagram_user({'status': 'success', 'data': {'username': 'akun', 'profilePicUrl': 'http://10.0.0.1/a.jpg'}}) == {'photo_url': None, 'followers': None}
    assert normalize_instagram_user({'status': 'success'}) == {}


async def project(db):
    topic = WatchTopic(id=str(uuid.uuid4()), label='foto', query='foto')
    db.add(topic)
    await db.flush()
    db.add(MonitorSchedule(topic_id=topic.id, provider='instagram', enabled=True, interval_minutes=720, next_run_at=NOW))
    def post(username, url, minutes=0):
        db.add(SourceItem(topic_id=topic.id, source='xpoz', platform='instagram', url=f'https://www.instagram.com/p/{username}{minutes}/', author=username,
                          text='isi', crawled_at=NOW - timedelta(minutes=minutes), metrics={'author_username': username, 'profile_image_url': url}))
    post('masih_hidup', link(NOW + timedelta(days=3)))
    post('masih_hidup', link(NOW - timedelta(days=9)), minutes=600)      # an older post of the same account with a dead link
    post('sudah_mati', link(NOW - timedelta(days=2)))
    post('sudah_disimpan', link(NOW + timedelta(days=3)))
    post('baru_dicoba', link(NOW - timedelta(days=2)))
    db.add(PulseAccountProfile(platform='instagram', key='sudah_disimpan', photo_type='image/jpeg', photo_bytes=JPEG, checked_at=NOW))
    db.add(PulseAccountProfile(platform='instagram', key='baru_dicoba', checked_at=NOW - timedelta(days=1)))   # looked up yesterday, nothing came back
    await db.flush()
    return topic


@pytest.mark.asyncio
async def test_live_links_are_saved_for_free_and_dead_ones_wait_for_a_paid_lookup(db):
    await project(db)
    waiting = await service.waiting_accounts(db, NOW)
    assert [key for key, _ in waiting['instagram']] == ['masih_hidup']
    assert service.link_expires(waiting['instagram'][0][1]) > NOW             # the live link of that account, not the dead one
    assert waiting['instagram_lookup'] == ['sudah_mati']                      # not the stored one, not the one tried yesterday


@pytest.mark.asyncio
async def test_the_paid_instagram_lookup_runs_only_when_its_lane_is_switched_on(db, monkeypatch):
    from types import SimpleNamespace
    await project(db)
    settings = SimpleNamespace(XPOZ_API_KEY='k', YOUTUBE_API_KEY='')
    from sqlalchemy import update
    await service.ensure_profile_policy(db)
    await db.execute(update(WorkerPolicy).where(WorkerPolicy.provider == service.IG_PROVIDER).values(daily_limit=0))
    plan = await service.plan_lookups(db, settings, NOW)
    assert [key for key, _ in plan['instagram']] == ['masih_hidup'] and plan['instagram_lookup'] == []   # switched off in Monitor: nothing is bought
    await db.execute(update(WorkerPolicy).where(WorkerPolicy.provider == service.IG_PROVIDER).values(daily_limit=-1))
    plan = await service.plan_lookups(db, settings, NOW)
    assert plan['instagram_lookup'] == ['sudah_mati']


@pytest.mark.asyncio
async def test_a_stored_picture_is_what_posts_show_and_what_the_server_serves(db, client, admin_token):
    topic = await project(db)
    found = {'x': None, 'youtube': None, 'news': {}, 'instagram': {'masih_hidup': ('image/jpeg', JPEG)},
             'instagram_lookup': {'sudah_mati': ({'photo_url': link(NOW + timedelta(days=5)), 'followers': 1200}, ('image/png', b'\x89PNG\r\n\x1a\n' + b'1' * 80))}}
    plan = {'x': [], 'youtube': [], 'news': [], 'instagram': [('masih_hidup', 'u')], 'instagram_lookup': ['sudah_mati'],
            'usage_id': None, 'x_usage_id': None, 'ig_usage_id': None}
    result = await service.store_lookups(db, plan, found, [], NOW)
    assert result['accounts']['instagram'] == 2
    await db.flush()
    posts = [{'platform': 'instagram', 'author': 'masih_hidup', 'metrics': {'author_username': 'masih_hidup', 'profile_image_url': link(NOW + timedelta(days=3))}},
             {'platform': 'instagram', 'author': 'sudah_mati', 'metrics': {'author_username': 'sudah_mati', 'profile_image_url': link(NOW - timedelta(days=2))}},
             {'platform': 'instagram', 'author': 'baru_dicoba', 'metrics': {'author_username': 'baru_dicoba', 'profile_image_url': 'https://x.example.com/keep.jpg'}}]
    await service.attach_profiles(db, posts)
    assert posts[0]['metrics']['profile_image_url'].startswith('/admin/pulse/profiles/photo/instagram/masih_hidup?v=')
    assert posts[1]['metrics']['profile_image_url'].startswith('/admin/pulse/profiles/photo/instagram/sudah_mati?v=')
    assert posts[1]['metrics']['author_followers'] == 1200
    assert posts[2]['metrics']['profile_image_url'] == 'https://x.example.com/keep.jpg'      # nothing stored: the post keeps its own link

    headers = {'Authorization': f'Bearer {admin_token}'}
    served = await client.get('/api/admin/pulse/profiles/photo/instagram/masih_hidup', headers=headers)
    assert served.status_code == 200 and served.content == JPEG
    assert served.headers['content-type'] == 'image/jpeg' and served.headers['x-content-type-options'] == 'nosniff'
    assert 'private' in served.headers['cache-control']
    assert (await client.get('/api/admin/pulse/profiles/photo/instagram/baru_dicoba', headers=headers)).status_code == 404
    assert (await client.get('/api/admin/pulse/profiles/photo/instagram/tidak_ada', headers=headers)).status_code == 404


@pytest.mark.asyncio
async def test_a_link_that_failed_is_not_asked_again_but_a_newer_one_is(db):
    topic = await project(db)
    first = (await service.waiting_accounts(db, NOW))['instagram']
    plan = {'x': [], 'youtube': [], 'news': [], 'instagram': first, 'instagram_lookup': [], 'usage_id': None, 'x_usage_id': None, 'ig_usage_id': None}
    found = {'x': None, 'youtube': None, 'news': {}, 'instagram': {'masih_hidup': None}, 'instagram_lookup': {}}
    assert (await service.store_lookups(db, plan, found, [], NOW))['accounts']['instagram'] == 0
    await db.flush()
    again = await service.waiting_accounts(db, NOW)
    assert again['instagram'] == []                                           # the same link is not downloaded every step
    assert 'masih_hidup' in again['instagram_lookup']                         # and the paid lookup may still bring it back
    db.add(SourceItem(topic_id=topic.id, source='xpoz', platform='instagram', url='https://www.instagram.com/p/baru/', author='masih_hidup', text='isi',
                      crawled_at=NOW + timedelta(minutes=5), metrics={'author_username': 'masih_hidup', 'profile_image_url': link(NOW + timedelta(days=6))}))
    await db.flush()
    assert [key for key, _ in (await service.waiting_accounts(db, NOW + timedelta(minutes=6)))['instagram']] == ['masih_hidup']


def test_a_tiktok_account_is_recognised_by_its_username_and_its_answer_is_read():
    from app.services.ingest.xpoz import normalize_tiktok_user
    assert service.profile_key('tiktok', 'Kompas TV', {'author_username': 'Kompas.TV'}) == 'kompas.tv'
    assert service.profile_key('tiktok', 'Nama Dengan Spasi', {}) is None
    payload = {'status': 'success', 'data': {'id': '1', 'username': 'akun', 'avatar': 'https://p16-common-sign.tiktokcdn-eu.com/a.jpeg?x-expires=1', 'followerCount': 12504247}}
    assert normalize_tiktok_user(payload) == {'photo_url': 'https://p16-common-sign.tiktokcdn-eu.com/a.jpeg?x-expires=1', 'followers': 12504247}
    assert normalize_tiktok_user({'status': 'success'}) == {}


@pytest.mark.asyncio
async def test_tiktok_pictures_come_from_a_paid_lookup_and_are_kept(db):
    from types import SimpleNamespace
    from sqlalchemy import update
    topic = await project(db)
    for username in ('tt_baru', 'tt_tersimpan', 'tt_kemarin'):
        db.add(SourceItem(topic_id=topic.id, source='xpoz', platform='tiktok', url=f'https://www.tiktok.com/@{username}/video/1', author=username, text='isi',
                          crawled_at=NOW, metrics={'author_username': username}))
    db.add(PulseAccountProfile(platform='tiktok', key='tt_tersimpan', photo_type='image/jpeg', photo_bytes=JPEG, checked_at=NOW))
    db.add(PulseAccountProfile(platform='tiktok', key='tt_kemarin', checked_at=NOW - timedelta(days=1)))
    await db.flush()
    assert (await service.waiting_accounts(db, NOW))['tiktok_lookup'] == ['tt_baru']
    settings = SimpleNamespace(XPOZ_API_KEY='k', YOUTUBE_API_KEY='')
    await service.ensure_profile_policy(db)
    await db.execute(update(WorkerPolicy).where(WorkerPolicy.provider == service.TT_PROVIDER).values(daily_limit=0))
    assert (await service.plan_lookups(db, settings, NOW))['tiktok_lookup'] == []          # switched off in Monitor: nothing is bought
    await db.execute(update(WorkerPolicy).where(WorkerPolicy.provider == service.TT_PROVIDER).values(daily_limit=-1))
    plan = await service.plan_lookups(db, settings, NOW)
    assert plan['tiktok_lookup'] == ['tt_baru']
    found = {'x': None, 'youtube': None, 'news': {}, 'instagram': {}, 'instagram_lookup': {},
             'tiktok_lookup': {'tt_baru': ({'photo_url': 'https://p16-common-sign.tiktokcdn-eu.com/a.jpeg', 'followers': 900}, ('image/jpeg', JPEG))}}
    result = await service.store_lookups(db, {**plan, 'instagram': [], 'instagram_lookup': []}, found, [], NOW)
    assert result['accounts']['tiktok'] == 1
    await db.flush()
    posts = [{'platform': 'tiktok', 'author': 'tt_baru', 'metrics': {'author_username': 'tt_baru'}}]
    await service.attach_profiles(db, posts)
    assert posts[0]['metrics']['profile_image_url'].startswith('/admin/pulse/profiles/photo/tiktok/tt_baru?v=')
    assert posts[0]['metrics']['author_followers'] == 900

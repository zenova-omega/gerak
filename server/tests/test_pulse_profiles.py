from datetime import datetime, timedelta
from types import SimpleNamespace
import pytest
from app.services import pulse_profiles as service
from app.services.ingest import site_icon
from app.services.ingest.rss import parse_rss_feed
from app.services.ingest.xpoz import XpozToolError, normalize_profiles


def test_account_is_recognised_by_provider_id_or_publisher_name():
    assert service.profile_key('x', '@a', {'author_id': 12}) == '12'
    assert service.profile_key('youtube', 'Kanal', {'author_id': 'UCabc'}) == 'UCabc'
    assert service.profile_key('news', '  Kompas.com ', None) == 'kompas.com'
    assert service.profile_key('x', '@a', {}) is None
    assert service.profile_key('instagram', 'a', {'author_id': '1'}) == 'a'    # by username: its own picture link expires
    assert service.profile_key('tiktok', 'a', {'author_id': '1'}) == 'a'
    assert service.profile_key('reddit', 'a', {'author_id': '1'}) is None


def test_best_icon_prefers_the_touch_icon_and_refuses_unsafe_addresses():
    html = ('<link rel="shortcut icon" href="/favicon.ico"><link rel="icon" sizes="192x192" href="/icon-192.png">'
            '<link rel="apple-touch-icon" sizes="180x180" href="//cdn.example.com/touch.png"><link rel="mask-icon" href="/mask.svg">'
            '<link rel="stylesheet" href="/icon.css">')
    assert site_icon.best_icon(html, 'https://www.example.com/') == 'https://cdn.example.com/touch.png'
    assert site_icon.best_icon('<link rel="icon" href="favicon.png">', 'https://www.example.com/news/') == 'https://www.example.com/news/favicon.png'
    for unsafe in ('http://www.example.com/a.png', 'https://localhost/a.png', 'https://10.0.0.1/a.png', 'https://user:pw@example.com/a.png', 'javascript:alert(1)'):
        assert site_icon.best_icon(f'<link rel="icon" href="{unsafe}">', 'https://www.example.com/') is None
    assert site_icon.public_site('https://www.kompas.com') == 'https://www.kompas.com/'
    assert site_icon.public_site('http://www.kompas.com') is None


@pytest.mark.asyncio
async def test_site_icon_never_connects_to_a_name_that_resolves_privately(monkeypatch):
    asked = []
    async def private(host):
        asked.append(host)
        return None
    monkeypatch.setattr(site_icon, '_public_address', private)
    assert await site_icon.fetch_site_icon('https://intranet.example.com') is None
    assert asked == ['intranet.example.com', 'intranet.example.com']   # the page, then the favicon fallback: both refused before any request


def test_feed_keeps_the_publisher_site_and_x_profiles_are_normalised():
    xml = ('<rss><channel><item><title>Judul - Kompas.com</title><link>https://news.google.com/rss/articles/abc</link>'
           '<source url="https://www.kompas.com">Kompas.com</source></item>'
           '<item><title>Lain</title><link>https://news.google.com/rss/articles/def</link><source url="http://10.0.0.5">Intern</source></item></channel></rss>')
    first, second = parse_rss_feed(xml)
    assert first['author'] == 'Kompas.com' and first['metrics'] == {'source_url': 'https://www.kompas.com/'}
    assert 'metrics' not in second
    rows = [{'id': '12', 'profileImageUrl': 'https://pbs.twimg.com/profile_images/1/a_normal.jpg', 'followersCount': '340',
             'location': '  Jakarta Selatan,\n Indonesia ', 'accountBasedIn': 'Indonesia'},
            {'id': '13', 'profileImageUrl': 'http://insecure.example.com/a.jpg', 'followersCount': None, 'location': '', 'accountBasedIn': 7}, {'id': 'not-an-id'}]
    assert normalize_profiles(rows) == {'12': {'photo_url': 'https://pbs.twimg.com/profile_images/1/a_200x200.jpg', 'followers': 340,
                                               'location': 'Jakarta Selatan, Indonesia', 'based_in': 'Indonesia'},
                                        '13': {'photo_url': None, 'followers': None, 'location': None, 'based_in': None}}
    # The location is the owner's own free text: kept as one plain line of at most 200 characters.
    assert normalize_profiles([{'id': '14', 'location': 'a' * 500}])['14']['location'] == 'a' * 200


@pytest.mark.asyncio
async def test_lookup_stores_profiles_charges_the_policy_and_analytics_attaches_them(db, monkeypatch):
    from app.models.pulse import WatchTopic, SourceItem
    from app.models.pulse_monitor import MonitorSchedule, WorkerPolicy, WorkerUsage
    from app.models.pulse_profiles import PulseAccountProfile
    now = datetime(2026, 11, 14, 3, 0)
    topic = WatchTopic(label='Profil', query='profil')
    db.add(topic)
    await db.flush()
    await db.execute(MonitorSchedule.__table__.update().values(enabled=False))
    await db.execute(PulseAccountProfile.__table__.delete())
    db.add(MonitorSchedule(topic_id=topic.id, provider='rss', enabled=True))
    for i, (platform, author, metrics) in enumerate([
            ('x', '@satu', {'author_id': '111'}), ('x', '@satu', {'author_id': '111'}), ('x', '@dua', {'author_id': '222'}),
            ('youtube', 'Kanal', {'author_id': 'UCabc'}), ('news', 'Kompas.com', {'source_url': 'https://www.kompas.com/'}),
            ('news', 'Kompas.com', None), ('news', 'Tanpa Situs', None), ('instagram', 'ig', {'author_id': '9', 'profile_image_url': 'https://cdn.example.com/own.jpg'})]):
        db.add(SourceItem(topic_id=topic.id, source='t', platform=platform, url=f'https://example.com/p{i}', text='t', author=author, metrics=metrics))
    await db.flush()
    asked = {}
    async def x_profiles(ids, key):
        asked['x'] = ids
        return {'111': {'photo_url': 'https://pbs.twimg.com/a_200x200.jpg', 'followers': 500}}
    async def channels(ids, key):
        asked['youtube'] = ids
        return {'UCabc': {'photo_url': 'https://yt3.ggpht.com/c.jpg', 'followers': None}}
    async def icon(address):
        asked.setdefault('news', []).append(address)
        return 'https://asset.kompas.com/touch.png'
    monkeypatch.setattr(service, 'fetch_xpoz_profiles', x_profiles)
    monkeypatch.setattr(service, 'fetch_youtube_channels', channels)
    monkeypatch.setattr(service, 'fetch_site_icon', icon)
    async def picture(url):
        return None   # the download fails: nothing is stored and the post keeps its own link
    monkeypatch.setattr(service, 'fetch_image', picture)
    settings = SimpleNamespace(XPOZ_API_KEY='k', YOUTUBE_API_KEY='k')
    await service.ensure_profile_policy(db)
    lanes = WorkerPolicy.provider.in_(('profiles', 'profiles_x', 'profiles_ig', 'profiles_tt'))   # the paid lanes are on by default; this test switches them itself
    await db.execute(WorkerPolicy.__table__.update().where(lanes).values(daily_limit=0, blocked_reason=None))
    assert (await service.collect_profiles(db, settings, now))['status'] == 'off' and not asked
    await db.execute(WorkerUsage.__table__.delete().where(WorkerUsage.day == '2026-11-14', WorkerUsage.provider.in_(('profiles', 'profiles_x'))))
    # The paid X lane is off unless switched on: free lookups run, X accounts keep waiting.
    await db.execute(WorkerPolicy.__table__.update().where(WorkerPolicy.provider == 'profiles').values(daily_limit=40))
    result = await service.collect_profiles(db, settings, now)
    assert result['accounts'] == {'x': 0, 'youtube': 1, 'news': 1, 'instagram': 0, 'tiktok': 0} and result['x_lookups'] == 0 and 'x' not in asked
    await db.execute(PulseAccountProfile.__table__.delete())
    await db.execute(WorkerUsage.__table__.update().where(WorkerUsage.id == 'profiles:2026-11-14').values(used=0))
    asked.clear()
    await db.execute(WorkerPolicy.__table__.update().where(WorkerPolicy.provider == 'profiles_x').values(daily_limit=1))
    result = await service.collect_profiles(db, settings, now)
    assert result['status'] == 'collected' and result['accounts'] == {'x': 2, 'youtube': 1, 'news': 1, 'instagram': 0, 'tiktok': 0} and (result['lookups'], result['x_lookups']) == (3, 1)   # a channel batch, a site, and one picture download
    assert asked == {'x': ['111', '222'], 'youtube': ['UCabc'], 'news': ['https://www.kompas.com/']}   # busiest first; a publisher without a site waits
    assert (await db.get(WorkerUsage, 'profiles:2026-11-14', populate_existing=True)).used == 3   # a channel batch, a site, one picture download
    assert (await db.get(WorkerUsage, 'profiles_x:2026-11-14', populate_existing=True)).used == 1
    assert (await db.get(PulseAccountProfile, ('x', '222'))).photo_url is None            # asked, nothing returned: not asked again for a month
    assert (await service.collect_profiles(db, settings, now))['status'] == 'nothing_waiting'
    assert (await service.waiting_accounts(db, now + timedelta(days=31)))['x'] == ['111', '222']
    posts = [{'platform': 'x', 'author': '@satu', 'metrics': {'author_id': '111'}}, {'platform': 'news', 'author': 'kompas.com', 'metrics': {}},
             {'platform': 'youtube', 'author': 'Kanal', 'metrics': {'author_id': 'UCabc'}},
             {'platform': 'instagram', 'author': 'ig', 'metrics': {'author_id': '9', 'profile_image_url': 'https://cdn.example.com/own.jpg'}},
             {'platform': 'x', 'author': '@dua', 'metrics': {'author_id': '222'}}]
    await service.attach_profiles(db, posts)
    assert posts[0]['metrics'] == {'author_id': '111', 'profile_image_url': 'https://pbs.twimg.com/a_200x200.jpg', 'author_followers': 500,
                                   'author_location': '', 'author_based_in': ''}      # asked together with the picture; this owner wrote no location
    assert posts[1]['metrics'] == {'profile_image_url': 'https://asset.kompas.com/touch.png'}
    assert posts[2]['metrics']['profile_image_url'] == 'https://yt3.ggpht.com/c.jpg' and 'author_followers' not in posts[2]['metrics']
    assert posts[3]['metrics']['profile_image_url'] == 'https://cdn.example.com/own.jpg' and 'profile_image_url' not in posts[4]['metrics']


@pytest.mark.asyncio
async def test_a_provider_refusal_stores_nothing_and_reports_the_stop(db, monkeypatch):
    from app.models.pulse import WatchTopic, SourceItem
    from app.models.pulse_monitor import MonitorSchedule, WorkerPolicy, WorkerUsage
    from app.models.pulse_profiles import PulseAccountProfile
    now = datetime(2026, 11, 15, 3, 0)
    topic = WatchTopic(label='Tolak', query='tolak')
    db.add(topic)
    await db.flush()
    await db.execute(MonitorSchedule.__table__.update().values(enabled=False))
    await db.execute(PulseAccountProfile.__table__.delete())
    db.add(MonitorSchedule(topic_id=topic.id, provider='rss', enabled=True))
    db.add(SourceItem(topic_id=topic.id, source='t', platform='x', url='https://example.com/x1', text='t', author='@a', metrics={'author_id': '777'}))
    await db.flush()
    async def refused(ids, key):
        raise XpozToolError('plan_restricted')
    monkeypatch.setattr(service, 'fetch_xpoz_profiles', refused)
    await service.ensure_profile_policy(db)
    await db.execute(WorkerPolicy.__table__.update().where(WorkerPolicy.provider.in_(('profiles', 'profiles_x'))).values(daily_limit=40, blocked_reason=None))
    await db.execute(WorkerUsage.__table__.delete().where(WorkerUsage.day == '2026-11-15', WorkerUsage.provider.in_(('profiles', 'profiles_x'))))
    result = await service.collect_profiles(db, SimpleNamespace(XPOZ_API_KEY='k', YOUTUBE_API_KEY=''), now)
    assert result['status'] == 'provider_stopped' and result['stopped'] == ['plan_restricted']
    assert await db.get(PulseAccountProfile, ('x', '777')) is None      # still waiting, so it is asked again after the pause


@pytest.mark.asyncio
async def test_the_profile_location_of_x_accounts_is_stored_attached_and_filled_in_for_accounts_asked_before(db, monkeypatch):
    """The location an owner wrote on the profile comes with the same lookup as the picture. Accounts that were looked
    up before it was kept are asked once more, busiest first, and keep the picture they already have."""
    from app.models.pulse import WatchTopic, SourceItem
    from app.models.pulse_monitor import MonitorSchedule, WorkerPolicy, WorkerUsage
    from app.models.pulse_profiles import PulseAccountProfile
    now = datetime(2026, 11, 16, 3, 0)
    topic = WatchTopic(label='Lokasi', query='lokasi')
    db.add(topic)
    await db.flush()
    await db.execute(MonitorSchedule.__table__.update().values(enabled=False))
    await db.execute(PulseAccountProfile.__table__.delete())
    db.add(MonitorSchedule(topic_id=topic.id, provider='rss', enabled=True))
    for i, (author, account) in enumerate([('@lama', '111'), ('@lama', '111'), ('@lama', '111'), ('@kosong', '333'), ('@kosong', '333'), ('@baru', '222')]):
        db.add(SourceItem(topic_id=topic.id, source='t', platform='x', url=f'https://example.com/l{i}', text='t', author=author, metrics={'author_id': account}))
    db.add(PulseAccountProfile(platform='x', key='111', photo_url='https://pbs.twimg.com/old_200x200.jpg', followers=10, checked_at=now - timedelta(days=1)))
    await db.flush()
    assert (await service.waiting_accounts(db, now))['x'] == ['111', '333', '222']      # the account without a stored location waits too
    async def x_profiles(ids, key):
        return {'111': {'photo_url': None, 'followers': None, 'location': 'Bandung, Jawa Barat', 'based_in': 'Indonesia'},
                '333': {'photo_url': 'https://pbs.twimg.com/k_200x200.jpg', 'followers': 5, 'location': None, 'based_in': None}}
    monkeypatch.setattr(service, 'fetch_xpoz_profiles', x_profiles)
    await service.ensure_profile_policy(db)
    await db.execute(WorkerPolicy.__table__.update().where(WorkerPolicy.provider.in_(('profiles', 'profiles_ig', 'profiles_tt'))).values(daily_limit=0, blocked_reason=None))
    await db.execute(WorkerPolicy.__table__.update().where(WorkerPolicy.provider == 'profiles_x').values(daily_limit=40, blocked_reason=None))
    await db.execute(WorkerUsage.__table__.delete().where(WorkerUsage.day == '2026-11-16'))
    result = await service.collect_profiles(db, SimpleNamespace(XPOZ_API_KEY='k', YOUTUBE_API_KEY=''), now)
    assert result['status'] == 'collected' and result['accounts']['x'] == 3
    row = await db.get(PulseAccountProfile, ('x', '111'), populate_existing=True)
    assert (row.location, row.based_in, row.location_at) == ('Bandung, Jawa Barat', 'Indonesia', now)
    assert (row.photo_url, row.followers) == ('https://pbs.twimg.com/old_200x200.jpg', 10)      # an empty answer keeps what was stored
    assert (await service.waiting_accounts(db, now))['x'] == []
    posts = [{'platform': 'x', 'author': '@lama', 'metrics': {'author_id': '111'}}, {'platform': 'x', 'author': '@kosong', 'metrics': {'author_id': '333'}},
             {'platform': 'x', 'author': '@baru', 'metrics': {'author_id': '222'}}, {'platform': 'x', 'author': '@lain', 'metrics': {'author_id': '999'}}]
    await service.attach_profiles(db, posts)
    assert posts[0]['metrics']['author_location'] == 'Bandung, Jawa Barat'
    assert posts[1]['metrics']['author_location'] == '' and posts[2]['metrics']['author_location'] == ''      # asked: the owner wrote none
    assert 'author_location' not in posts[3]['metrics']                                                     # not asked yet
    assert posts[0]['metrics']['author_based_in'] == 'Indonesia' and posts[1]['metrics']['author_based_in'] == ''   # the country the platform names
    assert 'author_based_in' not in posts[3]['metrics']
    await db.execute(PulseAccountProfile.__table__.update().where(PulseAccountProfile.key == '333').values(based_in='Southeast Asia'))
    again = [{'platform': 'x', 'author': '@kosong', 'metrics': {'author_id': '333'}}]
    await service.attach_profiles(db, again)
    assert again[0]['metrics']['author_based_in'] == 'Southeast Asia'


def test_new_profile_columns_are_added_to_a_database_that_predates_them():
    from app.services.pulse_migrate import ADDED_COLUMNS
    assert {('pulse_account_profiles', 'location', 'VARCHAR(200)'), ('pulse_account_profiles', 'based_in', 'VARCHAR(80)'),
            ('pulse_account_profiles', 'location_at', 'DATETIME')} <= set(ADDED_COLUMNS)

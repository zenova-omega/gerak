"""Deleting stored posts: when someone asks, and when a post is older than the retention period.

A post is never only its row. Its observations, its rows in the analysis queues, its review, the totals of its
conversation group, the alerts, AI summaries and answers that cite it, its account's profile and (on request) its copy
in filed reports go with it or are corrected. One module does this for both reasons a post is deleted: a request, by
author on one platform or by link, and age, counted in days by PULSE_RETENTION_DAYS. Nothing is deleted by default:
the setting starts at 0, and the command only counts until it is told to apply.
"""
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from types import SimpleNamespace

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.database import Base
from app.models.pulse import Issue, SourceItem, WatchTopic
from app.models.pulse_chat import PulseChatConversation
from app.models.pulse_monitor import MetricSnapshot, PulseAlert
from app.models.pulse_profiles import PulseAccountProfile
from app.models.pulse_report import PulseReport
from app.models.pulse_response_analysis import ResponseAnalysisJob
from app.models.pulse_review import PostReview
from app.models.pulse_sentiment import SentimentJob
from app.models.pulse_summary import PulseSummary

NOW = datetime(2026, 11, 15, 12)


def tag():
    """A few characters no other test uses. Tests share one database file, so names and links must be a test's own."""
    return uuid.uuid4().hex[:10]


def link():
    return f'https://contoh.test/{tag()}'


async def project(db, label='Uji hapus'):
    topic = WatchTopic(label=label, query='uji')
    db.add(topic)
    await db.flush()
    return topic


async def post(db, topic, *, platform='x', author='warga', text='Isi posting', published=NOW - timedelta(days=3), crawled=None, metrics=None, url=None):
    """A stored post written straight into the table, for tests that need no conversation group."""
    row = SourceItem(topic_id=topic.id, source=platform, platform=platform, url=url or link(), text=text, author=author, published_at=published,
                     metrics=metrics, **({'crawled_at': crawled} if crawled else {}))
    db.add(row)
    await db.flush()
    return row


def collected(url, text, **fields):
    """A post as a collector hands it to `ingest_items`, which also puts it in a conversation group."""
    return {'source': 'x', 'platform': 'x', 'url': url, 'text': text, 'author': 'warga', 'published_at': NOW - timedelta(days=3), 'metrics': {'likes': 2}, **fields}


async def by_link(db, topic, url):
    return (await db.scalars(select(SourceItem).where(SourceItem.topic_id == topic.id, SourceItem.url == url))).one()


async def rows(db, model, column, value):
    return await db.scalar(select(func.count()).select_from(model).where(column == value))


def alert(topic, evidence, *, issue_id=None, kind='engagement_growth', detail=None):
    return PulseAlert(dedup_key=f'uji:{tag()}', topic_id=topic.id, issue_id=issue_id, kind=kind, title='Peringatan uji', window_start=NOW, window_end=NOW,
                      evidence_ids=evidence, detail=detail or {})


def cites(row, code='P1'):
    """A source as a stored summary or a chat answer lists it."""
    return {'code': code, 'id': row.id, 'author': row.author, 'platform': row.platform, 'url': row.url, 'text': row.text[:200]}


def turn(question, *cited):
    return {'question': question, 'answer': 'Jawaban uji [P1].', 'sources': [cites(row) for row in cited], 'scope': {'posts': 2}, 'answered_at': '2026-11-15T05:00:00Z'}


def filed(topic, snapshot_posts, analysed=()):
    """A filed report with the parts the browser sends: the posts, and the analysis of each post and its comments."""
    return PulseReport(topic_id=topic.id, title='Laporan uji', created_by='analis', snapshot={
        'topic': {'id': topic.id, 'label': topic.label, 'query': topic.query}, 'period': {}, 'generatedAt': '2026-11-15T05:00:00Z', 'selectedPlatforms': None,
        'posts': list(snapshot_posts), 'responseAnalysis': {'loaded': True, 'error': False, 'response': {'target': topic.label, 'posts': list(analysed)}}})


def copy_of(row, **more):
    """A post as a filed report holds it."""
    return {'id': row.id, 'platform': row.platform, 'url': row.url, 'author': row.author, 'text': row.text, 'metrics': row.metrics or {}, **more}


@pytest.fixture
async def own_database():
    """A database of the test's own, for code that opens its own sessions and commits: the daily run and the command."""
    engine = create_async_engine('sqlite+aiosqlite:///:memory:')
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    yield async_sessionmaker(engine, expire_on_commit=False)
    await engine.dispose()


# ── What goes with a post ───────────────────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_a_deleted_post_takes_its_observations_queue_rows_review_and_analysis_with_it(db):
    from app.services.pulse import ingest_items
    from app.services.pulse_retention import delete_posts
    topic = await project(db)
    one, two = link(), link()
    found = [collected(one, 'Jalan di desa kami rusak parah sejak musim hujan'), collected(two, 'Pasar malam dibuka lagi akhir pekan ini')]
    await ingest_items(db, topic, found)
    await ingest_items(db, topic, found)             # seen twice: two observations of each post
    gone, kept = await by_link(db, topic, one), await by_link(db, topic, two)
    for row in (gone, kept):
        db.add_all([SentimentJob(item_id=row.id), PostReview(topic_id=topic.id, post_id=row.id, updated_by='analis'),
                    ResponseAnalysisJob(id=uuid.uuid4().hex, post_id=row.id, subject_id=row.id, kind='post', content_target_hash='h', status='done'),
                    ResponseAnalysisJob(id=uuid.uuid4().hex, post_id=row.id, subject_id='komentar-1', kind='comment', content_target_hash='h', status='done')])
    await db.flush()
    counts = await delete_posts(db, [gone.id, gone.id, 'tidak-ada'])      # a repeated or unknown id is no error
    assert {key: counts[key] for key in ('posts', 'metric_snapshots', 'sentiment_jobs', 'reviews', 'response_jobs')} == {
        'posts': 1, 'metric_snapshots': 2, 'sentiment_jobs': 1, 'reviews': 1, 'response_jobs': 2}
    for model, column in ((SourceItem, SourceItem.id), (MetricSnapshot, MetricSnapshot.item_id), (SentimentJob, SentimentJob.item_id),
                          (PostReview, PostReview.post_id), (ResponseAnalysisJob, ResponseAnalysisJob.post_id)):
        assert await rows(db, model, column, gone.id) == 0, model.__tablename__
        assert await rows(db, model, column, kept.id) > 0, model.__tablename__
    assert (await delete_posts(db, []))['posts'] == 0


@pytest.mark.asyncio
async def test_a_group_that_lost_a_post_is_counted_again_from_the_posts_that_remain(db):
    from app.services.pulse import ingest_items
    from app.services.pulse_retention import delete_posts
    topic, control = await project(db), await project(db, 'Pembanding')
    text = 'Harga beras naik lagi pekan ini di pasar induk kota'
    a, b, c = link(), link(), link()
    found = [collected(a, text, metrics={'likes': 5, 'comments': 1, 'reach': 100}),
             collected(b, text, platform='youtube', metrics={'likes': 40, 'shares': 2, 'reach': 900}),
             collected(c, text, metrics={'engagement': 7})]
    await ingest_items(db, topic, found)
    await ingest_items(db, control, [found[0], found[2]])       # what the group looks like when the middle post was never collected
    middle = await by_link(db, topic, b)
    group, expected = await db.get(Issue, middle.issue_id), await db.get(Issue, (await by_link(db, control, a)).issue_id)
    assert group.item_count == 3 and group.engagement_total == 55 and group.platforms == ['x', 'youtube']
    counts = await delete_posts(db, [middle.id])
    await db.refresh(group)
    assert (group.item_count, group.engagement_total, group.reach_total, group.platforms, group.score) == (2, 13, 100, ['x'], 13.0)
    assert (group.item_count, group.engagement_total, group.reach_total, group.platforms, group.score) == (
        expected.item_count, expected.engagement_total, expected.reach_total, expected.platforms, expected.score)
    assert counts['issues'] == 0, 'a group that still has posts stays'


@pytest.mark.asyncio
async def test_a_group_is_last_seen_when_its_newest_remaining_post_was_published(db):
    from app.services.pulse import ingest_items
    from app.services.pulse_retention import delete_posts
    topic = await project(db)
    text = 'Jadwal pemadaman listrik bergilir diumumkan untuk pekan depan'
    start = datetime.utcnow()
    early, late, past = start + timedelta(days=1), start + timedelta(days=2), start - timedelta(days=30)
    a, b, c = link(), link(), link()
    await ingest_items(db, topic, [collected(a, text, published_at=early), collected(b, text, published_at=late), collected(c, text, published_at=past)])
    newest = await by_link(db, topic, b)
    group = await db.get(Issue, newest.issue_id)
    assert group.last_seen_at == late
    await delete_posts(db, [(await by_link(db, topic, c)).id])
    await db.refresh(group)
    assert group.last_seen_at == late, 'losing an older post changes nothing'
    await delete_posts(db, [newest.id])
    await db.refresh(group)
    assert group.last_seen_at == early


@pytest.mark.asyncio
async def test_deleting_a_post_never_makes_its_group_look_newer(db):
    from app.services.pulse import ingest_items
    from app.services.pulse_retention import delete_posts
    topic = await project(db)
    text = 'Antrean minyak goreng murah mengular sejak pagi di balai desa'
    dated, undated = link(), link()
    await ingest_items(db, topic, [collected(dated, text), collected(undated, text, published_at=None)])
    await ingest_items(db, topic, [collected(undated, text, published_at=None)])      # seen again: its collection date moves forward
    seen_again = await by_link(db, topic, undated)
    group = await db.get(Issue, seen_again.issue_id)
    before = group.last_seen_at
    assert seen_again.crawled_at > before, 'the group was last seen when the undated post first arrived'
    await delete_posts(db, [(await by_link(db, topic, dated)).id])
    await db.refresh(group)
    assert group.last_seen_at == before and group.item_count == 1


@pytest.mark.asyncio
async def test_on_request_a_group_also_loses_the_one_liner_and_the_title_it_took_from_the_deleted_post(db):
    from app.services.pulse_retention import delete_posts
    topic = await project(db)
    group = Issue(topic_id=topic.id, title='Judul dari video pertama', item_count=3, summary='Satu kalimat buatan AI tentang kelompok ini.', sentiment=-0.4)
    db.add(group)
    await db.flush()

    async def member(title, age):
        row = SourceItem(topic_id=topic.id, issue_id=group.id, source='youtube', platform='youtube', url=link(), title=title, text='Uraian', author='Kanal Uji',
                         published_at=NOW - timedelta(days=age), metrics={'likes': 1})
        db.add(row)
        await db.flush()
        return row
    opener, newest, middle = await member('Judul dari video pertama', 9), await member('Judul dari video kedua', 5), await member('Judul dari video ketiga', 7)
    await delete_posts(db, [newest.id])                                            # a post that only expired
    await db.refresh(group)
    assert (group.title, group.summary, group.sentiment, group.item_count) == ('Judul dari video pertama', 'Satu kalimat buatan AI tentang kelompok ini.', -0.4, 2)
    await delete_posts(db, [opener.id], on_request=True)
    await db.refresh(group)
    assert group.title == middle.title, 'the earliest post that remains names the group'
    assert group.summary is None and group.sentiment is None and group.item_count == 1


@pytest.mark.asyncio
async def test_a_group_left_without_posts_is_deleted_together_with_the_alerts_that_point_at_it(db):
    from app.services.pulse import ingest_items
    from app.services.pulse_retention import delete_posts
    topic = await project(db)
    alone, other = link(), link()
    await ingest_items(db, topic, [collected(alone, 'Jembatan gantung di hulu sungai putus diterjang banjir bandang'),
                                   collected(other, 'Festival kuliner nusantara digelar di alun-alun selama tiga hari')])
    gone, kept = await by_link(db, topic, alone), await by_link(db, topic, other)
    assert gone.issue_id and kept.issue_id and gone.issue_id != kept.issue_id
    emptied, cited_elsewhere, untouched = alert(topic, [], issue_id=gone.issue_id, kind='recent_cluster'), alert(topic, [kept.id], issue_id=gone.issue_id), alert(topic, [kept.id], issue_id=kept.issue_id)
    db.add_all([emptied, cited_elsewhere, untouched])
    await db.flush()
    counts = await delete_posts(db, [gone.id])
    assert counts['issues'] == 1 and counts['alerts'] == 2
    assert await db.get(Issue, gone.issue_id) is None and await db.get(Issue, kept.issue_id) is not None
    assert await rows(db, PulseAlert, PulseAlert.id, emptied.id) == 0 and await rows(db, PulseAlert, PulseAlert.id, cited_elsewhere.id) == 0
    assert await rows(db, PulseAlert, PulseAlert.id, untouched.id) == 1


@pytest.mark.asyncio
async def test_deleted_posts_leave_the_evidence_of_alerts_and_an_alert_left_with_none_is_deleted(db):
    from app.services.pulse_retention import delete_posts
    topic = await project(db)
    gone, kept = await post(db, topic), await post(db, topic)
    shared = alert(topic, [gone.id, kept.id], kind='volume_spike', detail={'authors': 3, 'baseline_evidence_ids': [kept.id, gone.id]})
    only, failure = alert(topic, [gone.id]), alert(topic, [], kind='collection_error', detail={'error': 'timeout'})
    db.add_all([shared, only, failure])
    await db.flush()
    counts = await delete_posts(db, [gone.id])
    assert counts['alerts'] == 1
    assert await rows(db, PulseAlert, PulseAlert.id, only.id) == 0
    evidence, detail = (await db.execute(select(PulseAlert.evidence_ids, PulseAlert.detail).where(PulseAlert.id == shared.id))).one()
    assert evidence == [kept.id] and detail == {'authors': 3, 'baseline_evidence_ids': [kept.id]}
    assert await rows(db, PulseAlert, PulseAlert.id, failure.id) == 1, 'an alert that never had evidence is not about a post'


@pytest.mark.asyncio
async def test_a_summary_that_cites_a_deleted_post_is_deleted_and_is_written_again_on_demand(db):
    from app.services.pulse_retention import delete_posts
    topic, elsewhere = await project(db), await project(db, 'Proyek lain')
    gone, kept, far = await post(db, topic), await post(db, topic), await post(db, elsewhere)
    db.add_all([PulseSummary(topic_id=topic.id, format='brief', data={'format': 'brief', 'sections': [], 'sources': [cites(kept), cites(gone, 'A1')]}),
                PulseSummary(topic_id=topic.id, format='timeline', data={'format': 'timeline', 'sections': [], 'sources': [cites(kept)]}),
                PulseSummary(topic_id=elsewhere.id, format='brief', data={'format': 'brief', 'sections': [], 'sources': [cites(far)]})])
    await db.flush()
    counts = await delete_posts(db, [gone.id])
    assert counts['summaries'] == 1
    left = (await db.execute(select(PulseSummary.topic_id, PulseSummary.format).where(PulseSummary.topic_id.in_([topic.id, elsewhere.id])))).all()
    assert sorted(left) == sorted([(topic.id, 'timeline'), (elsewhere.id, 'brief')])


@pytest.mark.asyncio
async def test_on_request_every_summary_of_the_project_goes_because_its_figures_quote_posts_it_does_not_cite(db):
    from app.services.pulse_retention import delete_posts
    topic, elsewhere = await project(db), await project(db, 'Proyek lain')
    gone, kept, far = await post(db, topic, author='akun_awal'), await post(db, topic), await post(db, elsewhere)
    db.add_all([PulseSummary(topic_id=topic.id, format='executive', data={'sections': [], 'sources': [cites(kept)],
                                                                          'facts': {'first': {'code': 'A1', 'author': 'akun_awal', 'platform': 'x', 'text': gone.text}}}),
                PulseSummary(topic_id=elsewhere.id, format='executive', data={'sections': [], 'sources': [cites(far)]})])
    await db.flush()
    counts = await delete_posts(db, [gone.id], on_request=True)
    assert counts['summaries'] == 1
    assert await rows(db, PulseSummary, PulseSummary.topic_id, topic.id) == 0 and await rows(db, PulseSummary, PulseSummary.topic_id, elsewhere.id) == 1


@pytest.mark.asyncio
async def test_an_answer_that_cites_a_deleted_post_leaves_its_conversation_and_an_emptied_conversation_is_deleted(db):
    from app.services.pulse_retention import delete_posts
    topic = await project(db)
    gone, kept = await post(db, topic), await post(db, topic)
    mixed = PulseChatConversation(topic_id=topic.id, user_id='analis', title='Dua pertanyaan', turns=[turn('Siapa yang mulai?', gone, kept), turn('Lalu?', kept)])
    emptied = PulseChatConversation(topic_id=topic.id, user_id='analis', title='Satu pertanyaan', turns=[turn('Apa isinya?', gone)])
    apart = PulseChatConversation(topic_id=topic.id, user_id='analis', title='Tidak terkait', turns=[turn('Berapa banyak?', kept)])
    db.add_all([mixed, emptied, apart])
    await db.flush()
    counts = await delete_posts(db, [gone.id])
    assert counts['chat_turns'] == 2 and counts['conversations'] == 1
    left = dict((await db.execute(select(PulseChatConversation.id, PulseChatConversation.turns).where(PulseChatConversation.topic_id == topic.id))).all())
    assert set(left) == {mixed.id, apart.id}
    assert [row['question'] for row in left[mixed.id]] == ['Lalu?'] and len(left[apart.id]) == 1


@pytest.mark.asyncio
async def test_an_accounts_profile_goes_only_when_no_post_of_the_account_remains_in_any_project(db):
    from app.services.pulse_retention import delete_posts
    first, second = await project(db), await project(db, 'Proyek lain')
    account, channel, publisher, username = str(uuid.uuid4().int)[:18], 'UC' + tag(), f'Koran {tag()}', f'toko.{tag()}'
    here = await post(db, first, author='warga_x', metrics={'author_id': account})
    there = await post(db, second, author='warga_x', metrics={'author_id': account})        # the same account, collected for another project
    video = await post(db, first, platform='youtube', author='Kanal Uji', metrics={'author_id': channel})
    story = await post(db, first, platform='news', author=publisher)
    picture = await post(db, first, platform='instagram', author='Toko Uji', metrics={'author_username': username.upper()})
    unknown = await post(db, first, platform='threads', author='tanpa_profil')
    db.add_all([PulseAccountProfile(platform='x', key=account, followers=10, location='Jakarta', photo_type='image/png', photo_bytes=b'png'),
                PulseAccountProfile(platform='youtube', key=channel, followers=5), PulseAccountProfile(platform='news', key=publisher.casefold()),
                PulseAccountProfile(platform='instagram', key=username)])
    await db.flush()

    async def profiles():
        return {platform for platform, in (await db.execute(select(PulseAccountProfile.platform).where(
            PulseAccountProfile.key.in_([account, channel, publisher.casefold(), username])))).all()}
    counts = await delete_posts(db, [here.id, video.id, story.id, picture.id, unknown.id])
    assert counts['profiles'] == 3 and await profiles() == {'x'}, 'the X account still has a post in the other project'
    assert (await delete_posts(db, [there.id]))['profiles'] == 1 and await profiles() == set()


@pytest.mark.asyncio
async def test_filed_reports_lose_the_deleted_posts_on_request_and_are_left_alone_when_a_post_only_expired(db):
    from app.services.pulse_retention import delete_posts
    topic = await project(db)
    expired, asked, kept = await post(db, topic), await post(db, topic), await post(db, topic)
    report = filed(topic, [copy_of(expired), copy_of(asked), copy_of(kept), {**copy_of(asked), 'id': 'nomor-lama'}],     # the same link under an id it had before
                   [{'post_id': expired.id, 'stance': None, 'comments': []}, {'post_id': asked.id, 'stance': None, 'comments': []}, {'post_id': kept.id, 'stance': None, 'comments': []}])
    db.add(report)
    await db.flush()

    async def snapshot():
        return (await db.execute(select(PulseReport.snapshot).where(PulseReport.id == report.id))).scalar_one()
    before = await snapshot()
    assert (await delete_posts(db, [expired.id]))['report_entries'] == 0 and await snapshot() == before
    counts = await delete_posts(db, [asked.id], on_request=True)
    after = await snapshot()
    assert counts['report_entries'] == 3, 'its copy, the copy under an older id, and its analysis'
    assert [row['id'] for row in after['posts']] == [expired.id, kept.id]
    assert [row['post_id'] for row in after['responseAnalysis']['response']['posts']] == [expired.id, kept.id]
    assert after['topic'] == before['topic'] and after['generatedAt'] == before['generatedAt']


# ── A request ───────────────────────────────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_posts_are_found_by_author_on_one_platform_or_by_link(db):
    from app.services.pulse_retention import find_posts
    first, second = await project(db), await project(db, 'Proyek lain')
    name = f'Warga_{tag()}'
    a = await post(db, first, platform='threads', author=name)
    b = await post(db, second, platform='threads', author=name.lower())                                  # another project, written in lower case
    c = await post(db, first, platform='instagram', author='Nama Tampilan', metrics={'author_username': name})
    await post(db, first, platform='x', author=name)                                                     # the same name on another platform is another account
    await post(db, first, platform='threads', author=name + 'x')
    assert set(await find_posts(db, 'threads', author=f' @{name.upper()} ')) == {a.id, b.id}
    assert await find_posts(db, 'instagram', author=name) == [c.id], 'the username finds a post shown under a display name'
    assert await find_posts(db, 'threads', author=tag()) == []
    shared = link()
    d, e = await post(db, first, url=shared), await post(db, second, platform='youtube', url=shared)
    assert set(await find_posts(db, url=f'  {shared} ')) == {d.id, e.id}, 'the same link collected for two projects is two stored posts'
    assert await find_posts(db, 'youtube', url=shared) == [e.id] and await find_posts(db, url=shared + '/lain') == []
    for nothing_asked in ({'platform': 'threads'}, {'platform': 'threads', 'author': '  '}, {'author': name}, {'url': ' '}, {}):
        with pytest.raises(ValueError):                                                                  # a platform alone never selects everything on it
            await find_posts(db, **nothing_asked)


@pytest.mark.asyncio
async def test_a_request_by_author_also_removes_the_authors_comments_under_other_posts(db):
    from app.services.pulse_retention import delete_request
    topic = await project(db)
    name = f'warga_{tag()}'
    said = {'id': 'k1', 'author': f'@{name.upper()}', 'text': 'Komentar yang diminta dihapus', 'likes': 9, 'url': 'https://contoh.test/k1'}
    others = [{'id': 'k2', 'author': 'tetangga', 'text': 'Komentar orang lain', 'likes': 3}, {'id': 'k3', 'author': None, 'text': 'Tanpa nama', 'likes': 1}]
    under = await post(db, topic, author='kanal_berita', metrics={'likes': 4, 'comments': 3, 'comment_snapshot': {'status': 'success', 'has_more': False, 'items': [said, *others]}})
    quiet = await post(db, topic, author='kanal_berita', metrics={'comment_snapshot': {'status': 'success', 'items': list(others)}})
    same_name_elsewhere = await post(db, topic, platform='youtube', author='kanal_video', metrics={'comment_snapshot': {'status': 'success', 'items': [dict(said)]}})
    # Comments stored without an id are named by their place in the list, and places shift when one leaves.
    unnumbered = await post(db, topic, author='kanal_berita', metrics={'comment_snapshot': {'status': 'success', 'items': [
        {'author': 'tetangga', 'text': 'Pertama'}, {'author': name, 'text': 'Kedua, yang diminta dihapus'}, {'author': 'lain', 'text': 'Ketiga'}]}})

    def read(row, kind, subject):
        return ResponseAnalysisJob(id=uuid.uuid4().hex, post_id=row.id, subject_id=subject, kind=kind, content_target_hash='h', status='done', result={'stance': {'label': 'unclear'}})
    db.add_all([read(under, 'post', under.id), read(under, 'comment', 'k1'), read(under, 'comment', 'k2'), read(quiet, 'post', quiet.id), read(quiet, 'comment', 'k2'),
                read(unnumbered, 'post', unnumbered.id), *(read(unnumbered, 'comment', f'snapshot-index:{place}') for place in range(3))])
    db.add(PulseSummary(topic_id=topic.id, format='brief', data={'sections': [], 'sources': [], 'facts': {'quotes': [{'code': 'K1', 'text': said['text'], 'author': said['author']}]}}))
    report = filed(topic, [copy_of(under), copy_of(quiet)],
                   [{'post_id': under.id, 'comments': [{'id': 'k1', 'sentiment': {'label': 'negative'}}, {'id': 'k2', 'sentiment': {'label': 'neutral'}}]},
                    {'post_id': quiet.id, 'comments': [{'id': 'k2', 'sentiment': {'label': 'neutral'}}]}])
    db.add(report)
    await db.flush()
    counts = await delete_request(db, platform='x', author=name, apply=True)
    assert counts['posts'] == 0 and counts['comments'] == 2 and counts['report_comments'] == 2, 'in the report: the comment and what was read from it'
    metrics = dict((await db.execute(select(SourceItem.id, SourceItem.metrics).where(SourceItem.topic_id == topic.id))).all())
    assert [row['id'] for row in metrics[under.id]['comment_snapshot']['items']] == ['k2', 'k3']
    assert metrics[under.id]['comment_snapshot']['status'] == 'success' and metrics[under.id]['likes'] == 4 and metrics[under.id]['comments'] == 3
    assert len(metrics[quiet.id]['comment_snapshot']['items']) == 2
    assert len(metrics[same_name_elsewhere.id]['comment_snapshot']['items']) == 1, 'the same name on another platform is another account'
    # What was read from the removed comment goes; the post's own reading and the other comments keep theirs, so nothing is analysed twice.
    kept = (await db.execute(select(ResponseAnalysisJob.post_id, ResponseAnalysisJob.kind, ResponseAnalysisJob.subject_id).where(
        ResponseAnalysisJob.post_id.in_([under.id, quiet.id, unnumbered.id])))).all()
    assert sorted(kept) == sorted([(under.id, 'post', under.id), (under.id, 'comment', 'k2'), (quiet.id, 'post', quiet.id), (quiet.id, 'comment', 'k2'),
                                   (unnumbered.id, 'post', unnumbered.id)]), 'comments named by their place are all read again'
    assert counts['response_jobs'] == 4
    assert [row['text'] for row in metrics[unnumbered.id]['comment_snapshot']['items']] == ['Pertama', 'Ketiga']
    assert counts['summaries'] == 1 and await rows(db, PulseSummary, PulseSummary.topic_id, topic.id) == 0
    after = (await db.execute(select(PulseReport.snapshot).where(PulseReport.id == report.id))).scalar_one()
    assert [row['id'] for row in after['posts'][0]['metrics']['comment_snapshot']['items']] == ['k2', 'k3']
    assert [[comment['id'] for comment in row['comments']] for row in after['responseAnalysis']['response']['posts']] == [['k2'], ['k2']]


@pytest.mark.asyncio
async def test_a_request_reaches_copies_in_filed_reports_of_posts_that_are_no_longer_stored(db):
    from app.services.pulse_retention import delete_request
    topic = await project(db)
    name, old_link = f'warga_{tag()}', link()
    kept = await post(db, topic, author='tetangga')
    by_name = {'id': 'sudah-dihapus-1', 'platform': 'x', 'url': link(), 'author': name, 'text': 'Sudah lewat masa simpan', 'metrics': {}}
    by_address = {'id': 'sudah-dihapus-2', 'platform': 'x', 'url': old_link, 'author': 'orang_lain', 'text': 'Sudah lewat masa simpan', 'metrics': {}}
    report = filed(topic, [by_name, by_address, copy_of(kept)], [{'post_id': row_id, 'stance': {'label': 'opposes'}, 'comments': []} for row_id in ('sudah-dihapus-1', 'sudah-dihapus-2', kept.id)])
    db.add(report)
    await db.flush()

    async def copies():
        snapshot = (await db.execute(select(PulseReport.snapshot).where(PulseReport.id == report.id))).scalar_one()
        return [row['id'] for row in snapshot['posts']], [row['post_id'] for row in snapshot['responseAnalysis']['response']['posts']]
    counts = await delete_request(db, platform='x', author=name, apply=True)
    assert counts['report_entries'] == 2 and counts['posts'] == 0, 'the copy, and what was read from it'
    assert await copies() == (['sudah-dihapus-2', kept.id], ['sudah-dihapus-2', kept.id])
    assert (await delete_request(db, url=old_link, apply=True))['report_entries'] == 2 and await copies() == ([kept.id], [kept.id])


@pytest.mark.asyncio
async def test_counting_changes_nothing_and_names_exactly_what_applying_then_deletes(db):
    from app.services.pulse import ingest_items
    from app.services.pulse_retention import delete_request
    topic = await project(db)
    name, account = f'warga_{tag()}', str(uuid.uuid4().int)[:18]
    alone, joined, theirs = link(), link(), link()
    mine = {'author': name, 'metrics': {'likes': 3, 'author_id': account}}
    await ingest_items(db, topic, [collected(alone, 'Sumur warga di lereng bukit mengering sejak awal kemarau', **mine),
                                   collected(joined, 'Antrean solar mengular di stasiun pengisian pinggir kota', **mine),
                                   collected(theirs, 'Antrean solar mengular di stasiun pengisian pinggir kota', author='tetangga', metrics={'likes': 1, 'comment_snapshot': {
                                       'status': 'success', 'items': [{'id': 'k1', 'author': name, 'text': 'Komentar saya'}, {'id': 'k2', 'author': 'lain', 'text': 'Komentar lain'}]}})])
    first, second, other = await by_link(db, topic, alone), await by_link(db, topic, joined), await by_link(db, topic, theirs)
    assert first.issue_id != second.issue_id == other.issue_id
    report = filed(topic, [copy_of(first), copy_of(other)], [{'post_id': other.id, 'comments': [{'id': 'k1'}, {'id': 'k2'}]}])
    talk = PulseChatConversation(topic_id=topic.id, user_id='analis', title='Uji', turns=[turn('Siapa?', first)])
    db.add_all([SentimentJob(item_id=first.id), PostReview(topic_id=topic.id, post_id=first.id, updated_by='analis'),
                ResponseAnalysisJob(id=uuid.uuid4().hex, post_id=first.id, subject_id=first.id, kind='post', content_target_hash='h', status='done'),
                ResponseAnalysisJob(id=uuid.uuid4().hex, post_id=other.id, subject_id='k1', kind='comment', content_target_hash='h', status='done'),
                alert(topic, [first.id], issue_id=first.issue_id), PulseSummary(topic_id=topic.id, format='brief', data={'sections': [], 'sources': [cites(second)]}),
                talk, PulseAccountProfile(platform='x', key=account, followers=7), report])
    await db.flush()

    async def state():
        mine_or_theirs = [first.id, second.id, other.id]
        counted = {model.__tablename__: await db.scalar(select(func.count()).select_from(model).where(column.in_(mine_or_theirs)))
                   for model, column in ((SourceItem, SourceItem.id), (MetricSnapshot, MetricSnapshot.item_id), (SentimentJob, SentimentJob.item_id),
                                         (PostReview, PostReview.post_id), (ResponseAnalysisJob, ResponseAnalysisJob.post_id))}
        for model in (Issue, PulseAlert, PulseSummary, PulseChatConversation):
            counted[model.__tablename__] = await rows(db, model, model.topic_id, topic.id)
        counted['profiles'] = await rows(db, PulseAccountProfile, PulseAccountProfile.key, account)
        counted['report'] = (await db.execute(select(PulseReport.snapshot).where(PulseReport.id == report.id))).scalar_one()
        counted['comments'] = (await db.execute(select(SourceItem.metrics).where(SourceItem.id == other.id))).scalar_one()
        counted['group'] = (await db.execute(select(Issue.item_count, Issue.engagement_total).where(Issue.id == other.issue_id))).one()
        return counted
    before = await state()
    counted = await delete_request(db, platform='x', author=name)        # no `apply`: a count
    assert await state() == before
    deleted = await delete_request(db, platform='x', author=name, apply=True)
    assert deleted == counted
    assert deleted == {'posts': 2, 'metric_snapshots': 2, 'sentiment_jobs': 1, 'reviews': 1, 'response_jobs': 2, 'issues': 1, 'alerts': 1, 'summaries': 1,
                       'chat_turns': 1, 'conversations': 1, 'profiles': 1, 'report_entries': 1, 'comments': 1, 'report_comments': 2}
    after = await state()
    assert after['source_items'] == 1 and after['issues'] == 1 and after['group'] == (1, 1)
    assert [row['id'] for row in after['comments']['comment_snapshot']['items']] == ['k2']
    assert await delete_request(db, platform='x', author=name, apply=True) == {key: 0 for key in deleted}, 'asked again, there is nothing left to delete'


# ── Age ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_a_post_is_past_the_limit_by_its_publication_date_or_by_its_collection_date_when_it_has_none(own_database):
    from app.services.pulse_retention import expired_post_ids
    async with own_database() as db:
        topic = await project(db)
        old = await post(db, topic, published=NOW - timedelta(days=366))
        await post(db, topic, published=NOW - timedelta(days=364))
        undated = await post(db, topic, published=None, crawled=NOW - timedelta(days=400))
        await post(db, topic, published=None, crawled=NOW - timedelta(days=1))                       # no date, seen yesterday: young
        seen_today = await post(db, topic, published=NOW - timedelta(days=500), crawled=NOW)        # the publication date decides, not the last look
        assert await expired_post_ids(db, NOW, 365, 10) == [seen_today.id, undated.id, old.id], 'oldest first'
        assert await expired_post_ids(db, NOW, 365, 2) == [seen_today.id, undated.id] and len(await expired_post_ids(db, NOW, 365)) == 3
        for off in (0, -5):
            assert await expired_post_ids(db, NOW, off, 10) == [], 'no limit means nothing is old'


def test_retention_is_off_until_someone_sets_the_number_of_days():
    from app.config import Settings
    assert Settings.model_fields['PULSE_RETENTION_DAYS'].default == 0
    example = (Path(__file__).resolve().parents[1] / '.env.example').read_text()
    assert '\n# PULSE_RETENTION_DAYS=365' in example, 'the example file shows the setting, commented out'


@pytest.mark.asyncio
@pytest.mark.parametrize('days', [0, -1])
async def test_the_daily_run_opens_nothing_while_no_limit_is_set(monkeypatch, days):
    from app.config import get_settings
    from app.services.pulse_retention import retention_tick
    monkeypatch.setattr(get_settings(), 'PULSE_RETENTION_DAYS', days)

    opened = []

    def never():
        opened.append(1)
        raise AssertionError('no session may be opened while retention is off')
    assert await retention_tick(never, now=NOW) is None and opened == []


@pytest.mark.asyncio
async def test_the_daily_run_deletes_what_is_past_the_limit_a_few_posts_per_transaction(own_database, monkeypatch):
    from app.config import get_settings
    from app.services import pulse_retention as retention
    monkeypatch.setattr(get_settings(), 'PULSE_RETENTION_DAYS', 365)
    monkeypatch.setattr(retention, 'BATCH', 2)
    async with own_database() as db:
        topic = await project(db)
        for age in (366, 380, 400, 500, 700):
            row = await post(db, topic, published=NOW - timedelta(days=age))
            db.add(MetricSnapshot(item_id=row.id, topic_id=topic.id, metrics={}))
        young = await post(db, topic, published=NOW - timedelta(days=30))
        await db.commit()
    opened, left = [], []

    def counting():
        session = own_database()
        commit = session.commit

        async def recorded():
            await commit()
            async with own_database() as look:
                left.append(await look.scalar(select(func.count()).select_from(SourceItem)))
        session.commit = recorded
        opened.append(session)
        return session
    totals = await retention.retention_tick(counting, now=NOW)
    assert totals['posts'] == 5 and totals['metric_snapshots'] == 5
    assert left == [4, 2, 1] and len(opened) == 4, 'six posts, five too old, two at a time: three transactions, then a look that finds nothing left'
    async with own_database() as db:
        assert (await db.scalars(select(SourceItem.id))).all() == [young.id]
        assert await db.scalar(select(func.count()).select_from(MetricSnapshot)) == 0


@pytest.mark.asyncio
async def test_one_daily_run_stops_after_its_share_and_the_next_one_continues(own_database, monkeypatch):
    from app.config import get_settings
    from app.services import pulse_retention as retention
    monkeypatch.setattr(get_settings(), 'PULSE_RETENTION_DAYS', 365)
    monkeypatch.setattr(retention, 'BATCH', 1)
    monkeypatch.setattr(retention, 'MAX_BATCHES', 2)
    async with own_database() as db:
        topic = await project(db)
        for age in (400, 500, 600):
            await post(db, topic, published=NOW - timedelta(days=age))
        await db.commit()
    assert (await retention.retention_tick(own_database, now=NOW))['posts'] == 2
    assert (await retention.retention_tick(own_database, now=NOW))['posts'] == 1
    assert (await retention.retention_tick(own_database, now=NOW))['posts'] == 0


@pytest.mark.asyncio
async def test_a_run_whose_deletions_do_not_take_hold_stops_instead_of_going_round(own_database, monkeypatch):
    from app.services import pulse_retention as retention
    monkeypatch.setattr(retention, 'BATCH', 2)
    async with own_database() as db:
        topic = await project(db)
        for age in (400, 500, 600):
            await post(db, topic, published=NOW - timedelta(days=age))
        await db.commit()

    def forgetful():
        session = own_database()

        async def nothing():
            return None
        session.commit = nothing            # what is deleted comes back when the session closes
        return session
    totals = await retention.delete_expired(forgetful, NOW, 365)
    assert totals['posts'] == 2, 'the first two were offered a second time, so the run ended'
    async with own_database() as db:
        assert await db.scalar(select(func.count()).select_from(SourceItem)) == 3


@pytest.mark.asyncio
async def test_a_daily_run_that_fails_is_logged_by_its_kind_and_does_not_raise(monkeypatch, caplog):
    from app.config import get_settings
    from app.services.pulse_retention import retention_tick
    monkeypatch.setattr(get_settings(), 'PULSE_RETENTION_DAYS', 365)

    def broken():
        raise RuntimeError('database is locked: isi posting rahasia')
    with caplog.at_level('ERROR'):
        assert await retention_tick(broken, now=NOW) is None
    assert 'RuntimeError' in caplog.text and 'rahasia' not in caplog.text


def test_the_daily_run_is_scheduled_with_the_other_background_work(monkeypatch):
    from app.services import scheduler as module
    from app.services.pulse_retention import retention_tick
    added = {}
    monkeypatch.setattr(module, 'scheduler', SimpleNamespace(running=False, start=lambda: None,
                                                             add_job=lambda work, trigger, **options: added.update({options['id']: (work, trigger, options)})))
    module.start_scheduler()
    work, trigger, options = added['pulse_retention']
    assert work is retention_tick and trigger == 'interval' and options['hours'] == 24
    assert options['max_instances'] == 1 and options['coalesce'] is True
    assert 'pulse_monitor' in added and 'pulse_sentiment' in added, 'the jobs that were there before are still registered'


# ── The command ─────────────────────────────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_the_command_only_counts_until_it_is_told_to_apply(own_database):
    from app import pulse_forget as command
    name, neighbour = f'warga_{tag()}', f'tetangga_{tag()}'
    async with own_database() as db:
        topic = await project(db)
        mine = await post(db, topic, platform='threads', author=name, text='Rahasia dapur keluarga kami')
        theirs = await post(db, topic, platform='threads', author=neighbour, text='Urusan tetangga sebelah')
        db.add(MetricSnapshot(item_id=mine.id, topic_id=topic.id, metrics={}))
        await db.commit()
    settings = SimpleNamespace(PULSE_RETENTION_DAYS=0)
    asked = ['request', '--platform', 'threads', '--author', name]
    said = '\n'.join(await command.run(asked, session_factory=own_database, settings=settings, now=NOW))
    assert 'BELUM ADA YANG DIHAPUS' in said and 'posting: 1' in said and '--apply' in said
    assert name in said and neighbour not in said and 'Rahasia' not in said, 'counts only: no text, and no name but the one asked for'
    async with own_database() as db:
        assert await db.get(SourceItem, mine.id) is not None and await db.scalar(select(func.count()).select_from(MetricSnapshot)) == 1
    said = '\n'.join(await command.run([*asked, '--apply'], session_factory=own_database, settings=settings, now=NOW))
    assert 'SUDAH DIHAPUS' in said and 'BELUM ADA YANG DIHAPUS' not in said and 'posting: 1' in said
    async with own_database() as db:
        assert await db.get(SourceItem, mine.id) is None and await db.get(SourceItem, theirs.id) is not None
        assert await db.scalar(select(func.count()).select_from(MetricSnapshot)) == 0
    said = '\n'.join(await command.run(['request', '--url', theirs.url, '--apply'], session_factory=own_database, settings=settings, now=NOW))
    assert 'SUDAH DIHAPUS' in said and 'posting: 1' in said
    async with own_database() as db:
        assert await db.get(SourceItem, theirs.id) is None
    said = '\n'.join(await command.run(asked, session_factory=own_database, settings=settings, now=NOW))
    assert 'posting: 0' in said and 'Tidak ada' in said


@pytest.mark.asyncio
async def test_the_command_counts_posts_past_the_limit_and_deletes_them_only_with_apply(own_database):
    from app import pulse_forget as command
    async with own_database() as db:
        topic = await project(db)
        for age in (366, 400):
            await post(db, topic, published=NOW - timedelta(days=age))
        young = await post(db, topic, published=NOW - timedelta(days=100))
        await db.commit()
    off, on = SimpleNamespace(PULSE_RETENTION_DAYS=0), SimpleNamespace(PULSE_RETENTION_DAYS=365)
    said = '\n'.join(await command.run(['expired'], session_factory=own_database, settings=off, now=NOW))
    assert 'belum diatur' in said and 'posting:' not in said, 'with no limit set, nothing is old'
    said = '\n'.join(await command.run(['expired', '--apply'], session_factory=own_database, settings=off, now=NOW))
    assert 'belum diatur' in said and 'SUDAH DIHAPUS' not in said
    for asked, settings in ((['expired'], on), (['expired', '--days', '365'], off)):
        said = '\n'.join(await command.run(asked, session_factory=own_database, settings=settings, now=NOW))
        assert '365 hari' in said and 'BELUM ADA YANG DIHAPUS' in said and 'posting: 2' in said
    said = '\n'.join(await command.run(['expired', '--days', '90'], session_factory=own_database, settings=on, now=NOW))
    assert '90 hari' in said and 'posting: 3' in said, 'a number given on the command line is the one that counts'
    async with own_database() as db:
        assert await db.scalar(select(func.count()).select_from(SourceItem)) == 3
    said = '\n'.join(await command.run(['expired', '--apply'], session_factory=own_database, settings=on, now=NOW))
    assert 'SUDAH DIHAPUS' in said and 'posting: 2' in said
    async with own_database() as db:
        assert (await db.scalars(select(SourceItem.id))).all() == [young.id]


@pytest.mark.asyncio
@pytest.mark.parametrize('asked', [
    [], ['request'], ['request', '--platform', 'x'], ['request', '--author', 'warga'], ['request', '--platform', 'x', '--author', '  '],
    ['request', '--platform', 'x', '--author', 'warga', '--url', 'https://contoh.test/a'], ['request', '--url', ' '],
    ['expired', '--days', '0'], ['expired', '--days', '-3'], ['hapus-semua'],
])
async def test_the_command_refuses_what_does_not_say_whose_posts_which_link_or_how_many_days(asked):
    from app import pulse_forget as command

    def never():
        raise AssertionError('a refused command must not open the database')
    with pytest.raises(SystemExit) as refused:
        await command.run(asked, session_factory=never, settings=SimpleNamespace(PULSE_RETENTION_DAYS=365), now=NOW)
    assert refused.value.code == 2


# ── Deleting a whole project ────────────────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_deleting_a_project_leaves_nothing_of_its_posts_behind(client, admin_token, db):
    gone, stays = await project(db, 'Project dihapus'), await project(db, 'Project tetap')
    only_here, in_both = f'only{tag()}', f'both{tag()}'
    mine = await post(db, gone, author='warga', metrics={'author_id': only_here})
    shared = await post(db, gone, author='kabar', metrics={'author_id': in_both})
    kept = await post(db, stays, author='kabar', metrics={'author_id': in_both})

    def analysis(row):
        return ResponseAnalysisJob(id=uuid.uuid4().hex, post_id=row.id, subject_id=row.id, kind='post', content_target_hash='h', status='done', result={'stance': {'label': 'support'}})
    db.add_all([analysis(mine), analysis(shared), analysis(kept),
                PostReview(topic_id=gone.id, post_id=mine.id, updated_by='analis'), PostReview(topic_id=stays.id, post_id=kept.id, updated_by='analis'),
                PulseAccountProfile(platform='x', key=only_here, followers=10), PulseAccountProfile(platform='x', key=in_both, followers=20),
                filed(gone, [copy_of(mine)]), filed(stays, [copy_of(kept)])])
    await db.flush()
    answer = await client.delete(f'/api/admin/pulse/topics/{gone.id}', headers={'Authorization': f'Bearer {admin_token}'})
    assert answer.status_code == 200, answer.text
    await db.flush()
    assert await rows(db, SourceItem, SourceItem.topic_id, gone.id) == 0
    assert await rows(db, ResponseAnalysisJob, ResponseAnalysisJob.post_id, mine.id) == 0, 'what was read from a post goes with the project'
    assert await rows(db, ResponseAnalysisJob, ResponseAnalysisJob.post_id, shared.id) == 0
    assert await rows(db, PostReview, PostReview.topic_id, gone.id) == 0
    assert await rows(db, PulseReport, PulseReport.topic_id, gone.id) == 0, 'a filed report of a project that no longer exists cannot be opened, so it is not kept'
    assert await rows(db, PulseAccountProfile, PulseAccountProfile.key, only_here) == 0, 'an account with no post left has no profile left'
    # The other project, and an account that still posts in it, are untouched.
    assert await rows(db, PulseAccountProfile, PulseAccountProfile.key, in_both) == 1
    assert await rows(db, SourceItem, SourceItem.topic_id, stays.id) == 1
    assert await rows(db, ResponseAnalysisJob, ResponseAnalysisJob.post_id, kept.id) == 1
    assert await rows(db, PostReview, PostReview.topic_id, stays.id) == 1 and await rows(db, PulseReport, PulseReport.topic_id, stays.id) == 1

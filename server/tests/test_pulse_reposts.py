"""A repost on X arrives as a row of its own that carries the ORIGINAL post's repost count.
Seven reposters of one post must not turn 36 thousand shares into 100 thousand."""
import uuid

import pytest
from sqlalchemy import select

from app.models.pulse import Issue, SourceItem, WatchTopic
from app.models.pulse_monitor import MetricSnapshot
from app.services.ingest.common import mark_repost
from app.services.ingest.xpoz import normalize_posts
from app.services.pulse import ingest_items
from app.services.pulse_network import analyze_network, observed_total
from app.services.pulse_repair import repair_reposts


def test_a_row_with_shares_but_no_likes_replies_or_matching_views_is_a_repost():
    marked = mark_repost({'likes': 0, 'comments': 0, 'shares': 7046, 'views': 0, 'engagement': 7046, 'author_id': '1'})
    assert marked == {'likes': 0, 'comments': 0, 'shares': 0, 'views': 0, 'engagement': 0, 'author_id': '1',
                      'repost': True, 'original_shares': 7046}
    assert mark_repost({'likes': 0, 'comments': 0, 'shares': 2, 'views': 2})['repost'] is True


def test_a_post_of_ones_own_keeps_its_shares():
    for own in ({'likes': 5, 'comments': 0, 'shares': 300, 'views': 0},       # liked
                {'likes': 0, 'comments': 1, 'shares': 300, 'views': 0},       # answered
                {'likes': 0, 'comments': 0, 'shares': 47, 'views': 591},      # seen more often than shared
                {'likes': 0, 'comments': 0, 'shares': 0, 'views': 0},         # nothing yet
                {'comments': 0, 'shares': 9, 'views': 0}):                    # likes not reported: unknown, not zero
        marked = mark_repost(dict(own))
        assert marked['repost'] is False
        assert marked.get('shares') == own.get('shares') and 'original_shares' not in marked
    assert mark_repost({'likes': 5, 'comments': 0, 'shares': 300, 'views': 0})['engagement'] == 305


def test_the_x_normaliser_marks_reposts():
    rows = [{'id': '1', 'authorUsername': 'a', 'text': 'isi', 'createdAt': '2026-11-10T09:00:00Z',
             'likeCount': 0, 'replyCount': 0, 'retweetCount': 7046, 'impressionCount': 0},
            {'id': '2', 'authorUsername': 'b', 'text': 'isi', 'createdAt': '2026-11-10T08:00:00Z',
             'likeCount': 900, 'replyCount': 40, 'retweetCount': 7046, 'impressionCount': 120000}]
    repost, original = (item['metrics'] for item in normalize_posts(rows))
    assert repost['repost'] is True and repost['shares'] == 0 and repost['original_shares'] == 7046 and repost['engagement'] == 0
    assert original['repost'] is False and original['shares'] == 7046 and original['engagement'] == 7986


def test_content_shares_count_a_carried_figure_once():
    repost = lambda n: {'metrics': {'likes': 0, 'comments': 0, 'shares': 0, 'repost': True, 'original_shares': n}}
    assert observed_total([repost(7046), repost(7060), repost(36254)], 'shares') == 36254      # original not collected
    original = {'metrics': {'likes': 900, 'comments': 40, 'shares': 36254, 'repost': False}}
    assert observed_total([original, repost(7046), repost(36254)], 'shares') == 36254           # original collected: no doubling
    assert observed_total([original, {'metrics': {'shares': 10}}], 'shares') == 36264           # two posts of their own add up
    assert observed_total([{'metrics': {}}], 'shares') is None
    assert observed_total([repost(7046), repost(7060)], 'likes') == 0


def test_repeated_content_reports_the_original_spread_once():
    text = 'logikanya kalau harus mundur karena dokumennya tidak sah artinya pencalonan keduanya juga tidak sah'
    post = lambda id, author, shares: dict(id=id, author=author, text=text, title=text, published_at='2026-11-10T10:00:00', platform='x',
                                           url=f'https://x.com/i/status/{id}', metrics=mark_repost({'likes': 0, 'comments': 0, 'shares': shares, 'views': 0}))
    narrative = analyze_network([post('1', 'a', 7046), post('2', 'b', 7060), post('3', 'c', 36254)])['narratives'][0]
    assert narrative['metrics']['shares'] == 36254
    assert narrative['engagement'] == 0


@pytest.fixture
async def topic(db):
    row = WatchTopic(id=str(uuid.uuid4()), label='repost', query='repost')
    db.add(row)
    await db.flush()
    return row


def raw(url, **metrics):
    return {'source': 'xpoz', 'platform': 'x', 'url': url, 'text': 'isi repost yang sama', 'author': 'a', 'metrics': metrics}


@pytest.mark.asyncio
async def test_a_refresh_clears_a_mark_that_no_longer_holds(db, topic):
    url = 'https://x.com/i/status/900'
    await ingest_items(db, topic, [raw(url, **mark_repost({'likes': 0, 'comments': 0, 'shares': 3, 'views': 1}))])
    item = (await db.execute(select(SourceItem).where(SourceItem.url == url))).scalar_one()
    assert item.metrics['repost'] is True and item.metrics['shares'] == 0
    await ingest_items(db, topic, [raw(url, **mark_repost({'likes': 4, 'comments': 0, 'shares': 5, 'views': 80}))])
    await db.refresh(item)
    assert item.metrics['repost'] is False and item.metrics['shares'] == 5 and item.metrics['engagement'] == 9


@pytest.mark.asyncio
async def test_stored_rows_and_their_history_are_repaired_once(db, topic):
    issue = Issue(topic_id=topic.id, title='isi', simhash='0' * 16, engagement_total=7346, score=7346.0)
    db.add(issue)
    await db.flush()
    old = SourceItem(topic_id=topic.id, issue_id=issue.id, source='xpoz', platform='x', url='https://x.com/i/status/901', text='isi',
                     metrics={'likes': 0, 'comments': 0, 'shares': 7046, 'views': 0, 'engagement': 7046, 'sentiment': {'label': 'negative'}})
    own = SourceItem(topic_id=topic.id, issue_id=issue.id, source='xpoz', platform='x', url='https://x.com/i/status/902', text='isi',
                     metrics={'likes': 200, 'comments': 0, 'shares': 100, 'views': 9000, 'engagement': 300})
    other = SourceItem(topic_id=topic.id, source='xpoz', platform='tiktok', url='https://www.tiktok.com/@a/video/1', text='isi',
                       metrics={'likes': 0, 'comments': 0, 'shares': 50, 'views': 0, 'engagement': 50})
    db.add_all([old, own, other])
    await db.flush()
    db.add_all([MetricSnapshot(item_id=old.id, topic_id=topic.id, metrics={'likes': 0, 'comments': 0, 'shares': 7040, 'views': 0}),
                MetricSnapshot(item_id=own.id, topic_id=topic.id, metrics={'likes': 190, 'comments': 0, 'shares': 90, 'views': 8000})])
    await db.flush()

    connection = await db.connection()
    assert await connection.run_sync(repair_reposts) == 1
    assert await connection.run_sync(repair_reposts) == 0            # nothing left to repair
    for row in (old, own, other, issue):
        await db.refresh(row)
    assert old.metrics == {'likes': 0, 'comments': 0, 'shares': 0, 'views': 0, 'engagement': 0, 'sentiment': {'label': 'negative'},
                           'repost': True, 'original_shares': 7046}
    assert own.metrics['shares'] == 100 and 'repost' not in own.metrics
    assert other.metrics['shares'] == 50                              # the rule is about X only
    assert issue.engagement_total == 300 and issue.score == 300.0
    snapshots = {row.item_id: row.metrics for row in (await db.execute(select(MetricSnapshot).where(MetricSnapshot.topic_id == topic.id))).scalars()}
    assert snapshots[old.id] == {'likes': 0, 'comments': 0, 'shares': 0, 'views': 0, 'original_shares': 7040}   # the carried figure is kept, not lost
    assert snapshots[own.id]['shares'] == 90

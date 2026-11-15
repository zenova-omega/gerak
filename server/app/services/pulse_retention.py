"""Deleting stored posts: when someone asks for it, and when a post is older than the retention period.

This is the one place that deletes posts. A post is more than its row, so deleting one also deletes what was recorded
about it (the observations of its figures, its rows in the two analysis queues, its review), corrects what was counted
from it (the totals of its conversation group, the evidence of alerts) and deletes what quotes it (a stored AI
summary, an answer in a Tanya AI conversation, and its account's profile once the account has no post left).

Two reasons to delete, and the second is stricter than the first:

- Age. `retention_tick` runs once a day and deletes posts older than PULSE_RETENTION_DAYS, a few to a transaction.
  The setting is 0 until someone sets it, and 0 deletes nothing. Filed reports stay as they were filed.
- A request. `delete_request` deletes the posts of one author on one platform, or the post behind one link. On top of
  the above, the copies in filed reports go, every stored summary of the project goes (its figures quote posts the
  text does not cite), and the author's comments under other people's posts go.

Every deleting function takes `apply`. Without it nothing is written: the same code only counts, and that count is
what the command (`python -m app.pulse_forget`) prints before anyone lets it delete. A function that is handed a
session never commits: its caller does. Only `delete_expired`, which opens its own sessions, commits each batch.

Not reached from here: the issue radar (`pulse_radar`), which keeps headlines and video titles outside any project
and prunes them on its own schedule; the link a project was started from (`pulse_project_seeds`); and copies of the
database file (backups, demo copies), which no query can reach.
"""
import logging
from datetime import datetime, timedelta

from sqlalchemy import delete, func, or_, select, update

from ..models.pulse import Issue, SourceItem
from ..models.pulse_chat import PulseChatConversation
from ..models.pulse_monitor import MetricSnapshot, PulseAlert
from ..models.pulse_profiles import PulseAccountProfile
from ..models.pulse_report import PulseReport
from ..models.pulse_response_analysis import ResponseAnalysisJob
from ..models.pulse_review import PostReview
from ..models.pulse_sentiment import SentimentJob
from ..models.pulse_summary import PulseSummary
from .ingest.common import count
from .pulse import _engagement
from .pulse_profiles import profile_key

logger = logging.getLogger(__name__)
BATCH = 200          # posts the daily run deletes in one transaction: the live workers write to the same database file
MAX_BATCHES = 250    # per daily run (50,000 posts); what is left waits for the next run, so one run always ends
CHUNK = 500          # ids in one IN (...) list
# What a deletion is counted in. Every count is of things removed; rows that were only corrected are not counted.
KINDS = ('posts', 'metric_snapshots', 'sentiment_jobs', 'reviews', 'response_jobs', 'issues', 'alerts', 'summaries',
         'chat_turns', 'conversations', 'profiles', 'report_entries', 'comments', 'report_comments')
_ACCOUNT = SourceItem.metrics['author_id'].as_string().label('author_id')
_USERNAME = SourceItem.metrics['author_username'].as_string().label('author_username')


def _chunks(values, size=CHUNK):
    values = sorted(values)
    return [values[start:start + size] for start in range(0, len(values), size)]


def _name(value):
    """An account name made comparable, whether a person typed it or a source stored it: no '@' in front, no case."""
    return value.strip().lstrip('@').casefold() if isinstance(value, str) else ''


def _among(value, ids):
    """Stored JSON can hold anything where an id belongs; only a text can be one of `ids`."""
    return isinstance(value, str) and value in ids


# ── Which posts ─────────────────────────────────────────────────────────────────────────────────────────────────────

async def find_posts(db, platform=None, author=None, url=None):
    """Ids of the stored posts a request is about: one author's posts on one platform, or the post behind one link.

    An author is matched by name as the source stored it (the username on X, Instagram, TikTok and Threads, the
    channel title on YouTube, the publisher's name for news) and by the username kept beside a display name, without
    regard to case or a leading '@'. Two accounts that show the same name on one platform cannot be told apart here.
    A link is matched exactly as it is stored, in every project that collected it.
    A platform alone is never enough: a request that names nobody raises ValueError instead of selecting everything."""
    link, asked = (url or '').strip(), _name(author)
    if link and not asked:
        query = select(SourceItem.id).where(SourceItem.url == link)
        if platform:
            query = query.where(SourceItem.platform == platform)
        return list((await db.scalars(query.order_by(SourceItem.id))).all())
    if link or not (platform and asked):
        raise ValueError('A request names an author on one platform, or one link')
    rows = (await db.execute(select(SourceItem.id, SourceItem.author, _USERNAME).where(SourceItem.platform == platform).order_by(SourceItem.id))).all()
    return [post_id for post_id, name, username in rows if asked in (_name(name), _name(username))]


async def expired_post_ids(db, now, days, limit=None):
    """Ids of the posts older than `days` days at `now`, oldest first, at most `limit` of them (all when None).

    A post's age is counted from the day it was published. A post whose source gave no date is counted from
    `crawled_at`, and that is refreshed every time a collector sees the post again, so an undated post that keeps
    turning up in searches never grows old. Known, and left as it is.
    `days` of 0 or less means no limit is set, and then no post is old."""
    if days <= 0:
        return []
    age = func.coalesce(SourceItem.published_at, SourceItem.crawled_at)
    query = select(SourceItem.id).where(age < now - timedelta(days=days)).order_by(age, SourceItem.id)
    return list((await db.scalars(query if limit is None else query.limit(limit))).all())


# ── Deleting ────────────────────────────────────────────────────────────────────────────────────────────────────────

async def delete_posts(db, ids, *, on_request=False, apply=True):
    """Delete the stored posts `ids` with everything PULSE made from them. Returns how many of each kind went (`KINDS`).

    - The post, the observations of its figures, its rows in the sentiment and response queues, and its review.
    - Its conversation group is counted again from the posts that remain; a group left with none is deleted, with
      the alerts that point at it.
    - It leaves the evidence of every alert; an alert that had evidence and is left with none is deleted.
    - A stored summary that cites it is deleted (the page offers to write a new one).
    - A Tanya AI answer that cites it leaves its conversation; a conversation left with no answer is deleted.
    - Its account's profile is deleted when the account has no stored post left in any project.

    `on_request` is for a person's request and goes further: every stored summary of the project is deleted, the
    group loses its AI one-liner and a title it took from the post, and the post's copies leave filed reports.
    Retention leaves reports alone.
    With `apply` False nothing is written and the counts say what would go. The caller commits."""
    return await _delete(db, ids, apply, {'account': None, 'link': None} if on_request else None)


async def delete_request(db, platform=None, author=None, url=None, *, apply=False):
    """One person's request, whole: the posts `find_posts` names, deleted as `delete_posts` does on request, and also

    - for a request by author, that author's comments under other posts of the same platform, with what was read
      from each of those comments (see `_drop_comments`). The summaries of those posts' projects go too;
    - copies in filed reports of posts that are no longer stored (an old report outlives a post that expired): they
      are found by the link or the author asked for, and the author's comments are taken out of the copies as well.

    Counts only unless `apply` is True. One call is one transaction: the caller commits all of it or none."""
    ids = await find_posts(db, platform, author, url)
    asked = _name(author)
    return await _delete(db, ids, apply, {'account': (platform, asked) if asked else None, 'link': (url or '').strip() or None})


async def _delete(db, ids, apply, request):
    """The deletion itself. `request` is None for retention, else what was asked for: {'account': (platform, name) or None, 'link'}."""
    counts = dict.fromkeys(KINDS, 0)
    # Read what the posts were before they go: afterwards nothing says which group, project and account each belonged to.
    posts = []
    for chunk in _chunks({post_id for post_id in ids if isinstance(post_id, str)}):
        posts += (await db.execute(select(SourceItem.id, SourceItem.topic_id, SourceItem.issue_id, SourceItem.platform, SourceItem.author, SourceItem.url,
                                          SourceItem.title, _ACCOUNT, _USERNAME).where(SourceItem.id.in_(chunk)))).all()
    gone, topics = {row.id for row in posts}, {row.topic_id for row in posts}
    account = request['account'] if request else None
    # The two slow reads of a request come before the first write: SQLite has one writer, and it is taken from that write on.
    commented, reports = {}, []
    if request is not None:
        if account:
            commented = await _posts_commented_on(db, *account, gone)
        links = {row.url for row in posts} | ({request['link']} if request['link'] else set())
        if gone or links or account:
            reports = await _reports_without(db, gone, links, account)
    if not (gone or commented or reports):
        return counts
    counts['metric_snapshots'] = await _remove(db, MetricSnapshot, MetricSnapshot.item_id, gone, apply)
    counts['sentiment_jobs'] = await _remove(db, SentimentJob, SentimentJob.item_id, gone, apply)
    counts['reviews'] = await _remove(db, PostReview, PostReview.post_id, gone, apply)
    counts['response_jobs'] = await _remove(db, ResponseAnalysisJob, ResponseAnalysisJob.post_id, gone, apply)
    counts['posts'] = await _remove(db, SourceItem, SourceItem.id, gone, apply)     # last: the rows above refer to it
    empty = await _recount_groups(db, posts, gone, apply, request is not None)
    counts['alerts'] = await _trim_alerts(db, topics, gone, empty, apply)      # before their group goes: an alert points at it
    counts['issues'] = len(empty)
    if apply:
        await _remove(db, Issue, Issue.id, empty, True)
    counts['summaries'] = await _drop_summaries(db, topics | set(commented.values()), gone, apply, every=request is not None)
    counts['chat_turns'], counts['conversations'] = await _drop_answers(db, topics, gone, apply)
    counts['profiles'] = await _drop_profiles(db, posts, gone, apply)
    if commented:
        counts['comments'], analysed = await _drop_comments(db, commented, account[1], apply)
        counts['response_jobs'] += analysed
    for report_id, snapshot, entries, comments in reports:
        counts['report_entries'] += entries
        counts['report_comments'] += comments
        if apply:
            await db.execute(update(PulseReport).where(PulseReport.id == report_id).values(snapshot=snapshot))
    if apply:
        await db.flush()
    return counts


async def _remove(db, model, column, ids, apply):
    """How many rows of `model` have `column` among `ids`. With `apply` they are deleted, and the count is of rows deleted."""
    total = 0
    for chunk in _chunks(ids):
        if apply:
            total += (await db.execute(delete(model).where(column.in_(chunk)))).rowcount
        else:
            total += await db.scalar(select(func.count()).select_from(model).where(column.in_(chunk))) or 0
    return total


async def _recount_groups(db, posts, gone, apply, on_request):
    """Correct the conversation groups that lose posts. Returns the ids of the groups left with no post; the caller deletes them.

    `ingest_items` keeps a group's totals by adding as posts arrive. Here they are built again from the posts that
    remain, with the same arithmetic, so a group reads as if the deleted posts had never been collected. `last_seen_at`
    only ever moves back, to the newest remaining post, and never to before the group was made: that is the lowest it
    could have been. On request the group's AI one-liner is cleared too (nothing records which posts it was written
    from), and a title taken from a deleted post is replaced by the title of the earliest post that remains."""
    affected = {row.issue_id for row in posts if row.issue_id}
    # Counting needs only to know whether a post remains; correcting needs what the totals are built from.
    columns = (SourceItem.id, SourceItem.issue_id) + ((SourceItem.platform, SourceItem.title, SourceItem.published_at, SourceItem.crawled_at, SourceItem.metrics) if apply else ())
    remaining = {issue_id: [] for issue_id in affected}
    for chunk in _chunks(affected):
        for row in (await db.execute(select(*columns).where(SourceItem.issue_id.in_(chunk)))).all():
            if row.id not in gone:
                remaining[row.issue_id].append(row)
    empty = {issue_id for issue_id, rows in remaining.items() if not rows}
    if not apply:
        return empty
    titles = {}
    for row in posts:
        if row.issue_id and row.title:
            titles.setdefault(row.issue_id, set()).add(row.title)
    for chunk in _chunks(affected - empty):
        for issue in (await db.execute(select(Issue.id, Issue.title, Issue.created_at, Issue.last_seen_at).where(Issue.id.in_(chunk)))).all():
            rows = remaining[issue.id]
            engagement = sum(_engagement(row.metrics) for row in rows)
            values = {'item_count': len(rows), 'engagement_total': engagement, 'score': float(engagement),
                      'reach_total': sum(count((row.metrics or {}).get('reach')) for row in rows),
                      'platforms': sorted({row.platform for row in rows if row.platform})}
            seen = [when for when in [issue.created_at, *(row.published_at or row.crawled_at for row in rows)] if when is not None]
            if seen and issue.last_seen_at is not None:
                values['last_seen_at'] = min(issue.last_seen_at, max(seen))
            if on_request:
                values.update(summary=None, sentiment=None)
                if issue.title and issue.title in titles.get(issue.id, ()):
                    earliest = min(rows, key=lambda row: (row.published_at or row.crawled_at or datetime.max, row.id))
                    values['title'] = earliest.title or ''
            await db.execute(update(Issue).where(Issue.id == issue.id).values(**values))
    return empty


async def _trim_alerts(db, topics, gone, empty, apply):
    """Take the deleted posts out of the evidence of alerts. Returns how many alerts were deleted.

    An alert is deleted when it points at a group in `empty`, or when it had evidence and none is left. An alert that
    never had evidence (a failed collection) is not about a post and stays."""
    doomed = []
    for chunk in _chunks(topics):
        for row in (await db.execute(select(PulseAlert.id, PulseAlert.issue_id, PulseAlert.evidence_ids, PulseAlert.detail).where(PulseAlert.topic_id.in_(chunk)))).all():
            evidence = row.evidence_ids if isinstance(row.evidence_ids, list) else []
            kept = [post_id for post_id in evidence if not _among(post_id, gone)]
            if row.issue_id in empty or (evidence and not kept):
                doomed.append(row.id)
                continue
            # A volume alert also lists the posts of the half hour before it.
            detail = row.detail
            baseline = detail.get('baseline_evidence_ids') if isinstance(detail, dict) else None
            if isinstance(baseline, list) and any(_among(post_id, gone) for post_id in baseline):
                detail = {**detail, 'baseline_evidence_ids': [post_id for post_id in baseline if not _among(post_id, gone)]}
            if apply and (len(kept) != len(evidence) or detail is not row.detail):
                await db.execute(update(PulseAlert).where(PulseAlert.id == row.id).values(evidence_ids=kept, detail=detail))
    if apply:
        await _remove(db, PulseAlert, PulseAlert.id, doomed, True)
    return len(doomed)


def _cites(holder, gone):
    """Whether a stored summary or a chat answer lists one of the deleted posts among its sources. A cited comment
    carries the id of the post it was written under, so it counts as citing that post."""
    sources = holder.get('sources') if isinstance(holder, dict) else None
    return isinstance(sources, list) and any(isinstance(source, dict) and _among(source.get('id'), gone) for source in sources)


async def _drop_summaries(db, topics, gone, apply, every):
    """Delete the stored summaries of `topics` that cite a deleted post; all of them when `every`. Returns how many.

    `every` is for a request. A summary keeps figures beside its text (the earliest post's words, the loudest accounts,
    the most-liked comments) that carry no post id, so only deleting the whole summary is sure to remove a person from
    it. For retention the rule is the narrow one: a summary that does not cite the post is kept."""
    doomed = []
    for chunk in _chunks(topics):
        for row in (await db.execute(select(PulseSummary.topic_id, PulseSummary.format, PulseSummary.data).where(PulseSummary.topic_id.in_(chunk)))).all():
            if every or _cites(row.data, gone):
                doomed.append((row.topic_id, row.format))
    if apply:
        for topic_id, kind in doomed:
            await db.execute(delete(PulseSummary).where(PulseSummary.topic_id == topic_id, PulseSummary.format == kind))
    return len(doomed)


async def _drop_answers(db, topics, gone, apply):
    """Remove the Tanya AI answers that cite a deleted post, question and all. Returns (answers removed, conversations deleted)."""
    removed, emptied = 0, []
    for chunk in _chunks(topics):
        for row in (await db.execute(select(PulseChatConversation.id, PulseChatConversation.turns).where(PulseChatConversation.topic_id.in_(chunk)))).all():
            turns = row.turns if isinstance(row.turns, list) else []
            kept = [turn for turn in turns if not _cites(turn, gone)]
            if len(kept) == len(turns):
                continue
            removed += len(turns) - len(kept)
            if not kept:
                emptied.append(row.id)
            elif apply:
                await db.execute(update(PulseChatConversation).where(PulseChatConversation.id == row.id).values(turns=kept))
    if apply:
        await _remove(db, PulseChatConversation, PulseChatConversation.id, emptied, True)
    return removed, len(emptied)


async def _drop_profiles(db, posts, gone, apply):
    """Delete the profile (picture, followers, location) of each account that has no stored post left. Returns how many.

    An account is recognised across posts the way the profile worker does it (`profile_key`), and a post in any
    project keeps the profile. A platform is only read through when one of the deleted posts' accounts has a profile."""
    wanted = {}
    for row in posts:
        key = profile_key(row.platform, row.author, {'author_id': row.author_id, 'author_username': row.author_username})
        if key:
            wanted.setdefault(row.platform, set()).add(key)
    total = 0
    for platform, keys in wanted.items():
        stored = set()
        for chunk in _chunks(keys):
            stored |= set((await db.scalars(select(PulseAccountProfile.key).where(PulseAccountProfile.platform == platform, PulseAccountProfile.key.in_(chunk)))).all())
        if not stored:
            continue
        rows = (await db.execute(select(SourceItem.id, SourceItem.author, _ACCOUNT, _USERNAME).where(SourceItem.platform == platform))).all()
        posting = {profile_key(platform, row.author, {'author_id': row.author_id, 'author_username': row.author_username}) for row in rows if row.id not in gone}
        orphaned = stored - posting
        total += len(orphaned)
        if apply:
            for chunk in _chunks(orphaned):
                await db.execute(delete(PulseAccountProfile).where(PulseAccountProfile.platform == platform, PulseAccountProfile.key.in_(chunk)))
    return total


# ── Comments, and copies in filed reports ───────────────────────────────────────────────────────────────────────────

def _without_comments(metrics, asked):
    """A post's `metrics` without the comments `asked` wrote, and the ids of those comments ([] when there are none).

    Comments sit in `metrics['comment_snapshot']['items']`, each {id, author, text, likes, ...}. Everything else in
    the snapshot and in `metrics` is kept, including the platform's own comment count."""
    snapshot = metrics.get('comment_snapshot') if isinstance(metrics, dict) else None
    rows = snapshot.get('items') if isinstance(snapshot, dict) else None
    if not isinstance(rows, list):
        return metrics, []
    theirs = [row for row in rows if isinstance(row, dict) and _name(row.get('author')) == asked]
    if not theirs:
        return metrics, []
    kept = [row for row in rows if not (isinstance(row, dict) and _name(row.get('author')) == asked)]
    return {**metrics, 'comment_snapshot': {**snapshot, 'items': kept}}, [row.get('id') for row in theirs]


async def _posts_commented_on(db, platform, asked, gone):
    """Stored posts on `platform`, other than the ones being deleted, that hold comments by `asked`: {post id: project id}."""
    held = SourceItem.metrics['comment_snapshot'].as_string()
    rows = (await db.execute(select(SourceItem.id, SourceItem.topic_id, SourceItem.metrics).where(SourceItem.platform == platform, held.isnot(None)))).all()
    return {row.id: row.topic_id for row in rows if row.id not in gone and _without_comments(row.metrics, asked)[1]}


async def _drop_comments(db, commented, asked, apply):
    """Take the comments `asked` wrote out of the posts in `commented`. Returns (comments removed, analysis rows removed).

    What was read from a comment (stance, sentiment) is one row per comment in the response queue, named by the
    comment's id, so only the rows of the removed comments go: the post's own row and the other comments keep their
    results and nothing is analysed twice. The exception is a comment stored without an id. Its row is named by its
    position in the list, and positions shift when a comment leaves, so a post that holds any such comment loses all
    its position-named rows and those comments are analysed again.
    The posts are read again here, behind a write that takes the database's one writer: a collector or the labelling
    worker may have rewritten a post's `metrics` since the posts were picked, and writing back the earlier copy would
    undo that."""
    comments, analysed = 0, 0
    job = ResponseAnalysisJob
    for chunk in _chunks(commented):
        if apply:
            # Changes nothing; from here to the commit nobody else writes (the same step `ingest_items` opens with).
            await db.execute(update(SourceItem).where(SourceItem.id.in_(chunk)).values(id=SourceItem.id).execution_options(synchronize_session=False))
        for row in (await db.execute(select(SourceItem.id, SourceItem.metrics).where(SourceItem.id.in_(chunk)))).all():
            metrics, removed = _without_comments(row.metrics, asked)
            if not removed:
                continue
            comments += len(removed)
            theirs = job.subject_id.in_(sorted({str(comment_id) for comment_id in removed if comment_id is not None}))
            if any(isinstance(entry, dict) and entry.get('id') is None for entry in row.metrics['comment_snapshot']['items']):
                theirs = or_(theirs, job.subject_id.like('snapshot-index:%'))
            rows_of_post = (job.post_id == row.id, job.kind == 'comment', theirs)
            if apply:
                analysed += (await db.execute(delete(job).where(*rows_of_post))).rowcount
                await db.execute(update(SourceItem).where(SourceItem.id == row.id).values(metrics=metrics))
            else:
                analysed += await db.scalar(select(func.count()).select_from(job).where(*rows_of_post)) or 0
    return comments, analysed


def _walk(value, visit):
    """A copy of a JSON value in which every dict that is an entry of a list, at any depth, has been through `visit`:
    it returns the dict to keep in its place, or None to drop the entry."""
    if isinstance(value, list):
        kept = []
        for entry in value:
            if isinstance(entry, dict):
                entry = visit(entry)
                if entry is None:
                    continue
            kept.append(_walk(entry, visit))
        return kept
    if isinstance(value, dict):
        return {key: _walk(entry, visit) for key, entry in value.items()}
    return value


def _report_without(snapshot, gone, links, account):
    """A filed report's snapshot without the deleted posts: (the new snapshot, entries dropped, comments dropped).

    The snapshot is whatever the browser sent, so nothing is assumed about where a post sits: an entry of any list is
    dropped when its `id` or `post_id` is a deleted post, when its `url` is a deleted link, or when it is a post of
    the account asked for (the same `platform`, the same author). For a request by author, that author's comments are
    taken out of the remaining posts of the platform, and so is what was read from each of those comments (the entry
    with the comment's id under the post's analysis)."""
    platform, asked = account or (None, '')
    dropped = {'entries': 0, 'comments': 0}
    orphaned, lost = set(), {}     # posts dropped by link or author, and per remaining post the ids of the comments taken out

    def posts_and_comments(entry):
        theirs = bool(asked) and entry.get('platform') == platform
        if (_among(entry.get('id'), gone) or _among(entry.get('post_id'), gone) or _among(entry.get('url'), links)
                or (theirs and _name(entry.get('author')) == asked)):
            dropped['entries'] += 1
            if isinstance(entry.get('id'), str):
                orphaned.add(entry['id'])
            return None
        if theirs:
            metrics, removed = _without_comments(entry.get('metrics'), asked)
            if removed:
                dropped['comments'] += len(removed)
                lost.setdefault(entry.get('id'), set()).update(comment_id for comment_id in removed if isinstance(comment_id, str))
                return {**entry, 'metrics': metrics}
        return entry

    def analysis(entry):
        post_id = entry.get('post_id')
        if _among(post_id, orphaned):
            dropped['entries'] += 1
            return None
        rows = entry.get('comments')
        if isinstance(post_id, str) and lost.get(post_id) and isinstance(rows, list):
            kept = [row for row in rows if not (isinstance(row, dict) and _among(row.get('id'), lost[post_id]))]
            dropped['comments'] += len(rows) - len(kept)
            return {**entry, 'comments': kept}
        return entry

    cleaned = _walk(snapshot, posts_and_comments)
    if orphaned - gone or lost:
        cleaned = _walk(cleaned, analysis)
    return cleaned, dropped['entries'], dropped['comments']


async def _reports_without(db, gone, links, account):
    """Every filed report that changes, as [(report id, new snapshot, entries dropped, comments dropped)].

    All reports are read, one at a time: a report can hold a copy of a post that is no longer stored anywhere else."""
    changed = []
    for report_id in (await db.scalars(select(PulseReport.id).order_by(PulseReport.id))).all():
        snapshot = (await db.execute(select(PulseReport.snapshot).where(PulseReport.id == report_id))).scalar_one_or_none()
        cleaned, entries, comments = _report_without(snapshot, gone, links, account)
        if entries or comments:
            changed.append((report_id, cleaned, entries, comments))
    return changed


# ── The daily run ───────────────────────────────────────────────────────────────────────────────────────────────────

async def delete_expired(session_factory, now, days, *, max_batches=None):
    """Delete the posts older than `days` days, `BATCH` posts to a transaction, each transaction in a session of its own.

    Short transactions let the collectors and the labelling workers write in between. Stops when no post is past the
    limit, after `max_batches` transactions, or when a post it already deleted is offered again: then deleting is not
    taking hold, and going round would never end. Returns the summed counts of `delete_posts`."""
    totals, done, handled = dict.fromkeys(KINDS, 0), 0, set()
    while max_batches is None or done < max_batches:
        async with session_factory() as db:
            ids = await expired_post_ids(db, now, days, BATCH)
            if not ids or handled.intersection(ids):
                break
            counts = await delete_posts(db, ids)
            if not counts['posts']:
                break
            await db.commit()
        handled.update(ids)
        for kind in KINDS:
            totals[kind] += counts[kind]
        done += 1
    return totals


async def retention_tick(session_factory=None, *, now=None):
    """The scheduled run, once a day. While PULSE_RETENTION_DAYS is 0 (the default) it returns at once and opens nothing.

    Otherwise it deletes what is past the limit, at most `MAX_BATCHES` transactions in one run, and returns the counts.
    A failure is logged by its kind only and the next run continues where this one stopped."""
    from ..config import get_settings
    days = get_settings().PULSE_RETENTION_DAYS
    if days <= 0:
        return None
    if session_factory is None:
        from ..database import async_session as session_factory
    try:
        totals = await delete_expired(session_factory, now or datetime.utcnow(), days, max_batches=MAX_BATCHES)
    except Exception as error:
        logger.error('Pulse retention stopped (%s); the next run continues', type(error).__name__)
        return None
    if totals['posts']:
        logger.info('Pulse retention: %s', {kind: number for kind, number in totals.items() if number})
    return totals

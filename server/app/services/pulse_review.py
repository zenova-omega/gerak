"""Project-scoped saved annotations; no collection or training side effects."""
from datetime import datetime
from fastapi import HTTPException
from sqlalchemy import select
from ..models.pulse import WatchTopic, SourceItem
from ..models.pulse_review import PostReview
from . import pulse_measures

LABELS = {'positive', 'neutral', 'negative'}


def review_payload(row):
    return {key: getattr(row, key) for key in (
        'topic_id', 'post_id', 'relevance', 'manual_sentiment', 'review_needed',
        'analyst_note', 'updated_by', 'created_at', 'updated_at')}


async def require_topic(db, topic_id):
    if await db.get(WatchTopic, topic_id) is None:
        raise HTTPException(404, 'Project not found')


async def list_reviews(db, topic_id):
    await require_topic(db, topic_id)
    rows = (await db.execute(select(PostReview, SourceItem.metrics)
        .join(SourceItem, (SourceItem.id == PostReview.post_id) & (SourceItem.topic_id == PostReview.topic_id))
        .where(PostReview.topic_id == topic_id).order_by(PostReview.post_id))).all()
    paired = correct = 0
    for review, metrics in rows:
        label = pulse_measures.tone(metrics)   # tone_share_v2: either stored form, any letter case
        if label in LABELS and review.manual_sentiment in LABELS:
            paired += 1
            correct += int(label == review.manual_sentiment)
    return {'topic_id': topic_id, 'reviews': [review_payload(r) for r, _ in rows],
            'excluded_post_ids': [r.post_id for r, _ in rows if r.relevance == 'irrelevant'],
            'evaluation': {'paired_count': paired, 'correct_count': correct,
                           'accuracy': correct / paired if paired else None}}


async def save_review(db, topic_id, post_id, changes, actor_id):
    await require_topic(db, topic_id)
    item = await db.get(SourceItem, post_id)
    if item is None or item.topic_id != topic_id:
        raise HTTPException(404, 'Post not found in project')
    # Atomic upsert keeps independently edited fields intact, including first-save races.
    from sqlalchemy.dialects.sqlite import insert as sqlite_insert
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    insert = sqlite_insert if db.bind.dialect.name == 'sqlite' else pg_insert
    values = {**changes, 'updated_by': actor_id, 'updated_at': datetime.utcnow()}
    stmt = insert(PostReview).values(topic_id=topic_id, post_id=post_id, **values)
    await db.execute(stmt.on_conflict_do_update(index_elements=['topic_id', 'post_id'], set_=values))
    row = await db.get(PostReview, (topic_id, post_id), populate_existing=True)
    return review_payload(row)

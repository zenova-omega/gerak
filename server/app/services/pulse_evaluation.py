"""Read-only agreement on analyst-reviewed data, never held-out accuracy.

reviewed_count counts valid manual labels after scope and review exclusions.
paired_count also requires a valid stored machine label. Matrix rows are machine
labels, columns are manual labels. Exclude irrelevant and review_needed reviews;
an explicit manual label is eligible even when relevance is still unreviewed.
Machine review_needed/confidence flags do not exclude a valid label: the human
review is the reference. Unknown/malformed/missing labels never become neutral.
"""
from sqlalchemy import select, func

from ..models.pulse import SourceItem
from ..models.pulse_review import PostReview
from .pulse_review import require_topic
from . import pulse_measures

LABELS = ('positive', 'neutral', 'negative')
SAMPLE_LIMIT = 20
CAVEAT = 'Agreement on reviewed data, not general accuracy or a held-out benchmark. Analyst corrections are a selected sample.'
EXCLUSION_POLICY = ('Exclude irrelevant and review_needed annotations, and invalid or missing manual labels. '
                    'Unknown, invalid or missing machine labels are excluded from pairs, not treated as neutral. '
                    'A valid manual label with unreviewed relevance is eligible; machine confidence flags do not exclude it.')


async def evaluate_sentiment(db, topic_id, *, start=None, end=None, platforms=None):
    await require_topic(db, topic_id)
    matrix = {machine: {manual: 0 for manual in LABELS} for machine in LABELS}
    query = select(SourceItem.id, SourceItem.metrics, func.substr(SourceItem.text, 1, 500),
                   PostReview.manual_sentiment).join(
        PostReview, (SourceItem.id == PostReview.post_id) & (SourceItem.topic_id == PostReview.topic_id)
    ).where(SourceItem.topic_id == topic_id, PostReview.relevance != 'irrelevant',
            PostReview.review_needed.is_(False), PostReview.manual_sentiment.in_(LABELS))
    if start is not None:
        query = query.where(SourceItem.published_at >= start)
    if end is not None:
        query = query.where(SourceItem.published_at <= end)
    if platforms is not None:
        query = query.where(func.coalesce(func.nullif(SourceItem.platform, ''), 'unknown').in_(platforms))
    query = query.order_by(SourceItem.id)
    reviewed = paired = matches = 0
    samples = []
    # Stream records: sample payload is bounded, but counts cover the whole scope.
    rows = await db.stream(query.execution_options(yield_per=500))
    try:
        async for post_id, metrics, text, manual in rows:
            reviewed += 1
            machine = pulse_measures.tone(metrics)   # tone_share_v1: either stored form, any letter case
            if machine not in LABELS:
                continue
            paired += 1
            matches += int(machine == manual)
            matrix[machine][manual] += 1
            if len(samples) < SAMPLE_LIMIT:
                samples.append({'post_id': post_id, 'text': text or '',
                                'machine_sentiment': machine, 'manual_sentiment': manual})
    finally:
        await rows.close()
    return {'topic_id': topic_id, 'platforms': platforms, 'labels': list(LABELS),
            'reviewed_count': reviewed, 'paired_count': paired, 'matches': matches,
            'agreement': matches / paired if paired else None, 'confusion_matrix': matrix,
            'matrix_axes': {'rows': 'machine_sentiment', 'columns': 'manual_sentiment'},
            'samples': samples, 'sample_limit': SAMPLE_LIMIT, 'samples_truncated': paired > SAMPLE_LIMIT,
            'caveat': CAVEAT, 'exclusion_policy': EXCLUSION_POLICY}

"""Score issues by volume + recency."""
from datetime import datetime


def issue_score(item_count: int, last_seen_at: datetime, now: datetime | None = None) -> float:
    """Higher = more items and more recent. Recency decays over days."""
    now = now or datetime.utcnow()
    age_hours = max((now - last_seen_at).total_seconds() / 3600.0, 0.0)
    recency = 1.0 / (1.0 + age_hours / 24.0)
    return max(item_count, 1) * recency

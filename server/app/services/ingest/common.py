"""Conservative normalization for observed provider data."""
from datetime import datetime, timezone

from ..pulse_measures import interactions


def count(value) -> int:
    try:
        return max(0, int(value or 0))
    except (ValueError, TypeError, OverflowError):
        return 0


def observed_engagement(metrics: dict | None) -> int | None:
    """interactions_v1, kept under this name for its many callers."""
    return interactions(metrics)


def mark_repost(metrics: dict) -> dict:
    """Tell a repost on X from a post of one's own, and stop it claiming the original's shares.

    X returns a repost as a row of its own that carries the ORIGINAL post's repost count and nothing else: no likes,
    no replies, and no more views than shares, which a post that really was shared that often cannot have. Adding that
    figure up per reposter multiplies it (seven reposters of one post read as seven times its shares), so it moves to
    `original_shares` and the row keeps none of its own. `repost` is always set, so a later refresh can clear the mark.
    The provider sends no repost flag in the fields we ask for; this rule is what the stored numbers allow."""
    shares = count(metrics.get('shares'))
    repost = (shares > 0 and metrics.get('likes') == 0 and metrics.get('comments') == 0
              and count(metrics.get('views')) <= shares)
    marked = {**metrics, 'repost': repost}
    if repost:
        marked.update(shares=0, original_shares=shares)
    marked['engagement'] = observed_engagement(marked)
    return marked


def observed_metrics(row: dict, fields: dict) -> dict:
    metrics = {target: count(row[source]) for source, target in fields.items()
               if row.get(source) is not None and str(row[source]).isdigit()}
    metrics["engagement"] = observed_engagement(metrics)
    return metrics


def published(value):
    if not isinstance(value, str):
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return dt.astimezone(timezone.utc).replace(tzinfo=None) if dt.tzinfo else dt
    except ValueError:
        return None


def credential(settings, name):
    value = getattr(settings, name, "")
    return value.get_secret_value() if hasattr(value, "get_secret_value") else value

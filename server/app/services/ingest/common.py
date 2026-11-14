"""Conservative normalization for observed provider data."""
from datetime import datetime, timezone


def count(value) -> int:
    try:
        return max(0, int(value or 0))
    except (ValueError, TypeError, OverflowError):
        return 0


def observed_engagement(metrics: dict | None) -> int | None:
    values = [(metrics or {}).get(key) for key in ("likes", "comments", "shares")]
    observed = [v for v in values if v is not None and str(v).isdigit()]
    return sum(count(v) for v in observed) if observed else None


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

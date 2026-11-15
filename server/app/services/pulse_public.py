"""What a reader may see: of a stored analysis result, and of where the data comes from.

The workers store, next to every label, which engine and which prompt version produced it (`model`, `method`). An
operator needs that to audit or re-run an analysis, so it stays in the database. It is an operations detail, not product
surface: everything that leaves the server passes through here first, and a report is cleaned before it is filed.

Nothing here changes a stored value. Each function returns a new object.
"""
ENGINE_FIELDS = ('model', 'method')


def label_for_reader(value):
    """One stored result (sentiment, emotion, stance) without the engine behind it. Anything else is returned as is."""
    if not isinstance(value, dict):
        return value
    return {key: item for key, item in value.items() if key not in ENGINE_FIELDS}


def metrics_for_reader(metrics):
    """A post's stored metrics, with every label kept in them cleaned.

    Labels sit one level down (`sentiment`, `emotion`), so one shallow pass covers them and any label added later,
    without walking the comment lists on every request."""
    return {key: label_for_reader(value) for key, value in (metrics or {}).items()}


def without_engine(value):
    """A deep copy of a filed report without any engine field, at any depth.

    A report is whatever a browser sent on the day it was filed, labels on comments and response rows included, so
    this one walks the whole document. Used when a report is filed and when an older one is read back."""
    if isinstance(value, dict):
        return {key: without_engine(item) for key, item in value.items() if key not in ENGINE_FIELDS}
    if isinstance(value, list):
        return [without_engine(item) for item in value]
    return value


# ── Lanes ───────────────────────────────────────────────────────────────────────────────────────────────────────────
# The paid lane that collects X, Instagram, TikTok and Reddit is known inside the server by its supplier's name:
# database rows, workers and settings all use it. Who supplies the data is an operations detail, so a reader knows the
# lane as "social". These functions are the only place that knows both names; routes call them on the way out and in.
_LANE_FOR_READER = {'xpoz': 'social'}
_LANE_FROM_READER = {public: internal for internal, public in _LANE_FOR_READER.items()}


def lane_for_reader(name):
    """A lane, source or provider id as it leaves the server."""
    return _LANE_FOR_READER.get(name, name) if isinstance(name, str) else name


def lane_from_reader(name):
    """The id the server works with, from what a reader sent. An id that is already internal passes through."""
    return _LANE_FROM_READER.get(name, name) if isinstance(name, str) else name


def lanes_for_reader(by_lane):
    """A mapping keyed by lane (a collection result, usage per lane) with its keys named for a reader. Values are untouched."""
    return {lane_for_reader(key): value for key, value in (by_lane or {}).items()}

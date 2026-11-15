"""What PULSE calls a spike ("lonjakan"): one rule, counted here and nowhere else.

A bucket (a day, a week, a month, or a 30-minute window) is a spike when it rose from the bucket before it, the next
one is not higher, and it is at least 1.5 times the usual bucket: the median of all the other buckets in the series.
When the other buckets are mostly empty the usual bucket is 0 and it only has to reach a floor. It must also reach a
tenth of the highest bucket, so that a spike is a rise a reader can see. The first bucket is never one (nothing says
it rose), and fewer than three buckets are too few to know what is usual. At most three are returned: the highest.

Everything that says "lonjakan" reads this rule: the marks on the trend chart (over HTTP, routers/pulse_spikes.py),
the `volume_spike` alert (pulse_listening.spike_evidence) and the AI summary's facts (pulse_summary). The browser
holds no copy. A change to any number below is a new rule and needs a new id, because stored alerts and summaries
name the rule that found them.

Pure: no database, no clock, no network. Nothing here says why a bucket is high.
"""
from datetime import date, timedelta
from statistics import median

RULE_ID = 'spike_v1'
# A spike is at least this many times the usual bucket. 1.5 is the owner's decision of 15 Nov 2026: a busy project's
# ordinary day is already high, so the day its posts jump is seldom three times it.
MINIMUM_RATIO = 1.5
VISIBLE_SHARE = 0.1     # of the highest bucket: lower than this the rise is a flat line to the eye
MOST = 3                # spikes per series; more would mark the whole line
MINIMUM_BUCKETS = 3     # with fewer nothing can be called usual
# Below its floor a rise is too small to call a spike. One floor per kind of series the chart draws; a caller that
# counts something else (the alert counts posts per 30 minutes) brings its own.
FLOORS = {'posts': 5, 'interactions': 100}
MAX_BUCKETS = 1100      # three years of days, the longest series the chart draws

# The rule in the words of an answer, for whoever reads one. `usual` says how the usual bucket is found.
RULE = {'id': RULE_ID, 'minimum_ratio': MINIMUM_RATIO, 'usual': 'median_of_other_buckets', 'visible_share': VISIBLE_SHARE,
        'most': MOST, 'minimum_buckets': MINIMUM_BUCKETS, 'floors': dict(FLOORS)}


def find_spikes(values, floor, most=MOST):
    """The spikes among `values`, one number per bucket, oldest first.

    `floor` is the least a bucket must hold to be called a spike (see FLOORS). Returns up to `most`
    `{'index', 'value', 'usual', 'times'}`, the highest, in the order of the series; `most=None` returns every one,
    for a caller that asks about one bucket and not about a line to draw (the alert). `usual` is the median of the other
    buckets and `times` is the bucket divided by it, or None when the usual bucket is empty."""
    values = list(values)
    if len(values) < MINIMUM_BUCKETS:
        return []
    least = max(floor, max(values) * VISIBLE_SHARE)
    last, found = len(values) - 1, []
    for index in range(1, len(values)):
        value = values[index]
        if value <= values[index - 1] or (index < last and value < values[index + 1]) or value < least:
            continue
        usual = median(values[:index] + values[index + 1:])
        if usual > 0 and value < usual * MINIMUM_RATIO:
            continue
        found.append({'index': index, 'value': value, 'usual': usual, 'times': value / usual if usual > 0 else None})
    highest = sorted(found, key=lambda spike: -spike['value'])[:most]      # on a tie the earlier bucket is kept
    return sorted(highest, key=lambda spike: spike['index'])


def keyed_spikes(buckets, floor):
    """The spikes of a series whose buckets carry a name: `buckets` is `(key, value)` pairs, oldest first.
    Returns `{'key', 'value', 'usual', 'times'}` per spike, in the order of the series."""
    buckets = list(buckets)
    return [{'key': buckets[spike['index']][0], 'value': spike['value'], 'usual': spike['usual'], 'times': spike['times']}
            for spike in find_spikes([value for _, value in buckets], floor)]


def daily_series(counts, first=None, last=None):
    """A count per day as the series the rule reads: `(day, count)` for every day, oldest first, a day without posts as 0.

    `counts` maps 'YYYY-MM-DD' to a number. The series runs from the earliest to the latest day counted, stretched to
    `first` and `last` when a chosen period reaches further, which is what the trend chart draws for the same posts.
    Never longer than MAX_BUCKETS: of a longer stretch the newest days are kept."""
    if not counts:
        return []
    start, end = min([*counts, first] if first else counts), max([*counts, last] if last else counts)
    day, stop = date.fromisoformat(start), date.fromisoformat(end)
    day = max(day, stop - timedelta(days=MAX_BUCKETS - 1))
    series = []
    while day <= stop:
        series.append((day.isoformat(), counts.get(day.isoformat(), 0)))
        day += timedelta(days=1)
    return series

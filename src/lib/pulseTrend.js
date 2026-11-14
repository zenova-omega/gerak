// Change inside a daily series: the last `days` days against the `days` before them.
// Used for KPI cards when no separate comparison period was loaded.

/** @param {number[]} values oldest first
 *  @returns {{delta: number, percent: number|null, days: number}|null} null when the series is too short */
export function recentChange(values, window = 7) {
  const series = (values || []).filter(Number.isFinite);
  const days = Math.min(window, Math.floor(series.length / 2));
  if (days < 1) return null;
  const sum = list => list.reduce((total, value) => total + value, 0);
  const now = sum(series.slice(-days)), before = sum(series.slice(-days * 2, -days));
  return { delta: now - before, percent: before > 0 ? (now - before) / before * 100 : null, days };
}

/** What a change means for a metric: more negative posts is bad, more positive posts is good, volume alone is neither. */
export function changeIntent(metric) {
  return metric === 'negative' ? 'bad-when-up' : metric === 'positive' ? 'good-when-up' : 'neutral';
}

/** `good`, `bad` or `neutral` for PulseDelta, from the direction of the change and what the metric is. */
export function deltaIntent(metric, delta) {
  const rule = changeIntent(metric);
  if (rule === 'neutral' || !delta) return 'neutral';
  return (rule === 'good-when-up') === (delta > 0) ? 'good' : 'bad';
}

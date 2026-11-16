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

/** Change in one sentiment's share of the analysed posts (positive + neutral + negative): the last `days` rows against the
 * `days` before them, in percentage points. A rise in volume lifts every count, so a count cannot say whether a tone grew;
 * its share can. Posts not analysed yet are outside both shares, so unanalysed backlog never moves the figure.
 * @param {{positive:number, neutral:number, negative:number}[]} rows oldest first
 * @returns {{delta: number, days: number}|null} null when either window has no analysed post */
export function recentShareChange(rows, key, window = 7) {
  const series = (rows || []).filter(row => row && ['positive', 'neutral', 'negative'].every(tone => Number.isFinite(row[tone])));
  const days = Math.min(window, Math.floor(series.length / 2));
  if (days < 1 || !['positive', 'neutral', 'negative'].includes(key)) return null;
  const share = list => {
    const analysed = list.reduce((sum, row) => sum + row.positive + row.neutral + row.negative, 0);
    return analysed ? list.reduce((sum, row) => sum + row[key], 0) / analysed * 100 : null;
  };
  const now = share(series.slice(-days)), before = share(series.slice(-days * 2, -days));
  return now === null || before === null ? null : { delta: now - before, days };
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

/** A change as it is printed everywhere: a sign when it rose, Indonesian grouping, at most one decimal, then the unit. */
export function deltaText(value, unit = '%') {
  return `${value > 0 ? '+' : ''}${value.toLocaleString('id-ID', { maximumFractionDigits: 1 })}${unit}`;
}

/** A share of a meter (0 to 100) as it is printed: "<1%" for a sliver, whole percent otherwise, never past 100. */
export function shareText(share) {
  const percent = Math.max(0, Math.min(100, share));
  return `${percent < 1 && percent > 0 ? '<1' : Math.round(percent)}%`;
}

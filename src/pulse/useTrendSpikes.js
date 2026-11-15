import { useEffect, useState } from 'react';
import api from '../lib/api';
import { createSpikeAnswers, spikeSeries } from '../lib/pulseSpikeAnswers';

// One memory of the server's answers for every trend chart on the page and every page of the session.
const answers = createSpikeAnswers(series => api.post('/admin/pulse/spikes', { series }));
const LINES = ['posts', 'interactions'];

/**
 * The spikes of the trend chart's two volume lines, as the server found them by the product's one rule (spike_v1).
 * @param {{key: string, posts: number, interactions: number}[]} rows the buckets the chart draws, from `trendSeries`
 * @param {{handed?: {posts?: object[], interactions?: object[]}, wanted?: boolean}} options `handed` are spikes that
 *   are already known (a test, a page rendered on the server): no call is made. `wanted` is false where the chart
 *   marks no spike (the sentiment and platform views).
 * @returns {{posts: object[], interactions: object[]}} `{key, value, usual, times}` per spike. Both lists are empty
 *   while the answer is on its way and when the call fails: the chart then draws no mark, and nothing is worked out
 *   in the browser instead.
 */
export default function useTrendSpikes(rows, { handed, wanted = true } = {}) {
  const [, redraw] = useState(0);
  const asking = wanted && !handed && rows.length > 0;
  const series = Object.fromEntries(LINES.map(line => [line, spikeSeries(rows, line)]));
  // The lines by their values: the chart builds new arrays on every draw, and only new numbers are a new question.
  const lines = asking ? JSON.stringify(series) : '';
  useEffect(() => {
    if (!lines) return undefined;
    let shown = true;
    answers.request(JSON.parse(lines)).then(() => { if (shown) redraw(count => count + 1); }, () => {});
    return () => { shown = false; };
  }, [lines]);
  return Object.fromEntries(LINES.map(line => [line, (handed ? handed[line] : asking ? answers.known(line, series[line]) : null) || []]));
}

// Which buckets of a line are spikes is decided on the server, by the product's one rule (spike_v1, counted in
// server/app/services/pulse_spikes.py and asked for at POST /api/admin/pulse/spikes). The browser holds no copy of
// that rule: it sends the numbers it draws and remembers the answer by those numbers, so a line is asked about once
// however often the chart is drawn again. No answer means no mark; nothing is worked out here instead.
// Pure: the call to the server is handed in, so this file reads no network and no clock.

/** One line of the chart as the server reads it: a name and a number per bucket, oldest first. */
export function spikeSeries(rows = [], key = 'posts') {
  return rows.map(row => ({ key: row.key, value: Number(row[key]) || 0 }));
}

const signature = (name, series) => name + '|' + series.map(bucket => bucket.key + ':' + bucket.value).join(',');

/**
 * The server's answers, remembered by the series' values.
 * @param {(series: Record<string, {key: string, value: number}[]>) => Promise<{spikes: Record<string, object[]>}>} ask
 *   sends the series to the server and resolves to its answer
 * @param {{keep?: number}} options how many answers are kept; the oldest is let go first
 */
export function createSpikeAnswers(ask, { keep = 40 } = {}) {
  const known = new Map(), asking = new Map();
  return {
    /** The spikes of one series (`{key, value, usual, times}` each) when the server has answered for exactly these
     * values; undefined until then. */
    known(name, series) {
      return known.get(signature(name, series));
    },
    /**
     * Asks about every series that has no answer yet, all in one request; a series another caller is already asking
     * about is waited for instead of being sent twice. Resolves once each has an answer. Rejects when the server
     * refused, could not be reached or answered without the series: nothing is remembered then, so the next call asks again.
     * @param {Record<string, {key: string, value: number}[]>} seriesByName for the chart: `{posts, interactions}`
     */
    request(seriesByName) {
      const waits = [], fresh = [];
      for (const [name, series] of Object.entries(seriesByName)) {
        const sign = signature(name, series);
        if (known.has(sign)) continue;
        if (asking.has(sign)) waits.push(asking.get(sign));
        else fresh.push({ name, series, sign });
      }
      if (fresh.length) {
        const answer = Promise.resolve().then(() => ask(Object.fromEntries(fresh.map(line => [line.name, line.series])))).then(body => {
          if (fresh.some(line => !Array.isArray(body?.spikes?.[line.name]))) throw new Error('The answer does not carry every series that was asked about');
          for (const line of fresh) {
            known.set(line.sign, body.spikes[line.name]);
            if (known.size > keep) known.delete(known.keys().next().value);
          }
        }).finally(() => { for (const line of fresh) asking.delete(line.sign); });
        for (const line of fresh) asking.set(line.sign, answer);
        waits.push(answer);
      }
      return Promise.all(waits).then(() => undefined);
    },
  };
}

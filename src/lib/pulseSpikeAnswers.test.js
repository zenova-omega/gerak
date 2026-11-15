import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpikeAnswers, spikeSeries } from './pulseSpikeAnswers.js';

const day = index => `2026-11-${String(8 + index).padStart(2, '0')}`;
const rows = (posts, interactions = posts.map(() => 0)) => posts.map((value, index) => ({ key: day(index), from: day(index), to: day(index), posts: value, interactions: interactions[index] }));

/** A stand-in for the server: remembers what it was asked and answers every series with the spikes it was told to. */
function server(spikes = {}) {
  const asked = [];
  const ask = async series => {
    asked.push(series);
    return { rule: { id: 'spike_v1' }, spikes: Object.fromEntries(Object.keys(series).map(name => [name, spikes[name] || []])) };
  };
  return { ask, asked };
}
const tenth = { key: '2026-11-10', value: 1700, usual: 1040, times: 1700 / 1040 };

test('a line is sent as a name and a number per bucket, and what is not a number is sent as zero', () => {
  assert.deepEqual(spikeSeries(rows([80, 180, 1700]), 'posts'), [{ key: '2026-11-08', value: 80 }, { key: '2026-11-09', value: 180 }, { key: '2026-11-10', value: 1700 }]);
  assert.deepEqual(spikeSeries([{ key: 'a', posts: undefined }, { key: 'b', posts: NaN }], 'posts'), [{ key: 'a', value: 0 }, { key: 'b', value: 0 }]);
  assert.deepEqual(spikeSeries(), []);
});

test('the same line is asked about once, however often the chart is drawn again', async () => {
  const { ask, asked } = server({ posts: [tenth] });
  const answers = createSpikeAnswers(ask);
  const posts = spikeSeries(rows([80, 180, 1700, 1400, 1328, 1050, 1030]), 'posts');
  assert.equal(answers.known('posts', posts), undefined, 'nothing is known before the server has answered');
  await answers.request({ posts });
  assert.deepEqual(answers.known('posts', posts), [tenth]);
  // Drawn again from new arrays that hold the same numbers: no second question.
  await answers.request({ posts: spikeSeries(rows([80, 180, 1700, 1400, 1328, 1050, 1030]), 'posts') });
  assert.deepEqual(asked, [{ posts }]);
});

test('when one line changes only that line is asked about again', async () => {
  const { ask, asked } = server();
  const answers = createSpikeAnswers(ask);
  const first = rows([1, 2, 30], [10, 20, 30]), later = rows([1, 2, 30], [10, 20, 900]);
  await answers.request({ posts: spikeSeries(first, 'posts'), interactions: spikeSeries(first, 'interactions') });
  await answers.request({ posts: spikeSeries(later, 'posts'), interactions: spikeSeries(later, 'interactions') });
  assert.deepEqual(asked.map(series => Object.keys(series)), [['posts', 'interactions'], ['interactions']], 'both lines travel in one request; the unchanged one is not sent twice');
  assert.equal(answers.known('interactions', spikeSeries(first, 'interactions')).length, 0, 'the earlier answer is still there when the reader goes back');
  // The same numbers under another name are another line: posts and interactions have different floors on the server.
  assert.equal(answers.known('interactions', spikeSeries(first, 'posts')), undefined);
});

test('two charts that draw the same line at the same moment share one question', async () => {
  const { ask, asked } = server({ posts: [tenth] });
  const answers = createSpikeAnswers(ask);
  const posts = spikeSeries(rows([80, 180, 1700]), 'posts');
  await Promise.all([answers.request({ posts }), answers.request({ posts })]);
  assert.equal(asked.length, 1);
  assert.deepEqual(answers.known('posts', posts), [tenth]);
});

test('a call that fails leaves no answer, and the line is asked about again the next time', async () => {
  let down = true;
  const { ask, asked } = server({ posts: [tenth] });
  const answers = createSpikeAnswers(series => down ? Promise.reject(new Error('503')) : ask(series));
  const posts = spikeSeries(rows([80, 180, 1700]), 'posts');
  await assert.rejects(answers.request({ posts }));
  assert.equal(answers.known('posts', posts), undefined, 'no answer means no mark: nothing is worked out here instead');
  down = false;
  await answers.request({ posts });
  assert.deepEqual(answers.known('posts', posts), [tenth]);
  assert.equal(asked.length, 1);
});

test('an answer that does not carry the line is no answer', async () => {
  const answers = createSpikeAnswers(async () => ({ rule: { id: 'spike_v1' }, spikes: {} }));
  const posts = spikeSeries(rows([80, 180, 1700]), 'posts');
  await assert.rejects(answers.request({ posts }));
  assert.equal(answers.known('posts', posts), undefined);
  const empty = createSpikeAnswers(async () => null);
  await assert.rejects(empty.request({ posts }));
});

test('only the latest answers are kept, so a long session does not grow without end', async () => {
  const { ask, asked } = server();
  const answers = createSpikeAnswers(ask, { keep: 2 });
  const line = last => spikeSeries(rows([1, 2, last]), 'posts');
  for (const last of [10, 11, 12]) await answers.request({ posts: line(last) });
  assert.equal(answers.known('posts', line(10)), undefined, 'the oldest answer was let go');
  assert.deepEqual(answers.known('posts', line(12)), []);
  await answers.request({ posts: line(10) });
  assert.equal(asked.length, 4, 'and is simply asked for again');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { deltaText, projectKpis, shareText } from './pulseKpis.js';
import { overviewEvidence } from './pulseOverview.js';
import { accountConcentration, netSentiment } from './pulseInsightMetrics.js';

const post = (id, day, { author = 'a', platform = 'x', tone, likes, text } = {}) => ({
  id, author, platform, text: text ?? `posting ${id}`, published_at: `${day}T03:00:00Z`,
  metrics: { ...(tone ? { sentiment: { label: tone } } : {}), ...(likes == null ? {} : { likes }) },
});
const week = ['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04'];
const period = { from: '2026-10-29', to: '2026-11-04' };
const now = Array.from({ length: 10 }, (_, index) => post(`n${index}`, week[index % 7], {
  author: ['a', 'b', 'c', 'd', 'e'][index % 5], tone: ['positive', 'positive', 'negative', 'neutral', undefined][index % 5],
  likes: index < 4 ? 10 : undefined, text: index === 9 ? 'posting n8' : undefined,
}));
const before = Array.from({ length: 8 }, (_, index) => post(`b${index}`, '2026-10-25'));
const byKey = kpis => Object.fromEntries(kpis.map(kpi => [kpi.key, kpi]));

test('the six figures of Ikhtisar, in its order and under its names', () => {
  const kpis = projectKpis(overviewEvidence(now, { previousPosts: before }), { period });
  assert.deepEqual(kpis.map(kpi => [kpi.key, kpi.label]), [
    ['mentions', 'Penyebutan'], ['unique', 'Konten unik'], ['accounts', 'Akun unik'],
    ['interactions', 'Interaksi'], ['net', 'Sentimen bersih'], ['concentration', 'Konsentrasi akun'],
  ]);
});

test('with a chosen period the mentions are compared with the period of the same length right before it', () => {
  const { mentions } = byKey(projectKpis(overviewEvidence(now, { previousPosts: before }), { period }));
  assert.equal(mentions.value, 10);
  assert.equal(mentions.delta, 25);
  assert.equal(mentions.deltaNote, 'vs 22–28 Okt 2026', 'the dates read like every other date in PULSE');
  assert.equal(mentions.note, undefined);
  assert.equal(mentions.trend.length, 7);
});

test('while the period before is not known the mentions say why, and never fall back to another baseline', () => {
  const evidence = overviewEvidence(now, { previousPosts: null });
  assert.equal(byKey(projectKpis(evidence, { period })).mentions.note, 'Memuat perbandingan…');
  assert.equal(byKey(projectKpis(evidence, { period, comparisonError: true })).mentions.note, 'Perbandingan belum tersedia');
  assert.equal(byKey(projectKpis(evidence, { period, archived: true })).mentions.note, 'Perbandingan tidak disimpan dalam arsip');
  for (const options of [{ period }, { period, comparisonError: true }, { period, archived: true }]) {
    assert.equal(byKey(projectKpis(evidence, options)).mentions.delta, null);
  }
  const empty = byKey(projectKpis(overviewEvidence(now, { previousPosts: [] }), { period })).mentions;
  assert.equal(empty.delta, null);
  assert.equal(empty.note, '+10 posting · basis sebelumnya 0');
});

test('without a chosen period the mentions compare the last days with the days before them', () => {
  const { mentions } = byKey(projectKpis(overviewEvidence(now), { period: {} }));
  // 7 days: the last 3 against the 3 before (recentChange); days hold 2,2,2,1,1,1,1 posts.
  assert.equal(mentions.delta, (3 - 5) / 5 * 100);
  assert.equal(mentions.deltaNote, '3 hari terakhir vs 3 hari sebelumnya');
});

test('the other five figures are the shared readings, written as Ikhtisar writes them', () => {
  const evidence = overviewEvidence(now, { previousPosts: before });
  const kpis = byKey(projectKpis(evidence, { period }));
  assert.equal(kpis.unique.value, 9);
  assert.equal(kpis.unique.share, 90);
  assert.equal(kpis.unique.shareLabel, 'teks berbeda');
  assert.equal(kpis.unique.note, '1 salinan teks identik');
  assert.equal(kpis.accounts.value, 5);
  assert.equal(kpis.accounts.note, '2 posting per akun');
  assert.equal(kpis.interactions.value, 40);
  assert.equal(kpis.interactions.share, 40);
  assert.equal(kpis.interactions.shareLabel, 'posting bermetrik');
  const net = Math.round(netSentiment(evidence.counts));
  assert.equal(kpis.net.value, `${net > 0 ? '+' : net < 0 ? '−' : ''}${Math.abs(net)}`);
  assert.equal(kpis.net.deltaUnit, ' poin');
  assert.equal(kpis.net.note, `dari ${evidence.posts.length} posting · skala −100 sampai +100`, 'tone_share_v2: the base is every post');
  const reading = accountConcentration(evidence.posts);
  assert.equal(kpis.concentration.value, `${Math.round(reading.topAccountShare * 100)}%`);
  assert.equal(kpis.concentration.note, `posting dari 3 akun teratas · dari ${reading.accounts} akun`);
});

test('an empty selection has figures nobody observed, never zeros made up', () => {
  const kpis = byKey(projectKpis(overviewEvidence([]), { period: {} }));
  assert.equal(kpis.mentions.value, 0);
  assert.equal(kpis.interactions.value, null);
  assert.equal(kpis.net.value, null);
  assert.equal(kpis.net.note, 'Belum ada posting yang dianalisis');
  assert.equal(kpis.concentration.value, null);
  assert.equal(kpis.accounts.note, 'Dihitung per platform');
});

test('a change and a share are written one way everywhere', () => {
  assert.equal(deltaText(18.2), '+18,2%');
  assert.equal(deltaText(-6, ' poin'), '-6 poin');
  assert.equal(deltaText(0), '0%');
  assert.equal(deltaText(1234.56), '+1.234,6%');
  assert.equal(shareText(0.4), '<1%');
  assert.equal(shareText(77.6), '78%');
  assert.equal(shareText(0), '0%');
  assert.equal(shareText(140), '100%', 'a meter never reads past full');
});

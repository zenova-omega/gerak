// The six figures at the top of Ikhtisar, worked out once for one selection, so that Ikhtisar and the report print the
// same numbers with the same comparison and the same words. Pure: no React, no clock, no network.
// Every figure rests on a shared reading: the posts and their days (`overviewEvidence`), the net score
// (`netSentiment`, tone_share_v2's base: every post), how concentrated the speaking is (concentration_v1) and the change inside a
// series (`recentChange`, `recentShareChange`). Nothing is counted here; this file only chooses the baseline of each
// figure and writes it down.
import { formatCount } from './pulseData.js';
import { previousPeriod } from './pulseOverview.js';
import { groupDayRange } from './pulseConversationGroups.js';
import { accountConcentration, netSentiment, netSentimentChange } from './pulseInsightMetrics.js';
import { percentLabel } from './pulseEngagement.js';
import { deltaIntent, deltaText, recentChange } from './pulseTrend.js';

// How a change and a meter's share are written lives beside the change itself, so the small figure components can use
// it without this file's readings.
export { deltaText, shareText } from './pulseTrend.js';

/**
 * @param {ReturnType<typeof import('./pulseOverview.js').overviewEvidence>} evidence the selection, with `previousPosts`
 *   when the period before was loaded (its `volumeChange` is null until then)
 * @param {{period?: {from?: string, to?: string}, comparisonError?: boolean, archived?: boolean}} options
 *   `comparisonError`: the period before could not be loaded. `archived`: an opened archive, which keeps no period before.
 * @returns {{key: 'mentions'|'unique'|'accounts'|'interactions'|'net'|'concentration', label: string, value: number|string|null,
 *   delta: number|null, deltaUnit?: string, deltaIntent?: string, deltaNote?: string, share?: number|null, shareLabel?: string,
 *   note?: string, trend?: number[]}[]} in the order Ikhtisar shows them
 */
export function projectKpis(evidence, { period = {}, comparisonError = false, archived = false } = {}) {
  const total = evidence.posts.length, days = evidence.days || [];
  // One baseline per figure: with a chosen period the volume is compared with the period before it and nothing else.
  // While that comparison loads, fails, is not kept or has an empty base, the figure says so instead of quietly
  // switching to the last-days window.
  const comparison = previousPeriod(period), change = evidence.volumeChange;
  const trend = days.map(day => day.total), recent = recentChange(trend);
  const changeText = !comparison ? 'Pilih tanggal mulai dan akhir'
    : archived ? 'Perbandingan tidak disimpan dalam arsip'
    : comparisonError ? 'Perbandingan belum tersedia'
    : !change ? 'Memuat perbandingan…'
    : change.percent === null ? `${change.delta > 0 ? '+' : ''}${change.delta} posting · basis sebelumnya 0`
    : deltaText(change.percent);
  const percentChange = !archived && change && change.percent !== null ? change.percent : null;
  const mentionsDelta = comparison ? percentChange : recent?.percent ?? null;
  const net = netSentiment(evidence.counts), netChange = netSentimentChange(days), concentration = accountConcentration(evidence.posts);
  const rounded = net === null ? null : Math.round(net);
  const accounts = evidence.accounts.length;
  return [
    { key: 'mentions', label: 'Penyebutan', value: total, delta: mentionsDelta, trend,
      deltaNote: comparison ? `vs ${groupDayRange(comparison.from, comparison.to)}` : recent ? `${recent.days} hari terakhir vs ${recent.days} hari sebelumnya` : undefined,
      note: mentionsDelta === null && (comparison || !recent) ? changeText : undefined },
    { key: 'unique', label: 'Konten unik', value: evidence.uniqueContent, delta: null, share: total ? evidence.uniqueContent / total * 100 : null,
      shareLabel: 'teks berbeda', note: `${formatCount(evidence.duplicates)} salinan teks identik` },
    { key: 'accounts', label: 'Akun unik', value: accounts, delta: null,
      note: total && accounts ? `${(total / accounts).toLocaleString('id-ID', { maximumFractionDigits: 1 })} posting per akun` : 'Dihitung per platform' },
    { key: 'interactions', label: 'Interaksi', value: evidence.engagement, delta: null,
      share: total ? evidence.engagementCoverage / total * 100 : null, shareLabel: 'posting bermetrik' },
    { key: 'net', label: 'Sentimen bersih', value: rounded === null ? null : `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${Math.abs(rounded)}`,
      delta: netChange?.delta ?? null, deltaUnit: ' poin', deltaIntent: deltaIntent('positive', netChange?.delta),
      deltaNote: netChange ? `${netChange.days} hari terakhir vs ${netChange.days} hari sebelumnya` : undefined,
      note: net === null ? 'Belum ada posting yang dianalisis' : `dari ${formatCount(total)} posting · skala −100 sampai +100` },
    { key: 'concentration', label: 'Konsentrasi akun', delta: null,
      value: concentration.topAccountShare === null ? null : percentLabel(concentration.topAccountShare),
      note: concentration.topAccountShare === null ? 'Belum ada akun bernama' : `posting dari 3 akun teratas · dari ${formatCount(concentration.accounts)} akun` },
  ];
}

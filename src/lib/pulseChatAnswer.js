// A Tanya AI answer as the page draws it. The server sends the model's text with light markup ("**tebal**", lines
// that start with "- ", evidence codes like [P1] and [I1]) plus the posts and conversation groups it cites and the
// charts it asked for (built by the server from its own numbers). This module turns that into a lead sentence,
// paragraphs and lists, with one number per piece of evidence. Pure: no React, no DOM.
import { sentimentLabels } from './pulsePostFilters.js';
import { sentimentColor } from './pulseChartTheme.js';

const CODE = /\[([A-Z]\d{1,2})\]/g;
const BULLET = /^\s*(?:[-•*]|\d{1,2}[.)])\s+(.*)$/;
const LABEL = /^([^:.!?[\]*]{2,32}:)\s+(?=\S)/;      // "Dukungan: …" at the start of a line; "07:00" has no space after its colon

/** Inline text to parts: bold runs, numbered marks for known codes, plain text. Stray asterisks are dropped. */
function inline(text, numbers, bold = false) {
  const parts = [];
  const push = (value, strong) => { const clean = value.replace(/\*+/g, '').replace(/\s{2,}/g, ' '); if (clean) parts.push(strong ? { text: clean, bold: true } : { text: clean }); };
  for (const piece of text.split(/(\*\*[^*\n]+?\*\*|\[[A-Z]\d{1,2}\])/)) {
    if (!piece) continue;
    const code = piece.match(/^\[([A-Z]\d{1,2})\]$/)?.[1];
    if (code) { if (numbers.has(code)) parts.push({ mark: numbers.get(code), code }); continue; }
    if (/^\*\*[^*\n]+?\*\*$/.test(piece)) { parts.push(...inline(piece.slice(2, -2), numbers, true)); continue; }
    push(piece, bold);
  }
  return parts;
}

/** A line of a list or a later paragraph: when the answer set nothing in bold, a short label before a colon is. */
function line(text, numbers) {
  const label = !text.includes('**') && text.match(LABEL);
  return label ? [{ text: label[1], bold: true }, { text: ' ' }, ...inline(text.slice(label[0].length), numbers)] : inline(text, numbers);
}

/**
 * @param {{answer?: string, sources?: object[], groups?: object[], charts?: object[]}} turn one answered question
 * @returns {{
 *   lead: object[], blocks: ({type: 'p', parts: object[]} | {type: 'list', items: object[][]})[],
 *   evidence: {number: number, kind: 'post'|'group', code: string, source?: object, group?: object}[], charts: object[],
 * }}
 *   A part is `{text, bold?}` or `{mark, code}`; `mark` is the number of the evidence it points at. Evidence is
 *   numbered in the order the answer cites it, posts and groups alike, and a number returns wherever its code does.
 *   `lead` is the opening sentence or paragraph: the answer itself. A code without evidence is left out of the text.
 */
export function answerView(turn = {}) {
  const posts = new Map((turn.sources || []).map(source => [source.code, source])), groups = new Map((turn.groups || []).map(group => [group.code, group]));
  const raw = String(turn.answer || '').replace(/\r\n?/g, '\n');
  const numbers = new Map(), evidence = [];
  const add = code => {
    if (numbers.has(code) || !(posts.has(code) || groups.has(code))) return;
    numbers.set(code, evidence.length + 1);
    evidence.push(posts.has(code) ? { number: evidence.length + 1, kind: 'post', code, source: posts.get(code) } : { number: evidence.length + 1, kind: 'group', code, group: groups.get(code) });
  };
  for (const match of raw.matchAll(CODE)) add(match[1]);
  for (const code of [...posts.keys(), ...groups.keys()]) add(code);      // returned but not cited in the text: still shown, last
  // A code the answer has no evidence for goes, with the space in front of it.
  const text = raw.replace(/[ \t]*\[([A-Z]\d{1,2})\]/g, (mark, code) => (numbers.has(code) ? mark : ''));

  const blocks = [];
  let paragraph = [], list = null;
  const closeParagraph = () => { if (paragraph.length) { blocks.push({ type: 'p', text: paragraph.join(' ') }); paragraph = []; } };
  for (const row of text.split('\n')) {
    const bullet = row.match(BULLET);
    if (bullet) { closeParagraph(); if (!list) { list = { type: 'list', items: [] }; blocks.push(list); } list.items.push(bullet[1].trim()); continue; }
    list = null;
    if (row.trim()) paragraph.push(row.trim()); else closeParagraph();
  }
  closeParagraph();
  const first = blocks[0]?.type === 'p' ? blocks.shift() : null;
  return {
    lead: first ? inline(first.text, numbers) : [],
    blocks: blocks.map(block => (block.type === 'list' ? { type: 'list', items: block.items.map(item => line(item, numbers)) } : { type: 'p', parts: line(block.text, numbers) })),
    evidence, charts: turn.charts || [],
  };
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const dayLabel = date => `${Number(date.slice(8))} ${months[Number(date.slice(5, 7)) - 1]}`;

/**
 * The rows of one chart, ready to draw. The numbers are the server's; this only names them and sizes the bars.
 * @param {{kind: 'bars'|'days', rows: object[]}} chart from the answer
 * @param {(platform: string) => string} platformName how a platform is called on the page
 * @returns {{key: string, label: string, value: number, width: number, share: string|null, color: string, peak?: boolean}[]}
 *   `width` is the bar in percent of the longest. `share` is set only where the rows are parts of one whole
 *   (sentiment, platforms); provinces and groups are top lists that overlap, so they carry none.
 */
export function chartRows(chart, platformName = name => name) {
  const rows = chart?.rows || [], most = Math.max(0, ...rows.map(row => row.value || 0)), whole = rows.reduce((sum, row) => sum + (row.value || 0), 0);
  const width = value => (most > 0 ? Math.round((value || 0) / most * 100) : 0);
  if (chart?.kind === 'days') {
    const peak = rows.findIndex(row => row.value === most && most > 0);
    return rows.map((row, index) => ({ key: row.date, label: dayLabel(row.date), value: row.value || 0, width: width(row.value), share: null, color: 'var(--ps-chart-1)', peak: index === peak }));
  }
  return rows.map((row, index) => {
    const parts = Boolean(row.tone || row.platform);
    return { key: row.tone || row.platform || row.code || row.label || String(index), label: row.tone ? sentimentLabels[row.tone] || row.tone : row.platform ? platformName(row.platform) || row.platform : row.label,
      value: row.value || 0, width: width(row.value), share: parts ? `${whole > 0 ? Math.round((row.value || 0) / whole * 100) : 0}%` : null,
      color: row.tone ? sentimentColor[row.tone] || 'var(--ps-chart-1)' : 'var(--ps-chart-1)' };
  });
}

// How a stored AI summary is read by the pages that show it. Pure functions: no React, no requests.
// The server parses the model's text into sections and lists the cited sources; nothing here trusts raw model output as markup.

const CODE = /\[([PANKIT]\d{1,2})\]/;
const CODES = /\s*\[([PANKIT]\d{1,2})\]/g;

/** The formats the summary card on Ikhtisar offers when the server sends no list. */
export const cardFormats = [{ key: 'brief', label: 'Ringkas' }, { key: 'timeline', label: 'Kronologi' }, { key: 'executive', label: 'Eksekutif' }];

/** The format the summary card opens on: "Ringkas" unless only another listed format has been written.
 * A stored format the card does not list (AI Insights has a page of its own) is never opened there. */
export function openingFormat(data) {
  const listed = (data?.formats?.length ? data.formats : cardFormats).map(item => item.key);
  const made = listed.filter(key => data?.summaries?.[key]);
  return made.includes('brief') || !made.length ? 'brief' : made[0];
}

/** "Mingguan" for exactly 7 days, "Bulanan" for 28 to 31, "Periode pilihan" for anything else, open ranges included.
 * Both ends count: 3 Nov to 9 Nov is seven days. */
export function periodBadge(from, to) {
  const days = from && to ? Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000) + 1 : NaN;
  return days === 7 ? 'Mingguan' : days >= 28 && days <= 31 ? 'Bulanan' : 'Periode pilihan';
}

const platformKey = value => (Array.isArray(value) && value.length ? [...value].sort().join(',') : '');
/** Whether a stored summary was written for another period or other platforms than the project bar shows now.
 * No platform chosen means all of them, on both sides. */
export function scopeDiffers(scope = {}, period = {}, platforms = null) {
  return (scope.from || '') !== (period.from || '') || (scope.to || '') !== (period.to || '') || platformKey(scope.platforms) !== platformKey(platforms);
}

// A full stop after one of these is part of a name or a figure, not the end of a sentence. A single capital is an
// initial ("H. Ahmad"), except X, which is a platform ("ramai di X. Akun …").
const NOT_AN_END = /(?:^|[\s(])(?:Jend|Irjen|Komjen|Brigjen|Kombes|Letjen|Mayjen|Kol|Prof|Dr|Drs|Dra|Ir|Hj|KH|Sdr|Tn|Ny|Bpk|No|Rp|tgl|pkl|dll|dsb|dst|dkk|s\.d|[A-WYZ])$/;
const SENTENCE_END = /[.!?]+["”’']?(?:\s*\[[PANKIT]\d{1,2}\])*(?=\s|$)/g;

/** One insight as [lead, explanation]: the first sentence, with the evidence codes that close it, and the rest.
 * "317.599" and "19.30" have no space after the dot, so they never end a sentence. */
export function splitLead(text) {
  const value = (text || '').trim();
  for (const match of value.matchAll(SENTENCE_END)) {
    const end = match.index + match[0].length, rest = value.slice(end);
    if (!rest.trim()) break;
    if (match[0][0] === '.' && NOT_AN_END.test(value.slice(0, match.index))) continue;
    if (!/^\s+["“'(]?[A-Z0-9@#]/.test(rest)) continue;   // the next word does not open a sentence
    return [value.slice(0, end), rest.trim()];
  }
  return [value, ''];
}

/** Text and references in reading order: [{text}, {number}, …]. Space before a reference is dropped; the page spaces the mark. */
function parts(text, number) {
  const out = [];
  for (const piece of text.split(/(\[[PANKIT]\d{1,2}\])/)) {
    const code = piece.match(CODE)?.[1];
    if (code && piece.startsWith('[')) {
      if (out.at(-1)?.text) out.at(-1).text = out.at(-1).text.trimEnd();
      const found = number(code);
      if (out.at(-1)?.number !== found) out.push({ number: found });   // two codes for one source print one mark
    } else if (piece.trim()) out.push({ text: out.length ? piece : piece.trimStart() });
  }
  if (out.at(-1)?.text) out.at(-1).text = out.at(-1).text.trimEnd();
  return out;
}

/** A stored insights summary as the page shows it.
 * - `headline`: the one sentence under "Judul", without evidence codes.
 * - `insights`: each bullet as `{lead, body}`, both lists of `{text}` and `{number}` parts.
 * - `evidence`: `{number, source}` rows. Numbers run from 1 in the order the insights first cite a source, so the same
 *   source keeps its number everywhere on the page. A code the server did not list as a source is dropped.
 * An answer that ignored the format still shows: without a "Judul" section there is no headline, and without bullets
 * the paragraphs are read as insights. */
export function insightView(summary) {
  const sections = (summary?.sections || []).filter(section => section && typeof section === 'object');
  const sources = new Map((summary?.sources || []).map(source => [source.code, source]));
  const head = sections.find(section => section.kind === 'headline');
  const lines = section => ({ paragraphs: section.paragraphs || [], bullets: section.bullets || [] });
  const title = head ? lines(head).paragraphs[0] || lines(head).bullets[0] || '' : '';
  // Normally the insights sit in their own section. If the model put everything under the headline, what follows it is read.
  const others = sections.filter(section => section !== head).map(lines);
  const rest = others.some(section => section.paragraphs.length || section.bullets.length) || !head ? others
    : [{ paragraphs: lines(head).paragraphs.slice(1), bullets: lines(head).paragraphs.length ? lines(head).bullets : lines(head).bullets.slice(1) }];
  const bullets = rest.flatMap(section => section.bullets);
  const texts = bullets.length ? bullets : rest.flatMap(section => section.paragraphs);
  const evidence = [];
  // The server may list one post under two codes (the top post that is also the most-liked negative one). On the page it
  // is one piece of evidence with one number. A comment is its own evidence, apart from the post it sits under.
  const same = source => (source.comment ? ['comment', source.id, source.author, source.text] : ['post', source.id || source.url || source.code]).join('\u0001');
  const number = code => {
    const source = sources.get(code);
    let row = evidence.find(item => same(item.source) === same(source));
    if (!row) evidence.push(row = { number: evidence.length + 1, source });
    return row.number;
  };
  // A dropped code takes the space in front of it along; nothing else in the sentence is touched, so a quoted comment stays as written.
  const tidy = value => value.replace(/\s{2,}/g, ' ').trim();
  const insights = texts.map(raw => {
    const known = tidy(String(raw).replace(CODES, (mark, code) => (sources.has(code) ? mark : '')));
    // "… hari itu [K3]." reads better as "… hari itu. [K3]": the mark follows the sentence it supports.
    const placed = known.replace(/((?:\s*\[[PANKIT]\d{1,2}\])+)([.!?]+)(?=\s|$)/g, '$2$1');
    const [lead, body] = splitLead(placed);
    return { lead: parts(lead, number), body: parts(body, number) };
  }).filter(item => item.lead.length);
  return { headline: tidy(String(title).replace(CODES, '')), insights, evidence };
}

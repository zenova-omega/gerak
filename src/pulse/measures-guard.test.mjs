// One rule per figure (15 Nov 2026): a post's day, its interactions and its account are worked out in two modules
// only, server/app/services/pulse_measures.py and src/lib/pulseMeasures.js. This guard fails when any other file under
// server/app or src writes one of those rules by hand: a zone shift, a sum of likes, comments and shares, or an
// account key. Comments and docstrings are never read, and sentences inside strings are not read by the arithmetic and
// key patterns, so text that only describes a rule does not trip it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const MODULES = new Set(['server/app/services/pulse_measures.py', 'src/lib/pulseMeasures.js']);

const RESERVED = 'reserved by another session, 15 Nov 2026';
// A file is listed only while it still holds the kinds named here; the second test fails on an entry that no longer
// matches, so this list can only shrink. Each entry names what is left in the file.
const EXEMPT = {
  'server/app/services/pulse_monitor.py': { kinds: ['account'], note: `${RESERVED}; issue signal counts accounts as (platform, author) pairs` },
  'server/app/services/pulse_profiles.py': { kinds: ['account'], note: `profile_key: an address, not a figure (where a looked-up picture is kept); ${RESERVED}` },
  'server/app/services/pulse_summary.py': { kinds: ['account'], note: `${RESERVED}; accounts keyed by (author, platform) in the summary context` },
  'src/lib/pulseTrendSpikes.js': { kinds: ['account'], note: `${RESERVED}; spike accounts keyed by platform + ':' + author` },
  'src/lib/pulseRadar.js': { kinds: ['zone'], note: `${RESERVED}; radar dates printed in Asia/Jakarta` },
  'server/app/pulse_measures_report.py': { kinds: ['interactions', 'account'], note: 'the old rules, kept only to print the before/after table (calculation dictionary, Task 7)' },
};

// ---- reading code, not prose -------------------------------------------------------------------------------------
// Each reader returns two copies of a file with the same length and line breaks:
//   code: comments and docstrings blanked, strings kept (a zone written into a string is still a zone);
//   keys: also blanks every plain string that is not a short key ('likes', '|', '$.author_id' stay; sentences go).
const blank = text => text.replace(/[^\n]/g, ' ');
const KEY_LIKE = /^[^\s'"`\\]{0,40}$/;
const WORD = /[A-Za-z_$][\w$]*/y;

function readJs(src) {
  let code = '', keys = '', i = 0, prev = '';
  const emit = (text, keyText = text) => { code += text; keys += keyText; };
  const REGEX_AFTER = '(,=:[!&|?{};+-*%<>~^';
  const REGEX_WORDS = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'void', 'yield', 'await', 'delete', 'instanceof', 'new', 'throw']);
  function string(quote) {   // ends at its quote or at the end of the line
    let j = i + 1;
    while (j < src.length && src[j] !== quote && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1;
    const closed = src[j] === quote, end = closed ? j + 1 : j, body = src.slice(i + 1, j);
    emit(src.slice(i, end), KEY_LIKE.test(body) && closed ? src.slice(i, end) : quote + blank(body) + (closed ? quote : ''));
    i = end;
  }
  function regex() {         // a regex literal stays on one line; without its closing slash the '/' is a division
    let j = i + 1, inClass = false;
    for (; j < src.length && src[j] !== '\n'; j++) {
      if (src[j] === '\\') { j++; continue; }
      if (src[j] === '[') inClass = true; else if (src[j] === ']') inClass = false;
      else if (src[j] === '/' && !inClass) break;
    }
    if (src[j] !== '/') return false;
    j++; while (/[a-z]/i.test(src[j] || '')) j++;
    emit(src.slice(i, j)); i = j; return true;
  }
  function template() {      // text kept as written; each ${…} read as code
    emit('`'); i++;
    while (i < src.length) {
      if (src[i] === '\\') { emit(src.slice(i, i + 2)); i += 2; }
      else if (src[i] === '`') { emit('`'); i++; return; }
      else if (src[i] === '$' && src[i + 1] === '{') { emit('${'); i += 2; codeUntil(true); }
      else { emit(src[i]); i++; }
    }
  }
  function codeUntil(nested) {
    let depth = 0;
    while (i < src.length) {
      const c = src[i], d = src[i + 1];
      if (c === '/' && (d === '/' || d === '*')) {
        const end = d === '/' ? src.indexOf('\n', i) : src.indexOf('*/', i + 2);
        const stop = end < 0 ? src.length : d === '/' ? end : end + 2;
        emit(blank(src.slice(i, stop))); i = stop; continue;
      }
      if (c === '"' || c === "'") { string(c); prev = 'x'; continue; }
      if (c === '`') { template(); prev = 'x'; continue; }
      if (c === '/' && (prev === '' || REGEX_AFTER.includes(prev)) && regex()) { prev = 'x'; continue; }
      WORD.lastIndex = i;
      const word = WORD.exec(src)?.[0];
      if (word) { emit(word); i += word.length; prev = REGEX_WORDS.has(word) ? '(' : 'x'; continue; }
      if (nested && c === '{') depth++;
      if (nested && c === '}' && depth-- === 0) { emit('}'); i++; return; }
      emit(c); i++;
      if (!/\s/.test(c)) prev = /[\w.]/.test(c) ? 'x' : c;
    }
  }
  codeUntil(false);
  return { code, keys };
}

function readPy(src) {
  let code = '', keys = '', i = 0, depth = 0, lineStart = true;
  const emit = (text, keyText = text) => { code += text; keys += keyText; };
  const PREFIX = /^(?:[rubf]|br|rb|fr|rf)$/i;
  function string(prefix) {
    const start = i - prefix.length;
    const quote = src.startsWith(src[i].repeat(3), i) ? src[i].repeat(3) : src[i];
    let j = i + quote.length;
    while (j < src.length && !src.startsWith(quote, j) && (quote.length === 3 || src[j] !== '\n')) j += src[j] === '\\' ? 2 : 1;
    const closed = src.startsWith(quote, j), end = closed ? j + quote.length : j;
    const text = src.slice(start, end), body = src.slice(i + quote.length, j);
    const after = src.slice(end, src.indexOf('\n', end) < 0 ? src.length : src.indexOf('\n', end)).trimStart();
    const docstring = lineStart && depth === 0 && !/^[.+%[*(]/.test(after) && !/f/i.test(prefix);
    if (docstring) emit(blank(text));
    else if (/f/i.test(prefix)) emit(text);   // an f-string's {…} is code
    else emit(text, KEY_LIKE.test(body) && closed ? text : prefix + quote + blank(body) + (closed ? quote : ''));
    i = end; lineStart = false;
  }
  while (i < src.length) {
    const c = src[i];
    if (c === '#') { const end = src.indexOf('\n', i); const stop = end < 0 ? src.length : end; emit(blank(src.slice(i, stop))); i = stop; continue; }
    if (c === '\\' && src[i + 1] === '\n') { emit('\\\n'); i += 2; continue; }
    if (c === '\n') { emit(c); i++; if (depth === 0) lineStart = true; continue; }
    if (c === "'" || c === '"') { string(''); continue; }
    WORD.lastIndex = i;
    const word = WORD.exec(src)?.[0];
    if (word) {
      i += word.length;
      if (PREFIX.test(word) && (src[i] === "'" || src[i] === '"')) { string(word); continue; }
      emit(word); lineStart = false; continue;
    }
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth = Math.max(0, depth - 1);
    if (!/\s/.test(c)) lineStart = false;
    emit(c); i++;
  }
  return { code, keys };
}

// ---- the patterns ------------------------------------------------------------------------------------------------
// Whether two operands are joined by an operator in one expression: the operator stands at the shallowest bracket
// level between them and nothing at that level separates them (a comma, colon, semicolon, assignment or arrow).
function joined(text, from, to, operator) {
  const gap = text.slice(from, to);
  if (gap.length > 160) return false;
  let depth = 0, min = 0;
  const ops = [], stops = [];
  for (let k = 0; k < gap.length; k++) {
    const c = gap[k];
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) min = Math.min(min, --depth);
    else if (operator === '+' ? c === '+' && gap[k + 1] !== '+' && gap[k + 1] !== '=' && gap[k - 1] !== '+'
      : /^(?:\|\||\?\?|or\b)/.test(gap.slice(k, k + 3)) && (gap[k] !== 'o' || !/\w/.test(gap[k - 1] || ''))) ops.push(depth);
    else if (c === ',' || c === ';' || c === ':' || (c === '=' && !'=!<>'.includes(gap[k - 1] || '') && gap[k + 1] !== '=')) stops.push(depth);
  }
  return ops.some(level => level === min) && !stops.some(level => level === min);
}

function chains(text, names, isWanted, operator) {
  const found = [], tokens = [...text.matchAll(names)].map(m => ({ name: m[1], at: m.index, end: m.index + m[0].length }));
  for (let k = 0; k < tokens.length; k++) {
    const run = isWanted(tokens, k);
    if (run && run.every((token, n) => n === 0 || joined(text, run[n - 1].end, token.at, operator))) found.push(tokens[k].at);
  }
  return found;
}

const SUM_NAMES = /\b(likes|comments|shares)\b/g;
const threeKinds = (tokens, k) => {
  const run = tokens.slice(k, k + 3);
  return run.length === 3 && new Set(run.map(t => t.name)).size === 3 ? run : null;
};
const ACCOUNT_NAMES = /\b(author_id|author_username|author)\b/g;
const idThenName = (tokens, k) => {
  const run = tokens.slice(k, k + 2);
  return run.length === 2 && run.some(t => t.name === 'author') && run.some(t => t.name !== 'author') ? run : null;
};
// A name with its subscripts and calls (p.author.strip().lower(), row['platform']) or a bracketed default ((p.platform or '')).
// One character or one bracket per step, so the pattern cannot backtrack without end.
const OPERAND = String.raw`(?:[\w.]|\[[^\]\n]{0,40}\]|\([^()\n]{0,60}\)){1,120}(?:\s+(?:or|\|\||\?\?)\s+(?:'[^'\n]*'|"[^"\n]*"|[\w.]+))?`;
const PAIRS = [
  new RegExp(String.raw`(?<![\w\])}'"])\(\s*(${OPERAND})\s*,\s*(${OPERAND})\s*,?\s*\)(?!\s*=>)`, 'g'),   // (platform, author)
  new RegExp(String.raw`\[\s*(${OPERAND})\s*,\s*(${OPERAND})\s*\]\s*\.join\(`, 'g'),                      // [platform, author].join
];
const isPlatform = text => /\bplatform\b/.test(text), isAuthor = text => /\bauthor\b/.test(text);
// A key is written without spaces round its separator; "author | platform" with spaces is a line of text.
const placed = (open, first, second) => new RegExp(String.raw`${open}[^{}\n]*\b${first}\b[^{}\n]*\}[|:]${open}[^{}\n]*\b${second}\b[^{}\n]*\}`, 'g');
const STRING_KEYS = {
  js: [placed(String.raw`\$\{`, 'platform', 'author'), placed(String.raw`\$\{`, 'author', 'platform')],   // `${platform}|${author}`
  py: [placed(String.raw`\{`, 'platform', 'author'), placed(String.raw`\{`, 'author', 'platform')],       // f'{platform}:{author}'
  both: [
    /\bplatform\b[^\n;,]{0,40}?\+\s*(['"])[|:]\1\s*\+[^\n;,]{0,60}?\bauthor\b/g,                         // platform + '|' + author
    /\bauthor\b[^\n;,]{0,40}?\+\s*(['"])[|:]\1\s*\+[^\n;,]{0,60}?\bplatform\b/g,
  ],
};
const TRIPLE = /[[(]\s*(['"])(likes|comments|shares)\1\s*,\s*(['"])(likes|comments|shares)\3\s*,\s*(['"])(likes|comments|shares)\5\s*,?\s*[\])]/g;

const CHECKS = [
  { kind: 'zone', what: 'zone shift by hand', view: 'keys', find: text => [
    /\b\w*delta\([^)\n]*\b(?:hours\s*=\s*\+?7|minutes\s*=\s*\+?420|seconds\s*=\s*\+?25200)\b/g,
    /(?<!\*\s*)\b7\s*\*\s*(?:3600(?:000)?|36e5|60\s*\*\s*60|[A-Z_]*HOURS?(?:_MS)?)\b(?!\s*\*\s*24\b)/g,
    /(?<!\*\s*)\b(?:3600(?:000)?|36e5|60\s*\*\s*60|[A-Z_]*HOURS?(?:_MS)?)\s*\*\s*7\b(?!\s*\*)/g,
    /\b420\s*\*\s*60\b/g, /\b25200(?:000)?\b/g,
    /(?:\bget(?:UTC)?Hours\(\)|\.hour\b)\s*\+\s*7\b/g,
  ].flatMap(pattern => [...text.matchAll(pattern)].map(m => m.index)) },
  { kind: 'zone', what: 'zone written into a string', view: 'code', find: text => [
    /[+]07:?00\b/g, /Asia\/Jakarta/g, /\b(?:UTC|GMT)\s*\+\s*0?7\b/g,
  ].flatMap(pattern => [...text.matchAll(pattern)].map(m => m.index)) },
  { kind: 'interactions', what: 'likes + comments + shares by hand', view: 'keys', find: text => [
    ...chains(text, SUM_NAMES, threeKinds, '+'),
    ...[...text.matchAll(TRIPLE)].filter(m => new Set([m[2], m[4], m[6]]).size === 3).filter(m => {
      const from = text.lastIndexOf('\n', text.lastIndexOf('\n', m.index - 1) - 1) + 1;
      const next = text.indexOf('\n', text.indexOf('\n', m.index + m[0].length) + 1);
      return /\bsum\(|\.reduce\(|\+=/.test(text.slice(from, next < 0 ? text.length : next));
    }).map(m => m.index),
  ] },
  { kind: 'account', what: 'account key by hand', view: 'keys', find: (text, language) => [
    ...chains(text, ACCOUNT_NAMES, idThenName, 'or'),
    ...PAIRS.flatMap(pattern => [...text.matchAll(pattern)]
      .filter(m => (isPlatform(m[1]) && isAuthor(m[2])) || (isAuthor(m[1]) && isPlatform(m[2]))).map(m => m.index)),
    ...[...STRING_KEYS[language], ...STRING_KEYS.both].flatMap(pattern => [...text.matchAll(pattern)].map(m => m.index)),
  ] },
];

function findings(path, source) {
  const language = path.endsWith('.py') ? 'py' : 'js';
  const views = language === 'py' ? readPy(source) : readJs(source);
  const lineOf = at => views.code.slice(0, at).split('\n').length;
  const seen = new Map();
  for (const check of CHECKS) {
    for (const at of check.find(views[check.view], language)) {
      const line = lineOf(at), key = `${path}:${line} ${check.kind}`;
      if (!seen.has(key)) seen.set(key, { path, line, kind: check.kind, what: check.what, text: source.split('\n')[line - 1].trim().slice(0, 120) });
    }
  }
  return [...seen.values()].sort((a, b) => a.line - b.line);
}

// ---- the files ---------------------------------------------------------------------------------------------------
const SERVER = /\.py$/, BROWSER = /\.(jsx?|mjs|tsx?)$/, NOT_SHIPPED = /\.test\.|[\\/]test-support[\\/]|[\\/]__pycache__[\\/]/;
function files(folder, wanted) {
  return readdirSync(join(ROOT, folder)).flatMap(name => {
    const path = `${folder}/${name}`;
    if (statSync(join(ROOT, path)).isDirectory()) return name === '__pycache__' || name === 'node_modules' ? [] : files(path, wanted);
    return wanted.test(name) && !NOT_SHIPPED.test(path) ? [path] : [];
  });
}
const scanned = () => [...files('server/app', SERVER), ...files('src', BROWSER)].filter(path => !MODULES.has(path));
const describe = row => `${row.path}:${row.line} ${row.what}: ${row.text}`;

test('no file outside the two measure modules writes a zone shift, an interaction sum or an account key by hand', () => {
  const found = scanned().flatMap(path => findings(path, readFileSync(join(ROOT, path), 'utf8')))
    .filter(row => !EXEMPT[row.path]?.kinds.includes(row.kind));
  assert.deepEqual(found.map(describe), []);
});

test('every exemption still holds what it is exempt for, so the list only shrinks', () => {
  const stale = Object.entries(EXEMPT).flatMap(([path, entry]) => {
    assert.ok(entry.note, `${path} has no note`);
    if (!existsSync(join(ROOT, path))) return [`${path}: file gone`];
    const kinds = new Set(findings(path, readFileSync(join(ROOT, path), 'utf8')).map(row => row.kind));
    return entry.kinds.filter(kind => !kinds.has(kind)).map(kind => `${path}: no ${kind} pattern left, remove the exemption`);
  });
  assert.deepEqual(stale, []);
});

test('the guard catches code and lets descriptions pass', () => {
  const kinds = (path, source) => findings(path, source).map(row => row.kind);
  // Python: caught
  assert.deepEqual(kinds('a.py', 'day = (published_at + timedelta(hours=7)).date()\n'), ['zone']);
  assert.deepEqual(kinds('a.py', "start = f'{day}T00:00:00+07:00'\n"), ['zone']);
  assert.deepEqual(kinds('a.py', "total = (m.get('likes') or 0) + (m.get('comments') or 0) + (m.get('shares') or 0)\n"), ['interactions']);
  assert.deepEqual(kinds('a.py', "total = sum(m.get(k) or 0 for k in ('likes', 'comments', 'shares'))\n"), ['interactions']);
  assert.deepEqual(kinds('a.py', "key = metrics.get('author_id') or item.author\n"), ['account']);
  assert.deepEqual(kinds('a.py', 'seen = {(p.platform, p.author) for p in posts}\n'), ['account']);
  assert.deepEqual(kinds('a.py', "by[(item.author, item.platform or 'unknown')].append(item)\n"), ['account']);
  assert.deepEqual(kinds('a.py', "key = f'{post.platform}|{post.author}'\n"), ['account']);
  assert.deepEqual(kinds('a.py', "authors = {((p.platform or ''), p.author.strip().lower()) for p in rows if p.author}\n"), ['account']);
  // JavaScript: caught
  assert.deepEqual(kinds('a.js', 'const local = new Date(ms + 7 * 3600000);\n'), ['zone']);
  assert.deepEqual(kinds('a.js', 'const local = ms + 7 * 60 * 60 * 1000;\n'), ['zone']);
  assert.deepEqual(kinds('a.js', "const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);\n"), ['zone']);
  assert.deepEqual(kinds('a.js', 'const sum = (m.likes || 0) + (m.comments || 0)\n  + (m.shares || 0);\n'), ['interactions']);
  assert.deepEqual(kinds('a.js', "const sum = ['likes', 'comments', 'shares'].reduce((s, k) => s + (m[k] || 0), 0);\n"), ['interactions']);
  assert.deepEqual(kinds('a.js', 'const key = `${p.platform}|${p.author}`;\n'), ['account']);
  assert.deepEqual(kinds('a.js', "const key = row.platform + ':' + row.author;\n"), ['account']);
  assert.deepEqual(kinds('a.js', 'const id = post.metrics?.author_id ?? post.author;\n'), ['account']);
  // descriptions, module calls and look-alikes: not caught
  const quiet = [
    ['a.py', '"""Never timedelta(hours=7): the zone is a setting (+07:00 for WIB). Interactions are likes + comments + shares."""\n'],
    ['a.py', 'def f():\n    """Accounts are not (platform, author) pairs, nor author_id or author."""\n    return 1\n'],
    ['a.py', "# total = likes + comments + shares; day = ts + timedelta(hours=7)\nx = 1\n"],
    ['a.py', "SYSTEM = ('Interaksi = likes + comments + shares, '\n          'akun = author_id or author.')\n"],
    ['a.py', 'key = account_key(item.platform, item.author, item.metrics)\n'],
    ['a.py', "row = {'likes': a + b, 'comments': c + d, 'shares': e}\n"],
    ['a.py', "if any(k in refreshed for k in ('likes', 'comments', 'shares')):\n    pass\n"],
    ['a.py', "shims.append({'platform': source.get('platform'), 'author': source.get('author')})\n"],
    ['a.py', 'week = timedelta(days=7)\nhour = 3600\n'],
    ['a.js', '// day = ms + 7 * 3600000; key = `${platform}|${author}`\nconst x = 1;\n'],
    ['a.js', '/** interactions_v1: likes + comments + shares that were reported. */\nexport const y = 2;\n'],
    ['a.js', "const label = 'Interaksi = likes + comments + shares';\n"],
    ['a.js', 'const keyOf = (platform, author) => accountKey({ platform, author });\n'],
    ['a.js', "const parts = [['likes', 'Suka'], ['comments', 'Komentar'], ['shares', 'Bagikan']];\n"],
    ['a.js', "const known = !['likes', 'comments', 'shares'].some(key => m[key] != null);\n"],
    ['a.js', 'const name = `${row.author} · ${platformLabel(row.platform)}`;\n'],
    ['a.js', 'const week = 7 * 24 * 3600000; const url = `https://x.com/${a}`; const r = /[\'"]/;\n'],
    ['a.js', "const ids = { id: m.author_id || '', name: p.author || '' };\n"],
    ['a.py', `lines.append(f"- {post['author'] or 'tanpa nama'} | {post['platform']}")\n`],
    ['a.js', 'return link(a.key ? {account: a.key, platform: a.platform}:{author: a.author, platform: a.platform});\n'],
  ];
  for (const [path, source] of quiet) assert.deepEqual(kinds(path, source), [], source);
});

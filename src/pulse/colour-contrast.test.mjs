// Colour that can be seen in both themes. Two guards:
// 1. The tokens: every pair that carries text keeps 4.5:1, every mark that carries meaning keeps 3:1 in the dark theme.
// 2. The use: the *-ink colours belong to pastel fills, which stay light in the dark theme. Used as text, an icon or an
//    outline straight on a panel they are dark on dark (about 1.1:1). A rule may use them only where it sets the pastel
//    fill itself, or inside a part that is known to sit on one.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const text = path => readFileSync(new URL(path, root), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const screen = css => css.replace(/@media print\s*\{(?:[^{}]|\{[^{}]*\})*\}/g, '');      // print resets the tokens to paper

const tokenSheets = ['src/pulse/pulse-tokens.css', 'src/pulse/ds/analytics-kit.css'].map(path => screen(text(path)));
function tokens(pattern) {
  const found = {};
  for (const css of tokenSheets) for (const [, body] of css.matchAll(pattern)) for (const [, name, value] of body.matchAll(/(--ps-[a-z0-9-]+)\s*:\s*([^;]+);/g)) found[name] = value.trim();
  return found;
}
const light = tokens(/\.pulse-standalone\s*\{([^}]*)\}/g);
const dark = { ...light, ...tokens(/\.pulse-standalone\[data-theme=dark\]\s*\{([^}]*)\}/g) };
function value(theme, name, depth = 0) {
  const raw = theme['--ps-' + name], reference = raw?.match(/^var\(--ps-([a-z0-9-]+)\)$/);
  return reference && depth < 6 ? value(theme, reference[1], depth + 1) : raw;
}
/** Relative luminance of an `oklch(L% C H)` colour (OKLab to linear sRGB, clipped to the screen's range). */
function luminance(colour) {
  const parts = colour?.match(/^oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)$/);
  assert.ok(parts, `not an oklch colour: ${colour}`);
  const L = parts[1] / 100, a = parts[2] * Math.cos(parts[3] * Math.PI / 180), b = parts[2] * Math.sin(parts[3] * Math.PI / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const [r, g, bl] = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s]
    .map(channel => Math.min(1, Math.max(0, channel)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}
function contrast(theme, pair) {
  const [front, back] = pair.split('/').map(name => luminance(value(theme, name)));
  return (Math.max(front, back) + 0.05) / (Math.min(front, back) + 0.05);
}

const TEXT = ['ink/panel', 'ink/bg', 'ink/soft', 'muted/panel', 'muted/bg', 'muted/soft', 'accent/panel', 'accent/bg', 'accent/soft',
  'success-text/panel', 'success-text/soft', 'warning-text/panel', 'warning-text/soft', 'danger-ink/panel', 'info-ink/panel',
  // ink on its own fill
  'accent-ink/lavender', 'success-ink/mint', 'warning-ink/peach', 'danger-ink/danger', 'info-ink/info', 'mark-ink/mark-bg',
  'sent-positive-ink/sent-positive-soft', 'sent-negative-ink/sent-negative-soft', 'sent-neutral-ink/sent-neutral-soft'];
const MARKS = ['control-line/panel', 'control-line/bg', 'mark-bg/panel', 'sent-positive/panel', 'sent-negative/panel', 'sent-neutral/panel',
  'chart-1/panel', 'chart-2/panel', 'chart-3/panel', 'chart-4/panel', 'chart-5/panel', 'chart-6/panel',
  'plat-instagram/panel', 'plat-tiktok/panel', 'plat-x/panel', 'plat-youtube/panel', 'plat-facebook/panel', 'plat-threads/panel', 'plat-news/panel', 'plat-web/panel', 'plat-reddit/panel'];

test('every colour that carries text keeps 4.5:1 against its background, in both themes', () => {
  for (const [name, theme] of [['terang', light], ['gelap', dark]]) for (const pair of TEXT) {
    const ratio = contrast(theme, pair);
    assert.ok(ratio >= 4.5, `${pair} is ${ratio.toFixed(2)}:1 in tema ${name}`);
  }
});

test('in the dark theme every mark that carries meaning keeps 3:1 against a panel', () => {
  for (const pair of MARKS) {
    const ratio = contrast(dark, pair);
    assert.ok(ratio >= 3, `${pair} is ${ratio.toFixed(2)}:1 in tema gelap`);
  }
});

// In the light theme a mark is drawn on the panel, on the page, on the soft surface (bar tracks, table heads) and, for a
// sentiment dot inside its tag, on that sentiment's own soft fill. The light data colours had been chosen against white only.
const LIGHT_MARKS = ['control-line', 'sent-positive', 'sent-negative', 'sent-neutral', 'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5', 'chart-6',
  'plat-instagram', 'plat-tiktok', 'plat-x', 'plat-youtube', 'plat-facebook', 'plat-threads', 'plat-news', 'plat-web', 'plat-reddit'];
test('in the light theme every mark keeps 3:1 on the panel, the page and the soft surface, and a sentiment dot on its own soft fill', () => {
  const short = [];
  for (const mark of LIGHT_MARKS) for (const surface of ['panel', 'bg', 'soft', ...(mark.startsWith('sent-') ? [mark + '-soft'] : [])]) {
    const ratio = contrast(light, `${mark}/${surface}`);
    if (ratio < 3) short.push(`${mark}/${surface} ${ratio.toFixed(2)}`);
  }
  assert.deepEqual(short, []);
});

test('print and the report paper use the same light mark colours as the screen', () => {
  const kit = text('src/pulse/ds/analytics-kit.css'), paper = text('src/pulse/ds/report-pages.css');
  const print = kit.match(/@media print\s*\{\s*\.pulse-standalone\.pulse-standalone, \.pulse-standalone\[data-theme=dark\]\s*\{([^}]*)\}/)[1];
  const declared = (css, name) => css.match(new RegExp(`--ps-${name}:\\s*([^;]+);`))?.[1].trim();
  for (const name of ['control-line', 'sent-positive', 'sent-negative', 'sent-neutral', 'chart-2', 'chart-3', 'chart-6', 'plat-web']) {
    assert.equal(declared(print, name), value(light, name), `print: --ps-${name}`);
    if (declared(paper, name) !== undefined) assert.equal(declared(paper, name), value(light, name), `report paper: --ps-${name}`);
  }
});

test('the pastel inks are what they are named for: readable on their pastel, unreadable on a dark panel', () => {
  for (const ink of ['accent-ink', 'success-ink', 'warning-ink']) assert.ok(contrast(dark, ink + '/panel') < 1.5, `${ink} on a dark panel`);
  // Which is why text on a surface has its own colours, and they differ between the themes.
  for (const name of ['success-text', 'warning-text', 'mark-bg', 'mark-ink']) assert.notEqual(value(dark, name), value(light, name), `--ps-${name} follows the theme`);
});

test('words in the hashtag cloud are text: a series colour leaning on the ink, 4.5:1 on a panel in both themes', () => {
  const source = readFileSync(new URL('src/pulse/OverviewInsights.jsx', root), 'utf8');
  const share = Number(source.match(/const tones = .*color-mix\(in oklab, var\(--ps-chart-\$\{n\}\) (\d+)%, var\(--ps-ink\)\)/)?.[1]);
  assert.ok(share > 0 && share < 100, 'the cloud mixes each series colour with the ink');
  const oklab = colour => { const [, L, C, H] = colour.match(/^oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)$/).map(Number); return [L / 100, C * Math.cos(H * Math.PI / 180), C * Math.sin(H * Math.PI / 180)]; };
  const toOklch = ([L, a, b]) => `oklch(${L * 100}% ${Math.hypot(a, b)} ${(Math.atan2(b, a) * 180 / Math.PI + 360) % 360})`;
  for (const [name, theme] of [['terang', light], ['gelap', dark]]) for (let n = 1; n <= 6; n++) {
    const series = oklab(value(theme, 'chart-' + n)), ink = oklab(value(theme, 'ink'));
    const word = luminance(toOklch(series.map((part, i) => part * share / 100 + ink[i] * (1 - share / 100)))), panel = luminance(value(theme, 'panel'));
    const ratio = (Math.max(word, panel) + 0.05) / (Math.min(word, panel) + 0.05);
    assert.ok(ratio >= 4.5, `series ${n} is ${ratio.toFixed(2)}:1 in tema ${name}`);
  }
});

// ── Where the pastel inks are used ──────────────────────────────────────────────────────────────────────────────────
const INK = /var\(--ps-(?:accent|success|warning)-ink\b/;
const PASTEL = /(?:^|;|\s)(?:background(?:-color)?|--tag-bg)\s*:[^;]*(?:var\(--ps-(?:lavender|mint|peach|selected)\)|oklch\(\s*(?:8[4-9]|9\d)%)/;
// Parts that sit on a pastel fill set by another rule: the AI summary card, a pressed toggle, the current sidebar row,
// a filtered scope switch, the primary button, the emotion faces (emoji, drawn by the system).
const ON_PASTEL = [/\.ais-/, /\[aria-pressed=true\]/, /\[aria-current\]/, /\.ps-scope-toggle\[data-filtered\]/, /\.pu-button-primary/, /\.pea-face/, /\.pulse-signal-mark/];
function inkOnASurface(css) {
  const found = [];
  for (const [, selector, body] of screen(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const uses = [...body.matchAll(/(?:^|;)\s*(color|fill|stroke|outline(?:-color)?|border(?:-[a-z]+)*-color|background(?:-color)?|--tag-ink|--tag-mark|--tag-line)\s*:\s*([^;]+)/g)]
      .filter(([, , declared]) => INK.test(declared));
    if (!uses.length || /^\s*--ps-/.test(body) && !/[^-]color\s*:/.test(body)) continue;
    const fill = uses.some(([, property]) => property.startsWith('background'));
    if (ON_PASTEL.some(rule => rule.test(selector)) || (!fill && PASTEL.test(body))) continue;
    found.push(selector.trim().replace(/\s+/g, ' ').slice(0, 90) + ' { ' + uses.map(([, property]) => property).join(', ') + ' }');
  }
  return found;
}
const sheets = [...['src/pulse/', 'src/pulse/ds/', 'src/components/admin/pulse/', 'src/components/ui/'].flatMap(folder =>
  readdirSync(new URL(folder, root)).filter(file => file.endsWith('.css')).map(file => folder + file))];

test('the detector catches the rules that were dark on dark before they were fixed', () => {
  assert.deepEqual(inkOnASurface('.po-signal-action { font-weight: 600; color: var(--ps-accent-ink, var(--ps-accent)); }'), ['.po-signal-action { color }']);
  assert.deepEqual(inkOnASurface('.pm-sentiment-dot.positive { background:var(--ps-success-ink); }'), ['.pm-sentiment-dot.positive { background }']);
  assert.deepEqual(inkOnASurface('.pf-drawer .pf-link:focus-visible { outline:2px solid var(--ps-accent-ink); }'), ['.pf-drawer .pf-link:focus-visible { outline }']);
  assert.deepEqual(inkOnASurface('.pu-badge-accent { background: var(--ps-lavender); color: var(--ps-accent-ink); }'), [], 'ink on its own pastel is the intended use');
  assert.deepEqual(inkOnASurface('.pu-tag[data-tone=accent] { --tag-bg: var(--ps-lavender); --tag-ink: var(--ps-accent-ink); --tag-mark: var(--ps-accent-ink); }'), []);
});

test('no rule paints a pastel ink straight on a panel', () => {
  const found = sheets.flatMap(path => inkOnASurface(text(path)).map(rule => `${path}: ${rule}`));
  assert.deepEqual(found, [], 'use --ps-accent, --ps-success-text, --ps-warning-text or the --ps-mark pair on a surface');
});

test('an unpressed toggle has no fill, so its icon does not keep a pastel tone\'s ink', () => {
  const kit = text('src/pulse/ds/analytics-kit.css');
  assert.match(kit, /button\.pu-tag\[aria-pressed=false\]:is\(\[data-tone=accent\], \[data-tone=success\], \[data-tone=warning\]\) \{ --tag-mark: var\(--ps-muted\); \}/);
  assert.match(kit, /\.pulse-standalone :is\(input, textarea\)::placeholder \{ color: var\(--ps-muted\); opacity: 1; \}/, 'placeholders follow the theme');
});

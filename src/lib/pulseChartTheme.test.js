import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { platformColor, platformHues, platformInkMix } from './pulseChartTheme.js';

// OKLCH [L %, C, H] to OKLab, and OKLab to linear sRGB (Björn Ottosson's matrices).
const lab = ([l, c, h]) => [l / 100, c * Math.cos(h * Math.PI / 180), c * Math.sin(h * Math.PI / 180)];
function linear([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
}
const mix = (a, b, share) => a.map((value, i) => value * share / 100 + b[i] * (1 - share / 100));
const luminance = colour => { const [r, g, b] = linear(colour).map(v => Math.max(0, Math.min(1, v))); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
const distance = (a, b) => 100 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// The theme tokens the palette is mixed with, read from the stylesheet so this follows a token change.
const css = readFileSync(new URL('../pulse/pulse-tokens.css', import.meta.url), 'utf8');
const token = name => [...css.matchAll(new RegExp(`--ps-${name}:\\s*oklch\\(([\\d.]+)%\\s+([\\d.]+)\\s+([\\d.]+)\\)`, 'g'))].map(m => lab(m.slice(1, 4).map(Number)));
const themes = ['light', 'dark'].map((name, i) => ({ name, ink: token('ink')[i], bg: token('bg')[i], panel: token('panel')[i] }));
const palette = theme => ({
  x: mix(theme.ink, theme.bg, platformInkMix.x),
  ...Object.fromEntries(Object.entries(platformHues).map(([platform, hue]) => [platform, mix(lab(hue), theme.ink, platformInkMix.hue)])),
});

test('every platform has its own colour and an unknown platform falls back to the muted token', () => {
  const names = ['x', ...Object.keys(platformHues)];
  assert.deepEqual([...names].sort(), ['facebook', 'instagram', 'news', 'reddit', 'threads', 'tiktok', 'web', 'x', 'youtube']);
  assert.equal(new Set(names.map(platformColor)).size, names.length);
  // Every colour leans on the theme ink, which is what makes it follow light, dark and print.
  for (const name of names) assert.match(platformColor(name), /^color-mix\(in oklab, .*var\(--ps-ink/);
  assert.equal(platformColor('lainnya'), 'var(--ps-muted)');
  assert.equal(platformColor(undefined), 'var(--ps-muted)');
});

test('in the light theme a platform mark also keeps 3:1 on the page and on the soft surface it is often drawn on', () => {
  // Bar tracks, table heads and tags are soft or page coloured, not panel coloured. Dark surfaces are darker than the dark panel or close to it.
  const [soft, bg] = [token('soft')[0], token('bg')[0]];
  const short = Object.entries(palette(themes[0])).flatMap(([name, colour]) => [['soft', soft], ['bg', bg]]
    .filter(([, surface]) => contrast(colour, surface) < 3).map(([surface, value]) => `${name} on ${surface} ${contrast(colour, value).toFixed(2)}`));
  assert.deepEqual(short, []);
});

test('platform colours stay apart and readable in the light and the dark theme', () => {
  assert.equal(themes.length, 2);
  for (const theme of themes) {
    const colours = Object.entries(palette(theme));
    for (const [name, colour] of colours) {
      // A ring or a dot is a graphic mark: 3:1 against the panel it is drawn on.
      assert.ok(contrast(colour, theme.panel) >= 3, `${theme.name} ${name} contrast ${contrast(colour, theme.panel).toFixed(2)}`);
      assert.ok(linear(colour).every(v => v > -0.002 && v < 1.002), `${theme.name} ${name} is outside sRGB`);
    }
    // 15 in OKLab x 100 is the distance below which two small marks start to look alike.
    for (let i = 0; i < colours.length; i++) for (let j = i + 1; j < colours.length; j++) {
      const gap = distance(colours[i][1], colours[j][1]);
      assert.ok(gap >= 15, `${theme.name} ${colours[i][0]} and ${colours[j][0]} are ${gap.toFixed(1)} apart`);
    }
  }
});

// Guards the standalone PULSE web server config. nginx drops every inherited add_header as soon as a
// location declares one of its own, so a single stray line can remove the security headers from the
// page it serves without any error. These tests keep the header list in one place.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const conf = readFileSync(new URL('../../deploy/pulse/nginx.conf', import.meta.url), 'utf8').replace(/#.*$/gm, '');

/** The body of every `location … { … }` block, keyed by its matcher (for example `= /pulse`). */
function locations(text) {
  const found = {};
  for (const match of text.matchAll(/location\s+([^{]+?)\s*\{/g)) {
    const start = match.index + match[0].length;
    let depth = 1, at = start;
    while (depth && at < text.length) { if (text[at] === '{') depth++; else if (text[at] === '}') depth--; at++; }
    found[match[1]] = text.slice(start, at - 1);
  }
  return found;
}
const blocks = locations(conf);
const outside = Object.values(blocks).reduce((text, body) => text.replace(body, ''), conf);

test('security headers are declared once for the whole server, on every status', () => {
  assert.match(outside, /add_header\s+X-Frame-Options\s+DENY\s+always;/);
  assert.match(outside, /add_header\s+X-Content-Type-Options\s+nosniff\s+always;/);
  assert.match(outside, /add_header\s+Referrer-Policy\s+same-origin\s+always;/);
});

test('no location declares its own add_header, which would drop the inherited security headers', () => {
  for (const [name, body] of Object.entries(blocks)) assert.doesNotMatch(body, /add_header/, `location ${name} must not add headers; add them at server level`);
});

test('the app shell is served from every page route and is never cached', () => {
  assert.match(conf, /map\s+\$uri\s+\$pulse_shell_cache\s*\{[^}]*\/index\.html\s+"no-store";[^}]*\}/);
  assert.match(outside, /add_header\s+Cache-Control\s+\$pulse_shell_cache;/);
  assert.match(blocks['= /pulse'], /try_files\s+\/index\.html\s+=404;/);
  assert.match(blocks['/pulse/'], /try_files\s+\$uri\s+\/index\.html;/);
  assert.ok('= /index.html' in blocks, 'the shell needs its own location, or the fallback lands on the 404 catch-all');
  assert.match(blocks['/'], /return\s+404;/);
});

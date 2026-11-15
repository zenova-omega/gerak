import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('a playable post says "Putar video", and the button is named with the words it shows', () => {
  // The owner, 15 Nov 2026: "buka pemutar --> play video".
  const source = readFileSync(new URL('../components/admin/pulse/PostMediaPreview.jsx', import.meta.url), 'utf8');
  assert.match(source, /<Play size=\{16\} aria-hidden="true"\/>Putar video<\/span>/);
  assert.doesNotMatch(source, /Buka pemutar/);
  assert.match(source, /aria-label=\{\(playable\?'Putar video dari ':/, 'the name starts with the visible label (WCAG 2.5.3)');
});

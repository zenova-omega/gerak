import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { icons, pageTitle, siteDescription, themeColor } from './siteMeta.js';

const root = new URL('../../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const count = pattern => (html.match(pattern) || []).length;

test('tab titles name the page first and fall back to the product line', () => {
  assert.equal(pageTitle('Sentimen'), 'Sentimen · PULSE');
  assert.equal(pageTitle('Masuk'), 'Masuk · PULSE');
  assert.equal(pageTitle(), 'PULSE · Social Media Listening');
  assert.equal(pageTitle(null), 'PULSE · Social Media Listening');
});

test('the description is one plain sentence a link preview can show', () => {
  assert.ok(siteDescription.length >= 50 && siteDescription.length <= 160, String(siteDescription.length));
  assert.doesNotMatch(siteDescription, /[<>"*_`]|\n/);
  assert.match(themeColor.light, /^#[0-9a-f]{6}$/);
  assert.match(themeColor.dark, /^#[0-9a-f]{6}$/);
});

test('every icon the head points to exists, under the only public path the standalone server answers', () => {
  for (const path of Object.values(icons)) {
    assert.ok(path.startsWith('/pulse/'), path);
    assert.ok(existsSync(new URL('public' + path, root)), path);
  }
});

test('the shared shell declares each head tag once, in Indonesian, and stays out of search results', () => {
  assert.match(html, /<html lang="id">/);
  assert.equal(count(/<title>/g), 1);
  assert.equal(count(/<meta name="description"/g), 1);
  assert.equal(count(/<meta name="robots"/g), 1);
  assert.match(html, /<meta name="robots" content="noindex, nofollow" \/>/);
  assert.equal(count(/rel="canonical"/g), 0);   // an app shell behind a sign-in has no preferred public address
});

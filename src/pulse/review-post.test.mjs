import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Link, MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

test('the relevance button on the card marks and unmarks a post without opening it; the review under the details keeps the full choice and the gold label; failed writes do not announce success', async () => {
  // The card shows the toggle in its header and the review under its details, both on one saved review, as PostCard does.
  const bundle = await build({stdin:{contents:`import React from 'react'; import {createRoot} from 'react-dom/client'; import ReviewPost, {RelevanceToggle} from './src/components/admin/pulse/ReviewPost.jsx'; function App(){const [review,setReview]=React.useState(null); return <><RelevanceToggle postId="one" topicId="a" review={review} onSaved={setReview}/><ReviewPost postId="one" topicId="a" review={review} onSaved={setReview}/></>;} createRoot(document.getElementById('root')).render(<App/>);`,resolveDir:process.cwd(),loader:'jsx'}, bundle:true,write:false,format:'iife',define:{'import.meta.env':'{}','process.env.NODE_ENV':'"production"'}});
  const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  try {
    const page = await browser.newPage();
    let saved = {post_id:'one', topic_id:'a', relevance:'relevant', manual_sentiment:null, review_needed:false, analyst_note:null};
    let fail = false;
    await page.route('http://localhost:8000/api/**', async route => {
      assert.equal(route.request().method(), 'PUT');
      assert.equal(new URL(route.request().url()).searchParams.get('topic_id'), 'a');
      if (fail) return route.fulfill({status:500, contentType:'application/json',body:JSON.stringify({detail:'Save failed'})});
      saved = {...saved,...route.request().postDataJSON()};
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(saved)});
    });
    await page.route('http://localhost:8000/', route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
    await page.goto('http://localhost:8000/');
    await page.evaluate(() => {window.events=[]; window.addEventListener('pulse-reviews-changed', e=>window.events.push(e.detail));});
    await page.addScriptTag({content:bundle.outputFiles[0].text});
    // Start from "Relevan", so the undo has a state other than the default to go back to.
    await page.getByLabel('Relevansi').selectOption('relevant');
    await page.getByRole('status').filter({hasText:'Review tersimpan'}).waitFor();
    const toggle = page.getByRole('button',{name:'Tidak relevan',exact:true});
    assert.equal(await toggle.getAttribute('aria-pressed'),'false');
    assert.match(await toggle.getAttribute('title'), /Tandai tidak relevan/);
    await toggle.click();
    await page.waitForFunction(() => document.querySelector('button[aria-pressed]')?.getAttribute('aria-pressed') === 'true');
    assert.equal(saved.relevance,'irrelevant');
    assert.match(await toggle.getAttribute('title'), /Klik untuk mengurungkan/);
    await toggle.click();
    await page.waitForFunction(() => document.querySelector('button[aria-pressed]')?.getAttribute('aria-pressed') === 'false');
    assert.equal(saved.relevance,'relevant','undo goes back to what it was before');
    await page.getByText('Review sentimen manual',{exact:true}).click();
    await page.getByLabel('Label manual').selectOption('negative');
    await page.getByLabel('Perlu ditinjau lagi').check();
    await page.getByLabel('Catatan analis').fill('Context matters');
    await page.getByRole('button',{name:'Simpan review',exact:true}).click();
    await page.waitForFunction(() => window.events.length === 4);
    assert.equal(saved.manual_sentiment,'negative');
    assert.equal(saved.review_needed,true);
    assert.equal(saved.analyst_note,'Context matters');
    fail=true;
    await toggle.click();
    await page.getByRole('alert').first().waitFor();
    assert.equal(await page.evaluate(()=>window.events.length),4, 'a failed write announces nothing');
    assert.equal(await toggle.getAttribute('aria-pressed'),'false');
  } finally {await browser.close();}
});

test('on the Posting card the relevance button sits in the header beside Tanya AI, and an irrelevant post says so in words', () => {
  const card = readFileSync(new URL('../components/admin/pulse/PostFeed.jsx', import.meta.url), 'utf8');
  assert.match(card, /<RelevanceToggle size=\{size\} postId=\{post\.id\} topicId=\{topicId\} review=\{review\} disabled=\{!reviewsReady\} onSaved=\{onReviewSaved\}\/>/);
  assert.match(card, /review\?\.relevance==='irrelevant'&&<PulseTag[^>]*>Tidak relevan<\/PulseTag>/);
  const css = readFileSync(new URL('./ds/analytics-kit.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /\.pulse-post\[data-open\] \{ grid-column: 1 \/ -1; \}/, 'an opened card stays in its column');
});

test('an opened card in a narrow column lays its interaction breakdown out by the card width, so nothing overlaps', () => {
  const css = readFileSync(new URL('./ds/analytics-kit.css', import.meta.url), 'utf8');
  assert.match(css, /\.pm-post-detail \{ container-type: inline-size; container-name: post-detail; \}/);
  assert.match(css, /@container post-detail \(max-width: 560px\) \{[\s\S]*?\.pu-eng-metrics \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);
});

test('the card actions are one component family at one size, so Tanya AI, the relevance button and the source link are equally tall', async () => {
  const card = readFileSync(new URL('../components/admin/pulse/PostFeed.jsx', import.meta.url), 'utf8');
  assert.match(card, /compact=\{layout==='grid'\}/, 'a grid tile is compact');
  assert.match(card, /const size = compact \? 'sm' : 'md';/);
  assert.match(card, /<PulseButtonLink className="pm-ask-ai" size=\{size\} iconOnly=\{compact\}><Link to=/);
  assert.match(card, /<RelevanceToggle size=\{size\} /);
  assert.match(card, /<PulseButtonLink size=\{size\} iconOnly href=\{media\.postUrl\}/);
  for (const file of ['../pulse/SentimentEvidenceCard.jsx', '../pulse/EvidencePosts.jsx'].map(path => new URL(path, new URL('../components/', import.meta.url))))
    assert.match(readFileSync(file, 'utf8'), /<PulseButtonLink [^>]*iconOnly href=/, `${file.pathname} uses the component too`);
  const kit = readFileSync(new URL('./ds/analytics-kit.css', import.meta.url), 'utf8');
  const patterns = readFileSync(new URL('../components/ui/pulse-patterns.css', import.meta.url), 'utf8');
  assert.doesNotMatch(kit, /pu-source-actions > a[^{]*\{[^}]*min-(?:height|width)/, 'no stylesheet sizes the card links from outside');
  assert.doesNotMatch(kit, /pm-(?:relevance|ask-ai)[^{]*\{[^}]*(?:min-(?:height|width)|padding)/);
  assert.match(patterns, /\.pu-source-actions>a:not\(\.pu-button\)\{/, 'only a plain link keeps the fallback size');
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { PulseButton, PulseButtonLink } = await server.ssrLoadModule('/src/components/ui/PulseUI.jsx');
    assert.doesNotMatch(readFileSync(new URL('../components/ui/PulseUI.jsx', import.meta.url), 'utf8'), /react-router/, 'the shared UI module stays free of the router');
    const html = element => renderToStaticMarkup(React.createElement(MemoryRouter, null, element));
    const button = html(React.createElement(PulseButton, { size: 'sm', iconOnly: true, 'aria-label': 'Tombol' }, 'x'));
    const route = html(React.createElement(PulseButtonLink, { size: 'sm', iconOnly: true }, React.createElement(Link, { to: '/pulse/chat', 'aria-label': 'Rute' }, 'x')));
    const away = html(React.createElement(PulseButtonLink, { size: 'sm', iconOnly: true, href: 'https://example.com', target: '_blank', 'aria-label': 'Sumber' }, 'x'));
    const classes = markup => markup.match(/class="([^"]*)"/)[1].split(' ').sort().join(' ');
    assert.match(button, /^<button /);
    assert.match(route, /^<a [^>]*href="\/pulse\/chat"/);
    assert.match(away, /^<a [^>]*href="https:\/\/example\.com"[^>]*target="_blank"/);
    for (const link of [route, away]) {
      assert.equal(classes(link), classes(button), 'the link wears exactly the button\'s classes');
      assert.match(link, /data-size="sm"/);
      assert.match(link, /data-icon-only=""/);
    }
  } finally { await server.close(); }
});

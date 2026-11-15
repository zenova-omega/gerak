import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {chromium} from 'playwright-core';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('evaluation renders honest empty, error, matrix and escaped evidence states', async t => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'pulse-evaluation-ssr-'));
  t.after(() => rm(cacheDir, {recursive:true,force:true}));
  const server = await createServer({cacheDir,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,ws:false,watch:null},appType:'custom'});
  try {
    const {SentimentEvaluationView} = await server.ssrLoadModule('/src/pulse/SentimentEvaluation.jsx');
    const render = props => renderToStaticMarkup(React.createElement(SentimentEvaluationView, props));
    assert.match(render({loading:true}), /role="status"/);
    const failed = render({error:true, onRetry:()=>{}});
    assert.match(failed, /role="alert"/);
    assert.match(failed, /Coba lagi/);
    assert.doesNotMatch(failed, /<table/);
    const empty = render({data:{reviewed_count:2,paired_count:0,matches:0,agreement:null,samples:[]}});
    assert.match(empty, /Belum ada pasangan/);
    assert.doesNotMatch(empty, /0%|100%|<table/);
    const html = render({data:{reviewed_count:3,paired_count:2,matches:1,agreement:0.5,
      confusion_matrix:{positive:{positive:1,neutral:0,negative:0},neutral:{positive:0,neutral:0,negative:0},negative:{positive:0,neutral:1,negative:0}},
      samples:[{post_id:'p1',text:'<script>unsafe</script>',machine_sentiment:'negative',manual_sentiment:'neutral'}],samples_truncated:false}});
    assert.match(html, /50%/);
    assert.match(html, /1 dari 2/);
    assert.match(html, /3 label manual/);
    assert.match(html, /scope="col"/);
    assert.match(html, /scope="row"/);
    assert.match(html, /aria-label="Tentang evaluasi"/);
    assert.match(html, /&lt;script&gt;/);
    assert.doesNotMatch(html, /<script>/);
    const zero = render({data:{reviewed_count:1,paired_count:1,matches:0,agreement:0,confusion_matrix:{},samples:[]}});
    assert.match(zero, /0%/);
  } finally { await server.close(); }
});

test('browser retries safely and ignores obsolete filtered responses', async t => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'pulse-evaluation-browser-'));
  t.after(() => rm(cacheDir, {recursive:true,force:true}));
  const harness = {
    name:'evaluation-test-harness',
    resolveId(id) { if (id === '/evaluation-harness.jsx') return id; },
    load(id) { if (id === '/evaluation-harness.jsx') return `
      import React from 'react';
      import {createRoot} from 'react-dom/client';
      import SentimentEvaluation from '/src/pulse/SentimentEvaluation.jsx';
      import '/src/pulse/pulse-tokens.css';
      const root = createRoot(document.getElementById('root'));
      window.showEvaluation = props => root.render(React.createElement(SentimentEvaluation, props));
      window.showEvaluation({topicId:'a',period:{from:'2026-11-13',to:'2026-11-13'},platforms:[]});
    `; },
  };
  const server = await createServer({cacheDir,configFile:false, plugins:[react(),harness],
    resolve:{alias:{'@':new URL('../',import.meta.url).pathname}},
    optimizeDeps:{noDiscovery:true,include:['react','react-dom/client','react/jsx-dev-runtime','@radix-ui/react-slot','class-variance-authority','clsx','tailwind-merge','lucide-react']},
    server:{host:'127.0.0.1',port:5189,hmr:false,ws:false,watch:null}, appType:'custom'});
  server.middlewares.use('/evaluation-fixture', async (_req, res) => {
    const html = await server.transformIndexHtml('/evaluation-fixture', '<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root" class="pulse-standalone"></div><p id="outside-meta" class="pse-meta">Other component</p><p id="outside-caption" class="pse-caption">Other caption</p><script type="module" src="/evaluation-harness.jsx"></script>');
    res.setHeader('Content-Type', 'text/html'); res.end(html);
  });
  await server.listen();
  const origin = server.resolvedUrls.local[0].replace(/\/$/, '');
  const browser = await chromium.launch({channel:'chrome',headless:true});
  const page = await browser.newPage({viewport:{width:390,height:844}});
  page.setDefaultTimeout(8000);
  const errors = [], calls = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && !response.url().includes('/api/')) errors.push(`${response.status()} ${response.url()}`); });
  page.on('requestfailed', request => errors.push(`${request.failure()?.errorText} ${request.url()}`));
  let attempts = 0, releaseOld;
  const result = (matches, count=2) => ({reviewed_count:count,paired_count:count,matches,agreement:matches/count,
    confusion_matrix:{positive:{positive:matches,neutral:count-matches,negative:0}},samples:[]});
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/admin/pulse/evaluation') {
      calls.push({method:route.request().method(),params:Object.fromEntries(url.searchParams)});
      if (url.searchParams.get('topic_id') === 'old') {
        await new Promise(resolve => { releaseOld = resolve; });
        return route.fulfill({json:result(2)});
      }
      if (++attempts === 1) return route.fulfill({status:503,json:{detail:'fixture offline'}});
      return route.fulfill({json:result(attempts >= 4 ? 0 : 1)});
    }
    if (url.origin === origin) return route.continue();
    errors.push('Blocked unexpected request: ' + url.pathname);
    return route.abort();
  });
  try {
    await page.goto(origin + '/evaluation-fixture');
    await page.getByRole('button', {name:'Coba lagi'}).click();
    await page.getByText('50% kesepakatan').waitFor();
    assert.deepEqual(calls[0], {method:'GET',params:{topic_id:'a',from_date:'2026-11-13',to_date:'2026-11-13',platforms:''}});
    assert.equal(calls.length, 2);
    await page.evaluate(() => window.showEvaluation({topicId:'old',period:{},platforms:null}));
    await page.getByRole('status').waitFor();
    await page.waitForFunction(() => document.querySelector('[aria-busy="true"]') !== null);
    // Wait until the intercepted old request is held, not a fixed timing delay.
    const deadline = Date.now() + 8000;
    while (!releaseOld && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
    assert.ok(releaseOld, 'old request must reach the fixture');
    assert.deepEqual(calls.at(-1).params, {topic_id:'old'});
    assert.equal(await page.getByText('50% kesepakatan').count(), 0);
    await page.evaluate(() => window.showEvaluation({topicId:'new',period:{},platforms:['news']}));
    await page.getByText('50% kesepakatan').waitFor();
    const completed = page.waitForResponse(response => response.url().includes('topic_id=old'));
    releaseOld(); await completed;
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await page.getByText('100% kesepakatan').count(), 0);
    assert.equal(await page.getByRole('table').count(), 1);
    assert.deepEqual(calls.at(-1).params, {topic_id:'new',platforms:'news'});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(await page.evaluate(() => ({
      captionWhiteSpace:getComputedStyle(document.getElementById('outside-caption')).whiteSpace,
      metaLineHeight:getComputedStyle(document.getElementById('outside-meta')).lineHeight,
    })), {captionWhiteSpace:'normal',metaLineHeight:'normal'}, 'evaluation styles must not leak into other cards');
    const refreshed = page.waitForRequest(request => request.url().includes('/evaluation?'), {timeout:1500});
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('pulse-reviews-changed', {detail:{topic_id:'new'}})));
    await refreshed;
    await page.getByText('0% kesepakatan', {exact:true}).waitFor();
    assert.deepEqual(errors, []);
  } catch (error) {
    throw new Error(`${error.message}\nBrowser diagnostics: ${JSON.stringify({errors,calls})}`, {cause:error});
  } finally { releaseOld?.(); await browser.close(); await server.close(); }
});

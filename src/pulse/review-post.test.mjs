import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';

test('inline review persists relevance, undo and optional gold label; failed writes do not announce success', async () => {
  const bundle = await build({stdin:{contents:`import React from 'react'; import {createRoot} from 'react-dom/client'; import ReviewPost from './src/components/admin/pulse/ReviewPost.jsx'; function App(){const [review,setReview]=React.useState(null); return <ReviewPost postId="one" topicId="a" review={review} onSaved={setReview}/>;} createRoot(document.getElementById('root')).render(<App/>);`,resolveDir:process.cwd(),loader:'jsx'}, bundle:true,write:false,format:'iife',define:{'import.meta.env':'{}','process.env.NODE_ENV':'"production"'}});
  const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  try {
    const page = await browser.newPage();
    let saved = {post_id:'one', topic_id:'a', relevance:'unreviewed', manual_sentiment:null, review_needed:false, analyst_note:null};
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
    await page.getByRole('button',{name:'Tidak relevan',exact:true}).click();
    await page.getByRole('button',{name:'Urungkan',exact:true}).waitFor();
    assert.equal(saved.relevance,'irrelevant');
    await page.getByRole('button',{name:'Urungkan',exact:true}).click();
    await page.getByRole('button',{name:'Tidak relevan',exact:true}).waitFor();
    assert.equal(saved.relevance,'unreviewed');
    await page.getByText('Review sentimen manual',{exact:true}).click();
    await page.getByLabel('Label manual').selectOption('negative');
    await page.getByLabel('Perlu ditinjau lagi').check();
    await page.getByLabel('Catatan analis').fill('Context matters');
    await page.getByRole('button',{name:'Simpan review',exact:true}).click();
    await page.getByRole('status').filter({hasText:'Review tersimpan'}).waitFor();
    assert.equal(saved.manual_sentiment,'negative');
    assert.equal(saved.review_needed,true);
    assert.equal(saved.analyst_note,'Context matters');
    assert.equal(await page.evaluate(()=>window.events.length),3);
    fail=true;
    await page.getByRole('button',{name:'Tidak relevan',exact:true}).click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.evaluate(()=>window.events.length),3);
    assert.equal(await page.getByRole('button',{name:'Tidak relevan',exact:true}).count(),1);
  } finally {await browser.close();}
});

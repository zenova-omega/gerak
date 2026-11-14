import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { existsSync } from 'node:fs';

test('shared buttons prevent accidental form submit and disable duplicate busy actions', async () => {
  assert.ok(existsSync('src/components/ui/PulseUI.jsx'), 'PULSE primitives missing');
  const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
  try {
    const {PulseButton,PulseMetric}=await server.ssrLoadModule('/src/components/ui/PulseUI.jsx');
    assert.match(renderToStaticMarkup(React.createElement(PulseMetric,{label:'Likes',value:0})),/<dd>0<\/dd>/);
    assert.match(renderToStaticMarkup(React.createElement(PulseMetric,{label:'Likes',value:null})),/aria-label="Tidak tersedia"/);
    const {default:Gallery}=await server.ssrLoadModule('/src/pulse/DesignSystemGallery.jsx');
    const gallery=renderToStaticMarkup(React.createElement(Gallery));
    assert.match(gallery,/bukan data monitoring/);
    assert.match(gallery,/PULSE design system/);
    assert.doesNotMatch(gallery,/<iframe|<video/);
    const html=renderToStaticMarkup(React.createElement(PulseButton,{busy:true,busyLabel:'Mengambil…'},'Kumpulkan'));
    assert.match(html,/type="button"/);
    assert.match(html,/disabled=""/);
    assert.match(html,/aria-busy="true"/);
    assert.match(html,/Mengambil…/);
    assert.match(renderToStaticMarkup(React.createElement(PulseButton,{type:'submit'},'Masuk')),/type="submit"/);
  } finally {await server.close();}
});

test('source disclosure keeps collection separate from expansion and distinguishes unknown fields',async()=>{
  assert.ok(existsSync('src/pulse/SourceDisclosure.jsx'), 'Progressive source detail missing');
  const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
  try {
    const {default:SourceDisclosure}=await server.ssrLoadModule('/src/pulse/SourceDisclosure.jsx');
    const source={platform:'instagram',provider:'xpoz',configured:true,tool_available:true,stored_posts:5,fields:{text:5,author:5,published_at:0,likes:5,comments:5,shares:0,views:4},last_attempt:{status:'succeeded',fetched:5,ingested:5},last_success_at:'2026-11-10T20:58:10Z'};
    const html=renderToStaticMarkup(React.createElement(SourceDisclosure,{source,budget:{used:1,daily_limit:4},topicId:'topic',readOnly:false,busy:false,onCollect:()=>{throw Error('Render must never crawl');}}));
    assert.match(html,/<details[^>]*>/);
    assert.doesNotMatch(html,/<details[^>]* open/);
    const summary=html.match(/<summary[\s\S]*?<\/summary>/)[0];
    assert.doesNotMatch(summary,/<button/);
    assert.match(summary,/Instagram/);
    assert.match(summary,/Berhasil/);
    assert.match(html,/4 \/ 5/);
    assert.match(html,/0 \/ 5/);
    assert.match(html,/Kumpulkan maks\. 300/);
    const blocked=renderToStaticMarkup(React.createElement(SourceDisclosure,{source,budget:{used:4,daily_limit:4},topicId:'topic',onCollect:()=>{}}));
    assert.match(blocked,/<button[^>]*disabled/);
    const queued=renderToStaticMarkup(React.createElement(SourceDisclosure,{source:{...source,last_attempt:{status:'queued'}},budget:{used:1,daily_limit:4},topicId:'topic'}));
    assert.match(queued,/Dalam antrean/);
    assert.doesNotMatch(queued,/Belum diuji/);
    const unknown=renderToStaticMarkup(React.createElement(SourceDisclosure,{source:{...source,last_attempt:{status:'new_provider_status'}},budget:{used:1,daily_limit:4},topicId:'topic'}));
    assert.match(unknown,/Status belum dikenal/);
  }finally{await server.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('post cards show only sentiment labels or a concise unavailable state', async () => {
  const server = await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
  try {
    const {default:Sentiment} = await server.ssrLoadModule('/src/components/admin/pulse/SentimentAction.jsx');
    const html = renderToStaticMarkup(React.createElement(Sentiment, {post:{metrics:{sentiment:{label:'negative',method:'ollama_post_v1',reason:'Caption berisi keluhan pelayanan.',model:'qwen2.5:14b',analyzed_at:'2026-11-11T21:20:00Z'}}}}));
    assert.match(html, /Negatif/);
    assert.match(html, /AI Analysis/);
    assert.match(html, /aria-label="Sentimen: Negatif"/);
    assert.doesNotMatch(html, /Caption berisi keluhan pelayanan|Penilaian nada teks|<p[\s>]|<details/);
    assert.doesNotMatch(html, /AI lokal|qwen|Ollama|Metode &amp; privasi|backend/);
    const empty = renderToStaticMarkup(React.createElement(Sentiment, {post:{text:'Caption baru',metrics:{}}}));
    assert.match(empty, /Analisa belum tersedia\./);
    assert.doesNotMatch(empty, /otomatis|<p[\s>]/);
    for(const [label,text] of [['neutral','Netral'],['positive','Positif']]){
      const result=renderToStaticMarkup(React.createElement(Sentiment,{post:{metrics:{sentiment:{label}}}}));
      assert.match(result,new RegExp(text));assert.doesNotMatch(result,/Analisa belum tersedia|Penjelasan|<p[\s>]/);
    }
    assert.doesNotMatch(empty, /<button/);
    assert.doesNotMatch(html, /<button/);
    const emotion=renderToStaticMarkup(React.createElement(Sentiment,{post:{metrics:{sentiment:{label:'negative'},emotion:{label:'anger',confidence:.8,reason:'Example reason'}}}}));
    assert.match(emotion,/aria-label="Emosi: Marah"/);
    assert.doesNotMatch(emotion,/Example reason/);
    assert.doesNotMatch(empty,/Emosi:/);
  } finally { await server.close(); }
});

test('long captions render a single excerpt, not duplicate hidden source text', async () => {
  const server = await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
  try {
    const {default:Caption} = await server.ssrLoadModule('/src/components/admin/pulse/PostCaption.jsx');
    const html = renderToStaticMarkup(React.createElement(Caption, {post:{platform:'instagram',text:'Caption sumber. '.repeat(60)+'ENDING_SENTINEL'}}));
    assert.match(html, /aria-expanded="false"/);
    assert.doesNotMatch(html, /ENDING_SENTINEL/);
    const short = renderToStaticMarkup(React.createElement(Caption, {post:{text:'Caption singkat.'}}));
    assert.doesNotMatch(short, /<button/);
  } finally { await server.close(); }
});

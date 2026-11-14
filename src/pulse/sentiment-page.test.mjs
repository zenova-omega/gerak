import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {createServer} from 'vite';

test('sentiment page exposes dated evidence links, coverage and source reasons',async()=>{
  const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
  try {
    const {default:Page}=await server.ssrLoadModule('/src/pulse/SentimentAnalytics.jsx');
    const posts=[{id:'p',author:'Source A',platform:'instagram',url:'https://www.instagram.com/p/test/',text:'Caption sumber',published_at:'2026-11-03T01:00:00Z',metrics:{sentiment:{label:'negative',reason:'Kekhawatiran dalam caption'},engagement:8}},{id:'u',published_at:'2026-11-03T02:00:00Z',metrics:{}}];
    const html=renderToStaticMarkup(React.createElement(MemoryRouter,{initialEntries:['/pulse/sentiment?topic=p1&author=stale&from=2026-11-01']},React.createElement(Page,{data:{posts}})));
    assert.match(html,/sentiment=negative/);
    assert.match(html,/day=2026-11-03/);
    assert.match(html,/from=2026-11-01/);
    assert.doesNotMatch(html,/author=stale/);
    assert.match(html,/Kekhawatiran dalam caption/);
    assert.doesNotMatch(html,/psa-coverage|pea-coverage|Analisis belum lengkap|1 dari 2/);
    assert.match(html,/Belum dianalisis/);
    assert.match(html,/Belum dapat dibandingkan/);
    assert.match(html,/Caption asli/);
    assert.match(html,/aria-label="Analisis sentimen posting"/);
  }finally{await server.close();}
});

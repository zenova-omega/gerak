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

test('sentiment page reads public opinion from comments and keeps the press apart from the public',async()=>{
  const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
  try {
    const {default:Voices}=await server.ssrLoadModule('/src/pulse/VoiceOverview.jsx');
    const {publicOpinion}=await server.ssrLoadModule('/src/lib/pulseVoice.js');
    const {default:Page}=await server.ssrLoadModule('/src/pulse/SentimentAnalytics.jsx');
    const post=(id,platform,label,kind)=>({id,platform,author:'A',text:'Teks '+id,published_at:'2026-11-03T01:00:00Z',metrics:label?{sentiment:{label,reason:'r',...(kind?{kind}:{})}}:{}});
    const posts=[post('a','x','negative'),post('b','x','neutral','sarcasm'),post('c','instagram','neutral','question'),post('d','news','neutral'),post('e','news','neutral'),post('f','news',null)];
    const comments=[{sentiment:{label:'negative'},stance:{label:'opposes'},post:posts[0]},{sentiment:{label:'negative'},stance:{label:'unclear'},post:posts[0]},{sentiment:{label:'neutral',kind:'question'},stance:{label:'unclear'},post:posts[1]},{sentiment:null,stance:null,post:posts[1]}];
    const render=(voice,hideUnknown=false)=>renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(Voices,{posts,opinion:publicOpinion(comments),loaded:true,hideUnknown,onHideUnknown(){},voice,onVoice(){},commentsLink:'/pulse/comments?topic=p1'})));
    const html=render('public');
    // Opinion is read from the analysed comments only; the unanalysed one is coverage, not a category.
    assert.match(html,/<h2>Opini publik<\/h2>/);
    assert.match(html,/<strong>67%<\/strong> negatif<small>dari 3 komentar teranalisis pada 2 posting<\/small>/);
    assert.match(html,/3 dari 4 komentar tersimpan · bertambah otomatis/);
    assert.match(html,/aria-label="Opini publik: Negatif 67%, Netral 33%"/);
    assert.match(html,/Tolak <b>33%<\/b>/);
    assert.match(html,/href="\/pulse\/comments\?topic=p1"/);
    // The public's posts and the press are two separate readings; a neutral news item is a report.
    assert.match(html,/aria-label="Posting warganet: Negatif 33%, Netral 67%"/);
    assert.match(html,/data-kind="sarcasm"[^>]*>Sindiran <b>50%<\/b>/);
    assert.match(html,/aria-label="Pemberitaan: Netral 67%, Belum dianalisis 33%"/);
    assert.match(html,/data-kind="report"[^>]*>Berita <b>100%<\/b>/);
    assert.match(html,/aria-pressed="true"[^>]*>(?:<[^>]*>)*Suara warganet/);
    assert.match(render('news',true),/aria-label="Pemberitaan: Netral 100%"/);
    // Below the top card the page details one voice: the public's posts by default, so news does not drown it.
    const page=renderToStaticMarkup(React.createElement(MemoryRouter,{initialEntries:['/pulse/sentiment?topic=p1']},React.createElement(Page,{data:{posts}})));
    assert.match(page,/Jumlah posting per sentimen, suara warganet/);
    assert.match(page,/platform=instagram%2Cx&amp;sentiment=negative/);
    assert.doesNotMatch(page,/Teks d<|Teks e</);
    const press=renderToStaticMarkup(React.createElement(MemoryRouter,{initialEntries:['/pulse/sentiment?topic=p1&voice=news']},React.createElement(Page,{data:{posts}})));
    assert.match(press,/Jumlah posting per sentimen, pemberitaan/);
    assert.match(press,/platform=news&amp;sentiment=neutral/);
  }finally{await server.close();}
});

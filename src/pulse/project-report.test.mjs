import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {createServer} from 'vite';

test('report renders a live draft with project period, source labels and browser PDF instructions',async()=>{
  const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
  try{
    const {default:Report}=await server.ssrLoadModule('/src/pulse/ProjectReport.jsx');
    const html=renderToStaticMarkup(React.createElement(MemoryRouter,{initialEntries:['/pulse/reports?topic=p1']},React.createElement(Report,{topic:{id:'p1',label:'Project Uji',query:'kata kunci'},period:{from:'2026-11-01',to:'2026-11-12'},data:{posts:[{id:'one',author:'Source',platform:'x',url:'https://x.com/i/status/1',metrics:{engagement:8},published_at:'2026-11-03T00:00:00Z'}]}})));
    assert.match(html,/Project Uji/);assert.match(html,/2026-11-01/);assert.match(html,/2026-11-12/);
    assert.match(html,/Analisis belum lengkap: 1 posting/);
    assert.doesNotMatch(html,/Data Threads belum tersedia untuk pencarian topik/);
    assert.match(html,/Draf langsung/);
    assert.match(html,/Buat &amp; bekukan laporan/);
    assert.match(html,/disabled=""[^>]*>Buat &amp; bekukan laporan/);
    assert.match(html,/Caption asli/);
    assert.match(html,/https:\/\/x.com\/i\/status\/1/);
    assert.match(html,/Save as PDF/);
    assert.match(html,/Intelligence brief/);
    assert.match(html,/aria-label="Bagian laporan"/);
    assert.match(html,/Akun &amp; sumber unik/);
    assert.match(html,/class="pr-evidence"/);
    assert.match(html,/Peringkat 1/);
    assert.match(html,/psi-avatar/);
  }finally{await server.close();}
});
test('printable report names shared selection and excludes unselected source evidence',async()=>{
  const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
  try{
    const {default:Report}=await server.ssrLoadModule('/src/pulse/ProjectReport.jsx');
    const html=renderToStaticMarkup(React.createElement(MemoryRouter,{},React.createElement(Report,{selectedPlatforms:[],topic:{id:'p'},data:{posts:[{id:'excluded',author:'Excluded author',platform:'x',metrics:{}}]}})));
    assert.match(html,/Platform: Tidak ada platform dipilih/);
    assert.doesNotMatch(html,/Excluded author/);
  }finally{await server.close();}
});

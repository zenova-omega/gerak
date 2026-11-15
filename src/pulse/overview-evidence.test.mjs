import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {createServer} from 'vite';
test('overview shows real unique content, unknown sentiment and no fabricated period growth',async()=>{
 const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try {
  const {default:Overview}=await server.ssrLoadModule('/src/pulse/ProjectOverview.jsx');
  const html=renderToStaticMarkup(React.createElement(MemoryRouter,{initialEntries:['/pulse/overview?topic=t']},React.createElement(Overview,{data:{posts:[{id:'1',platform:'x',author:'Nama nyata',text:'caption asli',metrics:{engagement:7}},{id:'2',platform:'news',author:'Media',text:'caption asli',metrics:{engagement:0}}]},topic:{id:'t',label:'Isu'},period:{}})));
  assert.match(html,/Konten unik/);assert.match(html,/Sentimen bersih/);assert.match(html,/Belum ada posting yang dianalisis/);assert.match(html,/Konsentrasi akun/);assert.match(html,/Telusuri lebih jauh/);
  assert.match(html,/Pilih tanggal mulai dan akhir/);assert.doesNotMatch(html,/aria-label="(Narasi utama|Penggerak percakapan|Sumber percakapan)"|id="pulse-infographics"/,'the detail panels live on their own pages now');
  assert.doesNotMatch(html,/Percakapan meningkat/);
 } finally {await server.close();}
});

test('a narrative row shows on which platforms its posts are, as logos with counts, and says it in its name',async()=>{
 const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try {
  const {default:Panel}=await server.ssrLoadModule('/src/pulse/NarrativePanel.jsx');
  const {overviewEvidence}=await server.ssrLoadModule('/src/lib/pulseOverview.js');
  const post=(id,platform,author)=>({id,issue_id:'narasi-1',platform,author,text:'teks yang sama',published_at:'2026-11-10T03:00:00Z',metrics:{engagement:3}});
  const narratives=overviewEvidence([post('1','x','akun_a'),post('2','x','akun_b'),post('3','tiktok','akun_c')]).narratives;
  const html=renderToStaticMarkup(React.createElement(MemoryRouter,{initialEntries:['/pulse/network?topic=t']},React.createElement(Panel,{narratives,onOpen:()=>{}})));
  const row=html.match(/<ol[^>]*class="po-narrative-list"[\s\S]*?<\/ol>/)[0];
  assert.match(row,/aria-label="Narasi 1: teks yang sama\. 3 posting dari 3 akun, di X \(2\) dan TikTok \(1\)\. Periksa posting\."/);
  const marks=row.match(/<span[^>]*class="po-narrative-platforms"[^>]*>[\s\S]*?<\/span><\/span>/)[0];
  assert.deepEqual([...marks.matchAll(/<span[^>]*title="([^"]*)"[^>]*>[\s\S]*?<b>(\d+)<\/b>/g)].map(found=>[found[1],found[2]]),[['X','2'],['TikTok','1']]);
  assert.equal((marks.match(/pulse-platform-icon/g)||[]).length,2,'each platform is its logo');
  assert.match(html,/Sentimen bersih = \(positif − negatif\)/,'the bubble chart says how its vertical axis is made');
  assert.match(html,/belum punya posting yang dianalisis/,'a narrative with nothing analysed is said to be left out, not drawn at zero');
 } finally {await server.close();}
});


test('the evidence date range uses day_v1: the installation zone, never the browser zone',async()=>{
 const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try {
  const {dateRange}=await server.ssrLoadModule('/src/pulse/evidenceFigures.js');
  const {setZone}=await server.ssrLoadModule('/src/lib/pulseMeasures.js');
  assert.equal(dateRange([{published_at:'2026-11-10T20:00:00'},{published_at:'2026-11-10T00:00:00'}]),'10 Nov 2026 – 11 Nov 2026');
  setZone({offset_minutes:540,name:'WIT'});
  try {
   assert.equal(dateRange([{published_at:'2026-11-10T15:30:00Z'}]),'11 Nov 2026');
  } finally {setZone({offset_minutes:420,name:'WIB'});}
  assert.equal(dateRange([{published_at:null}]),'');
 } finally {await server.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {chromium} from 'playwright-core';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('quick search starts a new project with platform choices, not an archive query',async()=>{
 const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{
  const {default:Search}=await server.ssrLoadModule('/src/pulse/TaggedSearch.jsx');
  const html=renderToStaticMarkup(React.createElement(MemoryRouter,{initialEntries:['/pulse/search?q=penyadapan,disadap&required=presiden&excluded=promo']},React.createElement(Search)));
  for(const text of ['Kata utama','Konteks wajib','Pengecualian','Cari &amp; buat project','Platform','Hapus keyword penyadapan','Hapus keyword disadap',])assert.ok(html.includes(text),text);
  assert.doesNotMatch(html,/Cari data tersimpan|Tidak menggunakan kuota crawler|Simpan sebagai project/);
  assert.ok(!html.includes('posting unik ditemukan'),'Do not invent results before response');
 }finally{await server.close();}
});

test('a new keyword creates one project, starts the complete pull, and waits on its progress before opening',async()=>{
 const cacheDir=await mkdtemp(join(tmpdir(),'pulse-search-flow-'));
 const harness={name:'search-flow',resolveId(id){if(id==='/search-flow.jsx')return id;},load(id){if(id==='/search-flow.jsx')return `
 import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter,Routes,Route,useLocation} from 'react-router-dom';
 import '/src/pulse/pulse-app.css';import '/src/pulse/pulse-tokens.css';import '/src/pulse/ds/analytics-kit.css';
 import Search from '/src/pulse/TaggedSearch.jsx';import api from '/src/lib/api.js';
 window.calls=[];
 api.post=async(path,body)=>{window.calls.push({path,body});
 if(path.endsWith('/topics'))return {id:'new-project',label:'cawapres'};
 return {days:7,running:true,progress:null,scheduled:['rss','social','youtube','reddit','instagram','tiktok']};};
 api.get=async(path,params)=>{window.calls.push({path,params});
 return {days:7,running:true,progress:{finished:false,platforms:{news:{state:'done',fetched:640,ingested:600,stopped:null},x:{state:'running',fetched:1200,ingested:900,stopped:null},youtube:{state:'done',fetched:0,ingested:0,stopped:'access_or_quota_restricted'}}}};};
 function Opened(){const location=useLocation();return React.createElement('p',{id:'opened'},location.pathname+location.search);}
 createRoot(document.getElementById('root')).render(React.createElement(MemoryRouter,{initialEntries:['/pulse/search?q=cawapres']},
  React.createElement(Routes,null,React.createElement(Route,{path:'/pulse/search',element:React.createElement(Search)}),React.createElement(Route,{path:'*',element:React.createElement(Opened)}))));
 `;}};
 const server=await createServer({configFile:false,cacheDir,plugins:[react(),harness],resolve:{alias:{'@':new URL('../',import.meta.url).pathname}},optimizeDeps:{include:['react','react-dom/client','react/jsx-dev-runtime','react-router-dom','@phosphor-icons/react/dist/csr/ThreadsLogo','@radix-ui/react-dialog','@radix-ui/react-slot','class-variance-authority','clsx','lucide-react','tailwind-merge']},server:{host:'127.0.0.1',port:0,hmr:false,ws:false,watch:null},appType:'custom'});
 server.middlewares.use('/search-fixture',async(_req,res)=>{res.setHeader('Content-Type','text/html');res.end(await server.transformIndexHtml('/search-fixture','<div id="root" class="pulse-standalone"></div><script type="module" src="/search-flow.jsx"></script>'));});
 let browser;
 try{
  await server.listen();browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1100,height:900}});
  page.setDefaultTimeout(10000);
  const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&!/WebSocket|websocket/.test(message.text()))pageErrors.push(message.text());});
  page.on('response',response=>{if(response.status()>=400)pageErrors.push(response.status()+' '+response.url().slice(-80));});
  await page.goto(server.resolvedUrls.local[0]+'search-fixture',{waitUntil:'domcontentloaded',timeout:15000});
  try{await page.getByRole('button',{name:'Cari & buat project'}).waitFor();}catch(e){throw new Error(e.message+'\nPAGE ERRORS: '+pageErrors.join(' | ').slice(0,900)+'\nBODY: '+(await page.locator('body').innerText()).slice(0,300));}
  assert.equal(await page.evaluate(()=>window.calls.length),0);
  await page.getByRole('checkbox',{name:'Instagram'}).check();
  await page.getByRole('button',{name:'Cari & buat project'}).click();
  const waiting=page.getByRole('region',{name:'Pengumpulan awal project'});
  try{await waiting.getByText('Selesai · 640 posting').waitFor();}catch(e){throw new Error(e.message+'\n'+await page.locator('body').innerText()+'\n'+JSON.stringify(await page.evaluate(()=>window.calls)));}
  const calls=await page.evaluate(()=>window.calls);
  assert.equal(calls.filter(c=>c.path.endsWith('/topics')).length,1);
  assert.equal(calls[0].body.query,'"cawapres"');
  assert.deepEqual(calls[0].body.sources,['rss','social','youtube','reddit']);
  // One request starts everything: schedules for every chosen source and the complete pull of the chosen range.
  assert.equal(calls[1].path,'/admin/pulse/topics/new-project/start');
  assert.deepEqual(calls[1].body,{days:7,platforms:['news','x','instagram','tiktok','youtube','reddit']});
  assert.equal(calls[2].path,'/admin/pulse/topics/new-project/lookback');
  assert.ok(!calls.some(c=>/\/crawl$|\/sources\/collect$/.test(c.path)),'no capped first fetch any more');
  const text=await waiting.innerText();
  for(const expected of ['Mengumpulkan percakapan untuk “cawapres”','dari sekitar 3 menit','1.840 posting diterima','2 dari 6 sumber selesai','Mengambil… 1.200 posting sejauh ini','Menunggu giliran','Belum berhasil; dicoba lagi sesuai jadwal'])assert.ok(text.includes(expected),expected);
  assert.doesNotMatch(text,/xpoz|provider|kuota/i);
  assert.equal(await page.locator('#opened').count(),0,'the project does not open before the sources settle or the time is up');
  if(process.env.PULSE_SHOT_DIR)await waiting.screenshot({path:process.env.PULSE_SHOT_DIR+'/warmup.png'});
  await waiting.getByRole('button',{name:'Buka sekarang'}).click();
  assert.equal(await page.locator('#opened').innerText(),'/pulse/overview?topic=new-project');
 }finally{await browser?.close();await server.close();await rm(cacheDir,{recursive:true,force:true});}
});

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
  for(const text of ['Kata utama','Konteks wajib','Pengecualian','Cari &amp; buat project','Platform','Hapus keyword penyadapan','Hapus keyword disadap','OR','AND','NOT'])assert.ok(html.includes(text),text);
  assert.doesNotMatch(html,/Cari data tersimpan|Tidak menggunakan kuota crawler|Simpan sebagai project/);
  assert.ok(!html.includes('posting unik ditemukan'),'Do not invent results before response');
 }finally{await server.close();}
});

test('new keyword creates one project then collects fresh data and preserves provider warnings',async()=>{
 const cacheDir=await mkdtemp(join(tmpdir(),'pulse-search-flow-'));
 const harness={name:'search-flow',resolveId(id){if(id==='/search-flow.jsx')return id;},load(id){if(id==='/search-flow.jsx')return `
 import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter} from 'react-router-dom';
 import Search from '/src/pulse/TaggedSearch.jsx';import api from '/src/lib/api.js';
 window.calls=[];
 api.post=async(path,body)=>{window.calls.push({path,body});
 if(path.endsWith('/topics'))return {id:'new-project',label:'cawapres'};
 if(path.endsWith('/crawl'))return {providers:{rss:{status:'success'},xpoz:{status:'failed',error:'provider_quota'},youtube:{status:'success'}}};
 return {status:'empty'};};
 api.get=async(path,params)=>{window.calls.push({path,params});return path.endsWith('/reviews')?{reviews:[]}:{posts:[]};};
 createRoot(document.getElementById('root')).render(React.createElement(MemoryRouter,{initialEntries:['/pulse/search?q=cawapres']},React.createElement(Search)));
 `;}};
 const server=await createServer({configFile:false,cacheDir,plugins:[react(),harness],resolve:{alias:{'@':new URL('../',import.meta.url).pathname}},optimizeDeps:{include:['react','react-dom/client','react/jsx-dev-runtime','react-router-dom','@phosphor-icons/react/dist/csr/ThreadsLogo','@radix-ui/react-dialog','@radix-ui/react-slot','class-variance-authority','clsx','lucide-react','tailwind-merge']},server:{host:'127.0.0.1',port:0,hmr:false,ws:false,watch:null},appType:'custom'});
 server.middlewares.use('/search-fixture',async(_req,res)=>{res.setHeader('Content-Type','text/html');res.end(await server.transformIndexHtml('/search-fixture','<div id="root"></div><script type="module" src="/search-flow.jsx"></script>'));});
 let browser;
 try{
  await server.listen();browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();
  page.setDefaultTimeout(10000);
  await page.goto(server.resolvedUrls.local[0]+'search-fixture',{waitUntil:'domcontentloaded',timeout:15000});
  await page.getByRole('button',{name:'Cari & buat project'}).waitFor();
  assert.equal(await page.evaluate(()=>window.calls.length),0);
  await page.getByRole('checkbox',{name:'Instagram'}).check();
  await page.getByRole('button',{name:'Cari & buat project'}).click();
  try{await page.getByText('Pengambilan selesai.',{exact:true}).waitFor();}catch(e){throw new Error(e.message+'\n'+await page.locator('body').innerText()+'\n'+JSON.stringify(await page.evaluate(()=>window.calls)));}
  const calls=await page.evaluate(()=>window.calls);
  assert.equal(calls.filter(c=>c.path.endsWith('/topics')).length,1);
  assert.equal(calls[0].body.query,'"cawapres"');
  assert.deepEqual(calls[0].body.sources,['rss','xpoz','youtube','reddit']);
  assert.equal(calls[1].path,'/admin/pulse/topics/new-project/crawl');
  assert.deepEqual(calls[2].body,{topic_id:'new-project',platform:'instagram',limit:20,unlimited:true});
  assert.deepEqual(calls[3].body,{topic_id:'new-project',platform:'tiktok',limit:20,unlimited:true});
  assert.deepEqual(calls[4].params,{topic_id:'new-project'});
  assert.equal(await page.getByText('Beberapa sumber memerlukan perhatian').count(),1);
  assert.equal(await page.getByRole('link',{name:'Buka dashboard project ↗'}).getAttribute('href'),'/pulse/overview?topic=new-project');
  assert.equal(await page.getByRole('button',{name:'Cari & buat project'}).isDisabled(),true);
 }finally{await browser?.close();await server.close();await rm(cacheDir,{recursive:true,force:true});}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {createServer} from 'vite';
/** Visits every React element under `node` (props.children and element-valued props), depth first. */
const walk=(node,visit)=>{if(Array.isArray(node)){node.forEach(child=>walk(child,visit));return;}if(!node||typeof node!=='object'||!node.props)return;visit(node);for(const value of Object.values(node.props))if(value&&typeof value==='object')walk(value,visit);};
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

test('evidence figures read reported numbers only, and the drawer names its share rule by what was opened',async()=>{
 const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try {
  const {sumOf}=await server.ssrLoadModule('/src/pulse/evidenceFigures.js');
  const {EvidencePosts,EvidenceSheet}=await server.ssrLoadModule('/src/pulse/EvidencePosts.jsx');
  assert.equal(sumOf([{metrics:{views:'10'}},{metrics:{views:2.5}},{metrics:{views:-3}},{metrics:{views:true}}],'views'),10,'a digit string counts; a float, a negative number and true are not reported');
  assert.equal(sumOf([{metrics:{likes:true,comments:-1}},{metrics:{views:4}}],'interactions'),null,'no post reports an interaction: unknown, never 0');
  const posts=[{id:'own',platform:'x',author:'a',text:'teks pertama',metrics:{likes:1,shares:2}},{id:'rp',platform:'x',author:'b',text:'teks kedua',metrics:{likes:0,comments:0,shares:0,repost:true,original_shares:100}}];
  const figure=html=>html.match(/<strong>([^<]*)<\/strong><span>dibagikan<\/span>/)?.[1];
  const render=element=>renderToStaticMarkup(React.createElement(MemoryRouter,null,element));
  assert.equal(figure(render(React.createElement(EvidencePosts,{posts}))),'2','a set of posts (a day, a platform): shares_total, a repost adds none of its own');
  assert.equal(figure(render(React.createElement(EvidencePosts,{posts,oneContent:true}))),'100','one piece of content: content_shares');
  const unknown=render(React.createElement(EvidencePosts,{posts:[{id:'n',platform:'x',author:'c',text:'teks',metrics:{views:4}}]}));
  assert.doesNotMatch(unknown,/<span>interaksi<\/span>/,'unknown interactions are not printed as a figure');
  // The drawer renders in a portal (nothing on the server), so its element tree is walked for what it hands over.
  const handed=selection=>{const found=[];walk(EvidenceSheet({selection,onClose:()=>{}}),node=>{if(node.type===EvidencePosts)found.push(node.props);});return found;};
  assert.deepEqual(handed({title:'Kelompok percakapan',posts,oneContent:true}).map(props=>props.oneContent),[true],'opened from a group: one piece of content');
  assert.deepEqual(handed({title:'10 Nov 2026',posts}).map(props=>props.oneContent),[false],'opened from a day: any other set');
 } finally {await server.close();}
});

test('a narrative opens its posts as one piece of content, from its row and from its bubble',async()=>{
 const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try {
  const {default:Panel}=await server.ssrLoadModule('/src/pulse/NarrativePanel.jsx');
  const {overviewEvidence}=await server.ssrLoadModule('/src/lib/pulseOverview.js');
  const post=(id,author,tone)=>({id,issue_id:'narasi-1',platform:'x',author,text:'teks yang sama',published_at:'2026-11-10T03:00:00Z',metrics:{likes:1,sentiment:{label:tone}}});
  const narratives=overviewEvidence([post('1','a','negative'),post('2','b','neutral')]).narratives;
  const calls=[],onOpen=(...args)=>calls.push(args);
  const tree=Panel({narratives,onOpen});
  const rows=[],shapes=[];
  walk(tree,node=>{if(node.type==='button'&&typeof node.props.onClick==='function')rows.push(node.props.onClick);if(typeof node.props?.shape==='function')shapes.push(node.props.shape);});
  assert.equal(rows.length,1,'one narrative row');
  rows[0]();
  assert.equal(shapes.length,1,'one bubble series');
  const point={...narratives[0],posts:narratives[0].posts};
  shapes[0]({cx:10,cy:10,payload:point}).props.onPick(point);
  assert.equal(calls.length,2);
  for(const [title,opened,options] of calls){
   assert.equal(title,'Kelompok percakapan');
   assert.deepEqual(opened.map(p=>p.id),['1','2']);
   assert.deepEqual(options,{oneContent:true});
  }
 } finally {await server.close();}
});

test('interaction detail of a set says over how many posts its total is, and reads unknown as a dash',async()=>{
 const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try {
  const {PulseEngagement}=await server.ssrLoadModule('/src/components/ui/PulseEngagement.jsx');
  const render=posts=>renderToStaticMarkup(React.createElement(PulseEngagement,{posts}));
  const head=html=>html.match(/<span class="pu-eng-total">[\s\S]*?<\/span>(?=<div|<\/div>)/)?.[0]||'';
  const known=render([{metrics:{likes:'12',comments:2.5}},{metrics:{engagement:8}},{metrics:{likes:true,views:9}}]);
  assert.match(head(known),/<strong>20<\/strong> interaksi/);
  assert.match(head(known),/dari 2 posting/,'the total covers the two posts whose interactions are known');
  const none=render([{metrics:{views:5}},{metrics:{likes:-1}}]);
  assert.match(head(none),/<strong><span aria-label="Tidak tersedia">—<\/span><\/strong> interaksi/);
  assert.doesNotMatch(head(none),/posting/);
 } finally {await server.close();}
});

test('a drawer opened from a day: copies of one text show the content\'s shares, the summary shows shares_total',async()=>{
 const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try {
  const {EvidencePosts}=await server.ssrLoadModule('/src/pulse/EvidencePosts.jsx');
  const posts=[
   {id:'own',platform:'x',author:'a',text:'teks yang sama',published_at:'2026-11-10T03:00:00Z',metrics:{likes:3,shares:2}},
   {id:'rp',platform:'x',author:'b',text:'teks yang sama',published_at:'2026-11-10T04:00:00Z',metrics:{likes:0,comments:0,shares:0,repost:true,original_shares:100}},
   {id:'other',platform:'x',author:'c',text:'teks lain',published_at:'2026-11-10T05:00:00Z',metrics:{likes:1,shares:5}},
  ];
  const html=renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(EvidencePosts,{posts})));
  assert.equal(html.match(/<strong>([^<]*)<\/strong><span>dibagikan<\/span>/)?.[1],'7','the day: the posts\' own shares');
  const copies=html.match(/<li class="ped-copies">[\s\S]*?<\/li>/)[0];
  assert.match(copies,/title="Repost">100</,'the copies of one text: content_shares');
 } finally {await server.close();}
});

test('interaction totals of a drawer and of a narrative row say over how many posts they are counted',async()=>{
 const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try {
  const {EvidencePosts}=await server.ssrLoadModule('/src/pulse/EvidencePosts.jsx');
  const {default:Panel}=await server.ssrLoadModule('/src/pulse/NarrativePanel.jsx');
  const {overviewEvidence}=await server.ssrLoadModule('/src/lib/pulseOverview.js');
  const posts=[
   {id:'1',issue_id:'n',platform:'x',author:'a',text:'teks yang sama',published_at:'2026-11-10T03:00:00Z',metrics:{likes:'4'}},
   {id:'2',issue_id:'n',platform:'x',author:'b',text:'teks yang sama',published_at:'2026-11-10T04:00:00Z',metrics:{views:2,engagement:6}},
   {id:'3',issue_id:'n',platform:'x',author:'c',text:'teks yang sama',published_at:'2026-11-10T05:00:00Z',metrics:{likes:true}},
  ];
  const drawer=renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(EvidencePosts,{posts})));
  assert.match(drawer,/<strong>10<\/strong><span>interaksi dari 2 posting<\/span>/);
  const panel=renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(Panel,{narratives:overviewEvidence(posts).narratives,onOpen:()=>{}})));
  assert.match(panel,/title="Interaksi dari 2 posting"[^>]*>[\s\S]*?<b>10<\/b>interaksi/);
 } finally {await server.close();}
});

test('the guide of every page that prints a set\'s shares says an uncollected original\'s shares are not in it',async()=>{
 const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try {
  const meta=await server.ssrLoadModule('/src/pulse/pageMeta.js');
  const pages=meta.pageMeta||meta.default;
  const sentence='Dibagikan pada sekumpulan posting hanya menjumlahkan bagikan milik tiap posting, jadi bagikan dari posting asli yang tidak ikut terkumpul tidak dihitung.';
  for(const page of ['overview','posts','accounts','network']){
   const text=pages[page].guide.join(' ');
   assert.ok(text.includes(sentence),`${page} guide`);
   assert.doesNotMatch(text,/—/);
  }
 } finally {await server.close();}
});

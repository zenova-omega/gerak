import test from 'node:test';
import assert from 'node:assert/strict';
import * as filters from './pulseProjectFilters.js';

const posts = [
  {id:'x1',platform:'x',author:'A',published_at:'2026-11-10T17:00:00Z',metrics:{engagement:10,sentiment:'positive'}},
  {id:'ig',platform:'instagram',author:'B',published_at:'2026-11-11T10:00:00Z',metrics:{engagement:99}},
  {id:'old',platform:'x',author:'A',published_at:'2026-11-10T16:59:59Z',metrics:{engagement:50}},
  {id:'undated',platform:'x',author:'C',metrics:{}},
];
const period={from:'2026-11-11',to:'2026-11-11'};
test('platform preferences survive project switching and unavailable browser storage',()=>{
  assert.equal(typeof filters.createPlatformStore,'function');
  const entries=new Map();
  const storage={getItem:key=>entries.get(key)||null,setItem:(key,value)=>entries.set(key,value)};
  const store=filters.createPlatformStore(storage);
  store.write('a',[]);store.write('b',['x']);
  assert.equal(store.read('a'),'[]');
  assert.equal(filters.createPlatformStore(storage).read('b'),'["x"]');
  const unavailable=filters.createPlatformStore({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}});
  unavailable.write('a',[]);
  assert.equal(unavailable.read('a'),'[]');
  assert.equal(unavailable.read('b'),'');
});
test('shared scope intersects platforms and inclusive WIB period before aggregating',()=>{
  assert.equal(typeof filters.scopeProjectData,'function');
  const input={posts,total_mentions:999,influencers:[{author:'Wrong'}],metric_totals:{engagement:{value:999}}};
  const result=filters.scopeProjectData(input,{platforms:['x'],...period});
  assert.deepEqual(result.posts.map(p=>p.id),['x1']);
  assert.equal(result.total_mentions,1);
  assert.deepEqual(result.metric_totals.engagement,{value:10,coverage:1});
  assert.deepEqual(result.timeline,[{date:'2026-11-11',count:1}]);
  assert.equal(result.influencers[0].mentions,1);
  assert.equal(result.influencers[0].engagement,10);
  assert.equal(input.total_mentions,999);
});
test('empty selection stays empty while all includes undated posts without period',()=>{
  assert.equal(typeof filters.scopeProjectData,'function');
  const empty=filters.scopeProjectData({posts},{platforms:[]});
  assert.equal(empty.posts.length,0);
  assert.deepEqual(empty.influencers,[]);
  assert.deepEqual(empty.platforms,[]);
  assert.equal(empty.metric_totals.engagement.value,null);
  assert.equal(filters.scopeProjectData({posts},{platforms:null}).posts.length,4);
});
test('URL platform scope overrides saved scope without confusing missing, all and none',()=>{
  assert.equal(typeof filters.readProjectPlatforms,'function');
  assert.deepEqual(filters.readProjectPlatforms('?topic=a&platforms=', '["x"]'),[]);
  assert.equal(filters.readProjectPlatforms('?platforms=all','["x"]'),null);
  assert.deepEqual(filters.readProjectPlatforms('?platforms=instagram,x,x','[]'),['instagram','x']);
  assert.deepEqual(filters.readProjectPlatforms('?topic=a&platform=x','["instagram"]'),['instagram']);
  assert.equal(filters.readProjectPlatforms('', '{broken'),null);
});
test('network evidence cannot retain excluded platforms, posts or dangling edges',()=>{
  assert.equal(typeof filters.scopeProjectData,'function');
  const network={sample_limit:1000,accounts:[{id:'x:a',platform:'x',label:'A',evidence:[posts[0],posts[2]],signals:[]},{id:'instagram:b',platform:'instagram',label:'B',evidence:[posts[1]],signals:[]}],nodes:[{id:'x:a',platform:'x'},{id:'instagram:b',platform:'instagram'}],edges:[{source:'x:a',target:'instagram:b',kind:'similarity',evidence:[posts[0],posts[1]]}],narratives:[{id:'n',timeline:[posts[0],posts[1]],account_count:2}],earliest:posts};
  const result=filters.scopeProjectData({posts,network},{platforms:['x'],...period}).network;
  assert.deepEqual(result.nodes.map(n=>n.id),['x:a']);
  assert.deepEqual(result.edges,[]);
  assert.deepEqual(result.narratives,[]);
  assert.deepEqual(result.accounts[0].evidence.map(p=>p.id),['x1']);
  assert.equal(result.accounts[0].posts,1);
  assert.equal(result.total_posts,1);
});

test('filtered network earliest evidence stays chronological rather than ranking newest first',()=>{
 const unequal=posts.map(p=>({...p,metrics:{engagement:p.id==='x1'?900:0}}));
 const result=filters.scopeProjectData({posts:unequal,network:{accounts:[],nodes:[],edges:[]}},{platforms:['x']}).network;
 assert.deepEqual(result.earliest.map(p=>p.id),['old','x1']);
});

test('a scoped project counts interactions and shares by the measures module, each total with its post count',()=>{
 const rows=[
  {id:'a',platform:'x',author:'A',published_at:'2026-11-10T03:00:00Z',metrics:{likes:'4',shares:'2',views:2.5}},
  {id:'b',platform:'x',author:'A',published_at:'2026-11-10T04:00:00Z',metrics:{views:3,engagement:6,shares:-1}},
  {id:'c',platform:'x',author:'C',published_at:'2026-11-10T05:00:00Z',metrics:{likes:true,comments:1.5}},
 ];
 const result=filters.scopeProjectData({posts:rows},{});
 assert.deepEqual(result.metric_totals.engagement,{value:12,coverage:2});
 assert.deepEqual(result.metric_totals.shares,{value:2,coverage:1},'a digit string counts; a negative number is not reported');
 assert.deepEqual(result.metric_totals.views,{value:3,coverage:1},'a float is not reported');
 const byAuthor=Object.fromEntries(result.influencers.map(row=>[row.author,row]));
 assert.deepEqual([byAuthor.A.engagement,byAuthor.A.interaction_posts],[12,2]);
 assert.deepEqual([byAuthor.C.engagement,byAuthor.C.interaction_posts],[null,0],'nothing known: unknown with 0 posts, never 0');
});

test('a narrowed network recounts each account\'s interactions and their post count together',()=>{
 const rows=[
  {id:'k1',platform:'x',author:'A',metrics:{likes:'3'}},{id:'k2',platform:'x',author:'A',metrics:{likes:true}},
  {id:'gone',platform:'instagram',author:'A',metrics:{likes:50}},
 ];
 const network={accounts:[{id:'x:a',platform:'x',label:'A',evidence:rows,signals:[],engagement:53,interaction_posts:2},
  {id:'x:z',platform:'x',label:'Z',evidence:[rows[1]],signals:[],engagement:null,interaction_posts:0}],nodes:[],edges:[]};
 const accounts=filters.scopeProjectData({posts:rows,network},{platforms:['x']}).network.accounts;
 assert.deepEqual(accounts.map(a=>[a.id,a.engagement,a.interaction_posts]),[['x:a',3,1],['x:z',null,0]]);
});

// account_v1: one X handle written two ways, a renamed YouTube channel, a Threads account with an id on one row only.
const sameAccounts=[
 {id:'k1',platform:'x',author:'Okezonenews',published_at:'2026-11-10T08:00:00Z',url:'https://x.com/1',metrics:{likes:1}},
 {id:'k2',platform:'x',author:'@okezonenews',published_at:'2026-11-11T08:00:00Z',url:'https://x.com/2',metrics:{likes:2}},
 {id:'k3',platform:'youtube',author:'Kanal Lama',published_at:'2026-11-09T08:00:00Z',url:'https://youtube.com/3',metrics:{author_id:'UC1',likes:3}},
 {id:'k4',platform:'youtube',author:'Kanal Baru',published_at:'2026-11-12T08:00:00Z',url:'https://youtube.com/4',metrics:{author_id:'UC1',likes:4}},
 {id:'k5',platform:'threads',author:'@Warga.Solo',published_at:'2026-11-12T09:00:00Z',url:'https://threads.net/5',metrics:{author_id:'1789',likes:5}},
 {id:'k6',platform:'threads',author:'warga.solo',published_at:'2026-11-08T08:00:00Z',url:'https://threads.net/6',metrics:{likes:6}},
];

test('a scoped project keeps one row per account by account_v1, with its key and its most recently published name',()=>{
 const rows=filters.scopeProjectData({posts:sameAccounts},{}).influencers;
 assert.deepEqual(Object.fromEntries(rows.map(row=>[row.key,[row.author,row.platform,row.mentions,row.engagement]])),{
  'x:okezonenews':['@okezonenews','x',2,3],'youtube:UC1':['Kanal Baru','youtube',2,7],'threads:warga.solo':['@Warga.Solo','threads',2,11]});
 const before=filters.scopeProjectData({posts:sameAccounts},{to:'2026-11-10'}).influencers;
 assert.equal(before.find(row=>row.key==='youtube:UC1').author,'Kanal Lama','the name is the latest inside the chosen period');
});

test('a narrowed network names each account by its most recently published post inside the scope',()=>{
 const evidence=sameAccounts.slice(2,4).map(({metrics,...row})=>row);
 const network={accounts:[{id:'youtube:UC1',platform:'youtube',label:'Kanal Baru',evidence,signals:[]}],
  nodes:[{id:'youtube:UC1',platform:'youtube',label:'Kanal Baru',observed:true}],edges:[]};
 const scoped=filters.scopeProjectData({posts:sameAccounts,network},{to:'2026-11-10'}).network;
 assert.deepEqual([scoped.accounts[0].label,scoped.nodes[0].label],['Kanal Lama','Kanal Lama']);
});

test('a scoped project keeps a channel whose post has no name, and reads the key the server sent',()=>{
 const rows=[
  {id:'n1',platform:'youtube',author:null,published_at:'2026-11-12T08:00:00Z',metrics:{author_id:'UC1',likes:1}},
  {id:'n2',platform:'youtube',author:'Kanal',published_at:'2026-11-10T08:00:00Z',metrics:{author_id:'UC1',likes:1}},
  {id:'n3',platform:'youtube',author:'',published_at:'2026-11-11T08:00:00Z',metrics:{author_id:'UC9',likes:5}},
  {id:'n4',platform:'x',author:'',published_at:'2026-11-11T08:00:00Z',metrics:{likes:7}},
  {id:'n5',platform:'x',author:'Lain',published_at:'2026-11-11T09:00:00Z',metrics:{likes:2},measures:{account:'x:dikirim',interactions:2}},
 ];
 const out=filters.scopeProjectData({posts:rows},{}).influencers;
 assert.deepEqual(Object.fromEntries(out.map(row=>[row.key,[row.author,row.mentions]])),{'youtube:UC1':['Kanal',2],'youtube:UC9':[null,1],'x:dikirim':['Lain',1]});
});

test('a narrowed network orders its earliest posts as the server does: by day, a post with a clock before a date-only one',()=>{
 // clock_v1: a date-only post (stored at 00:00:00 UTC) is not published at midnight; on its day it comes after the
 // posts with a clock, and the posts of the day before still come first.
 const rows=[
  {id:'d',platform:'x',author:'D',published_at:'2026-11-10T00:00:00Z',metrics:{}},
  {id:'t',platform:'x',author:'T',published_at:'2026-11-10T03:00:00Z',metrics:{}},
  {id:'prev',platform:'x',author:'P',published_at:'2026-11-09T16:00:00Z',metrics:{}},
  {id:'next',platform:'x',author:'N',published_at:'2026-11-10T18:00:00Z',metrics:{}},
  {id:'ig',platform:'instagram',author:'I',published_at:'2026-11-09T00:00:00Z',metrics:{}},
 ];
 const result=filters.scopeProjectData({posts:rows,network:{accounts:[],nodes:[],edges:[]}},{platforms:['x']}).network;
 assert.deepEqual(result.earliest.map(p=>p.id),['prev','t','d','next']);
});

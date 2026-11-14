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

import test from 'node:test';
import assert from 'node:assert/strict';
import {conversationGroups} from './pulseConversationGroups.js';
const posts=[
 {id:'a',issue_id:'g',platform:'youtube',author:'A',text:'Dalam periode',published_at:'2026-11-09T17:00:00Z',metrics:{engagement:0}},
 {id:'b',issue_id:'g',platform:'instagram',author:'B',text:'Di luar platform',published_at:'2026-11-10T10:00:00Z',metrics:{engagement:100}},
 {id:'c',issue_id:'g',platform:'youtube',author:'C',text:'Di luar tanggal',published_at:'2026-11-09T16:59:59Z',metrics:{engagement:200}},
 {id:'d',issue_id:'other',platform:'youtube',author:'A',text:'Kelompok kedua',published_at:'2026-11-10T12:00:00Z',metrics:{}},
 {id:'e',platform:'youtube',text:'Belum dikelompokkan',published_at:'2026-11-10T12:00:00Z',metrics:{}},
];
test('group counts, source preview, accounts and engagement follow the identical platform/WIB period',()=>{
 const r=conversationGroups(posts,{platforms:['youtube'],from:'2026-11-10',to:'2026-11-10'});
 assert.equal(r.totalPosts,3);assert.equal(r.ungrouped,1);assert.equal(r.groups.length,2);
 const g=r.groups.find(g=>g.id==='g');
 assert.deepEqual(g.posts.map(p=>p.id),['a']);assert.equal(g.authors,1);assert.equal(g.engagement,0);assert.equal(g.title,'Dalam periode');
 assert.equal(r.groups.find(g=>g.id==='other').engagement,null);
 assert.equal(conversationGroups(posts,{platforms:[]}).groups.length,0);
});
test('ordering uses scoped volume or publication time, not lifetime issue scores',()=>{
 const r=conversationGroups(posts,{platforms:['youtube'],from:'2026-11-10',to:'2026-11-10'},'recent');
 assert.deepEqual(r.groups.map(g=>g.id),['other','g']);
 assert.equal(conversationGroups(posts,{}).groups.find(g=>g.id==='g').posts.length,3);
});

import {filterPosts} from './pulsePostFilters.js';
import {sourceText} from './pulseOverview.js';
import { postInteractions } from './pulseEngagement.js';
export function conversationGroups(posts=[],filters={},sort='volume'){
 const selected=filterPosts(posts,filters),groups=new Map();
 let ungrouped=0;
 for(const post of selected){
  if(!post.issue_id){ungrouped++;continue;}
  if(!groups.has(post.issue_id))groups.set(post.issue_id,[]);
  groups.get(post.issue_id).push(post);
 }
 const result=[...groups].map(([id,items])=>{
  const dated=filterPosts(items,{sort:'recent'}).filter(p=>p.published_at);
  const values=items.map(p=>postInteractions(p.metrics)).filter(Number.isFinite);
  return {id,posts:items,title:sourceText(items[0])||'Teks sumber belum tersedia',
   authors:new Set(items.filter(p=>p.author||p.metrics?.author_id).map(p=>JSON.stringify([p.platform,p.metrics?.author_id||p.author]))).size,
   engagement:values.length?values.reduce((a,b)=>a+b,0):null,engagementCoverage:values.length,
   latest:dated[0]?.published_at||null};
 });
 const timestamp=value=>value?Date.parse(/[Zz]|[+-]\d{2}:\d{2}$/.test(value)?value:value+'Z')||0:0;
 result.sort((a,b)=>(sort==='recent'?timestamp(b.latest)-timestamp(a.latest):b.posts.length-a.posts.length)||a.id.localeCompare(b.id));
 return {groups:result,totalPosts:selected.length,ungrouped};
}

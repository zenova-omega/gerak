import {filterPosts, dailyPostCounts} from './pulsePostFilters.js';
import { accountName, interactionsTotal, postAccount, reported, sharesTotal } from './pulseMeasures.js';

export const projectPlatformOptions=['x','instagram','tiktok','reddit','threads','youtube','facebook','news','unknown'];
export function createPlatformStore(storage) {
  const memory=new Map();
  return {
    read(id){try{return storage.getItem('pulse:project-platforms:'+id)||memory.get(id)||'';}catch{return memory.get(id)||'';}},
    write(id,platforms){const raw=JSON.stringify(platforms);memory.set(id,raw);try{storage.setItem('pulse:project-platforms:'+id,raw);}catch{/* Session fallback. */}},
  };
}
export function readProjectPlatforms(search, saved) {
  const params=new URLSearchParams(search);
  if(params.has('platforms')) {
    const value=params.get('platforms');
    return value==='all'?null:[...new Set(value.split(',').filter(Boolean))].sort();
  }
  try { const value=JSON.parse(saved);return Array.isArray(value)&&value.every(p=>typeof p==='string')?[...new Set(value)].sort():null; }
  catch { return null; }
}

function scopeNetwork(network, posts, platforms) {
  if(!network)return network;
  const ids=new Set(posts.map(p=>p.id)), keep=p=>ids.has(p.id);
  const accounts=(network.accounts||[]).flatMap(a=>{
    const evidence=(a.evidence||[]).filter(keep);
    if(!evidence.length)return [];
    // Account-level signals are valid only when their complete evidence survives.
    const complete=evidence.length===a.evidence.length;
    const total=interactionsTotal(posts.filter(p=>evidence.some(e=>e.id===p.id)));   // the pair is recounted together
    return [{...a,label:accountName(evidence)??a.label,evidence,posts:evidence.length,signals:complete?a.signals:[],assessment:complete?a.assessment:'insufficient_data',engagement:total.value,interaction_posts:total.posts}];
  });
  const nodeIds=new Set(accounts.map(a=>a.id));
  const allowedNodes=new Set((network.nodes||[]).filter(n=>platforms===null||platforms.includes(n.platform)).map(n=>n.id));
  const edges=(network.edges||[]).flatMap(e=>{
    const evidence=(e.evidence||[]).filter(keep);
    if(!evidence.length||!allowedNodes.has(e.source)||!allowedNodes.has(e.target))return [];
    if(e.kind==='similarity'&&(evidence.length!==e.evidence.length||!nodeIds.has(e.source)||!nodeIds.has(e.target)))return [];
    nodeIds.add(e.source);nodeIds.add(e.target);
    return [{...e,evidence,count:evidence.length}];
  });
  const nodes=(network.nodes||[]).filter(n=>nodeIds.has(n.id)).map(n=>({...n,label:accounts.find(a=>a.id===n.id)?.label??n.label,posts:accounts.find(a=>a.id===n.id)?.posts||0,connections:edges.filter(e=>e.source===n.id||e.target===n.id).reduce((sum,e)=>sum+e.count,0)}));
  // Do not retain a narrative's full-sample claims after removing its evidence.
  const narratives=(network.narratives||[]).filter(n=>n.timeline?.length&&n.timeline.every(keep));
  const sampleIds=new Set((network.accounts||[]).flatMap(a=>(a.evidence||[]).map(p=>p.id)));
  return {...network,nodes,edges,accounts,narratives,earliest:filterPosts(posts,{}).filter(p=>p.published_at).slice(0,10),total_posts:posts.length,analyzed_posts:posts.filter(p=>sampleIds.has(p.id)).length};
}

export function scopeProjectData(data,{platforms=null,from='',to='',sentiments=null,excludedIds=null}={}) {
  const all=data.posts||[],kept=excludedIds?.size?all.filter(p=>!excludedIds.has(p.id)):all;
  const posts=filterPosts(kept,{platforms,from,to,sentiments});
  const sources=new Map(),authors=new Map();
  for(const p of posts){
    sources.set(p.platform,(sources.get(p.platform)||0)+1);
    const key=postAccount(p);   // account_v1, as the server's rows; a post without a name can still have one
    if(!key)continue;
    const row=authors.get(key)||{key,author:p.author,platform:p.platform,url:p.url,mentions:0,engagement:null,interaction_posts:0,rows:[]};
    row.mentions++;
    row.rows.push(p);
    authors.set(key,row);
  }
  const influencers=[...authors.values()].map(({rows,...row})=>{const total=interactionsTotal(rows);return {...row,author:accountName(rows),engagement:total.value,interaction_posts:total.posts};});
  // Every figure by the measures module: reported numbers, shares_total_v1, interactions_v1 with its post count.
  const metric_totals=Object.fromEntries(['likes','comments','views'].map(key=>{
    const values=posts.map(p=>reported(p.metrics?.[key])).filter(value=>value!==null);
    return [key,{value:values.length?values.reduce((sum,n)=>sum+n,0):null,coverage:values.length}];
  }));
  metric_totals.shares={value:sharesTotal(posts),coverage:posts.filter(p=>reported(p.metrics?.shares)!==null).length};
  const interactions=interactionsTotal(posts);
  metric_totals.engagement={value:interactions.value,coverage:interactions.posts};
  // Location aggregates without post provenance cannot safely survive a narrowed scope.
  const ids=new Set(posts.map(p=>p.id));
  const unchanged=posts.length===all.length;
  const locations=unchanged?(data.locations||[]):(data.locations||[]).filter(row=>ids.has(row.post_id));
  return {...data,posts,total_mentions:posts.length,metric_totals,timeline:dailyPostCounts(posts),
    platforms:[...sources].map(([platform,count])=>({platform,count})),influencers,
    locations,unknown_location_count:unchanged?(data.unknown_location_count??posts.length):posts.length-new Set(locations.map(row=>row.post_id)).size,
    network:unchanged?data.network:scopeNetwork(data.network,posts,platforms)};
}

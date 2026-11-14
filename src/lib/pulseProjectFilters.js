import {filterPosts, dailyPostCounts} from './pulsePostFilters.js';
import { postInteractions } from './pulseEngagement.js';

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
    return [{...a,evidence,posts:evidence.length,signals:complete?a.signals:[],assessment:complete?a.assessment:'insufficient_data',engagement:posts.filter(p=>evidence.some(e=>e.id===p.id)).reduce((sum,p)=>sum+(p.metrics?.engagement||0),0)}];
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
  const nodes=(network.nodes||[]).filter(n=>nodeIds.has(n.id)).map(n=>({...n,posts:accounts.find(a=>a.id===n.id)?.posts||0,connections:edges.filter(e=>e.source===n.id||e.target===n.id).reduce((sum,e)=>sum+e.count,0)}));
  // Do not retain a narrative's full-sample claims after removing its evidence.
  const narratives=(network.narratives||[]).filter(n=>n.timeline?.length&&n.timeline.every(keep));
  const sampleIds=new Set((network.accounts||[]).flatMap(a=>(a.evidence||[]).map(p=>p.id)));
  return {...network,nodes,edges,accounts,narratives,earliest:filterPosts(posts,{}).filter(p=>p.published_at).slice(0,10),total_posts:posts.length,analyzed_posts:posts.filter(p=>sampleIds.has(p.id)).length};
}

export function scopeProjectData(data,{platforms=null,from='',to='',sentiments=null}={}) {
  const posts=filterPosts(data.posts||[],{platforms,from,to,sentiments});
  const sources=new Map(),authors=new Map();
  for(const p of posts){
    sources.set(p.platform,(sources.get(p.platform)||0)+1);
    if(!p.author)continue;
    const key=JSON.stringify([p.platform,p.metrics?.author_id||p.author]);
    const row=authors.get(key)||{author:p.author,platform:p.platform,url:p.url,mentions:0,engagement:null};
    row.mentions++;
    if(postInteractions(p.metrics)!==null)row.engagement=(row.engagement??0)+postInteractions(p.metrics);
    authors.set(key,row);
  }
  const metric_totals=Object.fromEntries(['likes','comments','shares','views','engagement'].map(key=>{
    // 'engagement' follows the one product-wide definition, not the provider's own field.
    const values=posts.map(p=>key==='engagement'?postInteractions(p.metrics):p.metrics?.[key]).filter(Number.isFinite);
    return [key,{value:values.length?values.reduce((sum,n)=>sum+n,0):null,coverage:values.length}];
  }));
  // Location aggregates without post provenance cannot safely survive a narrowed scope.
  const ids=new Set(posts.map(p=>p.id));
  const unchanged=posts.length===(data.posts||[]).length;
  const locations=unchanged?(data.locations||[]):(data.locations||[]).filter(row=>ids.has(row.post_id));
  return {...data,posts,total_mentions:posts.length,metric_totals,timeline:dailyPostCounts(posts),
    platforms:[...sources].map(([platform,count])=>({platform,count})),influencers:[...authors.values()],
    locations,unknown_location_count:unchanged?(data.unknown_location_count??posts.length):posts.length-new Set(locations.map(row=>row.post_id)).size,
    network:unchanged?data.network:scopeNetwork(data.network,posts,platforms)};
}

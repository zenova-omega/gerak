import {sentimentCounts} from './pulsePostFilters.js';
import {sentimentTimeline} from './pulseSentiment.js';
import {filterPosts} from './pulsePostFilters.js';
import {projectPlatformOptions} from './pulseProjectFilters.js';
import { postInteractions } from './pulseEngagement.js';
import { byInteractions } from './pulseMeasures.js';

export function freezeReport(draft,generatedAt=new Date().toISOString()) {
  if(!draft.responseAnalysis.loaded||draft.responseAnalysis.error)return null;
  return structuredClone({...draft,generatedAt});
}

export function reportArchive(report) {
  return JSON.stringify({kind:'pulse-local-report-snapshot',version:1,report},null,2);
}
export function buildReport(data,topic={},period={},generatedAt=new Date().toISOString(),selectedPlatforms=null,responseAnalysis={loaded:false,error:false,response:null}) {
  const posts=structuredClone(filterPosts(data.posts||[],{...period,platforms:selectedPlatforms}));
  const counts=sentimentCounts(posts), platforms={}, authors=new Map();
  for(const p of posts){
    platforms[p.platform]=(platforms[p.platform]||0)+1;
    if(!p.author)continue;
    const key=JSON.stringify([p.platform,p.author]);
    const row=authors.get(key)||{author:p.author,platform:p.platform,mentions:0,engagement:null};
    row.mentions++;
    if(postInteractions(p.metrics)!==null)row.engagement=(row.engagement??0)+postInteractions(p.metrics);
    authors.set(key,row);
  }
  const sourceCoverage=[...new Set([...projectPlatformOptions,...(selectedPlatforms||[]),...Object.keys(platforms)])].map(platform=>({
    platform,count:platforms[platform]||0,
    status:selectedPlatforms!==null&&!selectedPlatforms.includes(platform)?'excluded':platforms[platform]?'observed':'empty',
  }));
  const scopedResponse=structuredClone(responseAnalysis);
  if(scopedResponse.response?.posts){
    const ids=new Set(posts.map(post=>post.id));
    scopedResponse.response.posts=scopedResponse.response.posts.filter(row=>ids.has(row.post_id));
  }
  return {generatedAt,topic:{label:topic.label||'Project',query:topic.query||'',id:topic.id},period:{...period},selectedPlatforms:selectedPlatforms===null?null:[...selectedPlatforms],posts,counts,platforms,sourceCoverage,
    responseAnalysis:scopedResponse,analyzed:posts.length-counts.unknown,days:sentimentTimeline(posts),
    topPosts:[...posts].sort(byInteractions).slice(0,10),
    accounts:[...authors.values()].sort((a,b)=>(b.engagement??-1)-(a.engagement??-1)||b.mentions-a.mentions).slice(0,10)};
}

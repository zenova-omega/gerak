import {buildReport} from './pulseReport.js';
import {RULES} from './pulseMeasures.js';
// A post's `measures` are the server's figures under the rules of the day they were sent. A filed report keeps the
// posts' own inputs only, and an opened one is counted again under the rules in force (decision 7).
const withoutMeasures=posts=>Array.isArray(posts)?posts.map(post=>{
 if(!post||typeof post!=='object'||!('measures' in post))return post;
 const {measures,...rest}=post;
 return rest;
}):posts;
export function archiveInput(report,title){
 if(!report?.topic?.id)throw new Error('Pilih project terlebih dahulu.');
 const keys=['topic','period','selectedPlatforms','generatedAt','posts','responseAnalysis'];
 const snapshot=Object.fromEntries(keys.map(key=>[key,report[key]]));
 snapshot.posts=withoutMeasures(snapshot.posts);
 return {topic_id:report.topic.id,title:title.trim(),snapshot:structuredClone(snapshot)};
}
export function restoreArchive(archive){
 if(archive?.version!==1||!Array.isArray(archive.snapshot?.posts))throw new Error('Versi arsip belum didukung.');
 const s=archive.snapshot;
 return buildReport({posts:withoutMeasures(s.posts)},s.topic,s.period,s.generatedAt,s.selectedPlatforms,s.responseAnalysis);
}
const ruleVersion=value=>Number((typeof value==='string'&&value.match(/_v(\d+)$/))?.[1]??0);
/** An opened archive is rebuilt with the calculation rules in force today. True when it was filed before one of them:
 * no versions stored (filed before they were recorded), a rule it does not name, or an older version of one. */
export function recounted(snapshot){
 const filed=snapshot?.rules;
 if(!filed||typeof filed!=='object')return true;
 return Object.entries(RULES).some(([name,version])=>ruleVersion(filed[name])<ruleVersion(version));
}

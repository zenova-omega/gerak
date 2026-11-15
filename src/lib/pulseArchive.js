import {buildReport} from './pulseReport.js';
import {RULES} from './pulseMeasures.js';
export function archiveInput(report,title){
 if(!report?.topic?.id)throw new Error('Pilih project terlebih dahulu.');
 const keys=['topic','period','selectedPlatforms','generatedAt','posts','responseAnalysis'];
 return {topic_id:report.topic.id,title:title.trim(),snapshot:structuredClone(Object.fromEntries(keys.map(key=>[key,report[key]])))};
}
export function restoreArchive(archive){
 if(archive?.version!==1||!Array.isArray(archive.snapshot?.posts))throw new Error('Versi arsip belum didukung.');
 const s=archive.snapshot;
 return buildReport({posts:s.posts},s.topic,s.period,s.generatedAt,s.selectedPlatforms,s.responseAnalysis);
}
const ruleVersion=value=>Number((typeof value==='string'&&value.match(/_v(\d+)$/))?.[1]??0);
/** An opened archive is rebuilt with the calculation rules in force today. True when it was filed before one of them:
 * no versions stored (filed before they were recorded), a rule it does not name, or an older version of one. */
export function recounted(snapshot){
 const filed=snapshot?.rules;
 if(!filed||typeof filed!=='object')return true;
 return Object.entries(RULES).some(([name,version])=>ruleVersion(filed[name])<ruleVersion(version));
}

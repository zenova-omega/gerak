import {buildReport} from './pulseReport.js';
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

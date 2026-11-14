import {sentimentDate} from './pulseSentiment.js';
export const emotionLabels={joy:'Senang',anger:'Marah',sadness:'Sedih',fear:'Takut',disgust:'Jijik',admiration:'Kagum',none:'Tidak jelas'};
export function postEmotion(post){
 const value=post.metrics?.emotion;
 return value&&Object.hasOwn(emotionLabels,value.label)&&typeof value.confidence==='number'&&Number.isFinite(value.confidence)&&value.confidence>=0&&value.confidence<=1&&typeof value.reason==='string'&&value.reason.trim()?value:null;
}
export function emotionEvidence(posts=[]){
 const counts=Object.fromEntries(Object.keys(emotionLabels).map(key=>[key,0]));
 const rows=Object.fromEntries(Object.keys(emotionLabels).map(key=>[key,[]]));
 const days=new Map();let unknown=0,review=0;
 for(const post of posts){
  const value=postEmotion(post);
  if(!value){unknown++;continue;}
  counts[value.label]++;rows[value.label].push(post);
  if(value.review_needed||value.confidence<.7)review++;
  const date=sentimentDate(post);
  if(date){if(!days.has(date))days.set(date,{date,...Object.fromEntries(Object.keys(emotionLabels).map(key=>[key,0]))});days.get(date)[value.label]++;}
 }
 return {counts,rows,unknown,review,analyzed:posts.length-unknown,total:posts.length,days:[...days.values()].sort((a,b)=>a.date.localeCompare(b.date))};
}

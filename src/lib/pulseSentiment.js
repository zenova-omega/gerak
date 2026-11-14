import { postSentiment } from './pulsePostFilters.js';
import { postInteractions } from './pulseEngagement.js';

export function sentimentDate(post) {
  const raw=post.published_at;
  if (!raw) return null;
  const time=Date.parse(/[Zz]|[+-]\d{2}:\d{2}$/.test(raw)?raw:raw+'Z');
  return Number.isFinite(time)?new Date(time+7*3600000).toISOString().slice(0,10):null;
}
export function sentimentTimeline(posts) {
  const days=new Map();
  for(const post of posts) {
    const date=sentimentDate(post);
    if(!date)continue;
    if(!days.has(date))days.set(date,{date,positive:0,neutral:0,negative:0,unknown:0,total:0});
    const row=days.get(date);
    row[postSentiment(post)]++;row.total++;
  }
  return [...days.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
export function sentimentDayEvidence(posts,date,label='negative') {
  const days=sentimentTimeline(posts);
  const current=days.find(row=>row.date===date)||null;
  const previousDate=date?new Date(Date.parse(date+'T00:00:00Z')-86400000).toISOString().slice(0,10):null;
  const previous=days.find(row=>row.date===previousDate)||null;
  const comparable=current&&previous&&(label==='unknown'||(current.total>current.unknown&&previous.total>previous.unknown));
  return {current,previous,previousDate,delta:comparable?current[label]-previous[label]:null,
    posts:posts.filter(post=>sentimentDate(post)===date&&postSentiment(post)===label)
      .sort((a,b)=>(postInteractions(b.metrics)??-1)-(postInteractions(a.metrics)??-1))};
}

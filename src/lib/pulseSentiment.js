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

const addDays=(date,count)=>new Date(Date.parse(date+'T00:00:00Z')+count*86400000).toISOString().slice(0,10);
/** Evidence for one sentiment over an inclusive WIB date range, compared with the same number of days just before it.
 * `from`/`to` are YYYY-MM-DD. `delta` is null when the earlier window has no analysed posts to compare with. */
export function sentimentRangeEvidence(posts,from,to,label='negative') {
  if(!from||!to||from>to)return {count:0,total:0,days:0,previous:null,delta:null,previousFrom:null,previousTo:null,posts:[]};
  const span=Math.round((Date.parse(to+'T00:00:00Z')-Date.parse(from+'T00:00:00Z'))/86400000)+1;
  const previousTo=addDays(from,-1),previousFrom=addDays(from,-span);
  const tally=(start,end)=>{const row={positive:0,neutral:0,negative:0,unknown:0,total:0};for(const post of posts){const date=sentimentDate(post);if(date&&date>=start&&date<=end){row[postSentiment(post)]++;row.total++;}}return row;};
  const current=tally(from,to),previous=tally(previousFrom,previousTo);
  const comparable=previous.total>0&&(label==='unknown'||(current.total>current.unknown&&previous.total>previous.unknown));
  return {count:current[label],total:current.total,days:span,previous:previous.total?previous[label]:null,delta:comparable?current[label]-previous[label]:null,previousFrom,previousTo,
    posts:posts.filter(post=>{const date=sentimentDate(post);return date&&date>=from&&date<=to&&postSentiment(post)===label;})
      .sort((a,b)=>(postInteractions(b.metrics)??-1)-(postInteractions(a.metrics)??-1))};
}
/** The preset ranges for the evidence picker, anchored on the last day that has data. */
export function sentimentRanges(days) {
  const last=days.at(-1)?.date,first=days[0]?.date;
  if(!last)return [];
  const back=count=>{const start=addDays(last,-(count-1));return start<first?first:start;};
  return [{key:'1',label:'Hari terakhir',from:last,to:last},{key:'7',label:'7 hari',from:back(7),to:last},{key:'30',label:'30 hari',from:back(30),to:last},{key:'all',label:'Semua',from:first,to:last}];
}

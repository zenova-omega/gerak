import { postMedia } from './pulseMedia.js';
import { postInteractions } from './pulseEngagement.js';
import { byInteractions, inPeriod, localDay, postAccount, readTime, tone } from './pulseMeasures.js';
// `province` is applied by the Posting page with `namesProvince` (pulsePlaces.js), not by filterPosts: the place reader
// depends on this module's neighbours, and a filter here would close an import circle.
export const defaultPostFilters = { platforms:null,sentiments:null,query:'',author:'',exactAuthor:'',account:'',province:'',from:'',to:'',minEngagement:'',media:'all',sort:'engagement' };
export const sentimentLabels = {positive:'Positif',neutral:'Netral',negative:'Negatif',unknown:'Belum dianalisis'};
/** A post's tone (tone_share_v2): the one the server sent in `measures`, else the module's reading of the stored label. */
export function postSentiment(post) {
  return post?.measures?.tone ?? tone(post);
}
export function sentimentCounts(posts) {
  return posts.reduce((counts,post)=>{counts[postSentiment(post)]++;return counts;},{positive:0,neutral:0,negative:0,unknown:0});
}
export function parseSavedViews(raw) {
  try {
    const values=JSON.parse(raw);
    if(!Array.isArray(values)) return [];
    return values.slice(0,20).filter(v=>{
      if(!v || typeof v.name!=='string' || !v.name.trim() || !v.filters || typeof v.filters!=='object')return false;
      return Object.entries(defaultPostFilters).every(([key,initial])=>{
        const value=v.filters[key];
        return value===undefined || (initial===null ? value===null || (Array.isArray(value)&&value.every(s=>typeof s==='string')) : typeof value==='string');
      });
    }).map(v=>({name:v.name.slice(0,60),filters:{...Object.fromEntries(Object.entries(defaultPostFilters).map(([key,initial])=>[key,v.filters[key]===undefined?initial:v.filters[key]])),from:'',to:''}}));
  }catch{return [];}
}
const postTime = raw => readTime(raw) ?? -Infinity;
export function filterPosts(posts, filters) {
  // The Posting page opens on the largest interactions; callers that pass no sort keep chronological order.
  const f = { ...defaultPostFilters, sort:'oldest', ...filters };
  const rank = post => post.metrics?.[f.sort] ?? -1;
  const platforms = filters?.platforms === undefined && filters?.platform && filters.platform !== 'all' ? [filters.platform] : f.platforms;
  return posts.filter(p => {
    const media = Boolean(postMedia(p).imageUrl);
    return (platforms === null || platforms.includes(p.platform))
      && (f.sentiments === null || f.sentiments.includes(postSentiment(p)))
      && `${p.title || ''} ${p.text || ''} ${p.author || ''}`.toLowerCase().includes(f.query.trim().toLowerCase())
      && (p.author || '').toLowerCase().includes(f.author.trim().toLowerCase())
      && (!f.exactAuthor || p.author === f.exactAuthor)
      && (!f.account || postAccount(p) === f.account)   // account_v1: every name the account posted under
      && inPeriod(p.published_at, f.from, f.to)
      && (f.minEngagement === '' || (postInteractions(p.metrics) != null && postInteractions(p.metrics) >= Number(f.minEngagement)))
      && (f.media === 'all' || (f.media === 'available' ? media : !media));
  }).sort((a,b)=>f.sort === 'oldest' ? ((Number.isFinite(postTime(a.published_at))?postTime(a.published_at):Infinity)-(Number.isFinite(postTime(b.published_at))?postTime(b.published_at):Infinity) || 0) : f.sort === 'recent' ? (postTime(b.published_at)-postTime(a.published_at) || 0) : f.sort === 'engagement' ? byInteractions(a,b) : rank(b)-rank(a) || (postTime(b.published_at)-postTime(a.published_at) || 0));
}

export function dailyPostCounts(posts) {
  const days = new Map();
  for (const post of posts) {
    const date = localDay(post.published_at);
    if (!date) continue;
    days.set(date,(days.get(date)||0)+1);
  }
  return [...days].sort(([a],[b])=>a.localeCompare(b)).map(([date,count])=>({date,count}));
}

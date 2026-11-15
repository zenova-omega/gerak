import { sentimentCounts, postSentiment } from './pulsePostFilters.js';
import { sentimentTimeline } from './pulseSentiment.js';
import { accountName, byInteractions, hasClock, interactionsTotal, localDay, postAccount, readTime } from './pulseMeasures.js';

// "Kanal pertama" (clock_v1): a channel's first post is found by its day; on that day a post with a clock comes before
// one whose source gave a date only, which never takes part in the order by time.
const firstOrder=value=>{const day=localDay(value);return day===null?null:[day,hasClock(value)?0:1,hasClock(value)?readTime(value):0];};
const byFirst=(a,b)=>{const x=firstOrder(a),y=firstOrder(b);if(!x||!y)return (x?0:1)-(y?0:1);return x[0]<y[0]?-1:x[0]>y[0]?1:x[1]-y[1]||x[2]-y[2];};

export function previousPeriod({from,to}={}) {
  if(!from||!to)return null;
  const start=Date.parse(from+'T00:00:00Z'),end=Date.parse(to+'T00:00:00Z');
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<start)return null;
  return {from:new Date(start-(end-start+86400000)).toISOString().slice(0,10),to:new Date(start-86400000).toISOString().slice(0,10)};
}
export function reviewEvidence(posts,reviews=[]){
 const byId=new Map(reviews.map(r=>[r.post_id,r]));let paired=0,correct=0;
 const needsReview=[];
 for(const p of posts){
  const review=byId.get(p.id),label=postSentiment(p),manual=review?.manual_sentiment;
  const hasManual=['positive','neutral','negative'].includes(manual),hasAI=label!=='unknown';
  if(hasAI&&hasManual){paired++;if(label===manual)correct++;}
  const confidence=p.metrics?.sentiment?.confidence;
  if(review?.review_needed||(hasAI&&Number.isFinite(confidence)&&confidence<0.65)||(hasAI&&hasManual&&label!==manual))needsReview.push(p);
 }
 return {paired,correct,accuracy:paired?correct/paired:null,needsReview};
}
function contentKey(post){
  const text=[post.title||'',post.text||''].join('\n').normalize('NFKC').toLocaleLowerCase('id-ID').replace(/\s+/g,' ').trim();
  return text?`text:${text}`:`post:${post.id||post.url}`;
}
export function sourceText(post){
 const entities={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'",'&nbsp;':' '};
 return (post.text||post.title||'').replace(/<[^>]*>/g,' ').replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&nbsp;/g,s=>entities[s]).replace(/\s+/g,' ').trim();
}
export function overviewEvidence(input=[],{platforms=null,excludedIds=[],previousPosts=null}={}) {
  const excluded=new Set(excludedIds);
  const filter=p=>!excluded.has(p.id)&&(platforms===null||platforms.includes(p.platform));
  const posts=input.filter(filter),counts=sentimentCounts(posts),authors=new Map(),sources=new Map(),groups=new Map(),content=new Set();
  let updatedAt=null;
  for(const p of posts){
    content.add(contentKey(p));
    if(p.crawled_at&&(!updatedAt||p.crawled_at>updatedAt))updatedAt=p.crawled_at;
    const account=postAccount(p);   // account_v1; a post without a name can still have one
    if(account){const row=authors.get(account)||{key:account,author:p.author,platform:p.platform,mentions:0,engagement:null,interaction_posts:0,post:p,rows:[]};row.mentions++;row.rows.push(p);authors.set(account,row);}
    const source=sources.get(p.platform)||{platform:p.platform,count:0,firstPublished:null,firstObserved:null,dateOnly:0};source.count++;
    if(firstOrder(p.published_at)&&(!source.firstPublished||byFirst(p.published_at,source.firstPublished)<0))source.firstPublished=p.published_at;
    if(firstOrder(p.published_at)&&!hasClock(p.published_at))source.dateOnly++;
    if(p.first_observed_at&&(!source.firstObserved||p.first_observed_at<source.firstObserved))source.firstObserved=p.first_observed_at;
    sources.set(p.platform,source);
    const key=p.issue_id||contentKey(p);if(!groups.has(key))groups.set(key,{id:key,title:p.title||p.text||'Posting tanpa teks',posts:[],previous:0});groups.get(key).posts.push(p);
  }
  const {value:engagement,posts:engagementCoverage}=interactionsTotal(posts);
  for(const row of authors.values()){const total=interactionsTotal(row.rows);row.engagement=total.value;row.interaction_posts=total.posts;row.author=accountName(row.rows);delete row.rows;}
  const previous=previousPosts===null?null:previousPosts.filter(filter);
  if(previous)for(const p of previous){const key=p.issue_id||contentKey(p);if(groups.has(key))groups.get(key).previous++;}
  return {posts,counts,analyzed:posts.length-counts.unknown,engagement,engagementCoverage,updatedAt,
    uniqueContent:content.size,duplicates:posts.length-content.size,
    accounts:[...authors.values()].sort((a,b)=>(b.engagement??-1)-(a.engagement??-1)||b.mentions-a.mentions),
    platforms:[...sources.values()].sort((a,b)=>b.count-a.count),
    platformTimeline:[...sources.values()].sort((a,b)=>byFirst(a.firstPublished,b.firstPublished)),
    platformTimelineDateOnly:[...sources.values()].reduce((sum,source)=>sum+source.dateOnly,0),
    narratives:[...groups.values()].filter(g=>g.posts.length>1).sort((a,b)=>b.posts.length-a.posts.length),
    days:sentimentTimeline(posts),topPosts:[...posts].sort(byInteractions).slice(0,5),
    volumeChange:previous===null?null:{previous:previous.length,delta:posts.length-previous.length,percent:previous.length?(posts.length-previous.length)/previous.length*100:null}};
}

/** Where a narrative's posts are: its platforms with their post counts, most first (a tie is ordered by name, so the
 * order does not jump between refreshes), at most `limit`. `more` counts the platforms left out. A post without a
 * platform is not given one. */
export function narrativePlatforms(posts=[],limit=4){
  const counts=new Map();
  for(const post of posts)if(post?.platform)counts.set(post.platform,(counts.get(post.platform)||0)+1);
  const rows=[...counts].map(([platform,count])=>({platform,count})).sort((a,b)=>b.count-a.count||a.platform.localeCompare(b.platform));
  return {rows:rows.slice(0,limit),more:Math.max(0,rows.length-limit)};
}

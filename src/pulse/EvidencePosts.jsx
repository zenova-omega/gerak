import {useState} from 'react';
import {Copy} from 'lucide-react';
import {PulseArrow} from '../components/ui/PulseArrow';
import {PulseSourceHeading} from '../components/ui/PulsePatterns';
import {PulseButton} from '../components/ui/PulseUI';
import {SentimentTag} from '../components/ui/PulseTag';
import {PulseMetricRow} from '../components/ui/PulseMetricRow';
import {sentimentColor} from '../lib/pulseChartTheme';
import {contentShares,postInteractions} from '../lib/pulseEngagement';
import {accountCount,accountName,interactionsTotal,postAccount,sharesTotal,toneShares} from '../lib/pulseMeasures';
import {sourceText} from '../lib/pulseOverview';
import {sentimentLabels,postSentiment} from '../lib/pulsePostFilters';
import {formatCount,pulseDate,safeSourceUrl} from '../lib/pulseData';
import {platformLabel} from '../components/admin/pulse/PlatformIcon';
import PostAvatar from '../components/admin/pulse/PostAvatar';
import PostMediaPreview from '../components/admin/pulse/PostMediaPreview';
import EvidenceDrawer from './EvidenceDrawer';
import {sumOf,dateRange} from './evidenceFigures';

/** What a set of posts amounts to, before reading them one by one. `oneContent`: the posts are one piece of content
 * (a conversation group), so "dibagikan" is content_shares_v1; any other set takes shares_total_v1. */
function EvidenceSummary({posts,oneContent=false}){
 const tone={positive:0,neutral:0,negative:0};
 for(const p of posts){const key=postSentiment(p);if(key in tone)tone[key]++;}
 const analysed=tone.positive+tone.neutral+tone.negative,accounts=accountCount(posts);
 const interactions=interactionsTotal(posts);
 // Interactions always show: an unknown total reads "—" (formatCount), never a number or a missing figure.
 const figures=[['posting',posts.length],['akun',accounts],[interactions.posts?`interaksi dari ${formatCount(interactions.posts)} posting`:'interaksi',interactions.value,true],['dibagikan',oneContent?contentShares(posts):sharesTotal(posts)],['tayangan',sumOf(posts,'views')]].filter(([,value,always])=>always||value!=null);
 const tones=['negative','neutral','positive'].filter(key=>tone[key]>0),range=dateRange(posts),share=toneShares(tone).text;   // tone_share_v1
 return <section className="ped-summary sig" aria-label="Ringkasan posting pilihan">
  <div className="sig-figures">{figures.map(([label,value])=><div className="sig-figure" key={label}><strong>{formatCount(value)}</strong><span>{label}</span></div>)}{range&&<div className="sig-figure"><strong data-kind="text">{range}</strong><span>terbit</span></div>}</div>
  {analysed>0&&(tones.length===1?<SentimentTag value={tones[0]}/>:<div className="ped-tone"><div className="sig-bar" role="img" aria-label={tones.map(key=>`${sentimentLabels[key]} ${share[key]}`).join(', ')}>{tones.map(key=><span key={key} style={{flexGrow:tone[key],background:sentimentColor[key]}}/>)}</div><ul>{tones.map(key=><li key={key}><i style={{background:sentimentColor[key]}}/><strong>{share[key]}</strong><span>{sentimentLabels[key].toLowerCase()}</span></li>)}</ul></div>)}
 </section>;
}
const sameText=p=>(sourceText(p)||'').replace(/\s+/g,' ').trim().toLowerCase();
function EvidencePosts({posts,limit=20,oneContent=false}){
 // Posts that carry the same words (reposts, copies) are read once, with the accounts that shared them listed under the text.
 const groups=[];const byText=new Map();
 for(const p of posts.slice(0,limit)){const key=sameText(p);if(key&&byText.has(key))byText.get(key).push(p);else{const group=[p];if(key)byText.set(key,group);groups.push(group);}}
 return <><EvidenceSummary posts={posts} oneContent={oneContent}/><ol className="po-evidence-list">{groups.map(group=>group.length>1?<EvidenceCopies key={group[0].id} posts={group}/>:<EvidencePost key={group[0].id} post={group[0]}/>)}</ol></>;
}
function EvidenceCopies({posts}){
 const [open,setOpen]=useState(false),first=posts[0],caption=sourceText(first)||'Teks belum tersedia';
 const totals={likes:sumOf(posts,'likes'),comments:sumOf(posts,'comments'),shares:contentShares(posts),views:sumOf(posts,'views')};   // copies of one text are one piece of content
 const keys=posts.map(postAccount),accounts=accountCount(posts),oneAccount=keys.every(key=>key&&key===keys[0]);   // every post from one account
 return <li className="ped-copies">
  <header><span className="ped-copies-mark" aria-hidden="true"><Copy size={16}/></span><div><strong>{formatCount(posts.length)} posting dengan teks yang sama</strong><small>{oneAccount?`${accountName(posts)||'Satu akun'} · ${platformLabel(first.platform)}`:`Dari ${formatCount(accounts)} akun`} · {dateRange(posts)}</small></div><SentimentTag value={postSentiment(first)}/></header>
  <p className="ped-text">{caption.slice(0,420)}{caption.length>420?'…':''}</p>
  <PulseMetricRow metrics={totals} platform={first.platform}/>
  <table className="ped-accounts"><caption className="pu-sr">Posting dengan teks ini</caption><thead><tr><th scope="col">{oneAccount?'Waktu terbit':'Akun'}</th><th scope="col">Interaksi</th><th scope="col"><span className="pu-sr">Tautan</span></th></tr></thead>
   <tbody>{posts.slice(0,open?posts.length:4).map(p=><tr key={p.id}><th scope="row">{oneAccount?<span className="ped-when">{pulseDate(p.published_at)}</span>:<span className="ped-who"><PostAvatar post={p}/><span><strong>{p.author||'Nama tidak tersedia'}</strong><small>{platformLabel(p.platform)} · {pulseDate(p.published_at)}</small></span></span>}</th><td>{postInteractions(p.metrics)==null?'—':formatCount(postInteractions(p.metrics))}</td><td>{safeSourceUrl(p.url)&&<a href={safeSourceUrl(p.url)} target="_blank" rel="noopener noreferrer" aria-label={'Buka posting '+(p.author||'')+' '+pulseDate(p.published_at)}><PulseArrow/></a>}</td></tr>)}</tbody></table>
  {posts.length>4&&<PulseButton size="sm" variant="quiet" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{open?'Ringkas daftar':`Lihat ${formatCount(posts.length-4)} posting lainnya`}</PulseButton>}
 </li>;
}
/** Stored comments of one post: the most liked first, the rest behind a disclosure. */
function EvidenceComments({post}){
 const [limit,setLimit]=useState(10);
 const snapshot=post.metrics?.comment_snapshot;
 const items=snapshot?.status==='success'?[...(snapshot.items||[])].sort((a,b)=>(b.likes??-1)-(a.likes??-1)):[];
 const row=c=><li key={c.id}><p>{c.text}</p><span>{c.author||'Penulis tidak tersedia'}{c.likes!=null&&<> · {formatCount(c.likes)} suka</>}{c.published_at&&<> · {pulseDate(c.published_at)}</>}</span></li>;
 if(!items.length)return null;
 return <details className="ped-comments" aria-label={'Komentar pada posting '+(post.author||'')}>
  <summary>{formatCount(items.length)} komentar tersimpan</summary>
  <ol>{items.slice(0,3+limit).map(row)}</ol>
  {items.length>3+limit&&<PulseButton size="sm" variant="quiet" onClick={()=>setLimit(value=>value+20)}>Tampilkan lebih banyak</PulseButton>}
 </details>;
}
function EvidencePost({post:p}){
 const [expanded,setExpanded]=useState(false);
 const caption=sourceText(p)||'Teks belum tersedia';
 return <li><PulseSourceHeading post={p}><SentimentTag value={postSentiment(p)}/>{safeSourceUrl(p.url)&&<a href={safeSourceUrl(p.url)} target="_blank" rel="noopener noreferrer" aria-label={'Buka posting '+(p.author||'')+' di sumbernya'}><PulseArrow/></a>}</PulseSourceHeading>
  <p className="ped-text">{expanded?caption:caption.slice(0,420)}{!expanded&&caption.length>420?'…':''}</p>
  {caption.length>420&&<PulseButton size="sm" variant="quiet" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded?'Ringkas':'Baca selengkapnya'}</PulseButton>}
  <PostMediaPreview post={p} links={false}/>
  <PulseMetricRow metrics={p.metrics} platform={p.platform} hideEmpty/>
  <EvidenceComments post={p}/>
 </li>;
}
export {EvidencePosts};

/** The drawer that opens the posts behind a number: `selection` is `{title, posts, oneContent?}` or null. Shared by every page that
 * lets a figure open its posts, so a post reads the same wherever it is opened from. */
export function EvidenceSheet({selection,onClose}){
 return <EvidenceDrawer open={Boolean(selection)} onClose={onClose} title={selection?.title||'Posting sumber'} description={selection?selection.posts.length+' posting':''}>{selection&&<><EvidencePosts posts={selection.posts} oneContent={Boolean(selection.oneContent)}/>{selection.posts.length>20&&<p>20 pertama dari {selection.posts.length} posting.</p>}</>}</EvidenceDrawer>;
}

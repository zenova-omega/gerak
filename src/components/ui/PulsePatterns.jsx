import { useContext, useMemo } from 'react';
import { Link, useInRouterContext } from 'react-router-dom';
import { PulseArrow } from './PulseArrow';
import { PlatformTag } from './PulseTag';
import { ProjectPostsContext } from '../../pulse/projectPosts';
import { postInteractions } from '../../lib/pulseEngagement';
import { postSentiment, sentimentLabels } from '../../lib/pulsePostFilters';
import { accountPostsLink } from '../../lib/pulseDrilldown';
import { postAccount } from '../../lib/pulseMeasures';
import InfoTip from '../../pulse/InfoTip';
import PostAvatar from '../admin/pulse/PostAvatar';
import {platformLabel} from '../admin/pulse/PlatformIcon';
import {pulseDate,formatCount} from '../../lib/pulseData';
import {postMedia} from '../../lib/pulseMedia';
import './pulse-patterns.css';

/** Shared identity layout, with optional rank and independently actionable trailing slot. */
export function PulseSourceHeading({post,rank,children,linkProfile=false}) {
 const profile=linkProfile?postMedia(post).profileUrl:null;
 const name=post.author||'Nama sumber tidak tersedia';
 const all=useContext(ProjectPostsContext),routed=useInRouterContext();
 const search=typeof window==='undefined'?'':window.location.search;
 const account=useMemo(()=>{
  const key=all?postAccount(post):null;   // account_v1: every name the account posted under
  if(!key)return null;
  const rows=all.filter(p=>postAccount(p)===key);
  if(rows.length<2)return null;   // one post: the card already says everything
  const sums=rows.map(p=>postInteractions(p.metrics)).filter(v=>v!=null),tone={positive:0,neutral:0,negative:0,unknown:0};
  for(const p of rows)tone[postSentiment(p)]++;
  return {key,posts:rows.length,interactions:sums.length?sums.reduce((a,b)=>a+b,0):null,tone};
 },[all,post]);
 return <header className="pu-source-heading">
  {rank!=null&&<span className="pu-rank" aria-label={`Peringkat ${rank}`}>{String(rank).padStart(2,'0')}</span>}
  <PostAvatar post={post}/>
  <div className="pu-source-name" data-has-account={account?'':undefined} tabIndex={account&&!profile?0:undefined}>{account&&<aside className="pu-account-pop" role="tooltip"><header><PlatformTag size="sm" platform={post.platform}/><strong>{name}</strong></header><dl><div><dt>Posting dalam cakupan</dt><dd>{formatCount(account.posts)}</dd></div><div><dt>Total interaksi</dt><dd>{account.interactions==null?'—':formatCount(account.interactions)}</dd></div></dl><p>{['positive','neutral','negative'].filter(k=>account.tone[k]).map(k=>`${formatCount(account.tone[k])} ${sentimentLabels[k].toLowerCase()}`).join(' · ')||'Sentimen belum dianalisis'}</p>{routed&&<Link to={accountPostsLink(search,{key:account.key,author:post.author,platform:post.platform})}>Lihat semua postingnya <PulseArrow/></Link>}</aside>}<strong>{profile?<a href={profile} target="_blank" rel="noopener noreferrer">{name}</a>:name}</strong><small>{platformLabel(post.platform)} · {pulseDate(post.published_at)}</small></div>
  {children&&<div className="pu-source-actions">{children}</div>}
 </header>;
}

/** Use in existing surfaces without adding an extra card or changing domain behaviour. */
export function PulsePanelHeading({title,description,children,icon:Icon}) {
 return <header className="pu-panel-heading"><div><h2>{Icon&&<Icon size={20} aria-hidden="true"/>}{title}</h2>{description&&<p>{description}</p>}</div>{children&&<div className="pu-panel-actions">{children}</div>}</header>;
}

/** The heading of every PULSE page: mark, title with its guide, a five-word purpose, actions on the right.
 * Explanations live behind the info button, never in a row of their own.
 * @param {{icon?: import('react').ElementType, title: string, tagline?: import('react').ReactNode, guide?: [string, import('react').ReactNode], children?: import('react').ReactNode}} props
 */
export function PulsePageHead({icon:Icon,title,tagline,guide,children}) {
 return <header className="pu-page-head">
  {Icon&&<span className="pu-page-mark" aria-hidden="true"><Icon size={22} strokeWidth={1.75}/></span>}
  <div className="pu-page-title"><div className="pu-page-title-row"><h1>{title}</h1>{guide&&<InfoTip label={guide[0]}>{guide[1]}</InfoTip>}</div>{tagline&&<p>{tagline}</p>}</div>
  {children&&<div className="pu-page-actions">{children}</div>}
 </header>;
}

/** Placeholder with the shape of the page that is loading, so content does not jump when it arrives.
 * `rows` is the number of list rows; the status text is for screen readers. */
export function PulseSkeleton({label='Memuat data…',stats=4,panels=2,rows=4}) {
 return <div className="pu-skeleton" role="status" aria-busy="true"><span className="pu-sr">{label}</span>
  {stats>0&&<div className="pu-skeleton-stats" aria-hidden="true">{Array.from({length:stats},(_,i)=><div key={i}><i style={{width:'46%'}}/><i className="lg" style={{width:'34%'}}/><i style={{width:'62%'}}/></div>)}</div>}
  {panels>0&&<div className="pu-skeleton-panels" aria-hidden="true">{Array.from({length:panels},(_,i)=><div key={i}><i className="title" style={{width:'38%'}}/><i className="block"/></div>)}</div>}
  {rows>0&&<div className="pu-skeleton-rows" aria-hidden="true">{Array.from({length:rows},(_,i)=><div key={i}><i className="dot"/><span><i style={{width:`${28+(i*7)%20}%`}}/><i style={{width:`${70-(i*9)%25}%`}}/></span></div>)}</div>}
 </div>;
}

import PostAvatar from '../admin/pulse/PostAvatar';
import {platformLabel} from '../admin/pulse/PlatformIcon';
import {pulseDate} from '../../lib/pulseData';
import {postMedia} from '../../lib/pulseMedia';
import './pulse-patterns.css';

/** Shared identity layout, with optional rank and independently actionable trailing slot. */
export function PulseSourceHeading({post,rank,children,linkProfile=false}) {
 const profile=linkProfile?postMedia(post).profileUrl:null;
 const name=post.author||'Nama sumber tidak tersedia';
 return <header className="pu-source-heading">
  {rank!=null&&<span className="pu-rank" aria-label={`Peringkat ${rank}`}>{String(rank).padStart(2,'0')}</span>}
  <PostAvatar post={post}/>
  <div className="pu-source-name"><strong>{profile?<a href={profile} target="_blank" rel="noopener noreferrer">{name}</a>:name}</strong><small>{platformLabel(post.platform)} · {pulseDate(post.published_at)}</small></div>
  {children&&<div className="pu-source-actions">{children}</div>}
 </header>;
}

/** Use in existing surfaces without adding an extra card or changing domain behaviour. */
export function PulsePanelHeading({title,description,children,icon:Icon}) {
 return <header className="pu-panel-heading"><div><h2>{Icon&&<Icon size={20} aria-hidden="true"/>}{title}</h2>{description&&<p>{description}</p>}</div>{children&&<div className="pu-panel-actions">{children}</div>}</header>;
}

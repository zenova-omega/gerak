import { PulseArrow } from '../components/ui/PulseArrow';
import {PulseEngagement} from '../components/ui/PulseEngagement';
import {PulseSourceHeading} from '../components/ui/PulsePatterns';
import {safeSourceUrl} from '../lib/pulseData';


export default function ReportPostCard({post,rank}) {
 const url=safeSourceUrl(post.url);
 const caption=post.text||post.title||'Teks tidak tersedia';
 return <li className="pr-evidence">
  <PulseSourceHeading post={post} rank={rank}/>
  <p className="pr-caption-label">{post.platform==='news'?'Teks sumber berita':'Caption asli'}</p>
  <p className="pr-caption">{caption.slice(0,600)}{caption.length>600?'…':''}</p>
  <div className="pr-evidence-interactions"><PulseEngagement metrics={post.metrics} platform={post.platform} compact label="Rincian interaksi posting"/></div>
  <div className="pr-evidence-footer">{url&&<a href={url} target="_blank" rel="noopener noreferrer">Posting asli <PulseArrow decorative size={16}/></a>}</div>
  {url&&<p className="pr-print-source">{url}</p>}
 </li>;
}

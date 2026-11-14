import { PulseArrow } from '../components/ui/PulseArrow';
import {useState} from 'react';
import {conversationGroups} from '../lib/pulseConversationGroups';
import {sourceText} from '../lib/pulseOverview';
import {formatCount,pulseDate,safeSourceUrl} from '../lib/pulseData';
import {PlatformIcon,platformLabel} from '../components/admin/pulse/PlatformIcon';
import {PulseButton} from '../components/ui/PulseUI';
import './conversation-groups.css';
import InfoTip from './InfoTip';

export default function ConversationGroups({posts=[],period={},platforms=null}){
 const [sort,setSort]=useState('volume'),[limit,setLimit]=useState(20);
 const result=conversationGroups(posts,{...period,platforms},sort);
 return <section className="pcg-groups" aria-label="Kelompok percakapan sesuai filter project">
  <header><div><h2>Kelompok percakapan <InfoTip label="Tentang kelompok percakapan">Platform dan periode mengikuti pilihan project. Jumlah dan sumber di setiap kelompok hanya berasal dari posting terpilih. Kelompok berasal dari kemiripan teks, bukan bukti koordinasi.</InfoTip></h2></div><strong>{result.groups.length} kelompok · {result.totalPosts} posting</strong></header>
  <div className="pcg-controls"><label>Urutkan kelompok<select value={sort} onChange={e=>{setSort(e.target.value);setLimit(20);}}><option value="volume">Posting terbanyak</option><option value="recent">Publikasi terbaru</option></select></label></div>
  {result.ungrouped>0&&<p>{result.ungrouped} posting belum memiliki kelompok. Posting tersebut tetap tersedia pada tampilan Posting individual.</p>}
  {result.groups.slice(0,limit).map(group=><details className="pcg-group" key={group.id}><summary><span className="pcg-title">{group.title.slice(0,180)}{group.title.length>180?'…':''}</span><span className="pcg-metrics"><b>{group.posts.length} posting</b><span>{group.authors} akun / sumber</span><span>{formatCount(group.engagement)} interaksi</span></span></summary><div className="pcg-evidence"><p className="pcg-note">Contoh judul diambil dari posting dalam filter, bukan kesimpulan PULSE. {group.engagementCoverage} dari {group.posts.length} posting memiliki metrik interaksi. Akun dihitung per platform.</p><ul>{group.posts.map(post=><li key={post.id}><div><PlatformIcon platform={post.platform}/><strong>{post.author||'Sumber tanpa nama'}</strong><span>{platformLabel(post.platform)} · {pulseDate(post.published_at)}</span></div><p>{sourceText(post)||'Teks tidak tersedia'}</p>{safeSourceUrl(post.url)&&<a href={safeSourceUrl(post.url)} target="_blank" rel="noopener noreferrer">Buka posting asli <PulseArrow/></a>}</li>)}</ul></div></details>)}
  {!result.groups.length&&<p className="pulse-empty">Tidak ada kelompok pada platform dan periode ini. Ubah pilihan project atau periksa Posting individual.</p>}
  {result.groups.length>limit&&<PulseButton onClick={()=>setLimit(value=>value+20)}>Tampilkan 20 kelompok berikutnya</PulseButton>}
 </section>;
}

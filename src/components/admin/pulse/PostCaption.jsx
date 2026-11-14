import { useId, useState } from 'react';
import { PulseButton } from '../../ui/PulseUI';
/** Original source text, never presented as a PULSE analytical conclusion. */
export default function PostCaption({post}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const text=post.text||post.title;
  const long = text?.length > 420;
  return <div className="pulse-post-copy pu-source-copy" data-collapsed={long && !expanded}>
    <span className="pu-eyebrow">{post.platform==='news'?'Teks sumber berita':'Caption asli'}</span>
    {post.platform==='news'&&post.title&&<h3>{post.title}</h3>}
    {text?<><p id={id} className="pu-source-excerpt">{long && !expanded ? text.slice(0,420) + '…' : text}</p>{long && <PulseButton className="pm-caption-toggle" variant="quiet" aria-expanded={expanded} aria-controls={id} onClick={()=>setExpanded(!expanded)}>{expanded ? 'Ringkas caption' : 'Baca selengkapnya'}</PulseButton>}</>:<p className="pu-source-excerpt">Teks posting tidak tersedia.</p>}
  </div>;
}

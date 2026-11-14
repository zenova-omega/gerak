import { PulseArrow } from '../components/ui/PulseArrow';
import { MessageCircle } from 'lucide-react';
import PostAvatar from '../components/admin/pulse/PostAvatar';
import { platformLabel } from '../components/admin/pulse/PlatformIcon';
import { formatCount, pulseDate } from '../lib/pulseData';
import { sourceText } from '../lib/pulseOverview';
import './top-post-summary.css';
import {postInteractions} from '../lib/pulseEngagement';

export default function TopPostSummary({ post, onOpen }) {
  const author = post.author || platformLabel(post.platform);
  return <button type="button" className="ptp-row" onClick={onOpen} aria-label={'Lihat posting '+author}>
    <span className="ptp-identity">
      <PostAvatar post={post}/>
      <span className="ptp-publisher"><strong>{author}</strong><small>{platformLabel(post.platform)} · {pulseDate(post.published_at)}</small></span>
      <PulseArrow decorative size={17} className="ptp-arrow"/>
    </span>
    <span className="ptp-source-label">Caption asli</span>
    <p className="ptp-caption">{sourceText(post) || 'Teks belum tersedia'}</p>
    <span className="ptp-footer"><span className="ptp-total"><MessageCircle size={15} aria-hidden="true"/><strong>{formatCount(postInteractions(post.metrics))}</strong> interaksi</span><span className="ptp-action">Lihat posting</span></span>
  </button>;
}

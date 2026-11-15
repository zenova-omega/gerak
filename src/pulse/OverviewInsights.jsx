import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { packCloud, cloudSize } from '../lib/pulseCloud';
import PostAvatar from '../components/admin/pulse/PostAvatar';
import EmojiCloud from './EmojiCloud';
import AnalyticsPanel from './AnalyticsPanel';
import { PulsePanelEmpty } from '../components/ui/PulseAnalytics';
import { PulseView } from '../components/ui/PulseMetricIcons';
import { topEmoji, topHashtags, seeded } from '../lib/pulseEmoji';
import { formatCount, safeSourceUrl } from '../lib/pulseData';

const clean = post => (post.title || post.text || '').replace(/\s+/g, ' ').trim();
// The categorical chart palette: readable in both themes and not tied to sentiment or platform.
// Words are text, so each series colour leans on the ink: darker on a light panel, lighter on a dark one (4.5:1 and more).
const tones = [1, 2, 3, 4, 5, 6].map(n => `color-mix(in oklab, var(--ps-chart-${n}) 80%, var(--ps-ink))`);

/** Hashtags as a packed word cloud: size follows use on a log scale, about one in four stands upright. */
function HashtagCloud({ rows, search }) {
  const navigate = useNavigate();
  const W = 1000, H = 360, max = rows[0]?.count || 1, min = rows.at(-1)?.count || 1;
  const placed = useMemo(() => packCloud(rows.map((row, index) => {
    const size = cloudSize(row.count, min, max, 15, 68), length = row.tag.length * size * 0.68, upright = index > 1 && row.tag.length < 16 && seeded(row.tag, 3) > .72;
    return { key: row.tag, row, size, upright, w: upright ? size * 1.05 : length, h: upright ? length : size * 1.05, tint: tones[Math.floor(seeded(row.tag, 5) * tones.length)] };
  }), { width: W, height: H, gap: 10 }), [rows, min, max]);
  const open = tag => { const next = new URLSearchParams(search); next.set('find', tag); navigate('/pulse/posts?' + next); };
  return <svg className="oi-tag-cloud" viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Awan tagar. Pilih tagar untuk membuka postingnya.">
    {placed.map(item => { const cx = item.x + item.w / 2, cy = item.y + item.h / 2;
      return <text key={item.key} x={cx} y={cy} fontSize={item.size} fill={item.tint} textAnchor="middle" dominantBaseline="central" transform={item.upright ? `rotate(-90 ${cx} ${cy})` : undefined}
        role="link" tabIndex={0} aria-label={`${item.row.tag}, ${formatCount(item.row.count)} posting`} onClick={() => open(item.row.tag)} onKeyDown={event => { if (event.key === 'Enter') open(item.row.tag); }}><title>{`${item.row.tag}: ${formatCount(item.row.count)} posting`}</title>{item.row.tag}</text>; })}
  </svg>;
}

/** Top posts by views. Never called reach: views are plays or impressions, not unique accounts. */
export function MostSeenPanel({ posts = [] }) {
  const seen = useMemo(() => posts.filter(post => Number.isFinite(post.metrics?.views)).sort((a, b) => b.metrics.views - a.metrics.views).slice(0, 5), [posts]);
  const withViews = posts.filter(post => Number.isFinite(post.metrics?.views)).length;
  return <AnalyticsPanel title="Paling banyak dilihat" description="Top posting menurut tayangan." footer={`${formatCount(withViews)} dari ${formatCount(posts.length)} posting punya angka tayangan. Tayangan adalah jumlah tampil atau putar, bukan jangkauan akun unik.`}>
    {seen.length ? <ol className="oi-top">{seen.map((post, index) => <li key={post.id}>
      <span className="oi-rank">{index + 1}</span><PostAvatar post={post} />
      <div><strong>{post.author || 'Nama tidak tersedia'}</strong><p>{clean(post).slice(0, 110) || 'Teks tidak tersedia'}</p></div>
      <span className="oi-views"><PulseView size={15} /><b>{formatCount(post.metrics.views)}</b></span>
      {safeSourceUrl(post.url) && <a className="oi-cover" href={safeSourceUrl(post.url)} target="_blank" rel="noopener noreferrer" aria-label={`Buka posting ${post.author || ''} di sumbernya`} />}
    </li>)}</ol> : <PulsePanelEmpty title="Belum ada angka tayangan">Berita dan sebagian posting tidak membawa angka tayangan.</PulsePanelEmpty>}
  </AnalyticsPanel>;
}

/** The emoji used in posts and their comments, packed as a cloud. */
export function EmojiPanel({ posts = [] }) {
  const emoji = useMemo(() => topEmoji(posts.flatMap(post => [clean(post), ...((post.metrics?.comment_snapshot?.items || []).map(comment => comment.text))]), 24), [posts]);
  return <AnalyticsPanel title="Emotikon teratas" description="Ukuran mengikuti jumlah posting dan komentar yang memakainya.">
    {emoji.length ? <EmojiCloud rows={emoji} /> : <PulsePanelEmpty title="Belum ada emotikon">Posting dan komentar dalam cakupan ini tidak memakai emotikon.</PulsePanelEmpty>}
  </AnalyticsPanel>;
}

/** The hashtags in use, packed as a word cloud. */
export function TagPanel({ posts = [], search = '' }) {
  const tags = useMemo(() => topHashtags(posts.map(post => `${post.title || ''} ${post.text || ''}`), 45), [posts]);
  return <AnalyticsPanel title="Tagar" description="Ukuran mengikuti jumlah posting. Klik tagar untuk membuka postingnya.">
    {tags.length ? <HashtagCloud rows={tags} search={search} /> : <PulsePanelEmpty title="Belum ada tagar">Posting dalam cakupan ini tidak memakai tagar.</PulsePanelEmpty>}
  </AnalyticsPanel>;
}

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import AccountAvatar from '../components/admin/pulse/AccountAvatar';
import { platformLabel } from '../components/admin/pulse/PlatformIcon';
import { PlatformTag, PulseTag } from '../components/ui/PulseTag';
import { formatCount, pulseDate } from '../lib/pulseData';
import { postMeasures } from '../lib/pulseMeasures';
import { sourceText } from '../lib/pulseOverview';
import { mentionPlatforms, topMentions } from '../lib/pulseTopMentions';
import './ds/top-mentions.css';

const TONES = [
  { tone: 'negative', title: 'Negatif', word: 'bernada negatif' },
  { tone: 'positive', title: 'Positif', word: 'bernada positif' },
];

/** What a mention says: an article's headline, otherwise the post's own text, cut at two lines by the stylesheet. */
const said = post => sourceText(post.platform === 'news' && post.title ? { text: post.title } : post) || 'Teks belum tersedia';

function Mention({ post }) {
  const own = postMeasures(post).interactions, news = post.platform === 'news';
  return <li>
    <a className="tm-row" href={post.url} target="_blank" rel="noopener noreferrer">
      <AccountAvatar author={post.author} platform={post.platform} size="sm" />
      <span className="tm-main">
        <span className="tm-who"><strong>{post.author || (news ? 'Media tanpa nama' : 'Akun tanpa nama')}</strong>
          <span>{platformLabel(post.platform)} · {pulseDate(post.published_at)}</span></span>
        <span className="tm-text">{said(post)}</span>
        {post.also > 0 && <span className="tm-also">+{formatCount(post.also)} {news ? 'media' : 'posting'} lain dengan isi yang sama</span>}
      </span>
      <span className="tm-figure">{own === null
        ? <><b aria-label="Tidak tersedia">—</b><small>interaksi tidak dilaporkan</small></>
        : <><b>{formatCount(own)}</b><small>interaksi</small></>}</span>
      <ExternalLink className="tm-out" size={14} aria-hidden="true" /><span className="pu-sr"> (buka di tab baru)</span>
    </a>
  </li>;
}

/** The strongest negative and positive mentions of the chosen scope, from every platform, each with the account's
 * picture and platform mark, its text and its interactions. Read from the same posts as the rest of Ikhtisar, so a
 * change of period or platform changes them too; the platform filter shows one platform's mentions, news included.
 * `onOpen(title, posts)` opens the evidence drawer with every mention of one tone. */
export default function TopMentions({ posts, onOpen }) {
  const choices = mentionPlatforms(posts);
  const [picked, setPicked] = useState('all');
  // A platform that left the scope (another period or platform in the project bar) falls back to all platforms.
  const platform = picked === 'all' || choices.some(item => item.platform === picked) ? picked : 'all';
  const lists = TONES.map(item => ({ ...item, ...topMentions(posts, item.tone, { platform }) }));
  if (!choices.length) return null;     // nothing analysed in the scope: nothing to rank
  const where = platform === 'all' ? '' : ` di ${platformLabel(platform)}`;
  return <section className="tm-section" aria-labelledby="tm-heading">
    <header className="tm-head">
      <h2 id="tm-heading">Mention teratas</h2>
      <div className="pu-tag-group tm-filter" role="group" aria-label="Platform mention">
        <PulseTag size="lg" tone="accent" pressed={platform === 'all'} onClick={() => setPicked('all')}>Semua platform</PulseTag>
        {choices.map(item => <PlatformTag key={item.platform} platform={item.platform} size="lg" count={formatCount(item.count)} pressed={platform === item.platform} onClick={() => setPicked(item.platform)} />)}
      </div>
    </header>
    <div className="tm-grid">
      {lists.map(list => <div key={list.tone} className="tm-card" data-tone={list.tone}>
        <div className="tm-card-head">
          <h3><i aria-hidden="true" />{list.title}</h3>
          <p>{formatCount(list.matching)} dari {formatCount(list.analysed)} mention{where} yang sudah dianalisis</p>
        </div>
        {list.rows.length
          ? <ol className="tm-list">{list.rows.map(post => <Mention key={post.id} post={post} />)}</ol>
          : <p className="tm-empty">Belum ada mention {list.word}{where} dalam cakupan ini.</p>}
        {list.matching > list.rows.length && <button type="button" className="tm-all" onClick={() => onOpen(`Mention ${list.word}${where}`, list.all)}>Lihat semua {formatCount(list.matching)} mention</button>}
      </div>)}
    </div>
    <p className="tm-note">Hanya mention yang nadanya sudah dianalisis. Urutan: interaksi yang tercatat, terbanyak dahulu; berita tidak melaporkan interaksi, jadi tampil sesudah posting yang interaksinya tercatat. Interaksi bukan jangkauan.</p>
  </section>;
}

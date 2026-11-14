import React, { useEffect, useId, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { postInteractions } from '../../../lib/pulseEngagement';
import api from '../../../lib/api';
import { platformLabel } from './PlatformIcon';
import { PulseArrow } from '../../ui/PulseArrow';
import { MessageCircle, Heart, ExternalLink } from 'lucide-react';
import { formatCount, safeSourceUrl, pulseDate } from '../../../lib/pulseData';
import {responseEvidence,stanceLabels,stanceShort} from '../../../lib/pulseResponse';
import { topEmoji } from '../../../lib/pulseEmoji';
import useResponseAnalysis from '../../../pulse/useResponseAnalysis';
import { PulseTag, SentimentTag } from '../../ui/PulseTag';
import { kindHints, kindLabels } from '../../../lib/pulseVoice';
import AccountAvatar from './AccountAvatar';
import { PulseStat, PulseStatGrid } from '../../ui/PulseAnalytics';
import { PulseButton } from '../../ui/PulseUI';


/** One comment as a card: who and when, the words, then the reading of it. Reasons stay folded so the text is never crowded. */
/** Stance on a card: one emoticon and one word. The full meaning is in the accessible name and the tooltip. */
export function StanceTag({ value }) {
  const key = stanceShort[value] ? value : 'unknown', [emoji, word] = stanceShort[key];
  return <span className="pcm-stance" data-stance={key} title={`Sikap terhadap isu: ${stanceLabels[key]}`}><span aria-hidden="true">{emoji}</span><span className="pu-sr">Sikap terhadap isu: {stanceLabels[key]}</span><span aria-hidden="true">{word}</span></span>;
}

/** The post a comment belongs to, shown when the comment card is hovered or focused. */
function SourcePreview({ post }) {
  const total = postInteractions(post.metrics);
  return <aside className="pcm-source" aria-label="Posting sumber">
    <header><AccountAvatar size="sm" author={post.author} platform={post.platform} /><strong>{post.author || 'Nama sumber tidak tersedia'}</strong><small>{pulseDate(post.published_at)}</small></header>
    <p>{((post.title || post.text || '').replace(/\s+/g, ' ').trim().slice(0, 240)) || 'Teks posting tidak tersedia.'}</p>
    <footer><span>{total == null ? 'Interaksi tidak tersedia' : `${formatCount(total)} interaksi`}</span>{safeSourceUrl(post.url) && <a href={safeSourceUrl(post.url)} target="_blank" rel="noopener noreferrer">Buka posting <PulseArrow /></a>}</footer>
  </aside>;
}

export function Comment({ comment, video, post, showAnalysis = true }) {
  const review = [comment.sentiment, comment.stance].some(r => r && (r.review_needed || r.confidence < 0.65));
  const reasons = [['Sentimen', comment.sentiment?.reason], ['Sikap', comment.stance?.reason]].filter(([, reason]) => reason);
  const sourceId = useId();
  return <article className="pcm-card" data-has-source={post && video ? '' : undefined}>
    {post && video && <div className="pcm-source-pop" id={sourceId} role="tooltip"><SourcePreview post={post} /></div>}
    <header className="pcm-head">
      <AccountAvatar size="sm" author={comment.author} platform={post?.platform} photo={null} />
      <div className="pcm-who"><strong>{comment.author || 'Penulis tidak tersedia'}</strong><small>{pulseDate(comment.published_at)}{comment.replies > 0 && <> · {formatCount(comment.replies)} balasan</>}</small></div>
      <span className="pcm-likes" title="Suka"><Heart size={14} aria-hidden="true" /><span className="pu-sr">Suka: </span>{formatCount(comment.likes)}</span>
    </header>
    <p className="pcm-text">{comment.text}</p>
    {showAnalysis && <div className="pcm-reading">
      <div className="pu-tag-group">{!comment.sentiment?.label && !comment.stance?.label ? <PulseTag tone="unknown" dot>Belum dianalisis</PulseTag> : <><SentimentTag value={comment.sentiment?.label || 'unknown'} />{comment.sentiment?.label === 'neutral' && ['question', 'call', 'sarcasm'].includes(comment.sentiment.kind) && <PulseTag variant="outline" title={kindHints[comment.sentiment.kind]}>{kindLabels[comment.sentiment.kind]}</PulseTag>}<StanceTag value={comment.stance?.label} /></>}{review && <PulseTag tone="warning" dot>Perlu ditinjau</PulseTag>}</div>
      {reasons.length > 0 && <details className="pcm-reasons"><summary>Alasan penilaian</summary><dl>{reasons.map(([label, reason]) => <div key={label}><dt>{label}</dt><dd>{reason}</dd></div>)}</dl></details>}
    </div>}
    {(video || safeSourceUrl(comment.url)) && <footer className="pcm-foot">{video && <span className="pcm-post" tabIndex={post ? 0 : undefined} aria-describedby={post ? sourceId : undefined}>Pada posting: {video}</span>}{safeSourceUrl(comment.url) && <a href={safeSourceUrl(comment.url)} target="_blank" rel="noopener noreferrer">Buka komentar <ExternalLink size={12} aria-hidden="true" /></a>}</footer>}
  </article>;
}

export function PostComments({ post }) {
  const [limit, setLimit] = useState(5);
  const snapshot = post.metrics?.comment_snapshot;
  if (!snapshot && !['youtube','x','instagram','tiktok'].includes(post.platform)) return null;
  return <details className="pulse-post-comments"><summary><MessageCircle size={15} />Komentar {snapshot?.status === 'success' ? `(${snapshot.items.length} tersedia)` : 'belum tersedia'}</summary>
    {!snapshot ? <p>Isi komentar belum diambil untuk posting ini. Ambil dari halaman Komentar; angka komentar di kartu adalah statistik posting.</p> : snapshot.status !== 'success' ? <p role="status">Komentar belum tersedia untuk posting ini.</p> : <><p>Teratas berdasarkan likes dalam sampel. Diambil {pulseDate(snapshot.fetched_at)}.</p>{snapshot.items.slice(0, limit).map(c => <Comment key={c.id} comment={c} showAnalysis={false} />)}{!snapshot.items.length && <p>Belum ada komentar yang tersedia.</p>}{snapshot.items.length > limit && <PulseButton onClick={() => setLimit(limit + 10)}>Tampilkan lebih banyak komentar</PulseButton>}</>}
  </details>;
}

const postTitle = post => ((post.title || post.text || '').replace(/\s+/g, ' ').trim().slice(0, 70) || 'Tanpa teks');

export default function CommentsPanel({ posts = [], topicId }) {
  const analysis=useResponseAnalysis(topicId);
  const [params] = useSearchParams();
  const [selected, setSelected] = useState(params.get('post') || 'all');
  const [sort, setSort] = useState('likes');
  const [limit, setLimit] = useState(10);
  const [coverage, setCoverage] = useState(null);
  const [collect, setCollect] = useState({ busy: false, note: '', error: '' });
  useEffect(() => {
    if (!topicId) return;
    let active = true;
    api.get('/admin/pulse/topics/' + encodeURIComponent(topicId) + '/comments/coverage').then(data => { if (active) setCoverage(data); }).catch(() => { if (active) setCoverage(null); });
    return () => { active = false; };
  }, [topicId, posts.length]);
  const autoPending = coverage ? coverage.auto_done < coverage.auto_target : false;
  useEffect(() => {
    if (!topicId || !autoPending) return;
    const timer = setInterval(() => { api.get('/admin/pulse/topics/' + encodeURIComponent(topicId) + '/comments/coverage').then(setCoverage).catch(() => {}); }, 30000);
    return () => clearInterval(timer);
  }, [topicId, autoPending]);
  async function collectNext() {
    if (collect.busy || !topicId) return;
    setCollect({ busy: true, note: '', error: '' });
    try {
      const result = await api.post('/admin/pulse/topics/' + encodeURIComponent(topicId) + '/comments/collect?max_posts=10');
      const done = result.posts.filter(row => row.status === 'success').length;
      setCoverage(result.coverage);
      setCollect({ busy: false, error: '', note: result.posts.length ? `${formatCount(result.comments)} komentar dari ${done} posting ditambahkan.${result.stopped.length ? ' Pengambilan dihentikan karena batas penyedia data; coba lagi nanti.' : ''}` : 'Tidak ada posting lain yang menunggu komentar.' });
      window.dispatchEvent(new Event('pulse-data-changed'));
    } catch (error) {
      setCollect({ busy: false, note: '', error: error.status === 409 ? 'Pengambilan lain sedang berjalan untuk project ini. Coba lagi sebentar.' : 'Komentar belum berhasil diambil. Coba lagi.' });
    }
  }
  const withComments = posts.filter(p => p.metrics?.comment_snapshot?.items?.length);
  const chosen = withComments.some(p => p.id === selected) ? selected : 'all';   // a linked post without comments falls back to all
  const scope = withComments.filter(p => chosen === 'all' || chosen === p.id);
  const comments = responseEvidence(scope,analysis.response).comments.map(c=>({...c,video:postTitle(c.post),post_id:c.post.id}))
    .sort((a, b) => sort === 'likes' ? (b.likes ?? -1) - (a.likes ?? -1) : new Date(b.published_at || 0) - new Date(a.published_at || 0));
  const tally=comments.reduce((t,c)=>{if(c.sentiment?.label in t)t[c.sentiment.label]++;return t;},{positive:0,neutral:0,negative:0});
  const labelled=tally.positive+tally.neutral+tally.negative, total=comments.length;
  const emoji = topEmoji(comments.map(c => c.text), 8);
  const one = chosen !== 'all' ? withComments.find(p => p.id === chosen) : null;
  return <section id="pulse-comments" className="pulse-panel pulse-comments-panel" aria-label="Komentar pada posting project"><div className="pulse-panel-heading"><div><h2>Suara di kolom komentar</h2><p>{one ? `${formatCount(total)} komentar pada satu posting pilihan` : `${formatCount(total)} komentar dari ${formatCount(withComments.length)} posting`}</p></div><MessageCircle size={24} /></div>
    <div className="pcm-layout">
      <div className="pcm-main">
    {one && <p className="pc-one-post"><AccountAvatar size="sm" author={one.author} platform={one.platform} /><strong>{one.author || 'Tanpa nama'}</strong><span>{postTitle(one)}</span>{safeSourceUrl(one.url) && <a href={safeSourceUrl(one.url)} target="_blank" rel="noopener noreferrer">Buka posting asli <PulseArrow/></a>}</p>}
    <div className="pulse-comment-list">{comments.slice(0, limit).map(c => <Comment key={c.post_id + c.id} comment={c} video={one ? null : c.video} post={one ? null : c.post} />)}</div>
    {!total && <p className="pulse-empty">{withComments.length ? 'Belum ada komentar untuk pilihan ini. Pilih posting lain.' : 'Belum ada komentar tersimpan. Ambil komentar posting untuk mulai menganalisis.'}</p>}
    {total > limit && <div className="pulse-pagination"><PulseButton onClick={() => setLimit(limit + 20)}>Tampilkan 20 komentar berikutnya</PulseButton></div>}
      </div>
      <aside className="pcm-rail" aria-label="Filter dan ringkasan komentar">
    <div className="pulse-filters"><label>Posting<select aria-label="Pilih posting" value={chosen} onChange={e => { setSelected(e.target.value); setLimit(10); }}><option value="all">Semua posting ({formatCount(withComments.length)})</option>{withComments.map(p => <option key={p.id} value={p.id}>{platformLabel(p.platform)} · {p.author || 'Tanpa nama'} · {postTitle(p)} ({formatCount(p.metrics.comment_snapshot.items.length)})</option>)}</select></label><label>Urutkan komentar<select aria-label="Urutkan komentar" value={sort} onChange={e => { setSort(e.target.value); setLimit(10); }}><option value="likes">Suka terbanyak</option><option value="recent">Terbaru</option></select></label></div>
    <div className="pulse-comment-stats"><PulseStatGrid label="Ringkasan komentar dalam filter"><PulseStat label="Komentar" icon={MessageCircle} value={total} note={one ? 'Satu posting pilihan' : `${formatCount(withComments.length)} posting`}/><PulseStat label="Positif" tone="positive" value={tally.positive} share={labelled?tally.positive/labelled*100:null}/><PulseStat label="Negatif" tone="negative" value={tally.negative} share={labelled?tally.negative/labelled*100:null}/><PulseStat label="Belum dianalisis" tone="unknown" value={total-labelled} share={total?(total-labelled)/total*100:null}/></PulseStatGrid></div>
    <div className="pc-coverage" aria-live="polite">
      <h3>Komentar otomatis</h3><p>{coverage ? (coverage.auto_target ? <><strong>{formatCount(coverage.auto_done)} dari {formatCount(coverage.auto_target)}</strong> posting teratas sudah punya komentar. {coverage.auto_done < coverage.auto_target ? 'Sisanya sedang diambil otomatis.' : 'Posting baru yang masuk 100 besar diambil otomatis.'}</> : 'Belum ada posting yang kolom komentarnya bisa diambil.') : 'Memeriksa cakupan komentar…'}</p>
      {coverage?.auto_target > 0 && <div className="pcm-progress" role="progressbar" aria-label="Kemajuan komentar otomatis" aria-valuemin={0} aria-valuemax={coverage.auto_target} aria-valuenow={coverage.auto_done}><i style={{ width: `${coverage.auto_done / coverage.auto_target * 100}%` }} /></div>}
      {coverage && coverage.waiting > 0 && <details className="pcm-more"><summary>Ambil di luar 100 besar</summary><p>{formatCount(coverage.waiting)} posting lain belum punya komentar.{coverage.not_requestable > 0 ? ` ${formatCount(coverage.not_requestable)} posting (misalnya berita) tidak punya kolom komentar.` : ''}</p><PulseButton size="sm" onClick={collectNext} busy={collect.busy} busyLabel="Mengambil komentar…">Ambil 10 posting berikutnya</PulseButton></details>}
      {collect.note && <p className="pc-coverage-note" role="status">{collect.note}</p>}
      {collect.error && <p className="pc-coverage-note pc-coverage-error" role="alert">{collect.error}</p>}
    </div>
        {emoji.length > 0 && <section className="pcm-emoji" aria-label="Emotikon teratas di komentar"><h3>Emotikon teratas</h3><ul>{emoji.map(row => <li key={row.emoji}><span aria-hidden="true">{row.emoji + '\uFE0F'}</span><span className="pu-sr">{row.emoji} </span><strong>{formatCount(row.count)}</strong></li>)}</ul><small>Jumlah komentar yang memakainya, dari {formatCount(total)} komentar dalam filter.</small></section>}
      </aside>
    </div>
  </section>;
}

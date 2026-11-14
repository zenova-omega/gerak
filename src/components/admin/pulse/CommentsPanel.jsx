import React, { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { platformLabel } from './PlatformIcon';
import { PulseArrow } from '../../ui/PulseArrow';
import { MessageCircle, Heart, ExternalLink } from 'lucide-react';
import { formatCount, safeSourceUrl, pulseDate } from '../../../lib/pulseData';
import {responseEvidence,stanceLabels} from '../../../lib/pulseResponse';
import useResponseAnalysis from '../../../pulse/useResponseAnalysis';
import { PulseTag, SentimentTag, PlatformTag } from '../../ui/PulseTag';
import { PulseStat, PulseStatGrid } from '../../ui/PulseAnalytics';
import { PulseButton } from '../../ui/PulseUI';
import { sharePercent } from '../../../lib/pulseChartTheme';

export function Comment({ comment, video, showAnalysis = true }) {
  return <article className="pulse-comment"><div className="pulse-comment-heading"><strong>{comment.author || 'Penulis tidak tersedia'}</strong><span><Heart size={13} />{formatCount(comment.likes)}</span></div><p>{comment.text}</p>{showAnalysis&&<div className="pulse-comment-analysis"><p><span className="pulse-comment-kind">Sentimen komentar</span><SentimentTag value={comment.sentiment?.label||'unknown'}/>{comment.sentiment?.reason&&<span>{comment.sentiment.reason}</span>}</p><p><span className="pulse-comment-kind">Sikap terhadap isu</span><PulseTag variant="outline" tone={comment.stance?.label?'neutral':'unknown'}>{stanceLabels[comment.stance?.label]||'Belum dianalisis'}</PulseTag>{comment.stance?.reason&&<span>{comment.stance.reason}</span>}</p>{[comment.sentiment,comment.stance].some(r=>r&&(r.review_needed||r.confidence<0.65))&&<PulseTag tone="warning" dot size="sm">Perlu ditinjau</PulseTag>}</div>}<footer><span>{pulseDate(comment.published_at)} · {formatCount(comment.replies)} balasan (balasan belum tersedia)</span>{safeSourceUrl(comment.url) && <a href={safeSourceUrl(comment.url)} target="_blank" rel="noopener noreferrer">Lihat di YouTube <ExternalLink size={12} /></a>}</footer>{video && <small>Video: {video}</small>}</article>;
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
  const [selected, setSelected] = useState('all');
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
  const scope = withComments.filter(p => selected === 'all' || selected === p.id);
  const comments = responseEvidence(scope,analysis.response).comments.map(c=>({...c,video:postTitle(c.post),post_id:c.post.id}))
    .sort((a, b) => sort === 'likes' ? (b.likes ?? -1) - (a.likes ?? -1) : new Date(b.published_at || 0) - new Date(a.published_at || 0));
  const tally=comments.reduce((t,c)=>{if(c.sentiment?.label in t)t[c.sentiment.label]++;return t;},{positive:0,neutral:0,negative:0});
  const labelled=tally.positive+tally.neutral+tally.negative, total=comments.length;
  const one = selected !== 'all' ? withComments.find(p => p.id === selected) : null;
  return <section id="pulse-comments" className="pulse-panel pulse-comments-panel" aria-label="Komentar pada posting project"><div className="pulse-panel-heading"><div><h2>Suara di kolom komentar</h2><p>{one ? `${formatCount(total)} komentar pada satu posting pilihan` : `${formatCount(total)} komentar dari ${formatCount(withComments.length)} posting`}</p></div><MessageCircle size={24} /></div>
    <div className="pc-coverage" aria-live="polite">
      <p>{coverage ? <><strong>{formatCount(coverage.collected)} dari {formatCount(coverage.eligible)}</strong> posting sudah diambil komentarnya.{coverage.waiting > 0 ? ` ${formatCount(coverage.waiting)} posting menunggu.` : ' Tidak ada yang menunggu.'}{coverage.not_requestable > 0 ? ` ${formatCount(coverage.not_requestable)} posting tidak punya kolom komentar yang bisa diambil (misalnya berita).` : ''}</> : 'Memeriksa cakupan komentar…'}</p>
      <div><PulseButton onClick={collectNext} disabled={!coverage || coverage.waiting === 0} busy={collect.busy} busyLabel="Mengambil komentar…">Ambil komentar 10 posting berikutnya</PulseButton><small>Dimulai dari posting dengan komentar terbanyak. Tiap posting memakai satu permintaan ke penyedia data.</small></div>
      {collect.note && <p className="pc-coverage-note" role="status">{collect.note}</p>}
      {collect.error && <p className="pc-coverage-note pc-coverage-error" role="alert">{collect.error}</p>}
    </div>
    <div className="pulse-comment-stats"><PulseStatGrid label="Ringkasan komentar dalam filter"><PulseStat label="Komentar dalam filter" icon={MessageCircle} value={total} note={one ? 'Satu posting pilihan' : `${formatCount(withComments.length)} posting memiliki komentar tersimpan`}/><PulseStat label="Positif" tone="positive" value={tally.positive} note={total?`${sharePercent(tally.positive,total)||'0%'} dari seluruh komentar`:'Belum ada komentar'}/><PulseStat label="Negatif" tone="negative" value={tally.negative} note={total?`${sharePercent(tally.negative,total)||'0%'} dari seluruh komentar`:'Belum ada komentar'}/><PulseStat label="Belum dianalisis" tone="unknown" value={total-labelled} note={total-labelled>0?'Dianalisis otomatis, bertahap':'Semua komentar sudah dianalisis'}/></PulseStatGrid></div>
    <div className="pulse-filters"><label>Posting<select aria-label="Pilih posting" value={selected} onChange={e => { setSelected(e.target.value); setLimit(10); }}><option value="all">Semua posting ({formatCount(withComments.length)})</option>{withComments.map(p => <option key={p.id} value={p.id}>{platformLabel(p.platform)} · {p.author || 'Tanpa nama'} · {postTitle(p)} ({formatCount(p.metrics.comment_snapshot.items.length)})</option>)}</select></label><label>Urutkan komentar<select aria-label="Urutkan komentar" value={sort} onChange={e => { setSort(e.target.value); setLimit(10); }}><option value="likes">Suka terbanyak</option><option value="recent">Terbaru</option></select></label></div>
    {one && <p className="pc-one-post"><PlatformTag size="sm" platform={one.platform}/><strong>{one.author || 'Tanpa nama'}</strong><span>{postTitle(one)}</span>{safeSourceUrl(one.url) && <a href={safeSourceUrl(one.url)} target="_blank" rel="noopener noreferrer">Buka posting asli <PulseArrow/></a>}</p>}
    <div className="pulse-comment-list">{comments.slice(0, limit).map(c => <Comment key={c.post_id + c.id} comment={c} video={one ? null : c.video} />)}</div>
    {!total && <p className="pulse-empty">{withComments.length ? 'Belum ada komentar untuk pilihan ini. Pilih posting lain.' : 'Belum ada komentar tersimpan. Ambil komentar posting untuk mulai menganalisis.'}</p>}
    {total > limit && <div className="pulse-pagination"><PulseButton onClick={() => setLimit(limit + 20)}>Tampilkan 20 komentar berikutnya</PulseButton></div>}
  </section>;
}

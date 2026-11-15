import { commentNeedsReview } from '../../../lib/pulseCommentReview';
import React, { useEffect, useId, useRef, useState } from 'react';
import { PulseCard } from '../../ui/PulseSurface';
import { useSearchParams } from 'react-router-dom';
import { postInteractions } from '../../../lib/pulseEngagement';
import api from '../../../lib/api';
import { platformLabel } from './PlatformIcon';
import { PulseArrow } from '../../ui/PulseArrow';
import { MessageCircle, Heart, ExternalLink } from 'lucide-react';
import { formatCount, safeSourceUrl, pulseDate } from '../../../lib/pulseData';
import {analysedShares,responseEvidence,stanceLabels,stanceShort} from '../../../lib/pulseResponse';
import { commentPostRows, postCaption } from '../../../lib/pulseCommentPosts';
import { MORE, PAGE, nextShown, outsideTop } from '../../../lib/pulseCommentsBrowse';
import { topEmoji } from '../../../lib/pulseEmoji';
import useResponseAnalysis from '../../../pulse/useResponseAnalysis';
import { PulseTag, SentimentTag } from '../../ui/PulseTag';
import { kindHints, kindLabels } from '../../../lib/pulseVoice';
import AccountAvatar from './AccountAvatar';
import useHideUnknown from '../../../pulse/useHideUnknown';
import { UnanalysedToggle } from '../../../pulse/UnanalysedToggle';
import CommentPostPicker from './CommentPostPicker';
import { PulseButton } from '../../ui/PulseUI';
import '../../../pulse/ds/comments-browse.css';
import useMasonry from '../../../pulse/useMasonry';


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

/** A comment as one compact row, for the list under a post: picture, then who and when on one line with the words
 * under it, and the likes and the way to the comment at the side. It is built from plain blocks on purpose: a post
 * card styles its own header and footer, and those rules must find nothing to grab inside a comment. */
function CompactComment({ comment, platform }) {
  const url = safeSourceUrl(comment.url), name = comment.author || 'Penulis tidak tersedia';
  return <article className="pcm-card pcm-compact">
    <AccountAvatar size="xs" author={comment.author} platform={platform} photo={comment.profile_image_url} />
    <div className="pcm-body">
      <div className="pcm-line"><strong>{name}</strong><small>{pulseDate(comment.published_at)}{comment.replies > 0 && <> · {formatCount(comment.replies)} balasan</>}</small></div>
      <p className="pcm-text">{comment.text}</p>
    </div>
    <div className="pcm-side">
      <span className="pcm-likes" title="Suka"><Heart size={14} aria-hidden="true" /><span className="pu-sr">Suka: </span>{formatCount(comment.likes)}</span>
      {url && <a className="pcm-open" href={url} target="_blank" rel="noopener noreferrer" aria-label={`Buka komentar ${name}`} title="Buka komentar"><ExternalLink size={14} aria-hidden="true" /></a>}
    </div>
  </article>;
}

export function Comment({ comment, video, post, platform, showAnalysis = true }) {
  const review = commentNeedsReview(comment);
  const reasons = [['Sentimen', comment.sentiment?.reason], ['Sikap', comment.stance?.reason]].filter(([, reason]) => reason);
  const sourceId = useId();
  const url = safeSourceUrl(comment.url);
  // Few rows, so many cards fit a screen: the way to the comment is an icon in the head, the reading and its reasons
  // share a row, and the foot is one quiet line naming the post.
  return <article className="pcm-card" data-has-source={post && video ? '' : undefined}>
    {post && video && <div className="pcm-source-pop" id={sourceId} role="tooltip"><SourcePreview post={post} /></div>}
    <header className="pcm-head">
      <AccountAvatar size="sm" author={comment.author} platform={post?.platform || platform} photo={comment.profile_image_url} />
      <div className="pcm-who"><strong>{comment.author || 'Penulis tidak tersedia'}</strong><small>{pulseDate(comment.published_at)}{comment.replies > 0 && <> · {formatCount(comment.replies)} balasan</>}</small></div>
      <span className="pcm-likes" title="Suka"><Heart size={14} aria-hidden="true" /><span className="pu-sr">Suka: </span>{formatCount(comment.likes)}</span>{url && <a className="pcm-open" href={url} target="_blank" rel="noopener noreferrer" aria-label={`Buka komentar ${comment.author || 'ini'}`} title="Buka komentar"><ExternalLink size={14} aria-hidden="true" /></a>}
    </header>
    <p className="pcm-text">{comment.text}</p>
    {showAnalysis && <div className="pcm-reading">
      <div className="pu-tag-group">{!comment.sentiment?.label && !comment.stance?.label ? <PulseTag tone="unknown" dot>Belum dianalisis</PulseTag> : <><SentimentTag value={comment.sentiment?.label || 'unknown'} />{comment.sentiment?.label === 'neutral' && ['question', 'call', 'sarcasm'].includes(comment.sentiment.kind) && <PulseTag variant="outline" title={kindHints[comment.sentiment.kind]}>{kindLabels[comment.sentiment.kind]}</PulseTag>}<StanceTag value={comment.stance?.label} /></>}{review && <PulseTag tone="warning" dot>Perlu ditinjau</PulseTag>}</div>
      {reasons.length > 0 && <details className="pcm-reasons"><summary>Alasan</summary><dl>{reasons.map(([label, reason]) => <div key={label}><dt>{label}</dt><dd>{reason}</dd></div>)}</dl></details>}
    </div>}
    {video && <footer className="pcm-foot"><span className="pcm-post" tabIndex={post ? 0 : undefined} aria-describedby={post ? sourceId : undefined}>Pada posting: {video}</span></footer>}
  </article>;
}

export function PostComments({ post }) {
  const [limit, setLimit] = useState(5);
  const snapshot = post.metrics?.comment_snapshot;
  if (!snapshot && !['youtube','x','instagram','tiktok'].includes(post.platform)) return null;
  return <details className="pulse-post-comments"><summary><MessageCircle size={15} />Komentar {snapshot?.status === 'success' ? `(${snapshot.items.length} tersedia)` : 'belum tersedia'}</summary>
    {!snapshot ? <p>Komentar belum diambil.</p> : snapshot.status !== 'success' ? <p role="status">Komentar belum tersedia.</p> : <><p className="pcm-note">Diambil {pulseDate(snapshot.fetched_at)}.</p><div className="pcm-rows">{snapshot.items.slice(0, limit).map(c => <CompactComment key={c.id} comment={c} platform={post.platform} />)}</div>{!snapshot.items.length && <p>Belum ada komentar yang tersedia.</p>}{snapshot.items.length > limit && <PulseButton size="sm" onClick={() => setLimit(limit + 10)}>Tampilkan {formatCount(Math.min(10, snapshot.items.length - limit))} komentar berikutnya</PulseButton>}</>}
  </details>;
}

const postTitle = post => (postCaption(post).slice(0, 70) || 'Tanpa teks');
/** First page of cards and each further step: both fill whole rows at one, two and three columns. */
const tones = [['positive', 'Positif'], ['neutral', 'Netral'], ['negative', 'Negatif']];
const percentText = value => formatCount(Math.round(value * 10) / 10) + '%';
/** Cards that scrolling alone brings in. Past them only the button adds more, so what sits under the list can be reached. */
const SCROLL_UNTIL = PAGE + 4 * MORE;

/**
 * The end of the comment list. The comments are already on the page, so nothing is fetched: one more step adds the next
 * cards under the ones shown, in the same click: there is nothing to wait for, so the button never turns busy. Up to
 * SCROLL_UNTIL cards it also happens by itself when the end of the list comes near the screen (a watched mark); the
 * button is for the keyboard, for wherever that cannot be watched, and for every step after that.
 */
export function MoreComments({ shown, total, analysedOnly = false, onMore }) {
  const mark = useRef(null), latest = useRef(onMore);
  // The newest handler for the watcher, set after each render rather than during it.
  useEffect(() => { latest.current = onMore; });
  const watched = shown < SCROLL_UNTIL;
  // A new watcher after each step: if the end is still near (short cards, a tall screen), the next step follows.
  useEffect(() => {
    const node = mark.current;
    if (!watched || !node || typeof IntersectionObserver === 'undefined') return undefined;
    const watcher = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) latest.current(); }, { rootMargin: '0px 0px 200px 0px' });
    watcher.observe(node);
    return () => watcher.disconnect();
  }, [shown, watched]);
  return <div className="pcb-more">
    {watched && <span ref={mark} className="pcb-sentinel" aria-hidden="true" />}
    <PulseButton onClick={() => latest.current()}>Tampilkan lebih banyak</PulseButton>
    <span>{formatCount(shown)} dari {formatCount(total)} komentar{analysedOnly ? ' yang sudah dianalisis' : ''} ditampilkan</span>
  </div>;
}

/** Under the list, in one line: how many of the comments in view the analysis has read. While its results load, it says so. */
export function AnalysedLine({ analysed, total, reading }) {
  if (reading === 'loading') return <p className="pcb-analysed" role="status">Memuat hasil analisis…</p>;
  if (reading === 'failed') return <p className="pcb-analysed" role="status">Hasil analisis belum bisa dimuat.</p>;
  return <p className="pcb-analysed" role="status"><strong>{formatCount(analysed)}</strong>{analysed < total ? <> dari <strong>{formatCount(total)}</strong></> : ''} komentar teranalisis.</p>;
}

/** The figures of the comments in view, on one strip. `reading` is 'loading' or 'failed' while the results of the
 * analysis have not arrived: that is said as it is, never as "nothing analysed yet". Shares are read over the analysed comments and the coverage
 * is said once; comments still waiting are a count without a share. Top emoticons follow on a second line. */
export function CommentSummary({ counts, emoji, reading }) {
  const emojiLabel = useId();
  const shares = analysedShares(counts), { total, analysed } = shares, waiting = total - analysed;
  return <div className="pcb-summary" role="group" aria-label="Ringkasan komentar dalam pilihan ini">
    <div className="pcb-figures">
      <div className="pcb-coverage">
        <p>{reading ? <><strong>{formatCount(total)}</strong> komentar</> : !analysed ? <><strong>{formatCount(total)}</strong> komentar, belum ada yang dianalisis</> : waiting ? <><strong>{formatCount(analysed)}</strong> dari <strong>{formatCount(total)}</strong> komentar sudah dianalisis</> : <><strong>{formatCount(total)}</strong> komentar, semuanya sudah dianalisis</>}</p>
        <small>{reading === 'loading' ? 'Memuat…' : reading === 'failed' ? 'Belum bisa dimuat.' : !analysed ? '' : waiting ? `${formatCount(waiting)} menunggu analisis.` : ''}</small>
      </div>
      {analysed > 0 && <div className="pcb-tone">
        <ul className="pcb-shares" aria-label="Nada komentar yang sudah dianalisis">{tones.map(([key, label]) => <li key={key} data-tone={key} title={`${formatCount(counts[key])} dari ${formatCount(analysed)} komentar yang sudah dianalisis`}><span><i aria-hidden="true" />{label}</span> <span><strong>{shares.text(key) ?? percentText(shares.percent(key))}</strong> <small>{formatCount(counts[key])}<span className="pu-sr"> komentar</span></small></span></li>)}</ul>
        <div className="pcb-bar" aria-hidden="true">{tones.filter(([key]) => counts[key] > 0).map(([key]) => <i key={key} data-tone={key} style={{ flexGrow: counts[key] }} />)}</div>
      </div>}
    </div>
    {emoji.length > 0 && <div className="pcb-emoji"><span id={emojiLabel}>Emotikon teratas</span><ul aria-labelledby={emojiLabel}>{emoji.map(row => <li key={row.emoji}><span aria-hidden="true">{row.emoji + '\uFE0F'}</span><span className="pu-sr">{row.emoji} </span><strong>{formatCount(row.count)}</strong></li>)}</ul><small>Jumlah komentar yang memakainya, dari {formatCount(total)} komentar.</small></div>}
  </div>;
}

export default function CommentsPanel({ posts = [], topicId }) {
  const analysis=useResponseAnalysis(topicId);
  const [params] = useSearchParams();
  const [selected, setSelected] = useState(params.get('post') || 'all');
  const [sort, setSort] = useState('likes');
  const [limit, setLimit] = useState(PAGE);
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
      setCollect({ busy: false, error: '', note: result.posts.length ? `${formatCount(result.comments)} komentar dari ${done} posting ditambahkan.${result.stopped.length ? ' Dihentikan batas penyedia data.' : ''}` : 'Tidak ada posting lain.' });
      window.dispatchEvent(new Event('pulse-data-changed'));
    } catch (error) {
      setCollect({ busy: false, note: '', error: error.status === 409 ? 'Pengambilan lain sedang berjalan. Coba lagi sebentar.' : 'Komentar belum berhasil diambil. Coba lagi.' });
    }
  }
  const withComments = posts.filter(p => p.metrics?.comment_snapshot?.items?.length);
  const pickerRows = commentPostRows(withComments);   // the same posts, busiest first, for the picker
  const chosen = withComments.some(p => p.id === selected) ? selected : 'all';   // a linked post without comments falls back to all
  const scope = withComments.filter(p => chosen === 'all' || chosen === p.id);
  const comments = responseEvidence(scope,analysis.response).comments.map(c=>({...c,video:postTitle(c.post),post_id:c.post.id}))
    .sort((a, b) => sort === 'likes' ? (b.likes ?? -1) - (a.likes ?? -1) : new Date(b.published_at || 0) - new Date(a.published_at || 0));
  const counts=comments.reduce((t,c)=>{t[c.sentiment?.label||'unknown']++;return t;},{positive:0,neutral:0,negative:0,unknown:0});
  const total=comments.length, waiting=counts.unknown, labelled=total-waiting;
  // The switch narrows the cards to comments that already have a reading. It is offered only while some are still waiting.
  const [hideUnknown,setHideUnknown]=useHideUnknown();
  const canHide=waiting>0&&labelled>0, listed=hideUnknown&&canHide?comments.filter(c=>c.sentiment):comments;
  // Comment cards differ in height; the list packs them (the owner, 15 Nov 2026).
  const commentGrid = useRef(null);
  useMasonry(commentGrid, true, [listed, limit]);
  const showMore = () => setLimit(shown => nextShown(shown, listed.length));
  const emoji = topEmoji(comments.map(c => c.text), 8);
  const one = chosen !== 'all' ? withComments.find(p => p.id === chosen) : null;
  const pick = id => { setSelected(id); setLimit(PAGE); };
  // The way back lives in a bar that disappears once used, so focus goes to the picker instead of being dropped.
  const pickerButton = useId(), backToAll = () => { pick('all'); document.getElementById(pickerButton)?.focus(); };
  return <PulseCard id="pulse-comments" className="pulse-panel pulse-comments-panel" aria-label="Komentar pada posting project" padding="none" level={2} title={<>Suara di kolom komentar</>} description={<>{one ? `${formatCount(total)} komentar pada satu posting pilihan` : `${formatCount(total)} komentar dari ${formatCount(withComments.length)} posting`}</>} actions={<MessageCircle size={24} />}>
    <div className="pcb">
      {withComments.length > 0 && <div className="pcb-toolbar" role="group" aria-label="Pilih posting dan urutkan komentar">
        <CommentPostPicker rows={pickerRows} value={chosen} onChange={pick} buttonId={pickerButton} />
        <label className="pcb-field">Urutkan komentar<select aria-label="Urutkan komentar" value={sort} onChange={e => { setSort(e.target.value); setLimit(PAGE); }}><option value="likes">Suka terbanyak</option><option value="recent">Terbaru</option></select></label>
        {canHide && <UnanalysedToggle noun="komentar" hidden={hideUnknown} onChange={setHideUnknown} count={waiting} />}
      </div>}
      <p className="pu-sr" role="status">{one ? `Menampilkan ${formatCount(listed.length)} komentar pada posting ${one.author || 'tanpa nama'}.` : withComments.length ? `Menampilkan ${formatCount(listed.length)} komentar dari semua posting.` : ''}</p>
      {one && <div className="pcb-scope">
        <div className="pcb-scope-post"><AccountAvatar size="sm" author={one.author} platform={one.platform} /><div className="pcb-scope-text"><span><strong>{one.author || 'Tanpa nama'}</strong><small>{platformLabel(one.platform)} · {pulseDate(one.published_at)}</small></span><p>{postCaption(one).slice(0, 280) || 'Teks posting tidak tersedia.'}</p></div></div>
        <div className="pcb-scope-actions">{safeSourceUrl(one.url) && <a href={safeSourceUrl(one.url)} target="_blank" rel="noopener noreferrer">Buka posting asli <PulseArrow/></a>}<PulseButton size="sm" onClick={backToAll}>Kembali ke semua posting</PulseButton></div>
      </div>}
      {total > 0 && <CommentSummary counts={counts} emoji={emoji} reading={!analysis.loaded ? 'loading' : analysis.error ? 'failed' : null} />}
      {listed.length > 0 && <div ref={commentGrid} className="pcb-list">{listed.slice(0, limit).map(c => <Comment key={c.post_id + c.id} comment={c} video={one ? null : c.video} post={one ? null : c.post} platform={c.post.platform} />)}</div>}
      {!total && <p className="pulse-empty">{withComments.length ? 'Belum ada komentar untuk pilihan ini.' : 'Belum ada komentar tersimpan.'}</p>}
      {listed.length > limit && <MoreComments shown={limit} total={listed.length} analysedOnly={listed.length < total} onMore={showMore} />}
      {/* One line under the list instead of the progress of the automatic lane (the owner, 15 Nov 2026). */}
      {total > 0 && <AnalysedLine analysed={labelled} total={total} reading={!analysis.loaded ? 'loading' : analysis.error ? 'failed' : null} />}
      {(coverage?.waiting > 0 || collect.note || collect.error) && <div className="pc-coverage" aria-live="polite">
        {coverage && coverage.waiting > 0 && <details className="pcm-more"><summary>{outsideTop(coverage)}</summary><p>{formatCount(coverage.waiting)} posting lain belum punya komentar.{coverage.not_requestable > 0 ? ` ${formatCount(coverage.not_requestable)} posting tanpa kolom komentar.` : ''}</p><PulseButton size="sm" onClick={collectNext} busy={collect.busy} busyLabel="Mengambil komentar…">Ambil 10 posting berikutnya</PulseButton></details>}
        {collect.note && <p className="pc-coverage-note" role="status">{collect.note}</p>}
        {collect.error && <p className="pc-coverage-note pc-coverage-error" role="alert">{collect.error}</p>}
      </div>}
    </div>
  </PulseCard>;
}

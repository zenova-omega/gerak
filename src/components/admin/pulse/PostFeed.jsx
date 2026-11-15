import { PulseRepostNote } from '../../ui/PulseMetricRow';
import { Link } from 'react-router-dom';
import { PulseArrow } from '../../ui/PulseArrow';
import React, { createElement, useEffect, useState } from 'react';
import api from '../../../lib/api';
import ReviewPost from './ReviewPost';
import { ExternalLink, List, LayoutGrid, Sparkles, ChevronDown } from 'lucide-react';
import { PulseLike, PulseComment, PulseShare, PulseView } from '../../ui/PulseMetricIcons';
import { postInteractions } from '../../../lib/pulseEngagement';
import { PulseEngagement } from '../../ui/PulseEngagement';
import { formatCount, pulseDate } from '../../../lib/pulseData';
import { postMedia } from '../../../lib/pulseMedia';
import PostMediaPreview from './PostMediaPreview';
import { platformLabel } from './PlatformIcon';
import {PulseSourceHeading,PulsePanelHeading} from '../../ui/PulsePatterns';
import { PulseButton } from '../../ui/PulseUI';
import { PulseTag, SentimentTag } from '../../ui/PulseTag';
import PostCaption from './PostCaption';
import SentimentAction from './SentimentAction';
import '../../../pulse/listening-workbench.css';
import { PostComments } from './CommentsPanel';
import MetricHistory from './MetricHistory';
import PostFilterDrawer from './PostFilterDrawer';
import MentionTimeline from './MentionTimeline';
import PostQuickFilters from './PostQuickFilters';
import '../../../pulse/mentions-workspace.css';
import '../../../pulse/overview-analytics.css';
import { defaultPostFilters, filterPosts, sentimentLabels, postSentiment } from '../../../lib/pulsePostFilters';
import { namesProvince, provinceNames } from '../../../lib/pulsePlaces';

// One formatter for the whole product: WIB with its label, and a date alone when the source gave no clock.
const date = pulseDate;

const summaryParts=[['likes','Suka',PulseLike],['comments','Komentar',PulseComment],['shares','Bagikan',PulseShare],['views','Tayangan',PulseView]];
/** One post. Collapsed it answers "who, what, how much, what tone" in a few lines so a list can be
 * scanned; the interaction breakdown, review tools, comments and history open on demand. */
function PostCard({ post, topicId, review, reviewsReady, onReviewSaved }) {
  const [open, setOpen] = useState(false);
  const media = postMedia(post), total = postInteractions(post.metrics), detailId = 'pm-detail-' + post.id;
  const names = { x: { comments: 'Balasan', shares: 'Repost' }, threads: { comments: 'Balasan', shares: 'Repost' } }[post.platform] || {};
  return <article className="pulse-post" data-open={open ? '' : undefined}>
    <PulseSourceHeading post={post} linkProfile><SentimentTag value={postSentiment(post)}/>{topicId&&<Link className="pm-ask-ai" to={'/pulse/chat?'+new URLSearchParams({topic:topicId,post:post.id})} aria-label={'Tanya AI tentang posting '+(post.author||'')}><Sparkles size={16} aria-hidden="true"/><span>Tanya AI</span></Link>}{media.postUrl&&<a href={media.postUrl} target="_blank" rel="noopener noreferrer" aria-label={'Buka posting '+(post.author||'')}><ExternalLink size={18}/></a>}</PulseSourceHeading>
    <div className={'pm-post-body'+(['instagram','tiktok'].includes(post.platform)&&(media.imageUrl||media.videoUrl||media.embedUrl)?' has-media':'')}>
      <PostMediaPreview post={post} links={false} />
      <PostCaption post={post}/>
    </div>
    <div className="pm-post-summary">
      <dl aria-label="Ringkasan interaksi"><div className="pm-post-total"><dt>Interaksi</dt><dd>{total == null ? <span aria-label="Tidak tersedia">—</span> : formatCount(total)}</dd></div>{summaryParts.map(([key,label,icon])=><div key={key} data-part={key}><dt>{createElement(icon,{size:15})}<span className="pu-sr">{names[key]||label}</span></dt><dd title={names[key]||label}>{Number.isFinite(post.metrics?.[key]) ? formatCount(post.metrics[key]) : <span aria-label="Tidak tersedia">—</span>}</dd></div>)}<PulseRepostNote metrics={post.metrics} /></dl>
      <PulseButton variant="quiet" aria-expanded={open} aria-controls={detailId} onClick={()=>setOpen(value=>!value)}>{open?'Tutup rincian':'Rincian & tinjauan'}<ChevronDown size={16} aria-hidden="true"/></PulseButton>
    </div>
    {open && <div className="pm-post-detail" id={detailId}>
      <div className="pulse-post-interactions"><PulseEngagement metrics={post.metrics} platform={post.platform} compact label="Rincian interaksi posting"/></div>
      <SentimentAction post={post}/>
      {topicId && <ReviewPost key={`${topicId}:${post.id}`} postId={post.id} topicId={topicId} review={review} disabled={!reviewsReady} onSaved={onReviewSaved}/>}
      <details className="ps-account-preview"><summary>Detail akun & sumber</summary><p>{post.author || 'Nama tidak tersedia'} · {platformLabel(post.platform)}</p><p>Followers: {formatCount(post.metrics?.followers)}. Foto dan metrik hanya dari data tersimpan.</p>{media.profileUrl && <a href={media.profileUrl} target="_blank" rel="noopener noreferrer">Buka profil asli <PulseArrow/></a>}<p>Label sentimen bukan verifikasi kebenaran konten.</p></details>
      <PostComments post={post} />
      <MetricHistory itemId={post.id} />
      <footer>Data diamati {date(post.crawled_at)} · “—” berarti tidak tersedia, bukan nol.</footer>
    </div>}
  </article>;
}

export default function PostFeed({ posts = [], period, onPeriodChange, initialSentiment, initialAuthor='', initialPlatform='', initialProvince='', initialDay='', initialDayTo='', initialQuery='', topicId='' }) {
  const isDay=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value));
  // One day, or a first and last day when a week or month was picked on the trend chart.
  const day=isDay(initialDay)?initialDay:'',dayTo=day&&isDay(initialDayTo)&&initialDayTo>=day?initialDayTo:day;
  const [filters, setFilters] = useState({...defaultPostFilters,query:initialQuery,from:day,to:dayTo,exactAuthor:initialAuthor,province:provinceNames[initialProvince]?initialProvince:'',platforms:initialPlatform?initialPlatform.split(',').filter(Boolean):null,sentiments:sentimentLabels[initialSentiment]?[initialSentiment]:null});
  const [page, setPage] = useState(0);
  const [layout, setLayout] = useState('list');
  const [reviewState, setReviewState] = useState({topicId:'', loaded:false, rows:[], error:''});
  useEffect(() => {
    let active = true;
    if (!topicId) return;
    const load = () => api.get('/admin/pulse/reviews', {topic_id:topicId}).then(data => {
      if (active) setReviewState({topicId,loaded:true,rows:data.reviews,error:''});
    }).catch(error => {if(active)setReviewState({topicId,loaded:false,rows:[],error:error.message});});
    load();
    const changed = event => {if(event.detail?.topic_id===topicId)load();};
    window.addEventListener('pulse-reviews-changed', changed);
    return () => {active=false;window.removeEventListener('pulse-reviews-changed',changed);};
  }, [topicId]);
  const reviewsReady = reviewState.topicId===topicId && reviewState.loaded;
  const reviews = new Map((reviewsReady ? reviewState.rows : []).map(review=>[review.post_id,review]));
  const applyFilters = next => { setFilters(next); setPage(0); };
  const effectivePosts = posts;
  const rows = filterPosts(effectivePosts,filters).filter(post=>namesProvince(post,filters.province));
  const pages = Math.max(1, Math.ceil(rows.length / 12));
  const current = Math.min(page, pages - 1);
  return <section id="pulse-posts" className="pulse-post-feed pm-workspace" data-layout={layout} aria-label="Posting terkumpul">
    <PulsePanelHeading title="Posting terkumpul" description="Konten asli, interaksi, dan analisis per posting."><PulseTag>{formatCount(rows.length)} dari {formatCount(posts.length)} posting</PulseTag></PulsePanelHeading>
    {reviewState.topicId===topicId && reviewState.error && <p role="alert">Review belum dapat dimuat: {reviewState.error}</p>}
    <div className="pm-mentions-search"><label>Cari dalam posting<input type="search" placeholder="Keyword, caption atau nama akun" value={filters.query} onChange={e=>{setFilters({...filters,query:e.target.value});setPage(0);}}/></label><label>Urutan posting<select value={filters.sort} onChange={e=>{setFilters({...filters,sort:e.target.value});setPage(0);}}><option value="engagement">Interaksi tertinggi</option><option value="recent">Terbaru dahulu</option><option value="oldest">Terlama dahulu · kronologis</option><option value="shares">Repost terbanyak</option><option value="views">Tayangan tertinggi</option></select></label></div>
    <div className="pm-tools-row">
    <details className="pm-timeline-disclosure"><summary>Timeline percakapan</summary><MentionTimeline posts={posts} filters={period?{...filters,...period}:filters} globalPeriod={!!period} onApply={next=>{if(onPeriodChange)onPeriodChange({from:next.from,to:next.to});else setFilters(next);setPage(0);}}/></details>
    <PostFilterDrawer posts={effectivePosts} filters={filters} topicId={topicId} globalPeriod={!!period} onApply={next=>{setFilters(next);setPage(0);}}/>
    </div>
    <div className="ps-active-filters" aria-label="Filter aktif">{Object.entries(filters).filter(([k,v])=>k!=='sort' && v!==defaultPostFilters[k]).map(([key,value])=><PulseTag key={key} size="lg" variant="outline" onRemove={()=>{setFilters({...filters,[key]:defaultPostFilters[key]});setPage(0);}} removeLabel={'Hapus filter '+key}>{({query:'Teks',author:'Akun',exactAuthor:'Akun terpilih',province:'Menyebut tempat di',sentiments:'Sentimen',platforms:'Platform',minEngagement:'Min. interaksi',media:'Media',from:'Mulai',to:'Selesai'})[key]}: {Array.isArray(value)?value.map(v=>sentimentLabels[v]||platformLabel(v)).join(', ')||'Tidak ada':key==='province'?provinceNames[value]:value}</PulseTag>)}</div>
    <div className="pm-results-toolbar"><p role="status"><strong>{formatCount(rows.length)}</strong> posting cocok <span>· {rows.length ? current * 12 + 1 : 0}–{Math.min((current+1)*12,rows.length)} ditampilkan</span></p><div className="pm-view-switch" role="group" aria-label="Tampilan posting"><PulseButton aria-pressed={layout==='list'} onClick={()=>setLayout('list')}><List size={16}/>Daftar</PulseButton><PulseButton aria-pressed={layout==='grid'} onClick={()=>setLayout('grid')}><LayoutGrid size={16}/>Grid media</PulseButton></div></div>
    <div className="pm-results-layout"><div className="pm-results-main">
    <div className="pulse-post-grid">{rows.slice(current * 12, (current + 1) * 12).map(post => <PostCard key={post.id} post={post} topicId={topicId} review={reviews.get(post.id)} reviewsReady={reviewsReady}
      onReviewSaved={review=>setReviewState(state=>state.topicId===topicId ? {...state,rows:[...state.rows.filter(row=>row.post_id!==review.post_id),review]} : state)}/>)}</div>
    {!rows.length && <div className="pulse-empty"><h3>Tidak ada posting yang cocok</h3><p>Coba hapus filter platform, sentimen, atau kata pencarian. Hanya data tersimpan yang diperiksa.</p><PulseButton onClick={()=>applyFilters({...defaultPostFilters})}>Hapus filter posting</PulseButton></div>}
    <div className="pulse-pagination"><PulseButton disabled={current === 0} onClick={() => setPage(current - 1)}>Sebelumnya</PulseButton><span>Halaman {current + 1} / {pages}</span><PulseButton disabled={current + 1 >= pages} onClick={() => setPage(current + 1)}>Berikutnya</PulseButton></div>
    </div><PostQuickFilters posts={effectivePosts} filters={filters} onApply={applyFilters}/></div>
  </section>;
}

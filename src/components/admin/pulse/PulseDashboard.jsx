import { PulseArrow } from '../../ui/PulseArrow';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, RefreshCw, Download, Database, ExternalLink, MapPin, ShieldCheck, AlertCircle, Radio, Users, Layers, Search, X } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTopics, useIssues, usePulseAnalytics } from '../../../hooks/usePulse';
import { allegationLabel, formatCount, providerResults, pulseError } from '../../../lib/pulseData';
import { localTime, zone } from '../../../lib/pulseMeasures';
import { PlatformIcon, platformLabel } from './PlatformIcon';
import PlatformCheckboxes from './PlatformCheckboxes';
import TopicManager from './TopicManager';
import IssueCard from './IssueCard';
import ConversationGroups from '../../../pulse/ConversationGroups';
import GeographicView from './GeographicView';
import PostFeed from './PostFeed';
import NetworkAnalysis from './NetworkAnalysis';
import CommentsPanel from './CommentsPanel';
import AccountSignal from './AccountSignal';
import MonitorRoom from './MonitorRoom';
import InfographicsPanel from './InfographicsPanel';
import './pulse.css';
import '../../../pulse/pulse-tokens.css';
import '../../../pulse/ds/analytics-kit.css';
import '../../ui/pulse-patterns.css';
import { PulseButton } from '../../ui/PulseUI';
import { PulseCard, PulseFilterGroup, PulseFilterChip } from '../../ui/PulseSurface';
import { pageMeta } from '../../../pulse/pageMeta';
import { sentimentLabels } from '../../../lib/pulsePostFilters';
import { PulsePageHead, PulseSkeleton } from '../../ui/PulsePatterns';
import useProjectPeriod from '../../../pulse/useProjectPeriod';
import SentimentSummary from './SentimentSummary';
import SentimentProgress from '../../../pulse/SentimentProgress';
import SentimentEvaluation from '../../../pulse/SentimentEvaluation';
import AccountRankingRow from './AccountRankingRow';
import OverviewAnalytics from '../../../pulse/ProjectOverview';
import useFlaggedPosts from '../../../pulse/useFlaggedPosts';
import InfoTip from '../../../pulse/InfoTip';
import SentimentAnalytics from '../../../pulse/SentimentAnalytics';
import TrendChart from '../../../pulse/TrendChart';
import ProjectReport from '../../../pulse/ProjectReport';
import useProjectPlatforms from '../../../pulse/useProjectPlatforms';
import {scopeProjectData,projectPlatformOptions} from '../../../lib/pulseProjectFilters';
import ResponseAnalysisPanel, { ResponseAnalysisSummary } from '../../../pulse/ResponseAnalysisPanel';
import { PulsePanelEmpty, PulseStat, PulseStatGrid } from '../../ui/PulseAnalytics';
import { PlatformTag, PulseTag, SentimentTag } from '../../ui/PulseTag';
import { ProjectPostsContext, shareProjectPosts } from '../../../pulse/projectPosts';
import AccountAvatar from './AccountAvatar';
import { accountPageSize, accountPlatforms, accountRanking, isAccountFiltered, pageOf, platformFacets, readAccountFilters, socialPlatforms, togglePlatform, withFollowers, withoutAccountFilters, writeAccountFilters } from '../../../lib/pulseAccountFilters';
import '../../../pulse/ds/accounts-filter.css';
import { AccountsInsights, NetworkNarratives, WordsAndTime } from '../../../pulse/PageExtras';

function Empty({ children }) {
  return <div className="pulse-empty"><Database size={25} strokeWidth={1.3} /><p>{children}</p></div>;
}
function ErrorNotice({ error, retry, standalone }) {
  return <div className="pulse-error" role="alert"><AlertCircle size={20} /><div><strong>Data tidak tersedia</strong><p>{pulseError(error)}</p>{!standalone && <Link to="/login?returnTo=pulse">Masuk dengan akun admin</Link>}</div>{retry && <PulseButton variant="secondary" className="pulse-button" onClick={retry}>Coba lagi</PulseButton>}</div>;
}
// What each page looks like before its data arrives.
const skeletonShape = { overview: { stats: 6, panels: 2, rows: 3 }, sentiment: { stats: 4, panels: 1, rows: 3 }, posts: { stats: 0, panels: 0, rows: 6 }, comments: { stats: 0, panels: 3, rows: 4 }, accounts: { stats: 4, panels: 0, rows: 8 }, network: { stats: 4, panels: 1, rows: 2 }, reports: { stats: 4, panels: 2, rows: 3 } };
// Pages that narrow to the sentiment carried in the URL. Ikhtisar, Sentimen and Laporan always show the whole picture; Posting has its own filter chips.
const sentimentScoped = ['comments', 'accounts', 'network'];
function Panel({ title, note, children, className = '' }) {
  return <PulseCard className={'pulse-panel ' + className} padding="none" level={2} title={title} description={note}>{children}</PulseCard>;
}
// Sort choices of the account ranking: key, button label, how the figure is named in a sentence, unit under a leader tile.
const accountSortChoices = [['engagement', 'Interaksi', 'interaksi', 'interaksi, angka terakhir'], ['mentions', 'Posting', 'jumlah posting', 'posting'], ['followers', 'Pengikut', 'pengikut', 'pengikut']];
/** "Akun & sumber teratas": one filter bar (search, sort, platform chips with counts), the three leaders, and the
 * ranking table fifty rows at a time. Filters live in the URL query; the logic is in lib/pulseAccountFilters. */
function AccountRanking({ accounts, posts }) {
  const [params, setParams] = useSearchParams();
  const rows = useMemo(() => withFollowers(accounts, posts), [accounts, posts]);
  const available = useMemo(() => accountPlatforms(rows), [rows]);
  // Read once per render into plain values, so the memoised lists below depend on strings only.
  const stored = readAccountFilters(params, available);
  const sort = stored.sort, storedQuery = stored.query, platformKey = stored.platforms ? stored.platforms.join(',') : '';
  const platforms = useMemo(() => platformKey ? platformKey.split(',') : null, [platformKey]);
  // The typed text filters at once; the URL follows when typing pauses. Every write starts from the address bar,
  // not from the params of the last render: the router applies a change a moment later, and a second write made
  // in that moment (a chip right after typing, another filter on the page) must not undo the first.
  const [query, setQuery] = useState(storedQuery);
  const write = useCallback(patch => {
    const next = writeAccountFilters(window.location.search, patch);
    if (next.toString() !== new URLSearchParams(window.location.search).toString()) setParams(next, { replace: true });
  }, [setParams]);
  useEffect(() => {
    if (query.trim() === storedQuery) return;
    const timer = setTimeout(() => write({ query }), 300);
    return () => clearTimeout(timer);
  }, [query, storedQuery, write]);
  const ranking = useMemo(() => accountRanking(rows, { platforms, query, sort }), [rows, platforms, query, sort]);
  const facets = useMemo(() => platformFacets(rows, query), [rows, query]);
  // Paging starts over whenever the filter or the order changes.
  const signature = [platformKey, sort, query.trim().toLowerCase()].join('|');
  const [paging, setPaging] = useState({ signature, pages: 1 });
  const pages = paging.signature === signature ? paging.pages : 1;
  const page = pageOf(ranking.rows, pages);
  const filtered = isAccountFiltered({ platforms, query });
  const resultStatus = useRef(null), moreStatus = useRef(null);
  const clear = () => { setQuery(''); write({ platforms: null, query: '' }); resultStatus.current?.focus(); };
  const showMore = () => { if (page.remaining <= accountPageSize) moreStatus.current?.focus(); setPaging({ signature, pages: pages + 1 }); };
  const social = available.filter(platform => socialPlatforms.includes(platform));
  const socialOn = platforms !== null && platforms.length === social.length && social.every(platform => platforms.includes(platform));
  const matchCount = list => facets.filter(facet => !list || list.includes(facet.platform)).reduce((sum, facet) => sum + facet.count, 0);
  const [, , sortName, sortUnit] = accountSortChoices.find(([key]) => key === sort);
  const leaders = query.trim() ? [] : ranking.rows.slice(0, 3).filter(row => row.rank !== null);
  const followersKnown = ranking.rows.filter(row => row.followers !== null).length;
  const sortColumn = key => sort === key ? 'descending' : undefined;
  const drilldown = withoutAccountFilters(params).toString();
  return <Panel className="pa-ranking" title="Akun & sumber teratas">
    {ranking.total > 0 && <div className="pa-filter" role="search" aria-label="Saring akun dan sumber">
      <div className="pa-filter-row">
        <label className="pu-search pa-filter-search"><Search aria-hidden="true" /><span className="pu-sr">Cari akun atau sumber</span><input type="search" value={query} maxLength={80} onChange={event => setQuery(event.target.value)} placeholder="Cari nama akun atau sumber" /></label>
        <div className="pa-filter-group pa-filter-sort" role="group" aria-label="Urutkan menurut"><span className="pa-filter-label" aria-hidden="true">Urutkan</span><div className="pm-view-switch">{accountSortChoices.map(([key, label]) => <PulseButton key={key} aria-pressed={sort === key} onClick={() => write({ query, sort: key })}>{label}</PulseButton>)}</div></div>
      </div>
      {available.length > 1 && <PulseFilterGroup label="Platform" className="pa-filter-group">
        <PulseFilterChip active={platforms === null} count={formatCount(matchCount())} onClick={() => write({ query, platforms: null })}>Semua</PulseFilterChip>
        {social.length > 1 && social.length < available.length && <><PulseFilterChip active={socialOn} count={formatCount(matchCount(social))} onClick={() => write({ query, platforms: socialOn ? null : social })}>Media sosial</PulseFilterChip><span className="pa-filter-divider" aria-hidden="true" /></>}
        {facets.map(({ platform, count }) => <PlatformTag key={platform} size="lg" platform={platform} count={formatCount(count)} pressed={platforms !== null && platforms.includes(platform)} onClick={() => write({ query, platforms: togglePlatform(platforms, platform, available) })}>{platform === 'unknown' ? 'Lainnya' : undefined}</PlatformTag>)}
      </PulseFilterGroup>}
      <div className="pa-filter-result"><p ref={resultStatus} tabIndex={-1} role="status"><strong>{formatCount(ranking.rows.length)}</strong> dari {formatCount(ranking.total)} akun{sort === 'followers' && ranking.rows.length > 0 && <span>{followersKnown ? ` · pengikut tercatat pada ${formatCount(followersKnown)} akun` : ' · belum ada data pengikut'}</span>}</p><InfoTip label="Tentang angka ranking">Interaksi dan pengikut adalah angka terakhir tercatat, bukan jangkauan atau skor pengaruh. “—” berarti tidak tersedia, bukan nol.</InfoTip>{filtered && <PulseButton variant="quiet" size="sm" onClick={clear}><X aria-hidden="true" />Hapus semua filter</PulseButton>}</div>
    </div>}
    {leaders.length > 0 && <div className="pulse-leader-strip"><PulseStatGrid label={'Tiga teratas menurut ' + sortName}>{leaders.map(row => <PulseStat key={row.rank} media={<AccountAvatar author={row.author} platform={row.platform} />} label={`#${formatCount(row.rank)} · ${platformLabel(row.platform)}`} value={row[sort]} note={<><strong>{row.author || 'Penulis tidak diketahui'}</strong> · {sortUnit}</>} />)}</PulseStatGrid></div>}
    {ranking.rows.length ? <>
      <div className="pulse-table-wrap"><table className="pulse-ranking pa-table"><thead><tr><th scope="col">Akun / sumber</th><th scope="col" aria-sort={sortColumn('mentions')}>Posting <PulseArrow/></th><th scope="col" aria-sort={sortColumn('engagement')}>Interaksi</th><th scope="col" aria-sort={sortColumn('followers')}>Pengikut</th><th scope="col"><span className="sr-only">Bukti</span></th></tr></thead><tbody>{page.visible.map((row, index) => <AccountRankingRow key={row.key + ':' + index} row={row} sort={sort} search={drilldown} />)}</tbody></table></div>
      {ranking.rows.length > accountPageSize && <div className="pa-more">{page.remaining > 0 && <PulseButton onClick={showMore}>Tampilkan {formatCount(page.next)} lagi</PulseButton>}<p ref={moreStatus} tabIndex={-1} role="status">{page.remaining > 0 ? `${formatCount(page.visible.length)} dari ${formatCount(ranking.rows.length)} akun` : `Semua ${formatCount(ranking.rows.length)} akun`}</p></div>}
    </> : ranking.total > 0 ? <div className="pa-empty"><PulsePanelEmpty title="Tidak ada akun yang cocok">Ubah pencarian atau filter.</PulsePanelEmpty></div> : <Empty>Belum ada akun.</Empty>}
  </Panel>;
}
function Analytics({ data, view = 'all', period, onPeriodChange, topic, selectedPlatforms=null, onPlatformsChange, availablePlatforms=projectPlatformOptions }) {
  const [analysisParams]=useSearchParams();
  const analysisNavigate=useNavigate();
  const sentiment=analysisParams.get('sentiment');
  const postAuthor=analysisParams.get('author') || '';
  const postAccountKey=analysisParams.get('account') || '';   // account_v1 key from an account row
  const postPlatform=analysisParams.get('platform') || '';
  const postProvince=analysisParams.get('province') || '';   // from the spread map: posts that name one province
  const openSentiment=value=>{const next=new URLSearchParams(analysisParams);next.set('sentiment',value);analysisNavigate('/pulse/posts?'+next.toString());};
  // A day, week or month picked on the trend chart filters the list below it; the chart itself keeps the whole period.
  const pickedDay=analysisParams.get('day')||'',pickedDayTo=analysisParams.get('day_to')||'';
  const pickDates=(from,to)=>{const next=new URLSearchParams(analysisParams);next.delete('day');next.delete('day_to');if(from){next.set('day',from);if(to&&to!==from)next.set('day_to',to);}analysisNavigate('/pulse/posts?'+next.toString());};
  const allAccounts = data.influencers || [];
  const totals = data.metric_totals || {};
  const coverage = key => `${formatCount(totals[key]?.coverage)} dari ${formatCount(data.total_mentions)} posting memiliki metrik`;
  const platforms = [...data.platforms].sort((a, b) => b.count - a.count);
  const maximum = Math.max(1, ...platforms.map(row => row.count));
  const timeline = [...data.timeline].sort((a, b) => a.date.localeCompare(b.date));
  const dateLabel = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  };
  const metrics = [
    { label: 'Posting terkumpul', value: data.total_mentions, note: `${platforms.length} platform · ${(period?.from||period?.to)?'periode project terpilih':'seluruh periode tersimpan'}`, Icon: Radio },
    { label: 'Akun / sumber unik', value: allAccounts.length, note: 'Per platform, termasuk penerbit berita', Icon: Users },
    { label: 'Interaksi teramati', value: totals.engagement?.value, note: coverage('engagement'), Icon: Activity },
    { label: 'Share / repost', value: totals.shares?.value, note: coverage('shares'), Icon: RefreshCw },
    { label: 'Views teramati', value: totals.views?.value, note: coverage('views'), Icon: Layers },
  ];
  const responsePanel=<ResponseAnalysisPanel posts={data.posts||[]} topicId={topic?.id||analysisParams.get('topic')}/>;
  const responseSummary=<ResponseAnalysisSummary posts={data.posts||[]} topicId={topic?.id||analysisParams.get('topic')}/>;
  if(view==='overview') return <><OverviewAnalytics data={data} topic={topic} period={period} platforms={selectedPlatforms} onPlatformsChange={onPlatformsChange} availablePlatforms={availablePlatforms}/>{responseSummary}</>;
  if(view==='sentiment') return <><SentimentAnalytics data={data} topicId={topic?.id||analysisParams.get('topic')}/><details className="pulse-evaluation-disclosure"><summary>Evaluasi dari koreksi analis</summary><SentimentEvaluation topicId={topic?.id||analysisParams.get('topic')} period={period} platforms={selectedPlatforms}/></details></>;
  if(view==='reports') return <ProjectReport data={data} topic={topic} period={period} selectedPlatforms={selectedPlatforms}/>;
  return <>
    {view === 'all' && <nav className="pulse-section-nav" aria-label="Bagian dashboard"><a href="#pulse-network">Jaringan & narasi</a><a href="#pulse-comments">Top comments</a><a href="#pulse-posts">Kartu posting</a><a href="#pulse-infographics-view">Infografik</a></nav>}
    {['all', 'overview'].includes(view) && <>
    <div className="pulse-kpis">{metrics.map(({ label, value, note, Icon: icon }) => <section className="pulse-kpi" key={label}><div><span>{label}</span>{React.createElement(icon, { size: 18 })}</div><strong>{formatCount(value)}</strong><small>{note}</small></section>)}</div>
    <div className="pulse-chart-grid">
      <Panel title="Dinamika percakapan" className="pulse-timeline">
        {timeline.length ? <>
          <div className="pulse-chart" role="img" aria-label={'Grafik mention untuk ' + timeline.length + ' tanggal. Data tersedia pada tabel di bawah.'}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 18, right: 16, left: 0, bottom: 4 }}>
                <defs><linearGradient id="pulse-area-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#168577" stopOpacity={0.24} /><stop offset="100%" stopColor="#168577" stopOpacity={0.01} /></linearGradient></defs>
                <CartesianGrid stroke="#e7eeeb" vertical={false} strokeDasharray="3 4" />
                <XAxis dataKey="date" tickFormatter={dateLabel} tickLine={false} axisLine={false} minTickGap={30} tick={{ fill: '#66766e', fontSize: 12 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={45} tick={{ fill: '#66766e', fontSize: 12 }} />
                <Tooltip labelFormatter={dateLabel} formatter={value => [formatCount(value), 'Mention']} contentStyle={{ borderRadius: 10, borderColor: '#dce7e0', fontSize: 12 }} />
                <Area type="linear" dataKey="count" stroke="#168577" strokeWidth={2.5} fill="url(#pulse-area-fill)" dot={{ r: 3, fill: '#168577', strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <details className="pulse-data-table"><summary>Lihat data timeline</summary><table><thead><tr><th>Tanggal</th><th>Mention</th></tr></thead><tbody>{timeline.map(row => <tr key={row.date}><td>{row.date}</td><td>{formatCount(row.count)}</td></tr>)}</tbody></table></details>
        </> : <Empty>Belum ada timeline.</Empty>}
      </Panel>
      <Panel title="Distribusi platform">
        {platforms.length ? <div className="pulse-platforms">{platforms.map(row => <div key={row.platform} className="pulse-platform-row"><div><span><PlatformIcon platform={row.platform} size={17} />{platformLabel(row.platform)}</span><strong>{formatCount(row.count)}</strong></div><div className="pulse-bar-track"><span style={{ width: (row.count / maximum * 100) + '%' }} /></div></div>)}</div> : <Empty>Belum ada sumber platform yang terkumpul.</Empty>}
      </Panel>
    </div>
    <SentimentSummary posts={data.posts||[]} onSelect={openSentiment}/>
    </>}
    {view === 'accounts' && <PulseStatGrid label="Ringkasan akun dan sumber"><PulseStat label="Akun / sumber unik" icon={Users} value={allAccounts.length} note="Per platform" /><PulseStat label="Posting terkumpul" icon={Radio} value={data.total_mentions} note={allAccounts.length ? `${(data.total_mentions / allAccounts.length).toLocaleString('id-ID', { maximumFractionDigits: 1 })} posting per akun · ${platforms.length} platform` : `${platforms.length} platform`} /><PulseStat label="Interaksi teramati" icon={Activity} value={totals.engagement?.value ?? null} share={data.total_mentions ? (totals.engagement?.coverage || 0) / data.total_mentions * 100 : null} shareLabel="posting bermetrik" /><PulseStat label="Tayangan teramati" icon={Layers} value={totals.views?.value ?? null} share={data.total_mentions ? (totals.views?.coverage || 0) / data.total_mentions * 100 : null} shareLabel="posting punya tayangan" note="Bukan audiens unik" /></PulseStatGrid>}
    {view === 'accounts' && <AccountsInsights posts={data.posts || []} topic={topic} period={period} />}
    {['all', 'accounts'].includes(view) && <div className="pulse-detail-grid">
      <AccountRanking accounts={data.influencers} posts={data.posts} />
      {view === 'all' && <Panel title="Cakupan geografis">
        <GeographicView locations={data.locations} unknownCount={data.unknown_location_count} />
      </Panel>}
    </div>}
    {view === 'network' && <><NetworkNarratives posts={data.posts || []} /><WordsAndTime posts={data.posts || []} locations={data.locations || []} unknownCount={data.unknown_location_count} /></>}
    {['all', 'network'].includes(view) && <NetworkAnalysis key={'network-' + (data.posts?.[0]?.id || 'empty')} data={data.network} posts={data.posts || []} locations={data.locations||[]} unknownCount={data.unknown_location_count||0} />}
    {['all', 'comments'].includes(view) && <>{responsePanel}<CommentsPanel key={'comments-' + (data.posts?.[0]?.id || 'empty')} posts={data.posts || []} topicId={topic?.id||analysisParams.get('topic')} /></>}
    {view === 'posts' && <TrendChart dense title="Tren posting" posts={data.posts || []} period={period} selected={pickedDay ? { from: pickedDay, to: pickedDayTo || pickedDay } : null} onPick={row => pickDates(row.from, row.to)} onClear={() => pickDates('', '')} />}
    {['all', 'posts'].includes(view) && <PostFeed key={[analysisParams.get('topic'),sentiment,postAuthor,postAccountKey,postPlatform,postProvince,pickedDay,pickedDayTo,analysisParams.get('find')].join(':')} initialProvince={postProvince} initialQuery={analysisParams.get('find') || ''} posts={data.posts || []} period={period} onPeriodChange={onPeriodChange} topicId={analysisParams.get('topic')||''} initialDay={pickedDay} initialDayTo={pickedDayTo} initialSentiment={sentiment} initialAuthor={postAuthor} initialAccount={postAccountKey} initialPlatform={postPlatform} />}
    {view === 'all' && <div id="pulse-infographics-view"><InfographicsPanel ranged={false} posts={data.posts || []} locations={data.locations || []} unknownCount={data.unknown_location_count} /></div>}
  </>;
}

// The standalone workspace wraps every page in its own <main>; a second one inside it would nest landmarks.
function PageMain({ standalone, ...props }) { return standalone ? <div {...props} /> : <main {...props} />; }

export default function PulseDashboard({ standalone = false, view = 'all' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const topicId = searchParams.get('topic') || null;
  const [period,setPeriod]=useProjectPeriod(topicId);
  const [selectedPlatforms,setSelectedPlatforms]=useProjectPlatforms(topicId);
  const platformKey=JSON.stringify(selectedPlatforms);
  const alertId = searchParams.get('alert') || null;
  const [platform, setPlatform] = useState(null);
  const [sort, setSort] = useState('score');
  const [action, setAction] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [result, setResult] = useState(null);
  const [notice, setNotice] = useState('');
  const [contentMode, setContentMode] = useState('posts');
  const topics = useTopics();
  const issues = useIssues({ topicId });
  const analytics = usePulseAnalytics(topicId, alertId, standalone?period:{});
  const carriedSentiment = sentimentLabels[searchParams.get('sentiment')] && sentimentScoped.includes(view) ? searchParams.get('sentiment') : null;
  const loadedAt = useMemo(() => analytics.data ? new Date() : null, [analytics.data]);
  const flagged = useFlaggedPosts(standalone ? topicId : '');
  const includeFlagged = searchParams.get('tidakrelevan') === '1';
  // One rule for every analysis page: posts an analyst marked "tidak relevan" are not counted, unless asked. Posting lists everything.
  const flaggedSet = useMemo(() => view === 'posts' || includeFlagged || !flagged.ids.length ? null : new Set(flagged.ids), [view, includeFlagged, flagged.ids]);
  const toggleFlagged = on => { const next = new URLSearchParams(searchParams); if (on) next.set('tidakrelevan', '1'); else next.delete('tidakrelevan'); setSearchParams(next, { replace: true }); };
  const scopedData=useMemo(()=>analytics.data&&standalone?scopeProjectData(analytics.data,{from:period.from,to:period.to,platforms:JSON.parse(platformKey),sentiments:carriedSentiment?[carriedSentiment]:null,excludedIds:flaggedSet}):analytics.data,[analytics.data,standalone,period.from,period.to,platformKey,carriedSentiment,flaggedSet]);
  const dropSentiment = () => { const next = new URLSearchParams(searchParams); next.delete('sentiment'); setSearchParams(next); };
  // The project bar sits above this page and counts from the same posts (its coverage badge): hand them up once loaded.
  const loadedPosts = standalone && !alertId ? analytics.data?.posts : null;
  useEffect(() => { if (loadedPosts) shareProjectPosts(topicId, { from: period.from, to: period.to }, loadedPosts); }, [loadedPosts, topicId, period.from, period.to]);
  const availablePlatforms=[...new Set([...projectPlatformOptions,...(analytics.data?.posts||[]).map(p=>p.platform),...(selectedPlatforms||[])])];
  useEffect(() => {
    if (!alertId || !analytics.data) return;
    const frame = requestAnimationFrame(() => document.getElementById('pulse-network')?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [alertId, analytics.data]);
  const selected = topics.topics.find(topic => topic.id === topicId);
  const token = standalone ? null : localStorage.getItem('sinar_token');
  const needsLogin = !standalone && (!token || token === 'demo-token');
  const refresh = () => Promise.all([topics.refetch(), issues.refetch(), analytics.refetch()]);
  // Panels that add stored data (for example collected comments) ask for a reload without owning the fetch. It runs in the
  // background: the page keeps what it shows (the cards opened on Komentar too) until the new data arrives.
  const refetchAnalytics = analytics.refetch;
  useEffect(() => { const reload = () => refetchAnalytics({ background: true }); window.addEventListener('pulse-data-changed', reload); return () => window.removeEventListener('pulse-data-changed', reload); }, [refetchAnalytics]);
  const run = async (kind) => {
    if (action || needsLogin) return;
    if (kind === 'crawl' && !window.confirm('Mulai crawl untuk topik ini? Dapat memakai kuota atau biaya.')) return;
    setAction(kind);
    setActionError(null);
    setResult(null);
    setNotice('');
    try {
      if (kind === 'bootstrap') {
        await topics.bootstrap();
        setNotice('Topik awal siap.');
      } else {
        const response = await topics.crawlNow(topicId);
        setResult({ ...response, label: selected?.label });
      }
      await refresh();
    } catch (error) { setActionError(error); }
    finally { setAction(null); }
  };
  const filtered = issues.issues.filter(issue => platform === null || platform.some(p => issue.platforms?.includes(p))).sort((a, b) => sort === 'recent' ? new Date(b.last_seen_at || 0) - new Date(a.last_seen_at || 0) : (b.score || 0) - (a.score || 0));
  const providers = providerResults(result?.providers || result?.provider_statuses);
  const issuePlatforms = [...new Set(issues.issues.flatMap(issue => issue.platforms || []))];
  const selectTopic = id => { setSearchParams(id ? { topic: id } : {}); setPlatform(null); };
  const openAlert = alert => {
    const params = alert.issue_id ? { topic: alert.topic_id, alert: alert.id } : { topic: alert.topic_id };
    if (standalone && alert.issue_id) navigate('/pulse/network?' + new URLSearchParams(params));
    else setSearchParams(params);
    setPlatform(null);
  };
  const titles = { sentiment: 'Sentimen', overview: 'Ikhtisar', monitor: 'Monitor Project', network: 'Jaringan & narasi', accounts: 'Akun & sumber', posts: 'Posting', comments: 'Komentar' };
  const descriptions = { sentiment: 'Pahami nada percakapan, perubahan harian, dan posting di baliknya.', overview: 'Ringkasan aktivitas dan cakupan percakapan project.', monitor: 'Pantau alert, jadwal pengambilan, dan kesehatan antrean.', network: 'Telusuri hubungan akun dan kronologi berdasarkan bukti sumber.', accounts: 'Temukan akun penyebar dan bandingkan interaksi dalam sampel.', posts: 'Periksa konten asli, preview media, dan riwayat metrik.', comments: 'Baca respons publik dari komentar posting yang tersimpan.' };
  titles.reports='Laporan';
  descriptions.reports='Ringkasan eksekutif dan bukti sumber sesuai periode project, siap dicetak sebagai PDF.';
  if (standalone && !topicId) return <div className="pulse-empty"><Database size={28} /><h1>Pilih project untuk mulai memantau</h1><p>Pilih salah satu project di atas.</p></div>;
  if (standalone && !topics.loading && !topics.error && !selected) return <div className="pulse-empty"><h1>Project tidak tersedia</h1><p>Pilih project lain di atas.</p></div>;
  return <ProjectPostsContext.Provider value={scopedData?.posts || null}><div className="pulse-dashboard" id="pulse-dashboard" data-view={view}>
    {standalone ? <PulsePageHead icon={pageMeta[view]?.icon} title={pageMeta[view]?.title || titles[view] || 'Pulse'} tagline={pageMeta[view]?.tagline} guide={pageMeta[view]?.guide}><PulseButton variant="secondary" className="pulse-button" disabled={!!action || analytics.loading || issues.loading || topics.loading} onClick={refresh}><RefreshCw size={15} />Muat ulang</PulseButton></PulsePageHead> : <header className="pulse-header">
      <div className="pulse-brand"><span className="pulse-brand-icon"><Activity size={25} /></span><div><h1>{standalone ? titles[view] || 'Pulse' : 'Pulse'}</h1><p>{standalone ? descriptions[view] : 'Pantau percakapan. Telusuri buktinya.'}</p></div></div>
      <div className="pulse-header-actions"><span className="pulse-data-badge"><ShieldCheck size={14} />Sumber publik</span><PulseButton variant="secondary" className="pulse-button" disabled={!!action || analytics.loading || issues.loading || topics.loading} onClick={refresh}><RefreshCw size={15} />Muat ulang</PulseButton></div>
    </header>}
    {carriedSentiment && <div className="pu-carried" role="status"><span>Filter dari halaman sebelumnya</span><SentimentTag value={carriedSentiment} /><PulseTag size="lg" variant="outline" onRemove={dropSentiment} removeLabel="Lepas filter sentimen">Lepas filter</PulseTag><small>Hanya posting bersentimen {sentimentLabels[carriedSentiment].toLowerCase()}.</small></div>}
    {standalone && flagged.ids.length > 0 && view !== 'monitor' && (view === 'posts'
      ? <p className="po-relevance-note">Semua posting, termasuk {formatCount(flagged.ids.length)} yang ditandai tidak relevan.</p>
      : <label className="po-relevance po-relevance-bar"><input type="checkbox" role="switch" className="pu-switch-input" checked={includeFlagged} onChange={event => toggleFlagged(event.target.checked)} /> Sertakan {formatCount(flagged.ids.length)} posting yang ditandai tidak relevan<InfoTip label="Tentang posting tidak relevan">Berlaku di semua halaman analisis; Posting selalu menampilkan semuanya.</InfoTip></label>)}
    {standalone && loadedAt && view !== 'monitor' && <p className="po-data-stamp">Dimuat pukul {new Date(localTime(loadedAt)).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).replace(':', '.')} {zone().name}</p>}
    {standalone && <SentimentProgress key={topicId} topicId={topicId} posts={analytics.loading?undefined:scopedData?.posts} onChange={analytics.refetch} quiet/>}
    {needsLogin && <div className="pulse-auth-note"><ShieldCheck size={21} /><div><strong>Analytics live memerlukan login admin asli.</strong><p>Login demo tidak memberi akses API.</p></div><Link className="pulse-button primary" to="/login?returnTo=pulse">Masuk dengan akun admin</Link></div>}
    <div className="pulse-layout">
      {!standalone && <div><TopicManager resource={topics} onSelectTopic={selectTopic} selectedTopicId={topicId} disabled={!!action || needsLogin} onChanged={refresh} />
        {!standalone && <div className="pulse-bootstrap"><Database size={20} /><strong>Mulai dari topik awal</strong><PulseButton variant="secondary" className="pulse-button" disabled={!!action || needsLogin || topics.loading} onClick={() => run('bootstrap')}>{action === 'bootstrap' ? 'Menyiapkan…' : 'Siapkan topik awal'}</PulseButton></div>}
      </div>}
      <PageMain standalone={standalone} className="pulse-main">
        {view === 'posts' && <div className="ps-content-switch" role="group" aria-label="Jenis konten"><PulseButton aria-pressed={contentMode === 'posts'} onClick={()=>setContentMode('posts')}>Posting individual</PulseButton><PulseButton aria-pressed={contentMode === 'issues'} onClick={()=>setContentMode('issues')}>Kelompok percakapan</PulseButton></div>}
        {!standalone && <details className="ps-data-tools"><summary>Pengaturan pengumpulan</summary>
        <div className="pulse-scope"><div><h2>{selected ? selected.label : 'Ikhtisar semua topik'}</h2></div><PulseButton variant="primary" className="pulse-button primary" disabled={!topicId || !!action || needsLogin || topics.loading} onClick={() => run('crawl')}><Download size={15} />{action === 'crawl' ? 'Mengumpulkan sumber…' : 'Crawl manual'}</PulseButton></div>
        {!selected && <p className="pulse-crawl-hint">Pilih satu topik.</p>}
        {standalone && <Link to={'/pulse/sources?' + new URLSearchParams({ topic: topicId })}>Periksa sumber & cakupan →</Link>}
        </details>}
        {['all', 'monitor'].includes(view) && <MonitorRoom key={topicId || 'all'} topicId={topicId} topics={topics.topics} onOpenAlert={openAlert} disabled={needsLogin} />}
        {alertId && <div className="pm-alert-scope"><strong>Analisis dari alert</strong><p>{analytics.data?.alert?.title || 'Memuat konteks alert…'}</p><PulseButton variant="secondary" className="pulse-button" onClick={() => selectTopic(topicId)}>Kembali ke seluruh topik</PulseButton></div>}
        {topics.error && <ErrorNotice standalone={standalone} error={topics.error} retry={topics.refetch} />}
        {actionError && <ErrorNotice standalone={standalone} error={actionError} />}
        {notice && <p className="pulse-notice" role="status">{notice}</p>}
        {action === 'crawl' && <p className="pulse-notice" role="status">Crawl berjalan…</p>}
        {result && <section className="pulse-crawl-result" aria-label="Hasil crawl" role="status"><strong>Respons crawl diterima · {allegationLabel(result.label)}</strong><p>{formatCount(result.ingested)} item diingest.</p><div className="pulse-provider-list">{providers.map((row, index) => <div key={row.provider || index}><strong>{row.provider || row.source || 'Provider'}</strong><span>{row.status || 'Status tidak tersedia'}</span>{row.ingested != null && <span>{formatCount(row.ingested)} item</span>}<small>{row.reason || row.error || row.message}</small></div>)}</div>{!providers.length && <p>Status provider tidak disertakan oleh API.</p>}</section>}
        {view !== 'monitor' && !(view === 'posts' && contentMode === 'issues') && (analytics.loading ? (standalone ? <PulseSkeleton label={`Memuat ${(pageMeta[view]?.title || 'analisis').toLowerCase()}…`} {...skeletonShape[view]} /> : <div className="pulse-loading" role="status"><Activity size={22} /><span>Memuat analisis…</span></div>) : analytics.error ? <ErrorNotice standalone={standalone} error={analytics.error} retry={analytics.refetch} /> : scopedData && <Analytics key={topicId+':'+period.from+':'+period.to+':'+platformKey} data={scopedData} view={view} topic={selected} period={standalone?period:null} onPeriodChange={standalone?setPeriod:null} selectedPlatforms={standalone?selectedPlatforms:null} onPlatformsChange={setSelectedPlatforms} availablePlatforms={availablePlatforms} />)}
        {standalone && view === 'posts' && contentMode === 'issues' && (analytics.loading ? <PulseSkeleton label="Memuat kelompok percakapan…" stats={0} panels={0} rows={5} /> : analytics.error ? <ErrorNotice standalone error={analytics.error} retry={analytics.refetch}/> : scopedData && <ConversationGroups key={topicId+':'+period.from+':'+period.to+':'+platformKey} posts={scopedData.posts||[]} period={period} platforms={selectedPlatforms}/>)}
        {!standalone && (view === 'all' || (view === 'posts' && contentMode === 'issues')) && <section className="pulse-issues">
          <div className="pulse-issues-heading"><div><h2>Kelompok percakapan</h2></div><span>{issues.loading || issues.error ? '—' : filtered.length} kelompok ditampilkan</span></div>
          <div className="pulse-filters"><PlatformCheckboxes platforms={issuePlatforms} value={platform} onChange={setPlatform} /><label>Urutkan<select value={sort} onChange={e => setSort(e.target.value)}><option value="score">Skor isu</option><option value="recent">Terbaru</option></select></label></div>
          {issues.loading ? <p className="pulse-loading" role="status">Memuat isu…</p> : issues.error ? <ErrorNotice standalone={standalone} error={issues.error} retry={issues.refetch} /> : filtered.length ? <div className="pulse-issue-list">{filtered.map(issue => <IssueCard key={issue.id + ':' + issue.last_seen_at + ':' + issue.item_count} issue={issue} platformFilter={platform ?? "all"} dateMode="absolute" />)}</div> : <Empty>{issues.issues.length ? 'Tidak ada isu yang cocok dengan filter platform.' : 'Belum ada isu.'}</Empty>}
        </section>}
        <footer className="pulse-footer"><ShieldCheck size={14} />Sampel percakapan publik</footer>
      </PageMain>
    </div>
  </div></ProjectPostsContext.Provider>;
}

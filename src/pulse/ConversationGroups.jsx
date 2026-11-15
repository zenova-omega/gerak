import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import {
  buildConversationGroups, defaultGroupFilters, filterConversationGroups, groupDayRange, groupPageSize, groupSentiments,
  groupTotalsText, isGroupFiltered, leadingGroups, pageOfGroups, sentimentShares, toggleGroupFilter,
} from '../lib/pulseConversationGroups';
import { sourceText } from '../lib/pulseOverview';
import { formatCount, pulseDate, safeSourceUrl } from '../lib/pulseData';
import { postSentiment, sentimentLabels } from '../lib/pulsePostFilters';
import { platformColor, sentimentColor, sentimentTone } from '../lib/pulseChartTheme';
import { PlatformIcon, platformLabel } from '../components/admin/pulse/PlatformIcon';
import AccountAvatar from '../components/admin/pulse/AccountAvatar';
import { PulseArrow } from '../components/ui/PulseArrow';
import { PulseButton } from '../components/ui/PulseUI';
import { PlatformTag, PulseTag, SentimentTag } from '../components/ui/PulseTag';
import { PulseBeat, PulseShare } from '../components/ui/PulseMetricIcons';
import { PulseMetricRow } from '../components/ui/PulseMetricRow';
import { PulsePanelEmpty } from '../components/ui/PulseAnalytics';
import AnalyticsPanel from './AnalyticsPanel';
import InfoTip from './InfoTip';
import './ds/conversation-groups.css';

const sortChoices = [['posts', 'Posting', 'Posting terbanyak'], ['accounts', 'Akun', 'Akun terbanyak'], ['interactions', 'Interaksi', 'Interaksi terbanyak'], ['recent', 'Terbaru', 'Aktivitas terbaru']];
const postPageSize = 10;
// The product's mark for a figure nobody observed, written by the shared formatter.
const unknown = <span aria-label="Tidak tersedia">{formatCount(null)}</span>;
/** The figures of a sentence in bold, so the totals line can be read at a glance. */
const emphasise = text => text.split(/(\d[\d.]*)/).map((part, index) => index % 2 ? <b key={index}>{part}</b> : part);

/** The text of a group: clamped to a few lines, with a toggle only when something is actually cut off. */
function GroupText({ text }) {
  const node = useRef(null), id = useId();
  const [expanded, setExpanded] = useState(false), [clipped, setClipped] = useState(false);
  useEffect(() => {
    const element = node.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => { if (!element.hasAttribute('data-expanded')) setClipped(element.scrollHeight > element.clientHeight + 1); });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div className="pcg-copy">
    <p ref={node} id={id} className="pcg-text" data-expanded={expanded ? '' : undefined}>{text}</p>
    {(clipped || expanded) && <button type="button" className="pcg-more" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}>{expanded ? 'Ringkas teks' : 'Baca selengkapnya'}</button>}
  </div>;
}

/** Who wrote it, where and when. */
function GroupFacts({ group }) {
  const faces = group.accounts.slice(0, 5), more = group.accountCount - faces.length, range = groupDayRange(group.firstDay, group.lastDay);
  const names = faces.map(face => face.author || 'tanpa nama').join(', ') + (more > 0 ? ` dan ${formatCount(more)} akun lain` : '');
  return <ul className="pcg-facts">
    <li className="pcg-who">{group.accountCount > 0
      ? <><span className="pcg-faces" aria-hidden="true">{faces.map((face, index) => <span key={index} title={`${face.author || 'Tanpa nama'} · ${platformLabel(face.platform)}`}><AccountAvatar size="xs" author={face.author} platform={face.platform} /></span>)}{more > 0 && <span className="pcg-faces-more">+{formatCount(more)}</span>}</span><span><b>{formatCount(group.accountCount)}</b> akun<span className="pu-sr">: {names}</span></span></>
      : <span>Akun tidak tercatat</span>}</li>
    <li className="pcg-where">{group.platforms.map(row => <span key={row.platform} title={`${platformLabel(row.platform)}: ${formatCount(row.count)} posting`} style={{ '--pcg-plat': platformColor(row.platform) }}><PlatformIcon platform={row.platform} size={14} /><b>{formatCount(row.count)}</b><span className="pu-sr"> posting di {platformLabel(row.platform)}</span></span>)}</li>
    {range && <li className="pcg-when"><CalendarDays size={14} aria-hidden="true" /><span className="pu-sr">Terbit </span><time>{range}</time></li>}
  </ul>;
}

/** How far it went. Interactions are what the posts gathered themselves; "dibagikan" is the share count of the content,
 * read once per group. A figure nobody observed shows a dash; a group without any figure (news) shows no line. */
function GroupReach({ group }) {
  if (group.interactions === null && group.shares === null) return null;
  return <ul className="pcg-reach">
    <li><PulseBeat size={14} /><b>{group.interactions === null ? unknown : formatCount(group.interactions)}</b> interaksi</li>
    <li><PulseShare size={14} />konten dibagikan <b>{group.shares === null ? unknown : formatCount(group.shares) + '×'}</b></li>
  </ul>;
}

/** Sentiment mix of one group as a small bar. The caption says what the bar is a share of; posts still waiting are a count. */
function GroupTone({ sentiment }) {
  const mix = sentimentShares(sentiment);
  if (!mix.analysed) return <div className="pcg-tone" data-empty=""><span className="pcg-tone-label">Sentimen</span><SentimentTag size="sm" value="unknown" /></div>;
  const basis = mix.unknown ? `${formatCount(mix.analysed)} dari ${formatCount(mix.total)} posting dianalisis` : `${formatCount(mix.total)} posting`;
  const spoken = mix.parts.map(part => `${sentimentLabels[part.key].toLowerCase()} ${part.text}`).join(', ');
  return <div className="pcg-tone">
    <span className="pcg-tone-label">Sentimen <span>· {basis}</span></span>
    <span className="pcg-tone-bar" role="img" aria-label={`Sentimen ${basis}: ${spoken}`}>{mix.parts.map(part => <i key={part.key} style={{ flexGrow: part.count, '--swatch': sentimentColor[part.key] }} />)}</span>
    <ul className="pcg-tone-key" aria-hidden="true">{mix.parts.map(part => <li key={part.key}><i className="pu-swatch" style={{ '--swatch': sentimentColor[part.key] }} />{sentimentLabels[part.key]} <b>{part.text}</b></li>)}</ul>
  </div>;
}

/** The posts of one group, earliest first, ten at a time. `heading` names the group when the block is not inside its row. */
function GroupPosts({ group, id, label, heading }) {
  const [shown, setShown] = useState(postPageSize);
  const rest = group.size - shown;
  // A post that says exactly what the group says is one line: who, when, tone and its own figures. Only a text that differs is written out.
  const texts = group.posts.map(sourceText), same = texts.filter(text => text === group.title).length;
  return <div className="pcg-posts" id={id} role="region" aria-label={label}>
    <p className="pcg-posts-note">{heading && <strong>{heading} </strong>}{same === group.size ? 'Semua posting berteks sama dengan teks kelompok.' : `${formatCount(same)} dari ${formatCount(group.size)} posting berteks sama dengan teks kelompok; teks ditulis ulang hanya bila berbeda.`} Urut dari yang paling awal terbit.{group.interactionCoverage < group.size ? ` Angka interaksi tercatat pada ${formatCount(group.interactionCoverage)} dari ${formatCount(group.size)} posting.` : ''}</p>
    <ol>{group.posts.slice(0, shown).map((post, index) => { const url = safeSourceUrl(post.url), text = texts[index]; return <li key={post.id}>
      <div className="pcg-post-id"><AccountAvatar size="sm" author={post.author} platform={post.platform} /><div className="pcg-post-who"><strong>{post.author || 'Sumber tanpa nama'}</strong><small>{platformLabel(post.platform)} · {pulseDate(post.published_at)}</small></div></div>
      <SentimentTag size="sm" value={postSentiment(post)} />
      {text !== group.title && <p className="pcg-post-text">{text || 'Teks tidak tersedia'}</p>}
      <PulseMetricRow hideEmpty metrics={post.metrics} platform={post.platform} label={`Interaksi posting ${post.author || ''}`.trim()} />
      {url && <a className="pcg-post-link" href={url} target="_blank" rel="noopener noreferrer">Buka posting asli <PulseArrow /></a>}
    </li>; })}</ol>
    {rest > 0 && <PulseButton size="sm" variant="quiet" onClick={() => setShown(value => value + postPageSize)}>Tampilkan {formatCount(Math.min(postPageSize, rest))} posting lagi{rest > postPageSize && <span className="pcg-rest">({formatCount(rest)} tersisa)</span>}</PulseButton>}
  </div>;
}

function OpenButton({ open, controls, title, onClick }) {
  return <PulseButton className="pcg-open" size="sm" aria-expanded={open} aria-controls={controls} aria-label={`${open ? 'Tutup posting' : 'Lihat posting'}: ${title.slice(0, 80)}`} onClick={onClick}>{open ? 'Tutup posting' : 'Lihat posting'}<ChevronDown size={16} aria-hidden="true" /></PulseButton>;
}

/** One row of the list. It opens in place. */
function GroupRow({ group }) {
  const [open, setOpen] = useState(false), id = useId();
  return <li className="pcg-row" data-open={open ? '' : undefined}>
    <p className="pcg-size"><strong>{formatCount(group.size)}</strong> posting</p>
    <div className="pcg-main"><GroupText text={group.title} /><GroupFacts group={group} /></div>
    <div className="pcg-side"><GroupReach group={group} /><GroupTone sentiment={group.sentiment} /></div>
    <OpenButton open={open} controls={id} title={group.title} onClick={() => setOpen(value => !value)} />
    {open && <GroupPosts group={group} id={id} label={`Posting dalam kelompok: ${group.title.slice(0, 80)}`} />}
  </li>;
}

/** "Kelompok percakapan": what is being repeated, then every group with a filter that narrows the list.
 * `period` and `platforms` are the project scope; the filter in this view never changes what a group contains. */
export default function ConversationGroups({ posts = [], period = {}, platforms = null }) {
  const from = period?.from || '', to = period?.to || '', platformKey = platforms ? platforms.join(',') : null;
  const built = useMemo(() => buildConversationGroups(posts, { from, to, platforms: platformKey === null ? null : platformKey.split(',').filter(Boolean) }), [posts, from, to, platformKey]);
  const leaders = useMemo(() => leadingGroups(built.groups), [built]);
  const [filters, setFilters] = useState(defaultGroupFilters);
  const result = useMemo(() => filterConversationGroups(built.groups, filters), [built, filters]);
  // Paging starts over whenever the filter or the order changes.
  const signature = JSON.stringify(filters);
  const [paging, setPaging] = useState({ signature, pages: 1 });
  const page = pageOfGroups(result.groups, paging.signature === signature ? paging.pages : 1, groupPageSize);
  const [openLead, setOpenLead] = useState(null), [showChips, setShowChips] = useState(false);
  const status = useRef(null), leadPosts = useRef(null), base = useId();
  const available = result.facets.platforms.map(row => row.platform);
  const patch = change => setFilters(current => ({ ...current, ...change }));
  const filtered = isGroupFiltered(filters);
  const narrowed = (filters.platforms ? 1 : 0) + (filters.sentiments ? 1 : 0) + (filters.minPosts !== defaultGroupFilters.minPosts ? 1 : 0);
  const clear = () => { setFilters(current => ({ ...defaultGroupFilters, sort: current.sort })); status.current?.focus(); };
  const showMore = () => { if (page.remaining <= groupPageSize) status.current?.focus(); setPaging({ signature, pages: (paging.signature === signature ? paging.pages : 1) + 1 }); };
  const lead = leaders.find(group => group.id === openLead);
  useEffect(() => { if (openLead) leadPosts.current?.scrollIntoView({ block: 'nearest' }); }, [openLead]);
  const tip = <InfoTip label="Tentang kelompok percakapan">Teks mirip bukan bukti koordinasi.</InfoTip>;

  return <section className="pcg" aria-label="Kelompok percakapan">
    <AnalyticsPanel className="pcg-lead" label="Paling banyak diulang" title={<>Paling banyak diulang {tip}</>} description={<>{emphasise(groupTotalsText(built.totals))}.</>}>
      {leaders.length ? <div className="pcg-leaders" style={{ '--pcg-columns': leaders.length }}>
        {leaders.map((group, index) => { const id = `${base}-lead-${index}`, open = openLead === group.id; return [
          <article className="pcg-leader" key={group.id} data-open={open ? '' : undefined} aria-label={`Peringkat ${index + 1}: ${group.title.slice(0, 80)}`}>
            <p className="pcg-size"><span className="pcg-rank" aria-hidden="true">{index + 1}</span><strong>{formatCount(group.size)}</strong> posting</p>
            <GroupText text={group.title} />
            <GroupFacts group={group} />
            <GroupReach group={group} />
            <GroupTone sentiment={group.sentiment} />
            <OpenButton open={open} controls={id} title={group.title} onClick={() => setOpenLead(open ? null : group.id)} />
          </article>,
          open && lead && <div className="pcg-lead-posts" key={group.id + ':posts'} ref={leadPosts}><GroupPosts group={lead} id={id} label={`Posting dalam kelompok peringkat ${index + 1}`} heading={`Peringkat ${index + 1}, ${formatCount(lead.size)} posting.`} /></div>,
        ]; })}
      </div> : <PulsePanelEmpty title="Belum ada teks yang diulang">{built.totals.posts ? 'Setiap posting berdiri sendiri.' : 'Belum ada posting.'}</PulsePanelEmpty>}
    </AnalyticsPanel>

    {/* With no more groups than the lead shows, a second list would only repeat it. */}
    {result.total > leaders.length && <AnalyticsPanel className="pcg-list" title="Semua kelompok">
      <div className="pcg-filter" role="search" aria-label="Saring kelompok" data-chips={showChips ? '' : undefined}>
        <div className="pcg-filter-top">
          <label className="pu-search pcg-search"><Search aria-hidden="true" /><span className="pu-sr">Cari kelompok</span><input type="search" value={filters.query} maxLength={80} onChange={event => patch({ query: event.target.value })} placeholder="Cari teks atau nama akun" /></label>
          <div className="pcg-chipset pcg-sort" role="group" aria-label="Urutkan menurut"><span className="pcg-chipset-label" aria-hidden="true">Urutkan</span><div className="pm-view-switch">{sortChoices.map(([key, label, full]) => <PulseButton key={key} aria-pressed={filters.sort === key} aria-label={full} title={full} onClick={() => patch({ sort: key })}>{label}</PulseButton>)}</div></div>
          <PulseButton className="pcg-chips-toggle" size="sm" aria-expanded={showChips} aria-controls={base + '-chips'} onClick={() => setShowChips(value => !value)}><SlidersHorizontal aria-hidden="true" />Filter{narrowed > 0 && <span className="pcg-chips-count">{narrowed}<span className="pu-sr"> aktif</span></span>}</PulseButton>
        </div>
        <div className="pcg-chips" id={base + '-chips'}>
          {available.length > 1 && <div className="pcg-chipset" role="group" aria-label="Saring menurut platform"><span className="pcg-chipset-label" aria-hidden="true">Platform</span><div className="pu-tag-group">
            <PulseTag size="lg" tone="accent" pressed={filters.platforms === null} onClick={() => patch({ platforms: null })}>Semua</PulseTag>
            {result.facets.platforms.map(({ platform, count }) => { const pressed = filters.platforms !== null && filters.platforms.includes(platform); return <PlatformTag key={platform} size="lg" platform={platform} count={formatCount(count)} pressed={pressed} disabled={!count && !pressed} onClick={() => patch({ platforms: toggleGroupFilter(filters.platforms, platform, available) })}>{platform === 'unknown' ? 'Lainnya' : undefined}</PlatformTag>; })}
          </div></div>}
          <div className="pcg-chipset" role="group" aria-label="Saring menurut sentimen terbanyak dalam kelompok"><span className="pcg-chipset-label" aria-hidden="true">Sentimen terbanyak</span><div className="pu-tag-group">
            <PulseTag size="lg" tone="accent" pressed={filters.sentiments === null} onClick={() => patch({ sentiments: null })}>Semua</PulseTag>
            {result.facets.sentiments.map(({ sentiment, count }) => { const pressed = filters.sentiments !== null && filters.sentiments.includes(sentiment); return <PulseTag key={sentiment} size="lg" dot tone={sentimentTone[sentiment]} count={formatCount(count)} pressed={pressed} disabled={!count && !pressed} onClick={() => patch({ sentiments: toggleGroupFilter(filters.sentiments, sentiment, groupSentiments) })}>{sentimentLabels[sentiment]}</PulseTag>; })}
          </div></div>
          <div className="pcg-chipset" role="group" aria-label="Ukuran kelompok paling sedikit"><span className="pcg-chipset-label" aria-hidden="true">Ukuran</span><div className="pu-tag-group">
            {result.facets.sizes.map(({ size, count }) => { const pressed = filters.minPosts === size; return <PulseTag key={size} size="lg" tone="accent" count={formatCount(count)} pressed={pressed} disabled={!count && !pressed} aria-label={`${size} posting atau lebih, ${formatCount(count)} kelompok`} onClick={() => patch({ minPosts: size })}>{size}+ posting</PulseTag>; })}
          </div></div>
        </div>
        <div className="pcg-result"><p ref={status} tabIndex={-1} role="status"><strong>{formatCount(result.groups.length)}</strong> dari {formatCount(result.total)} kelompok{page.remaining > 0 && <span> · {formatCount(page.visible.length)} ditampilkan</span>}</p>{filtered && page.visible.length > 0 && <PulseButton variant="quiet" size="sm" onClick={clear}><X aria-hidden="true" />Hapus semua filter</PulseButton>}</div>
      </div>
      {page.visible.length ? <ul className="pcg-rows">{page.visible.map(group => <GroupRow key={group.id} group={group} />)}</ul>
        : <PulsePanelEmpty title="Tidak ada kelompok yang cocok" action={<PulseButton size="sm" onClick={clear}>Hapus semua filter</PulseButton>}>Longgarkan filter atau kata pencarian.</PulsePanelEmpty>}
      {page.remaining > 0 && <div className="pcg-next"><PulseButton onClick={showMore}>Tampilkan {formatCount(page.next)} lagi{page.remaining > page.next && <span className="pcg-rest">({formatCount(page.remaining)} tersisa)</span>}</PulseButton></div>}
    </AnalyticsPanel>}
  </section>;
}

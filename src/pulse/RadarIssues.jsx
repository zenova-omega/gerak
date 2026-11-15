import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, Search, Sparkle } from 'lucide-react';
import { PlatformIcon } from '../components/admin/pulse/PlatformIcon';
import { Button } from '../components/ui/shadcn/button';
import { PulseButton } from '../components/ui/PulseUI';
import { PulseTag } from '../components/ui/PulseTag';
import { formatCount, safeSourceUrl } from '../lib/pulseData';
import { categoryLabel, issueImage, movementText, platformMeters, projectHref, provinceName, radarPlatforms, SAMPLED, searchHref, SOCIAL, visibleIssues } from '../lib/pulseRadar';
import AnalyticsPanel from './AnalyticsPanel';
import InfoTip from './InfoTip';
import IssuePicture from './IssuePicture';
import './ds/radar-issues.css';

const movementIcon = { new: Sparkle, up: ArrowUp, down: ArrowDown };
const interactions = figure => figure ? `${formatCount(figure)} interaksi` : '';
const rawUnit = { news: figure => figure ? `${formatCount(figure)} liputan lain` : '', youtube: figure => figure ? `${formatCount(figure)} tayangan` : '', search: figure => figure ? `${formatCount(figure)}+ pencarian` : '',
  x: interactions, tiktok: interactions, instagram: interactions };
const OWN_LISTS = ['news', 'youtube', 'search'];      // read whole at every refresh; X has a list only when it was searched
const FEATURED = 3;      // the highest rows are drawn as cards with a large picture; the rest as rows with a small one

/** A link that looks like the product's small button: to Pencarian cepat for a new project, or to the project that covers the issue. */
export function IssueAction({ issue, canCreate, createLabel = 'Pantau' }) {
  if (issue.project) return <Button asChild variant="outline" data-size="sm" className="pu-button pu-button-secondary"><Link to={projectHref(issue.project)} title={issue.project.label}>Buka project</Link></Button>;
  if (!canCreate) return null;
  return <Button asChild variant="default" data-size="sm" className="pu-button pu-button-primary"><Link to={searchHref(issue)}>{createLabel}</Link></Button>;
}

/** One source row of a raw list or of an issue's evidence: the title (a link when it can be followed), who published
 * it (the account, on a social platform), the figure. */
export function SourceRow({ platform, item }) {
  const url = safeSourceUrl(item.url), figure = rawUnit[platform]?.(item.figure), source = item.source && (SOCIAL.includes(platform) ? '@' + item.source : item.source);
  return <li>{url ? <a href={url} target="_blank" rel="noopener noreferrer">{item.title}</a> : <span>{item.title}</span>}{source && <span className="rdi-source">{source}</span>}{figure && <span className="rdi-source">{figure}</span>}</li>;
}

/**
 * Beranda's issue list: at most ten rows for the scope and switches chosen in the first card. The three highest are
 * cards with a picture from the issue's own sources and their figures in words; the rest are rows with a small picture
 * and one meter per platform the issue is on, drawn against the loudest listed issue on that platform. TikTok and
 * Instagram are samples, so they say what was found and draw no length. Without a picture the category is drawn.
 * When the refresh could not be composed, the card shows the head of each platform's list instead.
 * `onSelect(key)` opens an issue's evidence. `canCreate` is true for people who may create projects.
 */
export default function RadarIssues({ payload, filters, onFilters, selectedKey = '', onSelect, canCreate = false }) {
  const { category, platform, province } = filters;
  if (payload.state === 'raw') return <AnalyticsPanel title="Daftar mentah per platform" description="Kepala tiap daftar seperti saat dibaca, tanpa kategori dan tanpa peringkat gabungan.">
    <div className="rdi-raw">{radarPlatforms.slice(1).filter(([id]) => OWN_LISTS.includes(id) || payload.raw?.[id]?.length).map(([id, label]) => <section key={id}><h3>{id === 'x' ? 'X, isu yang ditemukan' : label}</h3>
      {(payload.raw?.[id] || []).length ? <ol className="rdi-sources">{payload.raw[id].slice(0, 10).map((item, index) => <SourceRow key={index} platform={id} item={item} />)}</ol> : <p className="rdi-quiet">Tidak terbaca pada pembaruan ini.</p>}
    </section>)}</div>
  </AnalyticsPanel>;

  const rows = visibleIssues(payload.issues, filters);
  const platformName = radarPlatforms.find(([id]) => id === platform)?.[1];
  const sampled = SAMPLED.includes(platform);
  // A chosen province or platform changes what the order means, so it is said under the title; the combined order is the
  // default and is explained behind the info button with the rest.
  const description = province ? `Isu yang masuk pencarian populer ${provinceName(province)}.` : sampled ? `Isu yang ditemukan di ${platformName}, dalam urutan gabungan.`
    : platform === 'x' ? 'Diurutkan menurut posting di X yang terpantau sejak kemarin.' : platform ? `Diurutkan menurut angka ${platformName}.` : undefined;
  const unread = province && Array.isArray(payload.provinces_read) && !payload.provinces_read.includes(province);
  const missing = unread ? `Daftar pencarian populer ${provinceName(province)} tidak terbaca` : category ? `Belum ada isu ${categoryLabel(category)}`
    : sampled ? `Belum ada isu yang ditemukan di ${platformName}` : platform ? `Belum ada isu dengan angka ${platformName}` : `Belum ada isu yang masuk pencarian populer ${provinceName(province)}`;

  // A plus sign is a lower bound (searches, and posts counted on X). Said once, behind the list's info button.
  const bounded = rows.some(issue => issue.platforms?.search || Number.isFinite(issue.platforms?.x?.count));
  const title = <>Isu teratas<InfoTip label="Tentang urutan isu"><p>Urutan menggabungkan posisi isu di tiap platform; isu di lebih banyak platform berada lebih atas.</p>
    <p>Garis di samping angka dibandingkan dengan isu paling ramai pada daftar di platform itu. TikTok dan Instagram berupa sampel, jadi hanya disebut jumlah yang ditemukan.</p>
    {bounded && <p>Tanda + berarti batas bawah: sedikitnya sebanyak itu yang tercatat.</p>}</InfoTip></>;
  return <AnalyticsPanel title={title} label="Isu teratas" description={description} className="rdi">
    {rows.length ? <ol className="rdi-list" role="list">{rows.map((issue, index) => {
      // Movement belongs to the combined order: with one platform ordering the list it would point at another list.
      const move = platform ? null : movementText(issue.movement), MoveIcon = movementIcon[issue.movement?.kind];
      const meters = platformMeters(issue, rows), provinces = (issue.regions || []).length;
      const featured = index < FEATURED, rank = <span className="rdi-rank" aria-hidden="true">{index + 1}</span>, credit = featured && issueImage(issue)?.source;
      return <li className={featured ? 'rdi-row rdi-feature' : 'rdi-row'} key={issue.key} data-selected={selectedKey === issue.key ? '' : undefined}>
        {featured ? <IssuePicture issue={issue} size="feature" onActivate={() => onSelect(issue.key)}>{rank}{credit && <span className="rdi-pic-credit" title={`Gambar dari ${credit}`}>{credit}</span>}</IssuePicture>
          : <>{rank}<IssuePicture issue={issue} size="row" onActivate={() => onSelect(issue.key)} /></>}
        <div className="rdi-body">
          <h3><button type="button" className="rdi-title" aria-pressed={selectedKey === issue.key} onClick={() => onSelect(issue.key)}>{issue.title}</button></h3>
          <p className="rdi-tags">
            <PulseTag size="sm">{categoryLabel(issue.category)}</PulseTag>
            {move && <PulseTag size="sm" variant="outline" tone={issue.movement.kind === 'new' ? 'accent' : 'neutral'} icon={MoveIcon}>{move}</PulseTag>}
            {issue.project && <PulseTag size="sm" tone="success">Sudah dipantau</PulseTag>}
            {issue.scope === 'local' && <PulseTag size="sm" variant="outline">{provinces > 1 ? `hanya ramai di ${provinces} provinsi` : 'hanya ramai di provinsi ini'}</PulseTag>}
            {provinces > 0 && issue.scope !== 'local' && <span className="rdi-spread">ramai di {provinces} provinsi</span>}
          </p>
          {issue.reason && <p className="rdi-reason">{issue.reason}</p>}
          {meters.length > 0 && <ul className="rdi-meters" data-compact={featured ? '' : undefined} aria-label="Angka per platform">{meters.map(meter => <li key={meter.id} data-platform={meter.id} data-plain={meter.ratio === null || featured ? '' : undefined} title={meter.hint || meter.label}>
            <span className="rdi-meter-mark" aria-hidden="true">{meter.id === 'search' ? <Search size={14} /> : <PlatformIcon platform={meter.id} size={14} />}</span>
            <span className="rdi-meter-label pu-sr">{meter.label}</span>
            {meter.ratio !== null && !featured && <span className="rdi-track" aria-hidden="true"><i style={{ width: `${Math.max(2, Math.round(meter.ratio * 1000) / 10)}%` }} /></span>}
            <span className="rdi-meter-text">{meter.text}</span>
          </li>)}</ul>}
        </div>
        <div className="rdi-action"><IssueAction issue={issue} canCreate={canCreate} /></div>
      </li>;
    })}</ol> : <div className="rdi-none"><p>{missing} pada pembaruan ini.</p>{!unread && (category || platform) && <PulseButton size="sm" onClick={() => onFilters({ ...filters, category: '', platform: '' })}>Tampilkan semua</PulseButton>}</div>}
  </AnalyticsPanel>;
}

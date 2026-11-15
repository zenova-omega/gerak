import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, RefreshCw, Sparkle } from 'lucide-react';
import { Button } from '../components/ui/shadcn/button';
import { PulseButton, PulseNotice } from '../components/ui/PulseUI';
import { PulseSkeleton } from '../components/ui/PulsePatterns';
import { PulseTag } from '../components/ui/PulseTag';
import { formatCount, safeSourceUrl } from '../lib/pulseData';
import {
  categoryCounts, categoryLabel, figureLine, freshnessText, movementText, projectHref, provinceName, radarCategories, radarPlatforms, searchHref,
  updatedText, visibleIssues,
} from '../lib/pulseRadar';
import './ds/range-filter.css';
import './ds/radar-issues.css';

const movementIcon = { new: Sparkle, up: ArrowUp, down: ArrowDown };
const rawUnit = { news: figure => figure ? `${formatCount(figure)} liputan lain` : '', youtube: figure => figure ? `${formatCount(figure)} tayangan` : '', search: figure => figure ? `${formatCount(figure)}+ pencarian` : '' };

/** A link that looks like the product's small button: to Pencarian cepat for a new project, or to the project that covers the issue. */
export function IssueAction({ issue, canCreate, createLabel = 'Pantau' }) {
  if (issue.project) return <Button asChild variant="outline" data-size="sm" className="pu-button pu-button-secondary"><Link to={projectHref(issue.project)} title={issue.project.label}>Buka project</Link></Button>;
  if (!canCreate) return null;
  return <Button asChild variant="default" data-size="sm" className="pu-button pu-button-primary"><Link to={searchHref(issue)}>{createLabel}</Link></Button>;
}

/** One source row of a raw list or of an issue's evidence: the title (a link when it can be followed), who published it, the figure. */
export function SourceRow({ platform, item }) {
  const url = safeSourceUrl(item.url), figure = rawUnit[platform]?.(item.figure);
  return <li>{url ? <a href={url} target="_blank" rel="noopener noreferrer">{item.title}</a> : <span>{item.title}</span>}{item.source && <span className="rdi-source">{item.source}</span>}{figure && <span className="rdi-source">{figure}</span>}</li>;
}

function Switch({ label, choices, value, onChange }) {
  return <div className="pu-segmented" role="group" aria-label={label}>{choices.map(([id, text]) =>
    <Button key={id} type="button" size="sm" variant={value === id ? 'secondary' : 'ghost'} aria-pressed={value === id} onClick={() => onChange(id)}>{text}</Button>)}</div>;
}

/**
 * The issue list of Beranda's radar, with its switches and every state the stored refresh can be in.
 * `payload` is the answer of GET /radar (null while it loads). `filters` is { category, platform, province }.
 * `onSelect(key)` opens an issue's evidence. `canCreate` is true for people who may create projects and start a refresh.
 */
export default function RadarIssues({ payload, filters, onFilters, selectedKey = '', onSelect, canCreate = false, onRefresh = () => {}, refreshing = false, now = new Date() }) {
  if (!payload) return <section className="rdi" aria-busy="true"><h2 className="rdi-heading">Isu yang ramai di Indonesia</h2><PulseSkeleton label="Memuat isu…" stats={0} panels={0} rows={6} /></section>;
  const { category, platform, province } = filters;
  const busy = payload.running || refreshing;
  const heading = <h2 className="rdi-heading">Isu yang ramai di {province ? provinceName(province) : 'Indonesia'}</h2>;
  const refresh = label => canCreate && <PulseButton size="sm" busy={busy} busyLabel="Memperbarui…" onClick={onRefresh}><RefreshCw size={15} aria-hidden="true" />{label}</PulseButton>;

  if (payload.state === 'empty') return <section className="rdi">{heading}
    <PulseNotice><p><strong>Radar belum pernah berjalan.</strong> {payload.enabled ? 'Pembaruan pertama dimulai dalam beberapa menit.' : 'Pembaruan otomatis mati. Nyalakan "Radar isu Indonesia" di Monitor, atau jalankan satu kali sekarang.'}</p>{refresh('Jalankan sekarang')}</PulseNotice>
  </section>;

  const head = <header className="rdi-head"><div>{heading}<p className="rdi-fresh">{freshnessText(payload, now)}</p></div>{refresh('Perbarui sekarang')}</header>;

  if (payload.state === 'raw') return <section className="rdi">{head}
    <PulseNotice><p><strong>Daftar mentah per platform.</strong> Isu belum bisa disusun pada pembaruan ini. Berikut daftar tiap platform apa adanya, tanpa kategori dan tanpa peringkat gabungan.</p></PulseNotice>
    <div className="rdi-raw">{radarPlatforms.slice(1).map(([id, label]) => <section key={id}><h3>{label}</h3>
      {(payload.raw?.[id] || []).length ? <ol className="rdi-sources">{payload.raw[id].slice(0, 10).map((item, index) => <SourceRow key={index} platform={id} item={item} />)}</ol> : <p className="rdi-fresh">Tidak terbaca pada pembaruan ini.</p>}
    </section>)}</div>
  </section>;

  const counts = categoryCounts(payload.issues, province);
  const categories = radarCategories.filter(([id]) => id === '' || counts[id] || id === category).map(([id, label]) => [id, `${label} ${counts[id] || 0}`]);
  const rows = visibleIssues(payload.issues, filters);
  const missing = category ? `Belum ada isu ${categoryLabel(category)}` : platform ? `Belum ada isu dengan data ${radarPlatforms.find(([id]) => id === platform)?.[1]}` : `Belum ada isu yang masuk pencarian populer ${provinceName(province)}`;

  return <section className="rdi">{head}
    {payload.state === 'stale' && <PulseNotice tone="warning"><p>Data terakhir {updatedText(payload, now)}. Pembaruan sesudahnya belum berhasil.</p></PulseNotice>}
    {payload.brief && !province && <p className="rdi-brief">{payload.brief}</p>}
    <div className="rdi-switches">
      <Switch label="Kategori isu" choices={categories} value={category} onChange={id => onFilters({ ...filters, category: id })} />
      <Switch label="Platform" choices={radarPlatforms} value={platform} onChange={id => onFilters({ ...filters, platform: id })} />
    </div>
    {rows.length ? <ol className="rdi-list">{rows.map((issue, index) => {
      const move = movementText(issue.movement), MoveIcon = movementIcon[issue.movement?.kind];
      return <li className="rdi-row" key={issue.key} data-selected={selectedKey === issue.key ? '' : undefined}>
        <span className="rdi-rank" aria-hidden="true">{index + 1}</span>
        <div className="rdi-body">
          <h3><button type="button" className="rdi-title" aria-pressed={selectedKey === issue.key} onClick={() => onSelect(issue.key)}>{issue.title}</button></h3>
          <p className="rdi-tags">
            <PulseTag size="sm">{categoryLabel(issue.category)}</PulseTag>
            {move && <PulseTag size="sm" variant="outline" tone={issue.movement.kind === 'new' ? 'accent' : 'neutral'} icon={MoveIcon}>{move}</PulseTag>}
            {issue.project && <PulseTag size="sm" tone="success">Sudah dipantau</PulseTag>}
            {issue.scope === 'local' && <PulseTag size="sm" variant="outline">{(issue.regions || []).length > 1 ? `hanya ramai di ${issue.regions.length} provinsi` : 'hanya ramai di provinsi ini'}</PulseTag>}
          </p>
          {issue.reason && <p className="rdi-reason">{issue.reason}</p>}
          <p className="rdi-figures">{figureLine(issue, platform).map(part => <span key={part}>{part}</span>)}</p>
        </div>
        <div className="rdi-action"><IssueAction issue={issue} canCreate={canCreate} /></div>
      </li>;
    })}</ol> : <div className="rdi-none"><p>{missing} pada pembaruan ini.</p>{(category || platform) && <PulseButton size="sm" onClick={() => onFilters({ ...filters, category: '', platform: '' })}>Tampilkan semua</PulseButton>}</div>}
  </section>;
}

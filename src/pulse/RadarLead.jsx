import { RefreshCw, Search } from 'lucide-react';
import { PlatformIcon } from '../components/admin/pulse/PlatformIcon';
import { PulseButton, PulseNotice } from '../components/ui/PulseUI';
import { PulseSkeleton } from '../components/ui/PulsePatterns';
import { PulseFilterChip, PulseFilterGroup, PulseFilterSelect } from '../components/ui/PulseSurface';
import { attemptNotice, briefText, categoryCounts, freshnessText, offeredPlatforms, provinceName, provinceRanking, radarCategories, matchingIssues, scheduleText, visibleIssues } from '../lib/pulseRadar';
import AnalyticsPanel from './AnalyticsPanel';
import InfoTip from './InfoTip';
import RadarFigures from './RadarFigures';
import './ds/radar-issues.css';

/** One choice the page makes: its name beside a row of chips (the shared PulseFilterGroup and PulseFilterChip). Pressed
 * shows the choice; the count, where there is one, is set apart from the name. */
function Chips({ name, choices, value, onChange }) {
  return <PulseFilterGroup inline label={name}>{choices.map(({ id, text, count, mark }) =>
    <PulseFilterChip key={id} active={value === id} leading={mark} count={count} onClick={() => onChange(id)}>{text}</PulseFilterChip>)}</PulseFilterGroup>;
}

/** The facts of the freshness line, one each, so "when" and "what could not be read" are not run together by semicolons. */
function Facts({ text }) {
  return <span className="rdl-facts">{text.split('; ').map(fact => <span key={fact}>{fact}</span>)}</span>;
}

const mark = id => id === 'search' ? <Search size={14} aria-hidden="true" /> : <PlatformIcon platform={id} size={14} />;

/**
 * Beranda's first card: what the page answers, when the list was made, what could not be read, the brief, the figures
 * of the refresh, and the choices that apply to the whole page: category and platform as chips, the province from a list
 * of the provinces where an issue is loud. `payload` is the answer of GET /radar, null while it loads. People who may
 * change settings (`canCreate`) also get the button that starts a refresh. How the list is made is behind the info button.
 */
export default function RadarLead({ payload, filters, onFilters, canCreate = false, onRefresh = () => {}, refreshing = false, now = new Date() }) {
  const { category, platform, province } = filters;
  const name = `Isu yang ramai di ${province ? provinceName(province) : 'Indonesia'}`;
  const schedule = scheduleText(payload);
  const title = <>{name}<InfoTip label="Tentang radar isu"><p>Isu disusun dari berita, pencarian populer, video tren, dan X, lalu diperbarui {schedule ? `otomatis ${schedule}` : 'berkala'}. Membaca halaman ini tidak memulai pengumpulan.</p>
    <p>Pilih kategori, platform, atau provinsi untuk menyaring seluruh halaman. Buka satu isu untuk melihat buktinya.</p></InfoTip></>;
  if (!payload) return <AnalyticsPanel title={name} className="rdl"><PulseSkeleton label="Memuat isu…" stats={0} panels={0} rows={2} /></AnalyticsPanel>;
  const busy = payload.running || refreshing;
  const refresh = label => canCreate && <PulseButton size="sm" busy={busy} busyLabel="Memperbarui…" onClick={onRefresh}><RefreshCw size={15} aria-hidden="true" />{label}</PulseButton>;
  const notice = attemptNotice(payload, now);

  if (payload.state === 'empty') return <AnalyticsPanel title={name} className="rdl">
    <PulseNotice tone={notice ? 'warning' : 'neutral'}><p>{notice || <><strong>Radar belum pernah berjalan.</strong> {payload.enabled ? 'Pembaruan pertama segera dimulai.' : 'Pembaruan otomatis mati.'}</>}</p>
      {refresh(notice ? 'Coba lagi sekarang' : 'Jalankan sekarang')}</PulseNotice>
  </AnalyticsPanel>;

  const head = { title, label: name, description: <Facts text={freshnessText(payload, now)} />, actions: refresh('Perbarui sekarang'), className: 'rdl' };
  if (payload.state === 'raw') return <AnalyticsPanel {...head}>
    <PulseNotice><p><strong>Daftar mentah per platform.</strong> Isu belum bisa disusun.</p></PulseNotice>
  </AnalyticsPanel>;

  const counts = categoryCounts(payload.issues, province);
  const categories = radarCategories.filter(([id]) => id === '' || counts[id] || id === category).map(([id, label]) => ({ id, text: label, count: counts[id] || 0 }));
  const platforms = offeredPlatforms(payload.issues, platform).map(([id, label]) => ({ id, text: label, mark: id ? mark(id) : null }));
  // The provinces offered are the ones the map shades for this category, the busiest first; a chosen one stays offered.
  const provinces = provinceRanking(visibleIssues(payload.issues, { category })).map(row => [row.code, `${row.name} · ${row.count} isu`]);
  if (province && !provinces.some(([code]) => code === province)) provinces.unshift([province, provinceName(province)]);
  const brief = briefText(payload.brief, filters);
  return <AnalyticsPanel {...head}>
    {notice && <PulseNotice tone="warning"><p>{notice}</p></PulseNotice>}
    {brief && <p className="rdl-brief">{brief}</p>}
    <RadarFigures payload={payload} />
    <div className="rdl-filters">
      <Chips name="Kategori" choices={categories} value={category} onChange={id => onFilters({ ...filters, category: id })} />
      <Chips name="Platform" choices={platforms} value={platform} onChange={id => onFilters({ ...filters, platform: id })} />
      <PulseFilterSelect inline label="Wilayah" value={province} onChange={value => onFilters({ ...filters, province: value })}
        options={[{ value: '', label: 'Seluruh Indonesia' }, ...provinces.map(([code, label]) => ({ value: code, label }))]} />
      {(category || platform) && <p className="rdl-active" role="status">Menampilkan <b>{matchingIssues(payload.issues, filters).length}</b> dari <b>{counts['']}</b> isu
        <PulseButton variant="quiet" size="sm" className="rdl-clear" onClick={() => onFilters({ ...filters, category: '', platform: '' })}>Tampilkan semua isu</PulseButton></p>}
    </div>
  </AnalyticsPanel>;
}

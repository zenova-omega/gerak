import { RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/shadcn/button';
import { PulseButton, PulseNotice } from '../components/ui/PulseUI';
import { PulseSkeleton } from '../components/ui/PulsePatterns';
import { PulseTag } from '../components/ui/PulseTag';
import { attemptNotice, briefText, categoryCounts, freshnessText, offeredPlatforms, provinceName, radarCategories } from '../lib/pulseRadar';
import AnalyticsPanel from './AnalyticsPanel';
import './ds/range-filter.css';
import './ds/radar-issues.css';

function Switch({ label, choices, value, onChange }) {
  return <div className="pu-segmented" role="group" aria-label={label}>{choices.map(([id, text]) =>
    <Button key={id} type="button" size="sm" variant={value === id ? 'secondary' : 'ghost'} aria-pressed={value === id} onClick={() => onChange(id)}>{text}</Button>)}</div>;
}

/**
 * Beranda's first card: what the page answers, when the list was made, what could not be read, the brief, and the
 * choices that apply to the whole page (category, platform, province). `payload` is the answer of GET /radar, null
 * while it loads. People who may change settings (`canCreate`) also get the button that starts a refresh.
 */
export default function RadarLead({ payload, filters, onFilters, canCreate = false, onRefresh = () => {}, refreshing = false, now = new Date() }) {
  const { category, platform, province } = filters;
  const title = `Isu yang ramai di ${province ? provinceName(province) : 'Indonesia'}`;
  if (!payload) return <AnalyticsPanel title={title} className="rdl"><PulseSkeleton label="Memuat isu…" stats={0} panels={0} rows={2} /></AnalyticsPanel>;
  const busy = payload.running || refreshing;
  const refresh = label => canCreate && <PulseButton size="sm" busy={busy} busyLabel="Memperbarui…" onClick={onRefresh}><RefreshCw size={15} aria-hidden="true" />{label}</PulseButton>;
  const notice = attemptNotice(payload, now);

  if (payload.state === 'empty') return <AnalyticsPanel title={title} className="rdl">
    <PulseNotice tone={notice ? 'warning' : 'neutral'}><p>{notice || <><strong>Radar belum pernah berjalan.</strong> {payload.enabled ? 'Pembaruan pertama dimulai dalam beberapa menit.' : 'Pembaruan otomatis mati. Nyalakan "Radar isu Indonesia" di Monitor, atau jalankan satu kali sekarang.'}</>}</p>
      {refresh(notice ? 'Coba lagi sekarang' : 'Jalankan sekarang')}</PulseNotice>
  </AnalyticsPanel>;

  const head = { title, description: freshnessText(payload, now), actions: refresh('Perbarui sekarang'), className: 'rdl' };
  if (payload.state === 'raw') return <AnalyticsPanel {...head}>
    <PulseNotice><p><strong>Daftar mentah per platform.</strong> Isu belum bisa disusun pada pembaruan ini. Di bawah ini daftar tiap platform apa adanya, tanpa kategori dan tanpa peringkat gabungan.</p></PulseNotice>
  </AnalyticsPanel>;

  const counts = categoryCounts(payload.issues, province);
  const categories = radarCategories.filter(([id]) => id === '' || counts[id] || id === category).map(([id, label]) => [id, `${label} ${counts[id] || 0}`]);
  const brief = briefText(payload.brief, filters);
  return <AnalyticsPanel {...head}>
    {notice && <PulseNotice tone="warning"><p>{notice}</p></PulseNotice>}
    {brief && <p className="rdl-brief">{brief}</p>}
    <div className="rdl-filters">
      <Switch label="Kategori isu" choices={categories} value={category} onChange={id => onFilters({ ...filters, category: id })} />
      <Switch label="Platform" choices={offeredPlatforms(payload.issues, platform)} value={platform} onChange={id => onFilters({ ...filters, platform: id })} />
      {province && <PulseTag size="lg" variant="outline" onRemove={() => onFilters({ ...filters, province: '' })} removeLabel="Kembali ke seluruh Indonesia">Provinsi: {provinceName(province)}</PulseTag>}
    </div>
  </AnalyticsPanel>;
}

import { Link } from 'react-router-dom';
import { PulseBreakdown, PulsePanelEmpty } from '../components/ui/PulseAnalytics';
import { categoryRows, homeHref, platformCoverage, provinceRanking } from '../lib/pulseRadar';
import AnalyticsPanel from './AnalyticsPanel';

/** Beside the map: the provinces where most of the listed issues are loud. A row scopes the page to that province. */
export function ProvinceRanking({ issues, filters, limit = 8 }) {
  const rows = provinceRanking(issues, limit).map(row => ({ key: row.code, label: row.name, value: row.count, to: homeHref(filters, { province: row.code === filters.province ? '' : row.code }) }));
  return <AnalyticsPanel title="Provinsi paling ramai" description="Berapa isu pada daftar yang masuk pencarian populer tiap provinsi."
    footer="Persen: bagian dari isu pada daftar. Pilih provinsi untuk melihat isu di sana.">
    {rows.length ? <PulseBreakdown rows={rows} total={issues.length} scale="max" as={Link} />
      : <PulsePanelEmpty title="Belum ada provinsi">Tidak ada isu pada daftar ini yang masuk pencarian populer provinsi.</PulsePanelEmpty>}
  </AnalyticsPanel>;
}

/** Beside the list: what the issues in scope are about, and on which platforms the listed ones have a figure.
 * Rows set the same choices as the switches in the first card; the row of the chosen one drops it again. */
export function CategoryMix({ payload, filters, listed }) {
  const categories = categoryRows(payload.issues, filters.province);
  const platforms = platformCoverage(listed);
  return <AnalyticsPanel title="Komposisi isu" description="Kategori isu dalam cakupan ini, lalu platform yang memberi angka.">
    <PulseBreakdown rows={categories.map(row => ({ key: row.id, label: row.label, value: row.count, to: homeHref(filters, { category: row.id === filters.category ? '' : row.id }) }))}
      total={categories.reduce((sum, row) => sum + row.count, 0)} as={Link} />
    <h3 className="rdb-sub">Jejak platform</h3>
    {platforms.length ? <PulseBreakdown rows={platforms.map(row => ({ key: row.id, label: row.label, value: row.count, to: homeHref(filters, { platform: row.id === filters.platform ? '' : row.id }) }))}
      total={listed.length} scale="max" as={Link} /> : <p className="rdi-quiet">Belum ada angka per platform pada daftar ini.</p>}
  </AnalyticsPanel>;
}

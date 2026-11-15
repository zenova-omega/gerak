import { Link } from 'react-router-dom';
import { PulseBreakdown, PulsePanelEmpty } from '../components/ui/PulseAnalytics';
import { homeHref, platformCoverage, provinceRanking } from '../lib/pulseRadar';
import AnalyticsPanel from './AnalyticsPanel';
import InfoTip from './InfoTip';

/** Beside the list, under the map: the provinces where most of the listed issues are loud. A row scopes the page to that
 * province, as the province list in the first card does. */
export function ProvinceRanking({ issues, filters, limit = 8 }) {
  const rows = provinceRanking(issues, limit).map(row => ({ key: row.code, label: row.name, value: row.count, to: homeHref(filters, { province: row.code === filters.province ? '' : row.code }) }));
  const title = <>Provinsi paling ramai<InfoTip label="Tentang provinsi paling ramai"><p>Berapa isu pada daftar yang masuk pencarian populer tiap provinsi.</p>
    <p>Persen: bagian dari isu pada daftar. Pilih provinsi untuk melihat isu di sana.</p></InfoTip></>;
  return <AnalyticsPanel title={title} label="Provinsi paling ramai">
    {rows.length ? <PulseBreakdown rows={rows} total={issues.length} scale="max" as={Link} />
      : <PulsePanelEmpty title="Belum ada provinsi">Tidak ada isu pada daftar ini yang masuk pencarian populer provinsi.</PulsePanelEmpty>}
  </AnalyticsPanel>;
}

/** Beside the list, last: on which platforms the listed issues have a figure. A row orders the list by that platform, as
 * the platform chips do; the row of the chosen one drops it again. The categories and their counts are the chips. */
export function PlatformTrail({ filters, listed }) {
  const platforms = platformCoverage(listed);
  const title = <>Jejak platform<InfoTip label="Tentang jejak platform">Berapa isu pada daftar yang punya angka atau temuan di tiap platform. Pilih platform untuk mengurutkan daftar menurut angkanya.</InfoTip></>;
  return <AnalyticsPanel title={title} label="Jejak platform">
    {platforms.length ? <PulseBreakdown rows={platforms.map(row => ({ key: row.id, label: row.label, value: row.count, to: homeHref(filters, { platform: row.id === filters.platform ? '' : row.id }) }))}
      total={listed.length} scale="max" as={Link} /> : <p className="rdi-quiet">Belum ada angka per platform.</p>}
  </AnalyticsPanel>;
}

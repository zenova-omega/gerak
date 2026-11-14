import { PlatformLabel } from './PlatformIcon';
import InfoTip from '../../../pulse/InfoTip';

const names={rss:'Berita',xpoz:'Xpoz (X + Instagram + TikTok)',youtube:'YouTube'};
const platforms={rss:'news',xpoz:'x'};
export default function QuotaBreakdown({ data }) {
  return <section className="pm-quota" aria-label="Pembagian kuota global">
    <h3>Pemakaian kuota per project & platform <InfoTip label="Tentang pembagian kuota">Ini pemakaian aktual, bukan jatah terjamin. Antrean otomatis diproses berdasarkan waktu siap paling awal; sisa kuota tidak dijamin terbagi rata. Percobaan gagal dan retry tetap terhitung. Crawl manual umum dan komentar berada di luar batas ini. Angka ini bukan kredit atau biaya vendor. IG/TikTok otomatis mengambil maksimal 20 posting per percobaan.</InfoTip></h3>
    <p>Semua project · hari UTC {data.quota_day_utc} · reset 07.00 WIB</p>
    <div className="pm-quota-bars">{data.workers.map(w=><div key={w.provider}><strong>{names[w.provider]}</strong><span>{w.used} / {w.daily_limit} percobaan · sisa {Math.max(0,w.daily_limit-w.used)}</span><progress aria-label={'Kuota terpakai '+names[w.provider]} value={Math.min(w.used,w.daily_limit)} max={Math.max(1,w.daily_limit)}/>{w.blocked_reason&&<span role="status">Diblokir: {w.blocked_reason}</span>}{!w.daily_limit&&<span>Kuota belum diaktifkan</span>}</div>)}</div>
    <div className="pm-table"><table><caption>Percobaan yang sudah memakai kuota hari ini</caption><thead><tr><th>Project</th><th>Platform</th><th>Jalur</th><th>Terpakai</th></tr></thead><tbody>
      {(data.quota_breakdown||[]).map(r=><tr key={[r.provider,r.topic_id,r.platform,r.mode].join(':')}><td>{r.project}</td><td><PlatformLabel platform={r.platform}/></td><td>{r.mode==='automatic'?'Otomatis':'Manual IG/TikTok'}</td><td>{r.used}</td></tr>)}
      {Object.entries(data.quota_unattributed||{}).filter(([,used])=>used>0).map(([provider,used])=><tr key={provider}><td>Belum teratribusi ke project/platform</td><td>{names[provider]}</td><td>Sebelum pencatatan rinci / data historis</td><td>{used}</td></tr>)}
      {!data.workers.some(w=>w.used>0)&&<tr><td colSpan={4}>Belum ada percobaan terpakai hari ini.</td></tr>}
    </tbody></table></div>
    {!!data.quota_queue?.length&&<div className="pm-table"><table><caption>Antrean otomatis semua project (belum tentu memakai kuota)</caption><thead><tr><th>Project</th><th>Platform</th><th>Status</th><th>Pekerjaan</th></tr></thead><tbody>{data.quota_queue.map(r=><tr key={[r.topic_id,r.source,r.status].join(':')}><td>{r.project}</td><td><PlatformLabel platform={platforms[r.source]||r.source}/></td><td>{{queued:'Menunggu',retry:'Menunggu ulang',running:'Berjalan'}[r.status]||r.status}</td><td>{r.count}</td></tr>)}</tbody></table></div>}
  </section>;
}

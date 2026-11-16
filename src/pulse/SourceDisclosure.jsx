import { ChevronDown } from 'lucide-react';
import { PlatformIcon } from '../components/admin/pulse/PlatformIcon';
import { PulseBadge, PulseButton } from '../components/ui/PulseUI';
import { collectionBlock, coverageField, formatSourceCount as count, formatSourceTime as time, threadsStatus } from './sourcesCoverage.js';

const names = { x: 'X', instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', news: 'Berita', threads:'Threads', reddit:'Reddit' };

const fields = [['text', 'Teks posting'], ['author', 'Penulis'], ['published_at', 'Waktu terbit'], ['likes', 'Suka'], ['comments', 'Komentar'], ['shares', 'Bagikan'], ['views', 'Tayangan']];
const states = { succeeded: ['Berhasil', 'success'], empty: ['Tanpa hasil', 'neutral'], failed: ['Gagal', 'warning'], pending: ['Menunggu', 'accent'], queued: ['Dalam antrean', 'neutral'], cancelled: ['Dibatalkan', 'neutral'], blocked: ['Diblokir', 'warning'], running: ['Berjalan', 'accent'], interrupted: ['Terhenti', 'warning'], retry: ['Menunggu ulang', 'warning'] };

/** A compact source summary with native keyboard-operable, non-modal disclosure.
 * All data comes from the coverage endpoint. Expanding never performs a provider call.
 */
export default function SourceDisclosure({ source, budget, topicId, readOnly, busy, onCollect }) {
  const manual = ['instagram', 'tiktok', 'reddit'].includes(source.platform);
  const reason = collectionBlock({ source, budget, topicId, readOnly, busy });
  const last = source.last_attempt;
  const threads = source.platform === 'threads' ? threadsStatus(source, { topicId, readOnly, busy }) : null;
  const [label, tone] = states[last?.status] || [last ? 'Status belum dikenal' : 'Belum diuji', 'neutral'];

  return <details className="sc-source" name="pulse-source-details">
    <summary>
      <span className={`sc-source-icon sc-source-icon-${source.platform}`}><PlatformIcon platform={source.platform} size={19} /></span>
      <span className="sc-source-name"><strong>{names[source.platform] || source.platform}</strong><small>{source.public_search ? 'Memakai kredit pencarian' : source.provider === 'threads' ? 'Perlu koneksi akun' : source.provider === 'social' ? 'Memakai saldo' : source.provider === 'youtube' ? 'Kuota harian' : 'Tanpa biaya'}</small></span>
      <PulseBadge tone={tone}>{label}</PulseBadge>
      <span className="sc-source-total"><strong>{count(source.stored_posts)}</strong><small>posting tersimpan</small></span>
      <span className="sc-source-mode">{source.recurring_enabled ? 'Terjadwal' : manual ? 'Manual' : 'Tidak terjadwal'}</span>
      <ChevronDown className="sc-chevron" size={17} aria-hidden="true" />
    </summary>
    <div className="sc-source-detail">
      {threads && <div><h3>{source.public_search ? 'Pencarian Threads' : 'Koneksi Threads'}</h3>
        {threads.lines.map(line => <p key={line}>{line}</p>)}
        {!source.public_search && <p className="sc-small">Koneksi diperiksa: {time(source.connection_checked_at)}.</p>}
        <div className="sc-collection-action">
          <PulseButton variant="primary" disabled={!threads.canCollect} aria-describedby="sc-reason-threads" onClick={() => onCollect(source, 'collect')}>Kumpulkan dari Threads</PulseButton>
          {threads.reason && <p className="sc-small" id="sc-reason-threads">{threads.reason}</p>}
          {!source.public_search && <PulseButton disabled={readOnly || busy} onClick={() => onCollect(source)}>Periksa koneksi Threads</PulseButton>}
        </div>
      </div>}
      <div className="sc-field-section"><h3>Kelengkapan data<span className="sr-only"> {names[source.platform] || source.platform}</span></h3>
        <dl className="sc-fields">{fields.map(([key, title]) => {
          const field = coverageField(source.fields?.[key], source.stored_posts);
          return <div key={key}><dt>{title}</dt><dd><span className="sc-field-track" aria-hidden="true"><span style={{ width: `${field?.percent || 0}%` }} /></span><span>{field ? `${count(field.count)} / ${count(field.total)}` : 'Tidak diketahui'}</span></dd></div>;
        })}</dl>
      </div>
      <div className="sc-evidence-section"><h3>Akses & riwayat<span className="sr-only"> {names[source.platform] || source.platform}</span></h3><dl className="sc-history">
        <div><dt>Koneksi</dt><dd>{source.configured ? 'Dikonfigurasi' : 'Belum dikonfigurasi'}</dd></div>
        {source.provider === 'social' && <div><dt>Alat pada akun</dt><dd>{source.tool_available === true ? 'Tersedia' : source.tool_available === false ? 'Tidak tersedia' : 'Belum diperiksa'}</dd></div>}
        <div><dt>Berhasil terakhir</dt><dd>{time(source.last_success_at)}</dd></div>
        {last && <><div><dt>Percobaan terakhir</dt><dd>{time(last.started_at)}</dd></div><div><dt>Diterima / baru tersimpan</dt><dd>{count(last.fetched)} / {count(last.ingested)}</dd></div></>}
      </dl>
      {last?.error && !threads && <p className="sc-warning">Pengumpulan terkendala. Periksa Monitor.</p>}
      {manual && <div className="sc-collection-action"><PulseButton variant="primary" disabled={Boolean(reason)} aria-describedby={`sc-reason-${source.platform}`} onClick={() => onCollect(source)}>Kumpulkan semua posting {names[source.platform]}</PulseButton>{reason && <p className="sc-small" id={`sc-reason-${source.platform}`}>{reason}</p>}</div>}
      </div>
    </div>
  </details>;
}

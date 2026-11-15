import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Activity, Bell, Check, CheckCheck, ChevronDown, MessagesSquare, Radio, RefreshCw, SlidersHorizontal, TrendingUp, TriangleAlert } from 'lucide-react';
import api from '../../../lib/api';
import { pulseDate, pulseError, formatCount } from '../../../lib/pulseData';
import {
  alertSummary, canChangeAlertPage, collectionRows, collectionSummary, createUnreadCache, defaultInterval, frequencyText,
  intervalChoices, intervalText, monitorExtras, monitorSources, spanPlacement, unreadBadgeText,
} from '../../../lib/pulseMonitor';
import './monitor-room.css';
import '../../../pulse/ds/monitor-overview.css';
import { PlatformIcon, platformLabel } from './PlatformIcon';
import InfoTip from '../../../pulse/InfoTip';
import { PulseButton, PulseNotice } from '../../ui/PulseUI';
import { PulseSkeleton } from '../../ui/PulsePatterns';
import { PulseTag } from '../../ui/PulseTag';
import { PulsePanelEmpty } from '../../ui/PulseAnalytics';

const SHOWN_ALERTS = 10;
const READ_EVERY_MS = 60000;
const UNREAD_EVENT = 'pulse-monitor-unread';
const unreadCache = createUnreadCache(READ_EVERY_MS);

/** Marks a read of the count as started, so nothing else asks the server for it during the next minute. */
function unreadReadStarted(topicId) {
  unreadCache.put(topicId, unreadCache.peek(topicId));
}

/** Record a count and tell the navigation badge. `null` means the read failed: the badge then shows nothing. */
function publishUnread(topicId, unread) {
  if (!topicId) return;
  unreadCache.put(topicId, Number.isInteger(unread) ? unread : null);
  window.dispatchEvent(new CustomEvent(UNREAD_EVENT, { detail: { topicId } }));
}

/** Unread alerts of the project in view, on the "Monitor" item of the navigation. It reads the same `GET /monitor`
 * as the page, at most once a minute, and takes the page's own figure whenever the page has just loaded one. */
export function MonitorNavBadge() {
  const topicId = new URLSearchParams(useLocation().search).get('topic');
  const [, redraw] = useState(0);
  useEffect(() => {
    if (!topicId) return undefined;
    let timer;
    const read = () => {
      const wait = unreadCache.wait(topicId);
      if (wait > 0) { timer = setTimeout(read, wait); return; }
      timer = setTimeout(read, READ_EVERY_MS);
      if (document.hidden) return;
      unreadReadStarted(topicId);   // a sidebar rebuilt by a page change waits for this read instead of starting its own
      api.get('/admin/pulse/monitor', { topic_id: topicId }).then(data => publishUnread(topicId, data?.unread)).catch(() => publishUnread(topicId, null));
    };
    const changed = event => { if (event.detail?.topicId === topicId) redraw(value => value + 1); };
    window.addEventListener(UNREAD_EVENT, changed);
    timer = setTimeout(read, 0);   // after the page in view has had the chance to start the same read
    return () => { clearTimeout(timer); window.removeEventListener(UNREAD_EVENT, changed); };
  }, [topicId]);
  const count = topicId ? unreadCache.peek(topicId) : null;
  const text = unreadBadgeText(count);
  if (!text) return null;
  return <span className="mo-nav-badge"><span aria-hidden="true">{text}</span><span className="pu-sr">, {formatCount(count)} alert belum dibaca</span></span>;
}

const kindIcons = { collection_error: TriangleAlert, volume_spike: TrendingUp, recent_cluster: MessagesSquare, engagement_growth: Activity };
const followUpLabels = { reviewing: 'Sedang ditinjau', done: 'Selesai ditindaklanjuti' };

const followUpChoices = { new: 'Baru', reviewing: 'Sedang ditinjau', done: 'Selesai' };

/** Who is handling an alert and how far along it is. Saved with the revision that was read, so two people editing the
 * same alert do not silently overwrite each other. */
function FollowUpForm({ alert, formId, disabled, onSaved, onClose }) {
  const workflow = alert.workflow || { status: 'new', assignee: null, revision: 0, history: [] };
  const [status, setStatus] = useState(workflow.status);
  const [assignee, setAssignee] = useState(workflow.assignee || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const history = workflow.history || [];
  const submit = async event => {
    event.preventDefault();
    if (saving || disabled) return;
    setSaving(true); setError('');
    try {
      await api.put('/admin/pulse/monitor/alerts/' + encodeURIComponent(alert.id) + '/workflow', { status, assignee: assignee.trim() || null, expected_revision: workflow.revision || 0 });
      await onSaved();
      onClose();
    } catch (e) {
      setError(e.status === 409 ? 'Diubah orang lain. Tekan Perbarui, lalu buka lagi.' : `Belum tersimpan. ${pulseError(e)}`);
    } finally { setSaving(false); }
  };
  return <form className="mo-follow" id={formId} onSubmit={submit}>
    <label>Status tindak lanjut
      <select value={status} onChange={event => setStatus(event.target.value)} disabled={saving || disabled}>
        {Object.entries(followUpChoices).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    <label>Penanggung jawab (opsional)
      <input type="text" maxLength={120} value={assignee} onChange={event => setAssignee(event.target.value)} placeholder="Nama atau tim" disabled={saving || disabled} />
    </label>
    <div className="mo-follow-actions">
      <PulseButton type="submit" variant="primary" size="sm" busy={saving} busyLabel="Menyimpan…" disabled={disabled}>Simpan</PulseButton>
      <PulseButton size="sm" variant="quiet" disabled={saving} onClick={onClose}>Batal</PulseButton>
    </div>
    {error && <p className="mo-follow-error" role="alert">{error}</p>}
    {history.length > 0 && <details className="mo-follow-history"><summary>Riwayat tindak lanjut ({formatCount(history.length)})</summary>
      <ol>{[...history].reverse().map((entry, index) => <li key={history.length - index}>
        <strong>{followUpChoices[entry.to?.status] || 'Baru'}{entry.to?.assignee ? `, ${entry.to.assignee}` : ''}</strong>
        <span>{pulseDate(entry.timestamp)}</span>
      </li>)}</ol>
    </details>}
  </form>;
}

function AlertRow({ alert, project, busy, onOpen, onAck, onSaved }) {
  const [following, setFollowing] = useState(false);
  const row = alertSummary(alert);
  const followUp = [followUpLabels[alert.workflow?.status], alert.workflow?.assignee].filter(Boolean).join(' oleh ');
  const context = [project, followUp].filter(Boolean).join(' · ');
  const formId = `mo-follow-${alert.id}`;
  return <li className="mo-alert" data-unread={row.unread ? '' : undefined}>
    <span className="mo-alert-mark" aria-hidden="true" />
    <span className="mo-alert-kind"><PulseTag tone={row.tone} icon={kindIcons[alert.kind] || Bell}>{row.label}</PulseTag></span>
    <div className="mo-alert-main">
      <strong title={row.title}><span className="pu-sr">{row.unread ? 'Belum dibaca: ' : 'Sudah dibaca: '}</span>{row.title}</strong>
      {(row.figure || context) && <span>{row.figure && <b>{row.figure}</b>}{row.figure && context ? ' · ' : ''}{context}</span>}
    </div>
    <time className="mo-alert-time" dateTime={alert.created_at}>{pulseDate(alert.created_at)}</time>
    <div className="mo-alert-actions">
      {row.opens && <PulseButton size="sm" arrow onClick={() => onOpen(alert)} aria-label={`Lihat posting: ${row.title}`}>Lihat posting</PulseButton>}
      <PulseButton size="sm" variant="quiet" aria-expanded={following} aria-controls={following ? formId : undefined} onClick={() => setFollowing(value => !value)} aria-label={`Tindak lanjut: ${row.title}`}>Tindak lanjut</PulseButton>
      {row.unread
        ? <PulseButton size="sm" variant="quiet" iconOnly disabled={busy} onClick={() => onAck(alert.id)} aria-label={`Tandai dibaca: ${row.title}`} title="Tandai dibaca"><Check size={16} aria-hidden="true" /></PulseButton>
        : <span className="mo-alert-read"><Check size={14} aria-hidden="true" />Dibaca</span>}
    </div>
    {following && <FollowUpForm alert={alert} formId={formId} disabled={busy} onSaved={onSaved} onClose={() => setFollowing(false)} />}
  </li>;
}

function AlertInbox({ data, alerts, topicId, topics, page, setPage, busy, disabled, marking, notice, onAck, onAckAll, onOpen, onRefresh, onSaved }) {
  const [expanded, setExpanded] = useState(false);
  const unread = data.unread || 0, total = data.alert_total || 0;
  const faults = alerts.filter(alert => alert.kind === 'collection_error' && alertSummary(alert).unread), rest = faults.length ? alerts.filter(alert => !faults.includes(alert)) : alerts;
  const visible = expanded ? rest : rest.slice(0, SHOWN_ALERTS);
  const pages = Math.max(1, Math.ceil(total / 50));
  const heading = unread ? `${formatCount(unread)} alert belum dibaca` : total ? 'Tidak ada alert baru' : 'Belum ada alert';
  return <section className="pulse-panel mo-panel mo-inbox" aria-labelledby="mo-alert-title">
    <header className="mo-head">
      <div className="mo-head-title">
        <span className="mo-count" data-unread={unread ? '' : undefined} aria-hidden="true">{unread ? formatCount(unread) : <Bell size={22} />}</span>
        <div>
          <div className="mo-head-line"><h2 id="mo-alert-title">{heading}</h2><InfoTip label="Kapan alert muncul">Ambang aktivitas teramati (misalnya 10 posting dan 3 kali lipat dari 30 menit sebelumnya), bukan kepastian viral.</InfoTip></div>
          <p>{total ? `${formatCount(total)} alert · ` : ''}Diperbarui {pulseDate(data.server_time)}</p>
        </div>
      </div>
      <div className="mo-head-actions">
        {unread > 0 && <PulseButton variant="primary" size="sm" busy={!!marking} busyLabel={marking ? `Menandai ${formatCount(marking.done)} dari ${formatCount(marking.total)}…` : undefined} disabled={busy || disabled} onClick={onAckAll}><CheckCheck size={16} aria-hidden="true" />Tandai semua dibaca</PulseButton>}
        <PulseButton size="sm" disabled={busy || disabled} onClick={onRefresh}><RefreshCw size={16} aria-hidden="true" />Perbarui</PulseButton>
      </div>
    </header>
    <div aria-live="polite">{notice && <div className="mo-feedback"><PulseNotice tone={notice.tone} role={notice.tone === 'warning' ? 'alert' : 'status'}>{notice.text}</PulseNotice></div>}</div>
    {!alerts.length
      ? <div className="mo-empty"><PulsePanelEmpty title="Belum ada alert untuk project ini">Alert muncul di sini.</PulsePanelEmpty></div>
      : <>{faults.length > 0 && <div className="mo-faults"><h3>Gangguan pengumpulan <PulseTag tone="warning">{formatCount(faults.length)} belum dibaca</PulseTag></h3>
        <ul className="mo-alerts" aria-label="Gangguan pengumpulan">{faults.map(alert => <AlertRow key={alert.id} alert={alert} project={topicId ? null : topics.find(topic => topic.id === alert.topic_id)?.label || null} busy={busy || disabled} onOpen={onOpen} onAck={onAck} onSaved={onSaved} />)}</ul></div>}
        <ul className="mo-alerts" aria-label="Daftar alert, terbaru di atas" aria-busy={(data.alert_offset ?? page * 50) !== page * 50 || undefined}>
        {visible.map(alert => <AlertRow key={alert.id} alert={alert} project={topicId ? null : topics.find(topic => topic.id === alert.topic_id)?.label || null} busy={busy || disabled} onOpen={onOpen} onAck={onAck} onSaved={onSaved} />)}
      </ul></>}
    {(rest.length > SHOWN_ALERTS || pages > 1) && <footer className="mo-inbox-foot">
      {rest.length > SHOWN_ALERTS && <PulseButton size="sm" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Ringkas daftar' : `Tampilkan ${formatCount(rest.length - SHOWN_ALERTS)} alert lainnya`}</PulseButton>}
      {pages > 1 && <nav className="mo-pages" aria-label="Halaman alert">
        <PulseButton size="sm" disabled={!canChangeAlertPage(page, total, busy, -1)} onClick={() => setPage(page - 1)}>Lebih baru</PulseButton>
        <span>Halaman {formatCount(page + 1)} dari {formatCount(pages)}</span>
        <PulseButton size="sm" disabled={!canChangeAlertPage(page, total, busy, 1)} onClick={() => setPage(page + 1)}>Lebih lama</PulseButton>
      </nav>}
    </footer>}
  </section>;
}

function SourceName({ row, size = 18 }) {
  return <span className="mo-source-name"><PlatformIcon platform={row.platform} size={size} /><strong>{row.label || platformLabel(row.platform)}</strong></span>;
}

/** One source as three answers: how much of the scheduled collection succeeded, which dates its posts span, how often it collects. */
function SourceRow({ row, axis, serverTime }) {
  const name = row.label || platformLabel(row.platform);
  const week = row.week, day = row.day, span = row.span, place = spanPlacement(span, axis);
  const frequency = frequencyText(row, serverTime);
  const density = span && span.days > 1 && row.daysWithPosts ? `, terbit pada ${formatCount(Math.min(row.daysWithPosts, span.days))} dari ${formatCount(span.days)} hari` : '';
  return <li className="mo-source">
    <div className="mo-cell mo-cell-source">
      <SourceName row={row} />
      {row.status.label && <PulseTag tone={row.status.tone} dot>{row.status.label}</PulseTag>}
      {row.status.reason && <span className="mo-note">{row.status.reason}</span>}
    </div>
    <div className="mo-cell">
      <span className="mo-cell-label">Terlaksana</span>
      {week ? <>
        <strong className="mo-figure">{formatCount(week.percent)}%</strong>
        <span className="mo-bar" role="img" aria-label={`${name}: ${formatCount(week.succeeded)} berhasil, ${formatCount(week.failed)} gagal, ${formatCount(week.waiting)} belum selesai dari ${formatCount(week.planned)} pengumpulan terjadwal dalam 7 hari terakhir`}>
          {week.succeeded > 0 && <i data-part="done" style={{ flexGrow: week.succeeded }} />}
          {week.failed > 0 && <i data-part="failed" style={{ flexGrow: week.failed }} />}
          {week.waiting > 0 && <i data-part="waiting" style={{ flexGrow: week.waiting }} />}
        </span>
        <span className="mo-note"><b>{formatCount(week.succeeded)} dari {formatCount(week.planned)}</b> pengumpulan terjadwal berhasil dalam 7 hari terakhir{week.failed ? `, ${formatCount(week.failed)} gagal` : ''}{week.waiting ? `, ${formatCount(week.waiting)} belum selesai` : ''}</span>
        <span className="mo-note">{day ? `24 jam terakhir: ${formatCount(day.succeeded)} dari ${formatCount(day.planned)} (${formatCount(day.percent)}%)` : '24 jam terakhir: tidak ada yang dijadwalkan'}</span>
      </> : <>
        <strong className="mo-figure" data-empty="">Belum ada angka</strong>
        <span className="mo-note">{row.hasFigures ? 'Tidak ada pengumpulan terjadwal dalam 7 hari terakhir.' : 'Angka belum tersedia dari server.'}</span>
      </>}
    </div>
    <div className="mo-cell">
      <span className="mo-cell-label">Rentang posting</span>
      {span ? <>
        <strong className="mo-figure">{formatCount(span.days)} hari</strong>
        {place && <span className="mo-range" role="img" aria-label={`Posting ${name} terbit ${span.text}. Garis menunjukkan letaknya di antara posting paling awal dan paling akhir project, ${axis.text}.`}><i style={{ left: `${place.start}%`, width: `${place.width}%` }} /></span>}
        <span className="mo-note"><b>{span.text}</b></span>
        <span className="mo-note">{formatCount(row.posts)} posting{density}</span>
      </> : <>
        <strong className="mo-figure" data-empty="">{row.posts ? 'Tanpa tanggal terbit' : row.hasFigures ? 'Belum ada posting' : 'Belum ada angka'}</strong>
        <span className="mo-note">{row.posts ? `${formatCount(row.posts)} posting tanpa tanggal terbit.` : row.hasFigures ? 'Belum ada posting.' : 'Angka belum tersedia dari server.'}</span>
      </>}
    </div>
    <div className="mo-cell">
      <span className="mo-cell-label">Frekuensi</span>
      {frequency.headline && <strong className="mo-figure" data-empty={row.scheduleRow?.enabled ? undefined : ''}>{frequency.headline}</strong>}
      <span className="mo-note">{frequency.last}</span>
      <span className="mo-note">{frequency.next}</span>
    </div>
  </li>;
}

function CollectionOverview({ data, rows, scopeLabel, scoped }) {
  const shown = rows.filter(row => row.shown), summary = collectionSummary(rows);
  const hasBars = shown.some(row => row.week), hasRanges = !!summary.span && shown.some(row => row.span);
  const often = minutes => (intervalText(minutes) || '').toLowerCase();
  return <section className="pulse-panel mo-panel mo-collect" aria-labelledby="mo-collect-title">
    <header className="mo-head">
      <div className="mo-head-title">
        <div>
          <h2 id="mo-collect-title"><Radio size={20} aria-hidden="true" />Pengumpulan data</h2>
          <p>{scopeLabel}</p>
        </div>
      </div>
    </header>
    {summary.sources > 0 && !!data.overview && <p className="mo-lead">
      <strong>{formatCount(summary.posts)} posting</strong> terkumpul dari <strong>{formatCount(summary.sources)} sumber</strong>{summary.span ? <>, terbit <strong>{summary.span.text}</strong></> : null}.{' '}
      {summary.week
        ? <>Dalam 7 hari terakhir <strong>{formatCount(summary.week.percent)}%</strong> pengumpulan terjadwal berhasil ({formatCount(summary.week.succeeded)} dari {formatCount(summary.week.planned)}).</>
        : 'Belum ada pengumpulan terjadwal dalam 7 hari terakhir.'}{' '}
      {!scoped ? null : !summary.scheduled ? 'Saat ini tidak ada sumber yang dikumpulkan otomatis.'
        : <><strong>{formatCount(summary.scheduled)} sumber</strong> dikumpulkan otomatis, {summary.fastest === summary.slowest ? often(summary.fastest) : `dari ${often(summary.fastest)} sampai ${often(summary.slowest)}`}.</>}
    </p>}
    {data.scheduler_running === false && <div className="mo-feedback"><PulseNotice tone="warning" role="status"><strong>Pengumpulan otomatis sedang tidak berjalan.</strong> Jadwal tertunda sampai layanan dinyalakan.</PulseNotice></div>}
    {!shown.length
      ? <div className="mo-empty"><PulsePanelEmpty title="Belum ada sumber yang dikumpulkan">Nyalakan jadwal di Pengaturan pengumpulan.</PulsePanelEmpty></div>
      : <>
        <div className="mo-sources-head" aria-hidden="true"><span>Sumber</span><span>Terlaksana</span><span>Rentang posting</span><span>Frekuensi</span></div>
        <ul className="mo-sources" aria-label="Pengumpulan per sumber">{shown.map(row => <SourceRow key={row.platform} row={row} axis={summary.span} serverTime={data.server_time} />)}</ul>
        {(hasBars || hasRanges) && <ul className="mo-legend" aria-label="Cara membaca batang dan garis">
          {hasBars && <li>Batang:
            <span><i className="mo-key" data-part="done" aria-hidden="true" />berhasil</span>
            <span><i className="mo-key" data-part="failed" aria-hidden="true" />gagal</span>
            <span><i className="mo-key" data-part="waiting" aria-hidden="true" />belum selesai</span></li>}
          {hasRanges && <li>Garis:
            <span><i className="mo-key" data-part="range" aria-hidden="true" />ada posting</span></li>}
        </ul>}
      </>}
  </section>;
}

const stopNotes = {
  authentication_failed: 'Akses ke sumber data ditolak.', not_configured: 'Sumber data belum dihubungkan.',
  access_or_quota_restricted: 'Saldo sumber data habis.', plan_restricted: 'Saldo sumber data habis.',
};

/** What stands in the way of collecting through one channel, with the one action that lifts it. Nothing while it is fine. */
function ChannelNote({ channel, name, save, showOff = true }) {
  if (!channel) return null;
  const shared = monitorSources.filter(source => source.channel === channel.provider && source.label !== name).map(source => source.label);
  const put = (body, question, done) => save('/workers/' + channel.provider, body, question + (shared.length ? ` Berlaku juga untuk ${shared.join(', ')}.` : ''), done);
  if (channel.daily_limit === 0) return showOff ? <p className="mo-channel-note"><span>{name} dimatikan untuk semua project, jadi jadwalnya tidak bisa berjalan.</span><PulseButton size="sm" onClick={() => put({ daily_limit: -1 }, `Nyalakan lagi ${name} untuk semua project?`, `${name} dinyalakan lagi.`)}>Nyalakan lagi</PulseButton></p> : null;
  if (channel.blocked_reason && channel.blocked_until) return <p className="mo-channel-note"><span>Sumber meminta jeda. Lanjut sekitar {pulseDate(channel.blocked_until)}.</span></p>;
  if (channel.blocked_reason) return <p className="mo-channel-note"><span>{stopNotes[channel.blocked_reason] || 'Sumber data menolak permintaan.'} Pengumpulan {name} terhenti.</span><PulseButton size="sm" onClick={() => put({ daily_limit: channel.daily_limit, clear_block: true }, `Coba lagi mengumpulkan ${name}?`, `${name} dicoba lagi pada jadwal berikutnya.`)}>Coba lagi</PulseButton></p>;
  if (channel.daily_limit > 0) return <p className="mo-channel-note"><span>{name} masih dibatasi {formatCount(channel.daily_limit)} pengumpulan per hari untuk semua project.</span><PulseButton size="sm" onClick={() => put({ daily_limit: -1 }, `Hapus batas harian ${name} untuk semua project?`, `Batas harian ${name} dihapus.`)}>Hapus batas</PulseButton></p>;
  return null;
}

function ScheduleRow({ row, topicId, save }) {
  const schedule = row.scheduleRow;
  const [enabled, setEnabled] = useState(!!schedule?.enabled);
  const [interval, setIntervalValue] = useState(schedule?.interval_minutes || defaultInterval(row.platform));
  const choices = [...new Set([...intervalChoices, interval])].sort((a, b) => a - b);
  const changed = enabled !== !!schedule?.enabled || (!!schedule && interval !== schedule.interval_minutes);
  const often = (intervalText(interval) || '').toLowerCase();
  const submit = event => {
    event.preventDefault();
    const question = !enabled ? `Jeda pengumpulan otomatis ${row.label} untuk project ini?`
      : schedule?.enabled ? `Ubah pengumpulan ${row.label} menjadi ${often}?`
        : `Kumpulkan ${row.label} otomatis ${often}?`;
    save('/topics/' + encodeURIComponent(topicId) + '/' + row.schedule, { enabled, interval_minutes: interval }, question, `Jadwal ${row.label} tersimpan.`);
  };
  return <li className="mo-schedule">
    <form onSubmit={submit} aria-label={`Jadwal ${row.label}`}>
      <SourceName row={row} size={16} />
      <label className="mo-switch"><input type="checkbox" role="switch" className="pu-switch-input" checked={enabled} onChange={event => setEnabled(event.target.checked)} />Kumpulkan otomatis</label>
      <label className="mo-field"><span>Seberapa sering</span><select value={interval} onChange={event => setIntervalValue(Number(event.target.value))}>{choices.map(minutes => <option key={minutes} value={minutes}>{intervalText(minutes)}</option>)}</select></label>
      <PulseButton type="submit" size="sm" variant={changed ? 'primary' : 'secondary'} disabled={!changed}>Simpan</PulseButton>
    </form>
    <ChannelNote channel={row.channelRow} name={row.label} save={save} />
  </li>;
}

function ExtraRow({ extra, channel, save }) {
  const on = channel.daily_limit !== 0;
  const toggle = () => save('/workers/' + channel.provider, { daily_limit: on ? 0 : -1 },
    on ? `Matikan ${extra.label} untuk semua project?` : `Nyalakan ${extra.label} untuk semua project?${extra.paid ? ' Memakai saldo sumber data.' : ''}`,
    `${extra.label} ${on ? 'dimatikan' : 'dinyalakan'}.`);
  return <li className="mo-schedule">
    <div className="mo-extra">
      <strong>{extra.label}</strong>
      <label className="mo-switch"><input type="checkbox" role="switch" className="pu-switch-input" checked={on} onChange={toggle} />{on ? 'Menyala' : 'Mati'}</label>
    </div>
    {on && <ChannelNote channel={channel} name={extra.label} save={save} showOff={false} />}
  </li>;
}

const archiveSources = monitorSources.map(source => [source.platform, source.label]);
const archiveStops = { rate_limited: 'sumber meminta jeda', access_or_quota_restricted: 'saldo sumber data habis', plan_restricted: 'saldo sumber data habis', authentication_failed: 'akses ke sumber data ditolak', not_configured: 'sumber data belum dihubungkan', pending: 'sumber belum selesai menyiapkan data' };
/** Pulls older posts for one source and a date range. Explicit and bounded by the server. */
function ArchivePull({ topicId, disabled, onDone }) {
  const [state, setState] = useState({ busy: false, result: null, error: '' });
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget), from = form.get('from'), to = form.get('to');
    if (!from || !to || from > to) { setState({ busy: false, result: null, error: 'Isi kedua tanggal; akhir tidak boleh sebelum mulai.' }); return; }
    setState({ busy: true, result: null, error: '' });
    try {
      const result = await api.post('/admin/pulse/topics/' + encodeURIComponent(topicId) + '/backfill', { platform: form.get('platform'), from, to });
      setState({ busy: false, result, error: '' }); window.dispatchEvent(new Event('pulse-data-changed')); onDone?.();
    } catch (error) {
      setState({ busy: false, result: null, error: error.status === 409 ? 'Pengumpulan lain sedang berjalan. Coba lagi sebentar.' : error.status === 422 ? 'Rentang tanggal tidak valid (1–92 hari).' : 'Posting lama belum berhasil ditarik. Coba lagi.' });
    }
  }
  const result = state.result;
  return <div className="mo-archive">
    
    <form onSubmit={submit}><fieldset disabled={disabled || state.busy}>
      <label className="mo-field"><span>Sumber</span><select name="platform" defaultValue="x">{archiveSources.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="mo-field"><span>Dari tanggal</span><input name="from" type="date" required /></label>
      <label className="mo-field"><span>Sampai tanggal</span><input name="to" type="date" required /></label>
      <PulseButton type="submit" busy={state.busy} busyLabel="Menarik posting lama…">Tarik posting lama</PulseButton>
    </fieldset></form>
    <div aria-live="polite">
      {state.error && <PulseNotice tone="warning" role="alert">{state.error}</PulseNotice>}
      {result && <>
        <PulseNotice role="status"><strong>{formatCount(result.ingested)} posting baru</strong> dari {formatCount(result.fetched)} yang ditemukan.{result.stopped ? ` Berhenti lebih awal: ${archiveStops[result.stopped] || 'sumber menolak permintaan'}.` : ''}</PulseNotice>
        <ul className="mo-archive-parts">{(result.windows || []).map(part => <li key={part.from}><span>{part.from === part.to ? pulseDate(part.from) : `${pulseDate(part.from)} sampai ${pulseDate(part.to)}`}</span><span>{part.status === 'success' ? `${formatCount(part.fetched)} ditemukan, ${formatCount(part.ingested)} baru` : (archiveStops[part.status] || 'belum berhasil ditarik')}</span></li>)}</ul>
      </>}
    </div>
  </div>;
}

function CollectionSettings({ data, rows, topicId, scopeLabel, busy, disabled, notice, save, onDone }) {
  const channels = new Map((data.workers || []).map(row => [row.provider, row]));
  const extras = monitorExtras.filter(extra => channels.has(extra.channel));
  return <details className="pulse-panel mo-panel mo-settings">
    <summary><SlidersHorizontal size={18} aria-hidden="true" /><span><strong>Pengaturan pengumpulan</strong></span><ChevronDown className="mo-chevron" size={18} aria-hidden="true" /></summary>
    <div className="mo-settings-body">
      <div aria-live="polite">{notice && <PulseNotice tone={notice.tone} role={notice.tone === 'warning' ? 'alert' : 'status'}>{notice.text}</PulseNotice>}</div>
      <section aria-labelledby="mo-set-schedule">
        <h3 id="mo-set-schedule">Jadwal per sumber</h3>
        {topicId
          ? <><fieldset disabled={busy || disabled}><ul className="mo-schedules">{rows.filter(row => row.schedule).map(row => <ScheduleRow key={[row.platform, row.scheduleRow?.enabled, row.scheduleRow?.interval_minutes].join(':')} row={row} topicId={topicId} save={save} />)}</ul></fieldset></>
          : <p>Pilih satu project untuk mengatur jadwalnya.</p>}
      </section>
      {extras.length > 0 && <section aria-labelledby="mo-set-extras">
        <h3 id="mo-set-extras">Pelengkap data</h3>
        
        <fieldset disabled={busy || disabled}><ul className="mo-schedules">{extras.map(extra => <ExtraRow key={extra.channel} extra={extra} channel={channels.get(extra.channel)} save={save} />)}</ul></fieldset>
      </section>}
      {topicId && <section aria-labelledby="mo-set-archive">
        <h3 id="mo-set-archive">Tarik posting lama</h3>
        <ArchivePull topicId={topicId} disabled={busy || disabled} onDone={onDone} />
      </section>}
    </div>
  </details>;
}

const saveError = error => error?.status === 409 ? 'Sumber ini belum bisa dijadwalkan.'
  : error?.status === 404 ? 'Project atau sumber tidak ditemukan.'
    : error?.status === 422 ? 'Pengaturan tidak valid.'
      : [401, 403].includes(error?.status) ? pulseError(error) : 'Belum tersimpan. Coba lagi.';

export default function MonitorRoom(props) {
  // A project change resets pagination, drafts and in-flight response ownership.
  return <MonitorProject key={props.topicId ? `topic:${props.topicId}` : 'all-topics'} {...props}/>;
}

function MonitorProject({ topicId, topics = [], onOpenAlert, disabled }) {
  const [data, setData] = useState(null), [error, setError] = useState(null), [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);   // {zone: 'alerts'|'settings', tone, text}
  const [marking, setMarking] = useState(null);
  const [page, setPage] = useState(0);
  const live = useRef(false), fetching = useRef(false), generation = useRef(0);
  const invalidate = useCallback(() => { generation.current += 1; fetching.current = false; }, []);
  const load = useCallback(async () => {
    if (!live.current || fetching.current || disabled) return;
    fetching.current = true;
    const request = ++generation.current;
    if (topicId) unreadReadStarted(topicId);
    try {
      const value = await api.get('/admin/pulse/monitor', { topic_id: topicId, alert_offset: page * 50 });
      if (live.current && request === generation.current) { setData(value); setError(null); publishUnread(topicId, value.unread); }
    } catch (e) { if (live.current && request === generation.current) { setError(e); publishUnread(topicId, null); } } finally { if (request === generation.current) fetching.current = false; }
  }, [disabled, topicId, page]);
  useEffect(() => { live.current = true; load(); const timer = setInterval(load, 30000); return () => { live.current = false; invalidate(); clearInterval(timer); }; }, [load, invalidate]);
  const reload = async () => { invalidate(); await load(); };   // discards any poll started before a write
  const save = async (path, body, question, done = 'Pengaturan tersimpan.') => {
    if (busy || !window.confirm(question)) return;
    setBusy(true); setNotice(null);
    try { await api.put('/admin/pulse/monitor' + path, body); setNotice({ zone: 'settings', tone: 'neutral', text: done }); await reload(); }
    catch (e) { if (live.current) setNotice({ zone: 'settings', tone: 'warning', text: saveError(e) }); }
    finally { setBusy(false); }
  };
  const acknowledge = id => api.post('/admin/pulse/monitor/alerts/' + encodeURIComponent(id) + '/ack');
  const ack = async id => {
    if (busy) return;
    setBusy(true); setNotice(null);
    try { await acknowledge(id); await reload(); }
    catch (e) { if (live.current) setNotice({ zone: 'alerts', tone: 'warning', text: `Alert belum bisa ditandai dibaca. ${pulseError(e)}` }); }
    finally { setBusy(false); }
  };
  // The server acknowledges one alert per request. Collect the unread alerts of every page of this scope, then acknowledge them one after another.
  const ackAll = async () => {
    if (busy || !data?.unread) return;
    if (!window.confirm(`Tandai ${formatCount(data.unread)} alert sebagai dibaca?`)) return;
    setBusy(true); setNotice(null);
    let done = 0, ids = [];
    try {
      for (let offset = 0; ; offset += 50) {
        const part = await api.get('/admin/pulse/monitor', { topic_id: topicId, alert_offset: offset });
        ids.push(...part.alerts.filter(alert => !alert.acknowledged_at).map(alert => alert.id));
        if (!part.alerts.length || offset + 50 >= part.alert_total || ids.length >= part.unread) break;
      }
      ids = [...new Set(ids)];
      for (const id of ids) {
        if (!live.current) return;
        setMarking({ done, total: ids.length });
        await acknowledge(id); done += 1;
      }
      if (live.current) setNotice({ zone: 'alerts', tone: 'neutral', text: `${formatCount(done)} alert ditandai dibaca.` });
    } catch (e) {
      if (live.current) setNotice({ zone: 'alerts', tone: 'warning', text: `${formatCount(done)} dari ${formatCount(ids.length || data.unread)} alert ditandai dibaca, sisanya belum. ${pulseError(e)}` });
    } finally {
      if (live.current) { setMarking(null); setPage(0); await reload(); setBusy(false); }
    }
  };
  const topic = topicId ? topics.find(row => row.id === topicId) || { id: topicId, sources: [] } : null;
  const scopeLabel = topicId ? (topic.label || topicId) : 'Semua project';
  const alerts = (data?.alerts || []).filter(alert => !topicId || alert.topic_id === topicId);
  const rows = data ? collectionRows(data, topic) : [];
  return <div className="mo-room" id="pulse-monitor">
    {error && <PulseNotice tone="warning" role="alert">{pulseError(error)}</PulseNotice>}
    {!data ? (disabled ? <PulseNotice>Masuk sebagai admin untuk melihat alert dan pengumpulan.</PulseNotice> : !error && <PulseSkeleton label="Memuat alert dan pengumpulan…" stats={0} panels={0} rows={5} />) : <>
      <AlertInbox data={data} alerts={alerts} topicId={topicId} topics={topics} page={page} setPage={setPage} busy={busy} disabled={disabled} marking={marking}
        notice={notice?.zone === 'alerts' ? notice : null} onAck={ack} onAckAll={ackAll} onOpen={onOpenAlert} onRefresh={reload} onSaved={reload} />
      <CollectionOverview data={data} rows={rows} scopeLabel={scopeLabel} scoped={!!topicId} />
      <CollectionSettings data={data} rows={rows} topicId={topicId} scopeLabel={scopeLabel} busy={busy} disabled={disabled}
        notice={notice?.zone === 'settings' ? notice : null} save={save} onDone={reload} />
    </>}
  </div>;
}

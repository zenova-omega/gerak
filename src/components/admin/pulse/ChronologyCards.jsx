import { PulseArrow } from '../../ui/PulseArrow';
import React from 'react';
import { chronologyNotes, chronologyPage } from '../../../lib/pulseChronology.js';
import { pulseDate, safeSourceUrl } from '../../../lib/pulseData.js';
import InfoTip from '../../../pulse/InfoTip';
import AccountAvatar from './AccountAvatar';
import './chronology.css';

export default function ChronologyCards({ rows, page, onPageChange, selected, onSelect, firstTime }) {
  const result = chronologyPage(rows, page);
  return <section className="nx-chronology" aria-label="Jejak Penyebaran">
    <div className="nx-chronology-head"><h3>Jejak Penyebaran</h3><InfoTip label="Cara membaca jejak penyebaran">{chronologyNotes.map(note => <p key={note}>{note}</p>)}</InfoTip>
      <p role="status">{result.total} posting · {result.dated} bertanggal · {result.unknown} tanpa tanggal · {result.rows.length} tampil</p>
      {result.dateOnly > 0 && <p className="nx-chronology-note">{result.dateOnly} posting hanya bertanggal tidak diurutkan menurut jam.</p>}</div>
    {!rows.length && <p className="nx-empty">Belum ada posting untuk filter dan waktu ini.</p>}
    <ol className="nx-chronology-list" start={result.page * 15 + 1}>
      {result.rows.map(post => <li key={post.id} className="nx-chronology-card">
        <div className="nx-chronology-meta"><span className="pu-account-line"><AccountAvatar size="xs" author={post.author} platform={post.platform} />{post.author || 'Akun tanpa nama'}</span>
          {post.time === null ? <span>Tanggal tidak diketahui · di luar urutan waktu</span> : <time>{pulseDate(post.published_at)}</time>}
        </div>
        {post.time !== null && post.clock !== false && post.time === firstTime && <strong className="nx-chronology-first">Terawal teramati dalam sampel</strong>}
        <h4>{post.title || 'Teks posting tidak tersedia'}</h4>
        <div className="nx-chronology-actions">
          <button type="button" aria-label={'Pilih akun ' + (post.author || post.accountId)} aria-pressed={selected === post.accountId} onClick={() => onSelect(post.accountId)}>{post.author || 'Akun tanpa nama'} · Lihat bukti akun</button>
          {safeSourceUrl(post.url) ? <a href={safeSourceUrl(post.url)} target="_blank" rel="noopener noreferrer">Buka sumber asli <PulseArrow/></a> : <span>Tautan sumber tidak tersedia</span>}
        </div>
      </li>)}
    </ol>
    <nav className="nx-pagination" aria-label="Halaman jejak penyebaran">
      <button disabled={result.page === 0} onClick={() => onPageChange(result.page - 1)}>Sebelumnya</button>
      <span>{result.page + 1} / {result.pages} · 15 per halaman</span>
      <button disabled={result.page >= result.pages - 1} onClick={() => onPageChange(result.page + 1)}>Berikutnya</button>
    </nav>
  </section>;
}

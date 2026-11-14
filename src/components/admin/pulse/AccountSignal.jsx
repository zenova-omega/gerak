import React from 'react';

// Original PULSE vector marks. Text labels always accompany color/shape.
export default function AccountSignal({ kind, compact = false }) {
  const viral = kind === 'viral';
  const label = viral ? 'Top interaksi · sampel' : 'Indikasi otomatisasi';
  return <span className={'pulse-signal-mark ' + (viral ? 'viral' : 'automation')} title={viral ? 'Top 3 akun berdasarkan interaksi snapshot terakhir; termasuk seri. Bukan ukuran pengaruh kausal.' : 'Sinyal perilaku perlu ditinjau. Bukan penetapan akun bot.'}>
    <svg viewBox="0 0 32 32" width={compact ? 18 : 28} height={compact ? 18 : 28} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
      {viral ? <><path d="M16 3 19.5 12.5 29 16 19.5 19.5 16 29 12.5 19.5 3 16 12.5 12.5Z" fill="currentColor" fillOpacity=".16"/><path d="M7 5 5 7M25 5l2 2M5 25l2 2M25 27l2-2"/><circle cx="16" cy="16" r="3"/></> : <><rect x="7" y="7" width="18" height="18" rx="5" fill="currentColor" fillOpacity=".13"/><path d="M12 3v4M20 3v4M12 25v4M20 25v4M3 12h4M3 20h4M25 12h4M25 20h4M16 11v6"/><circle cx="16" cy="21" r="1" fill="currentColor"/></>}
    </svg><span>{label}</span>
  </span>;
}

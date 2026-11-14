import React from 'react';

// Original PULSE vector marks. Text labels always accompany color/shape.
/** "Pola mirip buzzer": shown only when two or more different amplification behaviours were observed
 * for the account. It names what the account did in the collected data, with the evidence beside it. */
export function PatternTag({ signals = [] }) {
  return <span className="pulse-pattern-tag" title={`Dua atau lebih pola penguatan teramati: ${signals.map(signal => signal.detail).join(' ')} Ini pola perilaku pada data terkumpul, bukan bukti identitas, bayaran, atau otomatisasi.`}>
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.5v3h2l4 3v-9l-4 3h-2Z"/><path d="M11 5.8a3 3 0 0 1 0 4.4M12.8 4a5.5 5.5 0 0 1 0 8"/></svg>
    Pola mirip buzzer
  </span>;
}

export default function AccountSignal({ kind, compact = false }) {
  const viral = kind === 'viral';
  const label = viral ? 'Top interaksi · sampel' : 'Indikasi otomatisasi';
  return <span className={'pulse-signal-mark ' + (viral ? 'viral' : 'automation')} title={viral ? 'Top 3 akun berdasarkan interaksi snapshot terakhir; termasuk seri. Bukan ukuran pengaruh kausal.' : 'Sinyal perilaku perlu ditinjau. Bukan penetapan akun bot.'}>
    <svg viewBox="0 0 32 32" width={compact ? 18 : 28} height={compact ? 18 : 28} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
      {viral ? <><path d="M16 3 19.5 12.5 29 16 19.5 19.5 16 29 12.5 19.5 3 16 12.5 12.5Z" fill="currentColor" fillOpacity=".16"/><path d="M7 5 5 7M25 5l2 2M5 25l2 2M25 27l2-2"/><circle cx="16" cy="16" r="3"/></> : <><rect x="7" y="7" width="18" height="18" rx="5" fill="currentColor" fillOpacity=".13"/><path d="M12 3v4M20 3v4M12 25v4M20 25v4M3 12h4M3 20h4M25 12h4M25 20h4M16 11v6"/><circle cx="16" cy="21" r="1" fill="currentColor"/></>}
    </svg><span>{label}</span>
  </span>;
}

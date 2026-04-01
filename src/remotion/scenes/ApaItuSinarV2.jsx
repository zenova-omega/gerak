import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

/* ── SINAR Brand Colors ── */
const PRIMARY = '#1B4332';
const PRIMARY_ACCENT = '#2D6A4F';
const GOLD = '#B8860B';
const PATRIOT = '#8B1A1A';
const BLACK = '#1A1814';
const WHITE = '#FFFFFF';
const BG = '#F5F3EE';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#DDD9D0';
const TEXT_PRIMARY = '#1A1814';
const TEXT_SEC = '#3D3929';
const TEXT_MUTED = '#6B6555';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const FONT = "'Inter', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";

const PILLARS = [
  { title: 'Misi dari Komando', desc: 'DISPENAD kirim instruksi langsung ke perangkat 400K prajurit', color: PRIMARY_ACCENT, code: '01',
    icon: (c) => <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M3 5h12v2H3V5zm0 6h18v2H3v-2zm0 6h12v2H3v-2z" fill={c}/><path d="M19 3l4 4-4 4V3z" fill={c} opacity="0.5"/></svg> },
  { title: 'Aplikasi Mobile', desc: 'Satu platform untuk prajurit & KBT — terima, eksekusi, upload bukti', color: '#16A34A', code: '02',
    icon: (c) => <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="7" y="2" width="10" height="20" rx="2" stroke={c} strokeWidth="1.5"/><circle cx="12" cy="18" r="1" fill={c}/><line x1="9" y1="5" x2="15" y2="5" stroke={c} strokeWidth="1" opacity="0.4"/></svg> },
  { title: 'Insentif & Gamifikasi', desc: 'Poin XP, pangkat digital, lencana, dan reward merchandise nyata', color: GOLD, code: '03',
    icon: (c) => <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4 5.6 21.2 8 14 2 9.2h7.6L12 2z" fill={c} opacity="0.8"/></svg> },
  { title: 'Pusat Kendali', desc: 'Dashboard admin untuk monitoring seluruh aktivitas nasional real-time', color: PATRIOT, code: '04',
    icon: (c) => <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" fill={c} opacity="0.7"/><rect x="14" y="3" width="7" height="4" rx="1" fill={c} opacity="0.5"/><rect x="14" y="10" width="7" height="7" rx="1" fill={c} opacity="0.7"/><rect x="3" y="13" width="7" height="4" rx="1" fill={c} opacity="0.5"/><rect x="3" y="19" width="18" height="2" rx="1" fill={c} opacity="0.3"/></svg> },
];

export const ApaItuSinarV2 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelOp = interpolate(frame, [0, 15], [0, 1], CLAMP);
  const logoOp = interpolate(frame, [10, 35], [0, 1], CLAMP);
  const titleOp = interpolate(frame, [20, 45], [0, 1], CLAMP);
  const titleY = interpolate(frame, [20, 45], [20, 0], CLAMP);
  const lineW = interpolate(frame, [35, 60], [0, 120], CLAMP);
  const descOp = interpolate(frame, [45, 70], [0, 1], CLAMP);
  const descY = interpolate(frame, [45, 70], [15, 0], CLAMP);

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: FONT }}>
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 48, left: 80, right: 80,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        opacity: labelOp,
      }}>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_MUTED, letterSpacing: 2 }}>APA ITU SINAR</span>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_MUTED, letterSpacing: 2 }}>SINAR PLATFORM</span>
      </div>

      {/* Main content — centered layout */}
      <div style={{
        position: 'absolute', top: 100, bottom: 80, left: 80, right: 80,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', textAlign: 'center',
      }}>
        {/* Tagline */}
        <div style={{ opacity: logoOp, marginBottom: 8 }}>
          <span style={{
            fontSize: 13, fontFamily: FONT_MONO, color: GOLD,
            letterSpacing: 5, fontWeight: 600,
          }}>
            SISTEM INFORMASI NARASI AKTIF RAKYAT
          </span>
        </div>

        {/* Title */}
        <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)` }}>
          <h1 style={{
            fontSize: 72, fontWeight: 900, color: BLACK,
            letterSpacing: 10, lineHeight: 1, margin: 0,
          }}>
            <span style={{
              background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>SINAR</span>
          </h1>
        </div>

        {/* Gradient accent line */}
        <div style={{
          width: lineW, height: 3, marginTop: 24, marginBottom: 24,
          background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})`,
          borderRadius: 2,
        }} />

        {/* Description — bigger text */}
        <div style={{ opacity: descOp, transform: `translateY(${descY}px)`, marginBottom: 40, maxWidth: 750 }}>
          <p style={{
            fontSize: 24, color: TEXT_SEC, lineHeight: 1.7, margin: 0,
          }}>
            Aplikasi mobile yang{' '}
            <strong style={{ color: BLACK }}>mengorganisir dan menggerakkan 400.000 prajurit dan Keluarga Besar TNI</strong>{' '}
            secara serentak untuk menyebarkan{' '}
            <strong style={{ color: PRIMARY }}>narasi positif TNI AD</strong>{' '}
            melalui misi terstruktur dan insentif nyata.
          </p>
        </div>

        {/* 4 Pillar cards — horizontal row */}
        <div style={{ display: 'flex', gap: 18, justifyContent: 'center', width: '100%' }}>
          {PILLARS.map((p, i) => {
            const cardAppear = spring({ frame: frame - 55 - i * 8, fps, config: { damping: 22, mass: 0.7 } });
            const cardY = interpolate(cardAppear, [0, 1], [25, 0], CLAMP);
            return (
              <div key={i} style={{
                flex: '1 1 0', maxWidth: 260,
                padding: '24px 20px',
                background: CARD_BG,
                border: `1px solid ${CARD_BORDER}`,
                opacity: cardAppear,
                transform: `translateY(${cardY}px)`,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                textAlign: 'center', gap: 12,
                position: 'relative',
              }}>
                {/* Icon */}
                <div style={{
                  width: 56, height: 56, borderRadius: 14, flexShrink: 0,
                  background: `${p.color}10`, border: `1px solid ${p.color}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {p.icon(p.color)}
                </div>
                {/* Title */}
                <span style={{ fontSize: 18, fontWeight: 700, color: TEXT_PRIMARY }}>
                  {p.title}
                </span>
                {/* Desc */}
                <p style={{ fontSize: 14, color: TEXT_MUTED, margin: 0, lineHeight: 1.55 }}>
                  {p.desc}
                </p>
                {/* Bottom accent */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, width: '100%', height: 2,
                  background: `linear-gradient(90deg, ${p.color}, ${p.color}33)`,
                }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        position: 'absolute', bottom: 48, left: 80, right: 80,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        opacity: labelOp,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: `linear-gradient(135deg, ${PRIMARY}, ${GOLD})` }} />
          <span style={{ fontSize: 13, fontFamily: FONT, color: TEXT_MUTED, fontWeight: 500 }}>sinar.id</span>
        </div>
        <span style={{ fontSize: 13, fontFamily: FONT_MONO, color: '#C4C0B8', letterSpacing: 1 }}>02</span>
      </div>
    </AbsoluteFill>
  );
};

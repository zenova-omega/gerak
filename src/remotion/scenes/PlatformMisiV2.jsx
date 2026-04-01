import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

/* ── SINAR Brand Colors ── */
const PRIMARY = '#1B4332';
const PRIMARY_ACCENT = '#2D6A4F';
const GOLD = '#B8860B';
const PURPLE = '#6D28D9';
const ORANGE = '#C2410C';
const TEAL = '#0F766E';
const PATRIOT = '#8B1A1A';
const BLACK = '#1A1814';
const BG = '#F5F3EE';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#DDD9D0';
const TEXT_PRIMARY = '#1A1814';
const TEXT_SEC = '#3D3929';
const TEXT_MUTED = '#6B6555';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const FONT = "'Inter', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";

/* Platform data with SVG icons */
const PLATFORMS = [
  { name: 'YouTube', color: '#FF0000', short: 'YT',
    icon: <svg width="20" height="20" viewBox="0 0 24 24"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.5 31.5 0 000 12a31.5 31.5 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31.5 31.5 0 0024 12a31.5 31.5 0 00-.5-5.8zM9.5 15.5v-7l6.3 3.5-6.3 3.5z" fill="#FF0000"/></svg>,
    desc: 'Video panjang, dokumenter, liputan acara' },
  { name: 'Instagram', color: '#E1306C', short: 'IG',
    icon: <svg width="20" height="20" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" stroke="#E1306C" strokeWidth="2" fill="none"/><circle cx="12" cy="12" r="5" stroke="#E1306C" strokeWidth="2" fill="none"/><circle cx="18" cy="6" r="1.5" fill="#E1306C"/></svg>,
    desc: 'Reels, stories, foto infografis' },
  { name: 'TikTok', color: '#000000', short: 'TT',
    icon: <svg width="20" height="20" viewBox="0 0 24 24"><path d="M16.6 5.8A4.3 4.3 0 0113 2h-3v14a3 3 0 11-2-2.8V8a7 7 0 102 6.9V9.5a4.3 4.3 0 006.6-3.7z" fill="#000"/></svg>,
    desc: 'Short video viral, challenge, trend' },
  { name: 'X / Twitter', color: '#1D9BF0', short: 'X',
    icon: <svg width="20" height="20" viewBox="0 0 24 24"><path d="M18.2 2h3.5l-7.6 8.7L23 22h-7l-5-6.5L5.3 22H1.8l8.1-9.3L1.4 2h7.2l4.5 5.9L18.2 2z" fill="#1D9BF0"/></svg>,
    desc: 'Thread, opini, real-time engagement' },
  { name: 'Facebook', color: '#1877F2', short: 'FB',
    icon: <svg width="20" height="20" viewBox="0 0 24 24"><path d="M24 12a12 12 0 10-13.9 11.8v-8.4H7v-3.4h3.1V9.4c0-3.1 1.8-4.8 4.6-4.8 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.4h-2.9v8.4A12 12 0 0024 12z" fill="#1877F2"/></svg>,
    desc: 'Post, grup komunitas, share berita' },
  { name: 'WhatsApp', color: '#25D366', short: 'WA',
    icon: <svg width="20" height="20" viewBox="0 0 24 24"><path d="M17.5 14.4l-2-1c-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.3.3-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5.3-.4.1-.3c.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.8s1.2 3.3 1.4 3.5c.2.2 2.4 3.6 5.8 5 .8.4 1.5.6 2 .8.8.3 1.6.2 2.2.1.7-.1 2-.8 2.3-1.6.3-.8.3-1.4.2-1.6-.1-.1-.3-.2-.6-.4z" fill="#25D366"/><path d="M12 2a10 10 0 00-8.6 14.9L2 22l5.2-1.4A10 10 0 1012 2z" stroke="#25D366" strokeWidth="1.5" fill="none"/></svg>,
    desc: 'Distribusi ke grup, forwarding massal' },
];

const MISSIONS = [
  { type: 'EVENT', color: PURPLE, label: 'Event & Kehadiran' },
  { type: 'KONTEN', color: PRIMARY, label: 'Buat Konten' },
  { type: 'ENGAGEMENT', color: ORANGE, label: 'Like, Share, Comment' },
  { type: 'EDUKASI', color: TEAL, label: 'Distribusi Materi' },
  { type: 'AKSI', color: GOLD, label: 'Aksi Lapangan' },
];

/* Matrix: which platform supports which mission. true = primary, 'partial' = secondary */
const MATRIX = [
  /* YT    IG     TT     X      FB     WA */
  [true,  true,  true,  false, true,  false],   /* EVENT */
  [true,  true,  true,  false, false, false],   /* KONTEN */
  [true,  true,  true,  true,  true,  false],   /* ENGAGEMENT */
  [false, true,  false, true,  true,  true],     /* EDUKASI */
  [false, true,  true,  true,  true,  true],     /* AKSI */
];

export const PlatformMisiV2 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelOp = interpolate(frame, [0, 15], [0, 1], CLAMP);
  const titleOp = interpolate(frame, [5, 25], [0, 1], CLAMP);
  const titleY = interpolate(frame, [5, 25], [20, 0], CLAMP);
  const lineW = interpolate(frame, [15, 40], [0, 80], CLAMP);

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: FONT }}>
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 48, left: 80, right: 80,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        opacity: labelOp,
      }}>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_MUTED, letterSpacing: 2 }}>DISTRIBUSI KONTEN</span>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_MUTED, letterSpacing: 2 }}>SINAR PLATFORM</span>
      </div>

      {/* Content */}
      <div style={{
        position: 'absolute', top: 90, bottom: 80, left: 80, right: 80,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20,
      }}>
        {/* Title */}
        <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, textAlign: 'center' }}>
          <h2 style={{ fontSize: 48, fontWeight: 900, color: BLACK, margin: 0, lineHeight: 1.15 }}>
            6 Platform,{' '}
            <span style={{
              background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>5 Tipe Misi</span>
          </h2>
          <p style={{ fontSize: 17, color: TEXT_MUTED, margin: '8px 0 0', fontWeight: 500 }}>
            Setiap misi didistribusikan ke platform yang paling efektif
          </p>
        </div>

        {/* Gradient line */}
        <div style={{
          width: lineW, height: 3, margin: '0 auto',
          background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})`,
          borderRadius: 2,
        }} />

        {/* Platform cards row */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
          {PLATFORMS.map((p, i) => {
            const appear = spring({ frame: frame - 25 - i * 5, fps, config: { damping: 22, mass: 0.7 } });
            return (
              <div key={i} style={{
                flex: '1 1 0', maxWidth: 170,
                padding: '16px 14px', textAlign: 'center',
                background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
                borderTop: `3px solid ${p.color}`,
                opacity: appear, transform: `translateY(${(1 - appear) * 20}px)`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `${p.color}08`, border: `1px solid ${p.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {p.icon}
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY }}>{p.name}</span>
                <p style={{ fontSize: 11, color: TEXT_MUTED, margin: 0, lineHeight: 1.4 }}>{p.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Matrix: Mission x Platform */}
        <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, overflow: 'hidden' }}>
          {/* Header row */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${CARD_BORDER}` }}>
            <div style={{ width: 200, padding: '10px 16px', flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, fontFamily: FONT_MONO, letterSpacing: 1 }}>TIPE MISI</span>
            </div>
            {PLATFORMS.map((p, i) => (
              <div key={i} style={{ flex: 1, padding: '10px 8px', textAlign: 'center', borderLeft: `1px solid ${CARD_BORDER}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  {p.icon}
                </div>
              </div>
            ))}
          </div>

          {/* Data rows */}
          {MISSIONS.map((m, mi) => {
            const rowOp = interpolate(frame, [70 + mi * 8, 85 + mi * 8], [0, 1], CLAMP);
            return (
              <div key={mi} style={{
                display: 'flex', opacity: rowOp,
                borderBottom: mi < MISSIONS.length - 1 ? `1px solid ${CARD_BORDER}` : 'none',
                background: mi % 2 === 0 ? 'transparent' : '#FAFAF8',
              }}>
                <div style={{
                  width: 200, padding: '12px 16px', flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: m.color, fontFamily: FONT_MONO, letterSpacing: 1 }}>{m.type}</span>
                    <p style={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY, margin: '1px 0 0' }}>{m.label}</p>
                  </div>
                </div>
                {MATRIX[mi].map((active, pi) => (
                  <div key={pi} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderLeft: `1px solid ${CARD_BORDER}`,
                  }}>
                    {active ? (
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: `${PLATFORMS[pi].color}15`,
                        border: `2px solid ${PLATFORMS[pi].color}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <svg width="12" height="12" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke={PLATFORMS[pi].color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    ) : (
                      <div style={{
                        width: 16, height: 2, borderRadius: 1,
                        background: '#E0DDD6',
                      }} />
                    )}
                  </div>
                ))}
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
        <span style={{ fontSize: 13, fontFamily: FONT_MONO, color: '#C4C0B8', letterSpacing: 1 }}>05</span>
      </div>
    </AbsoluteFill>
  );
};

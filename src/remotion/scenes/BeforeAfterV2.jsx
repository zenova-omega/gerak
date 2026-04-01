import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

/* ── SINAR Brand Colors ── */
const PRIMARY = '#1B4332';
const PRIMARY_DARK = '#0B2619';
const PRIMARY_ACCENT = '#2D6A4F';
const GOLD = '#B8860B';
const BLACK = '#1A1814';
const WHITE = '#FFFFFF';
const TEXT_DIM = 'rgba(255,255,255,0.45)';
const TEXT_MID = 'rgba(255,255,255,0.65)';
const BORDER = 'rgba(255,255,255,0.08)';
const RED = '#EF4444';
const GREEN = '#22C55E';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const FONT = "'Inter', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";

/* Shared YouTube thumbnail */
function YTThumb({ badge }) {
  return (
    <div style={{ height: 120, background: `linear-gradient(135deg,${PRIMARY},${PRIMARY_ACCENT})`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <div style={{ width: 40, height: 28, borderRadius: 6, background: 'rgba(255,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 0, height: 0, borderStyle: 'solid', borderWidth: '6px 0 6px 10px', borderColor: 'transparent transparent transparent #fff', marginLeft: 1 }} />
      </div>
      {badge && (
        <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(239,68,68,0.9)', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10 }}>🔥</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: FONT_MONO }}>{badge}</span>
        </div>
      )}
    </div>
  );
}

/* Platform icon badge */
const PLATFORM_ICONS = [
  { name: 'YouTube', color: '#FF0000', icon: <svg width="12" height="12" viewBox="0 0 24 24"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.5 31.5 0 000 12a31.5 31.5 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31.5 31.5 0 0024 12a31.5 31.5 0 00-.5-5.8zM9.5 15.5v-7l6.3 3.5-6.3 3.5z" fill="#FF0000"/></svg> },
  { name: 'Instagram', color: '#E1306C', icon: <svg width="12" height="12" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" stroke="#E1306C" strokeWidth="2" fill="none"/><circle cx="12" cy="12" r="5" stroke="#E1306C" strokeWidth="2" fill="none"/></svg> },
  { name: 'TikTok', color: '#fff', icon: <svg width="12" height="12" viewBox="0 0 24 24"><path d="M16.6 5.8A4.3 4.3 0 0113 2h-3v14a3 3 0 11-2-2.8V8a7 7 0 102 6.9V9.5a4.3 4.3 0 006.6-3.7z" fill="#fff"/></svg> },
  { name: 'X', color: '#1D9BF0', icon: <svg width="12" height="12" viewBox="0 0 24 24"><path d="M18.2 2h3.5l-7.6 8.7L23 22h-7l-5-6.5L5.3 22H1.8l8.1-9.3L1.4 2h7.2l4.5 5.9L18.2 2z" fill="#1D9BF0"/></svg> },
  { name: 'Facebook', color: '#1877F2', icon: <svg width="12" height="12" viewBox="0 0 24 24"><path d="M24 12a12 12 0 10-13.9 11.8v-8.4H7v-3.4h3.1V9.4c0-3.1 1.8-4.8 4.6-4.8 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.4h-2.9v8.4A12 12 0 0024 12z" fill="#1877F2"/></svg> },
  { name: 'WhatsApp', color: '#25D366', icon: <svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 2a10 10 0 00-8.6 14.9L2 22l5.2-1.4A10 10 0 1012 2z" stroke="#25D366" strokeWidth="2" fill="none"/></svg> },
];

export const BeforeAfterV2 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = interpolate(frame, [0, 20], [0, 1], CLAMP);
  const titleOp = interpolate(frame, [5, 25], [0, 1], CLAMP);
  const titleY = interpolate(frame, [5, 25], [20, 0], CLAMP);
  const lineW = interpolate(frame, [20, 45], [0, 120], CLAMP);
  const beforeOp = interpolate(frame, [30, 50], [0, 1], CLAMP);
  const afterOp = interpolate(frame, [65, 85], [0, 1], CLAMP);
  const bottomOp = interpolate(frame, [100, 125], [0, 1], CLAMP);

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${PRIMARY_DARK}, ${BLACK})`, fontFamily: FONT }}>
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 48, left: 80, right: 80,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        opacity: headerOp, zIndex: 30,
      }}>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2 }}>STUDI KASUS</span>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2 }}>SINAR PLATFORM</span>
      </div>

      {/* Title */}
      <div style={{
        position: 'absolute', top: 95, left: 80, right: 80,
        opacity: titleOp, transform: `translateY(${titleY}px)`, zIndex: 20, textAlign: 'center',
      }}>
        <h2 style={{ fontSize: 48, fontWeight: 900, color: WHITE, margin: 0, lineHeight: 1.1 }}>
          Berita yang Sama,{' '}
          <span style={{
            background: `linear-gradient(90deg, ${PRIMARY_ACCENT}, ${GOLD})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Dampak yang Berbeda</span>
        </h2>
        <div style={{ width: lineW, height: 3, background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})`, borderRadius: 2, margin: '14px auto 0' }} />
      </div>

      {/* ── Two-column comparison ── */}
      <div style={{
        position: 'absolute', top: 195, bottom: 100, left: 100, right: 100,
        display: 'flex', gap: 32,
      }}>

        {/* LEFT — TANPA SINAR */}
        <div style={{
          flex: 1, opacity: beforeOp,
          transform: `translateX(${(1 - beforeOp) * -15}px)`,
          display: 'flex', flexDirection: 'column', gap: 16,
          padding: 24,
          background: 'rgba(239,68,68,0.02)',
          border: `1px solid rgba(239,68,68,0.08)`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: RED }} />
            <span style={{ fontSize: 15, fontWeight: 800, color: RED, letterSpacing: 2, fontFamily: FONT_MONO }}>TANPA SINAR</span>
          </div>

          {/* YT Card */}
          <div style={{ background: 'rgba(255,255,255,0.03)', overflow: 'hidden' }}>
            <YTThumb />
            <div style={{ padding: '10px 14px' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: WHITE, margin: 0 }}>KSAD Resmikan 200 Jembatan Garuda di Aceh Utara</p>
              <p style={{ fontSize: 12, color: TEXT_DIM, margin: '4px 0 0' }}>DISPENAD Official · 2 minggu lalu</p>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Views', val: '15.2K' },
              { label: 'Shares', val: '340' },
              { label: 'Comments', val: '89' },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', padding: '14px 0', background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}` }}>
                <p style={{ fontSize: 24, fontWeight: 900, color: TEXT_DIM, fontFamily: FONT_MONO, margin: 0 }}>{s.val}</p>
                <p style={{ fontSize: 11, color: TEXT_DIM, margin: '4px 0 0' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Verdict */}
          <div style={{ padding: '14px 16px', background: 'rgba(239,68,68,0.05)', borderLeft: `3px solid ${RED}` }}>
            <p style={{ fontSize: 15, color: TEXT_MID, margin: 0, lineHeight: 1.5 }}>
              Hanya <strong style={{ color: RED }}>0.004%</strong> populasi terjangkau.
            </p>
            <p style={{ fontSize: 13, color: TEXT_DIM, margin: '4px 0 0' }}>Upload manual, tenggelam di algoritma.</p>
          </div>
        </div>

        {/* RIGHT — DENGAN SINAR */}
        <div style={{
          flex: 1, opacity: afterOp,
          transform: `translateX(${(1 - afterOp) * 15}px)`,
          display: 'flex', flexDirection: 'column', gap: 16,
          padding: 24,
          background: 'rgba(34,197,94,0.02)',
          border: `1px solid rgba(34,197,94,0.08)`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: GREEN }} />
            <span style={{ fontSize: 15, fontWeight: 800, color: GREEN, letterSpacing: 2, fontFamily: FONT_MONO }}>DENGAN SINAR</span>
          </div>

          {/* YT Card — trending */}
          <div style={{ background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
            <YTThumb badge="TRENDING #1" />
            <div style={{ padding: '10px 14px' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: WHITE, margin: 0 }}>KSAD Resmikan 200 Jembatan Garuda di Aceh Utara</p>
              <p style={{ fontSize: 12, color: GREEN, margin: '4px 0 0', fontFamily: FONT_MONO, fontWeight: 700 }}>2.4M views · 3 hari</p>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Views', val: '2.4M', color: GREEN },
              { label: 'Shares', val: '340K', color: '#60A5FA' },
              { label: 'Comments', val: '89K', color: '#A78BFA' },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', padding: '14px 0', background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(34,197,94,0.08)` }}>
                <p style={{ fontSize: 24, fontWeight: 900, color: s.color, fontFamily: FONT_MONO, margin: 0 }}>{s.val}</p>
                <p style={{ fontSize: 11, color: TEXT_DIM, margin: '4px 0 0' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Platform icons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PLATFORM_ICONS.map((p, i) => {
              const pOp = interpolate(frame, [90 + i * 3, 100 + i * 3], [0, 1], CLAMP);
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 5, opacity: pOp,
                  padding: '5px 10px', background: `${p.color}10`, border: `1px solid ${p.color}15`,
                }}>
                  {p.icon}
                  <span style={{ fontSize: 11, fontWeight: 700, color: p.color, fontFamily: FONT_MONO }}>{p.name}</span>
                </div>
              );
            })}
          </div>

          {/* Verdict */}
          <div style={{ padding: '14px 16px', background: 'rgba(34,197,94,0.05)', borderLeft: `3px solid ${GREEN}` }}>
            <p style={{ fontSize: 15, color: TEXT_MID, margin: 0, lineHeight: 1.5 }}>
              Trending di <strong style={{ color: GREEN }}>6 platform</strong> dalam 3 hari.
            </p>
            <p style={{ fontSize: 13, color: TEXT_DIM, margin: '4px 0 0' }}>Terkoordinasi oleh 400K prajurit + KBT.</p>
          </div>
        </div>
      </div>

      {/* ── Bottom: 158x centered ── */}
      <div style={{
        position: 'absolute', bottom: 55, left: 80, right: 80,
        textAlign: 'center', opacity: bottomOp, zIndex: 20,
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 20 }}>
          <span style={{
            fontSize: 52, fontWeight: 900,
            background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            fontFamily: FONT_MONO,
          }}>158x</span>
          <span style={{ fontSize: 18, color: TEXT_MID, fontWeight: 500 }}>
            peningkatan jangkauan
          </span>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        position: 'absolute', bottom: 48, left: 80, right: 80,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        opacity: headerOp, zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: `linear-gradient(135deg, ${PRIMARY}, ${GOLD})` }} />
          <span style={{ fontSize: 13, fontFamily: FONT, color: TEXT_DIM, fontWeight: 500 }}>sinar.id</span>
        </div>
        <span style={{ fontSize: 13, fontFamily: FONT_MONO, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>03</span>
      </div>
    </AbsoluteFill>
  );
};

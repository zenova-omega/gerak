import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

/* ── SINAR Brand Colors ── */
const PRIMARY = '#1B4332';
const PRIMARY_ACCENT = '#2D6A4F';
const GOLD = '#B8860B';
const TEAL = '#0F766E';
const PATRIOT = '#8B1A1A';
const PURPLE = '#6D28D9';
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

const REWARDS = [
  { name: 'Kaos TNI AD', desc: 'Kaos official edisi terbatas', xp: 500, color: PRIMARY, icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6 2l-4 4v2h4v14h12V8h4V6l-4-4H6z" stroke={PRIMARY} strokeWidth="1.5" fill={`${PRIMARY}15`}/></svg> },
  { name: 'Topi Tactical', desc: 'Topi tactical SINAR edition', xp: 300, color: GOLD, icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 14c0-4.4 3.6-8 8-8s8 3.6 8 8H4z" stroke={GOLD} strokeWidth="1.5" fill={`${GOLD}15`}/><rect x="2" y="14" width="20" height="3" rx="1" stroke={GOLD} strokeWidth="1.5" fill={`${GOLD}10`}/></svg> },
  { name: 'Tumbler SINAR', desc: 'Tumbler stainless premium', xp: 400, color: TEAL, icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="7" y="3" width="10" height="18" rx="2" stroke={TEAL} strokeWidth="1.5" fill={`${TEAL}15`}/><rect x="6" y="3" width="12" height="4" rx="1" stroke={TEAL} strokeWidth="1.5" fill={`${TEAL}10`}/></svg> },
  { name: 'Jaket Exclusive', desc: 'Jaket bomber limited edition', xp: 1500, color: PATRIOT, icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6 3l-3 3v12a2 2 0 002 2h14a2 2 0 002-2V6l-3-3H6z" stroke={PATRIOT} strokeWidth="1.5" fill={`${PATRIOT}15`}/><line x1="12" y1="3" x2="12" y2="20" stroke={PATRIOT} strokeWidth="1" opacity="0.3"/></svg> },
  { name: 'Voucher Belanja', desc: 'Voucher Rp 100.000', xp: 800, color: PURPLE, icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="12" rx="2" stroke={PURPLE} strokeWidth="1.5" fill={`${PURPLE}15`}/><circle cx="12" cy="12" r="3" stroke={PURPLE} strokeWidth="1.5" fill="none"/></svg> },
  { name: 'Power Bank', desc: 'Power bank 10.000mAh branded', xp: 600, color: PRIMARY_ACCENT, icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="6" y="4" width="12" height="16" rx="2" stroke={PRIMARY_ACCENT} strokeWidth="1.5" fill={`${PRIMARY_ACCENT}15`}/><rect x="10" y="2" width="4" height="2" rx="1" fill={PRIMARY_ACCENT} opacity="0.5"/><path d="M10 10l2-2v4l2-2" stroke={PRIMARY_ACCENT} strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg> },
];

export const TokoPoinV2 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelOp = interpolate(frame, [0, 15], [0, 1], CLAMP);
  const titleOp = interpolate(frame, [5, 25], [0, 1], CLAMP);
  const titleY = interpolate(frame, [5, 25], [20, 0], CLAMP);
  const lineW = interpolate(frame, [15, 40], [0, 80], CLAMP);
  const phoneOp = interpolate(frame, [30, 55], [0, 1], CLAMP);
  const phoneY = interpolate(frame, [30, 55], [25, 0], CLAMP);

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: FONT }}>
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 48, left: 80, right: 80,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        opacity: labelOp,
      }}>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_MUTED, letterSpacing: 2 }}>REWARD SHOP</span>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_MUTED, letterSpacing: 2 }}>SINAR PLATFORM</span>
      </div>

      {/* Split: left content, right phone mockup */}
      <div style={{
        position: 'absolute', top: 90, bottom: 80, left: 80, right: 80,
        display: 'flex', gap: 48, alignItems: 'center',
      }}>
        {/* LEFT — Reward cards */}
        <div style={{ flex: '1 1 58%', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Title */}
          <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, marginBottom: 4 }}>
            <div style={{
              display: 'inline-block', padding: '4px 12px', marginBottom: 10,
              background: `${GOLD}12`, border: `1px solid ${GOLD}25`,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: GOLD, letterSpacing: 2, fontFamily: FONT_MONO }}>REWARD SHOP</span>
            </div>
            <h2 style={{ fontSize: 48, fontWeight: 900, color: BLACK, margin: 0, lineHeight: 1.15 }}>
              Tukar XP,{' '}
              <span style={{
                background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>Dapat Reward</span>
            </h2>
            <p style={{ fontSize: 16, color: TEXT_MUTED, margin: '8px 0 0' }}>
              Reward nyata untuk memotivasi partisipasi aktif prajurit
            </p>
          </div>

          {/* Gradient line */}
          <div style={{ width: lineW, height: 3, background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})`, borderRadius: 2 }} />

          {/* Reward cards — 2x3 grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {REWARDS.map((r, i) => {
              const appear = spring({ frame: frame - 30 - i * 6, fps, config: { damping: 22, mass: 0.7 } });
              return (
                <div key={i} style={{
                  padding: '18px 16px',
                  background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
                  borderTop: `3px solid ${r.color}`,
                  opacity: appear, transform: `translateY(${(1 - appear) * 20}px)`,
                  display: 'flex', flexDirection: 'column', gap: 10,
                  position: 'relative',
                }}>
                  {/* Icon */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: `${r.color}08`, border: `1px solid ${r.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {r.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: TEXT_PRIMARY, margin: 0 }}>{r.name}</p>
                    <p style={{ fontSize: 12, color: TEXT_MUTED, margin: '3px 0 0' }}>{r.desc}</p>
                  </div>
                  <div style={{
                    padding: '4px 10px', background: `${r.color}08`, border: `1px solid ${r.color}20`,
                    alignSelf: 'flex-start',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: r.color, fontFamily: FONT_MONO }}>{r.xp} XP</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT — Phone mockup showing reward shop */}
        <div style={{
          flex: '0 0 35%', display: 'flex', flexDirection: 'column', alignItems: 'center',
          opacity: phoneOp, transform: `translateY(${phoneY}px)`,
        }}>
          <div style={{
            width: 260, borderRadius: 28, overflow: 'hidden',
            border: `2px solid ${CARD_BORDER}`,
            boxShadow: '0 12px 60px rgba(0,0,0,0.08)',
            background: '#FAFAF8',
          }}>
            {/* Status bar */}
            <div style={{ padding: '6px 16px', display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${CARD_BORDER}` }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: TEXT_PRIMARY }}>09:41</span>
              <span style={{ fontSize: 10, color: TEXT_MUTED }}>SINAR Shop</span>
            </div>
            {/* Balance */}
            <div style={{ padding: '12px 16px', background: `${GOLD}08`, borderBottom: `1px solid ${CARD_BORDER}` }}>
              <p style={{ fontSize: 10, color: TEXT_MUTED, margin: 0 }}>Saldo XP Anda</p>
              <p style={{ fontSize: 24, fontWeight: 900, color: GOLD, fontFamily: FONT_MONO, margin: '2px 0 0' }}>4,200 XP</p>
            </div>
            {/* Shop items */}
            <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {REWARDS.slice(0, 4).map((r, i) => {
                const iOp = interpolate(frame, [50 + i * 8, 65 + i * 8], [0, 1], CLAMP);
                return (
                  <div key={i} style={{
                    padding: '8px 10px', background: CARD_BG,
                    border: `1px solid ${CARD_BORDER}`,
                    display: 'flex', alignItems: 'center', gap: 10,
                    opacity: iOp,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: `${r.color}10`, border: `1px solid ${r.color}20`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {r.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: TEXT_PRIMARY, margin: 0 }}>{r.name}</p>
                      <p style={{ fontSize: 10, color: r.color, fontFamily: FONT_MONO, fontWeight: 700, margin: '1px 0 0' }}>{r.xp} XP</p>
                    </div>
                    <div style={{ padding: '4px 10px', background: r.color }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', fontFamily: FONT_MONO }}>TUKAR</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Home indicator */}
            <div style={{ padding: '8px 0', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 80, height: 3, borderRadius: 2, background: CARD_BORDER }} />
            </div>
          </div>
          <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 600, fontFamily: FONT_MONO, letterSpacing: 1, marginTop: 12 }}>MOBILE APP</span>
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
        <span style={{ fontSize: 13, fontFamily: FONT_MONO, color: '#C4C0B8', letterSpacing: 1 }}>11</span>
      </div>
    </AbsoluteFill>
  );
};

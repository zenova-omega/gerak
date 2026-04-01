import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

/* ── SINAR Brand Colors ── */
const PRIMARY = '#1B4332';
const PRIMARY_DARK = '#0B2619';
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
const TEXT_MUTED = '#6B6555';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const FONT = "'Inter', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";

const RANKS = [
  { name: 'Prajurit', xp: 0, color: PRIMARY },
  { name: 'Kopral', xp: 1000, color: PRIMARY_ACCENT },
  { name: 'Sersan', xp: 5000, color: GOLD },
  { name: 'Letnan', xp: 15000, color: PURPLE },
  { name: 'Kapten', xp: 50000, color: PATRIOT },
];

/* Badges — matching the mobile app BADGES data */
const BADGES_DISPLAY = [
  { name: 'Misi Pertama', icon: '🚀', color: TEAL, rarity: 'common', unlocked: true },
  { name: '10 Misi', icon: '🎖️', color: ORANGE, rarity: 'rare', unlocked: true },
  { name: 'Misi Kilat', icon: '⚡', color: '#EC4899', rarity: 'rare', unlocked: true },
  { name: 'Streak 7', icon: '🔥', color: ORANGE, rarity: 'common', unlocked: true },
  { name: 'Siaga Bencana', icon: '🔴', color: PATRIOT, rarity: 'epic', unlocked: true },
  { name: 'Field Agent', icon: '📍', color: '#EC4899', rarity: 'epic', unlocked: true },
  { name: 'Amplifier', icon: '📢', color: ORANGE, rarity: 'rare', unlocked: true },
  { name: 'IG Star', icon: '📸', color: '#E1306C', rarity: 'rare', unlocked: true },
  { name: 'Naik Pangkat', icon: '📈', color: PURPLE, rarity: 'common', unlocked: true },
  { name: '50 Misi', icon: '🏆', color: PRIMARY, rarity: 'legendary', unlocked: false },
  { name: 'Viral King', icon: '👑', color: '#EC4899', rarity: 'legendary', unlocked: false },
  { name: 'Benteng NKRI', icon: '🛡️', color: PRIMARY, rarity: 'legendary', unlocked: false },
];

/* Hexagonal badge component matching mobile app's BadgeShape */
function HexBadge({ badge, size = 52, frame, startFrame }) {
  const s = spring({ frame: frame - startFrame, fps: 30, config: { damping: 20 } });
  const col = badge.unlocked ? badge.color : '#94A3B8';
  const hr = 18, hx = 32, hy = 28;
  const hex = Array.from({ length: 6 }, (_, i) => {
    const a = Math.PI / 3 * i - Math.PI / 6;
    return `${hx + hr * Math.cos(a)},${hy + hr * Math.sin(a)}`;
  }).join(' ');

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      transform: `scale(${s})`, opacity: s,
    }}>
      <div style={{ position: 'relative', width: size, height: size * 0.88 }}>
        {/* Glow */}
        {badge.unlocked && badge.rarity !== 'common' && (
          <div style={{
            position: 'absolute', inset: -4, borderRadius: '50%',
            background: `radial-gradient(circle, ${col}30, transparent 65%)`,
            filter: 'blur(6px)',
          }} />
        )}
        <svg width={size} height={size * 0.88} viewBox="0 0 64 56" fill="none" style={{ position: 'relative', zIndex: 1 }}>
          {/* Mini wings */}
          <g opacity={badge.unlocked ? 0.6 : 0.2}>
            <path d="M16 24 L6 19 L4 24 L9 28 L5 31 L11 34 L16 33 Z" fill={col} opacity="0.6" />
            <path d="M48 24 L58 19 L60 24 L55 28 L59 31 L53 34 L48 33 Z" fill={col} opacity="0.6" />
          </g>
          {/* Hex body */}
          <polygon points={hex} fill={col} opacity={badge.unlocked ? 0.85 : 0.2} />
          <polygon points={hex} fill="white" opacity={badge.unlocked ? 0.1 : 0} />
          <polygon points={hex} fill="none" stroke="white" strokeWidth="0.5" opacity={badge.unlocked ? 0.25 : 0.08} />
        </svg>
        {/* Icon */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2, paddingBottom: 2,
        }}>
          <span style={{
            fontSize: size * 0.3,
            filter: badge.unlocked ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' : 'grayscale(1)',
            opacity: badge.unlocked ? 1 : 0.3,
          }}>
            {badge.unlocked ? badge.icon : '🔒'}
          </span>
        </div>
      </div>
      <span style={{
        fontSize: 9, fontWeight: 600, textAlign: 'center', maxWidth: 60,
        color: badge.unlocked ? TEXT_PRIMARY : '#94A3B8',
      }}>
        {badge.name}
      </span>
    </div>
  );
}

export const GamifikasiRewardV2 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelOp = interpolate(frame, [0, 15], [0, 1], CLAMP);
  const titleOp = interpolate(frame, [5, 25], [0, 1], CLAMP);
  const titleY = interpolate(frame, [5, 25], [20, 0], CLAMP);
  const lineW = interpolate(frame, [15, 40], [0, 80], CLAMP);
  const phoneOp = interpolate(frame, [25, 50], [0, 1], CLAMP);
  const phoneY = interpolate(frame, [25, 50], [25, 0], CLAMP);

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: FONT }}>
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 48, left: 80, right: 80,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        opacity: labelOp,
      }}>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_MUTED, letterSpacing: 2 }}>GAMIFIKASI</span>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_MUTED, letterSpacing: 2 }}>SINAR PLATFORM</span>
      </div>

      {/* Split: left content, right phone */}
      <div style={{
        position: 'absolute', top: 90, bottom: 80, left: 80, right: 80,
        display: 'flex', gap: 48, alignItems: 'center',
      }}>
        {/* LEFT — Gamification content */}
        <div style={{ flex: '1 1 58%', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Title */}
          <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, marginBottom: 4 }}>
            <h2 style={{ fontSize: 48, fontWeight: 900, color: BLACK, margin: 0, lineHeight: 1.15 }}>
              Gamifikasi &amp;{' '}
              <span style={{
                background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>Ranking</span>
            </h2>
            <p style={{ fontSize: 16, color: TEXT_MUTED, margin: '8px 0 0' }}>
              Sistem pangkat dan pencapaian yang memotivasi partisipasi aktif
            </p>
          </div>

          {/* Gradient line */}
          <div style={{ width: lineW, height: 3, background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})`, borderRadius: 2 }} />

          {/* Rank cards */}
          <div style={{ display: 'flex', gap: 10 }}>
            {RANKS.map((rank, i) => {
              const s = spring({ frame: frame - 8 - i * 6, fps, config: { damping: 22, mass: 0.7 } });
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', flex: 1,
                  background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
                  borderLeft: `4px solid ${rank.color}`,
                  opacity: s, transform: `translateX(${(1 - s) * 20}px)`,
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', background: rank.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', fontFamily: FONT_MONO }}>{i + 1}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY, margin: 0 }}>{rank.name}</p>
                    <p style={{ fontSize: 11, color: TEXT_MUTED, margin: '2px 0 0', fontFamily: FONT_MONO }}>{rank.xp.toLocaleString()} XP</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* XP Progress bar */}
          {(() => {
            const fillProgress = interpolate(frame, [30, 120], [0, 1], CLAMP);
            const barAppear = spring({ frame: frame - 25, fps, config: { damping: 20 } });
            const currentXP = Math.floor(fillProgress * 50000);
            return (
              <div style={{
                opacity: barAppear, transform: `translateY(${(1 - barAppear) * 15}px)`,
                padding: '16px 20px', background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: TEXT_MUTED, fontWeight: 600 }}>Progress XP</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY, fontFamily: FONT_MONO }}>
                    {currentXP.toLocaleString()} / 50,000 XP
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: '#E8E4DD', overflow: 'hidden' }}>
                  <div style={{ width: `${fillProgress * 100}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})` }} />
                </div>
              </div>
            );
          })()}

          {/* Lencana / Badges — hexagonal matching mobile app */}
          <div style={{
            padding: '16px 20px', background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: TEXT_PRIMARY }}>Lencana</span>
              <span style={{ fontSize: 11, color: TEXT_MUTED, fontFamily: FONT_MONO }}>
                {BADGES_DISPLAY.filter(b => b.unlocked).length}/{BADGES_DISPLAY.length}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {BADGES_DISPLAY.map((badge, i) => (
                <HexBadge key={i} badge={badge} size={48} frame={frame} startFrame={25 + i * 2} />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — Phone mockup showing gamification */}
        <div style={{
          flex: '0 0 35%', display: 'flex', flexDirection: 'column', alignItems: 'center',
          opacity: phoneOp, transform: `translateY(${phoneY}px)`,
        }}>
          <div style={{
            width: 260, borderRadius: 28, overflow: 'hidden',
            border: `2px solid ${CARD_BORDER}`,
            boxShadow: '0 12px 60px rgba(0,0,0,0.08)',
            background: PRIMARY_DARK,
          }}>
            {/* Status bar */}
            <div style={{ padding: '6px 16px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#fff' }}>09:41</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Profil</span>
            </div>
            {/* Profile header */}
            <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: PRIMARY,
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px',
              }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>AS</span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>Sersan Ahmad S.</p>
              <p style={{ fontSize: 11, color: GOLD, fontFamily: FONT_MONO, fontWeight: 700, margin: '4px 0 0' }}>Rank: Sersan</p>
            </div>
            {/* XP bar */}
            <div style={{ padding: '10px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>XP Progress</span>
                <span style={{ fontSize: 9, color: GOLD, fontFamily: FONT_MONO }}>12,400 / 15,000</span>
              </div>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: '83%', height: '100%', background: `linear-gradient(90deg, ${PRIMARY_ACCENT}, ${GOLD})`, borderRadius: 3 }} />
              </div>
            </div>
            {/* Badges */}
            <div style={{ padding: '8px 16px' }}>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: FONT_MONO, letterSpacing: 1, marginBottom: 6 }}>LENCANA</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[PRIMARY, GOLD, TEAL, ORANGE, PURPLE].map((c, i) => {
                  const bOp = interpolate(frame, [60 + i * 6, 75 + i * 6], [0, 1], CLAMP);
                  return (
                    <div key={i} style={{
                      width: 30, height: 30, borderRadius: '50%', opacity: bOp,
                      background: `${c}20`, border: `1.5px solid ${c}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Stats */}
            <div style={{ padding: '8px 16px', display: 'flex', gap: 8 }}>
              {[
                { label: 'Misi', val: '47', color: PRIMARY_ACCENT },
                { label: 'Streak', val: '12', color: ORANGE },
                { label: 'Rank', val: '#24', color: GOLD },
              ].map((s, i) => (
                <div key={i} style={{
                  flex: 1, padding: '8px 6px', textAlign: 'center',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6,
                }}>
                  <p style={{ fontSize: 16, fontWeight: 900, color: s.color, fontFamily: FONT_MONO, margin: 0 }}>{s.val}</p>
                  <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>{s.label}</p>
                </div>
              ))}
            </div>
            {/* Home indicator */}
            <div style={{ padding: '10px 0', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 80, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
            </div>
          </div>
          <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 600, fontFamily: FONT_MONO, letterSpacing: 1, marginTop: 12 }}>PROFIL PRAJURIT</span>
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
        <span style={{ fontSize: 13, fontFamily: FONT_MONO, color: '#C4C0B8', letterSpacing: 1 }}>10</span>
      </div>
    </AbsoluteFill>
  );
};

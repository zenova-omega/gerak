import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

const BG = '#F5F3EE';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#DDD9D0';
const TEXT_PRIMARY = '#1A1814';
const TEXT_SECONDARY = '#3D3929';
const TEXT_MUTED = '#6B6555';
const FONT = "'Inter', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };

const RANKS = [
  { name: 'Prajurit', xp: 0, color: '#1B4332' },
  { name: 'Kopral', xp: 1000, color: '#2D6A4F' },
  { name: 'Sersan', xp: 5000, color: '#B8860B' },
  { name: 'Letnan', xp: 15000, color: '#6D28D9' },
  { name: 'Kapten', xp: 50000, color: '#8B1A1A' },
];

const ACHIEVEMENTS = [
  { label: 'First Mission', color: '#1B4332' },
  { label: 'Speed Runner', color: '#B8860B' },
  { label: 'Content Creator', color: '#0F766E' },
  { label: 'Streak Master', color: '#C2410C' },
  { label: 'Team Player', color: '#6D28D9' },
  { label: 'Legend', color: '#8B1A1A' },
];

const REWARDS = [
  { name: 'Kaos TNI AD', xp: 500, color: '#1B4332' },
  { name: 'Topi Tactical', xp: 300, color: '#B8860B' },
  { name: 'Tumbler SINAR', xp: 400, color: '#0F766E' },
  { name: 'Jaket Exclusive', xp: 1500, color: '#8B1A1A' },
];

/* ── Rank Card ── */
function RankCard({ rank, index, frame, fps }) {
  const delay = 8 + index * 6;
  const s = spring({ frame: frame - delay, fps, config: { damping: 22, mass: 0.7 } });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 18px',
      background: CARD_BG,
      border: `1px solid ${CARD_BORDER}`,
      borderLeft: `4px solid ${rank.color}`,
      borderRadius: 6,
      opacity: s,
      transform: `translateX(${(1 - s) * 20}px)`,
      flex: 1,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%', background: rank.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', fontFamily: FONT_MONO }}>{index + 1}</span>
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: TEXT_PRIMARY, margin: 0 }}>{rank.name}</p>
        <p style={{ fontSize: 12, fontWeight: 600, color: TEXT_MUTED, margin: '2px 0 0', fontFamily: FONT_MONO }}>
          {rank.xp.toLocaleString()} XP
        </p>
      </div>
      {index < RANKS.length - 1 && (
        <svg width="16" height="12" viewBox="0 0 16 12" style={{ flexShrink: 0 }}>
          <path d="M0 6 L10 6 M8 2 L12 6 L8 10" stroke={CARD_BORDER} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      )}
    </div>
  );
}

/* ── XP Progress Bar ── */
function XPBar({ frame, fps }) {
  const fillProgress = interpolate(frame, [30, 120], [0, 1], CLAMP);
  const barAppear = spring({ frame: frame - 25, fps, config: { damping: 20 } });
  const currentXP = Math.floor(fillProgress * 50000);

  return (
    <div style={{
      width: '100%',
      opacity: barAppear, transform: `translateY(${(1 - barAppear) * 15}px)`,
      padding: '16px 20px',
      background: CARD_BG,
      border: `1px solid ${CARD_BORDER}`,
      borderRadius: 6,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: TEXT_MUTED, fontWeight: 600 }}>Progress XP</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY, fontFamily: FONT_MONO }}>
          {currentXP.toLocaleString()} / 50,000 XP
        </span>
      </div>
      <div style={{ width: '100%', height: 8, borderRadius: 4, background: '#E8E4DD', overflow: 'hidden' }}>
        <div style={{
          width: `${fillProgress * 100}%`, height: '100%', borderRadius: 4,
          background: 'linear-gradient(90deg, #1B4332, #B8860B)',
        }} />
      </div>
    </div>
  );
}

/* ── Achievement Badge ── */
function AchievementBadge({ achievement, index, frame, fps }) {
  const delay = 20 + index * 3;
  const s = spring({ frame: frame - delay, fps, config: { damping: 20 } });
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      transform: `scale(${s})`, opacity: s,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: '50%',
        background: `${achievement.color}15`,
        border: `2px solid ${achievement.color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: achievement.color }} />
      </div>
      <span style={{
        fontSize: 11, color: TEXT_MUTED, fontWeight: 600, textAlign: 'center', maxWidth: 80,
      }}>
        {achievement.label}
      </span>
    </div>
  );
}

/* ── Reward Card ── */
function RewardCard({ reward, index, frame, fps }) {
  const delay = index * 6;
  const s = spring({ frame: frame - delay, fps, config: { damping: 22, mass: 0.7 } });

  return (
    <div style={{
      flex: 1, borderRadius: 6,
      background: CARD_BG,
      border: `1px solid ${CARD_BORDER}`,
      padding: '24px 20px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
      transform: `translateY(${(1 - s) * 30}px)`,
      opacity: s,
    }}>
      {/* Color indicator */}
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: `${reward.color}12`,
        border: `2px solid ${reward.color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ width: 16, height: 16, borderRadius: '50%', background: reward.color }} />
      </div>
      <span style={{ fontSize: 16, fontWeight: 700, color: TEXT_PRIMARY, textAlign: 'center' }}>
        {reward.name}
      </span>
      <div style={{
        padding: '4px 14px', borderRadius: 4,
        background: `${reward.color}10`,
        border: `1px solid ${reward.color}25`,
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: reward.color, fontFamily: FONT_MONO }}>
          {reward.xp.toLocaleString()} XP
        </span>
      </div>
      <div style={{
        padding: '8px 24px', borderRadius: 4,
        background: reward.color,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: 1 }}>
          TUKAR
        </span>
      </div>
    </div>
  );
}

/* ── Main Composition ── */
export const GamifikasiReward = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phase1Opacity = interpolate(frame, [140, 155], [1, 0], CLAMP);
  const phase1Y = interpolate(frame, [140, 155], [0, -40], CLAMP);
  const phase2Opacity = interpolate(frame, [150, 170], [0, 1], CLAMP);
  const phase2Y = interpolate(frame, [150, 170], [30, 0], CLAMP);

  const titleAppear = spring({ frame, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: FONT }}>
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 48,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 80px',
        borderBottom: `1px solid ${CARD_BORDER}`,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, letterSpacing: 2, fontFamily: FONT_MONO }}>
          GAMIFIKASI
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, letterSpacing: 2, fontFamily: FONT_MONO }}>
          SINAR PLATFORM
        </span>
      </div>

      {/* Phase 1: Gamifikasi */}
      {frame < 170 && (
        <div style={{
          position: 'absolute', top: 48, bottom: 48, left: 80, right: 80,
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20,
          opacity: phase1Opacity,
          transform: `translateY(${phase1Y}px)`,
        }}>
          {/* Title */}
          <div style={{ opacity: titleAppear, transform: `translateY(${(1 - titleAppear) * 15}px)`, marginBottom: 4 }}>
            <h2 style={{ fontSize: 38, fontWeight: 800, color: TEXT_PRIMARY, margin: 0 }}>
              Gamifikasi &amp; Ranking
            </h2>
            <p style={{ fontSize: 16, color: TEXT_MUTED, margin: '6px 0 0', fontWeight: 500 }}>
              Sistem pangkat dan pencapaian yang memotivasi partisipasi aktif
            </p>
          </div>

          {/* Rank cards row */}
          <div style={{ display: 'flex', gap: 10 }}>
            {RANKS.map((rank, i) => (
              <RankCard key={rank.name} rank={rank} index={i} frame={frame} fps={fps} />
            ))}
          </div>

          {/* XP bar */}
          <XPBar frame={frame} fps={fps} />

          {/* Achievement badges */}
          <div style={{
            display: 'flex', gap: 24, justifyContent: 'center',
            padding: '16px 20px',
            background: CARD_BG,
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: 6,
          }}>
            {ACHIEVEMENTS.map((ach, i) => (
              <AchievementBadge key={ach.label} achievement={ach} index={i} frame={frame} fps={fps} />
            ))}
          </div>
        </div>
      )}

      {/* Phase 2: Reward Shop */}
      {frame >= 140 && (
        <div style={{
          position: 'absolute', top: 48, bottom: 48, left: 80, right: 80,
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24,
          opacity: phase2Opacity,
          transform: `translateY(${phase2Y}px)`,
        }}>
          {/* Title */}
          <div>
            <div style={{
              display: 'inline-block', padding: '4px 12px', borderRadius: 4, marginBottom: 10,
              background: '#B8860B12', border: '1px solid #B8860B25',
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#B8860B', letterSpacing: 2, fontFamily: FONT_MONO }}>
                REWARD SHOP
              </span>
            </div>
            <h2 style={{ fontSize: 38, fontWeight: 800, color: TEXT_PRIMARY, margin: 0 }}>
              Toko Poin
            </h2>
            <p style={{ fontSize: 16, color: TEXT_MUTED, margin: '6px 0 0', fontWeight: 500 }}>
              Tukar XP dengan reward nyata untuk memotivasi prajurit
            </p>
          </div>

          {/* Reward cards */}
          <div style={{ display: 'flex', gap: 20 }}>
            {REWARDS.map((reward, i) => (
              <RewardCard key={reward.name} reward={reward} index={i} frame={frame - 155} fps={fps} />
            ))}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 48,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 80px',
        borderTop: `1px solid ${CARD_BORDER}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(90deg, #1B4332, #B8860B)' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_MUTED, fontFamily: FONT_MONO }}>sinar.id</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_MUTED, fontFamily: FONT_MONO }}>05</span>
      </div>
    </AbsoluteFill>
  );
};

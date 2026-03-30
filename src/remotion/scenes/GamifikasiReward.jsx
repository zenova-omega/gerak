import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';

const GOLD = '#D4A843';
const DARK = '#050E09';
const GREEN = '#14532D';
const RED = '#8B1A1A';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };

const RANKS = [
  { name: 'Prajurit', xp: 0, color: '#14532D', bg: 'linear-gradient(135deg, #14532D, #1A6B3C)' },
  { name: 'Kopral', xp: 1000, color: '#22C55E', bg: 'linear-gradient(135deg, #22C55E, #16A34A)' },
  { name: 'Sersan', xp: 5000, color: GOLD, bg: `linear-gradient(135deg, ${GOLD}, #B8922E)` },
  { name: 'Letnan', xp: 15000, color: '#A855F7', bg: 'linear-gradient(135deg, #A855F7, #7C3AED)' },
  { name: 'Kapten', xp: 50000, color: RED, bg: `linear-gradient(135deg, ${RED}, #C02020)`, legendary: true },
];

const ACHIEVEMENTS = [
  { emoji: '🏅', label: 'First Mission' },
  { emoji: '⚡', label: 'Speed Runner' },
  { emoji: '📸', label: 'Content Creator' },
  { emoji: '🔥', label: 'Streak Master' },
  { emoji: '👥', label: 'Team Player' },
  { emoji: '⭐', label: 'Legend' },
];

const REWARDS = [
  { emoji: '👕', name: 'Kaos TNI AD', xp: 500, tagColor: GREEN },
  { emoji: '🧢', name: 'Topi Tactical', xp: 300, tagColor: GOLD },
  { emoji: '🥤', name: 'Tumbler SINAR', xp: 400, tagColor: '#0D9488' },
  { emoji: '🧥', name: 'Jaket Exclusive', xp: 1500, tagColor: RED, legendary: true },
];

/* ── Hexagonal Badge ── */
function HexBadge({ rank, index, frame, fps }) {
  const delay = index * 8;
  const s = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 120 } });
  const size = 100;
  const points = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    return `${50 + 50 * Math.cos(angle)}% ${50 + 50 * Math.sin(angle)}%`;
  }).join(', ');

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      transform: `scale(${s}) translateY(${(1 - s) * 30}px)`,
      opacity: s,
    }}>
      <div style={{
        width: size, height: size,
        clipPath: `polygon(${points})`,
        background: rank.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
        boxShadow: rank.legendary ? `0 0 30px ${rank.color}` : 'none',
      }}>
        {rank.legendary && (
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)`,
            animation: 'pulse 2s ease-in-out infinite',
          }} />
        )}
        <span style={{
          fontSize: 16, fontWeight: 900, color: '#fff',
          fontFamily: "'Inter', sans-serif", textAlign: 'center',
          textShadow: '0 1px 4px rgba(0,0,0,0.5)',
          lineHeight: 1.1,
        }}>
          {rank.name}
        </span>
      </div>
      <span style={{
        fontSize: 14, fontWeight: 700, color: rank.color,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {rank.xp.toLocaleString()} XP
      </span>
    </div>
  );
}

/* ── Arrow between ranks ── */
function RankArrow({ index, frame, fps }) {
  const delay = index * 8 + 4;
  const s = spring({ frame: frame - delay, fps, config: { damping: 14 } });
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: s, transform: `scaleX(${s})`,
      width: 36,
    }}>
      <svg width="30" height="16" viewBox="0 0 30 16">
        <path d="M0 8 L22 8 M18 2 L26 8 L18 14" stroke={GOLD} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/* ── XP Progress Bar ── */
function XPBar({ frame, fps }) {
  const fillProgress = interpolate(frame, [60, 260], [0, 1], CLAMP);
  const barAppear = spring({ frame: frame - 50, fps, config: { damping: 14 } });
  const currentXP = Math.floor(fillProgress * 50000);

  return (
    <div style={{
      width: '80%', maxWidth: 700,
      opacity: barAppear, transform: `translateY(${(1 - barAppear) * 20}px)`,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 6,
      }}>
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', fontFamily: "'Inter', sans-serif" }}>
          Progress XP
        </span>
        <span style={{
          fontSize: 15, fontWeight: 700, color: GOLD,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {currentXP.toLocaleString()} / 50,000 XP
        </span>
      </div>
      <div style={{
        width: '100%', height: 10, borderRadius: 5,
        background: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${fillProgress * 100}%`, height: '100%',
          borderRadius: 5,
          background: `linear-gradient(90deg, ${GREEN}, #22C55E, ${GOLD})`,
          boxShadow: `0 0 12px ${GOLD}55`,
          transition: 'width 0.1s',
        }} />
      </div>
    </div>
  );
}

/* ── Achievement Badge ── */
function AchievementBadge({ achievement, index, frame, fps }) {
  const delay = 40 + index * 6;
  const s = spring({ frame: frame - delay, fps, config: { damping: 12 } });
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      transform: `scale(${s})`, opacity: s,
    }}>
      <div style={{
        width: 50, height: 50, borderRadius: '50%',
        background: 'rgba(255,255,255,0.06)',
        border: '1.5px solid rgba(255,255,255,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22,
      }}>
        {achievement.emoji}
      </div>
      <span style={{
        fontSize: 11, color: 'rgba(255,255,255,0.5)',
        fontFamily: "'Inter', sans-serif", fontWeight: 600,
        textAlign: 'center', maxWidth: 80,
      }}>
        {achievement.label}
      </span>
    </div>
  );
}

/* ── Reward Card ── */
function RewardCard({ reward, index, frame, fps }) {
  const delay = index * 10;
  const s = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 100 } });

  const shine = reward.legendary
    ? interpolate(frame, [delay + 20, delay + 80], [-100, 260], CLAMP)
    : 0;

  return (
    <div style={{
      width: 200, borderRadius: 16,
      background: 'rgba(255,255,255,0.04)',
      border: `1.5px solid ${reward.legendary ? `${RED}88` : 'rgba(255,255,255,0.08)'}`,
      padding: '24px 16px 20px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      transform: `scale(${s}) translateY(${(1 - s) * 40}px)`,
      opacity: s,
      position: 'relative',
      overflow: 'hidden',
      boxShadow: reward.legendary ? `0 0 30px ${RED}33` : '0 4px 20px rgba(0,0,0,0.3)',
    }}>
      {reward.legendary && (
        <div style={{
          position: 'absolute', top: 0, left: shine, width: 40, height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
          transform: 'skewX(-15deg)',
          pointerEvents: 'none',
        }} />
      )}
      <span style={{ fontSize: 48 }}>{reward.emoji}</span>
      <span style={{
        fontSize: 16, fontWeight: 800, color: '#fff',
        fontFamily: "'Inter', sans-serif", textAlign: 'center',
      }}>
        {reward.name}
      </span>
      <div style={{
        padding: '4px 14px', borderRadius: 20,
        background: reward.tagColor,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <span style={{
          fontSize: 18, fontWeight: 800, color: '#fff',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {reward.xp.toLocaleString()} XP
        </span>
      </div>
      <div style={{
        marginTop: 4, padding: '6px 24px', borderRadius: 8,
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.15)',
        cursor: 'pointer',
      }}>
        <span style={{
          fontSize: 14, fontWeight: 700, color: '#fff',
          fontFamily: "'Inter', sans-serif", letterSpacing: '0.05em',
        }}>
          Tukar
        </span>
      </div>
    </div>
  );
}

/* ── Main Composition ── */
export const GamifikasiReward = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase transitions
  const phase1Opacity = interpolate(frame, [280, 310], [1, 0], CLAMP);
  const phase1Y = interpolate(frame, [280, 310], [0, -60], CLAMP);
  const phase2Opacity = interpolate(frame, [300, 340], [0, 1], CLAMP);
  const phase2Y = interpolate(frame, [300, 340], [40, 0], CLAMP);

  // Title animation
  const titleAppear = spring({ frame, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 30%, #0A1F10 0%, ${DARK} 70%)`,
      fontFamily: "'Inter', sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', overflow: 'hidden',
    }}>
      {/* Subtle grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />

      {/* ═══ Phase 1: Gamifikasi ═══ */}
      {frame < 340 && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 28,
          opacity: phase1Opacity,
          transform: `translateY(${phase1Y}px)`,
        }}>
          {/* Section label */}
          <div style={{
            opacity: titleAppear, transform: `translateY(${(1 - titleAppear) * -20}px)`,
          }}>
            <span style={{
              fontSize: 16, fontWeight: 800, letterSpacing: '0.2em',
              color: GOLD, textTransform: 'uppercase',
              padding: '4px 16px', borderRadius: 4,
              background: `${GOLD}15`, border: `1px solid ${GOLD}30`,
            }}>
              INSENTIF NYATA
            </span>
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: 48, fontWeight: 900, color: '#fff', margin: 0,
            opacity: titleAppear, transform: `scale(${0.8 + 0.2 * titleAppear})`,
            textShadow: `0 0 40px ${GREEN}40`,
          }}>
            Gamifikasi &amp; Reward
          </h1>

          {/* Rank badges row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 0, marginTop: 8,
          }}>
            {RANKS.map((rank, i) => (
              <React.Fragment key={rank.name}>
                <HexBadge rank={rank} index={i} frame={frame} fps={fps} />
                {i < RANKS.length - 1 && (
                  <RankArrow index={i} frame={frame} fps={fps} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* XP progress bar */}
          <XPBar frame={frame} fps={fps} />

          {/* Achievement badges */}
          <div style={{
            display: 'flex', gap: 20, marginTop: 4,
          }}>
            {ACHIEVEMENTS.map((ach, i) => (
              <AchievementBadge key={ach.label} achievement={ach} index={i} frame={frame} fps={fps} />
            ))}
          </div>
        </div>
      )}

      {/* ═══ Phase 2: Reward Shop ═══ */}
      {frame >= 280 && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 28,
          opacity: phase2Opacity,
          transform: `translateY(${phase2Y}px)`,
        }}>
          {/* Section label */}
          <div>
            <span style={{
              fontSize: 16, fontWeight: 800, letterSpacing: '0.2em',
              color: GOLD, textTransform: 'uppercase',
              padding: '4px 16px', borderRadius: 4,
              background: `${GOLD}15`, border: `1px solid ${GOLD}30`,
            }}>
              REWARD SHOP
            </span>
          </div>

          {/* Title */}
          <div style={{ textAlign: 'center' }}>
            <h1 style={{
              fontSize: 48, fontWeight: 900, color: '#fff', margin: 0,
              textShadow: `0 0 40px ${GOLD}40`,
            }}>
              Toko Poin
            </h1>
            <p style={{
              fontSize: 18, color: 'rgba(255,255,255,0.5)', margin: '8px 0 0',
              fontWeight: 500,
            }}>
              Tukar XP dengan reward nyata
            </p>
          </div>

          {/* Reward cards */}
          <div style={{
            display: 'flex', gap: 24, marginTop: 8,
          }}>
            {REWARDS.map((reward, i) => (
              <RewardCard
                key={reward.name}
                reward={reward}
                index={i}
                frame={frame - 310}
                fps={fps}
              />
            ))}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

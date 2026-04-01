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
const TEXT_MID = 'rgba(255,255,255,0.6)';
const BORDER = 'rgba(255,255,255,0.08)';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const FONT = "'Inter', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";

/* Animated counter */
function Counter({ value, frame, startFrame, duration = 60, color = WHITE, size = 48 }) {
  const progress = interpolate(frame, [startFrame, startFrame + duration], [0, 1], CLAMP);
  const current = Math.floor((1 - Math.pow(1 - progress, 3)) * value);
  return (
    <span style={{ fontSize: size, fontWeight: 900, color, fontFamily: FONT_MONO, lineHeight: 1 }}>
      {current >= 1000000 ? `${(current / 1000000).toFixed(1)}M` : current >= 1000 ? `${Math.floor(current / 1000)}K` : current}
    </span>
  );
}

/* ── Platform Card ── */
function PlatformCard({ name, handle, metric, metricLabel, color, frame, startFrame, index }) {
  const appear = spring({ frame: frame - startFrame, fps: 30, config: { damping: 22, mass: 0.8 } });
  const translateY = interpolate(appear, [0, 1], [30, 0], CLAMP);
  const metricVal = Math.floor(interpolate(frame, [startFrame + 20, startFrame + 80], [0, metric], CLAMP));

  return (
    <div style={{
      width: 270, padding: '20px 18px',
      background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`,
      opacity: appear, transform: `translateY(${translateY}px)`,
      display: 'flex', flexDirection: 'column', gap: 12,
      position: 'relative',
    }}>
      {/* Top: platform name + handle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: WHITE, fontFamily: FONT }}>{name}</span>
        </div>
        <span style={{ fontSize: 11, color: TEXT_DIM, fontFamily: FONT_MONO }}>{handle}</span>
      </div>

      {/* Metric */}
      <div>
        <span style={{ fontSize: 32, fontWeight: 900, color, fontFamily: FONT_MONO, lineHeight: 1 }}>
          {metricVal >= 1000000 ? `${(metricVal / 1000000).toFixed(1)}M` : metricVal >= 1000 ? `${Math.floor(metricVal / 1000)}K` : metricVal}
        </span>
        <p style={{ fontSize: 12, color: TEXT_DIM, margin: '4px 0 0', fontWeight: 500 }}>{metricLabel}</p>
      </div>

      {/* Bottom accent line */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, width: '100%', height: 2,
        background: `linear-gradient(90deg, ${color}, ${color}44)`,
      }} />
    </div>
  );
}

/* Propagation line */
function PropLine({ x1, y1, x2, y2, color, frame, startFrame }) {
  const progress = interpolate(frame, [startFrame, startFrame + 30], [0, 1], CLAMP);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  return (
    <div style={{
      position: 'absolute', left: x1, top: y1,
      width: len * progress, height: 1,
      background: `linear-gradient(90deg, ${color}40, ${color}10)`,
      transformOrigin: '0 50%', transform: `rotate(${angle}deg)`, opacity: progress * 0.5,
    }} />
  );
}

export const ViralCascadeV2 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = interpolate(frame, [0, 20], [0, 1], CLAMP);
  const titleOp = interpolate(frame, [5, 30], [0, 1], CLAMP);
  const titleY = interpolate(frame, [5, 30], [20, 0], CLAMP);
  const lineW = interpolate(frame, [20, 50], [0, 120], CLAMP);
  const statsOp = interpolate(frame, [300, 340], [0, 1], CLAMP);

  const PLATFORMS = [
    { name: 'YouTube', handle: '@tniad', metric: 2400000, metricLabel: 'views in 3 days', color: '#FF0000', start: 40 },
    { name: 'Instagram', handle: '@tniad_official', metric: 890000, metricLabel: 'engagements', color: '#E1306C', start: 55 },
    { name: 'TikTok', handle: '@tniad_official', metric: 1200000, metricLabel: 'views', color: '#FFFFFF', start: 70 },
    { name: 'X / Twitter', handle: '@tniad', metric: 340000, metricLabel: 'impressions', color: '#1D9BF0', start: 85 },
    { name: 'Facebook', handle: 'TNI AD', metric: 560000, metricLabel: 'reach', color: '#1877F2', start: 100 },
    { name: 'WhatsApp', handle: '50K+ groups', metric: 18700, metricLabel: 'group shares', color: '#25D366', start: 115 },
  ];

  const center = { x: 960, y: 540 };
  const positions = [
    { x: 120, y: 200 }, { x: 520, y: 200 }, { x: 920, y: 200 },
    { x: 120, y: 440 }, { x: 520, y: 440 }, { x: 920, y: 440 },
  ];

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${PRIMARY_DARK}, ${BLACK})`, fontFamily: FONT }}>
      {/* Subtle glow */}
      <div style={{
        position: 'absolute', top: -200, right: -100, width: 600, height: 600,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(27,67,50,0.12), transparent 70%)',
        filter: 'blur(80px)',
      }} />
      <div style={{
        position: 'absolute', bottom: -200, left: -100, width: 500, height: 500,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(184,134,11,0.06), transparent 70%)',
        filter: 'blur(80px)',
      }} />

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 48, left: 80, right: 80,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        opacity: headerOp, zIndex: 20,
      }}>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2 }}>ENGAGEMENT CASCADE</span>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2 }}>SINAR PLATFORM</span>
      </div>

      {/* Title */}
      <div style={{
        position: 'absolute', top: 100, left: 80, right: 80,
        opacity: titleOp, transform: `translateY(${titleY}px)`, zIndex: 20,
      }}>
        <h2 style={{ fontSize: 48, fontWeight: 900, color: WHITE, margin: 0, lineHeight: 1.1 }}>
          Satu Misi &rarr;{' '}
          <span style={{
            background: `linear-gradient(90deg, ${PRIMARY_ACCENT}, ${GOLD})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Jutaan Jangkauan
          </span>
        </h2>
      </div>

      {/* Gradient accent line */}
      <div style={{
        position: 'absolute', top: 170, left: 80,
        width: lineW, height: 3,
        background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})`,
        borderRadius: 2, zIndex: 20,
      }} />

      {/* Propagation lines */}
      {positions.map((pos, i) => (
        <PropLine key={i} x1={center.x} y1={center.y} x2={pos.x + 135} y2={pos.y + 50}
          color={PLATFORMS[i].color} frame={frame} startFrame={PLATFORMS[i].start - 15} />
      ))}

      {/* Platform cards — 3x2 grid */}
      <div style={{
        position: 'absolute', top: 200, left: 80, right: 80, bottom: 200,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16, zIndex: 15,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          {PLATFORMS.slice(0, 3).map((p, i) => (
            <PlatformCard key={p.name} {...p} startFrame={p.start} index={i} frame={frame} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          {PLATFORMS.slice(3).map((p, i) => (
            <PlatformCard key={p.name} {...p} startFrame={p.start} index={i + 3} frame={frame} />
          ))}
        </div>
      </div>

      {/* Bottom stats */}
      <div style={{
        position: 'absolute', bottom: 100, left: 80, right: 80,
        display: 'flex', justifyContent: 'center', gap: 60,
        opacity: statsOp, zIndex: 20,
      }}>
        {[
          { label: 'Total Views', value: 2400000, color: '#EF4444' },
          { label: 'Engagements', value: 890000, color: '#22C55E' },
          { label: 'Shares', value: 340000, color: '#60A5FA' },
          { label: 'New Followers', value: 125000, color: '#6D28D9' },
        ].map((stat, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <Counter value={stat.value} frame={frame} startFrame={320 + i * 15} duration={60} color={stat.color} size={32} />
            <p style={{ fontSize: 11, color: TEXT_DIM, marginTop: 4, fontWeight: 600, letterSpacing: 1 }}>{stat.label}</p>
          </div>
        ))}
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


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
const RED = '#EF4444';
const GREEN = '#4ADE80';

/* Animated counter */
function Counter({ value, frame, startFrame, duration = 25, color = '#fff', size = 36 }) {
  const progress = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const current = Math.floor((1 - Math.pow(1 - progress, 3)) * value);
  return (
    <span style={{ fontSize: size, fontWeight: 900, color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
      {current >= 1000000 ? `${(current / 1000000).toFixed(1)}M` : current >= 1000 ? `${(current / 1000).toFixed(0)}K` : current}
    </span>
  );
}

/* YouTube mini card */
function YouTubeCard({ title, channel, views, viewColor, frame, startFrame, badge }) {
  const appear = spring({ frame: frame - startFrame, fps: 30, config: { damping: 20 } });
  return (
    <div style={{ opacity: appear, transform: `scale(${0.9 + appear * 0.1})`, width: 340, borderRadius: 14, background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <div style={{ height: 160, background: 'linear-gradient(135deg,#14532D,#1F7542)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ width: 52, height: 36, borderRadius: 8, background: 'rgba(255,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 0, height: 0, borderStyle: 'solid', borderWidth: '8px 0 8px 14px', borderColor: 'transparent transparent transparent #fff', marginLeft: 2 }} />
        </div>
        {badge && (
          <div style={{ position: 'absolute', top: 10, left: 10, background: badge.bg, borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 12 }}>{badge.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 0.5 }}>{badge.text}</span>
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.8)', borderRadius: 4, padding: '2px 8px' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', fontFamily: "'JetBrains Mono'" }}>12:34</span>
        </div>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.3 }}>{title}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{channel}</span>
          <span style={{ fontSize: 12, color: '#60A5FA' }}>✓</span>
        </div>
        <p style={{ fontSize: 13, color: viewColor, marginTop: 4, fontFamily: "'JetBrains Mono'", fontWeight: 700 }}>{views}</p>
      </div>
    </div>
  );
}

/* Social platform spread indicator */
function PlatformSpread({ platforms, frame, startFrame }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
      {platforms.map((p, i) => {
        const appear = spring({ frame: frame - startFrame - i * 4, fps: 30, config: { damping: 20 } });
        return (
          <div key={i} style={{
            opacity: appear, transform: `scale(${appear})`,
            padding: '6px 12px', borderRadius: 8,
            background: `${p.color}15`, border: `1px solid ${p.color}30`,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: p.color }}>{p.name}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono'" }}>{p.count}</span>
          </div>
        );
      })}
    </div>
  );
}

/* Animated arrow between sections */
function BigArrow({ frame, startFrame }) {
  const op = interpolate(frame, [startFrame, startFrame + 15], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const pulse = interpolate(frame % 60, [0, 30, 60], [0.8, 1, 0.8]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: op * pulse, margin: '0 20px' }}>
      <div style={{ width: 60, height: 3, background: `linear-gradient(90deg, ${GOLD}60, ${GOLD})`, borderRadius: 2 }} />
      <div style={{ width: 0, height: 0, borderStyle: 'solid', borderWidth: '8px 0 8px 14px', borderColor: `transparent transparent transparent ${GOLD}`, marginLeft: 2 }} />
      <span style={{ fontSize: 12, fontWeight: 800, color: GOLD, letterSpacing: 2 }}>SINAR</span>
    </div>
  );
}

export const BeforeAfter = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timeline (30fps):
  // 0-50:     Title
  // 40-80:    "TANPA SINAR" label + left card
  // 80-140:   Left stats appear (low numbers)
  // 150-180:  Arrow + "DENGAN SINAR" label
  // 180-220:  Right card appears
  // 220-320:  Right stats appear (high numbers) + platform spread
  // 320-380:  Bottom comparison bar
  // 380+:     Hold

  const titleOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, 20], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const leftLabelOp = interpolate(frame, [20, 35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const rightLabelOp = interpolate(frame, [75, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const compBarOp = interpolate(frame, [160, 180], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Multiplier reveal
  const multOp = interpolate(frame, [175, 195], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: DARK, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #030806, #081510, #030806)' }} />

      {/* Title */}
      <div style={{ position: 'absolute', top: 35, left: 0, right: 0, textAlign: 'center', opacity: titleOp, transform: `translateY(${titleY}px)`, zIndex: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'rgba(184,134,11,0.7)', letterSpacing: 6, marginBottom: 8 }}>
          CONTOH NYATA
        </div>
        <h2 style={{ fontSize: 40, fontWeight: 800, color: '#fff', margin: 0 }}>
          Berita yang Sama, <span style={{ color: GOLD }}>Dampak yang Berbeda</span>
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
          Studi kasus: liputan resmi DISPENAD di media sosial
        </p>
      </div>

      {/* Main comparison — two columns */}
      <div style={{
        position: 'absolute', top: 170, bottom: 120, left: 60, right: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0,
      }}>

        {/* LEFT — TANPA SINAR */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          {/* Label */}
          <div style={{ opacity: leftLabelOp, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: RED }} />
            <span style={{ fontSize: 18, fontWeight: 800, color: RED, letterSpacing: 2 }}>TANPA SINAR</span>
          </div>

          {/* YouTube card — low views */}
          <YouTubeCard
            title="KSAD Resmikan 200 Jembatan Garuda di Aceh Utara"
            channel="DISPENAD Official"
            views="15.2K views · 2 minggu"
            viewColor="rgba(255,255,255,0.4)"
            frame={frame}
            startFrame={25}
          />

          {/* Low stats */}
          <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
            {[
              { label: 'Views', value: 15200, color: 'rgba(255,255,255,0.5)' },
              { label: 'Shares', value: 340, color: 'rgba(255,255,255,0.4)' },
              { label: 'Comments', value: 89, color: 'rgba(255,255,255,0.4)' },
            ].map((s, i) => {
              const sOp = interpolate(frame, [45 + i * 8, 55 + i * 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
              return (
                <div key={i} style={{ textAlign: 'center', opacity: sOp }}>
                  <Counter value={s.value} frame={frame} startFrame={45 + i * 8} duration={20} color={s.color} size={28} />
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '4px 0 0', fontWeight: 600 }}>{s.label}</p>
                </div>
              );
            })}
          </div>

          {/* Reach indicator */}
          <div style={{
            opacity: interpolate(frame, [65, 75], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            padding: '8px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
          }}>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: 0, textAlign: 'center' }}>
              Hanya menjangkau <strong style={{ color: RED }}>0.004%</strong> populasi Indonesia
            </p>
          </div>
        </div>

        {/* ARROW */}
        <BigArrow frame={frame} startFrame={75} />

        {/* RIGHT — DENGAN SINAR */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          {/* Label */}
          <div style={{ opacity: rightLabelOp, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: GREEN }} />
            <span style={{ fontSize: 18, fontWeight: 800, color: GREEN, letterSpacing: 2 }}>DENGAN SINAR</span>
          </div>

          {/* YouTube card — high views */}
          <YouTubeCard
            title="KSAD Resmikan 200 Jembatan Garuda di Aceh Utara"
            channel="DISPENAD Official"
            views="2.4M views · 3 hari"
            viewColor={GREEN}
            frame={frame}
            startFrame={90}
            badge={{ icon: '🔥', text: 'TRENDING', bg: 'rgba(239,68,68,0.9)' }}
          />

          {/* High stats */}
          <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
            {[
              { label: 'Views', value: 2400000, color: GREEN },
              { label: 'Shares', value: 340000, color: '#60A5FA' },
              { label: 'Comments', value: 89000, color: '#A78BFA' },
            ].map((s, i) => {
              const sOp = interpolate(frame, [115 + i * 8, 125 + i * 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
              return (
                <div key={i} style={{ textAlign: 'center', opacity: sOp }}>
                  <Counter value={s.value} frame={frame} startFrame={115 + i * 8} duration={25} color={s.color} size={28} />
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '4px 0 0', fontWeight: 600 }}>{s.label}</p>
                </div>
              );
            })}
          </div>

          {/* Platform spread */}
          <PlatformSpread
            platforms={[
              { name: 'YouTube', count: '2.4M', color: '#FF0000' },
              { name: 'Instagram', count: '890K', color: '#E1306C' },
              { name: 'TikTok', count: '1.2M', color: '#fff' },
              { name: 'X', count: '340K', color: '#1D9BF0' },
              { name: 'Facebook', count: '560K', color: '#1877F2' },
              { name: 'WhatsApp', count: '50K grp', color: '#25D366' },
            ]}
            frame={frame}
            startFrame={135}
          />
        </div>
      </div>

      {/* Bottom — 158× multiplier badge */}
      <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center', opacity: compBarOp, zIndex: 20 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 20,
          padding: '16px 40px', borderRadius: 16,
          background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(184,134,11,0.2)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: 0, fontWeight: 600 }}>Peningkatan Jangkauan</p>
            <span style={{ fontSize: 56, fontWeight: 900, color: GOLD, fontFamily: "'JetBrains Mono', monospace" }}>158×</span>
          </div>
          <div style={{ width: 2, height: 50, background: 'rgba(255,255,255,0.1)' }} />
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', margin: 0, maxWidth: 400, lineHeight: 1.5 }}>
            Konten yang sama, disebarkan secara <strong style={{ color: '#fff' }}>terkoordinasi</strong> oleh <strong style={{ color: GOLD }}>400K prajurit & KBT</strong>
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};

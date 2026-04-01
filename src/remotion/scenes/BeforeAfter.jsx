import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

/* ── Design Tokens ── */
const BG_GRADIENT = 'linear-gradient(160deg, #0B2619, #1A1814)';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_DIM = 'rgba(255,255,255,0.45)';
const TEXT_MID = 'rgba(255,255,255,0.6)';
const GREEN_PRIMARY = '#1B4332';
const GREEN_ACCENT = '#2D6A4F';
const GOLD = '#B8860B';
const PATRIOT_RED = '#8B1A1A';
const GRADIENT_ACCENT = 'linear-gradient(90deg, #1B4332, #B8860B)';
const FONT = "'Inter', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";

const RED = '#EF4444';
const GREEN = '#22C55E';

/* Animated counter */
function Counter({ value, frame, startFrame, duration = 25, color = '#fff', size = 36 }) {
  const progress = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const current = Math.floor((1 - Math.pow(1 - progress, 3)) * value);
  return (
    <span style={{ fontSize: size, fontWeight: 900, color, fontFamily: FONT_MONO, lineHeight: 1 }}>
      {current >= 1000000 ? `${(current / 1000000).toFixed(1)}M` : current >= 1000 ? `${(current / 1000).toFixed(0)}K` : current}
    </span>
  );
}

/* YouTube mini card */
function YouTubeCard({ title, channel, views, viewColor, frame, startFrame, badge }) {
  const appear = spring({ frame: frame - startFrame, fps: 30, config: { damping: 20 } });
  return (
    <div style={{ opacity: appear, transform: `scale(${0.9 + appear * 0.1})`, width: 340, borderRadius: 12, background: '#111', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <div style={{ height: 160, background: `linear-gradient(135deg,${GREEN_PRIMARY},${GREEN_ACCENT})`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ width: 52, height: 36, borderRadius: 8, background: 'rgba(255,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 0, height: 0, borderStyle: 'solid', borderWidth: '8px 0 8px 14px', borderColor: 'transparent transparent transparent #fff', marginLeft: 2 }} />
        </div>
        {badge && (
          <div style={{ position: 'absolute', top: 10, left: 10, background: badge.bg, borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 12 }}>{badge.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 0.5, fontFamily: FONT_MONO }}>{badge.text}</span>
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.8)', borderRadius: 4, padding: '2px 8px' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', fontFamily: FONT_MONO }}>12:34</span>
        </div>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY, margin: 0, lineHeight: 1.3 }}>{title}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
          <span style={{ fontSize: 12, color: TEXT_DIM }}>{channel}</span>
          <span style={{ fontSize: 12, color: '#60A5FA' }}>&#10003;</span>
        </div>
        <p style={{ fontSize: 13, color: viewColor, marginTop: 4, fontFamily: FONT_MONO, fontWeight: 700 }}>{views}</p>
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
            padding: '6px 12px', borderRadius: 6,
            background: `${p.color}10`, border: `1px solid ${p.color}20`,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: p.color, fontFamily: FONT_MONO }}>{p.name}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_DIM, fontFamily: FONT_MONO }}>{p.count}</span>
          </div>
        );
      })}
    </div>
  );
}

/* Animated divider arrow between sections */
function BigArrow({ frame, startFrame }) {
  const op = interpolate(frame, [startFrame, startFrame + 15], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const pulse = interpolate(frame % 60, [0, 30, 60], [0.8, 1, 0.8]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: op * pulse, margin: '0 20px' }}>
      <div style={{ width: 60, height: 2, background: GRADIENT_ACCENT, borderRadius: 1 }} />
      <div style={{ width: 0, height: 0, borderStyle: 'solid', borderWidth: '8px 0 8px 14px', borderColor: `transparent transparent transparent ${GOLD}`, marginLeft: 2 }} />
      <span style={{ fontSize: 12, fontWeight: 800, color: GOLD, letterSpacing: 2, fontFamily: FONT_MONO }}>SINAR</span>
    </div>
  );
}

export const BeforeAfter = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, 20], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const leftLabelOp = interpolate(frame, [20, 35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const rightLabelOp = interpolate(frame, [75, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const compBarOp = interpolate(frame, [160, 180], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: BG_GRADIENT, fontFamily: FONT }}>

      {/* ── Top Bar ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 80px', zIndex: 30,
      }}>
        <span style={{ fontSize: 11, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2, textTransform: 'uppercase' }}>
          Contoh Nyata
        </span>
        <span style={{ fontSize: 11, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2, textTransform: 'uppercase' }}>
          Before / After
        </span>
      </div>

      {/* Title */}
      <div style={{ position: 'absolute', top: 50, left: 80, right: 80, textAlign: 'left', opacity: titleOp, transform: `translateY(${titleY}px)`, zIndex: 20 }}>
        <h2 style={{ fontSize: 42, fontWeight: 800, color: TEXT_PRIMARY, margin: 0 }}>
          Berita yang Sama,{' '}
          <span style={{ background: GRADIENT_ACCENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Dampak yang Berbeda
          </span>
        </h2>
        <p style={{ fontSize: 16, color: TEXT_DIM, marginTop: 8 }}>
          Studi kasus: liputan resmi DISPENAD di media sosial
        </p>
      </div>

      {/* ── Divider line under title ── */}
      <div style={{ position: 'absolute', top: 148, left: 80, right: 80, height: 1, background: 'rgba(255,255,255,0.06)', zIndex: 20 }} />

      {/* Main comparison — two columns */}
      <div style={{
        position: 'absolute', top: 170, bottom: 130, left: 80, right: 80,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0,
      }}>

        {/* LEFT — TANPA SINAR */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ opacity: leftLabelOp, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: RED }} />
            <span style={{ fontSize: 16, fontWeight: 800, color: RED, letterSpacing: 2, fontFamily: FONT_MONO }}>TANPA SINAR</span>
          </div>

          <YouTubeCard
            title="KSAD Resmikan 200 Jembatan Garuda di Aceh Utara"
            channel="DISPENAD Official"
            views="15.2K views - 2 minggu"
            viewColor={TEXT_DIM}
            frame={frame}
            startFrame={25}
          />

          <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
            {[
              { label: 'Views', value: 15200, color: TEXT_MID },
              { label: 'Shares', value: 340, color: TEXT_DIM },
              { label: 'Comments', value: 89, color: TEXT_DIM },
            ].map((s, i) => {
              const sOp = interpolate(frame, [45 + i * 8, 55 + i * 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
              return (
                <div key={i} style={{ textAlign: 'center', opacity: sOp }}>
                  <Counter value={s.value} frame={frame} startFrame={45 + i * 8} duration={20} color={s.color} size={28} />
                  <p style={{ fontSize: 12, color: TEXT_DIM, margin: '4px 0 0', fontWeight: 600 }}>{s.label}</p>
                </div>
              );
            })}
          </div>

          <div style={{
            opacity: interpolate(frame, [65, 75], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            padding: '8px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)',
          }}>
            <p style={{ fontSize: 14, color: TEXT_DIM, margin: 0, textAlign: 'center' }}>
              Hanya menjangkau <strong style={{ color: RED }}>0.004%</strong> populasi Indonesia
            </p>
          </div>
        </div>

        {/* ARROW */}
        <BigArrow frame={frame} startFrame={75} />

        {/* RIGHT — DENGAN SINAR */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ opacity: rightLabelOp, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: GREEN }} />
            <span style={{ fontSize: 16, fontWeight: 800, color: GREEN, letterSpacing: 2, fontFamily: FONT_MONO }}>DENGAN SINAR</span>
          </div>

          <YouTubeCard
            title="KSAD Resmikan 200 Jembatan Garuda di Aceh Utara"
            channel="DISPENAD Official"
            views="2.4M views - 3 hari"
            viewColor={GREEN}
            frame={frame}
            startFrame={90}
            badge={{ icon: '\uD83D\uDD25', text: 'TRENDING', bg: 'rgba(239,68,68,0.9)' }}
          />

          <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
            {[
              { label: 'Views', value: 2400000, color: GREEN },
              { label: 'Shares', value: 340000, color: '#60A5FA' },
              { label: 'Comments', value: 89000, color: '#6D28D9' },
            ].map((s, i) => {
              const sOp = interpolate(frame, [115 + i * 8, 125 + i * 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
              return (
                <div key={i} style={{ textAlign: 'center', opacity: sOp }}>
                  <Counter value={s.value} frame={frame} startFrame={115 + i * 8} duration={25} color={s.color} size={28} />
                  <p style={{ fontSize: 12, color: TEXT_DIM, margin: '4px 0 0', fontWeight: 600 }}>{s.label}</p>
                </div>
              );
            })}
          </div>

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

      {/* ── Divider line above bottom ── */}
      <div style={{ position: 'absolute', bottom: 120, left: 80, right: 80, height: 1, background: 'rgba(255,255,255,0.06)', zIndex: 20 }} />

      {/* Bottom — 158x multiplier badge */}
      <div style={{ position: 'absolute', bottom: 50, left: 80, right: 80, textAlign: 'center', opacity: compBarOp, zIndex: 20 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 20,
          padding: '16px 40px', borderRadius: 12,
          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: TEXT_DIM, margin: 0, fontWeight: 600, fontFamily: FONT_MONO, letterSpacing: 1 }}>Peningkatan Jangkauan</p>
            <span style={{ fontSize: 56, fontWeight: 900, background: GRADIENT_ACCENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: FONT_MONO }}>158x</span>
          </div>
          <div style={{ width: 1, height: 50, background: 'rgba(255,255,255,0.08)' }} />
          <p style={{ fontSize: 15, color: TEXT_MID, margin: 0, maxWidth: 400, lineHeight: 1.5 }}>
            Konten yang sama, disebarkan secara <strong style={{ color: TEXT_PRIMARY }}>terkoordinasi</strong> oleh <strong style={{ color: GOLD }}>400K prajurit & Keluarga Besar TNI (KBT)</strong>
          </p>
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 80px', zIndex: 30,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: GRADIENT_ACCENT }} />
          <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 1 }}>sinar.id</span>
        </div>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_DIM }}>08</span>
      </div>

    </AbsoluteFill>
  );
};

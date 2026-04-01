import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  staticFile,
} from 'remotion';

const FONT = "'Inter', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";
const TEXT_DIM = 'rgba(255,255,255,0.45)';
const GOLD = '#B8860B';
const GREEN = '#1B4332';
const ACCENT = '#2D6A4F';
const RED = '#8B1A1A';
const BG_GRADIENT = 'linear-gradient(160deg, #0B2619, #1A1814)';
const OVERLAY = 'linear-gradient(180deg, #0B2619E6 0%, #1A1814CC 50%, #1A1814F2 100%)';
const BG_FILTER = 'brightness(0.15) contrast(1.2) saturate(0.3)';

/* SINAR shield logo */
function SinarMark({ size = 110, opacity = 1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ opacity }}>
      <defs>
        <linearGradient id="ism" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#14532D" /><stop offset="100%" stopColor="#1F7542" />
        </linearGradient>
        <linearGradient id="isr" x1="20" y1="0" x2="20" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D97706" /><stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="isd" x1="20" y1="0" x2="20" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#991B1B" /><stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
      </defs>
      <path d="M20 3 L36 10 L36 22 C36 30 28 36 20 38 C12 36 4 30 4 22 L4 10 Z" fill="url(#ism)" />
      <path d="M20 3 L36 10 L36 22 C36 30 28 36 20 38 C12 36 4 30 4 22 L4 10 Z" fill="white" opacity="0.06" />
      <path d="M20 3 L36 10 L4 10 Z" fill="url(#isd)" opacity="0.6" />
      <path d="M20 13 L22 18 L20 17 L18 18 Z" fill="url(#isr)" opacity="0.9" />
      <circle cx="20" cy="22" r="4" fill="url(#isr)" opacity="0.85" />
      <circle cx="20" cy="22" r="2" fill="white" opacity="0.4" />
    </svg>
  );
}

/* Subtitle bar — clean editorial style */
function Subtitle({ text, frame, startFrame, endFrame }) {
  const op = interpolate(frame, [startFrame, startFrame + 15, endFrame - 15, endFrame], [0, 1, 1, 0.8], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return (
    <div style={{ position: 'absolute', bottom: 70, left: 0, right: 0, textAlign: 'center', opacity: op, zIndex: 30 }}>
      <div style={{ display: 'inline-block', padding: '12px 32px', borderRadius: 8, background: 'rgba(11,38,25,0.75)' }}>
        <p style={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: 0, lineHeight: 1.5, fontFamily: FONT }}>{text}</p>
      </div>
    </div>
  );
}

/* Counter */
function Counter({ value, frame, startFrame, duration = 40, suffix = '', color = '#fff', size = 60 }) {
  const p = interpolate(frame, [startFrame, startFrame + duration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const v = Math.floor((1 - Math.pow(1 - p, 3)) * value);
  return <span style={{ fontSize: size, fontWeight: 900, color, fontFamily: FONT_MONO, lineHeight: 1 }}>{v.toLocaleString()}{suffix}</span>;
}

export const IntroVideo = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // === SCENE 1 (0-120): THE PROBLEM ===
  const s1Op = interpolate(frame, [0, 20, 100, 120], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const s1StatScale = spring({ frame: frame - 15, fps, config: { damping: 12 } });

  // === SCENE 2 (120-270): SINAR — THE SOLUTION ===
  const s2Op = interpolate(frame, [120, 140, 250, 270], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const logoScale = spring({ frame: frame - 130, fps, config: { damping: 14 } });

  const capabilities = [
    { label: 'Distribusi Terkoordinasi', icon: '📡', color: RED },
    { label: 'Mobilisasi 400K Serentak', icon: '⚡', color: GREEN },
    { label: 'Organisasi Massa Organik', icon: '🌐', color: '#0F766E' },
  ];

  // === SCENE 3 (270-400): HOW — 3 capabilities ===
  const s3Op = interpolate(frame, [270, 290, 380, 400], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const flows = [
    { title: 'Distribusi', desc: 'Satu instruksi dari komando pusat langsung tersebar ke 400.000 perangkat dalam hitungan detik', stat: '400K', statLabel: 'Penerima Serentak', color: RED, icon: '📡' },
    { title: 'Mobilisasi', desc: 'Setiap prajurit & KBT like, share, upload ke 6 platform — menciptakan gelombang konten terkoordinasi', stat: '6', statLabel: 'Platform Sekaligus', color: GREEN, icon: '⚡' },
    { title: 'Organisasi Organik', desc: 'Engagement masif memicu algoritma trending — konten menyebar secara organik tanpa iklan berbayar', stat: '16M+', statLabel: 'Jangkauan Potensial', color: '#0F766E', icon: '🌐' },
  ];

  // === SCENE 4 (400-540): IMPACT + CTA ===
  const s4Op = interpolate(frame, [400, 420], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Background
  const bgImages = ['splash-hero-soldiers.png', 'splash-hero-humanitarian.png', 'splash-hero-portrait.png', 'splash-hero-action.png'];
  const bgCycle = Math.floor(frame / 120) % 4;
  const bgScale = interpolate(frame, [0, 540], [1.05, 1.15], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: BG_GRADIENT, fontFamily: FONT }}>
      {/* Background slideshow with Ken Burns */}
      {bgImages.map((img, i) => (
        <div key={i} style={{ position: 'absolute', inset: 0, opacity: bgCycle === i ? 1 : 0, transition: 'opacity 2s' }}>
          <Img src={staticFile(`images/${img}`)} style={{
            width: '100%', height: '100%', objectFit: 'cover',
            filter: BG_FILTER,
            transform: `scale(${bgScale})`,
          }} />
        </div>
      ))}

      {/* Overlay */}
      <div style={{ position: 'absolute', inset: 0, background: OVERLAY }} />

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 32, left: 48, right: 48, display: 'flex', justifyContent: 'space-between', zIndex: 20 }}>
        <span style={{ fontSize: 10, fontFamily: FONT_MONO, fontWeight: 600, color: TEXT_DIM, letterSpacing: 3 }}>VIDEO DEMO</span>
        <span style={{ fontSize: 10, fontFamily: FONT_MONO, fontWeight: 600, color: TEXT_DIM, letterSpacing: 3 }}>SINAR PITCH DECK</span>
      </div>

      {/* Bottom bar */}
      <div style={{ position: 'absolute', bottom: 32, left: 48, right: 48, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(90deg, #1B4332, #B8860B)' }} />
          <span style={{ fontSize: 11, fontFamily: FONT_MONO, fontWeight: 600, color: TEXT_DIM, letterSpacing: 1 }}>sinar.id</span>
        </div>
        <span style={{ fontSize: 11, fontFamily: FONT_MONO, fontWeight: 600, color: TEXT_DIM }}>11</span>
      </div>

      {/* === SCENE 1: THE PROBLEM === */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: s1Op, zIndex: 10 }}>
        <div style={{ fontSize: 11, fontFamily: FONT_MONO, fontWeight: 600, color: TEXT_DIM, letterSpacing: 5, marginBottom: 20 }}>
          TANTANGAN ERA DIGITAL
        </div>
        <div style={{ transform: `scale(${s1StatScale})`, textAlign: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 120, fontWeight: 900, color: RED, fontFamily: FONT_MONO, lineHeight: 1 }}>6×</span>
          <p style={{ fontSize: 24, color: 'rgba(255,255,255,0.7)', margin: '12px 0 0', fontWeight: 600, fontFamily: FONT }}>
            Hoaks menyebar lebih cepat dari fakta
          </p>
        </div>
        <p style={{ fontSize: 18, color: TEXT_DIM, maxWidth: 600, textAlign: 'center', lineHeight: 1.6 }}>
          Konten positif TNI AD tenggelam oleh sentimen negatif di media sosial
        </p>
      </div>
      <Subtitle text="Di era digital, citra positif kalah cepat dari sentimen negatif." frame={frame} startFrame={10} endFrame={110} />

      {/* === SCENE 2: SINAR === */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: s2Op, zIndex: 10 }}>
        <div style={{ transform: `scale(${logoScale})`, marginBottom: 16 }}>
          <SinarMark size={100} />
        </div>
        <h1 style={{ fontSize: 72, fontWeight: 900, color: '#FFFFFF', letterSpacing: 16, margin: '0 0 8px', fontFamily: FONT }}>SINAR</h1>
        <p style={{ fontSize: 16, fontWeight: 600, color: GOLD, letterSpacing: 6, margin: '0 0 28px', fontFamily: FONT }}>
          SISTEM INFORMASI NARASI AKTIF RAKYAT
        </p>

        {/* Capability pills */}
        <div style={{ display: 'flex', gap: 14 }}>
          {capabilities.map((c, i) => {
            const pillOp = spring({ frame: frame - 160 - i * 12, fps, config: { damping: 16 } });
            return (
              <div key={i} style={{
                opacity: pillOp, transform: `translateY(${(1 - pillOp) * 15}px)`,
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 18px', borderRadius: 6,
                background: 'rgba(255,255,255,0.04)',
                borderLeft: `3px solid ${c.color}`,
              }}>
                <span style={{ fontSize: 18 }}>{c.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', fontFamily: FONT }}>{c.label}</span>
              </div>
            );
          })}
        </div>
      </div>
      <Subtitle text="Platform yang mendistribusikan, menggerakkan, dan mengorganisir secara organik." frame={frame} startFrame={135} endFrame={260} />

      {/* === SCENE 3: 3 CAPABILITIES === */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: s3Op, zIndex: 10, padding: '0 80px' }}>
        <div style={{ fontSize: 11, fontFamily: FONT_MONO, fontWeight: 600, color: TEXT_DIM, letterSpacing: 5, marginBottom: 12 }}>
          KEUNGGULAN UTAMA
        </div>
        <h2 style={{ fontSize: 40, fontWeight: 800, color: '#FFFFFF', margin: '0 0 32px', textAlign: 'center', fontFamily: FONT }}>
          Satu Platform, <span style={{ color: GOLD }}>Tiga Kekuatan</span>
        </h2>

        <div style={{ display: 'flex', gap: 24 }}>
          {flows.map((f, i) => {
            const cardOp = spring({ frame: frame - 290 - i * 15, fps, config: { damping: 16 } });
            return (
              <div key={i} style={{
                opacity: cardOp, transform: `translateY(${(1 - cardOp) * 20}px)`,
                flex: 1, padding: '28px 24px', borderRadius: 8,
                background: 'rgba(255,255,255,0.03)',
                borderTop: `3px solid ${f.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 24 }}>{f.icon}</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF', fontFamily: FONT }}>{f.title}</span>
                </div>
                <p style={{ fontSize: 14, color: TEXT_DIM, lineHeight: 1.7, margin: '0 0 18px', fontFamily: FONT }}>{f.desc}</p>
                <div style={{ padding: '12px 16px', borderRadius: 6, background: 'rgba(255,255,255,0.03)' }}>
                  <span style={{ fontSize: 32, fontWeight: 900, color: '#FFFFFF', fontFamily: FONT_MONO }}>{f.stat}</span>
                  <p style={{ fontSize: 11, color: TEXT_DIM, margin: '4px 0 0', fontWeight: 600, fontFamily: FONT_MONO }}>{f.statLabel}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Subtitle text="Satu instruksi dari komando, langsung menyebar ke seluruh Indonesia." frame={frame} startFrame={285} endFrame={395} />

      {/* === SCENE 4: IMPACT + CTA === */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: s4Op, zIndex: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Counter value={16} frame={frame} startFrame={420} duration={30} suffix=".0M+" color={GOLD} size={80} />
          <p style={{ fontSize: 20, color: 'rgba(255,255,255,0.6)', margin: '10px 0 0', fontWeight: 600, letterSpacing: 3, fontFamily: FONT }}>
            JANGKAUAN NASIONAL
          </p>
        </div>

        <div style={{ display: 'flex', gap: 40, marginBottom: 36 }}>
          {[
            { icon: '📡', label: 'Distribusi', value: '400K', sub: 'dalam hitungan detik' },
            { icon: '⚡', label: 'Mobilisasi', value: '6 Platform', sub: 'sekaligus serentak' },
            { icon: '🌐', label: 'Organik', value: '0 Iklan', sub: 'trending alami' },
          ].map((s, i) => {
            const sOp = spring({ frame: frame - 440 - i * 10, fps, config: { damping: 16 } });
            return (
              <div key={i} style={{ textAlign: 'center', opacity: sOp }}>
                <span style={{ fontSize: 24 }}>{s.icon}</span>
                <p style={{ fontSize: 24, fontWeight: 900, color: '#FFFFFF', fontFamily: FONT_MONO, margin: '8px 0 2px' }}>{s.value}</p>
                <p style={{ fontSize: 12, color: TEXT_DIM, margin: 0, fontFamily: FONT }}>{s.sub}</p>
              </div>
            );
          })}
        </div>

        <SinarMark size={48} />
        <p style={{ fontSize: 13, color: TEXT_DIM, marginTop: 14, letterSpacing: 3, fontWeight: 600, fontFamily: FONT_MONO }}>
          TNI AD &nbsp;·&nbsp; DISPENAD &nbsp;·&nbsp; 2026
        </p>
      </div>
      <Subtitle text="SINAR — narasi positif dimulai dari kita." frame={frame} startFrame={415} endFrame={540} />
    </AbsoluteFill>
  );
};

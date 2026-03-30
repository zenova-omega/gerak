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

const GOLD = '#D4A843';
const GOLD_RAW = 'rgba(184,134,11,';
const DARK = '#030806';

function SinarMark({ size = 110, opacity = 1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ opacity }}>
      <defs>
        <linearGradient id="csm" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#14532D" />
          <stop offset="100%" stopColor="#1F7542" />
        </linearGradient>
        <linearGradient id="csr" x1="20" y1="0" x2="20" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="csd" x1="20" y1="0" x2="20" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#991B1B" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
      </defs>
      <path d="M20 3 L36 10 L36 22 C36 30 28 36 20 38 C12 36 4 30 4 22 L4 10 Z" fill="url(#csm)" />
      <path d="M20 3 L36 10 L36 22 C36 30 28 36 20 38 C12 36 4 30 4 22 L4 10 Z" fill="white" opacity="0.06" />
      <path d="M20 3 L36 10 L4 10 Z" fill="url(#csd)" opacity="0.6" />
      <path d="M20 13 L22 18 L20 17 L18 18 Z" fill="url(#csr)" opacity="0.9" />
      <path d="M20 13 L24 20 L20 18.5 L16 20 Z" fill="url(#csr)" opacity="0.5" />
      <circle cx="20" cy="22" r="4" fill="url(#csr)" opacity="0.85" />
      <circle cx="20" cy="22" r="2" fill="white" opacity="0.4" />
      <path d="M14 26 L20 24 L26 26 L20 32 Z" fill="white" opacity="0.12" />
    </svg>
  );
}

function Particle({ x, y, size, delay, frame }) {
  const drift = Math.sin((frame + delay * 30) * 0.02) * 20;
  const floatY = Math.cos((frame + delay * 30) * 0.015) * 15;
  const opacity = interpolate((frame + delay * 30) % 300, [0, 50, 250, 300], [0, 0.25, 0.25, 0]);
  return (
    <div style={{
      position: 'absolute', left: `${x}%`, top: `${y}%`, width: size, height: size,
      borderRadius: '50%', background: `${GOLD_RAW}0.3)`,
      transform: `translate(${drift}px, ${floatY}px)`, opacity,
    }} />
  );
}

export const ClosingQuote = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timeline (30fps, 600 frames = 20s):
  // 0-30:     Fade from black
  // 30-90:    "TENTARA NASIONAL INDONESIA" header
  // 60-180:   Quote lines fade in one by one
  // 180-240:  Gold line + "400.000 PRAJURIT · SATU TEKAD"
  // 240-300:  Quote fades out
  // 300-360:  Logo springs in
  // 340-400:  "TNI AD MEMPERSEMBAHKAN"
  // 360-420:  "SINAR" title
  // 420-480:  Tagline
  // 480-600:  Hold

  // Background
  const bgImages = ['splash-hero-soldiers.png', 'splash-hero-humanitarian.png', 'splash-hero-portrait.png', 'splash-hero-action.png'];
  const bgCycle = Math.floor(frame / 120) % 4;
  const bgScale = interpolate(frame, [0, 600], [1.05, 1.15], { extrapolateRight: 'clamp' });

  // Quote phase
  const headerOp = interpolate(frame, [30, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const line1Op = interpolate(frame, [60, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const line2Op = interpolate(frame, [90, 120], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const line3Op = interpolate(frame, [120, 150], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const statsOp = interpolate(frame, [180, 210], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const quoteFadeOut = interpolate(frame, [240, 280], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Logo phase
  const logoScale = spring({ frame: frame - 300, fps, config: { damping: 15, mass: 0.8 } });
  const logoOp = interpolate(frame, [300, 330], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const presentsOp = interpolate(frame, [340, 370], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sinarOp = interpolate(frame, [360, 390], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sinarY = interpolate(frame, [360, 390], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const tagOp = interpolate(frame, [420, 450], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const ringScale = interpolate(frame % 150, [0, 75, 150], [1, 1.08, 1]);

  const particles = Array.from({ length: 25 }, (_, i) => ({
    id: i, x: ((i * 37 + 13) % 100), y: ((i * 53 + 7) % 100), size: (i % 3) + 1.5, delay: i * 0.3,
  }));

  return (
    <AbsoluteFill style={{ background: DARK, fontFamily: "'Inter', sans-serif" }}>
      {/* Background slideshow */}
      {bgImages.map((img, i) => (
        <div key={i} style={{
          position: 'absolute', inset: 0,
          opacity: bgCycle === i ? 1 : 0,
          transition: 'opacity 2s',
        }}>
          <Img src={staticFile(`images/${img}`)} style={{
            width: '100%', height: '100%', objectFit: 'cover',
            filter: 'brightness(0.25) contrast(1.3) saturate(0.7)',
            transform: `scale(${bgScale})`,
          }} />
        </div>
      ))}

      {/* Overlays */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(3,8,6,0.6) 0%,rgba(3,8,6,0.3) 35%,rgba(3,8,6,0.5) 65%,rgba(3,8,6,0.9) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 50% at 50% 50%,transparent 30%,rgba(3,8,6,0.7) 100%)' }} />

      {/* Gold border */}
      <div style={{ position: 'absolute', inset: 20, border: `1px solid ${GOLD_RAW}0.12)`, borderRadius: 4, zIndex: 5 }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent 5%,${GOLD_RAW}0.4) 30%,rgba(139,26,26,0.5) 50%,${GOLD_RAW}0.4) 70%,transparent 95%)`, zIndex: 6 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent 5%,${GOLD_RAW}0.4) 30%,rgba(139,26,26,0.5) 50%,${GOLD_RAW}0.4) 70%,transparent 95%)`, zIndex: 6 }} />

      {/* Particles */}
      {particles.map(p => <Particle key={p.id} {...p} frame={frame} />)}

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

        {/* Quote section */}
        <div style={{ position: 'absolute', textAlign: 'center', maxWidth: 750, padding: '0 48px', opacity: quoteFadeOut }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: `${GOLD_RAW}0.5)`, letterSpacing: 6, textTransform: 'uppercase', marginBottom: 24, opacity: headerOp }}>
            TENTARA NASIONAL INDONESIA — ANGKATAN DARAT
          </div>
          <p style={{ fontSize: 36, fontWeight: 300, color: 'rgba(255,255,255,0.92)', lineHeight: 1.7, fontStyle: 'italic', letterSpacing: 0.5 }}>
            <span style={{ opacity: line1Op }}>"Di setiap bencana, kami hadir pertama.</span>
            <br />
            <span style={{ opacity: line2Op }}>Di setiap ancaman, kami berdiri terdepan.</span>
            <br />
            <span style={{ opacity: line3Op, color: GOLD, fontWeight: 600 }}>Kami adalah prajurit rakyat."</span>
          </p>
          <div style={{ width: 80, height: 1, background: `linear-gradient(90deg,transparent,#B8860B,transparent)`, margin: '28px auto 20px', opacity: statsOp }} />
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.35)', letterSpacing: 4, fontWeight: 600, opacity: statsOp }}>
            400.000 PRAJURIT &nbsp;&middot;&nbsp; SATU TEKAD
          </p>
        </div>

        {/* Logo + SINAR reveal (appears after quote fades) */}
        <div style={{ opacity: logoOp, transform: `scale(${logoScale})`, marginBottom: 20 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', border: `1px solid ${GOLD_RAW}0.15)`, transform: `scale(${ringScale})` }} />
            <div style={{ position: 'absolute', width: 150, height: 150, borderRadius: '50%', border: `1px solid ${GOLD_RAW}0.06)` }} />
            <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle,${GOLD_RAW}0.1),transparent 70%)`, filter: 'blur(20px)' }} />
            <SinarMark size={110} />
          </div>
        </div>

        <div style={{ opacity: presentsOp }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center', marginBottom: 8 }}>
            <div style={{ width: 50, height: 1, background: `linear-gradient(90deg,transparent,${GOLD_RAW}0.5))` }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: `${GOLD_RAW}0.45)`, letterSpacing: 5 }}>TNI AD MEMPERSEMBAHKAN</span>
            <div style={{ width: 50, height: 1, background: `linear-gradient(90deg,${GOLD_RAW}0.5),transparent)` }} />
          </div>
        </div>

        <div style={{ opacity: sinarOp, transform: `translateY(${sinarY}px)` }}>
          <h1 style={{ fontSize: 84, fontWeight: 900, color: '#FFFFFF', letterSpacing: 18, lineHeight: 1, textShadow: `0 4px 60px ${GOLD_RAW}0.25), 0 0 120px ${GOLD_RAW}0.1)`, margin: 0, textAlign: 'center' }}>
            SINAR
          </h1>
        </div>

        <div style={{ opacity: tagOp }}>
          <p style={{ fontSize: 20, fontWeight: 600, color: GOLD, letterSpacing: 6, textTransform: 'uppercase', marginTop: 14, textAlign: 'center' }}>
            Sistem Informasi Narasi Aktif Rakyat
          </p>
        </div>
      </div>

      {/* Corner markers */}
      <div style={{ position: 'absolute', top: 32, left: 40, zIndex: 10 }}>
        <p style={{ fontSize: 8, fontWeight: 700, color: `${GOLD_RAW}0.2)`, letterSpacing: 3, margin: 0 }}>RAHASIA</p>
      </div>
      <div style={{ position: 'absolute', top: 32, right: 40, zIndex: 10 }}>
        <p style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.12)', letterSpacing: 3, margin: 0 }}>DISPENAD</p>
      </div>
      <div style={{ position: 'absolute', bottom: 32, left: 40, zIndex: 10 }}>
        <p style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.12)', letterSpacing: 3, margin: 0 }}>TNI AD</p>
      </div>
      <div style={{ position: 'absolute', bottom: 32, right: 40, zIndex: 10 }}>
        <p style={{ fontSize: 8, fontWeight: 700, color: `${GOLD_RAW}0.2)`, letterSpacing: 3, margin: 0 }}>2026</p>
      </div>
    </AbsoluteFill>
  );
};

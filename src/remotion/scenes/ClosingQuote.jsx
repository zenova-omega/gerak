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
const BG_GRADIENT = 'linear-gradient(160deg, #0B2619, #1A1814)';
const OVERLAY = 'linear-gradient(180deg, #0B2619E6 0%, #1A1814CC 50%, #1A1814F2 100%)';
const BG_FILTER = 'brightness(0.15) contrast(1.2) saturate(0.3)';

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

export const ClosingQuote = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background images + Ken Burns
  const bgImages = ['splash-hero-soldiers.png', 'splash-hero-humanitarian.png', 'splash-hero-portrait.png', 'splash-hero-action.png'];
  const bgCycle = Math.floor(frame / 120) % 4;
  const bgScale = interpolate(frame, [0, 600], [1.05, 1.15], { extrapolateRight: 'clamp' });

  // === Phase 1 (0-140): Quote reveal ===
  const headerOp = interpolate(frame, [15, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const line1Op = interpolate(frame, [30, 45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const line2Op = interpolate(frame, [45, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const line3Op = interpolate(frame, [60, 75], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const statsOp = interpolate(frame, [90, 105], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const quoteFadeOut = interpolate(frame, [120, 140], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // === Phase 2 (150+): Logo + SINAR reveal ===
  const logoScale = spring({ frame: frame - 150, fps, config: { damping: 20, mass: 0.8 } });
  const logoOp = interpolate(frame, [150, 165], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const presentsOp = interpolate(frame, [170, 185], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sinarOp = interpolate(frame, [180, 195], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sinarY = interpolate(frame, [180, 195], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const tagOp = interpolate(frame, [210, 225], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: BG_GRADIENT, fontFamily: FONT }}>
      {/* Background slideshow with Ken Burns */}
      {bgImages.map((img, i) => (
        <div key={i} style={{
          position: 'absolute', inset: 0,
          opacity: bgCycle === i ? 1 : 0,
          transition: 'opacity 2s',
        }}>
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
        <span style={{ fontSize: 10, fontFamily: FONT_MONO, fontWeight: 600, color: TEXT_DIM, letterSpacing: 3 }}>CLOSING</span>
        <span style={{ fontSize: 10, fontFamily: FONT_MONO, fontWeight: 600, color: TEXT_DIM, letterSpacing: 3 }}>SINAR PITCH DECK</span>
      </div>

      {/* Bottom bar */}
      <div style={{ position: 'absolute', bottom: 32, left: 48, right: 48, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(90deg, #1B4332, #B8860B)' }} />
          <span style={{ fontSize: 11, fontFamily: FONT_MONO, fontWeight: 600, color: TEXT_DIM, letterSpacing: 1 }}>sinar.id</span>
        </div>
        <span style={{ fontSize: 11, fontFamily: FONT_MONO, fontWeight: 600, color: TEXT_DIM }}>09</span>
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

        {/* === Phase 1: Quote section === */}
        <div style={{ position: 'absolute', textAlign: 'center', maxWidth: 750, padding: '0 48px', opacity: quoteFadeOut }}>
          <div style={{
            fontSize: 11, fontFamily: FONT_MONO, fontWeight: 600, color: TEXT_DIM,
            letterSpacing: 5, textTransform: 'uppercase', marginBottom: 28, opacity: headerOp,
          }}>
            TENTARA NASIONAL INDONESIA — ANGKATAN DARAT
          </div>

          <p style={{ fontSize: 32, fontWeight: 300, color: '#FFFFFF', lineHeight: 1.8, fontStyle: 'italic', letterSpacing: 0.3, margin: 0 }}>
            <span style={{ opacity: line1Op }}>"Di setiap bencana, kami hadir pertama.</span>
            <br />
            <span style={{ opacity: line2Op }}>Di setiap ancaman, kami berdiri terdepan.</span>
            <br />
            <span style={{ opacity: line3Op, color: GOLD, fontWeight: 600 }}>Kami adalah prajurit rakyat."</span>
          </p>

          {/* Gradient line divider */}
          <div style={{
            width: 120, height: 2, margin: '32px auto 24px',
            background: 'linear-gradient(90deg, #1B4332, #B8860B)',
            opacity: statsOp,
          }} />

          <p style={{
            fontSize: 14, fontFamily: FONT_MONO, fontWeight: 600, color: TEXT_DIM,
            letterSpacing: 4, margin: 0, opacity: statsOp,
          }}>
            400.000 PRAJURIT &nbsp;&middot;&nbsp; SATU TEKAD
          </p>
        </div>

        {/* === Phase 2: Logo + SINAR reveal === */}
        <div style={{ opacity: logoOp, transform: `scale(${logoScale})`, marginBottom: 24 }}>
          <SinarMark size={110} />
        </div>

        <div style={{ opacity: presentsOp }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center', marginBottom: 12 }}>
            <div style={{ width: 40, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2))' }} />
            <span style={{ fontSize: 11, fontFamily: FONT_MONO, fontWeight: 600, color: TEXT_DIM, letterSpacing: 5 }}>
              TNI AD MEMPERSEMBAHKAN
            </span>
            <div style={{ width: 40, height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.2), transparent)' }} />
          </div>
        </div>

        <div style={{ opacity: sinarOp, transform: `translateY(${sinarY}px)` }}>
          <h1 style={{
            fontSize: 84, fontWeight: 900, color: '#FFFFFF', letterSpacing: 18,
            lineHeight: 1, margin: 0, textAlign: 'center', fontFamily: FONT,
          }}>
            SINAR
          </h1>
        </div>

        <div style={{ opacity: tagOp }}>
          <p style={{
            fontSize: 18, fontWeight: 600, color: GOLD, letterSpacing: 6,
            textTransform: 'uppercase', marginTop: 16, textAlign: 'center',
          }}>
            Sistem Informasi Narasi Aktif Rakyat
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};

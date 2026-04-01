import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from 'remotion';

/* ── SINAR Brand Colors ── */
const PRIMARY = '#1B4332';
const PRIMARY_DARK = '#0B2619';
const GOLD = '#B8860B';
const BLACK = '#1A1814';
const WHITE = '#FFFFFF';
const TEXT_DIM = 'rgba(255,255,255,0.45)';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const FONT = "'Inter', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";

const OVERLAY = 'linear-gradient(180deg, #0B2619E6 0%, #1A1814CC 50%, #1A1814F2 100%)';
const BG_FILTER = 'brightness(0.15) contrast(1.2) saturate(0.3)';

function SinarMark({ size = 110, opacity = 1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ opacity }}>
      <defs>
        <linearGradient id="csm2" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#14532D" />
          <stop offset="100%" stopColor="#1F7542" />
        </linearGradient>
        <linearGradient id="csr2" x1="20" y1="0" x2="20" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="csd2" x1="20" y1="0" x2="20" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#991B1B" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
      </defs>
      <path d="M20 3 L36 10 L36 22 C36 30 28 36 20 38 C12 36 4 30 4 22 L4 10 Z" fill="url(#csm2)" />
      <path d="M20 3 L36 10 L36 22 C36 30 28 36 20 38 C12 36 4 30 4 22 L4 10 Z" fill="white" opacity="0.06" />
      <path d="M20 3 L36 10 L4 10 Z" fill="url(#csd2)" opacity="0.6" />
      <path d="M20 13 L22 18 L20 17 L18 18 Z" fill="url(#csr2)" opacity="0.9" />
      <path d="M20 13 L24 20 L20 18.5 L16 20 Z" fill="url(#csr2)" opacity="0.5" />
      <circle cx="20" cy="22" r="4" fill="url(#csr2)" opacity="0.85" />
      <circle cx="20" cy="22" r="2" fill="white" opacity="0.4" />
      <path d="M14 26 L20 24 L26 26 L20 32 Z" fill="white" opacity="0.12" />
    </svg>
  );
}

export const ClosingQuoteV2 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgImages = ['splash-hero-soldiers.png', 'splash-hero-humanitarian.png', 'splash-hero-portrait.png', 'splash-hero-action.png'];
  const bgCycle = Math.floor(frame / 120) % 4;
  const bgScale = interpolate(frame, [0, 600], [1.05, 1.15], { extrapolateRight: 'clamp' });

  /* Phase 1: Quote */
  const headerOp = interpolate(frame, [15, 30], [0, 1], CLAMP);
  const line1Op = interpolate(frame, [30, 45], [0, 1], CLAMP);
  const line2Op = interpolate(frame, [45, 60], [0, 1], CLAMP);
  const line3Op = interpolate(frame, [60, 75], [0, 1], CLAMP);
  const statsOp = interpolate(frame, [90, 105], [0, 1], CLAMP);
  const quoteFadeOut = interpolate(frame, [120, 140], [1, 0], CLAMP);

  /* Phase 2: Logo reveal */
  const logoScale = spring({ frame: frame - 150, fps, config: { damping: 20, mass: 0.8 } });
  const logoOp = interpolate(frame, [150, 165], [0, 1], CLAMP);
  const presentsOp = interpolate(frame, [170, 185], [0, 1], CLAMP);
  const sinarOp = interpolate(frame, [180, 195], [0, 1], CLAMP);
  const sinarY = interpolate(frame, [180, 195], [20, 0], CLAMP);
  const tagOp = interpolate(frame, [210, 225], [0, 1], CLAMP);
  const lineW = interpolate(frame, [195, 220], [0, 200], CLAMP);

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${PRIMARY_DARK}, ${BLACK})`, fontFamily: FONT }}>
      {/* Background slideshow */}
      {bgImages.map((img, i) => (
        <div key={i} style={{
          position: 'absolute', inset: 0,
          opacity: bgCycle === i ? 1 : 0, transition: 'opacity 2s',
        }}>
          <Img src={staticFile(`images/${img}`)} style={{
            width: '100%', height: '100%', objectFit: 'cover',
            filter: BG_FILTER, transform: `scale(${bgScale})`,
          }} />
        </div>
      ))}

      {/* Overlay */}
      <div style={{ position: 'absolute', inset: 0, background: OVERLAY }} />

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 48, left: 80, right: 80,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        opacity: headerOp, zIndex: 20,
      }}>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2 }}>CLOSING</span>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2 }}>SINAR PLATFORM</span>
      </div>

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 10, width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Phase 1: Quote */}
        <div style={{ position: 'absolute', textAlign: 'center', maxWidth: 750, padding: '0 48px', opacity: quoteFadeOut }}>
          <div style={{
            fontSize: 11, fontFamily: FONT_MONO, fontWeight: 600, color: TEXT_DIM,
            letterSpacing: 5, textTransform: 'uppercase', marginBottom: 28, opacity: headerOp,
          }}>
            TENTARA NASIONAL INDONESIA &mdash; ANGKATAN DARAT
          </div>

          <p style={{ fontSize: 32, fontWeight: 300, color: WHITE, lineHeight: 1.8, fontStyle: 'italic', letterSpacing: 0.3, margin: 0 }}>
            <span style={{ opacity: line1Op }}>&ldquo;Di setiap bencana, kami hadir pertama.</span>
            <br />
            <span style={{ opacity: line2Op }}>Di setiap ancaman, kami berdiri terdepan.</span>
            <br />
            <span style={{ opacity: line3Op, color: GOLD, fontWeight: 600 }}>Kami adalah prajurit rakyat.&rdquo;</span>
          </p>

          {/* Gradient line */}
          <div style={{
            width: 120, height: 2, margin: '32px auto 24px',
            background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})`,
            opacity: statsOp,
          }} />

          <p style={{
            fontSize: 14, fontFamily: FONT_MONO, fontWeight: 600, color: TEXT_DIM,
            letterSpacing: 4, margin: 0, opacity: statsOp,
          }}>
            400.000 PRAJURIT &nbsp;&middot;&nbsp; SATU TEKAD
          </p>
        </div>

        {/* Phase 2: Logo + SINAR */}
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
            fontSize: 84, fontWeight: 900, color: WHITE, letterSpacing: 18,
            lineHeight: 1, margin: 0, textAlign: 'center', fontFamily: FONT,
          }}>
            SINAR
          </h1>
        </div>

        {/* Gradient accent line */}
        <div style={{
          width: lineW, height: 3, marginTop: 16,
          background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})`,
          borderRadius: 2, opacity: sinarOp,
        }} />

        <div style={{ opacity: tagOp }}>
          <p style={{
            fontSize: 18, fontWeight: 600, color: GOLD, letterSpacing: 6,
            textTransform: 'uppercase', marginTop: 16, textAlign: 'center',
          }}>
            Sistem Informasi Narasi Aktif Rakyat
          </p>
        </div>
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
        <span style={{ fontSize: 13, fontFamily: FONT_MONO, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>13</span>
      </div>
    </AbsoluteFill>
  );
};

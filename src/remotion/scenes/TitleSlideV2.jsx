import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from 'remotion';

/* ── SINAR Brand Colors ── */
const PRIMARY = '#1B4332';
const PRIMARY_DARK = '#0B2619';
const PRIMARY_ACCENT = '#2D6A4F';
const GOLD = '#B8860B';
const PATRIOT = '#8B1A1A';
const BLACK = '#1A1814';
const WHITE = '#FFFFFF';
const TEXT_DIM = 'rgba(255,255,255,0.45)';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const FONT = "'Inter', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";

/* SINAR shield logo */
function SinarMark({ size = 90, opacity = 1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ opacity }}>
      <defs>
        <linearGradient id="tsm" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#14532D" />
          <stop offset="100%" stopColor="#1F7542" />
        </linearGradient>
        <linearGradient id="tsr" x1="20" y1="0" x2="20" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="tsd" x1="20" y1="0" x2="20" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#991B1B" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
      </defs>
      <path d="M20 3 L36 10 L36 22 C36 30 28 36 20 38 C12 36 4 30 4 22 L4 10 Z" fill="url(#tsm)" />
      <path d="M20 3 L36 10 L36 22 C36 30 28 36 20 38 C12 36 4 30 4 22 L4 10 Z" fill="white" opacity="0.06" />
      <path d="M20 3 L36 10 L4 10 Z" fill="url(#tsd)" opacity="0.6" />
      <path d="M20 13 L22 18 L20 17 L18 18 Z" fill="url(#tsr)" opacity="0.9" />
      <path d="M20 13 L24 20 L20 18.5 L16 20 Z" fill="url(#tsr)" opacity="0.5" />
      <circle cx="20" cy="22" r="4" fill="url(#tsr)" opacity="0.85" />
      <circle cx="20" cy="22" r="2" fill="white" opacity="0.4" />
      <path d="M14 26 L20 24 L26 26 L20 32 Z" fill="white" opacity="0.12" />
    </svg>
  );
}

export const TitleSlideV2 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = interpolate(frame, [0, 20], [0, 1], CLAMP);
  const logoOp = interpolate(frame, [10, 30], [0, 1], CLAMP);
  const logoScale = spring({ frame: frame - 10, fps, config: { damping: 16, mass: 0.8 } });
  const lineW = interpolate(frame, [25, 55], [0, 160], CLAMP);
  const titleOp = interpolate(frame, [30, 55], [0, 1], CLAMP);
  const titleY = interpolate(frame, [30, 55], [20, 0], CLAMP);
  const descOp = interpolate(frame, [55, 80], [0, 1], CLAMP);
  const descY = interpolate(frame, [55, 80], [15, 0], CLAMP);
  const metaOp = interpolate(frame, [80, 105], [0, 1], CLAMP);
  const bgScale = interpolate(frame, [0, 600], [1.05, 1.15], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${PRIMARY_DARK}, ${BLACK})`, fontFamily: FONT }}>
      {/* Background image */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
        <Img
          src={staticFile('images/pres-hero-digital-soldiers.jpg')}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            filter: 'brightness(0.25) contrast(1.2) saturate(0.6)',
            transform: `scale(${bgScale})`,
          }}
        />
      </div>

      {/* Overlay gradients */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(11,38,25,0.7) 0%, rgba(11,38,25,0.3) 40%, rgba(26,24,20,0.6) 70%, rgba(26,24,20,0.9) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 50% 50%, transparent 30%, rgba(11,38,25,0.6) 100%)' }} />

      {/* Subtle glows */}
      <div style={{
        position: 'absolute', top: '30%', left: '50%', marginLeft: -300, width: 600, height: 600,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(184,134,11,0.06), transparent 70%)',
        filter: 'blur(80px)',
      }} />

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 48, left: 80, right: 80,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        opacity: headerOp, zIndex: 20,
      }}>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2 }}>PRESENTASI</span>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2 }}>RAHASIA</span>
      </div>

      {/* Main content — centered */}
      <div style={{
        position: 'relative', zIndex: 10, width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '0 80px',
      }}>
        {/* Logo */}
        <div style={{ opacity: logoOp, transform: `scale(${logoScale})`, marginBottom: 20 }}>
          <SinarMark size={90} />
        </div>

        {/* Gradient accent line */}
        <div style={{
          width: lineW, height: 3, marginBottom: 28,
          background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})`,
          borderRadius: 2,
        }} />

        {/* Title */}
        <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, textAlign: 'center' }}>
          <h1 style={{
            fontSize: 52, fontWeight: 900, color: WHITE,
            lineHeight: 1.2, margin: 0, letterSpacing: 1,
          }}>
            Satu Komando,<br />
            <span style={{
              background: `linear-gradient(90deg, ${PRIMARY_ACCENT}, ${GOLD})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Jutaan Jangkauan
            </span>
          </h1>
        </div>

        {/* Description */}
        <div style={{ opacity: descOp, transform: `translateY(${descY}px)`, textAlign: 'center', marginTop: 20 }}>
          <p style={{
            fontSize: 20, color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.7, margin: 0, maxWidth: 700,
          }}>
            Platform digital untuk mengorganisir dan memobilisasi prajurit beserta{' '}
            <strong style={{ color: GOLD }}>Keluarga Besar TNI</strong>{' '}
            dalam membangun{' '}
            <strong style={{ color: WHITE }}>narasi positif secara nasional</strong>
          </p>
        </div>

        {/* Subtitle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 40, opacity: metaOp }}>
          <div style={{ width: 40, height: 1, background: 'linear-gradient(90deg, transparent, rgba(184,134,11,0.3))' }} />
          <span style={{ fontSize: 13, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 4, fontWeight: 600 }}>DISPENAD TNI AD</span>
          <div style={{ width: 40, height: 1, background: 'linear-gradient(90deg, rgba(184,134,11,0.3), transparent)' }} />
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
        <span style={{ fontSize: 13, fontFamily: FONT_MONO, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>00</span>
      </div>
    </AbsoluteFill>
  );
};

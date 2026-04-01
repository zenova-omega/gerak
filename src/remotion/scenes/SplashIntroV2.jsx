import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';

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

export const SplashIntroV2 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleReveal = interpolate(frame, [15, 50], [0, 1], CLAMP);
  const accentLine = interpolate(frame, [40, 70], [0, 1], CLAMP);
  const subtitleOp = interpolate(frame, [60, 90], [0, 1], CLAMP);
  const subtitleY = interpolate(frame, [60, 90], [20, 0], CLAMP);
  const metaOp = interpolate(frame, [90, 120], [0, 1], CLAMP);
  const ctaOp = interpolate(frame, [140, 170], [0, 1], CLAMP);

  const letters = 'SINAR'.split('');

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${PRIMARY_DARK}, ${BLACK})`, fontFamily: FONT }}>
      {/* Subtle brand glow — top right */}
      <div
        style={{
          position: 'absolute',
          top: -200,
          right: -100,
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(27,67,50,0.15), transparent 70%)`,
          filter: 'blur(80px)',
        }}
      />
      {/* Gold glow — bottom left */}
      <div
        style={{
          position: 'absolute',
          bottom: -200,
          left: -100,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(184,134,11,0.08), transparent 70%)`,
          filter: 'blur(80px)',
        }}
      />

      {/* Top bar */}
      <div
        style={{
          position: 'absolute',
          top: 48,
          left: 80,
          right: 80,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          opacity: metaOp,
          zIndex: 10,
        }}
      >
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2 }}>
          PRESENTASI
        </span>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2 }}>
          RAHASIA
        </span>
      </div>

      {/* Main content */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 80px',
        }}
      >
        {/* Hero title */}
        <div style={{ display: 'flex', gap: 6 }}>
          {letters.map((letter, i) => {
            const delay = i * 4;
            const letterOp = interpolate(frame, [15 + delay, 35 + delay], [0, 1], CLAMP);
            const letterY = interpolate(frame, [15 + delay, 35 + delay], [30, 0], CLAMP);
            return (
              <span
                key={i}
                style={{
                  fontSize: 160,
                  fontWeight: 900,
                  fontFamily: FONT,
                  color: WHITE,
                  letterSpacing: 20,
                  lineHeight: 1,
                  opacity: letterOp,
                  transform: `translateY(${letterY}px)`,
                  display: 'inline-block',
                }}
              >
                {letter}
              </span>
            );
          })}
        </div>

        {/* Gradient accent line — brand green to gold */}
        <div
          style={{
            width: interpolate(accentLine, [0, 1], [0, 200]),
            height: 3,
            background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})`,
            marginTop: 28,
            marginBottom: 28,
            borderRadius: 2,
          }}
        />

        {/* Subtitle */}
        <div style={{ opacity: subtitleOp, transform: `translateY(${subtitleY}px)` }}>
          <p
            style={{
              fontSize: 22,
              fontWeight: 400,
              fontFamily: FONT,
              color: 'rgba(255,255,255,0.65)',
              letterSpacing: 1,
              textAlign: 'center',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Sistem Informasi Narasi Aktif Rakyat
          </p>
        </div>

        {/* Meta info row */}
        <div style={{ display: 'flex', gap: 48, marginTop: 52, opacity: metaOp }}>
          {[
            { label: 'Presented by', value: 'TNI AD' },
            { label: 'Division', value: 'DISPENAD' },
            { label: 'Date', value: 'Q1 2026' },
          ].map((item, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 11, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 4px' }}>
                {item.label}
              </p>
              <p style={{ fontSize: 16, fontWeight: 600, fontFamily: FONT, color: WHITE, margin: 0 }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 48,
          left: 80,
          right: 80,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          opacity: ctaOp,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: `linear-gradient(135deg, ${PRIMARY}, ${GOLD})` }} />
          <span style={{ fontSize: 13, fontFamily: FONT, color: TEXT_DIM, fontWeight: 500 }}>
            sinar.id
          </span>
        </div>
        <span style={{ fontSize: 13, fontFamily: FONT_MONO, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>
          01
        </span>
      </div>
    </AbsoluteFill>
  );
};

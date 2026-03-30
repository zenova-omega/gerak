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
const RED = '#8B1A1A';

/* SINAR shield logo — inline SVG */
function SinarMark({ size = 110, opacity = 1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ opacity }}>
      <defs>
        <linearGradient id="sm" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#14532D" />
          <stop offset="100%" stopColor="#1F7542" />
        </linearGradient>
        <linearGradient id="sr" x1="20" y1="0" x2="20" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="sd" x1="20" y1="0" x2="20" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#991B1B" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
      </defs>
      <path d="M20 3 L36 10 L36 22 C36 30 28 36 20 38 C12 36 4 30 4 22 L4 10 Z" fill="url(#sm)" />
      <path d="M20 3 L36 10 L36 22 C36 30 28 36 20 38 C12 36 4 30 4 22 L4 10 Z" fill="white" opacity="0.06" />
      <path d="M20 3 L36 10 L4 10 Z" fill="url(#sd)" opacity="0.6" />
      <path d="M20 13 L22 18 L20 17 L18 18 Z" fill="url(#sr)" opacity="0.9" />
      <path d="M20 13 L24 20 L20 18.5 L16 20 Z" fill="url(#sr)" opacity="0.5" />
      <circle cx="20" cy="22" r="4" fill="url(#sr)" opacity="0.85" />
      <circle cx="20" cy="22" r="2" fill="white" opacity="0.4" />
      <path d="M14 26 L20 24 L26 26 L20 32 Z" fill="white" opacity="0.12" />
    </svg>
  );
}

/* Floating particle */
function Particle({ x, y, size, delay, frame }) {
  const drift = Math.sin((frame + delay * 30) * 0.02) * 20;
  const floatY = Math.cos((frame + delay * 30) * 0.015) * 15;
  const opacity = interpolate(
    (frame + delay * 30) % 300,
    [0, 50, 250, 300],
    [0, 0.25, 0.25, 0],
  );
  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `${GOLD_RAW}0.3)`,
        transform: `translate(${drift}px, ${floatY}px)`,
        opacity,
      }}
    />
  );
}

export const SplashIntro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timeline (in frames at 30fps):
  // 0-18  (0.0-0.6s): Black
  // 18-135 (0.6-4.5s): Quote fades in
  // 135-150 (4.5-5.0s): Quote fades out, logo begins
  // 150-195 (5.0-6.5s): Logo + title reveal
  // 195-270 (6.5-9.0s): Tagline + subtitle
  // 270-360 (9.0-12.0s): CTA + full reveal

  // Background image crossfade (cycle every 4 seconds = 120 frames)
  const bgCycle = Math.floor(frame / 120) % 4;
  const bgImages = [
    'splash-hero-soldiers.png',
    'splash-hero-humanitarian.png',
    'splash-hero-portrait.png',
    'splash-hero-action.png',
  ];

  // Quote phase
  const quoteOpacity = interpolate(frame, [18, 48, 120, 135], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const quoteY = interpolate(frame, [18, 48], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Logo — appears early (no quote to wait for)
  const logoScale = spring({ frame: frame - 20, fps, config: { damping: 15, mass: 0.8 } });
  const logoOpacity = interpolate(frame, [20, 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Title "SINAR"
  const titleOpacity = interpolate(frame, [40, 70], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleY = interpolate(frame, [40, 70], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Tagline
  const tagOpacity = interpolate(frame, [80, 110], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tagY = interpolate(frame, [80, 110], [15, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Subtitle "TNI AD"
  const subOpacity = interpolate(frame, [100, 130], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // CTA
  const ctaOpacity = interpolate(frame, [150, 180], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Decorative ring pulse
  const ringScale = interpolate(frame % 150, [0, 75, 150], [1, 1.08, 1]);
  const ringOpacity = interpolate(frame % 150, [0, 75, 150], [0.1, 0.2, 0.1]);

  // Ken Burns — slow zoom on background
  const bgScale = interpolate(frame, [0, 360], [1.05, 1.15], {
    extrapolateRight: 'clamp',
  });

  // Particles
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: ((i * 37 + 13) % 100),
    y: ((i * 53 + 7) % 100),
    size: (i % 3) + 1.5,
    delay: i * 0.3,
  }));

  return (
    <AbsoluteFill style={{ background: DARK, fontFamily: "'Inter', sans-serif" }}>
      {/* Background slideshow with Ken Burns */}
      {bgImages.map((img, i) => {
        const thisOpacity = interpolate(
          frame % 120,
          [0, 15, 105, 120],
          bgCycle === i ? [1, 1, 1, 0.3] : [0, 0, 0, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        );
        const showThis = bgCycle === i || (bgCycle + 1) % 4 === i;
        if (!showThis) return null;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: bgCycle === i ? 1 : interpolate(frame % 120, [105, 120], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }}
          >
            <Img
              src={staticFile(`images/${img}`)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'brightness(0.3) contrast(1.3) saturate(0.7)',
                transform: `scale(${bgScale})`,
              }}
            />
          </div>
        );
      })}

      {/* Gradient overlays */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg,rgba(3,8,6,0.6) 0%,rgba(3,8,6,0.3) 35%,rgba(3,8,6,0.5) 65%,rgba(3,8,6,0.9) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 70% 50% at 50% 50%,transparent 30%,rgba(3,8,6,0.7) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 40% 30% at 50% 50%,${GOLD_RAW}0.04),transparent 70%)`,
        }}
      />

      {/* Gold border frame */}
      <div
        style={{
          position: 'absolute',
          inset: 20,
          border: `1px solid ${GOLD_RAW}0.12)`,
          borderRadius: 4,
          zIndex: 5,
        }}
      />
      {/* Top accent line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg,transparent 5%,${GOLD_RAW}0.4) 30%,rgba(139,26,26,0.5) 50%,${GOLD_RAW}0.4) 70%,transparent 95%)`,
          zIndex: 6,
        }}
      />
      {/* Bottom accent line */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg,transparent 5%,${GOLD_RAW}0.4) 30%,rgba(139,26,26,0.5) 50%,${GOLD_RAW}0.4) 70%,transparent 95%)`,
          zIndex: 6,
        }}
      />

      {/* Floating particles */}
      {particles.map((p) => (
        <Particle key={p.id} {...p} frame={frame} />
      ))}

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
        }}
      >
        {/* Logo Reveal — immediate, no quote phase */}
        <div
          style={{
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Decorative rings */}
            <div
              style={{
                position: 'absolute',
                width: 180,
                height: 180,
                borderRadius: '50%',
                border: `1px solid ${GOLD_RAW}${ringOpacity})`,
                transform: `scale(${ringScale})`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                width: 150,
                height: 150,
                borderRadius: '50%',
                border: `1px solid ${GOLD_RAW}0.06)`,
              }}
            />
            {/* Golden glow */}
            <div
              style={{
                position: 'absolute',
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: `radial-gradient(circle,${GOLD_RAW}0.1),transparent 70%)`,
                filter: 'blur(20px)',
              }}
            />
            <SinarMark size={110} opacity={logoOpacity} />
          </div>
        </div>

        {/* Title "SINAR" */}
        <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
          <div style={{ textAlign: 'center' }}>
            <h1
              style={{
                fontSize: 72,
                fontWeight: 900,
                color: '#FFFFFF',
                letterSpacing: 18,
                lineHeight: 1,
                textShadow: `0 4px 60px ${GOLD_RAW}0.25), 0 0 120px ${GOLD_RAW}0.1)`,
                margin: 0,
              }}
            >
              SINAR
            </h1>
          </div>
        </div>

        {/* Tagline */}
        <div style={{ opacity: tagOpacity, transform: `translateY(${tagY}px)` }}>
          <p
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: GOLD,
              letterSpacing: 6,
              textTransform: 'uppercase',
              marginTop: 14,
              textAlign: 'center',
            }}
          >
            Sistem Informasi Narasi Aktif Rakyat
          </p>
        </div>

        {/* Subtitle */}
        <div style={{ opacity: subOpacity }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              marginTop: 24,
            }}
          >
            <div
              style={{
                width: 50,
                height: 1,
                background: 'linear-gradient(90deg,transparent,rgba(139,26,26,0.4))',
              }}
            />
            <p
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: 4,
                fontWeight: 500,
                margin: 0,
              }}
            >
              TNI AD
            </p>
            <div
              style={{
                width: 50,
                height: 1,
                background: 'linear-gradient(90deg,rgba(139,26,26,0.4),transparent)',
              }}
            />
          </div>
        </div>

        {/* CTA text */}
        <div style={{ opacity: ctaOpacity, marginTop: 56 }}>
          <div
            style={{
              padding: '16px 48px',
              borderRadius: 4,
              border: `1px solid ${GOLD_RAW}0.35)`,
              background: `linear-gradient(135deg,${GOLD_RAW}0.12),rgba(139,26,26,0.08))`,
              backdropFilter: 'blur(12px)',
            }}
          >
            <span
              style={{
                color: GOLD,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 4,
                textTransform: 'uppercase',
              }}
            >
              MULAI PRESENTASI &nbsp;&rarr;
            </span>
          </div>
          <p
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.18)',
              marginTop: 20,
              textAlign: 'center',
              letterSpacing: 2,
            }}
          >
            TEKAN SPACE ATAU ENTER UNTUK MELANJUTKAN
          </p>
        </div>
      </div>

      {/* Corner markers */}
      <div style={{ position: 'absolute', top: 32, left: 40, zIndex: 10 }}>
        <p style={{ fontSize: 8, fontWeight: 700, color: `${GOLD_RAW}0.2)`, letterSpacing: 3, margin: 0 }}>
          RAHASIA
        </p>
      </div>
      <div style={{ position: 'absolute', top: 32, right: 40, zIndex: 10 }}>
        <p style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.12)', letterSpacing: 3, margin: 0 }}>
          DISPENAD
        </p>
      </div>
      <div style={{ position: 'absolute', bottom: 32, left: 40, zIndex: 10 }}>
        <p style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.12)', letterSpacing: 3, margin: 0 }}>
          TNI AD
        </p>
      </div>
      <div style={{ position: 'absolute', bottom: 32, right: 40, zIndex: 10 }}>
        <p style={{ fontSize: 8, fontWeight: 700, color: `${GOLD_RAW}0.2)`, letterSpacing: 3, margin: 0 }}>
          2026
        </p>
      </div>
    </AbsoluteFill>
  );
};

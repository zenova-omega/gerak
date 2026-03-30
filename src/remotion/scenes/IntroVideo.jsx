import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';

const GOLD = '#D4A843';
const GOLD_RAW = 'rgba(212,168,67,';
const DARK = '#050E09';
const DARK2 = '#030806';
const RED = '#8B1A1A';
const RED_BRIGHT = '#EF4444';
const GREEN = '#14532D';
const GREEN_BRIGHT = '#4ADE80';
const FONT = "'Inter', sans-serif";
const MONO = "'JetBrains Mono', monospace";

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };

/* ─── SINAR shield logo ─── */
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

/* ─── Gold floating particle ─── */
function Particle({ x, y, size, delay, frame }) {
  const drift = Math.sin((frame + delay * 30) * 0.02) * 20;
  const floatY = Math.cos((frame + delay * 30) * 0.015) * 15;
  const opacity = interpolate(
    (frame + delay * 30) % 300,
    [0, 50, 250, 300],
    [0, 0.3, 0.3, 0],
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
        background: `${GOLD_RAW}0.35)`,
        transform: `translate(${drift}px, ${floatY}px)`,
        opacity,
      }}
    />
  );
}

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 3 + Math.random() * 5,
  delay: i * 0.7,
}));

/* ─── Subtitle overlay ─── */
function Subtitle({ text, frame, startFrame, endFrame }) {
  const fadeIn = interpolate(frame, [startFrame, startFrame + 10], [0, 1], CLAMP);
  const fadeOut = interpolate(frame, [endFrame - 10, endFrame], [1, 0], CLAMP);
  const opacity = fadeIn * fadeOut;
  if (opacity <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        opacity,
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: 12,
          padding: '12px 32px',
          maxWidth: 1200,
          textAlign: 'center',
        }}
      >
        <span
          style={{
            color: '#fff',
            fontSize: 20,
            fontWeight: 600,
            fontFamily: FONT,
            lineHeight: 1.5,
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
}

/* ─── Scene 1: Hook — The Problem (frames 0-90) ─── */
function Scene1({ frame, fps }) {
  const fadeOut = interpolate(frame, [75, 90], [1, 0], CLAMP);

  const statScale = spring({ frame, fps, from: 0, to: 1, config: { damping: 10, stiffness: 100 } });
  const subTextOp = interpolate(frame, [20, 35], [0, 1], CLAMP);

  // Red glow pulse
  const glowIntensity = 0.15 + Math.sin(frame * 0.08) * 0.05;

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      {/* Dark bg with red glow */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, rgba(139,26,26,${glowIntensity}) 0%, ${DARK} 70%)`,
        }}
      />

      {/* Center content */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${statScale})`,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 160,
            fontWeight: 900,
            fontFamily: MONO,
            color: RED_BRIGHT,
            lineHeight: 1,
            textShadow: `0 0 40px ${RED_BRIGHT}, 0 0 80px rgba(239,68,68,0.3)`,
          }}
        >
          6&times;
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            fontFamily: FONT,
            color: '#fff',
            marginTop: 16,
            opacity: subTextOp,
          }}
        >
          Hoaks Menyebar Lebih Cepat dari Fakta
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 400,
            fontFamily: FONT,
            color: 'rgba(255,255,255,0.6)',
            marginTop: 12,
            opacity: subTextOp,
          }}
        >
          60%+ warga Indonesia akses berita via sosial media
        </div>
      </div>

      <Subtitle
        text="Di era digital, citra positif kalah cepat dari sentimen negatif."
        frame={frame}
        startFrame={0}
        endFrame={90}
      />
    </AbsoluteFill>
  );
}

/* ─── Scene 2: Solution — SINAR (frames 90-210) ─── */
function Scene2({ frame, fps }) {
  const localFrame = frame - 90;
  const sceneOpacity = interpolate(frame, [90, 100, 195, 210], [0, 1, 1, 0], CLAMP);

  const logoScale = spring({
    frame: localFrame,
    fps,
    from: 0,
    to: 1,
    config: { damping: 12, stiffness: 80 },
  });

  const textOp = interpolate(localFrame, [15, 30], [0, 1], CLAMP);
  const subtitleOp = interpolate(localFrame, [25, 40], [0, 1], CLAMP);

  // Decorative rings
  const ring1 = interpolate(localFrame, [0, 40], [0, 1], CLAMP);
  const ring2 = interpolate(localFrame, [10, 50], [0, 1], CLAMP);
  const ringRotation = localFrame * 0.3;

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      <AbsoluteFill style={{ background: DARK2 }} />

      {/* Gold particles */}
      {PARTICLES.map((p, i) => (
        <Particle key={i} {...p} frame={frame} />
      ))}

      {/* Center content */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Decorative rings */}
        <div style={{ position: 'relative', width: 200, height: 200 }}>
          <div
            style={{
              position: 'absolute',
              inset: -20,
              border: `2px solid ${GOLD}`,
              borderRadius: '50%',
              opacity: ring1 * 0.3,
              transform: `rotate(${ringRotation}deg)`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: -40,
              border: `1px solid ${GOLD}`,
              borderRadius: '50%',
              opacity: ring2 * 0.15,
              transform: `rotate(${-ringRotation * 0.7}deg)`,
            }}
          />

          {/* Golden glow behind logo */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 180,
              height: 180,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(212,168,67,0.25) 0%, transparent 70%)`,
              opacity: logoScale,
            }}
          />

          {/* Logo */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) scale(${logoScale})`,
            }}
          >
            <SinarMark size={140} />
          </div>
        </div>

        {/* SINAR text */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            fontFamily: FONT,
            color: '#fff',
            letterSpacing: 18,
            marginTop: 24,
            opacity: textOp,
          }}
        >
          SINAR
        </div>

        {/* Subtitle text */}
        <div
          style={{
            fontSize: 18,
            fontWeight: 500,
            fontFamily: FONT,
            color: GOLD,
            letterSpacing: 4,
            marginTop: 12,
            opacity: subtitleOp,
          }}
        >
          SISTEM INFORMASI NARASI AKTIF RAKYAT
        </div>
      </div>

      <Subtitle
        text="SINAR hadir — platform yang menggerakkan 400 ribu prajurit dan Keluarga Besar TNI serentak."
        frame={frame}
        startFrame={90}
        endFrame={210}
      />
    </AbsoluteFill>
  );
}

/* ─── Scene 3: How It Works (frames 210-330) ─── */
function Scene3({ frame, fps }) {
  const localFrame = frame - 210;
  const sceneOpacity = interpolate(frame, [210, 220, 315, 330], [0, 1, 1, 0], CLAMP);

  const steps = [
    { icon: '\u{1F4E1}', label: 'Misi dari Komando', bg: GREEN },
    { icon: '\u{1F4F1}', label: '400K Prajurit Bergerak', bg: GOLD },
    { icon: '\u{1F680}', label: 'Viral ke Seluruh Indonesia', bg: RED },
  ];

  const socialIcons = ['IG', 'YT', 'TT', 'X'];

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      <AbsoluteFill style={{ background: DARK2 }} />

      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 40,
        }}
      >
        {steps.map((step, i) => {
          const stagger = i * 20; // 20 frames apart (~0.67s)
          const slideIn = spring({
            frame: Math.max(0, localFrame - stagger),
            fps,
            from: 0,
            to: 1,
            config: { damping: 12, stiffness: 80 },
          });
          const translateX = interpolate(slideIn, [0, 1], [-80, 0], CLAMP);

          // Arrow between steps
          const arrowOp = i < 2
            ? interpolate(localFrame, [stagger + 15, stagger + 25], [0, 1], CLAMP)
            : 0;

          return (
            <React.Fragment key={i}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  opacity: slideIn,
                  transform: `translateX(${translateX}px)`,
                }}
              >
                {/* Circle icon */}
                <div
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    background: step.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 44,
                    boxShadow: `0 0 30px ${step.bg}44`,
                  }}
                >
                  {step.icon}
                </div>
                {/* Label */}
                <div
                  style={{
                    marginTop: 16,
                    fontSize: 18,
                    fontWeight: 600,
                    fontFamily: FONT,
                    color: '#fff',
                    textAlign: 'center',
                    maxWidth: 180,
                    lineHeight: 1.3,
                  }}
                >
                  {step.label}
                </div>

                {/* Social media cards flying out from step 3 */}
                {i === 2 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -30,
                      right: -40,
                      display: 'flex',
                      gap: 8,
                    }}
                  >
                    {socialIcons.map((icon, j) => {
                      const cardDelay = 60 + j * 6;
                      const cardOp = interpolate(localFrame, [cardDelay, cardDelay + 12], [0, 1], CLAMP);
                      const cardY = interpolate(localFrame, [cardDelay, cardDelay + 12], [20, 0], CLAMP);
                      const cardX = interpolate(localFrame, [cardDelay, cardDelay + 12], [0, (j - 1.5) * 20], CLAMP);
                      return (
                        <div
                          key={j}
                          style={{
                            opacity: cardOp,
                            transform: `translate(${cardX}px, ${cardY}px)`,
                            background: 'rgba(255,255,255,0.12)',
                            backdropFilter: 'blur(4px)',
                            borderRadius: 6,
                            padding: '4px 8px',
                            fontSize: 12,
                            fontWeight: 700,
                            fontFamily: MONO,
                            color: GOLD,
                            border: '1px solid rgba(255,255,255,0.1)',
                          }}
                        >
                          {icon}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Arrow */}
              {i < 2 && (
                <div
                  style={{
                    fontSize: 32,
                    color: GOLD,
                    opacity: arrowOp,
                    fontFamily: FONT,
                    marginBottom: 40,
                  }}
                >
                  &rarr;
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <Subtitle
        text="Satu instruksi, jutaan jangkauan."
        frame={frame}
        startFrame={210}
        endFrame={330}
      />
    </AbsoluteFill>
  );
}

/* ─── Scene 4: Impact + CTA (frames 330-450) ─── */
function Scene4({ frame, fps }) {
  const localFrame = frame - 330;
  const sceneOpacity = interpolate(frame, [330, 340, 450, 450], [0, 1, 1, 1], CLAMP);

  // Counter tick-up
  const counterProgress = interpolate(localFrame, [0, 60], [0, 16], CLAMP);
  const counterText = `${counterProgress.toFixed(1)}M+`;

  const textOp = interpolate(localFrame, [20, 35], [0, 1], CLAMP);
  const logoOp = interpolate(localFrame, [40, 55], [0, 1], CLAMP);

  // Gold border
  const borderOp = interpolate(localFrame, [10, 30], [0, 1], CLAMP);

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      <AbsoluteFill style={{ background: DARK }} />

      {/* Gold border frame */}
      <div
        style={{
          position: 'absolute',
          inset: 24,
          border: `2px solid ${GOLD}`,
          borderRadius: 8,
          opacity: borderOp * 0.5,
          pointerEvents: 'none',
        }}
      />

      {/* Center content */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Counter */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            fontFamily: MONO,
            color: GOLD,
            lineHeight: 1,
            textShadow: `0 0 40px ${GOLD}, 0 0 80px rgba(212,168,67,0.3)`,
          }}
        >
          {counterText}
        </div>

        {/* Label */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            fontFamily: FONT,
            color: '#fff',
            letterSpacing: 6,
            marginTop: 16,
            opacity: textOp,
          }}
        >
          JANGKAUAN NASIONAL
        </div>

        {/* Logo + footer */}
        <div
          style={{
            marginTop: 60,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            opacity: logoOp,
          }}
        >
          <SinarMark size={60} />
          <div
            style={{
              fontSize: 16,
              fontWeight: 500,
              fontFamily: FONT,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: 3,
              marginTop: 12,
            }}
          >
            TNI AD &middot; DISPENAD &middot; 2026
          </div>
        </div>
      </div>

      <Subtitle
        text="SINAR — narasi positif dimulai dari kita."
        frame={frame}
        startFrame={330}
        endFrame={450}
      />
    </AbsoluteFill>
  );
}

/* ─── Main composition ─── */
export const IntroVideo = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: DARK, fontFamily: FONT }}>
      {/* Scene 1: Hook (0-90) */}
      {frame < 90 && <Scene1 frame={frame} fps={fps} />}

      {/* Scene 2: SINAR reveal (90-210) */}
      {frame >= 85 && frame < 215 && <Scene2 frame={frame} fps={fps} />}

      {/* Scene 3: How it works (210-330) */}
      {frame >= 205 && frame < 335 && <Scene3 frame={frame} fps={fps} />}

      {/* Scene 4: Impact + CTA (330-450) */}
      {frame >= 325 && <Scene4 frame={frame} fps={fps} />}
    </AbsoluteFill>
  );
};

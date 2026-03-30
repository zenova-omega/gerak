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
const GREEN = '#14532D';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };

const MISSIONS = [
  {
    type: 'EVENT',
    color: '#6D28D9',
    icon: '📅',
    title: 'Kehadiran & Partisipasi',
    example: 'Upacara HUT TNI, Gotong Royong, Rally',
    xp: 200,
  },
  {
    type: 'KONTEN',
    color: '#14532D',
    icon: '🎬',
    title: 'Buat Konten Original',
    example: 'Video dokumenter, Foto liputan, Infografis',
    xp: 300,
  },
  {
    type: 'ENGAGEMENT',
    color: '#C2410C',
    icon: '👍',
    title: 'Like, Share & Comment',
    example: 'Like & share konten positif TNI AD di semua platform',
    xp: 100,
  },
  {
    type: 'EDUKASI',
    color: '#1A1814',
    icon: '🎓',
    title: 'Distribusi Materi',
    example: 'Distribusi materi ke grup WhatsApp & komunitas',
    xp: 250,
  },
  {
    type: 'AKSI',
    color: '#B8860B',
    icon: '✊',
    title: 'Aksi Lapangan',
    example: 'Door-to-door, petisi, rekrutmen relawan',
    xp: 400,
  },
];

function MissionCard({ mission, frame, fps, index }) {
  const startFrame = 40 + index * 25;

  const appear = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.8 },
  });

  const translateY = interpolate(appear, [0, 1], [60, 0], CLAMP);
  const opacity = interpolate(appear, [0, 1], [0, 1], CLAMP);

  // Glow pulse after all cards are in
  const glowOpacity = interpolate(
    frame,
    [300, 340],
    [0, 0.15],
    CLAMP,
  );

  return (
    <div
      style={{
        width: 350,
        borderRadius: 14,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderLeft: `4px solid ${mission.color}`,
        borderTop: `3px solid ${mission.color}`,
        overflow: 'hidden',
        transform: `translateY(${translateY}px)`,
        opacity,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${mission.color}${Math.round(glowOpacity * 255).toString(16).padStart(2, '0')}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '20px 18px',
        position: 'relative',
      }}
    >
      {/* Icon + Type Badge row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28, lineHeight: 1 }}>{mission.icon}</span>
        <span
          style={{
            background: mission.color,
            color: '#fff',
            fontSize: 13,
            fontWeight: 800,
            fontFamily: "'JetBrains Mono', monospace",
            padding: '4px 12px',
            borderRadius: 20,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          {mission.type}
        </span>
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: '#fff',
          fontFamily: "'Inter', sans-serif",
          lineHeight: 1.3,
        }}
      >
        {mission.title}
      </div>

      {/* Description / Example */}
      <div
        style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.55)',
          fontFamily: "'Inter', sans-serif",
          lineHeight: 1.5,
        }}
      >
        {mission.example}
      </div>

    </div>
  );
}

export const MissionTypes = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Title fade-in (0-60) ──
  const titleOpacity = interpolate(frame, [0, 40], [0, 1], CLAMP);
  const titleY = interpolate(frame, [0, 40], [24, 0], CLAMP);

  const labelOpacity = interpolate(frame, [10, 50], [0, 1], CLAMP);
  const labelY = interpolate(frame, [10, 50], [16, 0], CLAMP);

  // ── Subtitle (300-420) ──
  const subtitleOpacity = interpolate(frame, [300, 360], [0, 1], CLAMP);
  const subtitleY = interpolate(frame, [300, 360], [20, 0], CLAMP);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 30%, #0C1A10 0%, ${DARK} 70%)`,
        fontFamily: "'Inter', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '48px 60px',
      }}
    >
      {/* Section label */}
      <div
        style={{
          opacity: labelOpacity,
          transform: `translateY(${labelY}px)`,
          fontSize: 16,
          fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
          color: GOLD,
          letterSpacing: 3,
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        MISI TERSTRUKTUR
      </div>

      {/* Title */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontSize: 48,
          fontWeight: 900,
          color: '#fff',
          letterSpacing: -0.5,
          marginBottom: 40,
          textAlign: 'center',
        }}
      >
        5 Tipe Misi{' '}
        <span style={{ color: GOLD }}>SINAR</span>
      </div>

      {/* Cards grid: 3 top + 2 bottom centered */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          width: '100%',
        }}
      >
        {/* Top row — 3 cards */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 20,
          }}
        >
          {MISSIONS.slice(0, 3).map((m, i) => (
            <MissionCard
              key={m.type}
              mission={m}
              frame={frame}
              fps={fps}
              index={i}
            />
          ))}
        </div>

        {/* Bottom row — 2 cards centered */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 20,
          }}
        >
          {MISSIONS.slice(3).map((m, i) => (
            <MissionCard
              key={m.type}
              mission={m}
              frame={frame}
              fps={fps}
              index={i + 3}
            />
          ))}
        </div>
      </div>

      {/* Subtitle */}
      <div
        style={{
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
          fontSize: 18,
          color: 'rgba(255,255,255,0.6)',
          fontWeight: 500,
          marginTop: 32,
          textAlign: 'center',
          letterSpacing: 0.3,
        }}
      >
        Setiap misi dirancang untuk dampak maksimal
      </div>
    </AbsoluteFill>
  );
};

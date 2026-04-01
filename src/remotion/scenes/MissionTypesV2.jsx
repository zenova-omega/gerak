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
const PRIMARY_ACCENT = '#2D6A4F';
const GOLD = '#B8860B';
const PATRIOT = '#8B1A1A';
const PURPLE = '#6D28D9';
const ORANGE = '#C2410C';
const BLACK = '#1A1814';
const WHITE = '#FFFFFF';
const BG = '#F5F3EE';
const TEXT_SEC = '#3D3929';
const TEXT_MUTED = '#6B6555';
const BORDER = '#DDD9D0';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const FONT = "'Inter', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";

const MISSIONS = [
  { type: 'EVENT', color: PURPLE, title: 'Kehadiran & Partisipasi', example: 'Upacara HUT TNI, Gotong Royong, Rally', xp: 200, code: '01' },
  { type: 'KONTEN', color: PRIMARY, title: 'Buat Konten Original', example: 'Video dokumenter, Foto liputan, Infografis', xp: 300, code: '02' },
  { type: 'ENGAGEMENT', color: ORANGE, title: 'Like, Share & Comment', example: 'Like & share konten positif TNI AD di semua platform', xp: 100, code: '03' },
  { type: 'EDUKASI', color: BLACK, title: 'Distribusi Materi', example: 'Distribusi materi ke grup WhatsApp & komunitas', xp: 250, code: '04' },
  { type: 'AKSI', color: GOLD, title: 'Aksi Lapangan', example: 'Door-to-door, petisi, rekrutmen relawan', xp: 400, code: '05' },
];

function MissionCard({ mission, frame, fps, index }) {
  const startFrame = 30 + index * 12;
  const appear = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 22, stiffness: 100, mass: 0.8 },
  });
  const translateY = interpolate(appear, [0, 1], [30, 0], CLAMP);
  const opacity = interpolate(appear, [0, 1], [0, 1], CLAMP);

  return (
    <div
      style={{
        width: 340,
        background: WHITE,
        border: `1px solid ${BORDER}`,
        overflow: 'hidden',
        transform: `translateY(${translateY}px)`,
        opacity,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '24px 22px',
        position: 'relative',
      }}
    >
      {/* Top: code + type + xp */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28, fontWeight: 800, fontFamily: FONT, color: '#E8E4DB', lineHeight: 1 }}>
            {mission.code}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              fontFamily: FONT_MONO,
              color: mission.color,
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            {mission.type}
          </span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: FONT_MONO, color: PRIMARY_ACCENT }}>
          +{mission.xp} XP
        </span>
      </div>

      {/* Title */}
      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: FONT, color: BLACK, lineHeight: 1.3 }}>
        {mission.title}
      </div>

      {/* Description */}
      <div style={{ fontSize: 13, color: TEXT_MUTED, fontFamily: FONT, lineHeight: 1.6 }}>
        {mission.example}
      </div>

      {/* Bottom gradient line — green to gold */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: 2,
          background: `linear-gradient(90deg, ${mission.color}, ${mission.color}66)`,
        }}
      />
    </div>
  );
}

export const MissionTypesV2 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelOp = interpolate(frame, [5, 20], [0, 1], CLAMP);
  const titleOp = interpolate(frame, [10, 35], [0, 1], CLAMP);
  const titleY = interpolate(frame, [10, 35], [20, 0], CLAMP);
  const lineW = interpolate(frame, [20, 50], [0, 80], CLAMP);
  const subtitleOp = interpolate(frame, [160, 190], [0, 1], CLAMP);

  return (
    <AbsoluteFill
      style={{
        background: BG,
        fontFamily: FONT,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 80px',
      }}
    >
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
          opacity: labelOp,
        }}
      >
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_MUTED, letterSpacing: 2 }}>
          MISI TERSTRUKTUR
        </span>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_MUTED, letterSpacing: 2 }}>
          SINAR PLATFORM
        </span>
      </div>

      {/* Title */}
      <div
        style={{
          opacity: titleOp,
          transform: `translateY(${titleY}px)`,
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        <h2 style={{ fontSize: 52, fontWeight: 900, fontFamily: FONT, color: BLACK, margin: 0, lineHeight: 1.2 }}>
          5 Tipe Misi{' '}
          <span
            style={{
              background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            SINAR
          </span>
        </h2>
      </div>

      {/* Gradient line */}
      <div
        style={{
          width: lineW,
          height: 3,
          background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})`,
          borderRadius: 2,
          marginBottom: 36,
        }}
      />

      {/* Cards grid */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          {MISSIONS.slice(0, 3).map((m, i) => (
            <MissionCard key={m.type} mission={m} frame={frame} fps={fps} index={i} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          {MISSIONS.slice(3).map((m, i) => (
            <MissionCard key={m.type} mission={m} frame={frame} fps={fps} index={i + 3} />
          ))}
        </div>
      </div>

      {/* Subtitle */}
      <div
        style={{
          opacity: subtitleOp,
          fontSize: 16,
          fontFamily: FONT,
          color: TEXT_SEC,
          fontWeight: 400,
          marginTop: 28,
          textAlign: 'center',
        }}
      >
        Setiap misi dirancang untuk dampak maksimal terhadap narasi positif
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
          opacity: labelOp,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: `linear-gradient(135deg, ${PRIMARY}, ${GOLD})` }} />
          <span style={{ fontSize: 13, fontFamily: FONT, color: TEXT_MUTED, fontWeight: 500 }}>sinar.id</span>
        </div>
        <span style={{ fontSize: 13, fontFamily: FONT_MONO, color: '#C4C0B8', letterSpacing: 1 }}>08</span>
      </div>
    </AbsoluteFill>
  );
};

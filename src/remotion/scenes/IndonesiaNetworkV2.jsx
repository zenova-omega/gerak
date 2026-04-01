import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { ComposableMap, Geographies, Geography, Marker, Line } from 'react-simple-maps';

/* ── SINAR Brand Colors ── */
const PRIMARY = '#1B4332';
const PRIMARY_DARK = '#0B2619';
const PRIMARY_ACCENT = '#2D6A4F';
const GOLD = '#B8860B';
const BLACK = '#1A1814';
const WHITE = '#FFFFFF';
const TEXT_DIM = 'rgba(255,255,255,0.45)';
const TEXT_MID = 'rgba(255,255,255,0.6)';
const BORDER = 'rgba(255,255,255,0.08)';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const FONT = "'Inter', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const KODAMS = [
  { city: 'Jakarta', coords: [106.845, -6.208], agents: 48200, status: 'hot' },
  { city: 'Bandung', coords: [107.619, -6.917], agents: 38100, status: 'hot' },
  { city: 'Semarang', coords: [110.420, -6.966], agents: 35400, status: 'warm' },
  { city: 'Surabaya', coords: [112.751, -7.250], agents: 41200, status: 'hot' },
  { city: 'Medan', coords: [98.672, 3.595], agents: 28700, status: 'warm' },
  { city: 'Palembang', coords: [104.746, -2.991], agents: 22300, status: 'warm' },
  { city: 'Pontianak', coords: [109.343, -0.026], agents: 18600, status: 'cool' },
  { city: 'Manado', coords: [124.842, 1.455], agents: 15200, status: 'cool' },
  { city: 'Makassar', coords: [119.432, -5.148], agents: 24800, status: 'warm' },
  { city: 'Ambon', coords: [128.174, -3.694], agents: 8400, status: 'cool' },
  { city: 'Jayapura', coords: [140.718, -2.537], agents: 12100, status: 'cool' },
  { city: 'Bali', coords: [115.219, -8.650], agents: 19500, status: 'warm' },
  { city: 'Aceh', coords: [95.322, 5.548], agents: 14200, status: 'cool' },
  { city: 'Balikpapan', coords: [116.831, -1.238], agents: 16900, status: 'warm' },
];

const connections = [
  [0, 1], [1, 2], [2, 3], [0, 5], [4, 5], [5, 6], [6, 13],
  [2, 11], [3, 11], [8, 7], [8, 9], [9, 10], [13, 8],
];

const statusColor = (s) => ({ hot: '#EF4444', warm: '#F59E0B', cool: '#22C55E' }[s] || '#22C55E');

export const IndonesiaNetworkV2 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = interpolate(frame, [0, 20], [0, 1], CLAMP);
  const titleOp = interpolate(frame, [5, 30], [0, 1], CLAMP);
  const titleY = interpolate(frame, [5, 30], [20, 0], CLAMP);
  const mapOp = interpolate(frame, [10, 35], [0, 1], CLAMP);
  const formulaOp = interpolate(frame, [150, 180], [0, 1], CLAMP);
  const formulaY = interpolate(frame, [150, 180], [20, 0], CLAMP);

  const totalProgress = interpolate(frame, [160, 210], [0, 1], CLAMP);
  const totalEased = 1 - Math.pow(1 - totalProgress, 3);
  const totalReach = Math.floor(totalEased * 16000000);

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${PRIMARY_DARK}, ${BLACK})`, fontFamily: FONT }}>
      {/* Subtle glow */}
      <div style={{
        position: 'absolute', top: -200, left: '50%', marginLeft: -300, width: 600, height: 600,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(27,67,50,0.1), transparent 70%)',
        filter: 'blur(80px)',
      }} />

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 48, left: 80, right: 80,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        opacity: headerOp, zIndex: 30,
      }}>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2 }}>MULTIPLIER EFFECT</span>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2 }}>SINAR PLATFORM</span>
      </div>

      {/* Title */}
      <div style={{
        position: 'absolute', top: 90, left: 80, right: 80,
        opacity: titleOp, transform: `translateY(${titleY}px)`, zIndex: 20,
      }}>
        <h2 style={{ fontSize: 48, fontWeight: 900, color: WHITE, margin: 0, lineHeight: 1.1 }}>
          Jaringan{' '}
          <span style={{
            background: `linear-gradient(90deg, ${PRIMARY_ACCENT}, ${GOLD})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Nasional
          </span>{' '}SINAR
        </h2>
      </div>

      {/* Map */}
      <div style={{ position: 'absolute', top: 140, bottom: 200, left: 0, right: 0, opacity: mapOp }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ center: [118, -2.5], scale: 1200 }}
          width={1920} height={700}
          style={{ width: '100%', height: '100%' }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies
                .filter((geo) => geo.properties.name === 'Indonesia')
                .map((geo) => (
                  <Geography key={geo.rsmKey} geography={geo}
                    fill="rgba(27,67,50,0.08)" stroke="rgba(27,67,50,0.3)" strokeWidth={0.8}
                    style={{ default: { outline: 'none' }, hover: { outline: 'none' }, pressed: { outline: 'none' } }}
                  />
                ))
            }
          </Geographies>

          {connections.map(([a, b], i) => {
            const lineOp = interpolate(frame, [40 + i * 4, 55 + i * 4], [0, 0.3], CLAMP);
            return (
              <Line key={i} from={KODAMS[a].coords} to={KODAMS[b].coords}
                stroke={GOLD} strokeWidth={1} strokeOpacity={lineOp} strokeLinecap="round" />
            );
          })}

          {KODAMS.map((k, i) => {
            const delay = i * 6;
            const dotAppear = spring({ frame: frame - 25 - delay, fps, config: { damping: 20, mass: 0.6 } });
            const color = statusColor(k.status);
            const dotSize = k.status === 'hot' ? 8 : k.status === 'warm' ? 6 : 4;
            const countStart = 60 + delay;
            const countProgress = interpolate(frame, [countStart, countStart + 35], [0, 1], CLAMP);
            const count = Math.floor((1 - Math.pow(1 - countProgress, 3)) * k.agents);
            const labelOp = interpolate(frame, [50 + delay, 65 + delay], [0, 1], CLAMP);
            const pulseScale = k.status === 'hot' ? interpolate(frame % 50, [0, 25, 50], [1, 1.8, 1]) : 1;
            const pulseOp = k.status === 'hot' ? interpolate(frame % 50, [0, 25, 50], [0.4, 0.08, 0.4]) : 0;

            return (
              <Marker key={i} coordinates={k.coords}>
                {k.status === 'hot' && (
                  <circle r={dotSize * pulseScale} fill="none" stroke={color} strokeWidth={1} opacity={pulseOp * dotAppear} />
                )}
                <circle r={dotSize} fill={color} opacity={dotAppear} />
                <g opacity={labelOp * dotAppear}>
                  <text textAnchor="middle" y={dotSize + 14}
                    style={{ fontSize: 13, fontWeight: 700, fill: 'rgba(255,255,255,0.75)', fontFamily: FONT }}>
                    {k.city}
                  </text>
                  <text textAnchor="middle" y={dotSize + 28}
                    style={{ fontSize: 13, fontWeight: 600, fill: color, fontFamily: FONT_MONO }}>
                    {count > 0 ? count.toLocaleString() : ''}
                  </text>
                </g>
              </Marker>
            );
          })}
        </ComposableMap>
      </div>

      {/* Vignette */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 90% 70% at 50% 45%, transparent 40%, rgba(11,38,25,0.7) 100%)', pointerEvents: 'none' }} />

      {/* Bottom formula */}
      <div style={{
        position: 'absolute', bottom: 90, left: 80, right: 80,
        textAlign: 'center', opacity: formulaOp, transform: `translateY(${formulaY}px)`, zIndex: 20,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 28, padding: '20px 44px',
          background: 'rgba(0,0,0,0.3)', border: `1px solid ${BORDER}`,
        }}>
          {[
            { value: '400K', label: 'Prajurit', color: GOLD },
            { value: '\u00D74', label: 'KBT', color: '#22C55E' },
            { value: '\u00D710+', label: 'Jaringan', color: '#60A5FA' },
            { value: '\u00D737', label: 'Kodam', color: '#F59E0B' },
          ].map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.12)' }}>&rarr;</span>}
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 36, fontWeight: 900, color: item.color, fontFamily: FONT_MONO, lineHeight: 1, margin: 0 }}>{item.value}</p>
                <p style={{ fontSize: 12, color: TEXT_DIM, margin: '4px 0 0', fontWeight: 600, letterSpacing: 1 }}>{item.label}</p>
              </div>
            </React.Fragment>
          ))}
          <div style={{ width: 1, height: 40, background: BORDER, margin: '0 6px' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: TEXT_DIM, margin: 0, fontWeight: 600, letterSpacing: 1, fontFamily: FONT_MONO }}>Potensi Jangkauan</p>
            <span style={{
              fontSize: 48, fontWeight: 900,
              background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              fontFamily: FONT_MONO,
            }}>
              {totalReach > 0 ? `${(totalReach / 1000000).toFixed(1)}M+` : '0'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        position: 'absolute', bottom: 48, left: 80, right: 80,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        opacity: headerOp, zIndex: 30,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: `linear-gradient(135deg, ${PRIMARY}, ${GOLD})` }} />
          <span style={{ fontSize: 13, fontFamily: FONT, color: TEXT_DIM, fontWeight: 500 }}>sinar.id</span>
        </div>
        <span style={{ fontSize: 13, fontFamily: FONT_MONO, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>05</span>
      </div>
    </AbsoluteFill>
  );
};

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { ComposableMap, Geographies, Geography, Marker, Line } from 'react-simple-maps';

/* ── Design Tokens ── */
const BG_GRADIENT = 'linear-gradient(160deg, #0B2619, #1A1814)';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_DIM = 'rgba(255,255,255,0.45)';
const TEXT_MID = 'rgba(255,255,255,0.6)';
const GREEN_PRIMARY = '#1B4332';
const GREEN_ACCENT = '#2D6A4F';
const GOLD = '#B8860B';
const GRADIENT_ACCENT = 'linear-gradient(90deg, #1B4332, #B8860B)';
const FONT = "'Inter', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

/* Real geographic coordinates [longitude, latitude] */
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

export const IndonesiaNetwork = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = interpolate(frame, [0, 25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, 25], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const mapOp = interpolate(frame, [10, 35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const formulaOp = interpolate(frame, [150, 180], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const formulaY = interpolate(frame, [150, 180], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const totalProgress = interpolate(frame, [160, 210], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const totalEased = 1 - Math.pow(1 - totalProgress, 3);
  const totalReach = Math.floor(totalEased * 16000000);

  return (
    <AbsoluteFill style={{ background: BG_GRADIENT, fontFamily: FONT }}>

      {/* ── Top Bar ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 80px', zIndex: 30,
      }}>
        <span style={{ fontSize: 11, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2, textTransform: 'uppercase' }}>
          Multiplier Effect
        </span>
        <span style={{ fontSize: 11, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2, textTransform: 'uppercase' }}>
          National Network
        </span>
      </div>

      {/* Title */}
      <div style={{ position: 'absolute', top: 45, left: 80, right: 80, textAlign: 'left', opacity: titleOp, transform: `translateY(${titleY}px)`, zIndex: 20 }}>
        <h2 style={{ fontSize: 44, fontWeight: 800, color: TEXT_PRIMARY, margin: 0 }}>
          Jaringan{' '}
          <span style={{ background: GRADIENT_ACCENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Nasional
          </span>{' '}
          SINAR
        </h2>
      </div>

      {/* Map — react-simple-maps with real coordinates */}
      <div style={{ position: 'absolute', top: 100, bottom: 160, left: 0, right: 0, opacity: mapOp }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ center: [118, -2.5], scale: 1200 }}
          width={1920}
          height={820}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Indonesia geography */}
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies
                .filter((geo) => geo.properties.name === 'Indonesia')
                .map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="rgba(27,67,50,0.08)"
                    stroke="rgba(27,67,50,0.3)"
                    strokeWidth={0.8}
                    style={{ default: { outline: 'none' }, hover: { outline: 'none' }, pressed: { outline: 'none' } }}
                  />
                ))
            }
          </Geographies>

          {/* Connection lines */}
          {connections.map(([a, b], i) => {
            const lineOp = interpolate(frame, [40 + i * 4, 55 + i * 4], [0, 0.3], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            });
            return (
              <Line
                key={i}
                from={KODAMS[a].coords}
                to={KODAMS[b].coords}
                stroke={GOLD}
                strokeWidth={1}
                strokeOpacity={lineOp}
                strokeLinecap="round"
              />
            );
          })}

          {/* KODAM markers */}
          {KODAMS.map((k, i) => {
            const delay = i * 6;
            const dotAppear = spring({ frame: frame - 25 - delay, fps, config: { damping: 20, mass: 0.6 } });
            const color = statusColor(k.status);
            const dotSize = k.status === 'hot' ? 8 : k.status === 'warm' ? 6 : 4;

            const countStart = 60 + delay;
            const countProgress = interpolate(frame, [countStart, countStart + 35], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            });
            const count = Math.floor((1 - Math.pow(1 - countProgress, 3)) * k.agents);

            const labelOp = interpolate(frame, [50 + delay, 65 + delay], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            });

            const pulseScale = k.status === 'hot'
              ? interpolate(frame % 50, [0, 25, 50], [1, 1.8, 1])
              : 1;
            const pulseOp = k.status === 'hot'
              ? interpolate(frame % 50, [0, 25, 50], [0.4, 0.08, 0.4])
              : 0;

            return (
              <Marker key={i} coordinates={k.coords}>
                {/* Pulse ring */}
                {k.status === 'hot' && (
                  <circle r={dotSize * pulseScale} fill="none" stroke={color} strokeWidth={1} opacity={pulseOp * dotAppear} />
                )}
                {/* Main dot */}
                <circle r={dotSize} fill={color} opacity={dotAppear} />
                {/* City label */}
                <g opacity={labelOp * dotAppear}>
                  <text
                    textAnchor="middle"
                    y={dotSize + 14}
                    style={{ fontSize: 13, fontWeight: 700, fill: 'rgba(255,255,255,0.75)', fontFamily: FONT }}
                  >
                    {k.city}
                  </text>
                  <text
                    textAnchor="middle"
                    y={dotSize + 28}
                    style={{ fontSize: 13, fontWeight: 600, fill: color, fontFamily: FONT_MONO }}
                  >
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
      <div style={{ position: 'absolute', bottom: 50, left: 80, right: 80, textAlign: 'center', opacity: formulaOp, transform: `translateY(${formulaY}px)`, zIndex: 20 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 28, padding: '24px 48px',
          borderRadius: 12, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {[
            { value: '400K', label: 'Prajurit', color: GOLD },
            { value: '\u00D74', label: 'Keluarga Besar TNI (KBT)', color: '#22C55E' },
            { value: '\u00D710+', label: 'Jaringan', color: '#60A5FA' },
            { value: '\u00D737', label: 'Kodam', color: '#F59E0B' },
          ].map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.15)' }}>&rarr;</span>}
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 40, fontWeight: 900, color: item.color, fontFamily: FONT_MONO, lineHeight: 1, margin: 0 }}>{item.value}</p>
                <p style={{ fontSize: 14, color: TEXT_DIM, margin: '4px 0 0', fontWeight: 600, letterSpacing: 1 }}>{item.label}</p>
              </div>
            </React.Fragment>
          ))}
          <div style={{ width: 1, height: 44, background: 'rgba(255,255,255,0.08)', margin: '0 6px' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: TEXT_DIM, margin: 0, fontWeight: 600, letterSpacing: 1, fontFamily: FONT_MONO }}>Potensi Jangkauan</p>
            <span style={{ fontSize: 56, fontWeight: 900, background: GRADIENT_ACCENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: FONT_MONO }}>
              {totalReach > 0 ? `${(totalReach / 1000000).toFixed(1)}M+` : '0'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 80px', zIndex: 30,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: GRADIENT_ACCENT }} />
          <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 1 }}>sinar.id</span>
        </div>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_DIM }}>03</span>
      </div>

    </AbsoluteFill>
  );
};

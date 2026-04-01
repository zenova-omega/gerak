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
const PURPLE = '#6D28D9';
const ORANGE = '#C2410C';
const TEAL = '#0F766E';
const BLACK = '#1A1814';
const WHITE = '#FFFFFF';
const TEXT_DIM = 'rgba(255,255,255,0.4)';
const TEXT_MID = 'rgba(255,255,255,0.6)';
const BORDER = 'rgba(255,255,255,0.08)';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const FONT = "'Inter', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";

/* ── Hero Number ── */
function HeroNumber({ value, label, frame, startFrame, color = WHITE }) {
  const appear = spring({ frame: frame - startFrame, fps: 30, config: { damping: 20 } });
  const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
  const displayNum = numericValue
    ? Math.floor(numericValue * appear).toLocaleString()
    : value;

  return (
    <div style={{ opacity: appear, transform: `translateY(${(1 - appear) * 20}px)` }}>
      <span style={{ fontSize: 72, fontWeight: 900, fontFamily: FONT, color, lineHeight: 1 }}>
        {displayNum}
      </span>
      <p style={{ fontSize: 13, fontFamily: FONT, color: TEXT_DIM, margin: '8px 0 0', fontWeight: 500, maxWidth: 200, lineHeight: 1.4 }}>
        {label}
      </p>
    </div>
  );
}

/* ── Horizontal bar ── */
function HBar({ label, value, maxValue, color, frame, startFrame }) {
  const progress = interpolate(frame, [startFrame, startFrame + 20], [0, 1], CLAMP);
  const eased = 1 - Math.pow(1 - progress, 3);
  const width = (value / maxValue) * 100 * eased;
  const displayVal = Math.floor(value * eased);

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 500, fontFamily: FONT, color: TEXT_MID }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: FONT_MONO, color: WHITE }}>{displayVal}%</span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${width}%`, background: `linear-gradient(90deg, ${color}, ${color}99)`, borderRadius: 3 }} />
      </div>
    </div>
  );
}

/* ── Donut chart ── */
function DonutChart({ segments, size = 150, strokeWidth = 14, frame, startFrame }) {
  const progress = interpolate(frame, [startFrame, startFrame + 30], [0, 1], CLAMP);
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} />
      {segments.map((seg, i) => {
        const segLen = circumference * seg.pct * progress;
        const el = (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${segLen} ${circumference}`}
            strokeDashoffset={-offset * progress}
            strokeLinecap="round"
            opacity={interpolate(frame, [startFrame + i * 4, startFrame + i * 4 + 8], [0, 1], CLAMP)}
          />
        );
        offset += circumference * seg.pct;
        return el;
      })}
    </svg>
  );
}

export const DemographicsV2 = () => {
  const frame = useCurrentFrame();

  const headerOp = interpolate(frame, [0, 20], [0, 1], CLAMP);
  const headerY = interpolate(frame, [0, 20], [16, 0], CLAMP);

  /* ── DATA ── */
  const userTypes = [
    { label: 'Prajurit Aktif', pct: 0.25, color: PRIMARY, count: '400K' },
    { label: 'Istri (KBT)', pct: 0.22, color: TEAL, count: '350K' },
    { label: 'Anak (KBT)', pct: 0.50, color: PURPLE, count: '800K' },
    { label: 'Suami (KBT)', pct: 0.03, color: GOLD, count: '50K' },
  ];

  const ageGroups = [
    { label: '13-17 (Remaja)', value: 15, color: '#A78BFA' },
    { label: '18-25 (Muda)', value: 28, color: PURPLE },
    { label: '26-35 (Produktif)', value: 30, color: PRIMARY_ACCENT },
    { label: '36-45 (Senior)', value: 18, color: GOLD },
    { label: '46-55', value: 7, color: ORANGE },
    { label: '55+', value: 2, color: PATRIOT },
  ];

  const regions = [
    { label: 'Jawa', value: 45, color: PRIMARY },
    { label: 'Sumatera', value: 22, color: GOLD },
    { label: 'Kalimantan', value: 10, color: TEAL },
    { label: 'Sulawesi', value: 8, color: PURPLE },
    { label: 'Bali & NTT', value: 5, color: ORANGE },
    { label: 'Papua & Maluku', value: 5, color: '#A78BFA' },
    { label: 'Lainnya', value: 5, color: '#6B6555' },
  ];

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${PRIMARY_DARK}, ${BLACK})`, fontFamily: FONT }}>
      {/* Subtle glow */}
      <div
        style={{
          position: 'absolute',
          bottom: -300,
          left: -200,
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(27,67,50,0.12), transparent 70%)`,
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
          opacity: headerOp,
          zIndex: 20,
        }}
      >
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2 }}>
          DEMOGRAFI PENGGUNA
        </span>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2 }}>
          SINAR PLATFORM
        </span>
      </div>

      {/* Hero section */}
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: 80,
          right: 80,
          opacity: headerOp,
          transform: `translateY(${headerY}px)`,
          zIndex: 20,
        }}
      >
        <h2 style={{ fontSize: 48, fontWeight: 900, fontFamily: FONT, color: WHITE, margin: 0, lineHeight: 1.1 }}>
          <span
            style={{
              background: `linear-gradient(90deg, ${PRIMARY_ACCENT}, ${GOLD})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            1.6 Juta
          </span>
          {' '}Pengguna
        </h2>
      </div>

      {/* Hero numbers row */}
      <div style={{ position: 'absolute', top: 185, left: 80, right: 80, display: 'flex', gap: 60, zIndex: 20 }}>
        <HeroNumber value="1600000" label="Total pengguna dari seluruh Indonesia" frame={frame} startFrame={15} color={WHITE} />
        <HeroNumber value="400000" label="Prajurit aktif TNI AD" frame={frame} startFrame={25} color={PRIMARY_ACCENT} />
        <HeroNumber value="1200000" label="Keluarga Besar TNI (KBT)" frame={frame} startFrame={35} color={GOLD} />
      </div>

      {/* Bottom section — 3 columns */}
      <div style={{ position: 'absolute', top: 370, bottom: 80, left: 80, right: 80, display: 'flex', gap: 32, zIndex: 20 }}>

        {/* LEFT — User type donut */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 11, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2, margin: 0 }}>TIPE AKUN</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ position: 'relative' }}>
              <DonutChart segments={userTypes} size={140} strokeWidth={14} frame={frame} startFrame={40} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{ fontSize: 22, fontWeight: 800, fontFamily: FONT_MONO, color: WHITE }}>1.6M</span>
                <span style={{ fontSize: 10, fontFamily: FONT_MONO, color: TEXT_DIM }}>TOTAL</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              {userTypes.map((t, i) => {
                const op = interpolate(frame, [50 + i * 5, 60 + i * 5], [0, 1], CLAMP);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, opacity: op }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: WHITE }}>{t.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: FONT_MONO, color: t.color }}>{t.count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: BORDER }} />

        {/* MIDDLE — Age distribution */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 11, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2, margin: 0 }}>DISTRIBUSI USIA</p>
          {ageGroups.map((g, i) => (
            <HBar key={i} label={g.label} value={g.value} maxValue={35} color={g.color} frame={frame} startFrame={55 + i * 6} />
          ))}
          <div style={{ marginTop: 8, padding: '12px 16px', borderLeft: `3px solid ${PRIMARY}`, background: 'rgba(27,67,50,0.08)' }}>
            <p style={{ fontSize: 13, color: TEXT_MID, margin: 0, lineHeight: 1.5 }}>
              <strong style={{ color: WHITE }}>50%+</strong> berusia di bawah 35 tahun — generasi digital native
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: BORDER }} />

        {/* RIGHT — Regional */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 11, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2, margin: 0 }}>SEBARAN WILAYAH</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ position: 'relative' }}>
              <DonutChart
                segments={regions.map(r => ({ pct: r.value / 100, color: r.color }))}
                size={120} strokeWidth={12} frame={frame} startFrame={75}
              />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{ fontSize: 18, fontWeight: 800, fontFamily: FONT_MONO, color: WHITE }}>15</span>
                <span style={{ fontSize: 9, fontFamily: FONT_MONO, color: TEXT_DIM }}>KODAM</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              {regions.map((r, i) => {
                const op = interpolate(frame, [80 + i * 4, 90 + i * 4], [0, 1], CLAMP);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, opacity: op }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: TEXT_MID, flex: 1 }}>{r.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: FONT_MONO, color: WHITE }}>{r.value}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Device split */}
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            {[
              { label: 'Android', value: '78%', color: PRIMARY_ACCENT },
              { label: 'iOS', value: '22%', color: TEXT_MID },
            ].map((d, i) => {
              const op = interpolate(frame, [120 + i * 8, 132 + i * 8], [0, 1], CLAMP);
              return (
                <div key={i} style={{ flex: 1, textAlign: 'center', padding: '10px', border: `1px solid ${BORDER}`, opacity: op }}>
                  <p style={{ fontSize: 24, fontWeight: 800, fontFamily: FONT_MONO, color: d.color, margin: 0 }}>{d.value}</p>
                  <p style={{ fontSize: 11, color: TEXT_DIM, margin: '4px 0 0' }}>{d.label}</p>
                </div>
              );
            })}
          </div>
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
          opacity: headerOp,
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: `linear-gradient(135deg, ${PRIMARY}, ${GOLD})` }} />
          <span style={{ fontSize: 13, fontFamily: FONT, color: TEXT_DIM, fontWeight: 500 }}>sinar.id</span>
        </div>
        <span style={{ fontSize: 13, fontFamily: FONT_MONO, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>06</span>
      </div>
    </AbsoluteFill>
  );
};

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

/* ── Animated donut chart ── */
function DonutChart({ segments, size = 180, strokeWidth = 20, frame, startFrame }) {
  const progress = interpolate(frame, [startFrame, startFrame + 60], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {/* Background ring */}
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} />
      {segments.map((seg, i) => {
        const segLen = circumference * seg.pct * progress;
        const dashOffset = circumference - offset * progress;
        const el = (
          <circle
            key={i}
            cx={size/2} cy={size/2} r={r}
            fill="none" stroke={seg.color} strokeWidth={strokeWidth}
            strokeDasharray={`${segLen} ${circumference}`}
            strokeDashoffset={-offset * progress}
            strokeLinecap="round"
            opacity={interpolate(frame, [startFrame + i * 8, startFrame + i * 8 + 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
          />
        );
        offset += circumference * seg.pct;
        return el;
      })}
    </svg>
  );
}

/* ── Horizontal bar ── */
function HBar({ label, value, maxValue, color, frame, startFrame, suffix = '%' }) {
  const barProgress = interpolate(frame, [startFrame, startFrame + 40], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const eased = 1 - Math.pow(1 - barProgress, 3);
  const width = (value / maxValue) * 100 * eased;
  const displayVal = Math.floor(value * eased);

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace" }}>{displayVal.toLocaleString()}{suffix}</span>
      </div>
      <div style={{ height: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${width}%`, background: `linear-gradient(90deg, ${color}, ${color}80)`, borderRadius: 4, transition: 'width 0.1s' }} />
      </div>
    </div>
  );
}

/* ── Stat card ── */
function StatCard({ icon, value, label, color, frame, startFrame }) {
  const appear = spring({ frame: frame - startFrame, fps: 30, config: { damping: 13 } });
  return (
    <div style={{
      opacity: appear, transform: `translateY(${(1 - appear) * 20}px)`,
      padding: '16px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${color}20`, textAlign: 'center', minWidth: 130,
    }}>
      <span style={{ fontSize: 26 }}>{icon}</span>
      <p style={{ fontSize: 36, fontWeight: 900, color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, margin: '6px 0 2px' }}>{value}</p>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0, fontWeight: 600 }}>{label}</p>
    </div>
  );
}

/* ── Platform usage mini bar ── */
function PlatformBar({ platform, pcts, frame, startFrame }) {
  const op = interpolate(frame, [startFrame, startFrame + 20], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const colors = { WA: '#25D366', IG: '#E1306C', TT: '#fff', YT: '#FF0000', FB: '#1877F2' };
  return (
    <div style={{ opacity: op, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: colors[platform] || '#fff', width: 28, textAlign: 'right' }}>{platform}</span>
      <div style={{ flex: 1, display: 'flex', gap: 2, height: 14 }}>
        {pcts.map((p, i) => {
          const barW = interpolate(frame, [startFrame + i * 5, startFrame + i * 5 + 25], [0, p.value], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          });
          return (
            <div key={i} style={{ width: `${barW}%`, height: '100%', background: p.color, borderRadius: 2, opacity: 0.8 }}
              title={p.label} />
          );
        })}
      </div>
    </div>
  );
}

export const Demographics = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = interpolate(frame, [0, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, 40], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  /* ── DATA ── */

  const userTypes = [
    { label: 'Prajurit Aktif', pct: 0.25, color: '#14532D', count: '400K', icon: '🎖️', desc: 'Laki-laki 95%, usia 18-55' },
    { label: 'Istri Prajurit', pct: 0.22, color: '#0F766E', count: '350K', icon: '👩', desc: 'Perempuan, usia 20-50' },
    { label: 'Anak Prajurit', pct: 0.50, color: '#6D28D9', count: '800K', icon: '👦', desc: 'Usia 13-25, digital native' },
    { label: 'Suami (Prajurit Wanita)', pct: 0.03, color: GOLD, count: '50K', icon: '👨', desc: 'Laki-laki, usia 22-55' },
  ];

  const ageGroups = [
    { label: '13-17 (Remaja)', value: 15, color: '#A78BFA' },
    { label: '18-25 (Muda)', value: 28, color: '#6D28D9' },
    { label: '26-35 (Produktif)', value: 30, color: '#14532D' },
    { label: '36-45 (Senior)', value: 18, color: GOLD },
    { label: '46-55', value: 7, color: '#FB923C' },
    { label: '55+', value: 2, color: '#8B1A1A' },
  ];

  const regions = [
    { label: 'Jawa (4 Kodam)', value: 45, color: '#EF4444' },
    { label: 'Sumatera (3 Kodam)', value: 22, color: '#F59E0B' },
    { label: 'Kalimantan (2 Kodam)', value: 10, color: '#14532D' },
    { label: 'Sulawesi (2 Kodam)', value: 8, color: '#0F766E' },
    { label: 'Bali & NTT (1 Kodam)', value: 5, color: '#6D28D9' },
    { label: 'Papua & Maluku (3 Kodam)', value: 5, color: GOLD },
    { label: 'Lainnya', value: 5, color: '#4B5563' },
  ];

  const platformByDemo = [
    { platform: 'WA', pcts: [{ value: 35, color: '#14532D', label: 'Prajurit' }, { value: 38, color: '#0F766E', label: 'Istri' }, { value: 12, color: '#6D28D9', label: 'Anak' }] },
    { platform: 'IG', pcts: [{ value: 18, color: '#14532D', label: 'Prajurit' }, { value: 30, color: '#0F766E', label: 'Istri' }, { value: 30, color: '#6D28D9', label: 'Anak' }] },
    { platform: 'TT', pcts: [{ value: 8, color: '#14532D', label: 'Prajurit' }, { value: 22, color: '#0F766E', label: 'Istri' }, { value: 32, color: '#6D28D9', label: 'Anak' }] },
    { platform: 'YT', pcts: [{ value: 25, color: '#14532D', label: 'Prajurit' }, { value: 18, color: '#0F766E', label: 'Istri' }, { value: 26, color: '#6D28D9', label: 'Anak' }] },
    { platform: 'FB', pcts: [{ value: 15, color: '#14532D', label: 'Prajurit' }, { value: 20, color: '#0F766E', label: 'Istri' }, { value: 5, color: '#6D28D9', label: 'Anak' }] },
  ];

  return (
    <AbsoluteFill style={{ background: DARK, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #030806, #081510, #030806)' }} />

      {/* Title */}
      <div style={{ position: 'absolute', top: 25, left: 0, right: 0, textAlign: 'center', opacity: titleOp, transform: `translateY(${titleY}px)`, zIndex: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'rgba(184,134,11,0.7)', letterSpacing: 6, marginBottom: 6 }}>
          DEMOGRAFI PENGGUNA
        </div>
        <h2 style={{ fontSize: 38, fontWeight: 800, color: '#fff', margin: 0 }}>
          <span style={{ color: GOLD }}>1.6 Juta</span> Pengguna dari <span style={{ color: '#4ADE80' }}>Seluruh Indonesia</span>
        </h2>
      </div>

      {/* Main content — 3-column layout */}
      <div style={{ position: 'absolute', top: 105, bottom: 30, left: 40, right: 40, display: 'flex', gap: 24 }}>

        {/* LEFT COLUMN — User Types + Donut */}
        <div style={{ flex: '0 0 380px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Total stat cards */}
          <div style={{ display: 'flex', gap: 8 }}>
            <StatCard icon="👥" value="1.6M" label="Total Pengguna" color={GOLD} frame={frame} startFrame={30} />
            <StatCard icon="🎖️" value="400K" label="Prajurit Aktif" color="#14532D" frame={frame} startFrame={45} />
            <StatCard icon="👨‍👩‍👧‍👦" value="1.2M" label="Keluarga" color="#0F766E" frame={frame} startFrame={60} />
          </div>

          {/* User type donut + legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ position: 'relative' }}>
              <DonutChart segments={userTypes} size={140} strokeWidth={16} frame={frame} startFrame={70} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>TIPE</span>
                <span style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>AKUN</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              {userTypes.map((t, i) => {
                const op = interpolate(frame, [80 + i * 10, 95 + i * 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, opacity: op }}>
                    <span style={{ fontSize: 16 }}>{t.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{t.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: t.color, fontFamily: "'JetBrains Mono'" }}>{t.count}</span>
                      </div>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{t.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Platform usage by demographic */}
          <div style={{ padding: '12px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.5)', margin: '0 0 8px', letterSpacing: 1 }}>PLATFORM PER SEGMEN</p>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              {[{ label: 'Prajurit', color: '#14532D' }, { label: 'Istri', color: '#0F766E' }, { label: 'Anak', color: '#6D28D9' }].map((l, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{l.label}</span>
                </div>
              ))}
            </div>
            {platformByDemo.map((p, i) => (
              <PlatformBar key={i} platform={p.platform} pcts={p.pcts} frame={frame} startFrame={180 + i * 12} />
            ))}
          </div>
        </div>

        {/* MIDDLE COLUMN — Age Distribution */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: '16px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.5)', margin: '0 0 12px', letterSpacing: 1 }}>DISTRIBUSI USIA</p>
            {ageGroups.map((g, i) => (
              <HBar key={i} label={g.label} value={g.value} maxValue={35} color={g.color} frame={frame} startFrame={100 + i * 12} />
            ))}
            <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'rgba(109,40,217,0.08)', border: '1px solid rgba(109,40,217,0.15)' }}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.4 }}>
                <strong style={{ color: '#A78BFA' }}>50%+ berusia di bawah 35 tahun</strong> — generasi digital native yang aktif di media sosial dan mampu memproduksi konten berkualitas
              </p>
            </div>
          </div>

          {/* Key insight */}
          {(() => {
            const insightOp = interpolate(frame, [250, 290], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <div style={{ padding: '14px 18px', borderRadius: 14, background: 'rgba(184,134,11,0.06)', border: '1px solid rgba(184,134,11,0.15)', opacity: insightOp }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: GOLD, margin: '0 0 4px' }}>Keunggulan Demografis</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.5 }}>
                  Kombinasi prajurit aktif (konten otoritatif) + keluarga muda (viral power) + anak digital native (engagement tinggi) = ekosistem konten yang lengkap dan organik
                </p>
              </div>
            );
          })()}
        </div>

        {/* RIGHT COLUMN — Regional + Education */}
        <div style={{ flex: '0 0 340px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Regional donut */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ position: 'relative' }}>
              <DonutChart
                segments={regions.map(r => ({ pct: r.value / 100, color: r.color }))}
                size={130} strokeWidth={14} frame={frame} startFrame={140}
              />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>15</span>
                <span style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>KODAM</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.5)', margin: '0 0 6px', letterSpacing: 1 }}>SEBARAN WILAYAH</p>
              {regions.map((r, i) => {
                const op = interpolate(frame, [150 + i * 8, 165 + i * 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, opacity: op }}>
                    <div style={{ width: 6, height: 6, borderRadius: 2, background: r.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', flex: 1 }}>{r.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: r.color, fontFamily: "'JetBrains Mono'" }}>{r.value}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Education */}
          <div style={{ padding: '14px 18px', borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.5)', margin: '0 0 10px', letterSpacing: 1 }}>TINGKAT PENDIDIKAN</p>
            {[
              { label: 'SMA / SMK', value: 35, color: '#FB923C' },
              { label: 'Diploma (D3)', value: 15, color: '#F59E0B' },
              { label: 'Sarjana (S1)', value: 35, color: '#14532D' },
              { label: 'Pascasarjana (S2+)', value: 15, color: '#6D28D9' },
            ].map((e, i) => (
              <HBar key={i} label={e.label} value={e.value} maxValue={40} color={e.color} frame={frame} startFrame={200 + i * 12} />
            ))}
          </div>

          {/* Device & connectivity */}
          <div style={{ padding: '14px 18px', borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.5)', margin: '0 0 10px', letterSpacing: 1 }}>PERANGKAT & KONEKTIVITAS</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { icon: '📱', label: 'Android', value: '78%', color: '#4ADE80' },
                { icon: '🍎', label: 'iOS', value: '22%', color: 'rgba(255,255,255,0.6)' },
              ].map((d, i) => {
                const op = interpolate(frame, [230 + i * 15, 250 + i * 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                return (
                  <div key={i} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', textAlign: 'center', opacity: op }}>
                    <span style={{ fontSize: 18 }}>{d.icon}</span>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>{d.label}</p>
                    <p style={{ fontSize: 20, fontWeight: 900, color: d.color, fontFamily: "'JetBrains Mono'", margin: '2px 0 0' }}>{d.value}</p>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {[
                { label: '4G Coverage', value: '92%', color: '#4ADE80' },
                { label: 'Avg Data/bln', value: '8.5GB', color: '#60A5FA' },
                { label: 'Daily Screen', value: '4.2h', color: '#FB923C' },
              ].map((s, i) => {
                const op = interpolate(frame, [260 + i * 10, 280 + i * 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                return (
                  <div key={i} style={{ flex: 1, textAlign: 'center', opacity: op }}>
                    <p style={{ fontSize: 18, fontWeight: 900, color: s.color, fontFamily: "'JetBrains Mono'", margin: 0 }}>{s.value}</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>{s.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

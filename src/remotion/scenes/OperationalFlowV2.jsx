import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

/* ── SINAR Brand Colors ── */
const PRIMARY = '#1B4332';
const PRIMARY_ACCENT = '#2D6A4F';
const GOLD = '#B8860B';
const PURPLE = '#6D28D9';
const TEAL = '#0F766E';
const PATRIOT = '#8B1A1A';
const BLACK = '#1A1814';
const BG = '#F5F3EE';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#DDD9D0';
const TEXT_PRIMARY = '#1A1814';
const TEXT_SEC = '#3D3929';
const TEXT_MUTED = '#6B6555';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const FONT = "'Inter', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";

const steps = [
  { num: '1', title: 'DISPENAD Buat Misi', sub: 'Admin membuat & broadcast instruksi ke 400K prajurit', color: PATRIOT, icon: 'command' },
  { num: '2', title: 'Prajurit Terima', sub: 'Notifikasi masuk di app, prajurit ambil misi', color: PRIMARY, icon: 'notif' },
  { num: '3', title: 'Eksekusi & Upload', sub: 'Hadir, dokumentasi, upload bukti ke platform', color: TEAL, icon: 'upload' },
  { num: '4', title: 'Verifikasi AI', sub: 'Sistem AI cek kualitas konten otomatis', color: PURPLE, icon: 'ai' },
  { num: '5', title: 'Reward & XP', sub: 'Poin masuk, pangkat naik, reward tersedia', color: GOLD, icon: 'reward' },
];

export const OperationalFlowV2 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelOp = interpolate(frame, [0, 15], [0, 1], CLAMP);
  const titleOp = interpolate(frame, [5, 25], [0, 1], CLAMP);
  const titleY = interpolate(frame, [5, 25], [20, 0], CLAMP);
  const lineW = interpolate(frame, [15, 40], [0, 80], CLAMP);
  const dashOp = interpolate(frame, [20, 50], [0, 1], CLAMP);
  const dashX = interpolate(frame, [20, 50], [-20, 0], CLAMP);
  const summaryOp = interpolate(frame, [110, 130], [0, 1], CLAMP);

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: FONT }}>
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 48, left: 80, right: 80,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        opacity: labelOp,
      }}>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_MUTED, letterSpacing: 2 }}>CARA KERJA</span>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_MUTED, letterSpacing: 2 }}>SINAR PLATFORM</span>
      </div>

      {/* Split layout: left image, right content */}
      <div style={{
        position: 'absolute', top: 90, bottom: 80, left: 80, right: 80,
        display: 'flex', gap: 48, alignItems: 'center',
      }}>
        {/* LEFT — Desktop mockup with dashboard */}
        <div style={{
          flex: '0 0 38%',
          opacity: dashOp, transform: `translateX(${dashX}px)`,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {/* Desktop frame */}
          <div style={{
            background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
            boxShadow: '0 8px 40px rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}>
            {/* Title bar */}
            <div style={{
              padding: '6px 12px', borderBottom: `1px solid ${CARD_BORDER}`,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {['#EF4444', '#F59E0B', '#22C55E'].map((c, i) => (
                  <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
                ))}
              </div>
              <span style={{ fontSize: 10, color: TEXT_MUTED, flex: 1, textAlign: 'center', fontFamily: FONT_MONO }}>
                admin.sinar.id — Command Center
              </span>
            </div>
            {/* Dashboard content mockup */}
            <div style={{ padding: 14 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 8, fontWeight: 800, color: '#fff' }}>S</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: TEXT_PRIMARY }}>SINAR Dashboard</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['Misi', 'Analitik', 'Agen'].map((t, i) => (
                    <span key={i} style={{
                      fontSize: 9, padding: '3px 8px', fontFamily: FONT_MONO,
                      background: i === 0 ? `${PRIMARY}15` : 'transparent',
                      color: i === 0 ? PRIMARY : TEXT_MUTED, fontWeight: 600,
                      border: `1px solid ${i === 0 ? `${PRIMARY}25` : 'transparent'}`,
                    }}>{t}</span>
                  ))}
                </div>
              </div>
              {/* Mission card */}
              <div style={{
                padding: '10px 12px', background: `${PATRIOT}06`, border: `1px solid ${PATRIOT}15`,
                marginBottom: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: PATRIOT, background: `${PATRIOT}10`, padding: '1px 6px', fontFamily: FONT_MONO }}>EVENT</span>
                  <span style={{ fontSize: 9, color: TEXT_MUTED }}>Prioritas Tinggi</span>
                </div>
                <p style={{ fontSize: 11, fontWeight: 700, color: TEXT_PRIMARY, margin: 0 }}>Upacara HUT TNI AD ke-81</p>
                <p style={{ fontSize: 9, color: TEXT_MUTED, margin: '2px 0 0' }}>Target: 400.000 prajurit · Deadline: 5 Oktober</p>
                <div style={{ marginTop: 6, height: 4, background: '#E8E4DD', overflow: 'hidden' }}>
                  <div style={{ width: '68%', height: '100%', background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})` }} />
                </div>
              </div>
              {/* Stats row */}
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { label: 'Aktif', val: '400K', color: PRIMARY },
                  { label: 'Selesai', val: '89%', color: GOLD },
                  { label: 'XP Total', val: '12.4M', color: TEAL },
                ].map((s, i) => (
                  <div key={i} style={{
                    flex: 1, padding: '8px 10px', background: `${s.color}06`,
                    border: `1px solid ${s.color}15`, textAlign: 'center',
                  }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: s.color, fontFamily: FONT_MONO, margin: 0 }}>{s.val}</p>
                    <p style={{ fontSize: 8, color: TEXT_MUTED, margin: '2px 0 0' }}>{s.label}</p>
                  </div>
                ))}
              </div>
              {/* Send button */}
              <div style={{ marginTop: 10, background: PRIMARY, padding: '6px 0', textAlign: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', fontFamily: FONT_MONO, letterSpacing: 1 }}>BROADCAST KE 400K PRAJURIT</span>
              </div>
            </div>
          </div>
          {/* Label */}
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 600, fontFamily: FONT_MONO, letterSpacing: 1 }}>ADMIN DASHBOARD</span>
          </div>
        </div>

        {/* RIGHT — Steps */}
        <div style={{ flex: '1 1 58%', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Title */}
          <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, marginBottom: 4 }}>
            <h2 style={{ fontSize: 44, fontWeight: 900, color: BLACK, margin: 0, lineHeight: 1.15 }}>
              Dari{' '}
              <span style={{ color: PATRIOT }}>Komando</span>{' '}ke{' '}
              <span style={{
                background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>Reward</span>
            </h2>
            <p style={{ fontSize: 15, color: TEXT_MUTED, margin: '6px 0 0', fontWeight: 500 }}>
              Alur operasional end-to-end yang terotomasi
            </p>
          </div>

          {/* Gradient line */}
          <div style={{
            width: lineW, height: 3,
            background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})`,
            borderRadius: 2,
          }} />

          {/* Step cards — compact vertical */}
          {steps.map((step, i) => {
            const appear = spring({ frame: frame - 20 - i * 8, fps, config: { damping: 22, mass: 0.7 } });
            const isLast = i === steps.length - 1;
            return (
              <div key={i} style={{ display: 'flex', gap: 14, opacity: appear, transform: `translateX(${(1 - appear) * 20}px)` }}>
                {/* Timeline dot + line */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 24 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', background: step.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', fontFamily: FONT_MONO }}>{step.num}</span>
                  </div>
                  {!isLast && <div style={{ width: 2, flex: 1, background: CARD_BORDER, marginTop: 4 }} />}
                </div>
                {/* Card */}
                <div style={{
                  flex: 1, padding: '12px 16px',
                  background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
                  borderLeft: `3px solid ${step.color}`,
                }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: TEXT_PRIMARY, margin: 0 }}>{step.title}</p>
                  <p style={{ fontSize: 13, color: TEXT_MUTED, margin: '3px 0 0', lineHeight: 1.4 }}>{step.sub}</p>
                </div>
              </div>
            );
          })}

          {/* Summary */}
          <div style={{ opacity: summaryOp, marginTop: 4 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 20px',
              background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})` }} />
              <span style={{ fontSize: 13, color: TEXT_SEC }}>
                Semua langkah <strong style={{ color: TEXT_PRIMARY }}>terotomasi</strong> — dari instruksi sampai reward
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        position: 'absolute', bottom: 48, left: 80, right: 80,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        opacity: labelOp,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: `linear-gradient(135deg, ${PRIMARY}, ${GOLD})` }} />
          <span style={{ fontSize: 13, fontFamily: FONT, color: TEXT_MUTED, fontWeight: 500 }}>sinar.id</span>
        </div>
        <span style={{ fontSize: 13, fontFamily: FONT_MONO, color: '#C4C0B8', letterSpacing: 1 }}>07</span>
      </div>
    </AbsoluteFill>
  );
};

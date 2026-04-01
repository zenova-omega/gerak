import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

const PRIMARY = '#1B4332';
const PRIMARY_DARK = '#0B2619';
const PRIMARY_ACCENT = '#2D6A4F';
const GOLD = '#B8860B';
const BLUE = '#2563EB';
const BLACK = '#1A1814';
const WHITE = '#FFFFFF';
const TEXT_DIM = 'rgba(255,255,255,0.45)';
const TEXT_MID = 'rgba(255,255,255,0.65)';
const BORDER = 'rgba(255,255,255,0.08)';
const SLATE = '#94A3B8';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const FONT = "'Inter', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";

const TIERS = [
  {
    name: 'Command 500K', tier: 'PAKET DASAR', color: SLATE, users: '500.000',
    desc: 'Platform inti untuk koordinasi misi dan gamifikasi internal',
    highlights: [
      'Kelola & distribusi misi ke seluruh prajurit',
      'Sistem pangkat, XP, dan leaderboard',
      'Aplikasi mobile Android & iOS',
      'AI bantu buat konten & caption otomatis',
      'AI chat assistant tanpa internet',
      'Dashboard & peta sebaran nasional',
    ],
    social: 'Platform internal saja', socialColor: SLATE,
  },
  {
    name: 'Command 1M', tier: 'PAKET PROFESIONAL', color: BLUE, users: '1.000.000',
    badge: 'Direkomendasikan',
    desc: 'Semua fitur dasar + monitoring sosial media & AI canggih',
    highlights: [
      'Semua fitur Paket Dasar',
      'Analitik detail per satuan & wilayah',
      'AI moderasi konten negatif otomatis',
      'Deteksi narasi & isu berkembang',
      'Deteksi akun palsu & bot',
      'Pantau percakapan publik di sosmed',
    ],
    social: 'Monitoring sosial media', socialColor: BLUE,
  },
  {
    name: 'Command 2M', tier: 'PAKET ENTERPRISE', color: GOLD, users: '2.000.000',
    badge: 'Kapabilitas Penuh',
    desc: 'Kapabilitas intelijen lengkap + prediksi ancaman',
    highlights: [
      'Semua fitur Paket Profesional',
      'Peta jaringan penyebar isu & influencer',
      'Prediksi penyebaran narasi 24–72 jam',
      'Notifikasi otomatis isu viral ke komando',
      'Integrasi tak terbatas ke sistem lain',
      'Analitik sentimen & reach lintas platform',
    ],
    social: 'Intelijen sosial media penuh', socialColor: GOLD,
  },
];

/* Hardware comparison — separated into its own section */
const HW_ROWS = [
  { label: 'Prosesor', t1: '16 Core', t2: '32 Core', t3: '64 Core', icon: '⚡' },
  { label: 'Memori', t1: '64 GB', t2: '128 GB', t3: '256 GB', icon: '🧠' },
  { label: 'Penyimpanan Cepat', t1: '2 TB', t2: '4 TB', t3: '8 TB', icon: '💾' },
  { label: 'Penyimpanan Arsip', t1: '4 TB', t2: '10 TB', t3: '16 TB', icon: '🗄' },
  { label: 'GPU untuk AI', t1: '12 GB', t2: '24 GB', t3: '24–48 GB', icon: '🎯' },
];

export const PaketLayananV2 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = interpolate(frame, [0, 20], [0, 1], CLAMP);
  const titleOp = interpolate(frame, [5, 25], [0, 1], CLAMP);
  const titleY = interpolate(frame, [5, 25], [20, 0], CLAMP);
  const lineW = interpolate(frame, [20, 45], [0, 120], CLAMP);
  const hwOp = interpolate(frame, [120, 145], [0, 1], CLAMP);
  const noteOp = interpolate(frame, [150, 170], [0, 1], CLAMP);

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${PRIMARY_DARK}, ${BLACK})`, fontFamily: FONT }}>
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 48, left: 80, right: 80,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        opacity: headerOp, zIndex: 20,
      }}>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2 }}>PAKET LAYANAN</span>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2 }}>SINAR PLATFORM</span>
      </div>

      {/* Content */}
      <div style={{
        position: 'absolute', top: 95, bottom: 80, left: 80, right: 80,
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {/* Title */}
        <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, textAlign: 'center' }}>
          <h2 style={{ fontSize: 44, fontWeight: 900, color: WHITE, margin: 0, lineHeight: 1.15 }}>
            Tiga Paket,{' '}
            <span style={{
              background: `linear-gradient(90deg, ${BLUE}, ${GOLD})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Satu Solusi Lengkap</span>
          </h2>
          <p style={{ fontSize: 17, color: TEXT_MID, margin: '8px 0 0' }}>
            Perangkat keras + perangkat lunak + AI — semua termasuk, berjalan di infrastruktur Anda
          </p>
        </div>
        <div style={{ width: lineW, height: 3, background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})`, borderRadius: 2, margin: '0 auto' }} />

        {/* 3 Tier cards */}
        <div style={{ display: 'flex', gap: 16 }}>
          {TIERS.map((t, ti) => {
            const appear = spring({ frame: frame - 25 - ti * 10, fps, config: { damping: 22, mass: 0.7 } });
            const cardY = interpolate(appear, [0, 1], [25, 0], CLAMP);
            const isFeatured = ti === 1;
            return (
              <div key={ti} style={{
                flex: 1, opacity: appear, transform: `translateY(${cardY}px)`,
                display: 'flex', flexDirection: 'column',
                background: 'rgba(255,255,255,0.02)',
                border: isFeatured ? `2px solid ${t.color}40` : `1px solid ${BORDER}`,
                borderTop: `3px solid ${t.color}`,
              }}>
                {/* Header */}
                <div style={{ padding: '20px 24px 16px' }}>
                  {t.badge && (
                    <div style={{
                      display: 'inline-block', padding: '4px 12px', marginBottom: 10,
                      background: t.color, borderRadius: 12,
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: WHITE }}>{t.badge}</span>
                    </div>
                  )}
                  <p style={{ fontSize: 11, fontWeight: 700, color: t.color, fontFamily: FONT_MONO, letterSpacing: 1.5, margin: '0 0 6px' }}>{t.tier}</p>
                  <p style={{ fontSize: 26, fontWeight: 800, color: WHITE, margin: '0 0 6px' }}>{t.name}</p>
                  <p style={{ fontSize: 14, color: TEXT_DIM }}>Hingga <strong style={{ color: WHITE }}>{t.users}</strong> pengguna</p>
                  <p style={{ fontSize: 14, color: TEXT_MID, margin: '6px 0 0', lineHeight: 1.5 }}>{t.desc}</p>
                </div>

                <div style={{ height: 1, background: BORDER, margin: '0 24px' }} />

                {/* Features */}
                <div style={{ padding: '14px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {t.highlights.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.color, flexShrink: 0, marginTop: 7 }} />
                      <span style={{ fontSize: 15, color: TEXT_MID, lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>

                <div style={{ height: 1, background: BORDER, margin: '0 24px' }} />

                {/* Social media badge */}
                <div style={{ padding: '14px 24px 18px' }}>
                  <p style={{ fontSize: 11, color: TEXT_DIM, fontFamily: FONT_MONO, letterSpacing: 1, margin: '0 0 6px' }}>SOSIAL MEDIA</p>
                  <div style={{
                    display: 'inline-block', padding: '6px 14px', borderRadius: 14,
                    background: `${t.socialColor}12`, border: `1px solid ${t.socialColor}20`,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: t.socialColor }}>{t.social}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Hardware comparison — horizontal table */}
        <div style={{
          opacity: hwOp,
          background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`,
          display: 'flex',
        }}>
          {/* Label column */}
          <div style={{ width: 180, flexShrink: 0, borderRight: `1px solid ${BORDER}` }}>
            <div style={{ padding: '10px 18px', borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, fontFamily: FONT_MONO, letterSpacing: 1 }}>PERANGKAT KERAS</span>
            </div>
            {HW_ROWS.map((r, i) => (
              <div key={i} style={{
                padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 8,
                borderBottom: i < HW_ROWS.length - 1 ? `1px solid ${BORDER}` : 'none',
              }}>
                <span style={{ fontSize: 14 }}>{r.icon}</span>
                <span style={{ fontSize: 13, color: TEXT_MID, fontWeight: 500 }}>{r.label}</span>
              </div>
            ))}
          </div>
          {/* Tier columns */}
          {[
            { vals: HW_ROWS.map(r => r.t1), color: SLATE, label: '500K' },
            { vals: HW_ROWS.map(r => r.t2), color: BLUE, label: '1M' },
            { vals: HW_ROWS.map(r => r.t3), color: GOLD, label: '2M' },
          ].map((col, ci) => (
            <div key={ci} style={{ flex: 1, borderRight: ci < 2 ? `1px solid ${BORDER}` : 'none' }}>
              <div style={{ padding: '10px 12px', textAlign: 'center', borderBottom: `1px solid ${BORDER}`, background: `${col.color}08` }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: col.color, fontFamily: FONT_MONO }}>{col.label}</span>
              </div>
              {col.vals.map((v, i) => (
                <div key={i} style={{
                  padding: '8px 12px', textAlign: 'center',
                  borderBottom: i < col.vals.length - 1 ? `1px solid ${BORDER}` : 'none',
                }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: WHITE, fontFamily: FONT_MONO }}>{v}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div style={{
          opacity: noteOp, padding: '12px 20px',
          background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, flexShrink: 0 }} />
          <p style={{ fontSize: 14, color: TEXT_MID, margin: 0, lineHeight: 1.6 }}>
            Semua paket sudah termasuk perangkat keras, perangkat lunak, dan AI — siap pakai dalam satu pengiriman.
            <span style={{ color: TEXT_DIM }}> Data 100% di infrastruktur Anda, tanpa ketergantungan cloud.</span>
          </p>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        position: 'absolute', bottom: 48, left: 80, right: 80,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        opacity: headerOp, zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: `linear-gradient(135deg, ${PRIMARY}, ${GOLD})` }} />
          <span style={{ fontSize: 13, fontFamily: FONT, color: TEXT_DIM, fontWeight: 500 }}>sinar.id</span>
        </div>
        <span style={{ fontSize: 13, fontFamily: FONT_MONO, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>14</span>
      </div>
    </AbsoluteFill>
  );
};

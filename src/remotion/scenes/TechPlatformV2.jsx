import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

/* ── SINAR Brand Colors ── */
const PRIMARY = '#1B4332';
const PRIMARY_DARK = '#0B2619';
const PRIMARY_ACCENT = '#2D6A4F';
const GOLD = '#B8860B';
const PURPLE = '#6D28D9';
const ORANGE = '#C2410C';
const TEAL = '#0F766E';
const BLACK = '#1A1814';
const WHITE = '#FFFFFF';
const TEXT_DIM = 'rgba(255,255,255,0.45)';
const TEXT_MID = 'rgba(255,255,255,0.65)';
const BORDER = 'rgba(255,255,255,0.08)';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const FONT = "'Inter', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";

const AUTO = '#22C55E';
const MANUAL = '#F59E0B';
const SCREENSHOT = '#60A5FA';

/*
  Platform integration — corrected:
  - WhatsApp & FB Group: manual (screenshot + upload ke app)
  - Geo-tag: hanya untuk misi EVENT/Kehadiran, bukan per-platform
  - Offline/Event: user foto di lokasi + geo-tag + upload via SINAR app
*/
const PLATFORMS = [
  { name: 'YouTube', color: '#FF0000',
    icon: <svg width="16" height="16" viewBox="0 0 24 24"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.5 31.5 0 000 12a31.5 31.5 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31.5 31.5 0 0024 12a31.5 31.5 0 00-.5-5.8zM9.5 15.5v-7l6.3 3.5-6.3 3.5z" fill="#FF0000"/></svg>,
    upload: 'auto', engage: 'auto', analytics: 'auto', method: 'YouTube Data API v3' },
  { name: 'Instagram', color: '#E1306C',
    icon: <svg width="16" height="16" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" stroke="#E1306C" strokeWidth="2" fill="none"/><circle cx="12" cy="12" r="5" stroke="#E1306C" strokeWidth="2" fill="none"/></svg>,
    upload: 'auto', engage: 'manual', analytics: 'auto', method: 'Instagram Graph API' },
  { name: 'TikTok', color: '#fff',
    icon: <svg width="16" height="16" viewBox="0 0 24 24"><path d="M16.6 5.8A4.3 4.3 0 0113 2h-3v14a3 3 0 11-2-2.8V8a7 7 0 102 6.9V9.5a4.3 4.3 0 006.6-3.7z" fill="#fff"/></svg>,
    upload: 'auto', engage: 'manual', analytics: 'auto', method: 'TikTok Content API' },
  { name: 'X / Twitter', color: '#1D9BF0',
    icon: <svg width="16" height="16" viewBox="0 0 24 24"><path d="M18.2 2h3.5l-7.6 8.7L23 22h-7l-5-6.5L5.3 22H1.8l8.1-9.3L1.4 2h7.2l4.5 5.9L18.2 2z" fill="#1D9BF0"/></svg>,
    upload: 'auto', engage: 'auto', analytics: 'auto', method: 'X API v2' },
  { name: 'Facebook', color: '#1877F2',
    icon: <svg width="16" height="16" viewBox="0 0 24 24"><path d="M24 12a12 12 0 10-13.9 11.8v-8.4H7v-3.4h3.1V9.4c0-3.1 1.8-4.8 4.6-4.8 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.4h-2.9v8.4A12 12 0 0024 12z" fill="#1877F2"/></svg>,
    upload: 'auto', engage: 'manual', analytics: 'auto', method: 'Meta Graph API' },
  { name: 'FB Group', color: '#1877F2',
    icon: <svg width="16" height="16" viewBox="0 0 24 24"><path d="M16 11c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3zm-8 0c1.7 0 3-1.3 3-3S9.7 5 8 5 5 6.3 5 8s1.3 3 3 3zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5C15 14.2 10.3 13 8 13zm8 0c-.3 0-.6 0-1 .1 1.2.8 2 2 2 3.4V19h6v-2.5C23 14.2 18.3 13 16 13z" fill="#1877F2"/></svg>,
    upload: 'screenshot', engage: 'screenshot', analytics: 'manual', method: 'Screenshot + upload' },
  { name: 'WhatsApp', color: '#25D366',
    icon: <svg width="16" height="16" viewBox="0 0 24 24"><path d="M12 2a10 10 0 00-8.6 14.9L2 22l5.2-1.4A10 10 0 1012 2z" stroke="#25D366" strokeWidth="2" fill="none"/></svg>,
    upload: 'screenshot', engage: 'screenshot', analytics: 'manual', method: 'Screenshot + upload' },
  { name: 'Offline / Event', color: GOLD,
    icon: <svg width="16" height="16" viewBox="0 0 24 24"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z" stroke={GOLD} strokeWidth="1.5" fill={`${GOLD}30`}/><circle cx="12" cy="9" r="2.5" stroke={GOLD} strokeWidth="1.5" fill="none"/></svg>,
    upload: 'geo', engage: 'no', analytics: 'auto', method: 'GPS + foto via SINAR app' },
];

/* Status cell */
function Cell({ value }) {
  if (value === 'auto') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${AUTO}15`, border: `1.5px solid ${AUTO}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="10" height="10" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke={AUTO} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <span style={{ fontSize: 9, color: AUTO, fontFamily: FONT_MONO, fontWeight: 700 }}>API</span>
    </div>
  );
  if (value === 'manual') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${MANUAL}15`, border: `1.5px solid ${MANUAL}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="10" height="10" viewBox="0 0 12 12"><path d="M3 6h6" stroke={MANUAL} strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
      </div>
      <span style={{ fontSize: 9, color: MANUAL, fontFamily: FONT_MONO, fontWeight: 700 }}>APP</span>
    </div>
  );
  if (value === 'screenshot') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${SCREENSHOT}15`, border: `1.5px solid ${SCREENSHOT}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="10" height="10" viewBox="0 0 12 12"><rect x="2" y="3" width="8" height="6" rx="1" stroke={SCREENSHOT} strokeWidth="1.5" fill="none"/></svg>
      </div>
      <span style={{ fontSize: 8, color: SCREENSHOT, fontFamily: FONT_MONO, fontWeight: 700 }}>SS</span>
    </div>
  );
  if (value === 'geo') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${TEAL}15`, border: `1.5px solid ${TEAL}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="10" height="10" viewBox="0 0 12 12"><path d="M6 1C4 1 2.5 2.5 2.5 4.5 2.5 7.5 6 11 6 11s3.5-3.5 3.5-6.5C9.5 2.5 8 1 6 1z" fill={TEAL} opacity="0.8"/></svg>
      </div>
      <span style={{ fontSize: 8, color: TEAL, fontFamily: FONT_MONO, fontWeight: 700 }}>GEO</span>
    </div>
  );
  return <div style={{ width: 16, height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.06)' }} />;
}

export const TechPlatformV2 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = interpolate(frame, [0, 20], [0, 1], CLAMP);
  const titleOp = interpolate(frame, [5, 25], [0, 1], CLAMP);
  const titleY = interpolate(frame, [5, 25], [20, 0], CLAMP);
  const lineW = interpolate(frame, [20, 45], [0, 120], CLAMP);
  const flowOp = interpolate(frame, [120, 150], [0, 1], CLAMP);

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${PRIMARY_DARK}, ${BLACK})`, fontFamily: FONT }}>
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 48, left: 80, right: 80,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        opacity: headerOp, zIndex: 20,
      }}>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2 }}>INTEGRASI TEKNIS</span>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2 }}>SINAR PLATFORM</span>
      </div>

      {/* Content */}
      <div style={{
        position: 'absolute', top: 95, bottom: 80, left: 80, right: 80,
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {/* Title */}
        <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)` }}>
          <h2 style={{ fontSize: 42, fontWeight: 900, color: WHITE, margin: 0, lineHeight: 1.15 }}>
            Bagaimana SINAR{' '}
            <span style={{
              background: `linear-gradient(90deg, ${PRIMARY_ACCENT}, ${GOLD})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Terhubung</span>{' '}ke Setiap Platform
          </h2>
          <p style={{ fontSize: 15, color: TEXT_MID, margin: '6px 0 0' }}>
            Otomasi via API untuk platform utama, screenshot upload untuk grup tertutup, GPS geo-tag untuk kehadiran fisik
          </p>
        </div>

        <div style={{ width: lineW, height: 3, background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})`, borderRadius: 2 }} />

        {/* Legend row */}
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { label: 'Otomatis via API', color: AUTO, icon: '✓' },
            { label: 'Manual via App', color: MANUAL, icon: '—' },
            { label: 'Screenshot + Upload', color: SCREENSHOT, icon: '▢' },
            { label: 'Foto + Geo-tag', color: TEAL, icon: '◉' },
          ].map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: `${l.color}15`, border: `1.5px solid ${l.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, color: l.color, fontWeight: 800 }}>{l.icon}</span>
              </div>
              <span style={{ fontSize: 12, color: l.color, fontWeight: 600 }}>{l.label}</span>
            </div>
          ))}
        </div>

        {/* Matrix */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}` }}>
          {/* Header */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ width: 180, padding: '12px 16px', flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: TEXT_DIM, fontFamily: FONT_MONO, letterSpacing: 1 }}>PLATFORM</span>
            </div>
            {['Upload Konten', 'Engage (Like/Share)', 'Analytics'].map((h, i) => (
              <div key={i} style={{ flex: 1, padding: '12px 8px', textAlign: 'center', borderLeft: `1px solid ${BORDER}` }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: TEXT_DIM, fontFamily: FONT_MONO }}>{h}</span>
              </div>
            ))}
            <div style={{ width: 180, padding: '12px 12px', textAlign: 'center', borderLeft: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: TEXT_DIM, fontFamily: FONT_MONO }}>Metode</span>
            </div>
          </div>

          {/* Rows */}
          {PLATFORMS.map((p, pi) => {
            const rowOp = interpolate(frame, [30 + pi * 6, 42 + pi * 6], [0, 1], CLAMP);
            return (
              <div key={pi} style={{
                display: 'flex', opacity: rowOp,
                borderBottom: pi < PLATFORMS.length - 1 ? `1px solid ${BORDER}` : 'none',
                background: pi % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
              }}>
                <div style={{ width: 180, padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {p.icon}
                  <span style={{ fontSize: 13, fontWeight: 700, color: WHITE }}>{p.name}</span>
                </div>
                {['upload', 'engage', 'analytics'].map((key, ai) => (
                  <div key={ai} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: `1px solid ${BORDER}` }}>
                    <Cell value={p[key]} />
                  </div>
                ))}
                <div style={{ width: 180, padding: '11px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: 10, color: PRIMARY_ACCENT, fontFamily: FONT_MONO, fontWeight: 600, textAlign: 'center' }}>{p.method}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom: Event flow — how geo-tag works for kehadiran */}
        <div style={{
          display: 'flex', gap: 0, opacity: flowOp,
          background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`,
          overflow: 'hidden',
        }}>
          {/* Left label */}
          <div style={{
            width: 180, padding: '16px 20px', flexShrink: 0,
            background: `${TEAL}08`, borderRight: `1px solid ${BORDER}`,
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z" stroke={TEAL} strokeWidth="1.5" fill={`${TEAL}25`}/>
                <circle cx="12" cy="9" r="2.5" stroke={TEAL} strokeWidth="1.5" fill="none"/>
              </svg>
              <span style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>Misi Kehadiran</span>
            </div>
            <p style={{ fontSize: 11, color: TEXT_DIM, margin: 0, lineHeight: 1.4 }}>
              Untuk tipe misi EVENT yang butuh kehadiran fisik
            </p>
          </div>

          {/* Flow steps */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '14px 20px', gap: 0 }}>
            {[
              { step: '1', title: 'Datang ke Lokasi', desc: 'Prajurit hadir di lokasi event', color: TEAL },
              { step: '2', title: 'Foto + Geo-tag', desc: 'Buka SINAR app, ambil foto — GPS & timestamp otomatis tercatat', color: AUTO },
              { step: '3', title: 'Upload ke App', desc: 'Foto + metadata lokasi dikirim ke server SINAR', color: PRIMARY_ACCENT },
              { step: '4', title: 'Verifikasi Otomatis', desc: 'AI cek: lokasi ≤100m dari target, waktu sesuai, foto valid', color: PURPLE },
              { step: '5', title: 'XP Masuk', desc: 'Verifikasi lolos → XP langsung ditambahkan', color: GOLD },
            ].map((s, i) => {
              const sOp = interpolate(frame, [130 + i * 8, 142 + i * 8], [0, 1], CLAMP);
              return (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <svg width="20" height="12" viewBox="0 0 20 12" style={{ flexShrink: 0, opacity: 0.3 }}>
                      <path d="M2 6h12M12 2l4 4-4 4" stroke={TEXT_DIM} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                    </svg>
                  )}
                  <div style={{ flex: 1, textAlign: 'center', opacity: sOp }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', background: s.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px',
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', fontFamily: FONT_MONO }}>{s.step}</span>
                    </div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: WHITE, margin: 0 }}>{s.title}</p>
                    <p style={{ fontSize: 9, color: TEXT_DIM, margin: '3px 0 0', lineHeight: 1.3 }}>{s.desc}</p>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
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
        <span style={{ fontSize: 13, fontFamily: FONT_MONO, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>08</span>
      </div>
    </AbsoluteFill>
  );
};

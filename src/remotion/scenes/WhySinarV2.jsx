import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

/* ── SINAR Brand Colors ── */
const PRIMARY = '#1B4332';
const PRIMARY_DARK = '#0B2619';
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
  { num: '01', title: 'Misi Terkoordinasi', desc: 'DISPENAD mengirim instruksi langsung ke 400.000 prajurit melalui satu kali broadcast. Setiap misi memiliki target, deadline, dan instruksi detail.', color: PATRIOT },
  { num: '02', title: 'Eksekusi Serentak', desc: 'Semua prajurit like, share, dan upload konten ke 6 platform media sosial secara bersamaan — menciptakan gelombang engagement masif.', color: PRIMARY_ACCENT },
  { num: '03', title: 'Efek Keluarga Besar TNI', desc: '1,2 juta anggota KBT ikut menyebarkan ke grup WhatsApp, komunitas RT/RW, dan tetangga — memperluas jangkauan.', color: TEAL },
  { num: '04', title: 'Algoritma Terpicu', desc: 'Engagement masif memicu algoritma trending di YouTube, Instagram, TikTok, dan X sekaligus. Konten naik ke halaman explore.', color: PURPLE },
  { num: '05', title: 'Viral Organik', desc: 'Konten trending menarik audiens baru secara organik — snowball effect menuju 16 juta+ jangkauan nasional.', color: GOLD },
];

export const WhySinarV2 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelOp = interpolate(frame, [0, 15], [0, 1], CLAMP);
  const titleOp = interpolate(frame, [5, 25], [0, 1], CLAMP);
  const titleY = interpolate(frame, [5, 25], [20, 0], CLAMP);
  const lineW = interpolate(frame, [15, 40], [0, 80], CLAMP);
  const phoneOp = interpolate(frame, [30, 60], [0, 1], CLAMP);
  const phoneY = interpolate(frame, [30, 60], [30, 0], CLAMP);

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: FONT }}>
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 48, left: 80, right: 80,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        opacity: labelOp,
      }}>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_MUTED, letterSpacing: 2 }}>MENGAPA SINAR</span>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_MUTED, letterSpacing: 2 }}>SINAR PLATFORM</span>
      </div>

      {/* Split layout: left steps, right phone mockup */}
      <div style={{
        position: 'absolute', top: 100, bottom: 80, left: 80, right: 80,
        display: 'flex', gap: 48, alignItems: 'center',
      }}>
        {/* LEFT — Title + Steps */}
        <div style={{ flex: '1 1 55%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Title */}
          <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, marginBottom: 8 }}>
            <h2 style={{ fontSize: 48, fontWeight: 900, color: BLACK, margin: 0, lineHeight: 1.15 }}>
              5 Langkah Menuju{' '}
              <span style={{
                background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                158x Jangkauan
              </span>
            </h2>
            <p style={{ fontSize: 17, color: TEXT_MUTED, margin: '10px 0 0', fontWeight: 500 }}>
              Dari satu instruksi ke jutaan jangkauan organik
            </p>
          </div>

          {/* Gradient line */}
          <div style={{
            width: lineW, height: 3,
            background: `linear-gradient(90deg, ${PRIMARY}, ${GOLD})`,
            borderRadius: 2, marginBottom: 4,
          }} />

          {/* Step cards — bigger, more attractive */}
          {steps.map((step, i) => {
            const appear = spring({ frame: frame - 20 - i * 7, fps, config: { damping: 22, mass: 0.7 } });
            return (
              <div key={i} style={{
                opacity: appear, transform: `translateX(${(1 - appear) * 25}px)`,
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '16px 20px',
                background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
                borderLeft: `4px solid ${step.color}`,
                position: 'relative',
              }}>
                {/* Number badge */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: `${step.color}12`, border: `2px solid ${step.color}25`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{
                    fontSize: 16, fontWeight: 800, color: step.color,
                    fontFamily: FONT_MONO,
                  }}>
                    {step.num}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: TEXT_PRIMARY, margin: 0 }}>{step.title}</p>
                  <p style={{ fontSize: 15, color: TEXT_SEC, margin: '5px 0 0', lineHeight: 1.55 }}>{step.desc}</p>
                </div>
                {/* Bottom accent */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, width: '100%', height: 2,
                  background: `linear-gradient(90deg, ${step.color}, ${step.color}22)`,
                }} />
              </div>
            );
          })}
        </div>

        {/* RIGHT — Phone mockup */}
        <div style={{
          flex: '0 0 38%', display: 'flex', flexDirection: 'column', alignItems: 'center',
          opacity: phoneOp, transform: `translateY(${phoneY}px)`,
        }}>
          <div style={{
            width: 280, height: 580,
            borderRadius: 32, overflow: 'hidden',
            border: `2px solid ${CARD_BORDER}`,
            boxShadow: '0 12px 60px rgba(0,0,0,0.08)',
            background: PRIMARY_DARK,
            position: 'relative',
          }}>
            {/* Status bar */}
            <div style={{
              padding: '8px 20px', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', background: 'rgba(0,0,0,0.3)',
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>09:41</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <div style={{ width: 14, height: 8, borderRadius: 2, border: '1px solid rgba(255,255,255,0.4)' }}>
                  <div style={{ width: '70%', height: '100%', background: '#22C55E', borderRadius: 1 }} />
                </div>
              </div>
            </div>

            {/* App header */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>S</span>
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: 2 }}>SINAR</span>
              </div>
            </div>

            {/* Mission cards */}
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Active mission */}
              <div style={{
                padding: '12px 14px', background: `rgba(27,67,50,0.2)`, border: '1px solid rgba(45,106,79,0.2)',
                borderRadius: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#22C55E', fontFamily: FONT_MONO }}>AKTIF</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginLeft: 'auto', fontFamily: FONT_MONO }}>+400 XP</span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>Upacara HUT TNI AD ke-81</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', margin: '4px 0 0' }}>Hadir & upload foto dokumentasi</p>
                <div style={{ marginTop: 8, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    width: `${interpolate(frame, [60, 200], [0, 75], CLAMP)}%`,
                    height: '100%', background: `linear-gradient(90deg, ${PRIMARY_ACCENT}, ${GOLD})`, borderRadius: 2,
                  }} />
                </div>
              </div>

              {/* Pending missions */}
              {[
                { title: 'Share Video Baksos', type: 'KONTEN', xp: '+300 XP' },
                { title: 'Like & Comment Post', type: 'ENGAGEMENT', xp: '+100 XP' },
                { title: 'Distribusi Materi', type: 'EDUKASI', xp: '+250 XP' },
              ].map((m, i) => (
                <div key={i} style={{
                  padding: '10px 14px', background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8,
                  opacity: interpolate(frame, [80 + i * 12, 95 + i * 12], [0, 1], CLAMP),
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: FONT_MONO, letterSpacing: 1 }}>{m.type}</span>
                    <span style={{ fontSize: 9, color: PRIMARY_ACCENT, fontFamily: FONT_MONO, fontWeight: 700 }}>{m.xp}</span>
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', margin: '3px 0 0' }}>{m.title}</p>
                </div>
              ))}

              {/* XP summary */}
              <div style={{
                padding: '10px 14px', background: 'rgba(184,134,11,0.08)', border: '1px solid rgba(184,134,11,0.15)',
                borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                opacity: interpolate(frame, [130, 150], [0, 1], CLAMP),
              }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Total XP Hari Ini</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: GOLD, fontFamily: FONT_MONO }}>+1,050</span>
              </div>
            </div>

            {/* Home indicator */}
            <div style={{
              position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
              width: 100, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)',
            }} />
          </div>

          {/* Stats under phone */}
          <div style={{
            display: 'flex', gap: 24, marginTop: 20,
            opacity: interpolate(frame, [100, 130], [0, 1], CLAMP),
          }}>
            {[
              { val: '400K', label: 'Prajurit', color: PRIMARY },
              { val: '1.6M', label: 'KBT', color: GOLD },
              { val: '16M+', label: 'Jangkauan', color: TEAL },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 18, fontWeight: 900, color: s.color, fontFamily: FONT_MONO, margin: 0 }}>{s.val}</p>
                <p style={{ fontSize: 10, color: TEXT_MUTED, margin: '2px 0 0', letterSpacing: 1 }}>{s.label}</p>
              </div>
            ))}
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
        <span style={{ fontSize: 13, fontFamily: FONT_MONO, color: '#C4C0B8', letterSpacing: 1 }}>04</span>
      </div>
    </AbsoluteFill>
  );
};

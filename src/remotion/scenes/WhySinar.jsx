import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

const BG = '#F5F3EE';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#DDD9D0';
const TEXT_PRIMARY = '#1A1814';
const TEXT_SECONDARY = '#3D3929';
const TEXT_MUTED = '#6B6555';
const FONT = "'Inter', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };

const steps = [
  { num: '1', title: 'Misi Terkoordinasi', desc: 'DISPENAD mengirim instruksi langsung ke 400.000 prajurit melalui satu kali broadcast', color: '#8B1A1A' },
  { num: '2', title: 'Eksekusi Serentak', desc: 'Semua prajurit like, share, dan upload konten ke 6 platform media sosial secara bersamaan', color: '#1B4332' },
  { num: '3', title: 'Efek Keluarga Besar TNI (KBT)', desc: '1,2 juta anggota KBT ikut menyebarkan ke grup WhatsApp, komunitas RT/RW, dan tetangga', color: '#0F766E' },
  { num: '4', title: 'Algoritma Terpicu', desc: 'Engagement masif memicu algoritma trending di YouTube, Instagram, TikTok, dan X sekaligus', color: '#6D28D9' },
  { num: '5', title: 'Viral Organik', desc: 'Konten trending menarik audiens baru secara organik — snowball effect menuju 16 juta+ jangkauan', color: '#B8860B' },
];

export const WhySinar = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = interpolate(frame, [0, 20], [0, 1], CLAMP);
  const titleY = interpolate(frame, [0, 20], [15, 0], CLAMP);

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: FONT }}>
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 48,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 80px',
        borderBottom: `1px solid ${CARD_BORDER}`,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, letterSpacing: 2, fontFamily: FONT_MONO }}>
          MENGAPA SINAR
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, letterSpacing: 2, fontFamily: FONT_MONO }}>
          SINAR PLATFORM
        </span>
      </div>

      {/* Content area */}
      <div style={{
        position: 'absolute', top: 48, bottom: 48, left: 80, right: 80,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        gap: 20,
      }}>
        {/* Title */}
        <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, marginBottom: 8 }}>
          <h2 style={{ fontSize: 42, fontWeight: 800, color: TEXT_PRIMARY, margin: 0, lineHeight: 1.15 }}>
            5 Langkah Menuju{' '}
            <span style={{ background: 'linear-gradient(90deg, #1B4332, #B8860B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              158x Jangkauan
            </span>
          </h2>
          <p style={{ fontSize: 17, color: TEXT_MUTED, margin: '8px 0 0', fontWeight: 500 }}>
            Dari satu instruksi ke jutaan jangkauan organik
          </p>
        </div>

        {/* Step cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {steps.map((step, i) => {
            const appear = spring({ frame: frame - 12 - i * 8, fps, config: { damping: 22, mass: 0.7 } });
            return (
              <div key={i} style={{
                opacity: appear,
                transform: `translateX(${(1 - appear) * 30}px)`,
                display: 'flex', alignItems: 'center', gap: 20,
                padding: '18px 24px',
                background: CARD_BG,
                border: `1px solid ${CARD_BORDER}`,
                borderLeft: `4px solid ${step.color}`,
                borderRadius: 6,
              }}>
                {/* Step number */}
                <div style={{
                  fontSize: 40, fontWeight: 800, color: '#E8E4DD',
                  fontFamily: FONT_MONO, lineHeight: 1, flexShrink: 0, width: 48, textAlign: 'center',
                }}>
                  {step.num}
                </div>

                {/* Colored indicator circle */}
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', background: step.color, flexShrink: 0,
                }} />

                {/* Text */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: TEXT_PRIMARY, margin: 0 }}>
                    {step.title}
                  </p>
                  <p style={{ fontSize: 14, color: TEXT_MUTED, margin: '4px 0 0', lineHeight: 1.5 }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 48,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 80px',
        borderTop: `1px solid ${CARD_BORDER}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(90deg, #1B4332, #B8860B)' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_MUTED, fontFamily: FONT_MONO }}>sinar.id</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_MUTED, fontFamily: FONT_MONO }}>07</span>
      </div>
    </AbsoluteFill>
  );
};

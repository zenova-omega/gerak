import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
} from 'remotion';

const GOLD = '#D4A843';
const DARK = '#050E09';

const steps = [
  { num: '1', title: 'Misi Terkoordinasi', desc: 'DISPENAD mengirim instruksi "Sebarkan Liputan Jembatan" langsung ke 400.000 prajurit melalui satu kali broadcast', color: '#8B1A1A', icon: '📡' },
  { num: '2', title: 'Eksekusi Serentak', desc: 'Semua prajurit like, share, dan upload konten ke 6 platform media sosial secara bersamaan dalam hitungan menit', color: '#14532D', icon: '⚡' },
  { num: '3', title: 'Efek KBT', desc: '1,2 juta anggota Keluarga Besar TNI (KBT) ikut menyebarkan ke grup WhatsApp, komunitas RT/RW, dan tetangga mereka', color: '#0F766E', icon: '👨‍👩‍👧‍👦' },
  { num: '4', title: 'Algoritma Terpicu', desc: 'Engagement masif dalam waktu singkat memicu algoritma trending di YouTube, Instagram, TikTok, dan X sekaligus', color: '#6D28D9', icon: '📈' },
  { num: '5', title: 'Viral Organik', desc: 'Konten yang sudah trending menarik audiens baru secara organik — snowball effect menuju jangkauan 16 juta+', color: GOLD, icon: '🚀' },
];

export const WhySinar = () => {
  const frame = useCurrentFrame();

  const titleOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: DARK, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #030806, #081510, #030806)' }} />

      {/* Title */}
      <div style={{ position: 'absolute', top: 50, left: 0, right: 0, textAlign: 'center', opacity: titleOp, zIndex: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'rgba(184,134,11,0.7)', letterSpacing: 6, marginBottom: 10 }}>
          MENGAPA SINAR EFEKTIF?
        </div>
        <h2 style={{ fontSize: 44, fontWeight: 800, color: '#fff', margin: 0 }}>
          5 Langkah Menuju <span style={{ color: GOLD }}>158× Jangkauan</span>
        </h2>
      </div>

      {/* Steps — large cards in a column */}
      <div style={{ position: 'absolute', top: 170, bottom: 50, left: 80, right: 80, display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'center' }}>
        {steps.map((step, i) => {
          const appear = spring({ frame: frame - 15 - i * 10, fps: 30, config: { damping: 20 } });
          return (
            <div key={i} style={{
              opacity: appear,
              display: 'flex', alignItems: 'center', gap: 20,
              padding: '18px 28px', borderRadius: 16,
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${step.color}25`,
              borderLeft: `4px solid ${step.color}`,
            }}>
              {/* Number + Icon */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: step.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 20px ${step.color}30` }}>
                  <span style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>{step.num}</span>
                </div>
                <span style={{ fontSize: 28 }}>{step.icon}</span>
              </div>

              {/* Text */}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0 }}>{step.title}</p>
                <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', margin: '4px 0 0', lineHeight: 1.5 }}>{step.desc}</p>
              </div>

              {/* Arrow indicator */}
              {i < 4 && (
                <div style={{ position: 'absolute', right: -20, color: `${GOLD}40`, fontSize: 20 }}>↓</div>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

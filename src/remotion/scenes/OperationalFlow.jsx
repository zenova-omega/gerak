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

/* ── Mini UI Mockup for each step ── */

function AdminDashboardMini({ opacity }) {
  return (
    <div style={{ opacity, width: 320, height: 200, borderRadius: 12, background: '#0B2619', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,0.4)' }}>
      <div style={{ padding: '5px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{ display: 'flex', gap: 3 }}>{[0,1,2].map(i=><div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: ['#EF4444','#F59E0B','#22C55E'][i] }} />)}</div>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', flex: 1, textAlign: 'center' }}>SINAR Command Center</span>
      </div>
      <div style={{ padding: '8px' }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '6px 8px', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, background: 'rgba(184,134,11,0.15)', padding: '1px 6px', borderRadius: 3 }}>EVENT</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Prioritas Tinggi</span>
          </div>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', margin: 0 }}>Upacara HUT TNI AD ke-81</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>Target: 400.000 prajurit</p>
        </div>
        <div style={{ background: '#14532D', borderRadius: 6, padding: '6px', textAlign: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#4ADE80' }}>KIRIM KE 400K PRAJURIT →</span>
        </div>
      </div>
    </div>
  );
}

function PhoneNotifMini({ opacity }) {
  return (
    <div style={{ opacity, width: 170, height: 280, borderRadius: 16, background: '#111', border: '2px solid rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,0.4)', position: 'relative' }}>
      <div style={{ padding: '4px 8px 2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>09:41</span>
        <div style={{ width: 40, height: 8, background: '#fff', borderRadius: 4 }} />
        <span style={{ fontSize: 11, color: '#fff' }}>📶</span>
      </div>
      <div style={{ padding: '6px 8px' }}>
        {/* Notification card */}
        <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 8, padding: '6px 8px', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
            <span style={{ fontSize: 12 }}>🔔</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#4ADE80' }}>Misi Baru!</span>
          </div>
          <p style={{ fontSize: 11, color: '#fff', margin: 0, lineHeight: 1.3 }}>Upacara HUT TNI AD ke-81</p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>+400 XP · EVENT</p>
        </div>
        {/* Mission list preview */}
        {[0,1].map(i => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '4px 6px', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, background: i === 0 ? 'rgba(109,40,217,0.2)' : 'rgba(184,134,11,0.2)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ width: '80%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }} />
              <div style={{ width: '50%', height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, marginTop: 2 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UploadMini({ opacity }) {
  return (
    <div style={{ opacity, width: 170, height: 280, borderRadius: 16, background: '#111', border: '2px solid rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,0.4)' }}>
      <div style={{ padding: '4px 8px 2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>09:45</span>
        <div style={{ width: 40, height: 8, background: '#fff', borderRadius: 4 }} />
        <span style={{ fontSize: 11, color: '#fff' }}>📶</span>
      </div>
      <div style={{ padding: '6px 8px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', margin: '4px 0 6px' }}>Upload Bukti</p>
        {/* Photo placeholder */}
        <div style={{ width: '100%', height: 70, borderRadius: 8, background: 'linear-gradient(135deg, #14532D, #1F7542)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 20 }}>📸</span>
        </div>
        {/* Caption field */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '4px 6px', marginBottom: 6 }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Dokumentasi upacara...</p>
        </div>
        {/* Platform tags */}
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {['IG', 'YT', 'TT'].map(p => (
            <span key={p} style={{ fontSize: 10, padding: '2px 5px', borderRadius: 3, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>{p}</span>
          ))}
        </div>
        <div style={{ background: '#0F766E', borderRadius: 6, padding: '5px', textAlign: 'center', marginTop: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>SUBMIT →</span>
        </div>
      </div>
    </div>
  );
}

function AiCheckMini({ opacity, frame, startFrame }) {
  const checkProgress = interpolate(frame, [startFrame + 10, startFrame + 30], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const checks = ['Format sesuai', 'Hashtag ada', 'Durasi OK', 'Original'];
  return (
    <div style={{ opacity, width: 260, height: 210, borderRadius: 10, background: 'rgba(109,40,217,0.08)', border: '1px solid rgba(109,40,217,0.2)', padding: '12px', boxShadow: '0 6px 24px rgba(0,0,0,0.4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>🤖</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#A78BFA' }}>AI Verification</span>
      </div>
      {checks.map((c, i) => {
        const done = checkProgress > (i + 1) / checks.length;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{ width: 14, height: 14, borderRadius: 4, background: done ? '#4ADE80' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
              {done && <span style={{ fontSize: 12, color: '#fff' }}>✓</span>}
            </div>
            <span style={{ fontSize: 13, color: done ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)' }}>{c}</span>
          </div>
        );
      })}
      <div style={{ marginTop: 6, padding: '4px 8px', borderRadius: 6, background: checkProgress >= 1 ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: checkProgress >= 1 ? '#4ADE80' : 'rgba(255,255,255,0.2)' }}>
          {checkProgress >= 1 ? 'PASSED — Score: 87/100' : 'Checking...'}
        </span>
      </div>
    </div>
  );
}

function RewardMini({ opacity }) {
  return (
    <div style={{ opacity, width: 260, height: 210, borderRadius: 10, background: 'rgba(184,134,11,0.06)', border: '1px solid rgba(184,134,11,0.2)', padding: '12px', boxShadow: '0 6px 24px rgba(0,0,0,0.4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>🏆</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: GOLD }}>Reward Diterima!</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '6px 8px', background: 'rgba(184,134,11,0.1)', borderRadius: 6 }}>
        <span style={{ fontSize: 20, fontWeight: 900, color: GOLD, fontFamily: "'JetBrains Mono'" }}>+400</span>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>XP Earned</span>
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {['🏅', '⚡', '📸'].map((b, i) => (
          <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(184,134,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(184,134,11,0.2)' }}>
            <span style={{ fontSize: 12 }}>{b}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: '65%', height: '100%', background: `linear-gradient(90deg, #14532D, ${GOLD})`, borderRadius: 3 }} />
        </div>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Sersan</span>
      </div>
    </div>
  );
}

/* ── Arrow connector ── */
function Arrow({ frame, startFrame }) {
  const op = interpolate(frame, [startFrame, startFrame + 10], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', opacity: op, margin: '0 6px' }}>
      <div style={{ width: 40, height: 2, background: `linear-gradient(90deg, ${GOLD}50, ${GOLD}15)` }} />
      <div style={{ width: 0, height: 0, borderStyle: 'solid', borderWidth: '5px 0 5px 8px', borderColor: `transparent transparent transparent ${GOLD}40` }} />
    </div>
  );
}

export const OperationalFlow = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timeline (30fps, 600 frames = 20s):
  // 0-60:     Title
  // 60-120:   Step 1 — Admin Dashboard
  // 120-180:  Step 2 — Phone notification
  // 180-240:  Step 3 — Upload proof
  // 240-330:  Step 4 — AI check (animated checkmarks)
  // 330-400:  Step 5 — Reward
  // 400-600:  Hold all visible

  const titleOp = interpolate(frame, [0, 25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, 25], [25, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const steps = [
    { label: 'LANGKAH 1', title: 'DISPENAD Buat Misi', sub: 'Admin membuat & broadcast instruksi', color: '#8B1A1A', startFrame: 20 },
    { label: 'LANGKAH 2', title: 'Prajurit Terima', sub: '400K menerima notifikasi di app', color: '#14532D', startFrame: 38 },
    { label: 'LANGKAH 3', title: 'Eksekusi & Upload', sub: 'Hadir, dokumentasi, upload bukti', color: '#0F766E', startFrame: 55 },
    { label: 'LANGKAH 4', title: 'Verifikasi AI', sub: 'Sistem AI cek kualitas otomatis', color: '#6D28D9', startFrame: 72 },
    { label: 'LANGKAH 5', title: 'Reward & XP', sub: 'Poin masuk, pangkat naik', color: GOLD, startFrame: 90 },
  ];

  return (
    <AbsoluteFill style={{ background: DARK, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #030806, #081510, #030806)' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(184,134,11,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Title */}
      <div style={{ position: 'absolute', top: 40, left: 0, right: 0, textAlign: 'center', opacity: titleOp, transform: `translateY(${titleY}px)`, zIndex: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'rgba(184,134,11,0.7)', letterSpacing: 6, marginBottom: 8 }}>
          CARA KERJA SINAR
        </div>
        <h2 style={{ fontSize: 40, fontWeight: 800, color: '#fff', margin: 0 }}>
          Dari <span style={{ color: '#8B1A1A' }}>Komando</span> ke <span style={{ color: GOLD }}>Reward</span> — 5 Langkah
        </h2>
      </div>

      {/* Main content — 2 rows: row 1 = steps 1-3, row 2 = steps 4-5 */}
      <div style={{ position: 'absolute', top: 140, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '0 60px' }}>

        {/* Row 1: Steps 1-3 */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 0 }}>
          {steps.slice(0, 3).map((step, i) => {
            const appear = spring({ frame: frame - step.startFrame, fps, config: { damping: 20, mass: 0.6 } });
            return (
              <React.Fragment key={i}>
                {i > 0 && <Arrow frame={frame} startFrame={step.startFrame - 10} />}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: appear, transform: `translateY(${(1 - appear) * 20}px)` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: step.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 16px ${step.color}40` }}>
                      <span style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>{i + 1}</span>
                    </div>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0 }}>{step.title}</p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{step.sub}</p>
                    </div>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    {i === 0 && <AdminDashboardMini opacity={appear} />}
                    {i === 1 && <PhoneNotifMini opacity={appear} />}
                    {i === 2 && <UploadMini opacity={appear} />}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Row 2: Steps 4-5 (centered) */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 0 }}>
          {steps.slice(3).map((step, i) => {
            const realIdx = i + 3;
            const appear = spring({ frame: frame - step.startFrame, fps, config: { damping: 20, mass: 0.6 } });
            return (
              <React.Fragment key={realIdx}>
                {i > 0 && <Arrow frame={frame} startFrame={step.startFrame - 10} />}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: appear, transform: `translateY(${(1 - appear) * 20}px)` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: step.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 16px ${step.color}40` }}>
                      <span style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>{realIdx + 1}</span>
                    </div>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0 }}>{step.title}</p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{step.sub}</p>
                    </div>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    {realIdx === 3 && <AiCheckMini opacity={appear} frame={frame} startFrame={step.startFrame} />}
                    {realIdx === 4 && <RewardMini opacity={appear} />}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Bottom summary */}
      {(() => {
        const sumOp = interpolate(frame, [110, 130], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center', opacity: sumOp, zIndex: 20 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '12px 28px', borderRadius: 14, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(184,134,11,0.15)' }}>
              <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>
                Semua langkah <strong style={{ color: GOLD }}>terotomasi</strong> — dari instruksi sampai reward
              </span>
            </div>
          </div>
        );
      })()}
    </AbsoluteFill>
  );
};

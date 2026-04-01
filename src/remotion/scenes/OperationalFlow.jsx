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
  { label: 'LANGKAH 1', title: 'DISPENAD Buat Misi', sub: 'Admin membuat & broadcast instruksi', color: '#8B1A1A', startFrame: 20 },
  { label: 'LANGKAH 2', title: 'Prajurit Terima', sub: '400K menerima notifikasi di app', color: '#1B4332', startFrame: 38 },
  { label: 'LANGKAH 3', title: 'Eksekusi & Upload', sub: 'Hadir, dokumentasi, upload bukti', color: '#0F766E', startFrame: 55 },
  { label: 'LANGKAH 4', title: 'Verifikasi AI', sub: 'Sistem AI cek kualitas otomatis', color: '#6D28D9', startFrame: 72 },
  { label: 'LANGKAH 5', title: 'Reward & XP', sub: 'Poin masuk, pangkat naik', color: '#B8860B', startFrame: 90 },
];

/* ── Mini UI: Admin Dashboard ── */
function AdminDashboardMini({ opacity }) {
  return (
    <div style={{
      opacity, width: '100%', borderRadius: 6,
      background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '4px 8px', borderBottom: `1px solid ${CARD_BORDER}`,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <div style={{ display: 'flex', gap: 3 }}>
          {['#EF4444', '#F59E0B', '#22C55E'].map((c, i) => (
            <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <span style={{ fontSize: 9, color: TEXT_MUTED, flex: 1, textAlign: 'center', fontFamily: FONT_MONO }}>Command Center</span>
      </div>
      <div style={{ padding: 8 }}>
        <div style={{ background: `#8B1A1A08`, border: '1px solid #8B1A1A15', borderRadius: 4, padding: '5px 7px', marginBottom: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#8B1A1A', background: '#8B1A1A10', padding: '1px 5px', borderRadius: 2, fontFamily: FONT_MONO }}>EVENT</span>
            <span style={{ fontSize: 9, color: TEXT_MUTED }}>Prioritas Tinggi</span>
          </div>
          <p style={{ fontSize: 10, fontWeight: 700, color: TEXT_PRIMARY, margin: 0 }}>Upacara HUT TNI AD ke-81</p>
          <p style={{ fontSize: 9, color: TEXT_MUTED, margin: '2px 0 0' }}>Target: 400.000 prajurit</p>
        </div>
        <div style={{ background: '#1B4332', borderRadius: 4, padding: 4, textAlign: 'center' }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', fontFamily: FONT_MONO }}>KIRIM KE 400K PRAJURIT</span>
        </div>
      </div>
    </div>
  );
}

/* ── Mini UI: Phone Notification ── */
function PhoneNotifMini({ opacity }) {
  return (
    <div style={{
      opacity, width: '100%', borderRadius: 6,
      background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '4px 8px', borderBottom: `1px solid ${CARD_BORDER}`, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: TEXT_PRIMARY }}>09:41</span>
        <span style={{ fontSize: 9, color: TEXT_MUTED }}>SINAR App</span>
      </div>
      <div style={{ padding: 8 }}>
        <div style={{ background: '#1B433208', border: '1px solid #1B433215', borderRadius: 4, padding: '5px 7px', marginBottom: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1B4332' }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: '#1B4332' }}>Misi Baru!</span>
          </div>
          <p style={{ fontSize: 9, color: TEXT_SECONDARY, margin: 0 }}>Upacara HUT TNI AD ke-81</p>
          <p style={{ fontSize: 8, color: TEXT_MUTED, margin: '2px 0 0', fontFamily: FONT_MONO }}>+400 XP</p>
        </div>
        {[0, 1].map(i => (
          <div key={i} style={{ background: '#F5F3EE', borderRadius: 3, padding: '3px 6px', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: i === 0 ? '#6D28D915' : '#B8860B15', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ width: '80%', height: 3, background: CARD_BORDER, borderRadius: 2 }} />
              <div style={{ width: '50%', height: 2, background: '#E8E4DD', borderRadius: 2, marginTop: 2 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Mini UI: Upload Proof ── */
function UploadMini({ opacity }) {
  return (
    <div style={{
      opacity, width: '100%', borderRadius: 6,
      background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '4px 8px', borderBottom: `1px solid ${CARD_BORDER}`, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: TEXT_PRIMARY }}>09:45</span>
        <span style={{ fontSize: 9, color: TEXT_MUTED }}>Upload</span>
      </div>
      <div style={{ padding: 8 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: TEXT_PRIMARY, margin: '0 0 5px' }}>Upload Bukti</p>
        <div style={{
          width: '100%', height: 50, borderRadius: 4,
          background: '#1B433210', border: `1px dashed #1B433230`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 5,
        }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#1B4332', opacity: 0.3 }} />
        </div>
        <div style={{ display: 'flex', gap: 3, marginBottom: 5 }}>
          {['IG', 'YT', 'TT'].map(p => (
            <span key={p} style={{ fontSize: 8, padding: '2px 5px', borderRadius: 2, background: '#F5F3EE', border: `1px solid ${CARD_BORDER}`, color: TEXT_MUTED, fontWeight: 700, fontFamily: FONT_MONO }}>{p}</span>
          ))}
        </div>
        <div style={{ background: '#0F766E', borderRadius: 4, padding: 4, textAlign: 'center' }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', fontFamily: FONT_MONO }}>SUBMIT</span>
        </div>
      </div>
    </div>
  );
}

/* ── Mini UI: AI Verification ── */
function AiCheckMini({ opacity, frame, startFrame }) {
  const checkProgress = interpolate(frame, [startFrame + 10, startFrame + 30], [0, 1], CLAMP);
  const checks = ['Format sesuai', 'Hashtag ada', 'Durasi OK', 'Original'];
  return (
    <div style={{
      opacity, width: '100%', borderRadius: 6,
      background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
      padding: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6D28D9' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#6D28D9', fontFamily: FONT_MONO }}>AI Verification</span>
      </div>
      {checks.map((c, i) => {
        const done = checkProgress > (i + 1) / checks.length;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
            <div style={{
              width: 12, height: 12, borderRadius: 3,
              background: done ? '#1B4332' : '#E8E4DD',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {done && <span style={{ fontSize: 8, color: '#fff', fontWeight: 800 }}>OK</span>}
            </div>
            <span style={{ fontSize: 10, color: done ? TEXT_PRIMARY : TEXT_MUTED }}>{c}</span>
          </div>
        );
      })}
      <div style={{
        marginTop: 5, padding: '3px 6px', borderRadius: 4, textAlign: 'center',
        background: checkProgress >= 1 ? '#1B433210' : '#F5F3EE',
        border: `1px solid ${checkProgress >= 1 ? '#1B433220' : CARD_BORDER}`,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: checkProgress >= 1 ? '#1B4332' : TEXT_MUTED, fontFamily: FONT_MONO }}>
          {checkProgress >= 1 ? 'PASSED — 87/100' : 'Checking...'}
        </span>
      </div>
    </div>
  );
}

/* ── Mini UI: Reward ── */
function RewardMini({ opacity }) {
  return (
    <div style={{
      opacity, width: '100%', borderRadius: 6,
      background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
      padding: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#B8860B' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#B8860B' }}>Reward Diterima!</span>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
        padding: '5px 8px', background: '#B8860B08', border: '1px solid #B8860B15', borderRadius: 4,
      }}>
        <span style={{ fontSize: 16, fontWeight: 900, color: '#B8860B', fontFamily: FONT_MONO }}>+400</span>
        <span style={{ fontSize: 10, color: TEXT_MUTED }}>XP Earned</span>
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {['#1B4332', '#B8860B', '#0F766E'].map((c, i) => (
          <div key={i} style={{
            width: 22, height: 22, borderRadius: '50%',
            background: `${c}12`, border: `1.5px solid ${c}25`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{ flex: 1, height: 5, background: '#E8E4DD', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: '65%', height: '100%', background: 'linear-gradient(90deg, #1B4332, #B8860B)', borderRadius: 3 }} />
        </div>
        <span style={{ fontSize: 9, color: TEXT_MUTED, fontFamily: FONT_MONO }}>Sersan</span>
      </div>
    </div>
  );
}

/* ── Arrow connector ── */
function StepArrow({ frame, startFrame }) {
  const op = interpolate(frame, [startFrame, startFrame + 10], [0, 1], CLAMP);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: op, width: 32, flexShrink: 0 }}>
      <svg width="20" height="12" viewBox="0 0 20 12">
        <path d="M0 6 L14 6 M10 2 L16 6 L10 10" stroke={CARD_BORDER} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export const OperationalFlow = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = interpolate(frame, [0, 20], [0, 1], CLAMP);
  const titleY = interpolate(frame, [0, 20], [15, 0], CLAMP);

  const summaryOp = interpolate(frame, [110, 130], [0, 1], CLAMP);

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
          CARA KERJA
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, letterSpacing: 2, fontFamily: FONT_MONO }}>
          SINAR PLATFORM
        </span>
      </div>

      {/* Content area */}
      <div style={{
        position: 'absolute', top: 48, bottom: 48, left: 80, right: 80,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20,
      }}>
        {/* Title */}
        <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, marginBottom: 4 }}>
          <h2 style={{ fontSize: 38, fontWeight: 800, color: TEXT_PRIMARY, margin: 0, lineHeight: 1.15 }}>
            Dari{' '}
            <span style={{ color: '#8B1A1A' }}>Komando</span>
            {' '}ke{' '}
            <span style={{ color: '#B8860B' }}>Reward</span>
            {' '}&mdash; 5 Langkah
          </h2>
          <p style={{ fontSize: 16, color: TEXT_MUTED, margin: '6px 0 0', fontWeight: 500 }}>
            Alur operasional end-to-end yang terotomasi
          </p>
        </div>

        {/* Row 1: Steps 1-3 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
          {steps.slice(0, 3).map((step, i) => {
            const appear = spring({ frame: frame - step.startFrame, fps, config: { damping: 22, mass: 0.7 } });
            return (
              <React.Fragment key={i}>
                {i > 0 && <StepArrow frame={frame} startFrame={step.startFrame - 10} />}
                <div style={{
                  flex: 1, opacity: appear,
                  transform: `translateY(${(1 - appear) * 20}px)`,
                  display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  {/* Step header card */}
                  <div style={{
                    padding: '12px 14px',
                    background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
                    borderTop: `3px solid ${step.color}`, borderRadius: 6,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', background: step.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', fontFamily: FONT_MONO }}>{i + 1}</span>
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: TEXT_PRIMARY, margin: 0 }}>{step.title}</p>
                        <p style={{ fontSize: 10, color: TEXT_MUTED, margin: '1px 0 0' }}>{step.sub}</p>
                      </div>
                    </div>
                  </div>
                  {/* Mini UI mockup */}
                  <div style={{ padding: '0 4px' }}>
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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 0 }}>
          {steps.slice(3).map((step, i) => {
            const realIdx = i + 3;
            const appear = spring({ frame: frame - step.startFrame, fps, config: { damping: 22, mass: 0.7 } });
            return (
              <React.Fragment key={realIdx}>
                {i > 0 && <StepArrow frame={frame} startFrame={step.startFrame - 10} />}
                <div style={{
                  width: 280, opacity: appear,
                  transform: `translateY(${(1 - appear) * 20}px)`,
                  display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  {/* Step header card */}
                  <div style={{
                    padding: '12px 14px',
                    background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
                    borderTop: `3px solid ${step.color}`, borderRadius: 6,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', background: step.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', fontFamily: FONT_MONO }}>{realIdx + 1}</span>
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: TEXT_PRIMARY, margin: 0 }}>{step.title}</p>
                        <p style={{ fontSize: 10, color: TEXT_MUTED, margin: '1px 0 0' }}>{step.sub}</p>
                      </div>
                    </div>
                  </div>
                  {/* Mini UI mockup */}
                  <div style={{ padding: '0 4px' }}>
                    {realIdx === 3 && <AiCheckMini opacity={appear} frame={frame} startFrame={step.startFrame} />}
                    {realIdx === 4 && <RewardMini opacity={appear} />}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Summary */}
        <div style={{ textAlign: 'center', opacity: summaryOp }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 24px', borderRadius: 6,
            background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(90deg, #1B4332, #B8860B)' }} />
            <span style={{ fontSize: 14, color: TEXT_SECONDARY }}>
              Semua langkah <strong style={{ color: TEXT_PRIMARY }}>terotomasi</strong> &mdash; dari instruksi sampai reward
            </span>
          </div>
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
        <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_MUTED, fontFamily: FONT_MONO }}>06</span>
      </div>
    </AbsoluteFill>
  );
};

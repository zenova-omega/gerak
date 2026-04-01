import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

/* ── Design Tokens ── */
const BG_GRADIENT = 'linear-gradient(160deg, #0B2619, #1A1814)';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_DIM = 'rgba(255,255,255,0.45)';
const TEXT_MID = 'rgba(255,255,255,0.6)';
const GREEN_PRIMARY = '#1B4332';
const GREEN_ACCENT = '#2D6A4F';
const GOLD = '#B8860B';
const GRADIENT_ACCENT = 'linear-gradient(90deg, #1B4332, #B8860B)';
const FONT = "'Inter', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";

/* Animated counter */
function Counter({ value, frame, startFrame, duration = 60, color = '#fff', size = 48 }) {
  const progress = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const current = Math.floor((1 - Math.pow(1 - progress, 3)) * value);
  return (
    <span style={{ fontSize: size, fontWeight: 900, color, fontFamily: FONT_MONO, lineHeight: 1 }}>
      {current.toLocaleString()}
    </span>
  );
}

/* ── YouTube Mini Card ── */
function YTCard({ frame, startFrame }) {
  const appear = spring({ frame: frame - startFrame, fps: 30, config: { damping: 13 } });
  const views = Math.floor(interpolate(frame, [startFrame + 30, startFrame + 120], [0, 2400000], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  return (
    <div style={{ transform: `scale(${appear})`, opacity: appear, width: 240, borderRadius: 10, background: '#111', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <div style={{ height: 110, background: `linear-gradient(135deg,${GREEN_PRIMARY},${GREEN_ACCENT})`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ width: 44, height: 30, borderRadius: 8, background: '#FF0000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 0, height: 0, borderStyle: 'solid', borderWidth: '7px 0 7px 12px', borderColor: 'transparent transparent transparent #fff', marginLeft: 2 }} />
        </div>
        <div style={{ position: 'absolute', bottom: 4, right: 6, background: 'rgba(0,0,0,0.8)', borderRadius: 3, padding: '1px 5px' }}>
          <span style={{ fontSize: 9, color: '#fff', fontFamily: FONT_MONO }}>12:34</span>
        </div>
      </div>
      <div style={{ padding: '8px 10px' }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: TEXT_PRIMARY, margin: 0, lineHeight: 1.3 }}>KSAD Resmikan 200 Jembatan Garuda</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <span style={{ fontSize: 9, color: TEXT_DIM }}>TNI AD Official</span>
          <span style={{ fontSize: 8, color: '#60A5FA' }}>&#10003;</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <span style={{ fontSize: 9, color: TEXT_DIM, fontFamily: FONT_MONO }}>{views >= 1000000 ? `${(views/1000000).toFixed(1)}M` : views >= 1000 ? `${Math.floor(views/1000)}K` : views} views</span>
          <span style={{ fontSize: 9, color: TEXT_DIM }}>180K</span>
        </div>
      </div>
    </div>
  );
}

/* ── Instagram Post Card ── */
function IGCard({ frame, startFrame }) {
  const appear = spring({ frame: frame - startFrame, fps: 30, config: { damping: 13 } });
  const likes = Math.floor(interpolate(frame, [startFrame + 20, startFrame + 80], [0, 45200], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  return (
    <div style={{ transform: `scale(${appear})`, opacity: appear, width: 200, borderRadius: 10, background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px' }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#0F0F0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 8, fontWeight: 800, color: '#fff' }}>T</span>
          </div>
        </div>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>tniad_official</span>
        <span style={{ fontSize: 8, color: '#3897f0' }}>&#10003;</span>
      </div>
      <div style={{ width: '100%', height: 130, background: `linear-gradient(135deg,${GREEN_PRIMARY},${GREEN_ACCENT})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 28 }}>&#127753;</span>
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 5 }}>
          <span style={{ fontSize: 14 }}>&#9829;</span>
          <span style={{ fontSize: 14 }}>&#128172;</span>
          <span style={{ fontSize: 14 }}>&#8599;</span>
        </div>
        <p style={{ fontSize: 9, fontWeight: 700, color: '#fff', margin: 0 }}>
          {likes.toLocaleString()} likes
        </p>
        <p style={{ fontSize: 8, color: TEXT_DIM, margin: '3px 0 0', lineHeight: 1.3 }}>
          <strong style={{ color: '#fff' }}>tniad_official</strong> Pembangunan 200 jembatan untuk rakyat
        </p>
      </div>
    </div>
  );
}

/* ── TikTok Card ── */
function TTCard({ frame, startFrame }) {
  const appear = spring({ frame: frame - startFrame, fps: 30, config: { damping: 13 } });
  const hearts = Math.floor(interpolate(frame, [startFrame + 20, startFrame + 80], [0, 128000], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  return (
    <div style={{ transform: `scale(${appear})`, opacity: appear, width: 130, height: 190, borderRadius: 10, background: '#111', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg,${GREEN_PRIMARY},#0B2619)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 32 }}>&#127916;</span>
      </div>
      <div style={{ position: 'absolute', right: 6, bottom: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 16 }}>&#9829;</span>
          <p style={{ fontSize: 7, color: '#fff', margin: 0, fontWeight: 700 }}>{hearts >= 1000 ? `${Math.floor(hearts/1000)}K` : hearts}</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 14 }}>&#128172;</span>
          <p style={{ fontSize: 7, color: '#fff', margin: 0 }}>8.4K</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 14 }}>&#8599;</span>
          <p style={{ fontSize: 7, color: '#fff', margin: 0 }}>32K</p>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 8, left: 8, right: 30 }}>
        <p style={{ fontSize: 8, fontWeight: 700, color: '#fff', margin: 0 }}>@tniad_official</p>
        <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.7)', margin: '2px 0 0', lineHeight: 1.2 }}>Jembatan ke-200! #TNIAD #BanggaTNI</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 3 }}>
          <span style={{ fontSize: 8 }}>&#9835;</span>
          <span style={{ fontSize: 7, color: '#fff' }}>Original Sound - TNI AD</span>
        </div>
      </div>
    </div>
  );
}

/* ── X/Twitter Post Card ── */
function XCard({ frame, startFrame }) {
  const appear = spring({ frame: frame - startFrame, fps: 30, config: { damping: 13 } });
  const retweets = Math.floor(interpolate(frame, [startFrame + 20, startFrame + 80], [0, 34500], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  return (
    <div style={{ transform: `scale(${appear})`, opacity: appear, width: 220, borderRadius: 10, background: '#111', border: '1px solid rgba(255,255,255,0.08)', padding: '12px' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: GREEN_PRIMARY, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>T</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>TNI AD</span>
            <span style={{ fontSize: 8, color: '#1D9BF0' }}>&#10003;</span>
            <span style={{ fontSize: 8, color: TEXT_DIM }}>@tniad - 2h</span>
          </div>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.85)', margin: '4px 0 0', lineHeight: 1.4 }}>
            KSAD Maruli Simanjuntak resmikan 200 Jembatan Garuda di Aceh Utara. Membangun untuk rakyat! #BanggaTNIAD
          </p>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <span style={{ fontSize: 8, color: TEXT_DIM }}>12.4K</span>
            <span style={{ fontSize: 8, color: TEXT_DIM }}>{retweets >= 1000 ? `${(retweets/1000).toFixed(1)}K` : retweets} RT</span>
            <span style={{ fontSize: 8, color: TEXT_DIM }}>89K</span>
            <span style={{ fontSize: 8, color: TEXT_DIM }}>2.1M</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Facebook Post Card ── */
function FBCard({ frame, startFrame }) {
  const appear = spring({ frame: frame - startFrame, fps: 30, config: { damping: 13 } });
  const shares = Math.floor(interpolate(frame, [startFrame + 20, startFrame + 80], [0, 18700], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  return (
    <div style={{ transform: `scale(${appear})`, opacity: appear, width: 210, borderRadius: 10, background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: '#fff' }}>f</span>
          </div>
          <div>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>TNI Angkatan Darat</span>
            <span style={{ fontSize: 8, color: '#1877F2' }}> &#10003;</span>
            <p style={{ fontSize: 7, color: TEXT_DIM, margin: 0 }}>2 jam</p>
          </div>
        </div>
        <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.8)', margin: '6px 0', lineHeight: 1.4 }}>
          200 jembatan telah diresmikan KSAD untuk masyarakat Aceh Utara
        </p>
      </div>
      <div style={{ height: 80, background: `linear-gradient(135deg,${GREEN_PRIMARY},${GREEN_ACCENT})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 22 }}>&#127753;</span>
      </div>
      <div style={{ padding: '6px 12px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize: 8, color: TEXT_DIM }}>24K</span>
        <span style={{ fontSize: 8, color: TEXT_DIM }}>{shares >= 1000 ? `${(shares/1000).toFixed(1)}K` : shares} shares</span>
      </div>
    </div>
  );
}

/* ── WhatsApp Forward Card ── */
function WACard({ frame, startFrame }) {
  const appear = spring({ frame: frame - startFrame, fps: 30, config: { damping: 13 } });
  return (
    <div style={{ transform: `scale(${appear})`, opacity: appear, width: 200, borderRadius: 10, background: '#111', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <div style={{ padding: '6px 10px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 9 }}>&#8618;</span>
        <span style={{ fontSize: 7, color: TEXT_DIM, fontStyle: 'italic' }}>Forwarded</span>
      </div>
      <div style={{ margin: '4px 8px 8px', background: '#005C4B', borderRadius: 8, padding: '8px 10px' }}>
        <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.9)', margin: 0, lineHeight: 1.4 }}>
          KSAD resmikan 200 jembatan di Aceh! Bangga sama TNI AD kita
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <div style={{ flex: 1, height: 28, borderRadius: 4, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', padding: '0 6px', gap: 4 }}>
            <span style={{ fontSize: 8 }}>&#9654;</span>
            <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.2)', borderRadius: 1 }} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 4 }}>
          <span style={{ fontSize: 7, color: TEXT_DIM }}>14:32</span>
          <span style={{ fontSize: 7, color: '#53BDEB' }}>&#10003;&#10003;</span>
        </div>
      </div>
      <div style={{ padding: '0 10px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 8, color: '#25D366' }}>&#128101;</span>
        <span style={{ fontSize: 7, color: TEXT_DIM }}>Shared to 50K+ groups</span>
      </div>
    </div>
  );
}

/* Propagation line — subtle */
function PropLine({ x1, y1, x2, y2, color, frame, startFrame }) {
  const progress = interpolate(frame, [startFrame, startFrame + 30], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  return (
    <div style={{
      position: 'absolute', left: x1, top: y1,
      width: len * progress, height: 1,
      background: `linear-gradient(90deg, ${color}40, ${color}10)`,
      transformOrigin: '0 50%', transform: `rotate(${angle}deg)`, opacity: progress * 0.6,
    }} />
  );
}

/* ═══ MAIN COMPOSITION ═══ */
export const ViralCascade = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = interpolate(frame, [0, 45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, 45], [25, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const statsOp = interpolate(frame, [300, 360], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const cards = [
    { id: 'yt',  x: 860,  y: 360, start: 30,  color: '#FF0000' },
    { id: 'ig',  x: 1380, y: 180, start: 100, color: '#E1306C' },
    { id: 'tt',  x: 1550, y: 520, start: 130, color: '#fff' },
    { id: 'x',   x: 300,  y: 220, start: 160, color: '#1D9BF0' },
    { id: 'fb',  x: 1350, y: 700, start: 190, color: '#1877F2' },
    { id: 'wa',  x: 350,  y: 650, start: 220, color: '#25D366' },
  ];

  const center = { x: 960, y: 470 };

  return (
    <AbsoluteFill style={{ background: BG_GRADIENT, fontFamily: FONT }}>

      {/* ── Top Bar ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 80px', zIndex: 30,
      }}>
        <span style={{ fontSize: 11, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2, textTransform: 'uppercase' }}>
          Engagement Cascade
        </span>
        <span style={{ fontSize: 11, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 2, textTransform: 'uppercase' }}>
          Platform Propagation
        </span>
      </div>

      {/* Title */}
      <div style={{
        position: 'absolute', top: 55, left: 80, right: 80, textAlign: 'left',
        opacity: titleOp, transform: `translateY(${titleY}px)`, zIndex: 20,
      }}>
        <h2 style={{ fontSize: 44, fontWeight: 800, color: TEXT_PRIMARY, margin: 0, lineHeight: 1.2 }}>
          Satu Misi &rarr;{' '}
          <span style={{ background: GRADIENT_ACCENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Jutaan Jangkauan
          </span>
        </h2>
      </div>

      {/* Propagation lines from center to each card */}
      {cards.map((c, i) => (
        <PropLine key={i} x1={center.x} y1={center.y} x2={c.x + 80} y2={c.y + 60} color={c.color} frame={frame} startFrame={c.start - 15} />
      ))}

      {/* ── Platform Mockup Cards ── */}
      <div style={{ position: 'absolute', left: cards[0].x, top: cards[0].y, zIndex: 15 }}>
        <YTCard frame={frame} startFrame={cards[0].start} />
      </div>
      <div style={{ position: 'absolute', left: cards[1].x, top: cards[1].y, zIndex: 12 }}>
        <IGCard frame={frame} startFrame={cards[1].start} />
      </div>
      <div style={{ position: 'absolute', left: cards[2].x, top: cards[2].y, zIndex: 12 }}>
        <TTCard frame={frame} startFrame={cards[2].start} />
      </div>
      <div style={{ position: 'absolute', left: cards[3].x, top: cards[3].y, zIndex: 12 }}>
        <XCard frame={frame} startFrame={cards[3].start} />
      </div>
      <div style={{ position: 'absolute', left: cards[4].x, top: cards[4].y, zIndex: 12 }}>
        <FBCard frame={frame} startFrame={cards[4].start} />
      </div>
      <div style={{ position: 'absolute', left: cards[5].x, top: cards[5].y, zIndex: 12 }}>
        <WACard frame={frame} startFrame={cards[5].start} />
      </div>

      {/* Platform labels under each card */}
      {cards.map((c, i) => {
        const labelOp = interpolate(frame, [c.start + 20, c.start + 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const names = ['YouTube', 'Instagram', 'TikTok', 'X / Twitter', 'Facebook', 'WhatsApp'];
        return (
          <div key={i} style={{
            position: 'absolute',
            left: c.x + (['yt', 'ig', 'fb', 'x'].includes(c.id) ? 100 : 65),
            top: c.y + (c.id === 'tt' ? 198 : c.id === 'wa' ? 145 : c.id === 'yt' ? 155 : c.id === 'ig' ? 218 : c.id === 'x' ? 115 : 200),
            opacity: labelOp, textAlign: 'center', transform: 'translateX(-50%)',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: c.color, letterSpacing: 1, fontFamily: FONT_MONO }}>{names[i]}</span>
          </div>
        );
      })}

      {/* Bottom stats */}
      <div style={{
        position: 'absolute', bottom: 60, left: 80, right: 80,
        display: 'flex', justifyContent: 'center', gap: 60,
        opacity: statsOp, zIndex: 20,
      }}>
        {[
          { label: 'Total Views', value: 2400000, color: '#EF4444' },
          { label: 'Engagements', value: 890000, color: '#22C55E' },
          { label: 'Shares', value: 340000, color: '#60A5FA' },
          { label: 'New Followers', value: 125000, color: '#6D28D9' },
        ].map((stat, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <Counter value={stat.value} frame={frame} startFrame={320 + i * 15} duration={60} color={stat.color} size={32} />
            <p style={{ fontSize: 11, color: TEXT_DIM, marginTop: 4, fontWeight: 600, letterSpacing: 1 }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Bottom Bar ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 80px', zIndex: 30,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: GRADIENT_ACCENT }} />
          <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_DIM, letterSpacing: 1 }}>sinar.id</span>
        </div>
        <span style={{ fontSize: 12, fontFamily: FONT_MONO, color: TEXT_DIM }}>02</span>
      </div>

    </AbsoluteFill>
  );
};

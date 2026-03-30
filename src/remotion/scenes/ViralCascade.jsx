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
const GREEN = '#22C55E';
const BLUE = '#60A5FA';
const PURPLE = '#A78BFA';

/* Animated counter */
function Counter({ value, frame, startFrame, duration = 60, color = '#fff', size = 48 }) {
  const progress = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const current = Math.floor((1 - Math.pow(1 - progress, 3)) * value);
  return (
    <span style={{ fontSize: size, fontWeight: 900, color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
      {current.toLocaleString()}
    </span>
  );
}

/* ── YouTube Mini Card ── */
function YTCard({ frame, startFrame }) {
  const appear = spring({ frame: frame - startFrame, fps: 30, config: { damping: 13 } });
  const views = Math.floor(interpolate(frame, [startFrame + 30, startFrame + 120], [0, 2400000], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  return (
    <div style={{ transform: `scale(${appear})`, opacity: appear, width: 240, borderRadius: 10, background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
      <div style={{ height: 110, background: 'linear-gradient(135deg,#14532D,#1F7542)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ width: 44, height: 30, borderRadius: 8, background: '#FF0000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 0, height: 0, borderStyle: 'solid', borderWidth: '7px 0 7px 12px', borderColor: 'transparent transparent transparent #fff', marginLeft: 2 }} />
        </div>
        <div style={{ position: 'absolute', bottom: 4, right: 6, background: 'rgba(0,0,0,0.8)', borderRadius: 3, padding: '1px 5px' }}>
          <span style={{ fontSize: 9, color: '#fff', fontFamily: "'JetBrains Mono'" }}>12:34</span>
        </div>
      </div>
      <div style={{ padding: '8px 10px' }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.3 }}>KSAD Resmikan 200 Jembatan Garuda</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>TNI AD Official</span>
          <span style={{ fontSize: 8, color: '#60A5FA' }}>✓</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono'" }}>{views >= 1000000 ? `${(views/1000000).toFixed(1)}M` : views >= 1000 ? `${Math.floor(views/1000)}K` : views} views</span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>👍 180K</span>
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
    <div style={{ transform: `scale(${appear})`, opacity: appear, width: 200, borderRadius: 10, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px' }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 8, fontWeight: 800, color: '#fff' }}>T</span>
          </div>
        </div>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>tniad_official</span>
        <span style={{ fontSize: 8, color: '#3897f0' }}>✓</span>
      </div>
      {/* Image */}
      <div style={{ width: '100%', height: 130, background: 'linear-gradient(135deg,#0B2619,#14532D,#1F7542)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 28 }}>🌉</span>
      </div>
      {/* Actions */}
      <div style={{ padding: '8px 10px' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 5 }}>
          <span style={{ fontSize: 14 }}>♥</span>
          <span style={{ fontSize: 14 }}>💬</span>
          <span style={{ fontSize: 14 }}>↗</span>
        </div>
        <p style={{ fontSize: 9, fontWeight: 700, color: '#fff', margin: 0 }}>
          {likes.toLocaleString()} likes
        </p>
        <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', margin: '3px 0 0', lineHeight: 1.3 }}>
          <strong style={{ color: '#fff' }}>tniad_official</strong> Pembangunan 200 jembatan untuk rakyat 🇮🇩
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
    <div style={{ transform: `scale(${appear})`, opacity: appear, width: 130, height: 190, borderRadius: 10, background: '#000', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.5)', position: 'relative' }}>
      {/* Video bg */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#14532D,#0B2619)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 32 }}>🎬</span>
      </div>
      {/* Right sidebar icons */}
      <div style={{ position: 'absolute', right: 6, bottom: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 16 }}>♥</span>
          <p style={{ fontSize: 7, color: '#fff', margin: 0, fontWeight: 700 }}>{hearts >= 1000 ? `${Math.floor(hearts/1000)}K` : hearts}</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 14 }}>💬</span>
          <p style={{ fontSize: 7, color: '#fff', margin: 0 }}>8.4K</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 14 }}>↗</span>
          <p style={{ fontSize: 7, color: '#fff', margin: 0 }}>32K</p>
        </div>
      </div>
      {/* Bottom info */}
      <div style={{ position: 'absolute', bottom: 8, left: 8, right: 30 }}>
        <p style={{ fontSize: 8, fontWeight: 700, color: '#fff', margin: 0 }}>@tniad_official</p>
        <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.7)', margin: '2px 0 0', lineHeight: 1.2 }}>Jembatan ke-200! 🌉🇮🇩 #TNIAD #BanggaTNI</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 3 }}>
          <span style={{ fontSize: 8 }}>♫</span>
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
    <div style={{ transform: `scale(${appear})`, opacity: appear, width: 220, borderRadius: 10, background: '#000', border: '1px solid rgba(255,255,255,0.12)', padding: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#14532D', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>T</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>TNI AD</span>
            <span style={{ fontSize: 8, color: '#1D9BF0' }}>✓</span>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>@tniad · 2h</span>
          </div>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.85)', margin: '4px 0 0', lineHeight: 1.4 }}>
            KSAD Maruli Simanjuntak resmikan 200 Jembatan Garuda di Aceh Utara. Membangun untuk rakyat! 🌉🇮🇩 #BanggaTNIAD
          </p>
          {/* Engagement row */}
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>💬 12.4K</span>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>🔁 {retweets >= 1000 ? `${(retweets/1000).toFixed(1)}K` : retweets}</span>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>♥ 89K</span>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>📊 2.1M</span>
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
    <div style={{ transform: `scale(${appear})`, opacity: appear, width: 210, borderRadius: 10, background: '#242526', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
      <div style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: '#fff' }}>f</span>
          </div>
          <div>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>TNI Angkatan Darat</span>
            <span style={{ fontSize: 8, color: '#1877F2' }}> ✓</span>
            <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', margin: 0 }}>2 jam · 🌐</p>
          </div>
        </div>
        <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.8)', margin: '6px 0', lineHeight: 1.4 }}>
          200 jembatan telah diresmikan KSAD untuk masyarakat Aceh Utara 🇮🇩
        </p>
      </div>
      <div style={{ height: 80, background: 'linear-gradient(135deg,#14532D,#1F7542)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 22 }}>🌉</span>
      </div>
      <div style={{ padding: '6px 12px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>👍😍 24K</span>
        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>{shares >= 1000 ? `${(shares/1000).toFixed(1)}K` : shares} shares</span>
      </div>
    </div>
  );
}

/* ── WhatsApp Forward Card ── */
function WACard({ frame, startFrame }) {
  const appear = spring({ frame: frame - startFrame, fps: 30, config: { damping: 13 } });
  return (
    <div style={{ transform: `scale(${appear})`, opacity: appear, width: 200, borderRadius: 10, background: '#1F2C34', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
      {/* Forwarded label */}
      <div style={{ padding: '6px 10px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 9 }}>↪</span>
        <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>Forwarded</span>
      </div>
      {/* Message bubble */}
      <div style={{ margin: '4px 8px 8px', background: '#005C4B', borderRadius: 8, padding: '8px 10px' }}>
        <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.9)', margin: 0, lineHeight: 1.4 }}>
          📢 KSAD resmikan 200 jembatan di Aceh! Bangga sama TNI AD kita 🇮🇩🫡
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <div style={{ flex: 1, height: 28, borderRadius: 4, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', padding: '0 6px', gap: 4 }}>
            <span style={{ fontSize: 8 }}>▶</span>
            <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.2)', borderRadius: 1 }} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 4 }}>
          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)' }}>14:32</span>
          <span style={{ fontSize: 7, color: '#53BDEB' }}>✓✓</span>
        </div>
      </div>
      {/* Group info */}
      <div style={{ padding: '0 10px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 8, color: '#25D366' }}>👥</span>
        <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)' }}>Shared to 50K+ groups</span>
      </div>
    </div>
  );
}

/* Propagation line */
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
      width: len * progress, height: 2,
      background: `linear-gradient(90deg, ${color}80, ${color}20)`,
      transformOrigin: '0 50%', transform: `rotate(${angle}deg)`, opacity: progress,
    }} />
  );
}

/* Continuous ripple */
function ContinuousRipple({ frame }) {
  const rings = [0, 1, 2, 3].map((i) => {
    const age = (frame + i * 40) % 160;
    const p = age / 160;
    return { scale: 1 + p * 4, opacity: interpolate(p, [0, 0.1, 0.6, 1], [0, 0.25, 0.12, 0]) };
  });
  return <>
    {rings.map((r, i) => (
      <div key={i} style={{
        position: 'absolute', left: '50%', top: '44%', width: 200, height: 200, borderRadius: '50%',
        border: `1px solid ${GOLD}`, transform: `translate(-50%,-50%) scale(${r.scale})`, opacity: r.opacity,
      }} />
    ))}
  </>;
}

/* ═══ MAIN COMPOSITION ═══ */
export const ViralCascade = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timeline (30fps):
  // 0-45    Title
  // 30-75   Center YouTube card
  // 80-250  Platform mockups fly in staggered
  // 150+    Ripples
  // 300-400 Bottom stats tick up
  // 400+    Hold final state

  const titleOp = interpolate(frame, [0, 45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, 45], [25, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const statsOp = interpolate(frame, [300, 360], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Platform card positions (absolute px on 1920x1080)
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
    <AbsoluteFill style={{ background: DARK, fontFamily: "'Inter', sans-serif" }}>
      {/* Grid bg */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(184,134,11,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(184,134,11,0.03) 1px,transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Title */}
      <div style={{
        position: 'absolute', top: 40, left: 0, right: 0, textAlign: 'center',
        opacity: titleOp, transform: `translateY(${titleY}px)`, zIndex: 20,
      }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(184,134,11,0.7)', letterSpacing: 6, marginBottom: 8 }}>
          ENGAGEMENT CASCADE
        </div>
        <h2 style={{ fontSize: 42, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2 }}>
          Satu Misi &rarr; <span style={{ color: GOLD }}>Jutaan Jangkauan</span>
        </h2>
      </div>

      {/* Ripples */}
      {frame >= 80 && <ContinuousRipple frame={frame} />}

      {/* Propagation lines from center to each card */}
      {cards.map((c, i) => (
        <PropLine key={i} x1={center.x} y1={center.y} x2={c.x + 80} y2={c.y + 60} color={c.color} frame={frame} startFrame={c.start - 15} />
      ))}

      {/* ── Platform Mockup Cards ── */}

      {/* YouTube — center, largest */}
      <div style={{ position: 'absolute', left: cards[0].x, top: cards[0].y, zIndex: 15 }}>
        <YTCard frame={frame} startFrame={cards[0].start} />
      </div>

      {/* Instagram — top right */}
      <div style={{ position: 'absolute', left: cards[1].x, top: cards[1].y, zIndex: 12 }}>
        <IGCard frame={frame} startFrame={cards[1].start} />
      </div>

      {/* TikTok — right */}
      <div style={{ position: 'absolute', left: cards[2].x, top: cards[2].y, zIndex: 12 }}>
        <TTCard frame={frame} startFrame={cards[2].start} />
      </div>

      {/* X/Twitter — top left */}
      <div style={{ position: 'absolute', left: cards[3].x, top: cards[3].y, zIndex: 12 }}>
        <XCard frame={frame} startFrame={cards[3].start} />
      </div>

      {/* Facebook — bottom right */}
      <div style={{ position: 'absolute', left: cards[4].x, top: cards[4].y, zIndex: 12 }}>
        <FBCard frame={frame} startFrame={cards[4].start} />
      </div>

      {/* WhatsApp — bottom left */}
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
            <span style={{ fontSize: 11, fontWeight: 800, color: c.color, letterSpacing: 1 }}>{names[i]}</span>
          </div>
        );
      })}

      {/* Bottom stats */}
      <div style={{
        position: 'absolute', bottom: 40, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 50,
        opacity: statsOp, zIndex: 20,
      }}>
        {[
          { label: 'Total Views', value: 2400000, color: '#FF0000' },
          { label: 'Engagements', value: 890000, color: GREEN },
          { label: 'Shares', value: 340000, color: BLUE },
          { label: 'New Followers', value: 125000, color: PURPLE },
        ].map((stat, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <Counter value={stat.value} frame={frame} startFrame={320 + i * 15} duration={60} color={stat.color} size={32} />
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4, fontWeight: 600, letterSpacing: 1 }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

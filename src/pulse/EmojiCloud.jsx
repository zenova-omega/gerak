import { useMemo } from 'react';
import { packCloud, cloudSize } from '../lib/pulseCloud';
import { formatCount } from '../lib/pulseData';

/** Emoji packed like a word cloud: the glyph itself is the mark, its size follows how many texts use it. */
export default function EmojiCloud({ rows, width: W = 560, height: H = 300, largest = 124, keyCount = 5 }) {
  const max = rows[0]?.count || 1, min = rows.at(-1)?.count || 1;
  const placed = useMemo(() => packCloud(rows.map(row => { const size = cloudSize(row.count, min, max, 30, largest); return { key: row.emoji, row, size, w: size * 1.12, h: size * 1.12 }; }), { width: W, height: H, gap: 4, stretch: 1.5 }), [rows, min, max, W, H, largest]);
  return <div className="oi-cloud-box"><svg className="oi-emoji-cloud" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={'Emotikon teratas: ' + rows.slice(0, 6).map(row => `${row.emoji} ${formatCount(row.count)}`).join(', ')}>
    {placed.map(item => <text key={item.key} x={item.x + item.w / 2} y={item.y + item.h / 2} fontSize={item.size} textAnchor="middle" dominantBaseline="central"><title>{`${item.row.emoji} dipakai di ${formatCount(item.row.count)} posting dan komentar`}</title>{item.row.emoji + '\uFE0F'}</text>)}
  </svg>
  <ol className="oi-cloud-key" aria-hidden="true">{rows.slice(0, keyCount).map(row => <li key={row.emoji}><span>{row.emoji + '\uFE0F'}</span>{formatCount(row.count)}</li>)}</ol></div>;
}


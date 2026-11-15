import React, { useId, useState } from 'react';
import { PlatformIcon, platformLabel } from './PlatformIcon';
import { formatCount } from '../../../lib/pulseData';

/** One account on the map. `radius` comes from its follower count (`nodeRadius`), so the circle never grows
 * when it is selected. `color` is the platform colour; the platform mark at the lower right says the same
 * without colour. `far` fades an account that is not linked to the one being pointed at. Names are drawn by
 * the map in a layer above all circles. Styles live in pulse/ds/network-look.css. */
export default function NetworkAccountNode({ node, position, photo, selected, color, radius, followers = null, far = false, onPreview, onLeave, onSelect }) {
  const clip = useId().replace(/:/g, '');
  const [failed, setFailed] = useState(null);
  const pictured = photo && failed !== photo;
  const inner = radius - 2;   // the picture sits inside the ring
  const initials = node.label.replace(/^@/, '').slice(0, 2).toUpperCase();
  const badge = Math.max(5, Math.min(8.5, radius * 0.4)), glyph = badge * 1.25, corner = radius * 0.72;
  const platform = platformLabel(node.platform);
  const audience = followers === null ? 'jumlah pengikut tidak diketahui' : `${formatCount(followers)} pengikut`;
  return <g className="nx-account-node" data-selected={selected ? '' : undefined} data-mentioned={node.observed ? undefined : ''} data-far={far ? '' : undefined}
    style={{ '--nx-node': color }} transform={`translate(${position.x},${position.y})`} tabIndex={0} role="button"
    aria-label={`Pilih akun ${node.label}, ${platform}, ${audience}`} aria-pressed={selected}
    onMouseEnter={onPreview} onMouseLeave={onLeave} onFocus={onPreview} onBlur={onLeave}
    onClick={onSelect} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } if (e.key === 'Escape') onLeave(); }}>
    <title>{node.label} · {platform} · {audience}{node.observed ? '' : ' · hanya disebut, posting belum tersedia'}</title>
    <circle className="nx-node-hit" r={Math.max(radius + 3, 13)} />
    <circle className="nx-node-focus" r={radius + (selected ? 8 : 5)} />
    {selected && <circle className="nx-node-picked" r={radius + 4} />}
    <circle className="nx-node-ring" r={radius} />
    {!pictured && radius >= 11 && <text className="nx-node-initials" textAnchor="middle" dy=".35em" fontSize={Math.max(8, radius * .62)} aria-hidden="true">{initials}</text>}
    {pictured && <><defs><clipPath id={clip}><circle r={inner} /></clipPath></defs>
      <image href={photo} x={-inner} y={-inner} width={inner * 2} height={inner * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`} onError={() => setFailed(photo)} /></>}
    <g className="nx-node-badge" transform={`translate(${corner},${corner})`} aria-hidden="true">
      <circle r={badge} />
      <g transform={`translate(${-glyph / 2},${-glyph / 2})`}><PlatformIcon platform={node.platform} size={glyph} /></g>
    </g>
  </g>;
}

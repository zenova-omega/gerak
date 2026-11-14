import React, { useId, useState } from 'react';

/** `weight` (0 to 1) is the account's share of the busiest account's connections: hubs are drawn larger and
 * named, accounts without any connection are small, so the shape of the network reads at a glance. */
export default function NetworkAccountNode({ node, position, photo, selected, color, weight = 0, onPreview, onLeave, onSelect }) {
  const clip = useId().replace(/:/g, '');
  const [failed, setFailed] = useState(null);
  const linked = (node.connections || 0) > 0;
  const radius = (linked ? 14 + Math.sqrt(weight) * 10 : 10) + (selected ? 4 : 0);
  const named = selected || weight >= .45;
  const initials = node.label.replace(/^@/, '').slice(0, 2).toUpperCase();
  return <g className="nx-account-node" transform={`translate(${position.x},${position.y})`} tabIndex={0} role="button" aria-label={'Pilih akun '+node.label} aria-pressed={selected}
    onMouseEnter={onPreview} onMouseLeave={onLeave} onFocus={onPreview} onBlur={onLeave}
    onClick={onSelect} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } if (e.key === 'Escape') onLeave(); }}>
    <title>{node.label} · {node.platform} · {node.observed ? 'Arahkan untuk preview, klik untuk memilih' : 'Hanya disebut, posting belum tersedia'}</title>
    <defs><clipPath id={clip}><circle r={radius-2}/></clipPath></defs>
    <circle r={radius} fill="var(--nx-panel)" stroke={color} strokeWidth={selected?3:linked?2:1.25} opacity={linked||selected?1:.7}/>
    <text textAnchor="middle" dy=".35em" fill="var(--nx-text)" fontSize={Math.max(8, radius * .62)} opacity={linked||selected?1:.75} aria-hidden="true">{initials}</text>
    {photo && failed !== photo && <image href={photo} x={-radius+2} y={-radius+2} width={(radius-2)*2} height={(radius-2)*2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`} onError={()=>setFailed(photo)} />}
    {selected && <circle r={radius+5} fill="none" stroke={color} strokeWidth="1"/>}
    {named && <text className="nx-node-name" y={radius+14} textAnchor="middle" fill="var(--nx-text)" fontSize="11" fontWeight={selected?700:600}>{node.label.length>22?node.label.slice(0,20)+'…':node.label}</text>}
  </g>;
}

import React, { useId, useState } from 'react';

export default function NetworkAccountNode({ node, position, photo, selected, color, onPreview, onLeave, onSelect }) {
  const clip = useId().replace(/:/g, '');
  const [failed, setFailed] = useState(null);
  const radius = selected ? 25 : 19;
  const initials = node.label.replace(/^@/, '').slice(0, 2).toUpperCase();
  return <g className="nx-account-node" transform={`translate(${position.x},${position.y})`} tabIndex={0} role="button" aria-label={'Pilih akun '+node.label} aria-pressed={selected}
    onMouseEnter={onPreview} onMouseLeave={onLeave} onFocus={onPreview} onBlur={onLeave}
    onClick={onSelect} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } if (e.key === 'Escape') onLeave(); }}>
    <title>{node.label} · {node.platform} · {node.observed ? 'Arahkan untuk preview, klik untuk memilih' : 'Hanya disebut, posting belum tersedia'}</title>
    <defs><clipPath id={clip}><circle r={radius-2}/></clipPath></defs>
    <circle r={radius} fill="var(--nx-panel)" stroke={color} strokeWidth={selected?3:2}/>
    <text textAnchor="middle" dy=".35em" fill="var(--nx-text)" fontSize="12" aria-hidden="true">{initials}</text>
    {photo && failed !== photo && <image href={photo} x={-radius+2} y={-radius+2} width={(radius-2)*2} height={(radius-2)*2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`} onError={()=>setFailed(photo)} />}
    {selected && <circle r={radius+5} fill="none" stroke={color} strokeWidth="1"/>}
    {selected && <text y={radius+16} textAnchor="middle" fill="var(--nx-text)" fontSize="11">{node.label.length>22?node.label.slice(0,20)+'…':node.label}</text>}
  </g>;
}

import React from 'react';
import { RANKS } from '../../data/ranks';

export function RankInsignia({rank=0,size=120,showLabel=true}){
  const s=size;
  const palettes=[
    {body:['#B0BEC5','#78909C','#546E7A','#37474F'],wing:['#90A4AE','#607D8B','#455A64'],star:'#CFD8DC',glow:'rgba(120,144,156,0.3)',label:'#546E7A',spec:'rgba(255,255,255,0.5)'},
    {body:['#81C784','#43A047','#2E7D32','#1B5E20'],wing:['#66BB6A','#388E3C','#1B5E20'],star:'#A5D6A7',glow:'rgba(67,160,71,0.35)',label:'#2E7D32',spec:'rgba(255,255,255,0.5)'},
    {body:['#E0E0E0','#BDBDBD','#9E9E9E','#616161'],wing:['#BDBDBD','#9E9E9E','#757575'],star:'#F5F5F5',glow:'rgba(189,189,189,0.35)',label:'#757575',spec:'rgba(255,255,255,0.6)'},
    {body:['#FFD54F','#FFC107','#FFA000','#E65100'],wing:['#FFB300','#F9A825','#E65100'],star:'#FFF8E1',glow:'rgba(255,160,0,0.4)',label:'#E65100',spec:'rgba(255,255,255,0.55)'},
    {body:['#CE93D8','#AB47BC','#7B1FA2','#4A148C'],wing:['#E040FB','#7C4DFF','#00BCD4'],star:'#E1BEE7',glow:'rgba(171,71,188,0.45)',label:'#7B1FA2',spec:'rgba(255,255,255,0.5)',rainbow:true},
  ];
  const p=palettes[rank]||palettes[0];
  const id=`ri${rank}_${Math.random().toString(36).slice(2,7)}`;
  const labels=['PRAJURIT','KOPRAL','SERSAN','LETNAN','KAPTEN'];

  /* Hexagon points (cx=60, cy=52, r=30) — flat-top */
  const hr=30, hx=60, hy=52;
  const hex=Array.from({length:6},(_,i)=>{const a=Math.PI/3*i-Math.PI/6;return`${hx+hr*Math.cos(a)},${hy+hr*Math.sin(a)}`;}).join(' ');
  /* Inner hex (r=24) */
  const ihr=24;
  const ihex=Array.from({length:6},(_,i)=>{const a=Math.PI/3*i-Math.PI/6;return`${hx+ihr*Math.cos(a)},${hy+ihr*Math.sin(a)}`;}).join(' ');

  return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:showLabel?6:0}}>
      <svg width={s} height={s*0.88} viewBox="0 0 120 105" fill="none" style={{overflow:'visible'}}>
        <defs>
          <linearGradient id={`${id}b`} x1="60" y1="15" x2="60" y2="85" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={p.body[0]}/><stop offset="35%" stopColor={p.body[1]}/><stop offset="70%" stopColor={p.body[2]}/><stop offset="100%" stopColor={p.body[3]}/>
          </linearGradient>
          <linearGradient id={`${id}wl`} x1="0" y1="40" x2="38" y2="65" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={p.wing[0]}/><stop offset="50%" stopColor={p.wing[1]}/><stop offset="100%" stopColor={p.wing[2]}/>
          </linearGradient>
          <linearGradient id={`${id}wr`} x1="120" y1="40" x2="82" y2="65" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={p.wing[0]}/><stop offset="50%" stopColor={p.wing[1]}/><stop offset="100%" stopColor={p.wing[2]}/>
          </linearGradient>
          <radialGradient id={`${id}sp`} cx="50" cy="40" r="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="white" stopOpacity="0.6"/><stop offset="60%" stopColor="white" stopOpacity="0.1"/><stop offset="100%" stopColor="white" stopOpacity="0"/>
          </radialGradient>
          <filter id={`${id}ds`}><feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="rgba(0,0,0,0.3)"/></filter>
          <filter id={`${id}gs`}><feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="rgba(0,0,0,0.5)"/></filter>
          <radialGradient id={`${id}ag`} cx="60" cy="52" r="55" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={p.body[1]} stopOpacity="0.2"/><stop offset="100%" stopColor={p.body[1]} stopOpacity="0"/>
          </radialGradient>
          {p.rainbow&&<linearGradient id={`${id}rb`} x1="30" y1="20" x2="90" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E040FB"/><stop offset="30%" stopColor="#7C4DFF"/><stop offset="60%" stopColor="#448AFF"/><stop offset="100%" stopColor="#00BCD4"/>
          </linearGradient>}
          {p.rainbow&&<linearGradient id={`${id}rwl`} x1="0" y1="35" x2="40" y2="65" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00BCD4"/><stop offset="50%" stopColor="#7C4DFF"/><stop offset="100%" stopColor="#E040FB"/>
          </linearGradient>}
          {p.rainbow&&<linearGradient id={`${id}rwr`} x1="120" y1="35" x2="80" y2="65" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF4081"/><stop offset="50%" stopColor="#E040FB"/><stop offset="100%" stopColor="#7C4DFF"/>
          </linearGradient>}
        </defs>

        {/* Ambient glow */}
        <ellipse cx="60" cy="52" rx="52" ry="42" fill={`url(#${id}ag)`}/>

        {/* ── Left wing (3 layered feathers) ── */}
        <g filter={`url(#${id}ds)`}>
          <path d="M34 42 L8 28 L2 38 L14 48 L4 52 L14 58 L28 62 L34 60 Z" fill={p.rainbow?`url(#${id}rwl)`:`url(#${id}wl)`}/>
          <path d="M34 42 L8 28 L2 38 L14 48 L4 52 L14 58 L28 62 L34 60 Z" fill="url(#${id}sp)" opacity="0.4"/>
          {/* Wing segment lines */}
          <path d="M14 48 L30 50" stroke="white" strokeWidth="0.5" opacity="0.2"/>
          <path d="M14 58 L30 57" stroke="white" strokeWidth="0.5" opacity="0.15"/>
          <path d="M8 28 L28 42" stroke="white" strokeWidth="0.6" opacity="0.12"/>
        </g>

        {/* ── Right wing (mirror) ── */}
        <g filter={`url(#${id}ds)`}>
          <path d="M86 42 L112 28 L118 38 L106 48 L116 52 L106 58 L92 62 L86 60 Z" fill={p.rainbow?`url(#${id}rwr)`:`url(#${id}wr)`}/>
          <path d="M86 42 L112 28 L118 38 L106 48 L116 52 L106 58 L92 62 L86 60 Z" fill="url(#${id}sp)" opacity="0.4"/>
          <path d="M106 48 L90 50" stroke="white" strokeWidth="0.5" opacity="0.2"/>
          <path d="M106 58 L90 57" stroke="white" strokeWidth="0.5" opacity="0.15"/>
          <path d="M112 28 L92 42" stroke="white" strokeWidth="0.6" opacity="0.12"/>
        </g>

        {/* ── Hexagonal body ── */}
        <g filter={`url(#${id}ds)`}>
          <polygon points={hex} fill={p.rainbow?`url(#${id}rb)`:`url(#${id}b)`}/>
          <polygon points={hex} fill={`url(#${id}sp)`}/>
          <polygon points={hex} fill="none" stroke={p.body[0]} strokeWidth="1.2" strokeOpacity="0.35"/>
        </g>
        {/* Inner hex border */}
        <polygon points={ihex} fill="none" stroke={p.body[0]} strokeWidth="0.6" strokeOpacity="0.2"/>

        {/* ── 6-pointed star / compass emblem ── */}
        <g filter={`url(#${id}gs)`}>
          {/* Main 6-pointed star (two overlapping triangles) */}
          <polygon points="60,32 65,45 78,45 68,53 72,66 60,58 48,66 52,53 42,45 55,45" fill="white" opacity="0.9"/>
          {/* Inner highlight */}
          <polygon points="60,37 63,45 72,45 66,50 68,59 60,54 52,59 54,50 48,45 57,45" fill="white" opacity="0.15"/>
          {/* Center diamond accent */}
          <polygon points="60,44 64,52 60,60 56,52" fill={p.star} opacity="0.4"/>
        </g>

        {/* Specular gloss line across hex top */}
        <path d={`M${hx-hr*0.7} ${hy-hr*0.45} Q${hx} ${hy-hr*0.65} ${hx+hr*0.7} ${hy-hr*0.45}`} stroke="white" strokeWidth="1" opacity="0.2" fill="none"/>

        {/* Ground shadow */}
        <ellipse cx="60" cy="98" rx="22" ry="3.5" fill={p.body[3]} opacity="0.1"/>
      </svg>
      {showLabel&&<span style={{fontSize:Math.max(9,s*0.065),fontWeight:800,color:p.label,letterSpacing:2,fontFamily:"'Inter'",textTransform:'uppercase'}}>{labels[rank]}</span>}
    </div>
  );
}

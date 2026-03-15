import React from 'react';
import { AVATAR_COLORS } from '../../data/illustrations';

export function AvatarImg({initials,size=36,style={}}){
  const c=AVATAR_COLORS[initials]||{bg:'#14532D',accent:'#1F7542',gender:'M'};
  if(c.img)return(<div style={{width:size,height:size,borderRadius:size*0.3,overflow:'hidden',flexShrink:0,...style}}>
    <img src={c.img} alt={initials} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
  </div>);
  return(<div style={{width:size,height:size,borderRadius:size*0.3,background:`linear-gradient(145deg,${c.bg},${c.accent})`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,position:'relative',overflow:'hidden',...style}}>
    <svg width={size*0.7} height={size*0.7} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" fill="rgba(255,255,255,0.85)"/>
      <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="rgba(255,255,255,0.7)"/>
      {c.gender==='M'&&<rect x="9" y="5" width="6" height="1" rx="0.5" fill={c.bg} opacity="0.3"/>}
    </svg>
    <span style={{position:'absolute',bottom:size<30?0:1,right:size<30?0:1,fontSize:Math.max(7,size*0.22),fontWeight:800,color:'rgba(255,255,255,0.6)',lineHeight:1}}>{initials}</span>
  </div>);
}

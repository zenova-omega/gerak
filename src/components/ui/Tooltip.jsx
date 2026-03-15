import React, { useState } from 'react';
import { C } from '../../lib/constants';

export function Tip({children,text}){
  const [show,setShow]=useState(false);
  return(<span style={{position:'relative',display:'inline-flex',alignItems:'center',cursor:'pointer'}} onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)} onClick={()=>setShow(s=>!s)}>
    {children}
    {show&&<span style={{position:'absolute',bottom:'calc(100% + 6px)',left:'50%',transform:'translateX(-50%)',background:C.surfaceDark,color:C.textLight,fontSize:11,fontWeight:500,padding:'6px 10px',borderRadius:8,whiteSpace:'nowrap',maxWidth:200,textAlign:'center',lineHeight:1.3,boxShadow:`0 4px 12px ${C.shadow}`,border:`1px solid ${C.overlay10}`,zIndex:50,pointerEvents:'none',animation:'fadeInUp 150ms ease'}}>{text}</span>}
  </span>);
}

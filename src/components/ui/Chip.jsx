import React from 'react';
import { C } from '../../lib/constants';

export   function Chip({label,active,onClick,color}){
    return <button onClick={onClick} className="chip-btn" style={{
      padding:'6px 16px',borderRadius:9999,border:active?'none':`1px solid ${C.border}`,flexShrink:0,
      background:active?(color||C.primary):C.surface,
      color:active?C.bg:C.textSec,fontSize:13,fontWeight:active?700:500,cursor:'pointer',
      letterSpacing:active?'0.02em':'0',
      boxShadow:active?`0 2px 8px ${(color||C.primary)}30`:'none',
    }}>{label}</button>;
  }

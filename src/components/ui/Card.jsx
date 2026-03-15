import React from 'react';
import { C } from '../../lib/constants';

export   function Card({children,style={},className='',onClick,accent}){
    return <div onClick={onClick} className={`${className} ${onClick?'card-interactive':'card-hover'} glass-card`} style={{
      background:'rgba(255,255,255,0.72)',
      backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
      borderRadius:16,padding:16,
      border:'1px solid rgba(255,255,255,0.55)',
      cursor:onClick?'pointer':'default',
      boxShadow:'0 1px 3px rgba(0,0,0,0.04), 0 4px 24px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.7)',
      borderLeft:accent?`3px solid ${accent}`:undefined,
      ...style
    }}>{children}</div>;
  }

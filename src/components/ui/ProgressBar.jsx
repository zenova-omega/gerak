import React from 'react';
import { useSpring, animated } from '@react-spring/web';
import { C } from '../../lib/constants';

export function ProgressBar({progress=0,color=C.primary,height=6,bg=C.overlay08,gold=false}){
  const spring = useSpring({ width: `${progress*100}%`, from: { width: '0%' }, config: { tension: 120, friction: 20 } });
  return <div style={{height,borderRadius:height,background:bg,overflow:'hidden',width:'100%'}}>
    <animated.div className={gold?'xp-bar-gold':'xp-bar-fill'} style={{height:'100%',borderRadius:height,background:color,...spring}}/>
  </div>;
}

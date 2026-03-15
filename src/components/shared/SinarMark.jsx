import React from 'react';

export function SinarMark({size=28}){return(
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <defs>
      <linearGradient id="smark" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#14532D"/>
        <stop offset="100%" stopColor="#1F7542"/>
      </linearGradient>
      <linearGradient id="sray" x1="20" y1="0" x2="20" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#D97706"/>
        <stop offset="100%" stopColor="#F59E0B"/>
      </linearGradient>
      <linearGradient id="sred" x1="20" y1="0" x2="20" y2="10" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#991B1B"/>
        <stop offset="100%" stopColor="#B91C1C"/>
      </linearGradient>
    </defs>
    {/* Shield shape */}
    <path d="M20 3 L36 10 L36 22 C36 30 28 36 20 38 C12 36 4 30 4 22 L4 10 Z" fill="url(#smark)"/>
    <path d="M20 3 L36 10 L36 22 C36 30 28 36 20 38 C12 36 4 30 4 22 L4 10 Z" fill="white" opacity="0.06"/>
    {/* Red top accent stripe */}
    <path d="M20 3 L36 10 L4 10 Z" fill="url(#sred)" opacity="0.6"/>
    {/* Light rays (sinar) */}
    <path d="M20 13 L22 18 L20 17 L18 18 Z" fill="url(#sray)" opacity="0.9"/>
    <path d="M20 13 L24 20 L20 18.5 L16 20 Z" fill="url(#sray)" opacity="0.5"/>
    {/* Star center */}
    <circle cx="20" cy="22" r="4" fill="url(#sray)" opacity="0.85"/>
    <circle cx="20" cy="22" r="2" fill="white" opacity="0.4"/>
    {/* Bottom rays */}
    <path d="M14 26 L20 24 L26 26 L20 32 Z" fill="white" opacity="0.12"/>
  </svg>
)}

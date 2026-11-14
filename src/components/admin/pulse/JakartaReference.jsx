import React, { useId } from 'react';
import boundary from '../../../pulse/jakarta-boundary.json';
import { referencePaths } from '../../../lib/pulseMap.js';

const outlines = referencePaths(boundary.geometry);

export default function JakartaReference() {
  const clip = useId().replaceAll(':', '') + '-jakarta';
  return <g aria-hidden="true" pointerEvents="none">
    <defs><clipPath id={clip}><rect x="58" y="30" width="300" height="250" /></clipPath></defs>
    <g clipPath={`url(#${clip})`} fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".65">
      {outlines.map((d, index) => <path key={index} d={d} />)}
    </g>
  </g>;
}

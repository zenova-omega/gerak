import { writeFileSync } from 'node:fs';
import { colorGuideMarkdown } from '../src/lib/pulseColorGuide.js';
writeFileSync(new URL('../docs/PULSE-COLOR-GUIDE.md', import.meta.url), colorGuideMarkdown());
console.log('docs/PULSE-COLOR-GUIDE.md written');

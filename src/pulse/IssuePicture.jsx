import { useState } from 'react';
import { Clapperboard, CloudLightning, Coins, Cpu, Globe, Landmark, Newspaper, Play, Scale, Trophy, Users } from 'lucide-react';
import { issueImage } from '../lib/pulseRadar';

// The category is drawn when an issue has no picture of its own (most news-only issues), or when the picture does not load.
const ICONS = { politik: Landmark, hukum: Scale, ekonomi: Coins, bencana: CloudLightning, sosial: Users, teknologi: Cpu, olahraga: Trophy, hiburan: Clapperboard, dunia: Globe };
// Fixed sizes, so nothing moves when a picture arrives. The large one is drawn 16:9 at the width of its card.
const SIZES = { feature: [320, 180], row: [56, 56], column: [40, 40], 'column-wide': [64, 36] };

/**
 * One picture for an issue, from its own sources (the thumbnail of its video, or the picture the search list shows for
 * it), loaded straight from that host without a referrer, the way the product shows post media. Decorative: the title
 * beside it says what it is. `onActivate` lets a click on the picture open the issue, as the title does.
 */
export default function IssuePicture({ issue, size = 'row', onActivate, children }) {
  const image = issueImage(issue);
  const [failed, setFailed] = useState('');
  const shown = image && failed !== image.url ? image : null;
  const Icon = ICONS[issue?.category] || Newspaper;
  const [width, height] = SIZES[size] || SIZES.row;
  return <span className={'rdi-pic' + (shown ? '' : ' rdi-pic-fallback')} data-size={size} data-kind={shown?.kind}
    title={shown?.source && size !== 'feature' ? `Gambar dari ${shown.source}` : undefined} aria-hidden="true" onClick={onActivate}>
    {shown ? <img src={shown.url} alt="" width={width} height={height} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(shown.url)} />
      : <Icon size={size === 'feature' ? 32 : size === 'row' ? 22 : 16} strokeWidth={1.75} />}
    {shown?.kind === 'video' && size === 'feature' && <span className="rdi-pic-play"><Play size={14} /></span>}
    {children}
  </span>;
}

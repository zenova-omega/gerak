import { useState } from 'react';
import { accountPhoto } from '../../../lib/pulseAccountPhoto';
import { PlatformIcon, platformLabel } from './PlatformIcon';
import './source-identity.css';

/** `size`: md 44px (default), sm 32px for list rows, xs 24px inside a line of text.
 * `eager` fetches the picture at once: for a card that appears under the pointer, where waiting shows an empty circle. */
const pixels={md:44,sm:32,xs:24};
export default function PostAvatar({post = {}, size = 'md', eager = false}) {
  const url=accountPhoto(post);
  const [failed,setFailed]=useState('');
  const initials = (post.author || '').trim().replace(/^@/, '').split(/[\s._-]+/).filter(Boolean);
  const fallback = initials.length > 1 ? initials.slice(0,2).map(word=>Array.from(word)[0]).join('').toUpperCase() : Array.from(initials[0] || '?').slice(0,2).join('').toUpperCase();
  return <span className={"ps-profile-avatar psi-avatar"+(size!=='md'?' psi-'+size:'')}>
    {url && failed!==url ? <img className="psi-photo" width={pixels[size]||44} height={pixels[size]||44} src={url} alt={'Foto profil '+(post.author||'sumber')} loading={eager?'eager':'lazy'} decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(url)}/> : <span className="psi-fallback" aria-label="Foto profil tidak tersedia">{fallback}</span>}
    <span className="psi-platform" role="img" aria-label={platformLabel(post.platform)}><PlatformIcon platform={post.platform} size={size==='md'?14:size==='sm'?11:9}/></span>
  </span>;
}

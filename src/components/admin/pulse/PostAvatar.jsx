import { useState } from 'react';
import { accountPhoto } from '../../../lib/pulseAccountPhoto';
import { PlatformIcon, platformLabel } from './PlatformIcon';
import './source-identity.css';

export default function PostAvatar({post = {}}) {
  const url=accountPhoto(post);
  const [failed,setFailed]=useState('');
  const initials = (post.author || '').trim().replace(/^@/, '').split(/[\s._-]+/).filter(Boolean);
  const fallback = initials.length > 1 ? initials.slice(0,2).map(word=>Array.from(word)[0]).join('').toUpperCase() : Array.from(initials[0] || '?').slice(0,2).join('').toUpperCase();
  return <span className="ps-profile-avatar psi-avatar">
    {url && failed!==url ? <img className="psi-photo" width="44" height="44" src={url} alt={'Foto profil '+(post.author||'sumber')} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(url)}/> : <span className="psi-fallback" aria-label="Foto profil tidak tersedia">{fallback}</span>}
    <span className="psi-platform" role="img" aria-label={platformLabel(post.platform)}><PlatformIcon platform={post.platform} size={14}/></span>
  </span>;
}

import { useEffect, useRef, useState } from 'react';
import { Button } from '../../ui/shadcn/button';

// Mounted only inside the open dialog. Closing it removes the player and audio.
export default function MediaPlayer({media,author}) {
  const [preview,setPreview]=useState(false);
  const [failed,setFailed]=useState(false);
  const [imageFailed,setImageFailed]=useState(false);
  const frame=useRef(null);
  const available=Boolean(media.videoUrl||media.embedUrl);
  const showPlayer=available&&!preview&&!failed;
  useEffect(()=>{
    if(!showPlayer||media.videoUrl||!media.embedUrl?.startsWith('https://www.tiktok.com/'))return;
    const onMessage=event=>{
      if(event.origin==='https://www.tiktok.com'&&event.source===frame.current?.contentWindow&&event.data?.['x-tiktok-player']===true&&['onPlayerError','onError'].includes(event.data.type))setFailed(true);
    };
    window.addEventListener('message',onMessage);
    return ()=>window.removeEventListener('message',onMessage);
  },[showPlayer,media.videoUrl,media.embedUrl]);
  return <div className="pulse-media-player">
    {available&&<div className="pulse-media-player-actions"><Button variant="outline" onClick={()=>{setPreview(showPlayer);setFailed(false);}}>{showPlayer?'Lihat thumbnail':'Coba pemutar video'}</Button></div>}
    {failed&&<p role="status">Pemutar tidak dapat dimuat.</p>}
    {showPlayer ? media.videoUrl ? <video controls playsInline preload="none" poster={media.imageUrl||undefined} className="pulse-media-video" onError={()=>setFailed(true)} src={media.videoUrl}>Browser ini tidak mendukung pemutar video.</video> : <iframe ref={frame} className="pulse-media-embed" title={'Pemutar '+(author||'posting sumber')} src={media.embedUrl} allow="fullscreen; picture-in-picture" allowFullScreen referrerPolicy="no-referrer" onError={()=>setFailed(true)}/> : media.imageUrl&&!imageFailed ? <img className="pulse-media-large" src={media.imageUrl} alt={'Pratinjau besar dari '+(author||'akun sumber')} referrerPolicy="no-referrer" onError={()=>setImageFailed(true)}/> : <p role="status">Pratinjau tidak tersedia. Silakan buka posting asli.</p>}
    
  </div>;
}

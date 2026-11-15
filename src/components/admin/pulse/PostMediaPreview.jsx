import { PulseArrow } from '../../ui/PulseArrow';
import React, { useEffect, useRef, useState } from 'react';
import { postMedia } from '../../../lib/pulseMedia';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/shadcn/dialog';
import { Button } from '../../ui/shadcn/button';
import MediaPlayer from './MediaPlayer';
import { ImageOff, Play } from 'lucide-react';
import './PostMediaPreview.css';

/** A post whose source sent no usable thumbnail: the video itself is shown in the card (the file when the source sent one,
 * otherwise TikTok's player, loaded only when it scrolls into view) instead of an empty box. If the player reports an
 * error the card says so and points to the original post. */
export function InlineVideo({ media, author }) {
  const [broken, setBroken] = useState(false);
  const frame = useRef(null);
  useEffect(() => {
    if (media.videoUrl) return undefined;
    const onMessage = event => {
      if (event.origin === 'https://www.tiktok.com' && event.source === frame.current?.contentWindow && event.data?.['x-tiktok-player'] === true && ['onPlayerError', 'onError'].includes(event.data.type)) setBroken(true);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [media.videoUrl]);
  if (broken) return <p className="pulse-media-fallback">Video tidak dapat dimuat di sini. {media.postUrl && <a href={media.postUrl} target="_blank" rel="noopener noreferrer">Buka posting asli <PulseArrow/></a>}</p>;
  return <figure className="pulse-media-figure pulse-media-inline">
    {media.videoUrl
      ? <video controls playsInline preload="metadata" className="pulse-media-video" src={media.videoUrl} onError={() => setBroken(true)}>Browser ini tidak mendukung pemutar video.</video>
      : <iframe ref={frame} className="pulse-media-embed pulse-media-embed-inline" src={media.embedUrl} title={'Video dari ' + (author || 'akun sumber')} loading="lazy" allow="fullscreen" referrerPolicy="no-referrer" />}
    <figcaption>Video sumber · tekan Play untuk memutar. Pemutaran mengikuti ketersediaan sumber.</figcaption>
  </figure>;
}

/** Only TikTok's own player and a direct video file are shown inline; other embeds stay behind the button. */
export const inlineVideo = media => Boolean(media.videoUrl || (media.embedUrl && media.embedUrl.startsWith('https://www.tiktok.com/player/')));

export function PreviewImage({ media, author }) {
  const {imageUrl:url,isPhoto,postUrl}=media;
  const playable=Boolean(media.videoUrl||media.embedUrl);
  const [failed, setFailed] = useState(false);
  const [container, setContainer] = useState(null);
  if ((!url || failed) && inlineVideo(media)) return <InlineVideo media={media} author={author} />;
  return <figure className="pulse-media-figure"><Dialog>
    <DialogTrigger asChild><button type="button" className="pulse-media-trigger" aria-label={(playable?'Putar video dari ':'Buka foto besar dari ')+(author||'akun sumber')} onClick={event=>setContainer(event.currentTarget.closest('.pulse-standalone'))}>
    {url&&!failed?<img src={url} alt={isPhoto ? 'Foto dari posting sumber' : 'Pratinjau media dari posting sumber'} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />:<span className="pulse-media-placeholder"><ImageOff size={22} aria-hidden="true"/><span>Thumbnail tidak tersedia</span><small>{playable?'Video masih dapat dicoba':'Periksa media pada sumber asli'}</small></span>}
    {playable&&<span className="pulse-media-play-label"><Play size={16} aria-hidden="true"/>Putar video</span>}
    </button></DialogTrigger>
    <DialogContent container={container} className="pulse-media-modal">
      <DialogHeader><DialogTitle>Media dari {author||'akun sumber'}</DialogTitle><DialogDescription>{playable?'Video sumber · pemutaran mengikuti ketersediaan sumber':isPhoto?'Foto sumber · pratinjau diperbesar':'Thumbnail sumber'}</DialogDescription></DialogHeader>
      <MediaPlayer media={media} author={author}/>
      <DialogFooter>{postUrl?<Button asChild variant="outline"><a href={postUrl} target="_blank" rel="noopener noreferrer">Buka posting asli <PulseArrow/></a></Button>:<p>Link posting asli tidak tersedia.</p>}</DialogFooter>
    </DialogContent>
    </Dialog>
    {url&&!failed&&!playable&&<figcaption>{isPhoto?'Foto sumber':'Thumbnail sumber'}</figcaption>}
  </figure>;
}

/** `links={false}` when the surrounding card already links to the post and the profile. */
export default function PostMediaPreview({ post, links = true }) {
  const media = postMedia(post);
  if (!['instagram', 'tiktok'].includes(post.platform)) return null;
  return <div className="pulse-media">
    {media.imageUrl||media.videoUrl||media.embedUrl ? <div className="pulse-media-preview">
      <PreviewImage key={media.imageUrl||media.postUrl} media={media} author={post.author} />
    </div> : <p className="pulse-media-fallback">Pratinjau media tidak tersedia pada data tersimpan.</p>}
    {links && <div className="pulse-media-links">
      {media.postUrl && <a href={media.postUrl} target="_blank" rel="noopener noreferrer">Buka posting asli <PulseArrow/></a>}
      {media.profileUrl && <a href={media.profileUrl} target="_blank" rel="noopener noreferrer">Buka profil <PulseArrow/></a>}
    </div>}
  </div>;
}

import { PulseArrow } from '../../ui/PulseArrow';
import React, { useState } from 'react';
import { postMedia } from '../../../lib/pulseMedia';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/shadcn/dialog';
import { Button } from '../../ui/shadcn/button';
import MediaPlayer from './MediaPlayer';
import { ImageOff, Play } from 'lucide-react';
import './PostMediaPreview.css';

export function PreviewImage({ media, author }) {
  const {imageUrl:url,isPhoto,postUrl}=media;
  const playable=Boolean(media.videoUrl||media.embedUrl);
  const [failed, setFailed] = useState(false);
  const [container, setContainer] = useState(null);
  return <figure className="pulse-media-figure"><Dialog>
    <DialogTrigger asChild><button type="button" className="pulse-media-trigger" aria-label={(playable?'Buka video dari ':'Buka foto besar dari ')+(author||'akun sumber')} onClick={event=>setContainer(event.currentTarget.closest('.pulse-standalone'))}>
    {url&&!failed?<img src={url} alt={isPhoto ? 'Foto dari posting sumber' : 'Pratinjau media dari posting sumber'} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />:<span className="pulse-media-placeholder"><ImageOff size={22} aria-hidden="true"/><span>Thumbnail tidak tersedia</span><small>{playable?'Video masih dapat dicoba':'Periksa media pada sumber asli'}</small></span>}
    {playable&&<span className="pulse-media-play-label"><Play size={16} aria-hidden="true"/>Buka pemutar</span>}
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

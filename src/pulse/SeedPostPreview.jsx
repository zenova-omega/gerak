import { PulseArrow } from '../components/ui/PulseArrow';
import { useEffect, useState } from 'react';
import api from '../lib/api';
import { pulseDate, safeSourceUrl } from '../lib/pulseData';
import { postMedia } from '../lib/pulseMedia';
import { PulseButton } from '../components/ui/PulseUI';
import PostAvatar from '../components/admin/pulse/PostAvatar';

export default function SeedPostPreview({ url, onUseCaption }) {
  const [state, setState] = useState({ url: '', loading: true });
  const [failedImage, setFailedImage] = useState('');
  useEffect(() => {
    let current = true;
    api.get('/admin/pulse/seed-preview', { url }).then(data => {
      if (current) setState({ url, data });
    }).catch(() => { if (current) setState({ url, error: true }); });
    return () => { current = false; };
  }, [url]);
  const ready = state.url === url;
  const post = ready ? state.data?.post : null;
  const media = post ? postMedia(post) : null;
  return <section className="ps-seed-preview" aria-label="Posting acuan">
    <strong>Posting acuan</strong>
    {!ready && <p role="status">Memeriksa data tersimpan…</p>}
    {ready && state.error && <p role="alert">URL tidak dapat diperiksa. Gunakan URL posting lengkap X, Instagram, TikTok atau YouTube; periksa juga koneksi layanan.</p>}
    {ready && state.data?.status === 'not_collected' && <p>URL valid, tetapi posting belum ada dalam data tersimpan. Caption, foto, dan metrik belum diverifikasi. Isi keyword pendukung untuk pencarian.</p>}
    {post && <><p className="pu-account-line"><PostAvatar size="sm" post={post} /><strong>{post.author || 'Nama akun belum tersedia'}</strong><span>{pulseDate(post.published_at)}</span></p>
      {media.imageUrl && failedImage !== media.imageUrl && <img src={media.imageUrl} alt="Media posting acuan" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedImage(media.imageUrl)} />}
      <p>{post.title || post.text || 'Caption tidak tersedia'}</p>
      {onUseCaption && <PulseButton onClick={() => onUseCaption((post.title || post.text || '').slice(0,250))}>Gunakan caption sebagai keyword, lalu tinjau</PulseButton>}
      <p>Pratinjau dari data tersimpan, bukan pemeriksaan langsung ke platform.</p></>}
    {safeSourceUrl(url) && <a href={safeSourceUrl(url)} target="_blank" rel="noopener noreferrer">Buka posting acuan <PulseArrow/></a>}
  </section>;
}

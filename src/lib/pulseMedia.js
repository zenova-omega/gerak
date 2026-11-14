import { safeSourceUrl } from './pulseData.js';

// Client-only media requests. No proxy, DNS lookup, provider call or URL repair.
export function safeMediaUrl(value) {
  if (typeof value !== 'string' || value.length > 8192 || /[\s\\]/.test(value)
    || [...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) return null;
  try {
    const url = new URL(value);
    const host = url.hostname;
    if (url.protocol !== 'https:' || url.username || url.password || url.port || host.length > 253
      || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)
      || /\.(localhost|local|internal|lan|home|test|invalid|onion)$/.test(host)
      || host === 'home.arpa' || host.endsWith('.home.arpa')) return null;
    url.hash = '';
    return url.href;
  } catch { return null; }
}

function username(platform, value) {
  const limit = platform === 'instagram' ? 30 : 24;
  return typeof value === 'string' && value.length <= limit && /^[A-Za-z0-9_][A-Za-z0-9_.]*$/.test(value)
    && !value.endsWith('.') && !value.includes('..') ? value : null;
}

export function postMedia(post) {
  const social = ['instagram', 'tiktok'].includes(post.platform);
  const metrics = post.metrics || {};
  let handle = social ? username(post.platform, metrics.author_username ?? post.username) : null;
  let postUrl = social ? null : safeSourceUrl(post.url) || null;
  try {
    const url = new URL(post.url);
    if (url.protocol === 'https:' && !url.username && !url.password && !url.port) {
      if (post.platform === 'instagram' && ['instagram.com', 'www.instagram.com'].includes(url.hostname)
        && /^\/(p|reel|tv)\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)) {
        postUrl = `https://www.instagram.com${url.pathname.replace(/\/$/, '')}/`;
      }
      const match = url.pathname.match(/^\/@([A-Za-z0-9_.]+)\/video\/([0-9]+)\/?$/);
      if (post.platform === 'tiktok' && ['tiktok.com', 'www.tiktok.com'].includes(url.hostname) && match && username('tiktok', match[1])) {
        postUrl = `https://www.tiktok.com/@${match[1]}/video/${match[2]}`;
        handle = match[1];
      }
    }
  } catch { /* Missing or invalid source: keep the caption, not an invented link. */ }
  const videoUrl = social ? safeMediaUrl(metrics.video_url) : null;
  let embedUrl = null;
  if (postUrl && post.platform === 'tiktok') {
    embedUrl = `https://www.tiktok.com/player/v1/${new URL(postUrl).pathname.split('/').pop()}?autoplay=0&controls=1`;
  } else if (postUrl && post.platform === 'instagram' && (metrics.media_type === 'video' || /\/(reel|tv)\//.test(postUrl))) {
    embedUrl = postUrl + 'embed/';
  }
  return {
    videoUrl,
    embedUrl,
    postUrl,
    profileUrl: !handle ? null : post.platform === 'instagram' ? `https://www.instagram.com/${handle}/` : `https://www.tiktok.com/@${handle}`,
    imageUrl: social ? safeMediaUrl(metrics.media_url) : null,
    isPhoto: post.platform === 'instagram' && ['image', 'photo'].includes(metrics.media_type),
  };
}

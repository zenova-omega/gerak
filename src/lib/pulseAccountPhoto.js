import { safeMediaUrl } from './pulseMedia.js';

export function accountPhoto(node, account, posts = []) {
  const ids = new Set((account?.evidence || []).map(p => String(p.id)));
  const rows = [node, account, ...(account?.evidence || []), ...posts.filter(p => ids.has(String(p.id)))];
  for (const row of rows) {
    for (const value of [row?.profile_image_url, row?.avatar_url, row?.metrics?.profile_image_url, row?.metrics?.author_avatar_url, row?.metrics?.avatar_url]) {
      const url = safeMediaUrl(value);
      if (url) return url;
    }
  }
  return null;
}

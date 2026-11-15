// The one place PULSE's document metadata is defined. The build reads it for the static head of the
// PULSE-only build (vite.config.js) and the running app reads it for per-page titles (usePulseHead).
// Plain values only: this file is imported by Node at build time.
export const siteName = 'PULSE';
export const siteTagline = 'Social Media Listening';
export const siteDescription = 'PULSE memantau percakapan publik di media sosial dan berita, menunjukkan isu yang sedang naik, dan menyertakan buktinya.';
// --ps-bg of each theme as hex, for the browser chrome around the page.
export const themeColor = { light: '#f4f5f9', dark: '#1c1c21' };
// Served under /pulse/ on purpose: the standalone web server answers nothing outside /pulse, /assets and /api.
export const icons = { svg: '/pulse/brand/icon.svg', png: '/pulse/brand/icon-32.png', touch: '/pulse/brand/apple-touch-icon.png', social: '/pulse/brand/og.png' };

/** "Sentimen · PULSE" for a page, "PULSE · Social Media Listening" when no page is known yet. */
export function pageTitle(page) {
  return page ? `${page} · ${siteName}` : `${siteName} · ${siteTagline}`;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

async function render(post, links = true) {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { default: PostMediaPreview } = await server.ssrLoadModule('/src/components/admin/pulse/PostMediaPreview.jsx');
    return renderToStaticMarkup(React.createElement(PostMediaPreview, { post, links }));
  } finally { await server.close(); }
}
const tiktok = metrics => ({ platform: 'tiktok', author: 'zulfakarr', url: 'https://www.tiktok.com/@zulfakarr/video/7571234567890123456', metrics });

test('a TikTok post with no thumbnail shows its video in the card instead of an empty box', async () => {
  const html = await render(tiktok({}));
  assert.match(html, /<iframe[^>]*src="https:\/\/www\.tiktok\.com\/player\/v1\/7571234567890123456\?autoplay=0&amp;controls=1"[^>]*loading="lazy"/);
  assert.doesNotMatch(html, /Thumbnail tidak tersedia|Video masih dapat dicoba/);
  assert.match(html, /referrerPolicy="no-referrer"|referrerpolicy="no-referrer"/i);
});

test('a post with a direct video file and no thumbnail shows the file, not a player frame', async () => {
  const html = await render(tiktok({ video_url: 'https://cdn.example.com/video.mp4' }));
  assert.match(html, /<video[^>]*controls[^>]*src="https:\/\/cdn\.example\.com\/video\.mp4"/);
  assert.doesNotMatch(html, /<iframe/);
});

test('a post with a thumbnail keeps the picture and the button that opens the player', async () => {
  const html = await render(tiktok({ media_url: 'https://cdn.example.com/cover.jpg' }));
  assert.match(html, /<img[^>]*src="https:\/\/cdn\.example\.com\/cover\.jpg"/);
  assert.doesNotMatch(html, /<iframe/, 'a picture is cheap; the player loads only when it is opened');
});

test('Instagram without a thumbnail keeps the button, since only TikTok\'s player is shown inline', async () => {
  const html = await render({ platform: 'instagram', author: 'akun', url: 'https://www.instagram.com/reel/ABC123/', metrics: { media_type: 'video' } });
  assert.doesNotMatch(html, /<iframe/);
});

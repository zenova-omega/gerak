import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('feed exposes inline media, original caption, safe links and truthful legacy fallback', async () => {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { default: PostFeed } = await server.ssrLoadModule('/src/components/admin/pulse/PostFeed.jsx');
    const { default: MediaPlayer } = await server.ssrLoadModule('/src/components/admin/pulse/MediaPlayer.jsx');
    const direct=renderToStaticMarkup(React.createElement(MediaPlayer,{media:{videoUrl:'https://cdn.example.com/video.mp4',imageUrl:'https://cdn.example.com/poster.jpg'},author:'Video account'}));
    assert.match(direct,/<video[^>]*controls=""[^>]*preload="none"/);
    assert.doesNotMatch(direct,/autoPlay|autoplay|<iframe/);
    const embedded=renderToStaticMarkup(React.createElement(MediaPlayer,{media:{embedUrl:'https://www.tiktok.com/player/v1/123?autoplay=0&controls=1'},author:'Video account'}));
    assert.match(embedded,/<iframe[^>]*title="Pemutar Video account"/);
    assert.match(embedded,/Lihat thumbnail/);
    const videoFeed=renderToStaticMarkup(React.createElement(PostFeed,{posts:[{id:'video',platform:'tiktok',url:'https://www.tiktok.com/@example/video/123',author:'Video account',metrics:{}}]}));
    assert.match(videoFeed,/Putar video dari Video account/);
    assert.doesNotMatch(videoFeed,/<iframe|<video/);
    const { default: ProjectPeriod } = await server.ssrLoadModule('/src/pulse/ProjectPeriod.jsx');
    const periodHtml = renderToStaticMarkup(React.createElement(ProjectPeriod,{topicId:'test'}));
    // The period is a row of presets; the two date fields appear only after "Kustom" is pressed.
    assert.match(periodHtml, /role="group" aria-label="Pilih periode"/);
    assert.match(periodHtml, /aria-pressed="true"[^>]*>(?:<[^>]*>)*Semua/);
    assert.match(periodHtml, /aria-expanded="false"[^>]*>(?:<[^>]*>)*Kustom/);
    assert.doesNotMatch(periodHtml, /name="from"/);
    const posts = [{ id: '1', platform: 'instagram', author: 'Display Name', url: 'https://instagram.com/p/Abc/?track=1', title: 'Original caption headline', text: 'Original caption in full', metrics: { profile_image_url:'https://cdn.example.com/avatar.jpg',author_username: 'real.user', media_url: 'https://cdn.example.com/photo.jpg', media_type: 'image', likes: 0, engagement: 0 } }, { id: '2', platform: 'tiktok', author: 'Older record', metrics: {} }];
    const html = renderToStaticMarkup(React.createElement(PostFeed, { posts }));
    assert.match(html, /aria-label="Filter cepat posting"/);
    assert.match(html, /data-layout="list"/);
    assert.match(html, /pm-post-body has-media/);
    const dated=renderToStaticMarkup(React.createElement(PostFeed,{posts:[{...posts[0],published_at:'2026-11-10T23:30:00Z'},{...posts[1],published_at:'2026-11-09T10:00:00Z'}],initialDay:'2026-11-11'}));
    assert.match(dated,/Original caption in full/);
    assert.doesNotMatch(dated,/<strong>Older record<\/strong>/);
    // A week or month picked on the trend chart arrives as a first and a last day.
    const week=renderToStaticMarkup(React.createElement(PostFeed,{posts:[{...posts[0],published_at:'2026-11-10T23:30:00Z'},{...posts[1],published_at:'2026-11-09T10:00:00Z'}],initialDay:'2026-11-09',initialDayTo:'2026-11-15'}));
    assert.match(week,/Original caption in full/);
    assert.match(week,/<strong>Older record<\/strong>/);
    assert.match(html, /aria-label="Tampilan posting"/);
    assert.match(html, /Caption asli/);
    assert.doesNotMatch(html, /<h3>Original caption headline<\/h3>/);
    assert.match(html, /<p[^>]*class="pu-source-excerpt"[^>]*>Original caption in full<\/p>/);
    const repeated = renderToStaticMarkup(React.createElement(PostFeed,{posts:[{...posts[0],title:'Original caption'}]}));
    assert.doesNotMatch(repeated,/<h3>Original caption<\/h3>/);
    const authorFiltered = renderToStaticMarkup(React.createElement(PostFeed, { posts, initialAuthor: 'Display Name', initialPlatform: 'instagram' }));
    assert.doesNotMatch(authorFiltered, /<strong>Older record<\/strong>/);
    assert.doesNotMatch(html, /Lihat pratinjau media/);
    assert.match(html, /<div class="pulse-media-preview"><figure/);
    assert.match(html, /<button[^>]*aria-label="Buka foto besar dari Display Name"[^>]*aria-haspopup="dialog"/);
    assert.doesNotMatch(html, /Perbesar foto|Kecilkan foto/);
    assert.match(html, /loading="lazy"/);
    assert.match(html, /referrerPolicy="no-referrer"/);
    assert.match(html, /https:\/\/www.instagram.com\/real.user\//);
    assert.match(html, /Original caption in full/);
    assert.match(html, /Pratinjau media tidak tersedia/);
    assert.match(html, /src="https:\/\/cdn.example.com\/avatar.jpg"/);
    assert.match(html, /Belum dianalisis/);
    assert.doesNotMatch(html, /<details[^>]*class="pulse-media-details"/);
    const filtered = renderToStaticMarkup(React.createElement(PostFeed,{posts,initialSentiment:'negative'}));
    assert.doesNotMatch(filtered, /<h3>Original caption<\/h3>/);
    assert.doesNotMatch(html, /role="dialog"|<iframe|<video/);
  } finally { await server.close(); }
});

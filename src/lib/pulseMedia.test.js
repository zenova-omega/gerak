import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as media from './pulseMedia.js';

test('video sources use validated post identities, never thumbnails or arbitrary embed URLs',()=>{
  const tt=media.postMedia({platform:'tiktok',url:'https://www.tiktok.com/@real.user/video/123',metrics:{media_url:'https://cdn.example.com/thumb.jpg'}});
  assert.equal(tt.embedUrl,'https://www.tiktok.com/player/v1/123?autoplay=0&controls=1');
  assert.equal(tt.videoUrl,null);
  const ig=media.postMedia({platform:'instagram',url:'https://www.instagram.com/reel/Abc/',metrics:{video_url:'https://cdn.example.com/video.mp4?sig=abc'}});
  assert.equal(ig.videoUrl,'https://cdn.example.com/video.mp4?sig=abc');
  assert.equal(ig.embedUrl,'https://www.instagram.com/reel/Abc/embed/');
  const unsafe=media.postMedia({platform:'instagram',url:'https://evil.example.com/reel/Abc/',metrics:{media_type:'video',video_url:'http://localhost/video.mp4',embed_url:'https://evil.example.com'}});
  assert.equal(unsafe.videoUrl,null);
  assert.equal(unsafe.embedUrl,null);
  assert.equal(media.postMedia({platform:'instagram',url:'https://www.instagram.com/p/Abc/',metrics:{media_type:'image'}}).embedUrl,null);
});

test('public HTTPS image URLs preserve signed queries and reject unsafe hosts', () => {
  assert.equal(typeof media.safeMediaUrl, 'function');
  assert.equal(media.safeMediaUrl('https://cdn.example.com/photo.jpg?sig=a%2Bb#fragment'), 'https://cdn.example.com/photo.jpg?sig=a%2Bb');
  for (const url of [null, {}, 'http://cdn.example.com/a', 'data:image/png,abc', 'https://user:pass@cdn.example.com/a', 'https://localhost/a', 'https://127.0.0.1/a', 'https://2130706433/a', 'https://[::1]/a', 'https://10.1.2.3/a', 'https://cdn.local/a', 'https://cdn.internal/a', 'https://cdn.example.com:8443/a', 'https://cdn.example.com/\nx']) {
    assert.equal(media.safeMediaUrl(url), null, String(url));
  }
});

test('canonical post and profile links never use display names or off-platform URLs', () => {
  assert.equal(typeof media.postMedia, 'function');
  const ig = media.postMedia({ platform: 'instagram', author: 'Display Name', url: 'https://instagram.com/reel/Ab_c-1/?tracking=yes', metrics: { author_username: 'real.user', media_url: 'https://cdn.example.com/a', media_type: 'image' } });
  assert.equal(ig.postUrl, 'https://www.instagram.com/reel/Ab_c-1/');
  assert.equal(ig.profileUrl, 'https://www.instagram.com/real.user/');
  assert.equal(ig.imageUrl, 'https://cdn.example.com/a');
  assert.equal(ig.isPhoto, true);
  const tt = media.postMedia({ platform: 'tiktok', url: 'https://www.tiktok.com/@real.user/video/123?x=1' });
  assert.equal(tt.postUrl, 'https://www.tiktok.com/@real.user/video/123');
  assert.equal(tt.profileUrl, 'https://www.tiktok.com/@real.user');
  for (const author of ['Display Name', 'DisplayName', '@unverified']) {
    assert.equal(media.postMedia({ platform: 'instagram', author }).profileUrl, null);
  }
  for (const username of ['bad/name', 'bad..name', '.bad', 'bad.', 'a'.repeat(31)]) {
    assert.equal(media.postMedia({ platform: 'instagram', metrics: { author_username: username } }).profileUrl, null);
  }
  assert.equal(media.postMedia({ platform: 'instagram', url: 'https://evil.example/p/123' }).postUrl, null);
});

test('legacy records have no invented media and profile photos are not post previews', () => {
  assert.equal(typeof media.postMedia, 'function');
  assert.equal(media.postMedia({ platform: 'instagram', metrics: { profile_image_url: 'https://cdn.example.com/avatar' } }).imageUrl, null);
  assert.equal(media.postMedia({ platform: 'tiktok', metrics: {} }).imageUrl, null);
  assert.equal(media.postMedia({ platform: 'tiktok', metrics: { media_url: 'https://cdn.example.com/video', media_type: 'video' } }).isPhoto, false);
});

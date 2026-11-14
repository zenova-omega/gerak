import test from 'node:test';
import assert from 'node:assert/strict';
import { packCloud, cloudSize } from './pulseCloud.js';

test('cloud items stay inside the canvas and never overlap', () => {
  const items = Array.from({ length: 30 }, (_, i) => ({ key: 'k' + i, w: 200 - i * 5, h: 60 - i }));
  const placed = packCloud(items, { width: 1000, height: 380 });
  assert.ok(placed.length >= 20);
  assert.equal(placed[0].key, 'k0');
  assert.ok(Math.abs(placed[0].x + placed[0].w / 2 - 500) < 5, 'the biggest item sits in the centre');
  for (const a of placed) {
    assert.ok(a.x >= 0 && a.y >= 0 && a.x + a.w <= 1000 && a.y + a.h <= 380);
    for (const b of placed) if (a !== b) assert.ok(a.x >= b.x + b.w || a.x + a.w <= b.x || a.y >= b.y + b.h || a.y + a.h <= b.y, `${a.key} overlaps ${b.key}`);
  }
  assert.deepEqual(packCloud(items), packCloud(items));
});

test('sizes use a log scale between the given bounds', () => {
  assert.equal(cloudSize(1400, 50, 1400, 20, 100), 100);
  assert.equal(cloudSize(50, 50, 1400, 20, 100), 20);
  assert.ok(cloudSize(300, 50, 1400, 20, 100) > 45, 'a mid count is not squashed to the minimum');
  assert.equal(cloudSize(5, 5, 5, 20, 100), 60);
});

// Who supplies the data is an operations detail: nothing that ships to the browser names the supplier.
// The server calls the paid lane "social" on the way out (server/app/services/pulse_public.py); the app uses that name.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SUPPLIER = new RegExp(['x', 'p', 'o', 'z'].join(''), 'i');   // spelled out in pieces so this file passes its own check
const shipped = /\.(jsx?|mjs|css|json|html|svg)$/;
const notShipped = /\.test\.|[\\/]test-support[\\/]/;

function files(folder) {
  return readdirSync(folder).flatMap(name => {
    const path = join(folder, name);
    return statSync(path).isDirectory() ? files(path) : shipped.test(name) && !notShipped.test(path) ? [path] : [];
  });
}

test('no source file, page shell or public asset names the data supplier', () => {
  const named = [...files('src'), ...files('public'), 'index.html'].filter(path => SUPPLIER.test(readFileSync(path, 'utf8')));
  assert.deepEqual(named, []);
});

test('the paid social lane is called "social" where the app talks to the server about lanes', async () => {
  const { monitorSources } = await import('../lib/pulseMonitor.js');
  const lane = Object.fromEntries(monitorSources.map(row => [row.platform, [row.schedule, row.channel]]));
  assert.deepEqual(lane.x, ['social', 'social']);
  assert.deepEqual([lane.instagram, lane.tiktok, lane.reddit], [['instagram', 'social'], ['tiktok', 'social'], ['reddit', 'social']]);
  assert.deepEqual([lane.news, lane.youtube], [['rss', 'rss'], ['youtube', 'youtube']]);
});

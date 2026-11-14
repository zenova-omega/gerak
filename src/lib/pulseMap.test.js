import { test } from 'node:test';
import assert from 'node:assert/strict';
import { referencePaths } from './pulseMap.js';

test('geographic reference aligns north and east with heatmap coordinate grid', () => {
  const geometry = {type:'MultiPolygon',coordinates:[[[[106.68,-6.08],[107,-6.08],[107,-6.38],[106.68,-6.08]]]]};
  assert.deepEqual(referencePaths(geometry), ['M58,30L358,30L358,280L58,30Z']);
  assert.deepEqual(referencePaths(null), []);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validPeriod} from './useProjectPeriod.js';
test('project period rejects reversed and impossible dates without rejecting open bounds',()=>{
  assert.equal(validPeriod('2026-11-11','2026-11-10'),false);
  assert.equal(validPeriod('2026-02-30',''),false);
  assert.equal(validPeriod('2026-11-10','2026-11-10'),true);
  assert.equal(validPeriod('','2026-11-10'),true);
  assert.equal(validPeriod('2026-11-10',''),true);
});

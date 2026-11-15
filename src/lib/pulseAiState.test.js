import test from 'node:test';
import assert from 'node:assert/strict';
import { aiStateNotice } from './pulseAiState.js';

test('people are told when automatic analysis has stopped and who has to act, without naming a service', () => {
  assert.equal(aiStateNotice('ok'), '');
  assert.equal(aiStateNotice(undefined), '');
  assert.match(aiStateNotice('access'), /^Analisis otomatis berhenti/);
  assert.match(aiStateNotice('access'), /administrator/);
  assert.match(aiStateNotice('busy'), /mencoba lagi/);
  for (const state of ['access', 'busy']) assert.doesNotMatch(aiStateNotice(state), /grok|xai|token|api|model|provider/i);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accountPhoto } from './pulseAccountPhoto.js';

test('photo uses only matching evidence and safe profile fields, never content images', () => {
  const account = { evidence: [{ id: 'a' }] };
  assert.equal(accountPhoto({}, account, [{id:'b',metrics:{avatar_url:'https://cdn.example.com/b.jpg'}}]),null);
  assert.equal(accountPhoto({}, account, [{id:'a',metrics:{media_url:'https://cdn.example.com/post.jpg'}}]),null);
  assert.equal(accountPhoto({avatar_url:'javascript:alert(1)'},account),null);
  assert.equal(accountPhoto({},account,[{id:'a',metrics:{profile_image_url:'https://cdn.example.com/a.jpg'}}]),'https://cdn.example.com/a.jpg');
});

// Run with Vite on 5173: node --test src/lib/pulse-chat-history-ui.test.mjs
// The real Tanya AI page in a browser. The shared fixture answers every chat route from memory; no model is ever asked.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chatStore, chatTurn, pulseUI } from './test-support/pulse-ui-fixture.mjs';

const FIRST = 'Apa isu utama dalam cakupan ini?';
const SECOND = 'Platform mana yang paling ramai membahas ini?';
const LONG = 'Bagaimana_perkembangan_percakapan_tentang_perbaikan_jalan_rusak_tanpa_spasi_sama_sekali';
const stored = () => chatStore([
  { id: 'conv-a', topic_id: 'topic-a', title: FIRST, updated_at: '2026-11-14T05:35:00Z', turns: [chatTurn(FIRST, 'Isu utama adalah perbaikan jalan [P1].', 35)] },
  { id: 'conv-b', topic_id: 'topic-a', title: SECOND, updated_at: '2026-11-13T02:10:00Z', turns: [chatTurn(SECOND, 'Berita paling ramai [P1].', 5), chatTurn('Lalu bagaimana sentimennya?', 'Sebagian besar netral [P1].', 10)] },
  { id: 'conv-elsewhere', topic_id: 'topic-b', title: 'Percakapan project lain', updated_at: '2026-11-14T09:00:00Z', turns: [chatTurn('Project lain?', 'Ya [P1].', 50)] },
]);
const history = page => page.getByRole('region', { name: 'Riwayat percakapan', exact: true });
const query = (page, key) => new URL(page.url()).searchParams.get(key);
const fits = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('.pulse-standalone, .pch-page, .pch-panel')].every(node => node.scrollWidth <= node.clientWidth + 1));
const box = async locator => locator.boundingBox();
async function ask(page, text) {
  await page.getByLabel('Pertanyaan Anda', { exact: true }).fill(text);
  await page.getByRole('button', { name: 'Kirim', exact: true }).click();
}

test('the history sits to the right of the conversation; an earlier conversation opens, takes a follow-up, and survives a reload and the back button', async t => {
  const { page, state, open } = await pulseUI(t);
  state.chat = stored();
  await page.setViewportSize({ width: 1440, height: 900 });
  await open('/pulse/chat?topic=topic-a');
  const panel = history(page);
  await panel.getByRole('link').first().waitFor();
  // Newest first; each row says its title, when it was last used in WIB and how many questions it holds. Another project's is not listed.
  const rows = await panel.getByRole('listitem').allInnerTexts();
  assert.equal(rows.length, 2);
  assert.match(rows[0], new RegExp(`^${FIRST.replace('?', '\\?')}\\s+14 Nov 2026.*12\\.35 WIB · 1 pertanyaan`));
  assert.match(rows[1], /13 Nov 2026.*09\.10 WIB · 2 pertanyaan/);
  assert.equal(await panel.locator('[aria-current]').count(), 0, 'a new conversation is open: nothing in the list is marked');
  assert.equal(await page.locator('.pc-turn').count(), 0);
  // Two columns: the panel starts to the right of the conversation, on the same line.
  const [main, side] = [await box(page.locator('.pch-main')), await box(panel)];
  assert.ok(side.x >= main.x + main.width, 'history is to the right of the conversation');
  assert.ok(Math.abs(side.y - main.y) <= 2, 'both columns start on the same line');
  assert.ok(side.width >= 280 && main.width >= 560, `column widths ${main.width} + ${side.width}`);
  assert.equal(await fits(page), true);

  // Open the older one: the address keeps it, the list marks it, its questions and sources are back.
  await panel.getByRole('link', { name: new RegExp(SECOND.replace('?', '\\?')) }).click();
  await page.locator('.pc-turn').nth(1).waitFor();
  assert.equal(query(page, 'c'), 'conv-b');
  assert.deepEqual(await page.locator('.pc-question').allInnerTexts().then(list => list.map(text => text.replace(/^Pertanyaan:\s*/, ''))), [SECOND, 'Lalu bagaimana sentimennya?']);
  assert.equal(await page.locator('.pc-sources li').count(), 2);
  assert.equal(await page.locator('.pc-thread').getAttribute('aria-live'), 'off', 'a whole stored conversation is not read out when it opens');
  assert.deepEqual(await panel.locator('[aria-current]').evaluateAll(nodes => nodes.map(node => [node.getAttribute('aria-current'), node.getAttribute('href').includes('c=conv-b')])), [['true', true]]);

  // Keep asking: the question goes to that conversation with its earlier exchanges, and the row moves to the top.
  await ask(page, 'Akun mana yang paling aktif?');
  await page.locator('.pc-turn').nth(2).waitFor();
  assert.equal(await page.locator('.pc-thread').getAttribute('aria-live'), 'polite', 'a new answer is announced');
  const followUp = state.chat.asked.at(-1);
  assert.equal(followUp.conversation_id, 'conv-b');
  assert.deepEqual(followUp.history.map(entry => entry.role), ['user', 'assistant', 'user', 'assistant']);
  assert.match((await panel.getByRole('listitem').allInnerTexts())[0], /3 pertanyaan/);
  assert.equal(await panel.getByRole('link').first().getAttribute('aria-current'), 'true');
  assert.equal(state.chat.conversations.find(row => row.id === 'conv-b').turns.length, 3);

  // A reload comes back to the same conversation.
  await page.reload();
  await page.locator('.pc-turn').nth(2).waitFor();
  assert.equal(query(page, 'c'), 'conv-b');

  // "Percakapan baru" at the top of the panel: an empty conversation, nothing marked, ready to type.
  await history(page).getByRole('button', { name: 'Percakapan baru', exact: true }).click();
  await page.getByText('Coba salah satu pertanyaan ini', { exact: true }).waitFor();
  assert.equal(query(page, 'c'), null);
  assert.equal(await page.locator('.pc-turn').count(), 0);
  assert.equal(await history(page).locator('[aria-current]').count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'pc-question');

  // The first question of a new conversation carries no earlier thread; the answer gives it an address and a row.
  await ask(page, 'Bagaimana sentimen minggu ini?');
  await page.locator('.pc-turn').first().waitFor();
  await page.waitForFunction(() => new URLSearchParams(location.search).get('c') === 'made-2');
  const fresh = state.chat.asked.at(-1);
  assert.equal('conversation_id' in fresh, false);
  assert.deepEqual(fresh.history, []);
  assert.equal(await page.locator('.pc-turn').count(), 1);
  const listed = await history(page).getByRole('listitem').allInnerTexts();
  assert.equal(listed.length, 3);
  assert.match(listed[0], /^Bagaimana sentimen minggu ini\?\s+15 Nov 2026.*1 pertanyaan/);
  assert.equal(await history(page).getByRole('link').first().getAttribute('aria-current'), 'true');

  // Back returns to the conversation that was open before.
  await page.goBack();
  await page.locator('.pc-turn').nth(2).waitFor();
  assert.equal(query(page, 'c'), 'conv-b');
  assert.equal(await history(page).getByRole('link', { name: new RegExp(SECOND.replace('?', '\\?')) }).getAttribute('aria-current'), 'true');
  assert.ok(state.requests.filter(request => request.method !== 'GET').every(request => /^\/api\/admin\/pulse\/chat(\/prepare)?$/.test(request.path)));
  assert.deepEqual(state.unexpected, []);
});

test('a conversation is deleted from its row after a confirmation in the app\'s own dialog', async t => {
  const { page, state, open } = await pulseUI(t);
  state.chat = stored();
  const native = [];
  page.on('dialog', dialog => { native.push(dialog.type()); dialog.dismiss(); });
  await page.setViewportSize({ width: 1440, height: 900 });
  await open('/pulse/chat?topic=topic-a&c=conv-a');
  await page.locator('.pc-turn').first().waitFor();
  const panel = history(page);
  const remove = panel.getByRole('button', { name: `Hapus percakapan: ${FIRST}`, exact: true });
  await remove.click();
  const dialog = page.getByRole('dialog', { name: 'Hapus percakapan ini?', exact: true });
  await dialog.waitFor();
  assert.match(await dialog.innerText(), new RegExp(FIRST.replace('?', '\\?')));
  assert.match(await dialog.innerText(), /tidak bisa dikembalikan/);
  assert.equal(await dialog.evaluate(node => Boolean(node.closest('.pulse-standalone'))), true, 'the dialog is drawn inside the PULSE theme');
  // Batal: nothing is sent, the row stays, focus returns to the control that opened the dialog.
  await dialog.getByRole('button', { name: 'Batal', exact: true }).click();
  await dialog.waitFor({ state: 'detached' });
  assert.equal(state.chat.deleted.length, 0);
  await page.waitForFunction(name => document.activeElement?.getAttribute('aria-label') === name, `Hapus percakapan: ${FIRST}`);

  // The server refuses: the dialog stays and says so; the row is still there.
  state.chat.deleteStatus = 500;
  await remove.click();
  await dialog.getByRole('button', { name: 'Hapus percakapan', exact: true }).click();
  await dialog.getByRole('alert').filter({ hasText: 'Percakapan belum berhasil dihapus. Coba lagi.' }).waitFor();
  assert.equal(await page.locator('.pch-list > li').count(), 2);      // by selector: the page behind an open dialog is hidden from roles

  // It works: the row goes, and because it was the open conversation the column returns to a new one.
  state.chat.deleteStatus = 200;
  await dialog.getByRole('button', { name: 'Hapus percakapan', exact: true }).click();
  await dialog.waitFor({ state: 'detached' });
  await page.getByText('Coba salah satu pertanyaan ini', { exact: true }).waitFor();
  assert.deepEqual(state.chat.deleted, [{ id: 'conv-a', csrf: 'fixture-csrf' }]);
  assert.equal(await panel.getByRole('listitem').count(), 1);
  assert.equal(query(page, 'c'), null);
  assert.equal(await page.locator('.pc-turn').count(), 0);
  await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Percakapan baru');   // focus lands on a control that still exists
  // Deleting one that is not open leaves the open conversation alone.
  await panel.getByRole('link').first().click();
  await page.locator('.pc-turn').nth(1).waitFor();
  state.chat.conversations.push({ id: 'conv-c', topic_id: 'topic-a', title: LONG, updated_at: '2026-11-10T02:10:00Z', turns: [chatTurn(LONG, 'Jawaban [P1].', 1)] });
  await page.reload();
  await history(page).getByRole('button', { name: `Hapus percakapan: ${LONG}`, exact: true }).click();
  await dialog.getByRole('button', { name: 'Hapus percakapan', exact: true }).click();
  await dialog.waitFor({ state: 'detached' });
  assert.equal(query(page, 'c'), 'conv-b');
  assert.equal(await page.locator('.pc-turn').count(), 2);
  assert.deepEqual(native, [], 'window.confirm is never used');
});

test('the list says when it is loading, empty, cut or unavailable, and the conversation works without it', async t => {
  const { page, state, open } = await pulseUI(t);
  state.chat = chatStore();
  let release;
  state.chat.holdList = new Promise(resolve => { release = resolve; });
  await page.setViewportSize({ width: 1440, height: 900 });
  await open('/pulse/chat?topic=topic-a');
  const panel = history(page);
  await panel.getByRole('status').filter({ hasText: 'Memuat riwayat percakapan' }).waitFor();
  release();
  await panel.getByText('Belum ada percakapan tersimpan untuk project ini.', { exact: true }).waitFor();
  assert.equal(await panel.getByRole('listitem').count(), 0);

  // The list cannot be read: the panel says so and offers to try again; asking still works and the answer shows up in the list.
  state.chat.holdList = null;
  state.chat.listStatus = 500;
  await page.reload();
  const failed = history(page).getByRole('status').filter({ hasText: 'Riwayat tidak dapat dimuat. Anda tetap dapat bertanya.' });
  await failed.waitFor();
  await ask(page, FIRST);
  await page.locator('.pc-turn').first().waitFor();
  assert.match(await page.locator('.pc-answer-text').first().innerText(), /Jawaban uji 1/);
  state.chat.listStatus = 200;
  await history(page).getByRole('button', { name: 'Coba lagi', exact: true }).click();
  await history(page).getByRole('link', { name: new RegExp(FIRST.replace('?', '\\?')) }).waitFor();
  assert.equal(await failed.count(), 0);

  // A list the server cut says how many there are.
  state.chat.total = 73;
  await page.reload();
  await history(page).getByText('Menampilkan 1 percakapan terbaru dari 73. Hapus yang tidak diperlukan untuk melihat yang lebih lama.', { exact: true }).waitFor();
});

test('a conversation that cannot be opened says why and offers the next step', async t => {
  const { page, state, open } = await pulseUI(t);
  state.chat = stored();
  await page.setViewportSize({ width: 1440, height: 900 });
  // Deleted elsewhere, or never this person's: not found.
  await open('/pulse/chat?topic=topic-a&c=conv-gone');
  const missing = page.getByRole('alert').filter({ hasText: 'Percakapan tidak ditemukan.' });
  await missing.waitFor();
  assert.equal(await page.locator('.pc-turn').count(), 0);
  assert.equal(await history(page).getByRole('listitem').count(), 2, 'the history is still there to pick from');
  await missing.getByRole('button', { name: 'Mulai percakapan baru', exact: true }).click();
  await page.getByText('Coba salah satu pertanyaan ini', { exact: true }).waitFor();
  assert.equal(query(page, 'c'), null);
  assert.equal(await missing.count(), 0);
  // Another project's conversation under this project's address is not shown either.
  await open('/pulse/chat?topic=topic-a&c=conv-elsewhere');
  await missing.waitFor();

  // The server fails: say so, keep the address, try again on request.
  state.chat.openStatus = 500;
  await open('/pulse/chat?topic=topic-a&c=conv-b');
  const broken = page.getByRole('alert').filter({ hasText: 'Percakapan tidak dapat dibuka.' });
  await broken.waitFor();
  state.chat.openStatus = 200;
  await broken.getByRole('button', { name: 'Coba lagi', exact: true }).click();
  await page.locator('.pc-turn').nth(1).waitFor();
  assert.equal(await broken.count(), 0);
  assert.equal(query(page, 'c'), 'conv-b');

  // Deleted in another tab while it is open here: the next question is refused with the server's own words, and the draft is kept.
  state.chat.conversations = state.chat.conversations.filter(row => row.id !== 'conv-b');
  await ask(page, 'Masih ada?');
  await page.getByRole('alert').filter({ hasText: 'Percakapan ini tidak ditemukan atau sudah dihapus. Mulai percakapan baru untuk bertanya lagi.' }).waitFor();
  assert.equal(await page.getByLabel('Pertanyaan Anda', { exact: true }).inputValue(), 'Masih ada?');
});

test('an answer that could not be kept says so, and a full conversation asks for a new one', async t => {
  const { page, state, open } = await pulseUI(t);
  state.chat = stored();
  state.chat.conversations.push({ id: 'conv-full', topic_id: 'topic-a', title: 'Percakapan panjang', updated_at: '2026-11-12T02:10:00Z', turns: Array.from({ length: 40 }, (_, index) => chatTurn('Pertanyaan ' + (index + 1), 'Jawaban [P1].', index)) });
  await page.setViewportSize({ width: 1440, height: 900 });
  await open('/pulse/chat?topic=topic-a');
  state.chat.keep = false;
  await ask(page, FIRST);
  await page.locator('.pc-turn').first().waitFor();
  await page.locator('.pc-turn').first().getByText('Tidak tersimpan di riwayat.', { exact: true }).waitFor();
  assert.equal(query(page, 'c'), null);
  assert.equal(await history(page).getByRole('listitem').count(), 3, 'nothing was added to the list');

  await open('/pulse/chat?topic=topic-a&c=conv-full');
  await page.locator('.pc-turn').nth(39).waitFor();
  const full = page.getByRole('status').filter({ hasText: 'Percakapan penuh.' });
  await full.waitFor();
  assert.equal(await page.getByLabel('Pertanyaan Anda', { exact: true }).isDisabled(), true);
  assert.match(await history(page).getByRole('link', { name: /Percakapan panjang/ }).innerText(), /40 pertanyaan/);
  await full.getByRole('button', { name: 'Percakapan baru', exact: true }).click();
  await page.getByText('Coba salah satu pertanyaan ini', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Pertanyaan Anda', { exact: true }).isDisabled(), false);
});

test('an answer that arrives after the reader moved to another conversation goes to its own conversation, not the one on screen', async t => {
  const { page, state, open } = await pulseUI(t);
  state.chat = stored();
  let release;
  state.chat.holdAnswer = new Promise(resolve => { release = resolve; });
  await page.setViewportSize({ width: 1440, height: 900 });
  await open('/pulse/chat?topic=topic-a&c=conv-a');
  await page.locator('.pc-turn').first().waitFor();
  await ask(page, 'Pertanyaan yang lama dijawab');
  await page.getByText('Menyusun jawaban…').waitFor();
  await history(page).getByRole('link', { name: new RegExp(SECOND.replace('?', '\\?')) }).click();
  await page.locator('.pc-turn').nth(1).waitFor();
  assert.equal(await page.getByText('Menyusun jawaban…').count(), 0, 'the wait belongs to the other conversation');
  release();
  // The row of the conversation that was asked shows the new count; the open conversation keeps its two questions.
  await history(page).getByRole('link', { name: new RegExp(FIRST.replace('?', '\\?')) }).filter({ hasText: '2 pertanyaan' }).waitFor();
  assert.equal(query(page, 'c'), 'conv-b');
  assert.equal(await page.locator('.pc-turn').count(), 2);
  assert.doesNotMatch(await page.locator('.pc-thread').innerText(), /Pertanyaan yang lama dijawab/);
  const opened = id => state.requests.filter(request => request.method === 'GET' && request.path.endsWith('/chat/conversations/' + id)).length;
  assert.equal(opened('conv-b'), 1, 'the conversation on screen is left alone, not loaded again');
  // Going back to it shows the answer that was kept.
  await history(page).getByRole('link', { name: new RegExp(FIRST.replace('?', '\\?')) }).click();
  await page.getByText('Pertanyaan yang lama dijawab').waitFor();
  assert.equal(await page.locator('.pc-turn').count(), 2);

  // The same for a first question: its new conversation appears in the list, and the reader stays where they went.
  state.chat.holdAnswer = new Promise(resolve => { release = resolve; });
  await history(page).getByRole('button', { name: 'Percakapan baru', exact: true }).click();
  await page.getByText('Coba salah satu pertanyaan ini', { exact: true }).waitFor();
  await ask(page, 'Pertanyaan pertama yang ditinggal');
  await page.getByText('Menyusun jawaban…').waitFor();
  await history(page).getByRole('link', { name: new RegExp(SECOND.replace('?', '\\?')) }).click();
  await page.locator('.pc-turn').nth(1).waitFor();
  release();
  await history(page).getByRole('link', { name: /Pertanyaan pertama yang ditinggal/ }).waitFor();
  assert.equal(query(page, 'c'), 'conv-b');
  assert.equal(await history(page).locator('[aria-current]').count(), 1);
  assert.match(await history(page).locator('[aria-current]').innerText(), new RegExp(SECOND.replace('?', '\\?')));
  assert.doesNotMatch(await page.locator('.pc-thread').innerText(), /Pertanyaan pertama yang ditinggal/);
});

test('on a narrow screen the history sits under the conversation, without sideways scroll, with touch-sized rows', async t => {
  const { page, state, open } = await pulseUI(t);
  state.chat = stored();
  state.chat.conversations.push({ id: 'conv-long', topic_id: 'topic-a', title: LONG, updated_at: '2026-11-15T01:00:00Z', turns: [chatTurn(LONG, 'Jawaban_panjang_tanpa_spasi_'.repeat(8) + ' [P1].', 1)] });
  // The page, not the window, decides: two columns from 940px of page width, so an ordinary 1280px or 1366px laptop gets the history on the right.
  for (const [width, height, stacked] of [[390, 844, true], [768, 1024, true], [1100, 800, true], [1280, 800, false], [1366, 768, false], [1440, 900, false], [1920, 1080, false]]) {
    await page.setViewportSize({ width, height });
    await open('/pulse/chat?topic=topic-a&c=conv-long');
    await page.locator('.pc-turn').first().waitFor();
    const panel = history(page);
    await panel.getByRole('link').first().waitFor();
    const [main, side] = [await box(page.locator('.pch-main')), await box(panel)];
    if (stacked) {
      assert.ok(side.y >= main.y + main.height, `${width}px: history is under the conversation`);
      assert.ok(Math.abs(side.x - main.x) <= 1 && Math.abs(side.width - main.width) <= 1, `${width}px: one column`);
    } else {
      assert.ok(side.x >= main.x + main.width && Math.abs(side.y - main.y) <= 2, `${width}px: history is beside the conversation`);
    }
    assert.equal(await fits(page), true, `${width}px: no sideways scroll`);
    // The title of a row is cut, never the row widened.
    assert.equal(await panel.getByRole('listitem').evaluateAll(nodes => nodes.every(node => node.scrollWidth <= node.clientWidth + 1)), true, `${width}px: rows keep to the panel`);
    const minimum = width < 700 ? 44 : 36;
    const targets = await panel.locator('a, button').evaluateAll(nodes => nodes.map(node => Math.round(node.getBoundingClientRect().height)));
    assert.ok(targets.every(size => size >= minimum), `${width}px: controls at least ${minimum}px tall, got ${targets}`);
  }
  // On a phone the reader picks from the list under the conversation: what they picked opens with its last question in view.
  await page.setViewportSize({ width: 390, height: 844 });
  await open('/pulse/chat?topic=topic-a&c=conv-long');
  await page.locator('.pc-turn').first().waitFor();
  await history(page).getByRole('link', { name: new RegExp(SECOND.replace('?', '\\?')) }).click();
  await page.locator('.pc-question').filter({ hasText: 'Lalu bagaimana sentimennya?' }).waitFor();
  await page.waitForTimeout(300);
  const landed = await page.evaluate(() => {
    const turns = document.querySelectorAll('.pc-turn');
    const { top, bottom } = turns[turns.length - 1].getBoundingClientRect();
    return { top: Math.round(top), bottom: Math.round(bottom), height: innerHeight };
  });
  assert.ok(landed.top >= -1 && landed.bottom <= landed.height + 1, `the last question and its answer are on screen: ${JSON.stringify(landed)}`);
});

test('choosing another project leaves the open conversation behind', async t => {
  const { page, state, open } = await pulseUI(t);
  state.chat = stored();
  await page.route('**/api/admin/pulse/topics', route => route.request().method() === 'GET'
    ? route.fulfill({ json: ['topic-a', 'topic-b'].map((id, index) => ({ id, label: index ? 'Project lain' : 'GERAK', query: 'GERAK', sources: ['rss'], is_active: true, last_crawled_at: null, seed_post: null })) })
    : route.fallback());
  await page.setViewportSize({ width: 1440, height: 900 });
  await open('/pulse/chat?topic=topic-a&c=conv-a');
  await page.locator('.pc-turn').first().waitFor();
  await page.getByRole('combobox', { name: 'Project aktif', exact: true }).selectOption('topic-b');
  await history(page).getByRole('link', { name: /Percakapan project lain/ }).waitFor();
  assert.equal(query(page, 'topic'), 'topic-b');
  assert.equal(query(page, 'c'), null);
  assert.equal(await page.locator('.pc-turn').count(), 0);
  assert.equal(await history(page).getByRole('listitem').count(), 1);
  assert.equal(await history(page).locator('[aria-current]').count(), 0);
});

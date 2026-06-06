import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5173/command-center/survey', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const buttons = await page.locator('button, a').allInnerTexts();
console.log('controls on list:', [...new Set(buttons.map(b=>b.trim()).filter(Boolean))].slice(0,15).join(' | '));
// click anything that says Hasil / results
const hasil = page.getByRole('button', { name: /hasil/i }).first();
const has = await hasil.count();
if (has) { await hasil.click(); await page.waitForTimeout(1500); }
const anySvg = await page.locator('svg').count();
const rechartsSvg = await page.locator('.recharts-wrapper').count();
const onResults = (await page.evaluate(()=>document.body.innerText)).includes('responden');
console.log('clicked Hasil:', !!has, '| onResults(has "responden"):', onResults, '| total svg:', anySvg, '| recharts wrappers:', rechartsSvg);
console.log('pageerrors:', errors.length ? errors.join(' / ') : '(none)');
await browser.close();

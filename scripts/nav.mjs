import { chromium } from 'playwright-core';
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' }); await p.waitForTimeout(700);
// go to mission board (bottom nav "Misi")
await p.getByText(/^Misi$/).first().click().catch(e=>console.log('misi tab:', e.message)); await p.waitForTimeout(700);
const card = p.getByText(/Survey: Kepuasan Kegiatan Bakti Sosial/i).first();
console.log('survey mission card on board:', await card.count() > 0);
await card.click().catch(e=>console.log('card click:', e.message)); await p.waitForTimeout(900);
const body = await p.evaluate(()=>document.body.innerText);
console.log('SurveyRunner opened (shows a question):', body.includes('Seberapa puas') || body.includes('Pertanyaan'));
console.log('ErrorBoundary:', body.includes('Terjadi Kesalahan'), '| pageerrors:', errs.length?errs.join('/'):'(none)');
await b.close();

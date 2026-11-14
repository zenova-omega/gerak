import { chromium } from 'playwright-core';
const b = await chromium.launch({ channel: 'chrome', headless: true });

// SURVEY full create
let p = await b.newPage({ viewport:{width:1280,height:900} });
p.on('pageerror',e=>console.log('  SURVEY ERR:',e.message.split('\n')[0]));
await p.goto('http://localhost:5173/command-center/survey', {waitUntil:'networkidle'}); await p.waitForTimeout(700);
await p.getByRole('button',{name:/Buat survey/i}).first().click(); await p.waitForTimeout(500);
await p.getByPlaceholder(/Nama survey/i).fill('Survey Uji 123');
await p.getByPlaceholder(/Tulis pertanyaan/i).first().fill('Apakah puas?');
const opts = p.getByPlaceholder(/Pilihan/i);
await opts.nth(0).fill('Ya'); await opts.nth(1).fill('Tidak');
const saveBtn = p.getByRole('button',{name:/Simpan survey/i}).first();
console.log('SURVEY save enabled:', await saveBtn.isEnabled());
await saveBtn.click(); await p.waitForTimeout(900);
console.log('SURVEY appears in list:', (await p.evaluate(()=>document.body.innerText)).includes('Survey Uji 123'));
await p.close();

// STUDIO generate + save draft (then check drafts not crashing; saved item has no list UI but should not error)
p = await b.newPage({ viewport:{width:1280,height:900} });
let studioErr = false; p.on('pageerror',e=>{studioErr=true; console.log('  STUDIO ERR:',e.message.split('\n')[0]);});
await p.goto('http://localhost:5173/command-center/studio', {waitUntil:'networkidle'}); await p.waitForTimeout(600);
await p.locator('textarea').first().fill('Promo kopi akhir pekan');
await p.getByRole('button',{name:/generate/i}).first().click(); await p.waitForTimeout(700);
await p.getByRole('button',{name:/^Simpan$/}).first().click().catch(e=>console.log('  simpan:',e.message)); await p.waitForTimeout(700);
console.log('STUDIO generate+save: no pageerror:', !studioErr, '| variants present:', (await p.evaluate(()=>document.body.innerText)).includes('Promo kopi'));
await p.close();
await b.close();

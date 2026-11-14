import { chromium } from 'playwright-core';
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto('http://localhost:5173/presentation', { waitUntil:'networkidle' }); await p.waitForTimeout(1200);
for (let i=0;i<60;i++){ await p.keyboard.press('ArrowRight'); await p.waitForTimeout(160);
  const t = await p.evaluate(()=>document.body.innerText);
  if (t.includes('Satu Pusat Operasi')) { await p.screenshot({path:'/tmp/scout-slide-cc.png'}); break; } }
for (let i=0;i<20;i++){ await p.keyboard.press('ArrowRight'); await p.waitForTimeout(160);
  const t = await p.evaluate(()=>document.body.innerText);
  if (t.includes('AI di SCOUT')) { await p.screenshot({path:'/tmp/scout-slide-ai.png'}); break; } }
await b.close(); console.log('ok');

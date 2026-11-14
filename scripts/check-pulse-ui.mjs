// Local visual smoke test; credentials and tokens are never logged.
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const values = Object.fromEntries(readFileSync(new URL('../server/.prototype-access', import.meta.url), 'utf8').trim().split('\n').map(line => { const i=line.indexOf('='); return [line.slice(0,i),line.slice(i+1)]; }));
const browser = await chromium.launch({channel:'chrome',headless:true});
try {
  const page = await browser.newPage({viewport:{width:1440,height:1000}});
  const failures = [];
  page.on('pageerror', e => failures.push(e.message));
  await page.goto('http://127.0.0.1:5173/login');
  await page.locator('input[type=text]').fill(values.NRP);
  await page.locator('input[type=password]').fill(values.PASSWORD);
  await page.locator('button[type=submit]').click();
  await page.waitForURL('**/admin');
  await page.goto('http://127.0.0.1:5173/command-center/pulse');
  await page.getByRole('heading', {name:/Pulse/}).first().waitFor();
  await page.waitForLoadState('networkidle');
  await page.screenshot({path:'/tmp/gerak-pulse-desktop.png',fullPage:true});
  await page.screenshot({path:'/tmp/gerak-pulse-overview.png'});
  console.log('Desktop page errors:',failures.length);
  console.log('Pulse heading visible:',await page.getByRole('heading', {name:'Pulse',exact:true}).isVisible());
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'/tmp/gerak-pulse-mobile.png',fullPage:true});
  console.log('Mobile overflow:',await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth));
  if(failures.length) process.exitCode=1;
} finally { await browser.close(); }

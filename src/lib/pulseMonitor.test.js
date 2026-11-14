import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as monitor from './pulseMonitor.js';

test('manual status excludes automated runs and other providers, preserves latest failure',()=>{
  assert.equal(typeof monitor.latestManualProviderRun,'function');
  const runs=[
    {id:'manual-ok',manual:true,started_at:'2026-11-10T00:00:00',providers:{xpoz:{status:'success'}}},
    {id:'auto',manual:false,started_at:'2026-11-11T03:00:00',providers:{xpoz:{status:'success'}}},
    {id:'other-provider',manual:true,started_at:'2026-11-11T02:00:00',providers:{youtube:{status:'success'}}},
    {id:'manual-failed',manual:true,started_at:'2026-11-11T01:00:00',providers:{xpoz:{status:'error'}}},
  ];
  assert.equal(monitor.latestManualProviderRun(runs,'xpoz').id,'manual-failed');
  assert.equal(monitor.latestManualProviderRun(runs,'rss'),null);
  assert.equal(monitor.latestManualProviderRun([],'xpoz'),null);
});

test('pending acknowledgement prevents both page transitions until mutation completes',()=>{
  assert.equal(typeof monitor.canChangeAlertPage,'function');
  assert.equal(monitor.canChangeAlertPage(1,151,true,-1),false);
  assert.equal(monitor.canChangeAlertPage(1,151,true,1),false);
  assert.equal(monitor.canChangeAlertPage(1,151,false,1),true);
  assert.equal(monitor.canChangeAlertPage(0,151,false,-1),false);
  assert.equal(monitor.canChangeAlertPage(3,151,false,1),false);
  assert.equal(monitor.canChangeAlertPage(0,0,false,1),false);
});

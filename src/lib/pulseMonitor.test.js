import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as monitor from './pulseMonitor.js';

test('pending acknowledgement prevents both page transitions until mutation completes',()=>{
  assert.equal(typeof monitor.canChangeAlertPage,'function');
  assert.equal(monitor.canChangeAlertPage(1,151,true,-1),false);
  assert.equal(monitor.canChangeAlertPage(1,151,true,1),false);
  assert.equal(monitor.canChangeAlertPage(1,151,false,1),true);
  assert.equal(monitor.canChangeAlertPage(0,151,false,-1),false);
  assert.equal(monitor.canChangeAlertPage(3,151,false,1),false);
  assert.equal(monitor.canChangeAlertPage(0,0,false,1),false);
});

test('an interval reads as words a person says, never as raw minutes past the hour',()=>{
  assert.equal(monitor.intervalText(120),'Tiap 2 jam');
  assert.equal(monitor.intervalText(60),'Tiap 1 jam');
  assert.equal(monitor.intervalText(30),'Tiap 30 menit');
  assert.equal(monitor.intervalText(90),'Tiap 1 jam 30 menit');
  assert.equal(monitor.intervalText(1440),'Tiap hari');
  assert.equal(monitor.intervalText(0),null);
  assert.equal(monitor.intervalText(undefined),null);
});

test('share of scheduled collections: no plan gives no figure, and 100% or 0% are never rounded into',()=>{
  assert.equal(monitor.runShare({planned:0,succeeded:0,failed:0,waiting:0}),null,'nothing scheduled is not 0%');
  assert.equal(monitor.runShare(undefined),null);
  assert.deepEqual(monitor.runShare({planned:12,succeeded:9,failed:2,waiting:1}),{planned:12,succeeded:9,failed:2,waiting:1,percent:75});
  assert.equal(monitor.runShare({planned:300,succeeded:299,failed:1}).percent,99,'one failure must stay visible');
  assert.equal(monitor.runShare({planned:300,succeeded:1,failed:299}).percent,1,'one success must stay visible');
  assert.equal(monitor.runShare({planned:4,succeeded:4}).percent,100);
  assert.equal(monitor.runShare({planned:4,succeeded:0,failed:4}).percent,0);
});

test('publication span counts calendar days as a reader in WIB sees them',()=>{
  assert.equal(monitor.publishedDay('2026-11-01T20:00:00'),'2026-11-02','20.00 UTC is already the next day in WIB');
  assert.equal(monitor.publishedDay('2026-11-05T00:00:00'),'2026-11-05','a date without a clock stays that date');
  assert.equal(monitor.publishedDay(null),null);
  assert.deepEqual(monitor.postSpan('2026-11-01T02:00:00','2026-11-14T03:00:00Z'),{from:'2026-11-01',to:'2026-11-14',days:14,text:'1 Nov 2026 sampai 14 Nov 2026'});
  assert.equal(monitor.postSpan('2026-11-03T02:00:00','2026-11-03T05:00:00').text,'3 Nov 2026');
  assert.equal(monitor.postSpan('2026-11-03T02:00:00','2026-11-03T05:00:00').days,1);
  assert.equal(monitor.postSpan(null,null),null,'undated posts have no span');
});

test('a span is placed on the project axis by whole days and never leaves it',()=>{
  const axis={from:'2026-11-01',to:'2026-11-10'};
  assert.deepEqual(monitor.spanPlacement({from:'2026-11-01',to:'2026-11-10'},axis),{start:0,width:100});
  const late=monitor.spanPlacement({from:'2026-11-06',to:'2026-11-10'},axis);
  assert.equal(late.start,50); assert.equal(late.width,50);
  assert.equal(monitor.spanPlacement({from:'2026-10-01',to:'2026-12-01'},axis).width,100);
  assert.equal(monitor.spanPlacement(null,axis),null);
});

test('source status separates a pause, a wait that ends by itself, and a stop that needs a person',()=>{
  const on={enabled:true,interval_minutes:60};
  assert.equal(monitor.sourceStatus(null,null).label,'Tanpa jadwal');
  assert.equal(monitor.sourceStatus({enabled:false},{daily_limit:-1,blocked_reason:'authentication_failed'}).label,'Dijeda');
  assert.equal(monitor.sourceStatus(on,{daily_limit:-1,blocked_reason:null}).label,'Aktif');
  assert.equal(monitor.sourceStatus(on,{daily_limit:0,blocked_reason:null}).key,'off');
  const wait=monitor.sourceStatus(on,{daily_limit:-1,blocked_reason:'rate_limited',blocked_until:'2026-11-14T03:00:00'});
  assert.equal(wait.key,'waiting'); assert.match(wait.reason,/14 Nov 2026/);
  const stop=monitor.sourceStatus(on,{daily_limit:-1,blocked_reason:'access_or_quota_restricted',blocked_until:null});
  assert.equal(stop.key,'stopped'); assert.match(stop.reason,/Saldo sumber data habis/);
});

const payload={
  workers:[{provider:'rss',daily_limit:-1,blocked_reason:null},{provider:'social',daily_limit:-1,blocked_reason:null},{provider:'youtube',daily_limit:0,blocked_reason:null}],
  schedules:[
    {topic_id:'t1',provider:'rss',enabled:true,interval_minutes:120,last_success_at:'2026-11-13T10:00:00',next_run_at:'2026-11-13T12:00:00'},
    {topic_id:'t1',provider:'tiktok',enabled:false,interval_minutes:1440,last_success_at:null,next_run_at:'2026-11-13T12:00:00'},
    {topic_id:'t1',provider:'youtube',enabled:true,interval_minutes:60,last_success_at:null,next_run_at:'2026-11-13T12:00:00'},
    {topic_id:'other',provider:'social',enabled:true,interval_minutes:60},
  ],
  overview:{sources:[
    {platform:'news',posts:120,first_published_at:'2026-11-01T02:00:00',last_published_at:'2026-11-13T09:00:00',days_with_posts:12,last_collected_at:'2026-11-13T10:30:00',runs:{day:{planned:12,succeeded:11,failed:1,waiting:0},week:{planned:80,succeeded:76,failed:3,waiting:1}}},
    {platform:'instagram',posts:40,first_published_at:'2026-11-08T00:00:00',last_published_at:'2026-11-12T00:00:00',days_with_posts:4,last_collected_at:'2026-11-12T08:00:00',runs:{day:{planned:0,succeeded:0,failed:0,waiting:0},week:{planned:0,succeeded:0,failed:0,waiting:0}}},
    {platform:'web',posts:3,first_published_at:null,last_published_at:null,days_with_posts:0,last_collected_at:null,runs:{day:{planned:0,succeeded:0,failed:0,waiting:0},week:{planned:0,succeeded:0,failed:0,waiting:0}}},
  ]},
};

test('overview rows: one per collected source in reading order, scoped to the project, no figure invented',()=>{
  const rows=monitor.collectionRows(payload,{id:'t1',sources:['rss','social']});
  assert.deepEqual(rows.map(row=>row.platform),['news','x','instagram','tiktok','youtube','reddit','web']);
  assert.deepEqual(rows.filter(row=>row.shown).map(row=>row.platform),['news','x','instagram','youtube','web']);
  const [news,x,instagram,tiktok,youtube]=rows;
  assert.equal(news.status.label,'Aktif'); assert.equal(news.week.percent,95); assert.equal(news.day.percent,92);
  assert.equal(news.last,'2026-11-13T10:30:00','a post collected after the last scheduled success is the latest collection');
  assert.equal(news.next,'2026-11-13T12:00:00'); assert.equal(news.span.days,13);
  assert.equal(x.status.label,'Tanpa jadwal','another project\'s schedule must not leak in'); assert.equal(x.posts,0); assert.equal(x.week,null);
  assert.equal(instagram.week,null,'no scheduled collection means no percentage'); assert.equal(instagram.span.text,'8 Nov 2026 sampai 12 Nov 2026');
  assert.equal(tiktok.shown,false,'a paused source without posts is not something the project collects'); assert.equal(tiktok.next,null);
  assert.equal(youtube.status.key,'off');
  assert.equal(rows[6].label,null); assert.equal(rows[6].span,null);
});

test('overview rows survive a payload without figures or without a project',()=>{
  const bare=monitor.collectionRows({schedules:payload.schedules,workers:payload.workers},{id:'t1',sources:['rss']});
  assert.equal(bare[0].hasFigures,false); assert.equal(bare[0].posts,0); assert.equal(bare[0].week,null); assert.equal(bare[0].shown,true);
  const all=monitor.collectionRows(payload,null);
  assert.equal(all[0].status.key,'unscoped'); assert.equal(all[0].scheduleRow,null); assert.equal(all[0].posts,120);
  assert.deepEqual(monitor.collectionRows(null,null).filter(row=>row.shown),[]);
});

test('frequency cell: how often, last and next collection, in words that fit the source state',()=>{
  const rows=monitor.collectionRows(payload,{id:'t1',sources:['rss','social']});
  const [news,x,,tiktok,youtube]=rows;
  assert.deepEqual(monitor.frequencyText(news,'2026-11-13T11:00:00'),{headline:'Tiap 2 jam',last:'Terakhir 13 Nov 2026, 17.30 WIB',next:'Berikutnya 13 Nov 2026, 19.00 WIB'});
  assert.equal(monitor.frequencyText(news,'2026-11-13T12:00:01').next,'Berikutnya segera','a collection that is already due has no future time to show');
  assert.deepEqual(monitor.frequencyText(x,'2026-11-13T11:00:00'),{headline:'Tanpa jadwal',last:'Belum pernah mengumpulkan',next:'Dikumpulkan hanya saat diminta'});
  assert.equal(monitor.frequencyText(tiktok,'2026-11-13T11:00:00').headline,'Dijeda');
  assert.equal(monitor.frequencyText(youtube,'2026-11-13T11:00:00').next,'Berikutnya setelah sumber aktif lagi');
  assert.equal(monitor.frequencyText(monitor.collectionRows(payload,null)[0],'2026-11-13T11:00:00').headline,null);
});

test('project summary adds up shown sources only and spans their earliest to latest post',()=>{
  const summary=monitor.collectionSummary(monitor.collectionRows(payload,{id:'t1',sources:['rss','social']}));
  assert.equal(summary.sources,5); assert.equal(summary.active,1); assert.equal(summary.posts,163);
  assert.equal(summary.span.text,'1 Nov 2026 sampai 13 Nov 2026');
  assert.deepEqual(summary.week,{planned:80,succeeded:76,failed:3,waiting:1,percent:95});
  assert.deepEqual([summary.scheduled,summary.fastest,summary.slowest],[2,60,120],'only schedules that are switched on say how often');
  const empty=monitor.collectionSummary(monitor.collectionRows(null,null));
  assert.equal(empty.posts,0); assert.equal(empty.span,null); assert.equal(empty.week,null);
  assert.deepEqual([empty.scheduled,empty.fastest,empty.slowest],[0,null,null]);
});

test('an alert row shows one triggering figure and never a schedule key or error code',()=>{
  const spike=monitor.alertSummary({kind:'volume_spike',title:'Isu contoh',issue_id:'i1',acknowledged_at:null,detail:{posts:32,authors:12,previous_posts:8,ratio:4,window_minutes:30}});
  assert.deepEqual(spike,{tone:'warning',label:'Lonjakan posting',title:'Isu contoh',figure:'32 posting dalam 30 menit, 4× dari sebelumnya',unread:true,opens:true});
  assert.equal(monitor.alertSummary({kind:'engagement_growth',title:'Posting',issue_id:'i2',acknowledged_at:'2026-11-12T09:00:00',detail:{delta_engagement:1200,rate_per_hour:312.56}}).figure,'+1.200 interaksi, 312,6 per jam');
  assert.equal(monitor.alertSummary({kind:'recent_cluster',title:'Isu',issue_id:'i3',detail:{posts:7,authors:4,window_minutes:30}}).figure,'7 posting dari 4 akun dalam 30 menit');
  const failure=monitor.alertSummary({kind:'collection_error',title:'social: rate_limited',issue_id:null,acknowledged_at:null,detail:{job_id:'j',error:'rate_limited'}});
  assert.equal(failure.title,'Pengumpulan X gagal'); assert.equal(failure.figure,'Sumber meminta jeda sebentar'); assert.equal(failure.opens,false);
  assert.equal(monitor.alertSummary({kind:'collection_error',title:'instagram: something_new',detail:{error:'something_new'}}).figure,'Sumber menolak permintaan');
  assert.equal(monitor.alertSummary({kind:'collection_error',title:'profiles_x: timeout',detail:{}}).title,'Pengumpulan gagal');
  const written=monitor.alertSummary({kind:'collection_error',title:'Pengambilan Instagram gagal',detail:{}});
  assert.equal(written.title,'Pengambilan Instagram gagal'); assert.equal(written.figure,null);
  for(const row of [failure,monitor.alertSummary({kind:'collection_error',title:'rss: transient_http',detail:{error:'transient_http'}})])
    assert.doesNotMatch(row.title+' '+row.figure,/xpoz|rss|rate_limited|transient_http/i);
  assert.equal(monitor.alertSummary({kind:'unknown_kind',title:'',detail:{}}).label,'Aktivitas baru');
});

test('navigation badge: nothing for zero or a failed read, capped at two digits',()=>{
  assert.equal(monitor.unreadBadgeText(0),null);
  assert.equal(monitor.unreadBadgeText(null),null);
  assert.equal(monitor.unreadBadgeText(undefined),null);
  assert.equal(monitor.unreadBadgeText(7),'7');
  assert.equal(monitor.unreadBadgeText(99),'99');
  assert.equal(monitor.unreadBadgeText(100),'99+');
});

test('unread cache keeps the count across a remount and spaces server reads a minute apart',()=>{
  const cache=monitor.createUnreadCache(60000);
  assert.equal(cache.peek('s:t1'),null); assert.equal(cache.wait('s:t1',1000),0,'nothing known: read now');
  cache.put('s:t1',4,1000);
  assert.equal(cache.peek('s:t1'),4); assert.equal(cache.wait('s:t1',21000),40000); assert.equal(cache.wait('s:t1',99000),0);
  assert.equal(cache.peek('s:t2'),null,'another project never borrows the count');
  cache.put('s:t1',0,5000); assert.equal(cache.peek('s:t1'),0,'zero is a known count, not a missing one');
  cache.drop('s:t1'); assert.equal(cache.peek('s:t1'),null);
});

test('every source and extra carries a human label; request keys stay out of labels',()=>{
  assert.deepEqual(monitor.monitorSources.map(row=>row.label),['Berita','X','Instagram','TikTok','YouTube','Reddit']);
  for(const row of [...monitor.monitorSources,...monitor.monitorExtras]) assert.doesNotMatch(row.label,/xpoz|rss|profiles|_|worker|lane/i);
  assert.equal(monitor.defaultInterval('tiktok'),1440); assert.equal(monitor.defaultInterval('news'),60);
});

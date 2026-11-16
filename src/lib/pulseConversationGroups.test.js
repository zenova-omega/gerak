import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildConversationGroups, conversationGroups, defaultGroupFilters, filterConversationGroups, groupDayRange, groupPageSize,
  groupTotalsText, isGroupFiltered, leadingGroups, pageOfGroups, sentimentShares, sortGroups, toggleGroupFilter,
} from './pulseConversationGroups.js';

const scopePosts=[
 {id:'a',issue_id:'g',platform:'youtube',author:'A',text:'Dalam periode',published_at:'2026-11-09T17:00:00Z',metrics:{engagement:0}},
 {id:'b',issue_id:'g',platform:'instagram',author:'B',text:'Di luar platform',published_at:'2026-11-10T10:00:00Z',metrics:{engagement:100}},
 {id:'c',issue_id:'g',platform:'youtube',author:'C',text:'Di luar tanggal',published_at:'2026-11-09T16:59:59Z',metrics:{engagement:200}},
 {id:'d',issue_id:'other',platform:'youtube',author:'A',text:'Kelompok kedua',published_at:'2026-11-10T12:00:00Z',metrics:{}},
 {id:'e',platform:'youtube',text:'Belum dikelompokkan',published_at:'2026-11-10T12:00:00Z',metrics:{}},
];
test('groups are built only from posts inside the project platforms and WIB period',()=>{
 const scope={platforms:['youtube'],from:'2026-11-10',to:'2026-11-10'};
 const built=buildConversationGroups(scopePosts,scope);
 assert.deepEqual(built.totals,{posts:3,groups:0,groupedPosts:0,singlePosts:2,ungrouped:1});
 const g=built.groups.find(g=>g.id==='g');
 assert.deepEqual(g.posts.map(p=>p.id),['a']);assert.equal(g.accountCount,1);assert.equal(g.interactions,0);assert.equal(g.title,'Dalam periode');
 assert.equal(built.groups.find(g=>g.id==='other').interactions,null);
 assert.equal(buildConversationGroups(scopePosts,{platforms:[]}).groups.length,0);
 assert.equal(buildConversationGroups(scopePosts,{}).groups.find(g=>g.id==='g').size,3);
});

const sentiment=label=>label?{sentiment:{label}}:{};
const post=(id,issue,platform,author,day,label,metrics={},text)=>({id,issue_id:issue,platform,author,text:text??`Teks ${issue}`,published_at:`2026-11-${day}T03:00:00Z`,metrics:{...metrics,...sentiment(label)}});
// big: 5 posts on X and Instagram, an original and three reposts. mid: 3 news items without metrics.
// duo: 2 TikTok posts with the most interactions and the latest activity. solo and alone: one post each.
const posts=[
 post('b1','big','x','Tokoh','08','negative',{likes:900,comments:80,shares:20}),
 post('b2','big','x','Pengikut Satu','09','negative',{likes:0,comments:0,shares:0,repost:true,original_shares:5000}),
 post('b3','big','x','Pengikut Dua','09','negative',{likes:0,comments:0,shares:0,repost:true,original_shares:5000}),
 post('b4','big','x','Pengikut Satu','10','neutral',{likes:0,comments:0,shares:0,repost:true,original_shares:4990}),
 post('b5','big','instagram','Akun Gambar','12',null,{likes:100}),
 post('m1','mid','news','Media Satu','05','neutral'),
 post('m2','mid','news','Media Dua','05','neutral'),
 post('m3','mid','news','Média Tiga','06','positive'),
 post('d1','duo','tiktok','Kreator','13','positive',{likes:40000,comments:2000,shares:1000}),
 post('d2','duo','tiktok','Kreator Lain','14','positive',{likes:7000,comments:10}),
 post('s1','solo','x','Sendiri','11','negative',{likes:5}),
 post('s2','alone','instagram','Sendiri Juga','11',null,{likes:9}),
 {id:'u1',platform:'x',author:'Baru',text:'Belum dikelompokkan',published_at:'2026-11-14T03:00:00Z',metrics:{}},
];
const ids=result=>result.groups.map(group=>group.id);
const facet=(list,key,value)=>list.find(row=>row[key]===value).count;

test('single posts are not groups: counted in the totals, left out of the list by default',()=>{
 const result=conversationGroups(posts);
 assert.deepEqual(ids(result),['big','mid','duo']);
 assert.equal(result.total,3);
 assert.deepEqual(result.totals,{posts:13,groups:3,groupedPosts:10,singlePosts:2,ungrouped:1});
 assert.deepEqual(result.leaders.map(group=>group.id),['big','mid','duo']);
 assert.deepEqual(ids(conversationGroups(posts,{},{minPosts:1})),['big','mid','duo','alone','solo']);
 assert.equal(conversationGroups(posts,{},{minPosts:1}).total,3,'the total stays the number of real groups');
});

test('the totals line separates real groups from posts that stand alone',()=>{
 assert.equal(groupTotalsText(conversationGroups(posts).totals),'3 kelompok dari 13 posting; 2 posting berdiri sendiri; 1 posting belum dikelompokkan');
 assert.equal(groupTotalsText({posts:4220,groups:412,groupedPosts:862,singlePosts:3358,ungrouped:0}),'412 kelompok dari 4.220 posting; 3.358 posting berdiri sendiri');
 assert.equal(groupTotalsText({posts:152,groups:0,groupedPosts:0,singlePosts:152,ungrouped:0}),'Belum ada kelompok dari 152 posting; 152 posting berdiri sendiri');
 assert.equal(groupTotalsText({posts:0,groups:0,groupedPosts:0,singlePosts:0,ungrouped:0}),'Belum ada posting pada pilihan ini');
 assert.doesNotMatch(groupTotalsText({posts:4220,groups:412,singlePosts:3358,ungrouped:9}),/—/);
});

test('interactions add up what each post gathered; the share count a repost carries is read once and kept apart',()=>{
 const big=conversationGroups(posts).groups[0];
 assert.equal(big.interactions,900+80+20+100,'original_shares never enters interactions');
 assert.equal(big.interactionCoverage,5);
 assert.equal(big.shares,5000,'the largest carried figure, once, not 14.990 and not 20');
 const mid=conversationGroups(posts).groups[1];
 assert.equal(mid.interactions,null);assert.equal(mid.shares,null);assert.equal(mid.interactionCoverage,0);
 const duo=conversationGroups(posts).groups[2];
 assert.equal(duo.interactions,50010);assert.equal(duo.shares,1000);
});

test('a group knows its accounts, platforms, days and sentiment mix',()=>{
 const big=conversationGroups(posts).groups[0];
 assert.equal(big.size,5);assert.equal(big.accountCount,4);
 assert.deepEqual(big.accounts.map(row=>[row.author,row.posts]),[['Pengikut Satu',2],['Tokoh',1],['Pengikut Dua',1],['Akun Gambar',1]]);
 assert.deepEqual(big.platforms,[{platform:'x',count:4},{platform:'instagram',count:1}]);
 assert.equal(big.firstDay,'2026-11-08');assert.equal(big.lastDay,'2026-11-12');
 assert.deepEqual(big.sentiment,{positive:0,neutral:1,negative:3,unknown:1,analysed:4,lead:'negative'});
 assert.equal(big.title,'Teks big');
 const same=buildConversationGroups([post('1','x','x','A','01'),post('2','x','instagram','A','01')]).groups[0];
 assert.equal(same.accountCount,2,'the same name on two platforms is two accounts');
 assert.equal(same.sentiment.lead,'unknown');
 const tie=buildConversationGroups([post('1','t','x','A','01','positive'),post('2','t','x','B','01','negative')]).groups[0];
 assert.equal(tie.sentiment.lead,'negative','a tie is named by the reading that needs a look first');
 const late=buildConversationGroups([{...post('1','z','x','A','09'),published_at:'2026-11-09T18:30:00Z'},{...post('2','z','x','B','09'),published_at:'2026-11-09T00:00:00Z'}]).groups[0];
 assert.equal(late.firstDay,'2026-11-09','a date without a clock stays on its own day');
 assert.equal(late.lastDay,'2026-11-10','18.30 UTC is already the next day in WIB');
});

test('a group counts accounts by account_v1 and names each by its most recently published post',()=>{
 // One X handle written two ways, a renamed YouTube channel, a Threads account with an id on one row only.
 const group=buildConversationGroups([
  post('1','k','x','Okezonenews','10'),post('2','k','x','@okezonenews','11'),
  post('3','k','youtube','Kanal Lama','09',null,{author_id:'UC1'}),post('4','k','youtube','Kanal Baru','12',null,{author_id:'UC1'}),
  post('5','k','threads','@Warga.Solo','12',null,{author_id:'1789'}),post('6','k','threads','warga.solo','08'),
 ]).groups[0];
 assert.equal(group.accountCount,3);
 assert.deepEqual(group.accounts.map(row=>[row.key,row.author,row.platform,row.posts]),[
  ['threads:warga.solo','@Warga.Solo','threads',2],['youtube:UC1','Kanal Baru','youtube',2],['x:okezonenews','@okezonenews','x',2]]);
});

test('platform filter keeps groups that appear on a chosen platform, with all of their posts',()=>{
 assert.deepEqual(ids(conversationGroups(posts,{},{platforms:['instagram']})),['big']);
 assert.equal(conversationGroups(posts,{},{platforms:['instagram']}).groups[0].size,5);
 assert.deepEqual(ids(conversationGroups(posts,{},{platforms:['news','tiktok']})),['mid','duo']);
 assert.deepEqual(ids(conversationGroups(posts,{},{platforms:['facebook']})),[]);
 assert.deepEqual(ids(conversationGroups(posts,{},{platforms:null})),['big','mid','duo']);
});

test('sentiment filter reads the largest analysed share of each group',()=>{
 assert.deepEqual(ids(conversationGroups(posts,{},{sentiments:['negative']})),['big']);
 assert.deepEqual(ids(conversationGroups(posts,{},{sentiments:['neutral']})),['mid']);
 assert.deepEqual(ids(conversationGroups(posts,{},{sentiments:['positive','neutral']})),['mid','duo']);
 assert.deepEqual(ids(conversationGroups(posts,{},{sentiments:['unknown']})),[]);
 assert.deepEqual(ids(conversationGroups(posts,{},{sentiments:['unknown'],minPosts:1})),['alone']);
});

test('minimum size keeps groups of at least that many posts',()=>{
 assert.deepEqual(ids(conversationGroups(posts,{},{minPosts:2})),['big','mid','duo']);
 assert.deepEqual(ids(conversationGroups(posts,{},{minPosts:5})),['big']);
 assert.deepEqual(ids(conversationGroups(posts,{},{minPosts:10})),[]);
 assert.deepEqual(ids(conversationGroups(posts,{},{minPosts:'abc'})),['big','mid','duo'],'an unreadable size falls back to two');
});

test('search matches every word typed, in the group text or an account name',()=>{
 assert.deepEqual(ids(conversationGroups(posts,{},{query:'teks mid'})),['mid']);
 assert.deepEqual(ids(conversationGroups(posts,{},{query:'  KREATOR '})),['duo']);
 assert.deepEqual(ids(conversationGroups(posts,{},{query:'@tokoh'})),['big']);
 assert.deepEqual(ids(conversationGroups(posts,{},{query:'media tiga'})),['mid'],'accents are ignored');
 assert.deepEqual(ids(conversationGroups(posts,{},{query:'kreator tokoh'})),[]);
 assert.deepEqual(ids(conversationGroups(posts,{},{query:'sendiri'})),[],'a single post is still not a group');
 const varied=[post('1','v','x','A','01',null,{},'Kalimat pembuka'),post('2','v','x','B','02',null,{},'Kalimat pembuka dengan tambahan unik')];
 assert.deepEqual(ids(conversationGroups(varied,{},{query:'tambahan unik'})),['v'],'the text of every post in the group is searched, not only the title');
});

test('filters combine',()=>{
 assert.deepEqual(ids(conversationGroups(posts,{},{platforms:['x','tiktok'],sentiments:['positive'],query:'kreator'})),['duo']);
 assert.deepEqual(ids(conversationGroups(posts,{},{platforms:['x','tiktok'],sentiments:['positive'],minPosts:5})),[]);
});

test('each sort puts the largest figure first',()=>{
 assert.deepEqual(ids(conversationGroups(posts,{},{sort:'posts'})),['big','mid','duo']);
 assert.deepEqual(ids(conversationGroups(posts,{},{sort:'accounts'})),['big','mid','duo']);
 assert.deepEqual(ids(conversationGroups(posts,{},{sort:'interactions'})),['duo','big','mid'],'a group without any figure comes last');
 assert.deepEqual(ids(conversationGroups(posts,{},{sort:'recent'})),['duo','big','mid']);
 assert.deepEqual(ids(conversationGroups(posts,{},{sort:'nonsense'})),['big','mid','duo']);
 const accounts=[post('1','few','x','A','01'),post('2','few','x','A','01'),post('3','few','x','A','01'),post('4','many','x','B','01'),post('5','many','x','C','01')];
 assert.deepEqual(ids(conversationGroups(accounts,{},{sort:'posts'})),['few','many']);
 assert.deepEqual(ids(conversationGroups(accounts,{},{sort:'accounts'})),['many','few']);
 const undated=[{...post('1','old','x','A','01'),published_at:null},{...post('2','old','x','B','01'),published_at:null},post('3','new','x','A','02'),post('4','new','x','B','02')];
 assert.deepEqual(ids(conversationGroups(undated,{},{sort:'recent'})),['new','old'],'a group without dates comes last');
 assert.deepEqual(sortGroups(conversationGroups([...posts].reverse()).groups,'posts').map(group=>group.id),['big','mid','duo'],'the order does not depend on the order of the input');
});

test('chip counts say what each choice would show with the other filters kept',()=>{
 const open=conversationGroups(posts).facets;
 assert.deepEqual(open.platforms,[{platform:'x',count:1},{platform:'instagram',count:1},{platform:'tiktok',count:1},{platform:'news',count:1}]);
 assert.deepEqual(open.sentiments,[{sentiment:'positive',count:1},{sentiment:'neutral',count:1},{sentiment:'negative',count:1},{sentiment:'unknown',count:0}]);
 assert.deepEqual(open.sizes,[{size:2,count:3},{size:5,count:1},{size:10,count:0}]);
 const narrowed=conversationGroups(posts,{},{platforms:['x'],sentiments:['positive']}).facets;
 assert.equal(facet(narrowed.platforms,'platform','x'),0,'no positive group on X');
 assert.equal(facet(narrowed.platforms,'platform','tiktok'),1,'the platform count ignores the platform choice itself');
 assert.equal(facet(narrowed.sentiments,'sentiment','negative'),1,'the sentiment count ignores the sentiment choice itself');
 assert.equal(facet(narrowed.sizes,'size',2),0);
 const searched=conversationGroups(posts,{},{query:'kreator'}).facets;
 assert.equal(facet(searched.platforms,'platform','news'),0,'a platform without a match stays in the list at zero');
 assert.equal(searched.platforms.length,4);
});

test('one click on a chip narrows from all; removing the last choice, or choosing everything, returns to all',()=>{
 const all=['x','instagram','news'];
 assert.deepEqual(toggleGroupFilter(null,'x',all),['x']);
 assert.deepEqual(toggleGroupFilter(['x'],'news',all),['x','news']);
 assert.equal(toggleGroupFilter(['x'],'x',all),null);
 assert.equal(toggleGroupFilter(['x','news'],'instagram',all),null);
 assert.equal(toggleGroupFilter(null,'facebook',all),null,'a value the data does not have is dropped');
});

test('the sort order alone is not a filter',()=>{
 assert.equal(isGroupFiltered(defaultGroupFilters),false);
 assert.equal(isGroupFiltered({sort:'recent'}),false);
 assert.equal(isGroupFiltered({query:'  '}),false);
 assert.equal(isGroupFiltered({query:'a'}),true);
 assert.equal(isGroupFiltered({platforms:['x']}),true);
 assert.equal(isGroupFiltered({sentiments:['negative']}),true);
 assert.equal(isGroupFiltered({minPosts:5}),true);
});

test('the list shows twenty groups at a time and says how many are left',()=>{
 const rows=Array.from({length:47},(_,index)=>index);
 assert.equal(groupPageSize,20);
 assert.deepEqual([pageOfGroups(rows,1).visible.length,pageOfGroups(rows,1).remaining,pageOfGroups(rows,1).next],[20,27,20]);
 assert.deepEqual([pageOfGroups(rows,2).visible.length,pageOfGroups(rows,2).remaining,pageOfGroups(rows,2).next],[40,7,7]);
 assert.deepEqual([pageOfGroups(rows,3).visible.length,pageOfGroups(rows,3).remaining,pageOfGroups(rows,3).next],[47,0,0]);
 assert.equal(pageOfGroups([],1).visible.length,0);
});

test('the leaders are the largest real groups of the scope, whatever the list is filtered to',()=>{
 const built=buildConversationGroups(posts);
 assert.deepEqual(leadingGroups(built.groups,2).map(group=>group.id),['big','mid']);
 assert.deepEqual(conversationGroups(posts,{},{platforms:['tiktok'],query:'kreator'}).leaders.map(group=>group.id),['big','mid','duo']);
 assert.deepEqual(leadingGroups(filterConversationGroups(built.groups,{minPosts:1}).groups).map(group=>group.id),['big','mid','duo'],'never a single post');
});

test('the sentiment mix is a share of every post of the group in whole numbers that add up to 100, belum dianalisis included',()=>{
 // tone_share_v2: the base is every post; "belum dianalisis" is the fourth part when the group has any (was 34/33/33 of the 3 analysed).
 assert.deepEqual(sentimentShares({positive:1,neutral:1,negative:1,unknown:4}),{total:7,analysed:3,unknown:4,parts:[{key:'positive',count:1,percent:15,text:'15%'},{key:'neutral',count:1,percent:14,text:'14%'},{key:'negative',count:1,percent:14,text:'14%'},{key:'unknown',count:4,percent:57,text:'57%'}]});
 assert.deepEqual(sentimentShares({positive:0,neutral:1,negative:3,unknown:1}).parts,[{key:'neutral',count:1,percent:20,text:'20%'},{key:'negative',count:3,percent:60,text:'60%'},{key:'unknown',count:1,percent:20,text:'20%'}]);
 assert.deepEqual(sentimentShares({positive:0,neutral:0,negative:0,unknown:2}),{total:2,analysed:0,unknown:2,parts:[{key:'unknown',count:2,percent:100,text:'100%'}]});
 for(const mix of [{positive:1,neutral:2,negative:4},{positive:7,neutral:11,negative:13},{positive:1,neutral:0,negative:5},{positive:3,neutral:5,negative:1,unknown:8}])assert.equal(sentimentShares(mix).parts.reduce((sum,part)=>sum+part.percent,0),100);
});

test('the sentiment mix of a group is tone_share_v2: a tone with one post of 305 prints <1%, never 0%',()=>{
 assert.deepEqual(sentimentShares({positive:1,neutral:299,negative:0,unknown:5}).parts,[{key:'positive',count:1,percent:0,text:'<1%'},{key:'neutral',count:299,percent:98,text:'98%'},{key:'unknown',count:5,percent:2,text:'2%'}]);
 assert.deepEqual(sentimentShares({positive:'2',neutral:2,negative:3}).parts.map(part=>part.percent),[29,28,43],'counts read as the module reads them');
});

test('a range of days is written once, without repeating the month or the year',()=>{
 assert.equal(groupDayRange('2026-11-12','2026-11-12'),'12 Nov 2026');
 assert.equal(groupDayRange('2026-11-08','2026-11-12'),'8–12 Nov 2026');
 assert.equal(groupDayRange('2026-10-28','2026-11-03'),'28 Okt – 3 Nov 2026');
 assert.equal(groupDayRange('2025-12-30','2026-01-02'),'30 Des 2025 – 2 Jan 2026');
 assert.equal(groupDayRange(null,null),'');
});

test('a group\'s first and last day follow the installation zone (day_v1)', async () => {
  const { setZone } = await import('./pulseMeasures.js');
  setZone({ offset_minutes: 540, name: 'WIT' });
  try {
    const rows = [
      { id: 'a', issue_id: 'z', platform: 'x', author: 'a', text: 'Zona', published_at: '2026-11-10T15:30:00Z', metrics: {} },
      { id: 'b', issue_id: 'z', platform: 'x', author: 'b', text: 'Zona', published_at: '2026-11-12T08:00:00+0900', metrics: {} },
    ];
    const group = buildConversationGroups(rows, {}).groups.find(g => g.id === 'z');
    assert.deepEqual([group.firstDay, group.lastDay], ['2026-11-11', '2026-11-12']);
  } finally { setZone({ offset_minutes: 420, name: 'WIB' }); }
});

test('a group counts a post without a name for its channel by id, and gives a nameless account no name',()=>{
 const group=buildConversationGroups([
  post('1','q','youtube',null,'12',null,{author_id:'UC1'}),post('2','q','youtube','Kanal','10',null,{author_id:'UC1'}),
  post('3','q','youtube','','11',null,{author_id:'UC9'}),post('4','q','x','','11'),
 ]).groups[0];
 assert.equal(group.accountCount,2);
 assert.deepEqual(group.accounts.map(row=>[row.key,row.author,row.posts]),[['youtube:UC1','Kanal',2],['youtube:UC9',null,1]]);
});

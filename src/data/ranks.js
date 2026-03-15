// SINAR Ranks & Badges — seed data
const RANKS=[
  {name:'Prajurit',xp:0,icon:'person',subtitle:'Langkah Pertama'},
  {name:'Kopral',xp:1000,icon:'military_tech',subtitle:'Keandalan & Disiplin'},
  {name:'Sersan',xp:5000,icon:'shield',subtitle:'Kepemimpinan Lapangan'},
  {name:'Letnan',xp:15000,icon:'stars',subtitle:'Komando & Strategi'},
  {name:'Kapten',xp:50000,icon:'workspace_premium',subtitle:'Pemimpin Tertinggi'},
];

const BADGES=[
  {name:'Misi Pertama',desc:'Selesaikan misi pertama untuk TNI AD',icon:'rocket_launch',color:C.teal,bg:C.tealLight,unlocked:true,rarity:'common',cat:'Misi'},
  {name:'10 Misi',desc:'Selesaikan 10 misi DISPENAD',icon:'military_tech',color:C.orange,bg:C.orangeLight,unlocked:true,rarity:'rare',cat:'Misi'},
  {name:'50 Misi',desc:'Selesaikan 50 misi DISPENAD',icon:'emoji_events',color:C.primary,bg:C.primaryLight,unlocked:false,rarity:'legendary',cat:'Misi'},
  {name:'Misi Kilat',desc:'Selesaikan misi dalam 1 jam',icon:'bolt',color:C.pink,bg:C.pinkLight,unlocked:true,rarity:'rare',cat:'Misi'},
  {name:'Siaga Bencana',desc:'Ikut 5 misi baksos TNI AD',icon:'local_fire_department',color:C.red,bg:C.redLight,unlocked:true,rarity:'epic',cat:'Misi'},
  {name:'Streak 7',desc:'7 hari berturut-turut aktif',icon:'whatshot',color:C.orange,bg:C.orangeLight,unlocked:true,rarity:'common',cat:'Streak'},
  {name:'Streak 30',desc:'30 hari tanpa putus dukung TNI AD',icon:'local_fire_department',color:C.red,bg:C.redLight,unlocked:true,rarity:'epic',cat:'Streak'},
  {name:'Streak 100',desc:'100 hari kontribusi tak terputus!',icon:'volcano',color:C.pink,bg:C.pinkLight,unlocked:false,rarity:'legendary',cat:'Streak'},
  {name:'Naik Pangkat',desc:'Naik pangkat pertama kali',icon:'trending_up',color:C.purple,bg:C.purpleLight,unlocked:true,rarity:'common',cat:'Pangkat'},
  {name:'Amplifier',desc:'Viralkan 10 konten TNI AD',icon:'campaign',color:C.orange,bg:C.orangeLight,unlocked:true,rarity:'rare',cat:'Sosial'},
  {name:'Bergabung',desc:'Resmi bergabung dengan SINAR DISPENAD',icon:'waving_hand',color:C.green,bg:C.greenLight,unlocked:true,rarity:'common',cat:'Pangkat'},
  {name:'Viral King',desc:'Konten TNI AD viral 100K+ views',icon:'share',color:C.pink,bg:C.pinkLight,unlocked:false,rarity:'legendary',cat:'Sosial'},
  {name:'IG Star',desc:'10 post konten TNI AD di Instagram',icon:'photo_camera',color:'#E1306C',bg:'rgba(225,48,108,0.12)',unlocked:true,rarity:'rare',cat:'Sosial'},
  {name:'TikToker',desc:'10 video TNI AD viral di TikTok',icon:'music_note',color:'#1A1A1A',bg:'rgba(232,232,232,0.12)',unlocked:false,rarity:'rare',cat:'Sosial'},
  {name:'X Thread',desc:'Buat 5 thread tentang TNI AD di X',icon:'edit_note',color:C.primary,bg:C.primaryLight,unlocked:false,rarity:'rare',cat:'Sosial'},
  {name:'Field Agent',desc:'Hadir di 3 event TNI AD',icon:'location_on',color:C.pink,bg:C.pinkLight,unlocked:true,rarity:'epic',cat:'Misi'},
  {name:'Benteng NKRI',desc:'Jadi garda terdepan citra TNI AD',icon:'security',color:C.primary,bg:C.primaryLight,unlocked:false,rarity:'legendary',cat:'Pangkat'},
  {name:'Mentor',desc:'Bantu 5 anggota baru bergabung',icon:'psychology',color:C.green,bg:C.greenLight,unlocked:false,rarity:'epic',cat:'Pangkat'},
  {name:'Elite',desc:'Masuk top 5 leaderboard DISPENAD',icon:'diamond',color:C.orange,bg:C.orangeLight,unlocked:false,rarity:'legendary',cat:'Pangkat'},
  {name:'Night Owl',desc:'Submit konten pukul 00-05',icon:'dark_mode',color:C.purple,bg:C.purpleLight,unlocked:false,rarity:'rare',cat:'Misi'},
  {name:'Speed Run',desc:'3 misi dalam sehari',icon:'speed',color:C.red,bg:C.redLight,unlocked:false,rarity:'epic',cat:'Misi'},
  {name:'Konsisten',desc:'Aktif 3 bulan dukung TNI AD',icon:'calendar_month',color:C.teal,bg:C.tealLight,unlocked:false,rarity:'epic',cat:'Streak'},
  {name:'Top 10',desc:'Masuk 10 besar ranking DISPENAD',icon:'leaderboard',color:C.orange,bg:C.orangeLight,unlocked:false,rarity:'rare',cat:'Pangkat'},
  {name:'Patriot',desc:'Kontributor paling berdedikasi TNI AD',icon:'flag',color:C.primary,bg:C.primaryLight,unlocked:false,rarity:'legendary',cat:'Pangkat'},
];

export { RANKS, BADGES };

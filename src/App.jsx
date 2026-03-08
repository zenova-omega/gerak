import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Globe from 'react-globe.gl';

/* ─── ICON ───────────────────────────────────────────────────────── */
function MI({ name, size=24, fill=false, style={} }) {
  return <span className="material-symbols-rounded" style={{ fontSize:size, fontVariationSettings: fill?"'FILL' 1,'wght' 600":"'FILL' 0,'wght' 400", lineHeight:1, ...style }}>{name}</span>;
}

/* ─── TOOLTIP ────────────────────────────────────────────────────── */
function Tip({children,text}){
  const [show,setShow]=useState(false);
  return(<span style={{position:'relative',display:'inline-flex',alignItems:'center'}} onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)} onClick={()=>setShow(s=>!s)}>
    {children}
    {show&&<span style={{position:'absolute',bottom:'calc(100% + 6px)',left:'50%',transform:'translateX(-50%)',background:'#1A1A2E',color:'#E2E8F0',fontSize:10,fontWeight:500,padding:'6px 10px',borderRadius:6,whiteSpace:'nowrap',maxWidth:200,textAlign:'center',lineHeight:1.3,boxShadow:'0 4px 12px rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.1)',zIndex:50,pointerEvents:'none',animation:'fadeInUp 150ms ease'}}>{text}</span>}
  </span>);
}

/* ─── GERAK LOGO SVG ─────────────────────────────────────────────── */
function GerakMark({size=28}){return(
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <defs>
      <linearGradient id="gmark" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#C9A84C"/>
        <stop offset="100%" stopColor="#E8D48B"/>
      </linearGradient>
    </defs>
    <polygon points="10,6 30,20 10,34 16,20" fill="url(#gmark)"/>
    <polygon points="20,12 34,20 20,28 23,20" fill="url(#gmark)" opacity="0.4"/>
  </svg>
)}

/* ─── SOCIAL SVG ICONS ───────────────────────────────────────────── */
function IgIcon({size=18,color='#191919'}){return<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" stroke={color} strokeWidth="2"/><circle cx="12" cy="12" r="5" stroke={color} strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1.5" fill={color}/></svg>}
function TiktokIcon({size=18,color='#191919'}){return<svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0011.14 4.13V13a8.16 8.16 0 005.3 1.93V11.5a4.85 4.85 0 01-3.77-1.93V6.69h3.77z"/></svg>}
function XIcon({size=18,color='#191919'}){return<svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>}

const SocialIcon = ({platform,size=18,color='#191919'}) => {
  if(platform==='instagram') return <IgIcon size={size} color={color}/>;
  if(platform==='tiktok') return <TiktokIcon size={size} color={color}/>;
  return <XIcon size={size} color={color}/>;
};

/* ─── DESIGN TOKENS ──────────────────────────────────────────────── */
const C={
  bg:'#0B1120', bgCard:'#0F1A2E', white:'#FFFFFF', black:'#060B18',
  primary:'#C9A84C', primaryLight:'rgba(201,168,76,0.12)', primaryDark:'#A88A30',
  secondary:'#2DD4BF',
  text:'#F1F5F9', textSec:'#94A3B8', textMuted:'#64748B',
  border:'#1E3A5F', borderLight:'rgba(255,255,255,0.05)',
  green:'#22C55E', greenLight:'rgba(34,197,94,0.12)',
  red:'#E05C5C', redLight:'rgba(225,29,72,0.12)',
  orange:'#F59E0B', orangeLight:'rgba(245,158,11,0.12)',
  purple:'#8B5CF6', purpleLight:'rgba(139,92,246,0.12)',
  pink:'#EC4899', pinkLight:'rgba(236,72,153,0.12)',
  teal:'#0D9488', tealLight:'rgba(13,148,136,0.12)',
  gold:'#C9A84C', goldLight:'rgba(201,168,76,0.15)',
  glass:'rgba(255,255,255,0.04)', glassBorder:'#1E3A5F',
  surface:'#0F1A2E', surfaceLight:'#1e293b',
};

const typeColor=t=>({EDUKASI:C.teal,AMPLIFIKASI:C.orange,KRISIS:C.red,KOMUNITAS:C.green,VISIT:C.pink,SOCIAL:C.primary}[t]||C.primary);
const typeBg=t=>({EDUKASI:C.tealLight,AMPLIFIKASI:C.orangeLight,KRISIS:C.redLight,KOMUNITAS:C.greenLight,VISIT:C.pinkLight,SOCIAL:C.primaryLight}[t]||C.primaryLight);
const typeIcon=t=>({EDUKASI:'school',AMPLIFIKASI:'campaign',KRISIS:'warning',KOMUNITAS:'groups',VISIT:'location_on',SOCIAL:'share'}[t]||'star');
const pName=p=>({whatsapp:'WhatsApp',telegram:'Telegram',instagram:'Instagram',tiktok:'TikTok',x:'X',facebook:'Facebook'}[p]||p);
const pColor=p=>({whatsapp:'#25D366',telegram:'#0088cc',instagram:'#E1306C',tiktok:'#E8E8E8',x:'#1DA1F2',facebook:'#1877F2'}[p]||C.text);
const pIcon=p=>({whatsapp:'chat',telegram:'send',facebook:'thumb_up'}[p]);

/* ─── DATA ───────────────────────────────────────────────────────── */
const SOCIALS=[
  {key:'ig',platform:'instagram',label:'Instagram',handle:'@arif.santoso',followers:'2.4K',color:'#E1306C'},
  {key:'tt',platform:'tiktok',label:'TikTok',handle:'@arifsantoso_',followers:'5.1K',color:'#E8E8E8'},
  {key:'x',platform:'x',label:'X (Twitter)',handle:'@arif_sto',followers:'1.8K',color:'#191919'},
];

const MISSIONS=[
  {id:1,type:'EDUKASI',title:'Distribusi Materi Literasi Digital ke 5 Grup',
    desc:'Sebarkan materi edukasi tentang keamanan digital kepada minimal 5 grup komunitas WhatsApp atau Telegram.',
    xp:250,bonus:50,participants:128,status:'TERBUKA',deadline:'12 Mar 2026',hashtags:'#GERAK #LiterasiDigital #AmanDigital',
    analytics:{reach:'45.2K',engagement:'12.8%',completion:72,avgTime:'2.4 jam',topCity:'Jakarta',sentiment:78,conversionRate:'8.2%'},
    targetPlatforms:['whatsapp','telegram'],
    contentSpec:{format:'Teks + Gambar',type:'Forward pesan',minGroups:5,note:'Kirim ke grup dengan min 20 anggota'},
    templates:['Halo semua, mari tingkatkan kewaspadaan terhadap penipuan online. Berikut panduan dari GERAK!','Hati-hati penipuan lewat WA. Baca panduan literasi digital GERAK ini. Share ke keluarga ya!'],
    exampleMedia:[{type:'image',label:'Infografis Literasi Digital',desc:'Gunakan infografis ini sebagai lampiran pesan'}],
  },
  {id:2,type:'AMPLIFIKASI',title:'Amplifikasi Pesan Pembangunan Infrastruktur Desa',
    desc:'Like, comment, dan share postingan resmi tentang program pembangunan infrastruktur desa di semua platform kamu.',
    xp:200,participants:89,status:'TERBUKA',deadline:'15 Mar 2026',hashtags:'#GERAK #InfrastrukturDesa #BangunIndonesia',
    analytics:{reach:'120.5K',engagement:'15.3%',completion:58,avgTime:'1.8 jam',topCity:'Surabaya',sentiment:84,conversionRate:'11.4%'},
    targetPlatforms:['instagram','tiktok','x','facebook'],
    contentSpec:{format:'Like & Share',type:'Engagement post resmi',actions:['Like post','Tulis komentar positif','Share/repost ke akun kamu'],note:'Komentar min 10 kata, relevan & positif'},
    templates:['Program pembangunan infrastruktur desa tahap 2 telah dimulai. Kita dukung bersama!'],
    refPosts:[
      {platform:'instagram',author:'@kaborinfrastruktur',handle:'Kementerian PUPR',avatar:'KP',content:'Progres pembangunan Tol Trans-Sulawesi Tahap 3 sudah mencapai 78%! Konektivitas antar provinsi semakin kuat 🚧🇮🇩 #InfrastrukturIndonesia',image:true,likes:'12.4K',comments:'890',shares:'3.2K',time:'2 jam lalu',actions:['like','comment','share']},
      {platform:'x',author:'@pusloginfokom',handle:'Puskominfo RI',avatar:'PI',content:'Thread: 5 Fakta Pembangunan Infrastruktur 2026 yang Jarang Diketahui Publik 🧵👇\n\n1/ Anggaran infrastruktur naik 23% YoY...',likes:'2.1K',comments:'456',shares:'1.8K',time:'5 jam lalu',actions:['like','repost','reply']},
    ]},
  {id:3,type:'KRISIS',title:'Counter-Narasi Hoaks Vaksinasi',
    desc:'Lawan disinformasi tentang vaksinasi nasional dengan membagikan fakta terverifikasi ke platform sosial media.',
    xp:400,bonus:100,participants:245,status:'PRIORITAS',deadline:'9 Mar 2026',hashtags:'#GERAK #FaktaVaksin #LawanHoaks #SehatIndonesia',
    analytics:{reach:'890K',engagement:'22.1%',completion:91,avgTime:'3.1 jam',topCity:'Jakarta',sentiment:45,conversionRate:'18.7%'},
    targetPlatforms:['whatsapp','x','facebook','tiktok'],
    contentSpec:{format:'Teks + Infografis',type:'Post original & share',minPosts:3,note:'Posting di min 3 platform berbeda. Sertakan sumber resmi.'},
    templates:['FAKTA: Vaksin telah melalui uji klinis ketat dan disetujui BPOM. Data selengkapnya 👇','Data Kemenkes: vaksinasi menurunkan risiko rawat inap hingga 80%. Jangan percaya hoaks!'],
    exampleMedia:[{type:'image',label:'Infografis Data Vaksinasi',desc:'Sertakan infografis ini di setiap postingan'},{type:'video',label:'Video Penjelasan Dokter (45 dtk)',desc:'Bisa di-repost atau jadikan referensi'}],
    refPosts:[
      {platform:'x',author:'@KemenkesRI',handle:'Kemenkes RI',avatar:'KR',content:'FAKTA: Vaksin booster telah melalui uji klinis ketat dan mendapat persetujuan BPOM. Sudah 52 juta dosis diberikan dengan profil keamanan baik. #FaktaVaksin',likes:'8.9K',comments:'1.2K',shares:'5.6K',time:'1 jam lalu',actions:['like','repost','reply']},
    ]},
  {id:4,type:'KOMUNITAS',title:'Rekrutmen Relawan Bencana Wilayah Timur',
    desc:'Bantu koordinasi rekrutmen relawan untuk respons bencana di wilayah timur Indonesia.',
    xp:300,participants:67,status:'SIAGA',deadline:'20 Mar 2026',hashtags:'#GERAK #RelawanBencana #IndonesiaTimur #PeduliBencana',
    analytics:{reach:'28.3K',engagement:'9.4%',completion:34,avgTime:'4.2 jam',topCity:'Makassar',sentiment:62,conversionRate:'5.8%'},
    targetPlatforms:['whatsapp','telegram'],
    contentSpec:{format:'Teks + Poster',type:'Forward pesan',minGroups:3,note:'Sertakan poster dan link pendaftaran resmi'},
    templates:['Dibutuhkan relawan bencana wilayah timur. Daftar via link resmi berikut. Mari bantu saudara kita!']},
  {id:5,type:'VISIT',title:'Kunjungi Posko Bantuan Bencana Cianjur',
    desc:'Datang ke lokasi posko bantuan, ambil foto/video situasi terkini, dan upload sebagai laporan lapangan.',
    xp:500,bonus:100,participants:34,status:'TERBUKA',deadline:'18 Mar 2026',hashtags:'#GERAK #BantuanBencana #CianjurBangkit',
    analytics:{reach:'15.6K',engagement:'18.2%',completion:42,avgTime:'5.5 jam',topCity:'Cianjur',sentiment:88,conversionRate:'14.1%'},
    contentSpec:{format:'Foto + Video',type:'Dokumentasi lapangan',minPhotos:3,videoDuration:'30-60 detik',note:'Foto: min 3 (posko, tim relawan, kondisi). Video: rekam suasana posko 30-60 detik.'},
    templates:[],visitLocation:'Posko Bantuan, Jl. Raya Cianjur No.12',visitCheckin:true,lat:-6.8204,lng:107.1414,locationNote:'Dekat Alun-alun Cianjur, parkir tersedia'},
  {id:6,type:'VISIT',title:'Hadiri Town Hall Meeting Kecamatan Menteng',
    desc:'Hadir di town hall meeting bersama warga. Dokumentasikan dan bagikan momen penting diskusi.',
    xp:350,participants:52,status:'TERBUKA',deadline:'22 Mar 2026',hashtags:'#GERAK #TownHall #PartisipasiWarga #Menteng',
    analytics:{reach:'8.9K',engagement:'11.5%',completion:28,avgTime:'3.8 jam',topCity:'Jakarta',sentiment:75,conversionRate:'6.3%'},
    contentSpec:{format:'Foto + Video',type:'Dokumentasi acara',minPhotos:5,videoDuration:'60-120 detik',note:'Foto: suasana, pembicara, peserta. Video: ringkasan pembahasan penting.'},
    templates:[],visitLocation:'Balai Kecamatan Menteng, Jakarta Pusat',visitCheckin:true,lat:-6.1944,lng:106.8529,locationNote:'Jl. Cut Mutia No.18, Menteng'},
  {id:7,type:'SOCIAL',title:'Post Reels IG: Tips Keamanan Digital',
    desc:'Buat dan posting Instagram Reels tentang tips keamanan digital yang engaging dan informatif.',
    xp:300,bonus:75,participants:89,status:'TERBUKA',deadline:'20 Mar 2026',hashtags:'#GERAK #GerakDigital #CyberSafety #AmanOnline',
    analytics:{reach:'234K',engagement:'19.8%',completion:65,avgTime:'2.1 jam',topCity:'Bandung',sentiment:91,conversionRate:'15.6%'},
    socialPlatform:'instagram',socialAction:'Post Reels',
    contentSpec:{format:'Video Reels',type:'Original content',videoDuration:'30-60 detik',aspectRatio:'9:16 (portrait)',note:'Gunakan musik trending. Tambahkan text overlay untuk poin utama.'},
    socialRequirements:['Min 30 detik durasi','Hashtag #GerakDigital','Tag @gerak.official','Akun harus publik saat posting'],
    templates:['🔒 3 Tips Keamanan Digital yang WAJIB kamu tau! #GerakDigital #CyberSafety'],
    exampleMedia:[{type:'video',label:'Contoh Reels (referensi gaya)',desc:'Reels 45 dtk dengan text overlay, transisi cepat'},{type:'image',label:'Template Thumbnail',desc:'Gunakan sebagai cover Reels'}],
  },
  {id:8,type:'SOCIAL',title:'Duet TikTok: Challenge #GerakUntukNegeri',
    desc:'Duet atau stitch video official GERAK di TikTok. Tambahkan pesan positif dan kreatif kamu.',
    xp:250,participants:167,status:'TERBUKA',deadline:'25 Mar 2026',hashtags:'#GERAK #GerakUntukNegeri #TikTokChallenge',
    analytics:{reach:'1.2M',engagement:'24.5%',completion:78,avgTime:'1.5 jam',topCity:'Jakarta',sentiment:93,conversionRate:'21.2%'},
    socialPlatform:'tiktok',socialAction:'Duet / Stitch',
    contentSpec:{format:'Video TikTok',type:'Duet / Stitch',videoDuration:'15-60 detik',aspectRatio:'9:16 (portrait)',note:'Duet video official lalu tambahkan reaksi/pesan. Boleh tambah musik & effect.'},
    socialRequirements:['Duet atau stitch video official','Tambahkan pesan positif','Gunakan #GerakUntukNegeri','Min 15 detik konten original'],
    templates:['Aku ikut #GerakUntukNegeri karena perubahan dimulai dari kita! 🇮🇩'],
    exampleMedia:[{type:'video',label:'Video Official GERAK (duet ini)',desc:'Video yang harus di-duet/stitch, 30 detik'}],
  },
  {id:9,type:'SOCIAL',title:'Thread X: Fakta Pembangunan Infrastruktur',
    desc:'Buat thread informatif min 5 tweet tentang progres pembangunan infrastruktur dengan data valid.',
    xp:200,participants:45,status:'TERBUKA',deadline:'28 Mar 2026',hashtags:'#GERAK #InfrastrukturIndonesia #FaktaPembangunan',
    analytics:{reach:'56.7K',engagement:'8.9%',completion:38,avgTime:'3.5 jam',topCity:'Yogyakarta',sentiment:82,conversionRate:'7.1%'},
    socialPlatform:'x',socialAction:'Thread',
    contentSpec:{format:'Thread (teks + gambar)',type:'Original thread',minTweets:5,note:'Setiap tweet max 280 karakter. Sertakan 1 gambar/infografis per 2 tweet.'},
    socialRequirements:['Min 5 tweet dalam thread','Sertakan data/sumber resmi','Gunakan #InfrastrukturIndonesia','Min 1 gambar/infografis'],
    templates:['🧵 THREAD: Pembangunan infrastruktur Indonesia makin merata. Fakta-faktanya 👇'],
    exampleMedia:[{type:'image',label:'Infografis Data Pembangunan',desc:'Gunakan sebagai visual pendukung thread'}],
  },
  {id:10,type:'AMPLIFIKASI',title:'Kampanye #HijaukanIndonesia',desc:'Kampanye digital kesadaran lingkungan hidup.',xp:180,participants:156,status:'SELESAI',deadline:'5 Mar 2026',hashtags:'#GERAK #HijaukanIndonesia #LingkunganHidup',targetPlatforms:['instagram','tiktok'],templates:[],contentSpec:{format:'Post gambar',type:'Share campaign'},
    analytics:{reach:'340K',engagement:'16.7%',completion:100,avgTime:'1.9 jam',topCity:'Bali',sentiment:95,conversionRate:'13.8%'}},
  {id:11,type:'VISIT',title:'Inspeksi Gotong Royong Lingkungan RT',
    desc:'Ikuti gotong royong di lingkungan RT. Dokumentasikan before-after kondisi lingkungan.',
    xp:200,participants:28,status:'SIAGA',deadline:'15 Mar 2026',hashtags:'#GERAK #GotongRoyong #LingkunganBersih',
    analytics:{reach:'5.2K',engagement:'7.3%',completion:18,avgTime:'4.0 jam',topCity:'Semarang',sentiment:71,conversionRate:'4.5%'},
    contentSpec:{format:'Foto before-after',type:'Dokumentasi',minPhotos:4,note:'Foto before (2) dan after (2) dari sudut yang sama.'},
    templates:[],visitLocation:'Lokasi RT setempat',visitCheckin:true,lat:-6.2088,lng:106.8456,locationNote:'Koordinasi ketua RT'},
];

const RANKS=[
  {name:'Rekrut Digital',xp:0,icon:'person'},{name:'Perwira Muda',xp:1000,icon:'military_tech'},
  {name:'Perwira Madya',xp:5000,icon:'shield'},{name:'Perwira Utama',xp:15000,icon:'stars'},
  {name:'Komandan Garuda',xp:50000,icon:'workspace_premium'},
];

const BADGES=[
  {name:'Misi Pertama',icon:'rocket_launch',color:C.teal,bg:C.tealLight,unlocked:true},
  {name:'10 Misi',icon:'military_tech',color:C.orange,bg:C.orangeLight,unlocked:true},
  {name:'50 Misi',icon:'emoji_events',color:C.primary,bg:C.primaryLight,unlocked:false},
  {name:'Misi Kilat',icon:'bolt',color:C.pink,bg:C.pinkLight,unlocked:true},
  {name:'Krisis Hero',icon:'local_fire_department',color:C.red,bg:C.redLight,unlocked:true},
  {name:'Streak 7',icon:'whatshot',color:C.orange,bg:C.orangeLight,unlocked:true},
  {name:'Streak 30',icon:'local_fire_department',color:C.red,bg:C.redLight,unlocked:true},
  {name:'Streak 100',icon:'volcano',color:C.pink,bg:C.pinkLight,unlocked:false},
  {name:'Naik Pangkat',icon:'trending_up',color:C.purple,bg:C.purpleLight,unlocked:true},
  {name:'Amplifier',icon:'campaign',color:C.orange,bg:C.orangeLight,unlocked:true},
  {name:'First Join',icon:'waving_hand',color:C.green,bg:C.greenLight,unlocked:true},
  {name:'Viral King',icon:'share',color:C.pink,bg:C.pinkLight,unlocked:false},
  {name:'IG Star',icon:'photo_camera',color:'#E1306C',bg:'rgba(225,48,108,0.12)',unlocked:true},
  {name:'TikToker',icon:'music_note',color:'#E8E8E8',bg:'rgba(232,232,232,0.12)',unlocked:false},
  {name:'X Thread',icon:'edit_note',color:C.primary,bg:C.primaryLight,unlocked:false},
  {name:'Field Agent',icon:'location_on',color:C.pink,bg:C.pinkLight,unlocked:true},
  {name:'Guardian',icon:'security',color:C.primary,bg:C.primaryLight,unlocked:false},
  {name:'Mentor',icon:'psychology',color:C.green,bg:C.greenLight,unlocked:false},
  {name:'Elite',icon:'diamond',color:C.orange,bg:C.orangeLight,unlocked:false},
  {name:'Night Owl',icon:'dark_mode',color:C.purple,bg:C.purpleLight,unlocked:false},
  {name:'Speed Run',icon:'speed',color:C.red,bg:C.redLight,unlocked:false},
  {name:'Konsisten',icon:'calendar_month',color:C.teal,bg:C.tealLight,unlocked:false},
  {name:'Top 10',icon:'leaderboard',color:C.orange,bg:C.orangeLight,unlocked:false},
  {name:'Patriot',icon:'flag',color:C.primary,bg:C.primaryLight,unlocked:false},
];

const ACTIVITY=[
  {mission:'Literasi Digital',type:'EDUKASI',date:'8 Mar',xp:250,status:'SELESAI'},
  {mission:'Infrastruktur Desa',type:'AMPLIFIKASI',date:'7 Mar',xp:200,status:'PROSES'},
  {mission:'Counter Hoaks',type:'KRISIS',date:'6 Mar',xp:400,status:'PROSES'},
  {mission:'IG Reels #GerakDigital',type:'SOCIAL',date:'5 Mar',xp:300,status:'SELESAI'},
  {mission:'Posko Cianjur',type:'VISIT',date:'4 Mar',xp:500,status:'SELESAI'},
];

const LEADERBOARD=[
  {name:'Cpt. Rina Dewi',xp:6200,rank:1,avatar:'RD'},
  {name:'Lt. Budi Hartono',xp:5800,rank:2,avatar:'BH'},
  {name:'Sgt. Fajar Nugroho',xp:5400,rank:3,avatar:'FN'},
  {name:'Arif Santoso',xp:4820,rank:4,avatar:'AS',isYou:true},
  {name:'Pvt. Sari Utami',xp:4600,rank:5,avatar:'SU'},
];

/* ─── ADMIN / AI DATA ────────────────────────────────────────────── */
const NARRATIVES=[
  {id:1,topic:'Vaksinasi Booster 2026',sentiment:'negative',volume:'24.5K',trend:'+340%',urgency:'TINGGI',
    sentimentBreakdown:{angry:42,sad:18,neutral:28,happy:12},positivePercent:12,
    sources:[{platform:'x',count:'12.3K',sample:'Vaksin booster berbahaya, mengandung chip 5G!'},{platform:'tiktok',count:'8.1K',sample:'Video viral "dokter" tolak vaksin'},{platform:'facebook',count:'4.1K',sample:'Share massal hoaks efek samping'}],
    aiVerdict:'TOLAK',aiConfidence:94,aiReason:'Klaim anti-sains yang dibantah WHO & BPOM. Koordinasi lintas platform — kampanye disinformasi terorganisir.',
    aiSuggestion:'Deploy counter-narasi dengan data Kemenkes. Prioritas TikTok. Aktifkan misi KRISIS.',
    keywords:['#TolakVaksin','#BoosterBerbahaya','anti-vaksin'],
    aiCounterNarrative:['Data BPOM: Vaksin booster aman, 50jt+ dosis tanpa efek serius.','WHO: Booster kurangi risiko rawat inap 85%.']},
  {id:2,topic:'Pembangunan Jalan Tol Trans-Sulawesi',sentiment:'positive',volume:'8.2K',trend:'+45%',urgency:'RENDAH',
    sentimentBreakdown:{angry:5,sad:8,neutral:32,happy:55},positivePercent:55,
    sources:[{platform:'x',count:'4.2K',sample:'Progress tol Trans-Sulawesi tahap 3 lancar'},{platform:'instagram',count:'2.5K',sample:'Warga komplain ganti rugi lahan'}],
    aiVerdict:'DUKUNG',aiConfidence:78,aiReason:'Narasi dominan positif tentang progress pembangunan.',
    aiSuggestion:'Amplifikasi progress dengan data Kementerian PUPR. Buat infografis milestone.',
    keywords:['#TransSulawesi','#Infrastruktur'],aiCounterNarrative:[]},
  {id:3,topic:'Program Makan Bergizi Gratis',sentiment:'positive',volume:'52.1K',trend:'+120%',urgency:'RENDAH',
    sentimentBreakdown:{angry:3,sad:4,neutral:21,happy:72},positivePercent:72,
    sources:[{platform:'tiktok',count:'28.5K',sample:'Video sekolah terima makan gratis!'},{platform:'instagram',count:'15.2K',sample:'Foto gizi anak daerah terpencil'}],
    aiVerdict:'DUKUNG',aiConfidence:92,aiReason:'Narasi organik positif. Dampak nyata terlihat dari konten user-generated.',
    aiSuggestion:'Amplifikasi konten organik terbaik. Kompilasi video dampak.',
    keywords:['#MakanBergiziGratis','#GiziAnak'],aiCounterNarrative:[]},
  {id:4,topic:'Penipuan Online Modus Undangan Digital',sentiment:'negative',volume:'15.8K',trend:'+210%',urgency:'TINGGI',
    sentimentBreakdown:{angry:52,sad:25,neutral:18,happy:5},positivePercent:5,
    sources:[{platform:'whatsapp',count:'tinggi',sample:'APK undangan digital beredar masif'},{platform:'x',count:'5.2K',sample:'Korban kehilangan tabungan'}],
    aiVerdict:'TOLAK',aiConfidence:98,aiReason:'Ancaman keamanan siber aktif. APK malware menyamar undangan pernikahan.',
    aiSuggestion:'URGENT: Deploy misi KRISIS edukasi keamanan digital. Koordinasi Kominfo.',
    keywords:['#WaspadaPenipuan','APK malware','phishing'],
    aiCounterNarrative:['AWAS! Jangan instal APK dari chat. Undangan asli TIDAK perlu download file.']},
  {id:5,topic:'Pemilu 2029 — Kampanye Dini',sentiment:'mixed',volume:'31.4K',trend:'+88%',urgency:'SEDANG',
    sentimentBreakdown:{angry:15,sad:10,neutral:40,happy:35},positivePercent:35,
    sources:[{platform:'x',count:'15.1K',sample:'Diskusi capres mulai ramai'},{platform:'tiktok',count:'10.2K',sample:'Konten edukasi pemilu viral'}],
    aiVerdict:'MONITOR',aiConfidence:65,aiReason:'Belum masa kampanye resmi. Campuran edukasi positif & kampanye terselubung.',
    aiSuggestion:'Fokus edukasi pemilu netral. Monitor akun kampanye dini.',
    keywords:['#Pemilu2029','capres','kampanye'],aiCounterNarrative:[]},
];

const ADMIN_STATS={totalAgents:1247,activeToday:834,missionsActive:8,missionsCompleted:156,totalReach:'2.4M',avgEngagement:'12.3%',narrativesMonitored:23,alertsToday:5};

const PLATFORM_STATS=[
  {platform:'instagram',posts:'3.2K',reach:'890K',engagement:'14.2%',color:'#E1306C',trend:'+12%'},
  {platform:'tiktok',posts:'2.8K',reach:'1.2M',engagement:'18.5%',color:'#E8E8E8',trend:'+28%'},
  {platform:'x',posts:'5.1K',reach:'340K',engagement:'6.8%',color:'#1DA1F2',trend:'+5%'},
  {platform:'facebook',posts:'1.4K',reach:'210K',engagement:'4.2%',color:'#1877F2',trend:'-3%'},
];

/* ─── PROGRESS BAR ───────────────────────────────────────────────── */
function ProgressBar({progress=0,color=C.primary,height=6,bg='rgba(255,255,255,0.08)',gold=false}){
  return <div style={{height,borderRadius:height,background:bg,overflow:'hidden',width:'100%'}}>
    <div className={gold?'xp-bar-gold':'xp-bar-fill'} style={{height:'100%',borderRadius:height,background:color,width:`${progress*100}%`,transition:'width 1s ease-out'}}/>
  </div>;
}

/* ─── SENTIMENT CHART ────────────────────────────────────────────── */
const SENTIMENT_EMOTIONS=[
  {key:'angry',emoji:'😠',label:'Marah',color:'#EF4444'},
  {key:'sad',emoji:'😢',label:'Sedih',color:'#F59E0B'},
  {key:'neutral',emoji:'😐',label:'Netral',color:'#94A3B8'},
  {key:'happy',emoji:'😊',label:'Positif',color:'#22C55E'},
];

function SentimentChart({breakdown,compact=false}){
  if(!breakdown) return null;
  const total=Object.values(breakdown).reduce((a,b)=>a+b,0);
  return(
    <div>
      {/* Stacked bar */}
      <div style={{display:'flex',height:compact?8:12,borderRadius:6,overflow:'hidden',marginBottom:compact?4:8}}>
        {SENTIMENT_EMOTIONS.map(e=>(
          <div key={e.key} style={{width:`${(breakdown[e.key]/total)*100}%`,background:e.color,transition:'width 0.5s ease'}}/>
        ))}
      </div>
      {/* Legend */}
      <div style={{display:'flex',gap:compact?8:14,flexWrap:'wrap'}}>
        {SENTIMENT_EMOTIONS.map(e=>(
          <div key={e.key} style={{display:'flex',alignItems:'center',gap:3}}>
            <span style={{fontSize:compact?12:14}}>{e.emoji}</span>
            <span style={{fontSize:compact?9:10,fontWeight:600,color:C.textSec}}>{breakdown[e.key]}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PositiveMeter({percent,size='sm'}){
  const s=size==='sm';
  const color=percent>=60?C.green:percent>=30?C.orange:C.red;
  return(
    <div style={{display:'flex',alignItems:'center',gap:s?6:8}}>
      <div style={{width:s?32:44,height:s?32:44,borderRadius:'50%',background:`${color}15`,display:'flex',alignItems:'center',justifyContent:'center',border:`2px solid ${color}`,position:'relative'}}>
        <span style={{fontSize:s?10:13,fontWeight:800,color,fontFamily:"'JetBrains Mono'"}}>{percent}%</span>
      </div>
      <span style={{fontSize:s?10:11,color:C.textMuted,fontWeight:500}}>Positif</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function App(){
  const [mode,setMode]=useState('member'); // 'member' | 'admin'
  const [screen,setScreen]=useState('beranda');
  const [sel,setSel]=useState(null);
  const [filter,setFilter]=useState('Semua');
  const [consent,setConsent]=useState(false);
  const [started,setStarted]=useState(false);
  const [toast,setToast]=useState(null);
  const [notif,setNotif]=useState(true);
  const [privacy,setPrivacy]=useState(false);
  const [verified,setVerified]=useState({});
  const [uploaded,setUploaded]=useState(false);
  const [adminTab,setAdminTab]=useState('overview');
  const [expandedNarrative,setExpandedNarrative]=useState(null);
  const [adSideTab,setAdSideTab]=useState('dashboard');
  const [adSubTab,setAdSubTab]=useState('ringkasan');
  const [missionForm,setMissionForm]=useState({type:'EDUKASI',title:'',desc:'',xp:200,format:'',duration:'',platforms:[],targetGender:'all',targetAge:'all',targetTier:'all'});
  const [narrativeActions,setNarrativeActions]=useState({}); // {id: 'DUKUNG'|'TOLAK'|'MONITOR'}
  const [narrativeMissionFlow,setNarrativeMissionFlow]=useState(null); // {narrativeId, step, prompt, platform, impactLevel, ...}
  const [selectedAdMission,setSelectedAdMission]=useState(null); // mission id for admin detail view
  const [confirmRedeem,setConfirmRedeem]=useState(null); // item id for shop confirm
  const [logoutConfirm,setLogoutConfirm]=useState(false);
  // joinedMissions: {missionId: {status:'TERDAFTAR'|'SUBMITTED'|'REVIEW'|'SELESAI', joinedAt, submittedAt?}}
  const [joinedMissions,setJoinedMissions]=useState({
    1:{status:'SELESAI',joinedAt:'2 Mar 2026',submittedAt:'4 Mar 2026'},
    3:{status:'REVIEW',joinedAt:'3 Mar 2026',submittedAt:'5 Mar 2026'},
    5:{status:'TERDAFTAR',joinedAt:'7 Mar 2026'},
    7:{status:'TERDAFTAR',joinedAt:'8 Mar 2026'},
    8:{status:'SUBMITTED',joinedAt:'6 Mar 2026',submittedAt:'7 Mar 2026'},
  });
  const [k,setK]=useState(0);

  const nav=useCallback(s=>{setScreen(s);setK(n=>n+1)},[]);
  const showToast=useCallback(m=>{setToast(m);setTimeout(()=>setToast(null),2000)},[]);
  const copyText=useCallback(async t=>{try{await navigator.clipboard.writeText(t)}catch{}showToast('Tersalin!')},[showToast]);
  const openM=useCallback(m=>{setSel(m);setConsent(false);setStarted(false);setUploaded(false);nav('detail')},[nav]);
  const joinMission=useCallback((mId)=>{setJoinedMissions(p=>({...p,[mId]:{status:'TERDAFTAR',joinedAt:'8 Mar 2026'}}));showToast('Berhasil mendaftar misi!')},[showToast]);
  const startM=useCallback(()=>{if(!consent)return;setStarted(true);setTimeout(()=>{nav('misi');setSel(null)},1200)},[consent,nav]);
  const filtered=filter==='Semua'?MISSIONS:filter==='Selesai'?MISSIONS.filter(m=>m.status==='SELESAI'):MISSIONS.filter(m=>m.type===filter.toUpperCase());

  /* ─── SHARED COMPONENTS ─────────────────────────────────────────── */
  function Card({children,style={},className='',onClick}){
    return <div onClick={onClick} className={`${className} ${onClick?'card-interactive':''}`} style={{
      background:C.surface,borderRadius:12,padding:16,border:`1px solid ${C.border}`,
      cursor:onClick?'pointer':'default',boxShadow:'0 4px 20px rgba(0,0,0,0.2)',
      ...style
    }}>{children}</div>;
  }

  function Badge({badge,size=52}){
    const col=badge.color||C.primary;
    const unlocked=badge.unlocked;
    return <div className={`flex flex-col items-center gap-2 badge-item ${unlocked?'badge-unlocked':''}`} style={{minWidth:64}} onClick={unlocked?()=>showToast(`🏅 ${badge.name}`)  :undefined}>
      <div style={{position:'relative',width:size,height:size}}>
        {/* Outer glow ring */}
        {unlocked&&<div style={{position:'absolute',inset:-3,borderRadius:'50%',background:`radial-gradient(circle,${col}25,transparent 70%)`,filter:'blur(4px)'}}/>}
        {/* Gradient border ring */}
        <div style={{
          width:size,height:size,borderRadius:'50%',padding:2.5,
          background:unlocked?`linear-gradient(145deg,${col},${col}80)`:`linear-gradient(145deg,${C.border},${C.surfaceLight})`,
          boxShadow:unlocked?`0 4px 16px ${col}30, 0 0 20px ${col}15, inset 0 1px 0 rgba(255,255,255,0.15)`:`0 2px 8px rgba(0,0,0,0.2)`,
          position:'relative',
        }}>
          {/* Inner circle */}
          <div style={{
            width:'100%',height:'100%',borderRadius:'50%',
            background:unlocked?`linear-gradient(145deg,${C.surface},${C.bg})`:`linear-gradient(145deg,${C.surfaceLight},${C.bg})`,
            display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden',
          }}>
            {/* Subtle inner highlight */}
            {unlocked&&<div style={{position:'absolute',top:-size*0.15,left:size*0.1,width:size*0.5,height:size*0.3,borderRadius:'50%',background:`rgba(255,255,255,0.06)`,filter:'blur(4px)'}}/>}
            <MI name={unlocked?badge.icon:'lock'} size={size*0.38} fill={unlocked} style={{color:unlocked?col:C.textMuted,position:'relative',zIndex:1,filter:unlocked?`drop-shadow(0 0 6px ${col}40)`:'none'}}/>
          </div>
        </div>
        {/* Locked overlay */}
        {!unlocked&&<div style={{position:'absolute',inset:0,borderRadius:'50%',background:'rgba(11,17,32,0.4)'}}/>}
      </div>
      <span style={{fontSize:10,color:unlocked?C.text:C.textMuted,textAlign:'center',fontWeight:unlocked?600:400,maxWidth:64,lineHeight:1.2}}>
        {unlocked?badge.name:'???'}
      </span>
    </div>;
  }

  function Chip({label,active,onClick,color}){
    return <button onClick={onClick} style={{
      padding:'6px 16px',borderRadius:9999,border:active?'none':`1px solid ${C.border}`,flexShrink:0,
      background:active?(color||C.primary):C.surface,
      color:active?C.bg:C.textSec,fontSize:13,fontWeight:active?700:500,cursor:'pointer',
      transition:'all 150ms ease',letterSpacing:active?'0.02em':'0',
    }}>{label}</button>;
  }

  /* ─── BERANDA ──────────────────────────────────────────────────── */
  function Beranda(){return(
    <div key={k} className="flex flex-col pb-4">
      {/* GERAK Branding Bar */}
      <div className="stagger-1 flex items-center justify-between pt-2" style={{marginBottom:12}}>
        <div className="flex items-center gap-2.5">
          <GerakMark size={28}/>
          <div>
            <h2 style={{fontSize:15,fontWeight:900,color:C.text,letterSpacing:2,lineHeight:1}}>GERAK</h2>
            <p style={{fontSize:7,fontWeight:600,color:C.textMuted,letterSpacing:1.2,textTransform:'uppercase',lineHeight:1,marginTop:1}}>Gerakan Komunikasi</p>
          </div>
        </div>
        <div style={{position:'relative'}} className="tap-bounce" onClick={()=>showToast('Tidak ada notifikasi baru')}>
          <div style={{width:36,height:36,borderRadius:'50%',background:C.surface,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',border:`1px solid ${C.border}`}}>
            <MI name="notifications" size={18} style={{color:C.textSec}}/>
          </div>
          <div style={{position:'absolute',top:5,right:5,width:8,height:8,borderRadius:'50%',background:C.red,border:`2px solid ${C.surface}`}} className="urgency-pulse"/>
        </div>
      </div>

      {/* User Greeting */}
      <div className="stagger-2" style={{marginBottom:16}}>
        <p style={{fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:2,textTransform:'uppercase'}}>Selamat Pagi,</p>
        <h1 style={{fontSize:22,fontWeight:700,color:C.text,lineHeight:1.1,marginTop:3,fontFamily:"'Inter',sans-serif"}}>MAYOR ARIF SANTOSO</h1>
        <div className="flex items-center gap-1.5 mt-2" style={{background:C.primaryLight,borderRadius:9999,padding:'3px 12px',border:`1px solid ${C.primary}40`,width:'fit-content'}}>
          <MI name="diamond" size={12} style={{color:C.primary}}/>
          <span style={{fontSize:11,fontWeight:700,color:C.primary,letterSpacing:1,textTransform:'uppercase'}}>Perwira Muda</span>
        </div>
      </div>

      {/* XP Status Card */}
      <Card className="stagger-3" style={{padding:20,marginBottom:12}}>
        <div className="flex items-center justify-between" style={{marginBottom:12}}>
          <span className="flex items-center gap-1" style={{fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:2,textTransform:'uppercase'}}>Kemajuan Pangkat <Tip text="XP didapat dari menyelesaikan misi. Kumpulkan XP untuk naik pangkat!"><MI name="info" size={12} style={{color:C.textMuted,cursor:'pointer'}}/></Tip></span>
          <span style={{fontSize:12,fontWeight:700,fontFamily:"'JetBrains Mono'",color:C.primary}}>4.820 / 5.000 XP</span>
        </div>
        <div style={{height:6,borderRadius:9999,background:C.surfaceLight,overflow:'hidden',marginBottom:10}}>
          <div className="xp-bar-gold" style={{height:'100%',borderRadius:9999,width:'96%'}}/>
        </div>
        <div className="flex items-center justify-between" style={{fontSize:12}}>
          <div className="flex items-center gap-1">
            <MI name="diamond" size={14} style={{color:C.primary}}/>
            <span style={{fontWeight:700,color:C.primary}}>Perwira Muda</span>
          </div>
          <div className="flex items-center gap-1">
            <MI name="star" size={14} style={{color:C.textMuted}}/>
            <span style={{fontWeight:500,color:C.textMuted}}>Perwira Madya</span>
          </div>
        </div>
      </Card>

      {/* Stats Row */}
      <div className="stagger-4 grid grid-cols-3 gap-3" style={{marginBottom:20}}>
        {[{icon:'target',label:'Misi',value:'24',color:C.primary,tip:'Total misi yang telah kamu selesaikan'},{icon:'local_fire_department',label:'Streak',value:'7d',color:C.orange,tip:'Hari berturut-turut kamu aktif. Jaga streak untuk bonus XP!'},{icon:'leaderboard',label:'Rank',value:'#12',color:C.teal,tip:'Peringkatmu di antara semua anggota GERAK'}].map((s,i)=>(
          <Card key={i} style={{textAlign:'center',padding:12}}>
            <div style={{width:36,height:36,borderRadius:10,background:`${s.color}15`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 6px'}}>
              <MI name={s.icon} size={18} fill style={{color:s.color}}/>
            </div>
            <p className={`num-pop num-pop-d${i+1}`} style={{fontSize:18,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'"}}>{s.value}</p>
            <p className="flex items-center justify-center gap-1" style={{fontSize:10,color:C.textMuted,fontWeight:600,textTransform:'uppercase',letterSpacing:0.5}}>{s.label} <Tip text={s.tip}><MI name="info" size={9} style={{color:C.textMuted,opacity:0.5}}/></Tip></p>
          </Card>
        ))}
      </div>

      {/* Badge Showcase */}
      <div className="stagger-5" style={{marginBottom:20}}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-1" style={{fontSize:16,fontWeight:700,color:C.text}}>Lencana Terbaru <Tip text="Lencana didapat dari pencapaian khusus. Kumpulkan semua!"><MI name="info" size={12} style={{color:C.textMuted,cursor:'pointer'}}/></Tip></h3>
          <button onClick={()=>nav('pangkat')} style={{color:C.primary,fontSize:12,fontWeight:600,background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:2}}>
            Semua <MI name="arrow_forward" size={14} style={{color:C.primary}}/>
          </button>
        </div>
        <Card style={{padding:16,background:`linear-gradient(135deg,${C.surface},${C.bg})`,border:`1px solid ${C.border}`,overflow:'hidden',position:'relative'}}>
          {/* Decorative glow */}
          <div style={{position:'absolute',top:-20,right:-20,width:80,height:80,borderRadius:'50%',background:`radial-gradient(circle,${C.primary}15,transparent)`,filter:'blur(20px)',pointerEvents:'none'}}/>
          <div className="flex items-center gap-4 overflow-x-auto hide-scrollbar pb-1">
            {BADGES.filter(b=>b.unlocked).slice(0,5).map((b,i)=>(
              <Badge key={i} badge={b} size={56}/>
            ))}
            {/* "More" indicator */}
            <div onClick={()=>nav('pangkat')} style={{minWidth:56,height:56,borderRadius:'50%',border:`2px dashed ${C.border}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
              <span style={{fontSize:16,fontWeight:800,color:C.textMuted,fontFamily:"'JetBrains Mono'"}}>+{BADGES.filter(b=>b.unlocked).length-5}</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3" style={{paddingTop:8,borderTop:`1px solid ${C.borderLight}`}}>
            <div className="flex items-center gap-2">
              <MI name="workspace_premium" size={16} fill style={{color:C.gold}}/>
              <span style={{fontSize:12,fontWeight:700,color:C.text}}>{BADGES.filter(b=>b.unlocked).length}/{BADGES.length} Lencana</span>
            </div>
            <span style={{fontSize:11,color:C.textMuted}}>Raih semua untuk jadi Elite!</span>
          </div>
        </Card>
      </div>

      {/* Daily Brief */}
      <Card className="stagger-6" style={{borderLeft:`3px solid ${C.primary}`,marginBottom:20}}>
        <div className="flex items-center justify-between" style={{marginBottom:8}}>
          <span className="flex items-center gap-1" style={{fontSize:10,fontWeight:700,color:C.primary,letterSpacing:1.5,textTransform:'uppercase'}}>Misi Hari Ini <Tip text="Misi prioritas dari admin. Selesaikan untuk bonus early bird!"><MI name="info" size={10} style={{color:C.primary,opacity:0.6,cursor:'pointer'}}/></Tip></span>
          <span style={{display:'inline-flex',alignItems:'center',gap:4,background:C.primaryLight,color:C.primary,borderRadius:6,padding:'2px 8px',fontSize:10,fontWeight:700}}>BRIEFING</span>
        </div>
        <h3 style={{fontSize:15,fontWeight:700,color:C.text,lineHeight:1.3,marginBottom:8}}>Distribusi Materi Literasi Digital ke 5 Grup</h3>
        <div className="flex items-center gap-2" style={{marginBottom:12}}>
          <span style={{background:C.goldLight,color:C.gold,borderRadius:6,padding:'3px 8px',fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono'"}}>+250 XP</span>
          <span style={{color:C.textMuted,fontSize:11,fontWeight:500}}>12 Mar</span>
        </div>
        <button onClick={()=>openM(MISSIONS[0])} className="btn-primary" style={{background:'linear-gradient(135deg,#C9A84C,#E8D48B)',border:'none',borderRadius:10,padding:'10px 20px',color:'#0B1120',fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
          Lihat Misi <span className="arrow-nudge" style={{display:'inline-flex'}}><MI name="arrow_forward" size={16} style={{color:'#0B1120'}}/></span>
        </button>
      </Card>

      {/* ── Misi Saya (Joined Missions Pipeline) ── */}
      {Object.keys(joinedMissions).length>0&&(
      <div className="stagger-6" style={{marginBottom:20}}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="flex items-center gap-1" style={{fontSize:16,fontWeight:700,color:C.text}}>Misi Saya <Tip text="Misi yang sudah kamu ikuti. Upload konten sebelum deadline!"><MI name="info" size={12} style={{color:C.textMuted,cursor:'pointer'}}/></Tip></h3>
          <span style={{fontSize:11,fontWeight:700,color:C.primary,background:C.primaryLight,borderRadius:6,padding:'2px 8px'}}>{Object.keys(joinedMissions).length} misi</span>
        </div>
        {/* Status Summary */}
        <div className="grid grid-cols-4 gap-2" style={{marginBottom:12}}>
          {[
            {l:'Terdaftar',v:Object.values(joinedMissions).filter(j=>j.status==='TERDAFTAR').length,c:C.orange,icon:'how_to_reg'},
            {l:'Submitted',v:Object.values(joinedMissions).filter(j=>j.status==='SUBMITTED').length,c:C.teal,icon:'upload_file'},
            {l:'Review',v:Object.values(joinedMissions).filter(j=>j.status==='REVIEW').length,c:C.purple,icon:'rate_review'},
            {l:'Selesai',v:Object.values(joinedMissions).filter(j=>j.status==='SELESAI').length,c:C.green,icon:'check_circle'},
          ].map((s,i)=>(
            <div key={i} style={{background:C.surface,borderRadius:8,padding:'8px 4px',textAlign:'center',border:`1px solid ${C.border}`}}>
              <MI name={s.icon} size={14} style={{color:s.c}}/>
              <p style={{fontSize:16,fontWeight:800,color:s.c,fontFamily:"'JetBrains Mono'"}}>{s.v}</p>
              <p style={{fontSize:8,color:C.textMuted,fontWeight:600}}>{s.l}</p>
            </div>
          ))}
        </div>
        {/* Mission Cards - prioritize those needing action */}
        <div className="flex flex-col gap-2">
          {Object.entries(joinedMissions)
            .map(([mid,j])=>({...j,mission:MISSIONS.find(m=>m.id===parseInt(mid))}))
            .filter(j=>j.mission)
            .sort((a,b)=>{const ord={TERDAFTAR:0,SUBMITTED:1,REVIEW:2,SELESAI:3};return ord[a.status]-ord[b.status]})
            .map(j=>{
              const m=j.mission;const tc=typeColor(m.type);
              const stMap={TERDAFTAR:{label:'Upload Konten',color:C.orange,bg:C.orangeLight,icon:'upload',action:true},SUBMITTED:{label:'Menunggu Review',color:C.teal,bg:C.tealLight,icon:'hourglass_top',action:false},REVIEW:{label:'Sedang Direview',color:C.purple,bg:C.purpleLight,icon:'rate_review',action:false},SELESAI:{label:'Selesai',color:C.green,bg:C.greenLight,icon:'check_circle',action:false}};
              const st=stMap[j.status];
              return(
              <Card key={m.id} onClick={()=>openM(m)} style={{padding:12}}>
                <div className="flex items-center gap-3">
                  <div style={{width:36,height:36,borderRadius:10,background:typeBg(m.type),display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <MI name={typeIcon(m.type)} size={16} fill style={{color:tc}}/>
                  </div>
                  <div className="flex-1" style={{minWidth:0}}>
                    <h4 style={{fontSize:12,fontWeight:700,color:C.text,lineHeight:1.3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.title}</h4>
                    <div className="flex items-center gap-2" style={{marginTop:3}}>
                      <span style={{fontSize:10,fontWeight:700,color:C.gold,fontFamily:"'JetBrains Mono'"}}>+{m.xp} XP</span>
                      <span style={{fontSize:9,color:C.textMuted}}>{m.deadline}</span>
                    </div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div className="flex items-center gap-1" style={{background:st.bg,borderRadius:6,padding:'4px 8px'}}>
                      <MI name={st.icon} size={12} fill={j.status==='SELESAI'} style={{color:st.color}}/>
                      <span style={{fontSize:9,fontWeight:700,color:st.color,whiteSpace:'nowrap'}}>{st.label}</span>
                    </div>
                    {j.status==='TERDAFTAR'&&(
                      <p style={{fontSize:8,color:C.orange,fontWeight:600,marginTop:3}}>Deadline: {m.deadline}</p>
                    )}
                  </div>
                </div>
                {/* Progress bar for pipeline */}
                <div className="flex items-center gap-1" style={{marginTop:8}}>
                  {['TERDAFTAR','SUBMITTED','REVIEW','SELESAI'].map((s,i)=>(
                    <div key={s} style={{flex:1,height:3,borderRadius:2,background:['TERDAFTAR','SUBMITTED','REVIEW','SELESAI'].indexOf(j.status)>=i?st.color:`${C.border}`}}/>
                  ))}
                </div>
              </Card>);
            })}
        </div>
      </div>)}

      {/* Active Missions (not joined) */}
      <div className="stagger-6" style={{marginBottom:20}}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="flex items-center gap-1" style={{fontSize:16,fontWeight:700,color:C.text}}>Misi Aktif <Tip text="Misi yang sedang berjalan. Tap untuk lihat detail dan mulai mengerjakan."><MI name="info" size={12} style={{color:C.textMuted,cursor:'pointer'}}/></Tip></h3>
          <button onClick={()=>nav('misi')} style={{color:C.primary,fontSize:13,fontWeight:600,background:'none',border:'none',cursor:'pointer'}}>Semua</button>
        </div>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 scroll-peek">
          {MISSIONS.filter(m=>m.status!=='SELESAI'&&!joinedMissions[m.id]).slice(0,4).map(m=>(
            <Card key={m.id} onClick={()=>openM(m)} style={{minWidth:220,flexShrink:0,padding:14}}>
              <div className="flex items-center gap-2 mb-2">
                <div style={{width:26,height:26,borderRadius:8,background:typeBg(m.type),display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <MI name={typeIcon(m.type)} size={14} fill style={{color:typeColor(m.type)}}/>
                </div>
                <span style={{fontSize:10,fontWeight:700,color:typeColor(m.type),textTransform:'uppercase',letterSpacing:0.5}}>{m.type}</span>
              </div>
              <h4 style={{fontSize:13,fontWeight:600,color:C.text,lineHeight:1.3,marginBottom:10}} className="line-clamp-2">{m.title}</h4>
              <div className="flex items-center justify-between">
                <span style={{fontSize:12,fontWeight:700,color:C.gold,fontFamily:"'JetBrains Mono'"}}>+{m.xp} XP</span>
                <span className="btn-primary" style={{background:'linear-gradient(135deg,#C9A84C,#E8D48B)',borderRadius:8,padding:'4px 10px',fontSize:10,fontWeight:700,color:'#0B1120'}}>IKUT</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="stagger-7">
        <h3 style={{fontSize:16,fontWeight:700,color:C.text,marginBottom:12}}>Peringkat</h3>
        <Card style={{padding:0,overflow:'hidden'}}>
          {LEADERBOARD.slice(0,3).map((p,i)=>(
            <div key={i} className="flex items-center gap-3" style={{padding:'12px 16px',borderBottom:i<2?`1px solid ${C.borderLight}`:'none'}}>
              {i===0?<span className="rank-crown" style={{fontSize:16,width:20,textAlign:'center'}}>👑</span>:
              <span style={{fontSize:14,fontWeight:800,color:i===1?'#C0C0C0':'#CD7F32',width:20,textAlign:'center',fontFamily:"'JetBrains Mono'"}}>{p.rank}</span>}
              <div style={{width:32,height:32,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',background:i===0?C.goldLight:i===1?'rgba(192,192,192,0.1)':C.primaryLight,fontSize:12,fontWeight:700,color:i===0?C.gold:i===1?'#C0C0C0':C.primary,border:`1px solid ${i===0?'rgba(251,191,36,0.2)':i===1?'rgba(192,192,192,0.15)':'rgba(201,168,76,0.15)'}`}}>{p.avatar}</div>
              <div className="flex-1"><p style={{fontSize:13,fontWeight:600,color:C.text}}>{p.name}</p></div>
              <span style={{fontSize:12,fontWeight:700,color:C.textSec,fontFamily:"'JetBrains Mono'"}}>{p.xp.toLocaleString()}</span>
            </div>
          ))}
          <div className="flex items-center gap-3 rank-you" style={{padding:'12px 16px',background:C.primaryLight,borderTop:`1px solid rgba(201,168,76,0.15)`,borderLeft:`3px solid ${C.primary}`}}>
            <span style={{fontSize:14,fontWeight:800,color:C.primary,width:20,textAlign:'center',fontFamily:"'JetBrains Mono'"}}>#4</span>
            <div style={{width:32,height:32,borderRadius:10,background:'linear-gradient(135deg,#C9A84C,#E8D48B)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'white',boxShadow:'0 0 12px rgba(201,168,76,0.3)'}}>AS</div>
            <div className="flex-1"><p style={{fontSize:13,fontWeight:700,color:C.primary}}>Kamu <MI name="star" size={12} fill style={{color:C.gold,verticalAlign:'middle',marginLeft:2}}/></p></div>
            <span style={{fontSize:12,fontWeight:800,color:C.primary,fontFamily:"'JetBrains Mono'"}}>#4 · 4,820</span>
          </div>
        </Card>
      </div>
    </div>
  );}

  /* ─── PAPAN MISI ────────────────────────────────────────────────── */
  function PapanMisi(){
    const filters=['Semua','Edukasi','Amplifikasi','Krisis','Komunitas','Visit','Social','Selesai'];
    return(<div key={k} className="flex flex-col gap-4 pb-4">
      <h1 className="stagger-1" style={{fontSize:22,fontWeight:800,color:C.text,paddingTop:4}}>Papan Misi</h1>
      <div className="stagger-2 flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        {filters.map(f=><Chip key={f} label={f} active={filter===f} onClick={()=>setFilter(f)}/>)}
      </div>
      {filtered.length===0&&(
        <Card className="stagger-3" style={{textAlign:'center',padding:'32px 16px'}}>
          <MI name="search_off" size={40} style={{color:C.textMuted,opacity:0.5}}/>
          <p style={{fontSize:14,fontWeight:700,color:C.textMuted,marginTop:8}}>Tidak ada misi</p>
          <p style={{fontSize:12,color:C.textMuted,marginTop:2}}>Coba filter lain untuk melihat misi</p>
          <button onClick={()=>setFilter('Semua')} style={{marginTop:12,padding:'8px 20px',borderRadius:8,border:`1px solid ${C.primary}`,background:'transparent',color:C.primary,fontSize:12,fontWeight:700,cursor:'pointer'}}>Reset Filter</button>
        </Card>
      )}
      {filtered.map((m,i)=>{const tc=typeColor(m.type);const done=m.status==='SELESAI';
        const daysLeft=m.deadline?Math.max(0,Math.round((new Date(m.deadline.replace(/(\d+) (\w+) (\d+)/,'$2 $1, $3'))-new Date())/(1000*60*60*24))):99;
        const urgent=daysLeft<=2&&!done;
        return(
        <Card key={m.id} className={`stagger-${Math.min(i+3,7)} ${urgent?'urgency-pulse':''}`} onClick={()=>openM(m)} style={{opacity:done?0.6:1,position:'relative',overflow:'hidden',borderColor:urgent?C.red:undefined}}>
          {/* Watermark Icon */}
          <div style={{position:'absolute',right:-8,bottom:-8,opacity:0.04,pointerEvents:'none',zIndex:0}}>
            <MI name={typeIcon(m.type)} size={80} fill style={{color:tc}}/>
          </div>
          <div className="flex items-center justify-between mb-2" style={{position:'relative',zIndex:1}}>
            <div className="flex items-center gap-2">
              <div style={{width:28,height:28,borderRadius:8,background:typeBg(m.type),display:'flex',alignItems:'center',justifyContent:'center'}}>
                <MI name={typeIcon(m.type)} size={14} fill style={{color:tc}}/>
              </div>
              <span style={{fontSize:11,fontWeight:700,color:tc,textTransform:'uppercase',letterSpacing:0.5}}>{m.type}</span>
            </div>
            <span style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:6,
              background:m.status==='PRIORITAS'?C.redLight:m.status==='SIAGA'?C.orangeLight:done?C.borderLight:typeBg(m.type),
              color:m.status==='PRIORITAS'?C.red:m.status==='SIAGA'?C.orange:done?C.textMuted:tc,
            }}>{m.status}</span>
          </div>
          <h3 style={{fontSize:15,fontWeight:700,color:done?C.textMuted:C.text,lineHeight:1.3,marginBottom:4,position:'relative',zIndex:1}} className="line-clamp-2">{m.title}</h3>
          <p style={{fontSize:12,color:C.textMuted,marginBottom:8,lineHeight:1.4,position:'relative',zIndex:1}} className="line-clamp-2">{m.desc}</p>
          <div className="flex items-center justify-between" style={{position:'relative',zIndex:1}}>
            <div className="flex items-center gap-3">
              <span style={{fontSize:12,fontWeight:700,color:done?C.textMuted:C.gold,fontFamily:"'JetBrains Mono'"}}>+{m.xp} XP</span>
              <span style={{fontSize:11,color:C.textMuted}}>
                <MI name="group" size={14} style={{color:C.textMuted,verticalAlign:'middle',marginRight:2}}/>{m.participants}
              </span>
              {!done&&<span style={{fontSize:10,color:urgent?C.red:daysLeft<=5?C.orange:C.textMuted,fontWeight:urgent?700:500}}>
                <MI name="schedule" size={12} style={{verticalAlign:'middle',marginRight:1,color:urgent?C.red:daysLeft<=5?C.orange:C.textMuted}}/>{daysLeft}h
              </span>}
            </div>
            {!done&&!joinedMissions[m.id]&&<span className="btn-primary" style={{background:'linear-gradient(135deg,#C9A84C,#E8D48B)',borderRadius:8,padding:'6px 14px',fontSize:11,fontWeight:700,color:'#0B1120'}}>IKUT</span>}
            {!done&&joinedMissions[m.id]&&(()=>{const jst=joinedMissions[m.id].status;return(
              <span style={{borderRadius:8,padding:'5px 12px',fontSize:10,fontWeight:700,
                background:jst==='TERDAFTAR'?C.orangeLight:jst==='SUBMITTED'?C.tealLight:jst==='REVIEW'?C.purpleLight:C.greenLight,
                color:jst==='TERDAFTAR'?C.orange:jst==='SUBMITTED'?C.teal:jst==='REVIEW'?C.purple:C.green,
                display:'flex',alignItems:'center',gap:3}}>
                <MI name={jst==='TERDAFTAR'?'cloud_upload':jst==='SUBMITTED'?'hourglass_top':'rate_review'} size={12}/>
                {jst==='TERDAFTAR'?'Upload':jst==='SUBMITTED'?'Submitted':'Review'}
              </span>);})()}
            {done&&<span style={{fontSize:11,fontWeight:600,color:C.green}}><MI name="check_circle" size={14} fill style={{verticalAlign:'middle',marginRight:2}}/> Selesai</span>}
          </div>
        </Card>
      );})}
    </div>);}

  /* ─── PANGKAT & LENCANA ─────────────────────────────────────────── */
  function PangkatLencana(){
    const unlocked=BADGES.filter(b=>b.unlocked).length;
    return(<div key={k} className="flex flex-col gap-4 pb-4">
      <h1 className="stagger-1" style={{fontSize:22,fontWeight:800,color:C.text,paddingTop:4}}>Pangkat & Lencana</h1>

      {/* Rank Card with SVG Progress Ring */}
      <Card className="stagger-2" style={{textAlign:'center',padding:24,position:'relative',overflow:'hidden'}}>
        <div className="orb orb-1" style={{width:150,height:150,background:'radial-gradient(circle,rgba(201,168,76,0.1),transparent 70%)',top:-40,right:-40}}/>
        <div style={{position:'relative',width:120,height:120,margin:'0 auto 16px',zIndex:1}}>
          <svg width="120" height="120" viewBox="0 0 120 120" style={{transform:'rotate(-90deg)'}}>
            <circle cx="60" cy="60" r="52" fill="none" stroke={C.border} strokeWidth="6"/>
            <circle cx="60" cy="60" r="52" fill="none" stroke="url(#goldRing)" strokeWidth="6"
              strokeDasharray={`${2*Math.PI*52*0.964} ${2*Math.PI*52*(1-0.964)}`}
              strokeDashoffset={2*Math.PI*52*(1-0.964)}
              strokeLinecap="round" className="progress-ring-stroke"/>
            <defs><linearGradient id="goldRing" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#C9A84C"/><stop offset="100%" stopColor="#E8D48B"/>
            </linearGradient></defs>
          </svg>
          <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
            <MI name="military_tech" size={32} fill style={{color:C.gold}}/>
            <span style={{fontSize:10,fontWeight:700,color:C.gold,fontFamily:"'JetBrains Mono'",marginTop:2}}>96%</span>
          </div>
        </div>
        <h2 style={{fontSize:22,fontWeight:800,color:C.text,position:'relative',zIndex:1,fontFamily:"'Inter'"}}>Perwira Muda</h2>
        <p style={{fontSize:13,color:C.gold,marginTop:4,fontFamily:"'JetBrains Mono'",fontWeight:600,position:'relative',zIndex:1}}>4,820 / 5,000 XP</p>
        <p style={{fontSize:11,color:C.textMuted,marginTop:4,position:'relative',zIndex:1}}>180 XP lagi menuju <span style={{color:C.primary,fontWeight:600}}>Perwira Madya</span></p>
      </Card>

      {/* Rank Ladder */}
      <Card className="stagger-3">
        <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:16}}>Jenjang Pangkat</h3>
        <div style={{position:'relative',paddingLeft:24}}>
          <div style={{position:'absolute',left:13,top:8,bottom:8,width:2,background:C.border}}/>
          {RANKS.map((r,i)=>{const cur=i===1,done=i<1;return(
            <div key={i} className="flex items-center gap-3" style={{marginBottom:i<RANKS.length-1?16:0,position:'relative'}}>
              <div className={cur?'dot-live':''} style={{position:'absolute',left:-17,width:cur?14:10,height:cur?14:10,borderRadius:'50%',zIndex:2,
                background:cur?C.primary:done?C.green:C.border,border:`3px solid ${C.surface}`,boxShadow:cur?`0 0 8px ${C.primary}60`:'none'}}/>
              <div className="flex-1 flex items-center justify-between" style={{
                background:cur?C.primaryLight:'transparent',borderRadius:8,padding:cur?'8px 12px':'4px 12px',
                border:cur?`1px solid ${C.primary}20`:'1px solid transparent'}}>
                <div className="flex items-center gap-2">
                  <MI name={r.icon} size={18} fill={cur||done} style={{color:cur?C.primary:done?C.green:C.textMuted}}/>
                  <span style={{fontWeight:cur?700:500,color:cur?C.primary:done?C.green:C.textMuted,fontSize:13}}>{r.name}</span>
                </div>
                <span style={{fontSize:11,fontWeight:600,color:cur?C.primary:done?C.green:C.textMuted,fontFamily:"'JetBrains Mono'"}}>{r.xp.toLocaleString()}</span>
              </div>
            </div>
          );})}
        </div>
      </Card>

      {/* Badges */}
      <div className="stagger-4">
        <div className="flex justify-between items-center mb-3">
          <h3 style={{fontSize:16,fontWeight:700,color:C.text}}>Lencana</h3>
          <span style={{fontSize:12,fontWeight:700,color:C.primary,fontFamily:"'JetBrains Mono'"}}>{unlocked}/{BADGES.length}</span>
        </div>
        <Card style={{padding:16}}>
          <div className="grid grid-cols-4 gap-x-1 gap-y-5" style={{justifyItems:'center'}}>
            {BADGES.map((b,i)=><Badge key={i} badge={b} size={54}/>)}
          </div>
        </Card>
      </div>
    </div>);}

  /* ─── PROFIL ────────────────────────────────────────────────────── */
  function Profil(){return(
    <div key={k} className="flex flex-col gap-4 pb-4">
      {/* Profile Header */}
      <Card className="stagger-1" style={{textAlign:'center',padding:24,position:'relative',overflow:'hidden'}}>
        <div className="orb orb-2" style={{width:120,height:120,background:'radial-gradient(circle,rgba(201,168,76,0.12),transparent 70%)',top:-20,left:-30}}/>
        <div style={{width:72,height:72,borderRadius:20,background:'linear-gradient(135deg,#C9A84C,#E8D48B)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',border:'2px solid rgba(201,168,76,0.3)',boxShadow:'0 0 24px rgba(201,168,76,0.2)',position:'relative',zIndex:1}}>
          <span style={{fontSize:24,fontWeight:800,color:'white'}}>AS</span>
        </div>
        <h2 style={{fontSize:18,fontWeight:800,color:C.text,position:'relative',zIndex:1}}>Mayor Arif Santoso</h2>
        <p style={{fontSize:11,color:C.textMuted,fontFamily:"'JetBrains Mono'",marginTop:2,position:'relative',zIndex:1}}>NRP-20240812</p>
        <span style={{display:'inline-block',background:C.goldLight,borderRadius:8,padding:'4px 12px',fontSize:11,fontWeight:700,color:C.gold,marginTop:8,border:'1px solid rgba(251,191,36,0.2)',position:'relative',zIndex:1}}>Perwira Muda</span>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[{l:'Misi',v:'24'},{l:'XP',v:'4,820'},{l:'Rank',v:'#12'}].map((s,i)=>(
            <div key={i} style={{background:C.surfaceLight,borderRadius:10,padding:'8px 0',textAlign:'center',border:`1px solid ${C.border}`,position:'relative',zIndex:1}}>
              <p style={{fontSize:16,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'"}}>{s.v}</p>
              <p style={{fontSize:10,color:C.textMuted,fontWeight:600}}>{s.l}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Social Accounts */}
      <Card className="stagger-2">
        <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:12}}>Akun Terhubung</h3>
        {SOCIALS.map((s,i)=>(
          <div key={s.key} className="flex items-center gap-3" style={{padding:'10px 0',borderBottom:i<SOCIALS.length-1?`1px solid ${C.borderLight}`:'none'}}>
            <div style={{width:38,height:38,borderRadius:10,background:C.surfaceLight,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${C.border}`}}>
              <SocialIcon platform={s.platform} size={18} color={s.color}/>
            </div>
            <div className="flex-1">
              <p style={{fontSize:13,fontWeight:600,color:C.text}}>{s.label}</p>
              <p style={{fontSize:11,color:C.textMuted}}>{s.handle}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:"'JetBrains Mono'"}}>{s.followers}</span>
              <span style={{fontSize:9,padding:'2px 6px',borderRadius:4,fontWeight:700,background:C.greenLight,color:C.green}}>Connected</span>
            </div>
          </div>
        ))}
        <button style={{width:'100%',marginTop:12,padding:'10px 0',borderRadius:8,border:`1px dashed ${C.border}`,background:'transparent',color:C.primary,fontWeight:600,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
          <MI name="add" size={16} style={{color:C.primary}}/> Hubungkan Akun Lain
        </button>
      </Card>

      {/* Badges */}
      <div className="stagger-3">
        <div className="flex justify-between items-center mb-3">
          <h3 style={{fontSize:14,fontWeight:700,color:C.text}}>Lencana</h3>
          <button onClick={()=>nav('pangkat')} style={{color:C.primary,fontSize:12,fontWeight:600,background:'none',border:'none',cursor:'pointer'}}>Semua</button>
        </div>
        <Card style={{padding:14}}>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
            {BADGES.filter(b=>b.unlocked).slice(0,5).map((b,i)=><Badge key={i} badge={b} size={48}/>)}
          </div>
        </Card>
      </div>

      {/* Activity */}
      <Card className="stagger-4">
        <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10}}>Aktivitas</h3>
        {ACTIVITY.map((a,i)=>(
          <div key={i} className="flex items-center gap-3" style={{padding:'8px 0',borderBottom:i<ACTIVITY.length-1?`1px solid ${C.borderLight}`:'none'}}>
            <div style={{width:28,height:28,borderRadius:8,background:typeBg(a.type),display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <MI name={typeIcon(a.type)} size={14} fill style={{color:typeColor(a.type)}}/>
            </div>
            <div className="flex-1" style={{minWidth:0}}>
              <p style={{fontSize:12,fontWeight:600,color:C.text}} className="truncate">{a.mission}</p>
              <p style={{fontSize:10,color:C.textMuted}}>{a.date}</p>
            </div>
            <div className="flex flex-col items-end gap-1" style={{flexShrink:0}}>
              <span style={{fontSize:11,fontWeight:700,color:C.gold,fontFamily:"'JetBrains Mono'"}}>+{a.xp}</span>
              <span style={{fontSize:9,padding:'2px 6px',borderRadius:4,fontWeight:700,
                background:a.status==='SELESAI'?C.greenLight:C.orangeLight,
                color:a.status==='SELESAI'?C.green:C.orange}}>{a.status}</span>
            </div>
          </div>
        ))}
      </Card>

      {/* Settings */}
      <Card className="stagger-5">
        <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10}}>Pengaturan</h3>
        {[{label:'Notifikasi',desc:'Pembaruan misi harian',on:notif,toggle:()=>setNotif(!notif)},{label:'Privasi',desc:'Sembunyikan aktivitas',on:privacy,toggle:()=>setPrivacy(!privacy)}].map((s,i)=>(
          <div key={i} className="flex items-center justify-between" style={{padding:'10px 0',borderBottom:`1px solid ${C.borderLight}`}}>
            <div><p style={{fontSize:13,fontWeight:600,color:C.text}}>{s.label}</p><p style={{fontSize:11,color:C.textMuted}}>{s.desc}</p></div>
            <button onClick={s.toggle} style={{width:44,height:24,borderRadius:12,position:'relative',border:'none',cursor:'pointer',background:s.on?C.primary:C.border,transition:'background 200ms ease'}}>
              <span className="toggle-knob" style={{width:18,height:18,borderRadius:'50%',background:'white',position:'absolute',top:3,left:s.on?23:3,boxShadow:s.on?`0 0 8px rgba(201,168,76,0.4), 0 1px 3px rgba(0,0,0,0.15)`:'0 1px 3px rgba(0,0,0,0.15)'}}/>
            </button>
          </div>
        ))}
        <button onClick={()=>{if(logoutConfirm){showToast('Berhasil keluar');setLogoutConfirm(false)}else{setLogoutConfirm(true);setTimeout(()=>setLogoutConfirm(false),3000)}}} className={logoutConfirm?'confirm-bounce':''} style={{width:'100%',marginTop:14,padding:'10px 0',borderRadius:8,border:`1px solid ${logoutConfirm?C.red:C.redLight}`,background:logoutConfirm?C.red:C.redLight,color:logoutConfirm?'white':C.red,fontWeight:700,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4,transition:'all 200ms'}}>
          <MI name={logoutConfirm?'warning':'logout'} size={16} style={{color:logoutConfirm?'white':C.red}}/> {logoutConfirm?'Yakin keluar?':'Keluar'}
        </button>
      </Card>
    </div>
  );}

  /* ─── ADMIN DASHBOARD ───────────────────────────────────────────── */
  function AdminDashboard(){
    const tabs2=[{id:'overview',label:'Overview'},{id:'narratives',label:'Narasi AI'},{id:'platforms',label:'Platform'}];
    return(<div key={k} className="flex flex-col gap-4 pb-4">
      <div className="stagger-1 flex items-center justify-between pt-1">
        <h1 style={{fontSize:22,fontWeight:800,color:C.text}}>Admin Dashboard</h1>
        <div style={{width:32,height:32,borderRadius:8,background:C.primaryLight,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <MI name="smart_toy" size={18} style={{color:C.primary}}/>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="stagger-2 flex gap-2 overflow-x-auto hide-scrollbar">
        {tabs2.map(t=><Chip key={t.id} label={t.label} active={adminTab===t.id} onClick={()=>setAdminTab(t.id)}/>)}
      </div>

      {/* === OVERVIEW === */}
      {adminTab==='overview'&&(<>
        {/* Stats Grid */}
        <div className="stagger-3 grid grid-cols-2 gap-3">
          {[{icon:'group',label:'Total Anggota',value:ADMIN_STATS.totalAgents.toLocaleString(),color:C.primary,bg:C.primaryLight},
            {icon:'person_check',label:'Aktif Hari Ini',value:ADMIN_STATS.activeToday.toString(),color:C.green,bg:C.greenLight},
            {icon:'target',label:'Misi Aktif',value:ADMIN_STATS.missionsActive.toString(),color:C.orange,bg:C.orangeLight},
            {icon:'check_circle',label:'Misi Selesai',value:ADMIN_STATS.missionsCompleted.toString(),color:C.teal,bg:C.tealLight},
          ].map((s,i)=>(
            <Card key={i} style={{padding:14}}>
              <div style={{width:32,height:32,borderRadius:8,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:8}}>
                <MI name={s.icon} size={18} fill style={{color:s.color}}/>
              </div>
              <p style={{fontSize:20,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'"}}>{s.value}</p>
              <p style={{fontSize:11,color:C.textMuted,fontWeight:500}}>{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Reach & Engagement */}
        <div className="stagger-4 grid grid-cols-2 gap-3">
          <Card style={{padding:14,background:'linear-gradient(135deg,rgba(201,168,76,0.15),rgba(201,168,76,0.08))',border:'1px solid rgba(201,168,76,0.2)'}}>
            <MI name="public" size={20} style={{color:C.primary}}/>
            <p style={{fontSize:22,fontWeight:800,color:C.text,marginTop:4,fontFamily:"'JetBrains Mono'"}}>{ADMIN_STATS.totalReach}</p>
            <p style={{fontSize:11,color:C.textSec}}>Total Reach</p>
          </Card>
          <Card style={{padding:14,background:'linear-gradient(135deg,rgba(251,191,36,0.1),rgba(245,158,11,0.06))',border:'1px solid rgba(251,191,36,0.15)'}}>
            <MI name="trending_up" size={20} style={{color:C.gold}}/>
            <p style={{fontSize:22,fontWeight:800,color:C.text,marginTop:4,fontFamily:"'JetBrains Mono'"}}>{ADMIN_STATS.avgEngagement}</p>
            <p style={{fontSize:11,color:C.textSec}}>Avg Engagement</p>
          </Card>
        </div>

        {/* Alert Summary with Sentiment */}
        <Card className="stagger-5" style={{borderLeft:`3px solid ${C.red}`}}>
          <div className="flex items-center justify-between mb-2">
            <h3 style={{fontSize:14,fontWeight:700,color:C.text}}>Alert Narasi</h3>
            <span style={{background:C.redLight,color:C.red,borderRadius:10,padding:'2px 8px',fontSize:11,fontWeight:700}}>{ADMIN_STATS.alertsToday} baru</span>
          </div>
          {NARRATIVES.filter(n=>n.urgency==='TINGGI').slice(0,2).map((n,i)=>{
            const ua=narrativeActions[n.id];
            return(
            <div key={i} style={{padding:'8px 0',borderBottom:i===0?`1px solid ${C.borderLight}`:'none',cursor:'pointer'}} onClick={()=>{setAdminTab('narratives');setExpandedNarrative(n.id)}}>
              <div className="flex items-center gap-3 mb-1">
                <div style={{width:8,height:8,borderRadius:'50%',background:C.red,flexShrink:0}}/>
                <div className="flex-1">
                  <p style={{fontSize:12,fontWeight:600,color:C.text}}>{n.topic}</p>
                  <p style={{fontSize:10,color:C.textMuted}}>Vol: {n.volume} · {n.trend} · Positif: {n.positivePercent}%</p>
                </div>
                {ua?<span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:4,background:ua==='DUKUNG'?C.green:ua==='TOLAK'?C.red:C.orange,color:'white'}}>{ua}</span>
                :<span style={{fontSize:10,fontWeight:700,color:C.red,background:C.redLight,padding:'2px 6px',borderRadius:4}}>Perlu Aksi</span>}
              </div>
              <div style={{paddingLeft:20}}><SentimentChart breakdown={n.sentimentBreakdown} compact/></div>
            </div>
          );})}
          <button onClick={()=>setAdminTab('narratives')} style={{width:'100%',marginTop:8,padding:'8px 0',borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',color:C.primary,fontWeight:600,fontSize:12,cursor:'pointer'}}>Lihat Semua Narasi</button>
        </Card>

        {/* Quick Platform Stats */}
        <Card className="stagger-6">
          <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:12}}>Platform Overview</h3>
          {PLATFORM_STATS.map((p,i)=>(
            <div key={i} className="flex items-center gap-3" style={{padding:'8px 0',borderBottom:i<PLATFORM_STATS.length-1?`1px solid ${C.borderLight}`:'none'}}>
              <div style={{width:32,height:32,borderRadius:8,background:C.surfaceLight,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${C.border}`}}>
                <SocialIcon platform={p.platform} size={16} color={p.color}/>
              </div>
              <div className="flex-1">
                <p style={{fontSize:12,fontWeight:600,color:C.text}}>{p.platform==='x'?'X (Twitter)':p.platform.charAt(0).toUpperCase()+p.platform.slice(1)}</p>
                <p style={{fontSize:10,color:C.textMuted}}>Reach: {p.reach}</p>
              </div>
              <div className="flex flex-col items-end">
                <span style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:"'JetBrains Mono'"}}>{p.engagement}</span>
                <span style={{fontSize:10,fontWeight:600,color:p.trend.startsWith('+')?C.green:p.trend.startsWith('-')?C.red:C.textMuted}}>{p.trend}</span>
              </div>
            </div>
          ))}
        </Card>
      </>)}

      {/* === NARRATIVE AI === */}
      {adminTab==='narratives'&&(<>
        <Card className="stagger-3" style={{background:C.primaryLight,border:`1px solid ${C.primary}20`,padding:14}}>
          <div className="flex items-center gap-2 mb-1">
            <MI name="smart_toy" size={18} style={{color:C.primary}}/>
            <span style={{fontSize:12,fontWeight:700,color:C.primary}}>AI Monitoring Aktif</span>
          </div>
          <p style={{fontSize:11,color:C.textSec}}>{ADMIN_STATS.narrativesMonitored} narasi dipantau secara real-time di {PLATFORM_STATS.length} platform</p>
        </Card>

        {NARRATIVES.map((n,i)=>{
          const expanded=expandedNarrative===n.id;
          const verdictColor=n.aiVerdict==='TOLAK'?C.red:n.aiVerdict==='DUKUNG'?C.green:C.orange;
          const verdictBg=n.aiVerdict==='TOLAK'?C.redLight:n.aiVerdict==='DUKUNG'?C.greenLight:C.orangeLight;
          const userAction=narrativeActions[n.id];
          return(
          <Card key={n.id} className={`stagger-${Math.min(i+4,7)}`} style={{padding:0,overflow:'hidden'}}>
            <div style={{padding:16,cursor:'pointer'}} onClick={()=>setExpandedNarrative(expanded?null:n.id)}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div style={{width:8,height:8,borderRadius:'50%',background:n.urgency==='TINGGI'?C.red:n.urgency==='SEDANG'?C.orange:C.green}}/>
                  <span style={{fontSize:10,fontWeight:700,color:C.textMuted,textTransform:'uppercase',letterSpacing:0.5}}>{n.urgency}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{fontSize:10,fontWeight:700,color:verdictColor,background:verdictBg,padding:'2px 8px',borderRadius:4}}>AI: {n.aiVerdict}</span>
                  <PositiveMeter percent={n.positivePercent} size="sm"/>
                </div>
              </div>
              <h3 style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:6}}>{n.topic}</h3>
              {/* Compact sentiment bar */}
              <SentimentChart breakdown={n.sentimentBreakdown} compact/>
              <div className="flex items-center gap-3 mt-2">
                <span style={{fontSize:11,color:C.textMuted}}>Volume: <b style={{color:C.text}}>{n.volume}</b></span>
                <span style={{fontSize:11,fontWeight:600,color:n.trend.startsWith('+')?C.red:C.green}}>{n.trend}</span>
                {userAction&&<span style={{marginLeft:'auto',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:4,
                  background:userAction==='DUKUNG'?C.greenLight:userAction==='TOLAK'?C.redLight:C.orangeLight,
                  color:userAction==='DUKUNG'?C.green:userAction==='TOLAK'?C.red:C.orange,
                }}>Aksi: {userAction}</span>}
              </div>
              <MI name={expanded?'expand_less':'expand_more'} size={20} style={{color:C.textMuted,display:'block',margin:'4px auto 0'}}/>
            </div>

            {expanded&&(
              <div style={{borderTop:`1px solid ${C.borderLight}`,padding:16}}>
                {/* Sentiment Breakdown */}
                <div style={{background:C.surfaceLight,borderRadius:10,padding:14,marginBottom:14,border:`1px solid ${C.borderLight}`}}>
                  <p style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:8,textTransform:'uppercase',letterSpacing:0.5}}>Analisis Sentimen</p>
                  <SentimentChart breakdown={n.sentimentBreakdown}/>
                  <div className="flex items-center gap-2 mt-3" style={{borderTop:`1px solid ${C.border}`,paddingTop:8}}>
                    <span style={{fontSize:11,fontWeight:600,color:C.textSec}}>Sentimen positif keseluruhan:</span>
                    <span style={{fontSize:14,fontWeight:800,color:n.positivePercent>=50?C.green:n.positivePercent>=25?C.orange:C.red,fontFamily:"'JetBrains Mono'"}}>{n.positivePercent}%</span>
                  </div>
                </div>

                {/* AI Analysis */}
                <div style={{background:C.primaryLight,borderRadius:10,padding:14,marginBottom:14,border:`1px solid ${C.primary}15`}}>
                  <div className="flex items-center gap-2 mb-2">
                    <MI name="smart_toy" size={16} style={{color:C.primary}}/>
                    <span style={{fontSize:12,fontWeight:700,color:C.primary}}>Rekomendasi AI</span>
                    <span style={{marginLeft:'auto',fontSize:10,fontWeight:700,color:C.primary,background:C.surfaceLight,padding:'2px 6px',borderRadius:4,border:`1px solid ${C.border}`}}>Confidence: {n.aiConfidence}%</span>
                  </div>
                  <p style={{fontSize:12,color:C.textSec,lineHeight:1.5,marginBottom:8}}>{n.aiReason}</p>
                  <div style={{background:C.surface,borderRadius:8,padding:10,border:`1px solid ${C.border}`}}>
                    <p style={{fontSize:10,fontWeight:700,color:C.primary,marginBottom:4,textTransform:'uppercase',letterSpacing:0.5}}>Saran Aksi</p>
                    <p style={{fontSize:12,color:C.textSec,lineHeight:1.5}}>{n.aiSuggestion}</p>
                  </div>
                </div>

                {/* USER ACTION BUTTONS — Dukung / Tolak / Monitor */}
                <div style={{marginBottom:14}}>
                  <p style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:8,textTransform:'uppercase',letterSpacing:0.5}}>Pilih Aksi</p>
                  <div className="flex gap-2">
                    {[{action:'DUKUNG',icon:'thumb_up',label:'Dukung',color:C.green,bg:C.greenLight},
                      {action:'TOLAK',icon:'block',label:'Tolak',color:C.red,bg:C.redLight},
                      {action:'MONITOR',icon:'visibility',label:'Monitor',color:C.orange,bg:C.orangeLight},
                    ].map(a=>{
                      const isActive=userAction===a.action;
                      return <button key={a.action} onClick={(e)=>{e.stopPropagation();setNarrativeActions(prev=>({...prev,[n.id]:isActive?undefined:a.action}));showToast(isActive?'Aksi dibatalkan':`Narasi di-${a.label.toLowerCase()}`)}} style={{
                        flex:1,padding:'10px 0',borderRadius:10,border:isActive?'none':`1.5px solid ${a.color}40`,cursor:'pointer',
                        background:isActive?a.color:a.bg,color:isActive?'white':a.color,
                        fontSize:12,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:4,transition:'all 200ms',
                      }}>
                        <MI name={a.icon} size={16} fill={isActive} style={{color:isActive?'white':a.color}}/>{a.label}
                      </button>;
                    })}
                  </div>
                </div>

                {/* Sources */}
                <p style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:8,textTransform:'uppercase',letterSpacing:0.5}}>Sumber</p>
                {n.sources.map((s,j)=>(
                  <div key={j} className="flex items-start gap-3" style={{marginBottom:8,padding:10,background:C.surfaceLight,borderRadius:8,border:`1px solid ${C.border}`}}>
                    <div style={{width:28,height:28,borderRadius:6,background:C.surface,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${C.border}`,flexShrink:0}}>
                      {s.platform==='whatsapp'?<MI name="chat" size={14} style={{color:'#25D366'}}/>:
                       s.platform==='facebook'?<MI name="thumb_up" size={14} style={{color:'#1877F2'}}/>:
                       <SocialIcon platform={s.platform} size={14} color={PLATFORM_STATS.find(p=>p.platform===s.platform)?.color||C.text}/>}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{fontSize:11,fontWeight:700,color:C.text}}>{s.platform.charAt(0).toUpperCase()+s.platform.slice(1)}</span>
                        <span style={{fontSize:10,color:C.textMuted,fontFamily:"'JetBrains Mono'"}}>{s.count}</span>
                      </div>
                      <p style={{fontSize:11,color:C.textSec,fontStyle:'italic'}}>"{s.sample}"</p>
                    </div>
                  </div>
                ))}

                {/* Keywords */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {n.keywords.map((kw,j)=>(
                    <span key={j} style={{fontSize:10,fontWeight:600,color:C.textSec,background:C.surfaceLight,border:`1px solid ${C.border}`,borderRadius:4,padding:'2px 8px'}}>{kw}</span>
                  ))}
                </div>

                {/* Counter Narratives */}
                {n.aiCounterNarrative.length>0&&(
                  <div style={{marginBottom:12}}>
                    <p style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>Counter-Narasi Siap Deploy</p>
                    {n.aiCounterNarrative.map((cn,j)=>(
                      <div key={j} className="flex items-start gap-2" style={{marginBottom:6,padding:10,background:C.greenLight,borderRadius:8,border:`1px solid ${C.green}15`}}>
                        <MI name="format_quote" size={16} style={{color:C.green,flexShrink:0,marginTop:2}}/>
                        <p style={{fontSize:12,color:C.text,lineHeight:1.4,flex:1}}>{cn}</p>
                        <button onClick={(e)=>{e.stopPropagation();copyText(cn)}} style={{background:C.green,border:'none',borderRadius:6,padding:'4px 8px',fontSize:10,fontWeight:700,color:'white',cursor:'pointer',flexShrink:0}}>Salin</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Deploy based on user action */}
                {userAction&&userAction!=='MONITOR'&&(
                  <button onClick={(e)=>{e.stopPropagation();showToast(userAction==='TOLAK'?'Counter-narasi deployed!':'Amplifikasi deployed!')}} style={{
                    width:'100%',padding:'12px 0',borderRadius:10,border:'none',cursor:'pointer',
                    background:userAction==='TOLAK'?C.red:C.green,color:'white',fontSize:13,fontWeight:700,
                    display:'flex',alignItems:'center',justifyContent:'center',gap:6,
                  }}>
                    <MI name={userAction==='TOLAK'?'campaign':'trending_up'} size={18} style={{color:'white'}}/>
                    {userAction==='TOLAK'?'Deploy Counter-Narasi':'Deploy Amplifikasi'}
                  </button>
                )}
              </div>
            )}
          </Card>);
        })}
      </>)}

      {/* === PLATFORMS === */}
      {adminTab==='platforms'&&(<>
        {PLATFORM_STATS.map((p,i)=>(
          <Card key={i} className={`stagger-${Math.min(i+3,7)}`}>
            <div className="flex items-center gap-3 mb-3">
              <div style={{width:40,height:40,borderRadius:10,background:C.surfaceLight,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${C.border}`}}>
                {p.platform==='facebook'?<MI name="thumb_up" size={20} style={{color:p.color}}/>:
                 <SocialIcon platform={p.platform} size={20} color={p.color}/>}
              </div>
              <div className="flex-1">
                <p style={{fontSize:14,fontWeight:700,color:C.text}}>{p.platform==='x'?'X (Twitter)':p.platform==='facebook'?'Facebook':p.platform.charAt(0).toUpperCase()+p.platform.slice(1)}</p>
                <p style={{fontSize:11,color:C.textMuted}}>Trend: <span style={{fontWeight:600,color:p.trend.startsWith('+')?C.green:p.trend.startsWith('-')?C.red:C.textMuted}}>{p.trend}</span></p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[{l:'Posts',v:p.posts},{l:'Reach',v:p.reach},{l:'Engage',v:p.engagement}].map((s,j)=>(
                <div key={j} style={{background:C.surfaceLight,borderRadius:8,padding:'8px 4px',textAlign:'center'}}>
                  <p style={{fontSize:14,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'"}}>{s.v}</p>
                  <p style={{fontSize:9,color:C.textMuted,fontWeight:600}}>{s.l}</p>
                </div>
              ))}
            </div>
          </Card>
        ))}

        {/* Monitoring Summary */}
        <Card className="stagger-7" style={{borderLeft:`3px solid ${C.primary}`}}>
          <div className="flex items-center gap-2 mb-2">
            <MI name="smart_toy" size={18} style={{color:C.primary}}/>
            <h3 style={{fontSize:14,fontWeight:700,color:C.text}}>AI Insight</h3>
          </div>
          <p style={{fontSize:12,color:C.textSec,lineHeight:1.5}}>
            TikTok menunjukkan pertumbuhan engagement tertinggi (+28%). Rekomendasi: alokasikan lebih banyak misi SOCIAL untuk TikTok. Facebook mengalami penurunan — pertimbangkan pivot ke format video pendek.
          </p>
        </Card>
      </>)}
    </div>);}

  /* ─── UPLOAD & VERIFIKASI ───────────────────────────────────────── */
  function KontenSaya(){
    const [kontenTab,setKontenTab]=useState('semua');
    const myPosts=[
      {id:1,platform:'tiktok',type:'video',title:'Tips Aman Pakai WiFi Publik',date:'6 Mar 2026',thumb:'video',
        views:'128.4K',likes:'12.3K',comments:'1.2K',shares:'4.5K',saves:'2.1K',rate:14.2,trending:true,
        missionId:1,missionTitle:'Distribusi Materi Literasi Digital',status:'SELESAI',xpEarned:250},
      {id:2,platform:'instagram',type:'reels',title:'Cara Cek Fakta Berita Online',date:'4 Mar 2026',thumb:'image',
        views:'45.8K',likes:'5.6K',comments:'342',shares:'1.8K',saves:'890',rate:11.8,trending:false,
        missionId:3,missionTitle:'Counter-Narasi Hoaks Vaksinasi',status:'REVIEW',xpEarned:0},
      {id:3,platform:'x',type:'thread',title:'Thread: 5 Tanda Penipuan Online',date:'2 Mar 2026',thumb:'article',
        views:'18.2K',likes:'2.1K',comments:'187',shares:'956',saves:'412',rate:9.4,trending:false,
        missionId:1,missionTitle:'Distribusi Materi Literasi Digital',status:'SELESAI',xpEarned:250},
      {id:4,platform:'tiktok',type:'video',title:'POV: Kamu Kena Phishing',date:'28 Feb 2026',thumb:'video',
        views:'256.1K',likes:'28.9K',comments:'3.4K',shares:'8.7K',saves:'5.2K',rate:18.1,trending:true,
        missionId:5,missionTitle:'Buat Video Edukasi Literasi Digital',status:'SELESAI',xpEarned:350},
      {id:5,platform:'instagram',type:'carousel',title:'Infografis Keamanan Digital',date:'25 Feb 2026',thumb:'image',
        views:'22.3K',likes:'3.2K',comments:'156',shares:'890',saves:'1.4K',rate:8.6,trending:false,
        missionId:1,missionTitle:'Distribusi Materi Literasi Digital',status:'REVIEW',xpEarned:0},
    ];
    const filtered=kontenTab==='semua'?myPosts:myPosts.filter(p=>p.platform===kontenTab);
    const totalViews='470.8K';const totalLikes='52.1K';const totalShares='16.8K';const avgRate='12.4%';
    const totalXpEarned=myPosts.reduce((s,p)=>s+p.xpEarned,0);
    const pCol=p=>({instagram:'#E1306C',tiktok:'#E8E8E8',x:'#1DA1F2'}[p]||C.text);
    const pLbl=p=>({instagram:'Instagram',tiktok:'TikTok',x:'X (Twitter)'}[p]||p);
    const tIcon=t=>({video:'play_circle',reels:'slow_motion_video',thread:'article',carousel:'view_carousel'}[t]||'image');

    return(<div key={k} className="flex flex-col gap-4 pb-4">
      <div className="stagger-1 flex items-center justify-between" style={{paddingTop:4}}>
        <h1 style={{fontSize:22,fontWeight:800,color:C.text}}>Konten Saya</h1>
        {totalXpEarned>0&&<div style={{background:C.goldLight,borderRadius:8,padding:'4px 12px',border:'1px solid rgba(201,168,76,0.2)',display:'flex',alignItems:'center',gap:4}}>
          <MI name="stars" size={14} fill style={{color:C.gold}}/>
          <span style={{fontSize:13,fontWeight:800,color:C.gold,fontFamily:"'JetBrains Mono'"}}>{totalXpEarned} XP</span>
        </div>}
      </div>

      {/* Pending Uploads - missions joined but not yet submitted */}
      {(()=>{
        const pending=Object.entries(joinedMissions).filter(([,j])=>j.status==='TERDAFTAR').map(([mid,j])=>({...j,mission:MISSIONS.find(m=>m.id===parseInt(mid))})).filter(j=>j.mission);
        if(!pending.length)return null;
        return(
        <Card className="stagger-2" style={{borderLeft:`3px solid ${C.orange}`,padding:14}}>
          <div className="flex items-center gap-2 mb-3">
            <MI name="cloud_upload" size={16} style={{color:C.orange}}/>
            <h3 style={{fontSize:13,fontWeight:700,color:C.text}}>Perlu Upload</h3>
            <span style={{marginLeft:'auto',fontSize:10,fontWeight:700,color:C.orange,background:C.orangeLight,padding:'2px 8px',borderRadius:4}}>{pending.length} misi</span>
          </div>
          <div className="flex flex-col gap-2">
            {pending.map(j=>{
              const m=j.mission;
              return(
              <div key={m.id} onClick={()=>openM(m)} className="flex items-center gap-3 tap-bounce" style={{background:C.surfaceLight,borderRadius:8,padding:'10px 12px',border:`1px solid ${C.border}`,cursor:'pointer'}}>
                <div style={{width:32,height:32,borderRadius:8,background:typeBg(m.type),display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <MI name={typeIcon(m.type)} size={14} fill style={{color:typeColor(m.type)}}/>
                </div>
                <div className="flex-1" style={{minWidth:0}}>
                  <p style={{fontSize:11,fontWeight:700,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.title}</p>
                  <p style={{fontSize:9,color:C.orange,fontWeight:600}}>Deadline: {m.deadline}</p>
                </div>
                <MI name="arrow_forward_ios" size={12} style={{color:C.textMuted}}/>
              </div>);
            })}
          </div>
        </Card>);
      })()}

      {/* Overview Stats */}
      <div className="stagger-2 grid grid-cols-4 gap-2">
        {[{l:'Views',v:totalViews,icon:'visibility',c:C.primary},{l:'Likes',v:totalLikes,icon:'favorite',c:C.pink},{l:'Shares',v:totalShares,icon:'share',c:C.teal},{l:'Avg Rate',v:avgRate,icon:'trending_up',c:C.orange}].map((s,i)=>(
          <div key={i} className={`num-pop num-pop-d${Math.min(i+1,3)}`} style={{background:C.surface,borderRadius:10,padding:'10px 6px',textAlign:'center',border:`1px solid ${C.border}`}}>
            <MI name={s.icon} size={16} style={{color:s.c}}/>
            <p style={{fontSize:13,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'",marginTop:2}}>{s.v}</p>
            <p style={{fontSize:9,color:C.textMuted,fontWeight:600}}>{s.l}</p>
          </div>
        ))}
      </div>

      {/* Platform Breakdown */}
      <Card className="stagger-3">
        <h3 style={{fontSize:12,fontWeight:700,color:C.textMuted,letterSpacing:1,textTransform:'uppercase',marginBottom:10}}>Performa per Platform</h3>
        <div className="flex flex-col gap-2">
          {[
            {p:'tiktok',views:'384.5K',posts:2,topRate:18.1},
            {p:'instagram',views:'68.1K',posts:2,topRate:11.8},
            {p:'x',views:'18.2K',posts:1,topRate:9.4},
          ].map((d,i)=>(
            <div key={i} className="flex items-center gap-3" style={{background:C.surfaceLight,borderRadius:8,padding:'8px 10px',border:`1px solid ${C.border}`}}>
              <div style={{width:30,height:30,borderRadius:8,background:`${pCol(d.p)}15`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <SocialIcon platform={d.p} size={14} color={pCol(d.p)}/>
              </div>
              <div className="flex-1">
                <p style={{fontSize:12,fontWeight:700,color:C.text}}>{pLbl(d.p)}</p>
                <p style={{fontSize:10,color:C.textMuted}}>{d.posts} konten</p>
              </div>
              <div style={{textAlign:'right'}}>
                <p style={{fontSize:13,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'"}}>{d.views}</p>
                <p style={{fontSize:9,color:C.green}}>Best: {d.topRate}%</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Filter Tabs */}
      <div className="stagger-4 flex gap-2">
        {[{id:'semua',label:'Semua'},{id:'tiktok',label:'TikTok'},{id:'instagram',label:'IG'},{id:'x',label:'X'}].map(t=>(
          <button key={t.id} onClick={()=>setKontenTab(t.id)} style={{
            padding:'6px 14px',borderRadius:8,border:`1px solid ${kontenTab===t.id?C.primary:C.border}`,
            background:kontenTab===t.id?C.primaryLight:'transparent',color:kontenTab===t.id?C.primary:C.textSec,
            fontSize:12,fontWeight:700,cursor:'pointer',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Post List */}
      {filtered.map((post,i)=>(
        <Card key={post.id} className={`stagger-${Math.min(i+5,7)}`} style={{padding:0,overflow:'hidden'}}>
          {/* Post Header */}
          <div className="flex items-center gap-3" style={{padding:'12px 14px 0'}}>
            <div style={{width:28,height:28,borderRadius:8,background:`${pCol(post.platform)}15`,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <SocialIcon platform={post.platform} size={13} color={pCol(post.platform)}/>
            </div>
            <div className="flex-1">
              <p style={{fontSize:12,fontWeight:700,color:C.text}}>{pLbl(post.platform)}</p>
              <p style={{fontSize:10,color:C.textMuted}}>{post.date}</p>
            </div>
            <div className="flex items-center gap-2">
              <span style={{background:`${pCol(post.platform)}15`,color:pCol(post.platform),borderRadius:6,padding:'2px 8px',fontSize:10,fontWeight:700,textTransform:'uppercase'}}>{post.type}</span>
              {post.trending&&<span style={{background:C.orangeLight,color:C.orange,borderRadius:6,padding:'2px 8px',fontSize:10,fontWeight:700,display:'flex',alignItems:'center',gap:2}}>
                <MI name="local_fire_department" size={12} style={{color:C.orange}}/>Viral
              </span>}
            </div>
          </div>

          {/* Post Thumbnail */}
          <div style={{margin:'10px 14px',background:C.bg,borderRadius:8,height:56,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${C.border}`,position:'relative',overflow:'hidden'}}>
            <MI name={tIcon(post.type)} size={24} style={{color:C.primary,opacity:0.5}}/>
            <p style={{fontSize:12,fontWeight:600,color:C.text,marginLeft:8}}>{post.title}</p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-5 gap-1" style={{padding:'0 14px 10px'}}>
            {[{l:'Views',v:post.views,icon:'visibility'},{l:'Likes',v:post.likes,icon:'favorite'},{l:'Comments',v:post.comments,icon:'chat_bubble'},{l:'Shares',v:post.shares,icon:'share'},{l:'Saves',v:post.saves,icon:'bookmark'}].map((m,j)=>(
              <div key={j} style={{background:C.surfaceLight,borderRadius:6,padding:'6px 2px',textAlign:'center'}}>
                <MI name={m.icon} size={12} style={{color:C.textMuted}}/>
                <p style={{fontSize:11,fontWeight:700,color:C.text,fontFamily:"'JetBrains Mono'"}}>{m.v}</p>
                <p style={{fontSize:8,color:C.textMuted,fontWeight:600}}>{m.l}</p>
              </div>
            ))}
          </div>

          {/* Engagement Rate Bar */}
          <div className="flex items-center gap-2" style={{padding:'0 14px 12px'}}>
            <span style={{fontSize:10,color:C.textMuted,fontWeight:600}}>Engagement</span>
            <div className="flex-1"><ProgressBar progress={post.rate/25} color={post.rate>15?C.green:post.rate>10?C.orange:C.textSec} height={4}/></div>
            <span style={{fontSize:11,fontWeight:700,color:post.rate>15?C.green:post.rate>10?C.orange:C.text,fontFamily:"'JetBrains Mono'"}}>{post.rate}%</span>
          </div>

          {/* Mission Link + Status + XP */}
          {post.missionTitle&&(
            <div className="flex items-center gap-2" style={{padding:'8px 14px',borderTop:`1px solid ${C.border}`,background:C.surfaceLight}}>
              <MI name="flag" size={12} style={{color:C.primary}}/>
              <p style={{fontSize:10,color:C.textSec,flex:1}}>Misi: <span style={{color:C.primary,fontWeight:600}}>{post.missionTitle}</span></p>
              <span style={{fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:4,
                background:post.status==='SELESAI'?C.greenLight:C.orangeLight,
                color:post.status==='SELESAI'?C.green:C.orange,
              }}>{post.status==='SELESAI'?'Selesai':'Direview'}</span>
              {post.status==='SELESAI'&&post.xpEarned>0&&(
                <span style={{fontSize:10,fontWeight:800,color:C.gold,background:C.goldLight,borderRadius:6,padding:'2px 8px',fontFamily:"'JetBrains Mono'",border:'1px solid rgba(201,168,76,0.2)'}}>+{post.xpEarned} XP</span>
              )}
              {post.status==='REVIEW'&&(
                <span style={{fontSize:9,color:C.textMuted,fontStyle:'italic'}}>Menunggu</span>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>);}

  /* ─── TOKO POIN (Rewards Shop) ──────────────────────────────────── */
  function TokoPoin(){
    const [shopTab,setShopTab]=useState('semua');
    const userPoints=4820;
    const rewardItems=[
      {id:1,cat:'pulsa',name:'Pulsa 25K',desc:'Pulsa All Operator Rp25.000',cost:500,icon:'phone_android',color:C.green,stock:50,popular:true},
      {id:2,cat:'pulsa',name:'Pulsa 50K',desc:'Pulsa All Operator Rp50.000',cost:900,icon:'phone_android',color:C.green,stock:30,popular:true},
      {id:3,cat:'pulsa',name:'Pulsa 100K',desc:'Pulsa All Operator Rp100.000',cost:1600,icon:'phone_android',color:C.green,stock:15},
      {id:4,cat:'data',name:'Paket Data 5GB',desc:'Kuota Internet 5GB 30 Hari',cost:750,icon:'wifi',color:C.teal,stock:40},
      {id:5,cat:'data',name:'Paket Data 15GB',desc:'Kuota Internet 15GB 30 Hari',cost:1800,icon:'wifi',color:C.teal,stock:20},
      {id:6,cat:'ewallet',name:'GoPay 50K',desc:'Saldo GoPay Rp50.000',cost:1000,icon:'account_balance_wallet',color:C.primary,stock:25,popular:true},
      {id:7,cat:'ewallet',name:'OVO 50K',desc:'Saldo OVO Rp50.000',cost:1000,icon:'account_balance_wallet',color:C.purple,stock:25},
      {id:8,cat:'ewallet',name:'DANA 100K',desc:'Saldo DANA Rp100.000',cost:1800,icon:'account_balance_wallet',color:C.teal,stock:10},
      {id:9,cat:'voucher',name:'Voucher Tokped 50K',desc:'Voucher Belanja Tokopedia',cost:1100,icon:'shopping_bag',color:C.green,stock:15},
      {id:10,cat:'voucher',name:'Voucher Shopee 50K',desc:'Voucher Belanja Shopee',cost:1100,icon:'shopping_bag',color:C.orange,stock:15},
      {id:11,cat:'merch',name:'Kaos GERAK',desc:'Kaos eksklusif edisi terbatas',cost:2500,icon:'checkroom',color:C.primary,stock:5},
      {id:12,cat:'merch',name:'Topi GERAK',desc:'Topi trucker limited edition',cost:1500,icon:'styler',color:C.primary,stock:8},
    ];
    const cats=[{id:'semua',label:'Semua'},{id:'pulsa',label:'Pulsa'},{id:'data',label:'Data'},{id:'ewallet',label:'E-Wallet'},{id:'voucher',label:'Voucher'},{id:'merch',label:'Merch'}];
    const filtered=shopTab==='semua'?rewardItems:rewardItems.filter(r=>r.cat===shopTab);

    return(<div key={k} className="flex flex-col gap-4 pb-4">
      {/* Header + Points Balance */}
      <div className="stagger-1">
        <h1 style={{fontSize:22,fontWeight:800,color:C.text,paddingTop:4,marginBottom:8}}>Toko Poin</h1>
        <div style={{background:'linear-gradient(135deg,rgba(201,168,76,0.15),rgba(232,212,139,0.08))',borderRadius:14,padding:'16px 14px',border:`1px solid rgba(201,168,76,0.2)`,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',right:-10,top:-10,opacity:0.06}}><MI name="stars" size={80} fill style={{color:C.gold}}/></div>
          <p style={{fontSize:10,fontWeight:700,color:C.textMuted,textTransform:'uppercase',letterSpacing:1,marginBottom:2}}>Poin Tersedia</p>
          <div className="flex items-end gap-2">
            <p style={{fontSize:32,fontWeight:900,color:C.gold,fontFamily:"'JetBrains Mono'",lineHeight:1}}>{userPoints.toLocaleString()}</p>
            <p style={{fontSize:12,color:C.textSec,marginBottom:2}}>XP</p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <MI name="history" size={14} style={{color:C.textMuted}}/>
            <p style={{fontSize:11,color:C.textSec}}>3 penukaran terakhir bulan ini</p>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="stagger-2 flex gap-2 overflow-x-auto hide-scrollbar" style={{paddingBottom:2}}>
        {cats.map(c=>(
          <button key={c.id} onClick={()=>setShopTab(c.id)} style={{
            padding:'6px 12px',borderRadius:8,border:`1px solid ${shopTab===c.id?C.primary:C.border}`,
            background:shopTab===c.id?C.primaryLight:'transparent',color:shopTab===c.id?C.primary:C.textSec,
            fontSize:11,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0,
          }}>{c.label}</button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map((item,i)=>{
          const canAfford=userPoints>=item.cost;
          return(
          <Card key={item.id} className={`stagger-${Math.min(i+3,7)}`} style={{padding:0,overflow:'hidden'}}>
            <div style={{padding:'14px 12px 10px',textAlign:'center',position:'relative'}}>
              {item.popular&&<span style={{position:'absolute',top:8,right:8,fontSize:9,fontWeight:700,color:C.orange,background:C.orangeLight,padding:'2px 6px',borderRadius:4}}>Populer</span>}
              <div style={{width:44,height:44,borderRadius:12,background:`${item.color}15`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px',border:`1px solid ${item.color}20`}}>
                <MI name={item.icon} size={22} style={{color:item.color}}/>
              </div>
              <p style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:2}}>{item.name}</p>
              <p style={{fontSize:10,color:C.textMuted,marginBottom:8,lineHeight:1.3}}>{item.desc}</p>
              <div className="flex items-center justify-center gap-1 mb-2">
                <MI name="stars" size={14} fill style={{color:C.gold}}/>
                <span style={{fontSize:15,fontWeight:800,color:C.gold,fontFamily:"'JetBrains Mono'"}}>{item.cost.toLocaleString()}</span>
              </div>
              <p style={{fontSize:9,color:C.textMuted}}>Stok: {item.stock}</p>
            </div>
            <button onClick={()=>{
              if(!canAfford)return;
              if(confirmRedeem===item.id){showToast(`${item.name} berhasil ditukar!`);setConfirmRedeem(null)}
              else{setConfirmRedeem(item.id);setTimeout(()=>setConfirmRedeem(cr=>cr===item.id?null:cr),3000)}
            }} className={confirmRedeem===item.id?'confirm-bounce':''} style={{
              width:'100%',padding:'10px 0',border:'none',cursor:canAfford?'pointer':'not-allowed',
              background:confirmRedeem===item.id?C.green:canAfford?'linear-gradient(135deg,#C9A84C,#E8D48B)':'rgba(100,116,139,0.15)',
              color:confirmRedeem===item.id?'white':canAfford?C.bg:C.textMuted,fontSize:12,fontWeight:700,transition:'all 200ms',
            }}>
              {confirmRedeem===item.id?'Konfirmasi?':canAfford?'Tukar Sekarang':'Poin Kurang'}
            </button>
          </Card>
        );})}
      </div>

      {/* Riwayat Penukaran */}
      <Card className="stagger-6">
        <h3 style={{fontSize:12,fontWeight:700,color:C.textMuted,letterSpacing:1,textTransform:'uppercase',marginBottom:10}}>Riwayat Penukaran</h3>
        {[
          {name:'Pulsa 50K',date:'1 Mar 2026',cost:900,status:'Berhasil'},
          {name:'GoPay 50K',date:'22 Feb 2026',cost:1000,status:'Berhasil'},
          {name:'Paket Data 5GB',date:'10 Feb 2026',cost:750,status:'Berhasil'},
        ].map((h,i)=>(
          <div key={i} className="flex items-center gap-3" style={{padding:'8px 0',borderBottom:i<2?`1px solid ${C.border}`:'none'}}>
            <div style={{width:28,height:28,borderRadius:8,background:C.greenLight,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <MI name="check_circle" size={14} fill style={{color:C.green}}/>
            </div>
            <div className="flex-1">
              <p style={{fontSize:12,fontWeight:600,color:C.text}}>{h.name}</p>
              <p style={{fontSize:10,color:C.textMuted}}>{h.date}</p>
            </div>
            <span style={{fontSize:11,fontWeight:700,color:C.red,fontFamily:"'JetBrains Mono'"}}>-{h.cost}</span>
          </div>
        ))}
      </Card>
    </div>);}

  /* ─── DETAIL MISI (Stepped Flow) ─────────────────────────────────── */
  function DetailMisi(){
    const m=sel||MISSIONS[0];const tc=typeColor(m.type);
    const jm=joinedMissions[m.id]; // joined mission state
    const isJoined=!!jm;
    const [step,setStep]=useState(()=>{
      if(!jm)return 0; // not joined = briefing
      if(jm.status==='TERDAFTAR')return 1; // joined but not uploaded = kit/upload
      if(jm.status==='SUBMITTED'||jm.status==='REVIEW')return 3; // submitted = review
      return 0; // SELESAI = show briefing/summary
    });
    const [linkVal,setLinkVal]=useState('');
    const [aiChecking,setAiChecking]=useState(false);
    const [aiResult,setAiResult]=useState(null);
    const done=m.status==='SELESAI'||(jm&&jm.status==='SELESAI');

    const steps=isJoined?[
      {label:'Briefing',icon:'description'},
      {label:'Kit & Contoh',icon:'inventory_2'},
      {label:'Upload',icon:'cloud_upload'},
      {label:'Review',icon:'verified'},
    ]:[
      {label:'Briefing',icon:'description'},
      {label:'Kit & Contoh',icon:'inventory_2'},
      {label:'Upload',icon:'cloud_upload'},
      {label:'Review',icon:'verified'},
    ];

    const doAiCheck=()=>{setAiChecking(true);setTimeout(()=>{setAiChecking(false);setAiResult({pass:true,score:87,checks:[{label:'Format konten sesuai',pass:true},{label:'Hashtag terdeteksi',pass:true},{label:'Durasi memenuhi syarat',pass:true},{label:'Konten original (bukan duplikat)',pass:true},{label:'Tone & messaging sesuai brief',pass:false,note:'Minor: pertimbangkan tambah CTA'}]});},2000)};


    return(<div key={k} className="flex flex-col gap-4" style={{paddingBottom:100}}>
      {/* Back */}
      <button onClick={()=>nav('misi')} className="stagger-1" style={{color:C.textSec,fontSize:13,fontWeight:600,background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:4,paddingTop:4}}>
        <MI name="arrow_back" size={18} style={{color:C.textSec}}/> Kembali
      </button>

      {/* Header + Reward */}
      <div className="stagger-1">
        <div className="flex items-center gap-2 mb-2">
          <div style={{width:28,height:28,borderRadius:8,background:typeBg(m.type),display:'flex',alignItems:'center',justifyContent:'center'}}>
            <MI name={typeIcon(m.type)} size={14} fill style={{color:tc}}/>
          </div>
          <span style={{fontSize:11,fontWeight:700,color:tc,textTransform:'uppercase',letterSpacing:1}}>{m.type}</span>
          <span style={{marginLeft:'auto',background:typeBg(m.type),color:tc,borderRadius:6,padding:'3px 8px',fontSize:10,fontWeight:700}}>{m.status}</span>
        </div>
        <h2 style={{fontSize:20,fontWeight:800,color:C.text,lineHeight:1.2,marginBottom:6}}>{m.title}</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <span style={{background:C.goldLight,color:C.gold,borderRadius:8,padding:'4px 12px',fontSize:13,fontWeight:800,fontFamily:"'JetBrains Mono'",border:'1px solid rgba(251,191,36,0.2)'}}>+{m.xp} XP</span>
          {m.bonus&&<span style={{background:C.greenLight,color:C.green,borderRadius:8,padding:'4px 10px',fontSize:11,fontWeight:700,border:'1px solid rgba(34,197,94,0.2)'}}>+{m.bonus} bonus</span>}
          <span style={{fontSize:11,color:C.textMuted}}>
            <MI name="group" size={14} style={{verticalAlign:'middle',marginRight:2}}/>{m.participants}
          </span>
          <span style={{fontSize:11,color:C.textMuted}}>
            <MI name="schedule" size={14} style={{verticalAlign:'middle',marginRight:2}}/>{m.deadline}
          </span>
        </div>
        {/* Joined Status Banner */}
        {isJoined&&(
          <div style={{marginTop:10,padding:'8px 12px',borderRadius:8,background:jm.status==='TERDAFTAR'?C.orangeLight:jm.status==='SUBMITTED'?C.tealLight:jm.status==='REVIEW'?C.purpleLight:C.greenLight,border:`1px solid ${jm.status==='TERDAFTAR'?C.orange+'30':jm.status==='SUBMITTED'?C.teal+'30':jm.status==='REVIEW'?C.purple+'30':C.green+'30'}`,display:'flex',alignItems:'center',gap:8}}>
            <MI name={jm.status==='TERDAFTAR'?'how_to_reg':jm.status==='SUBMITTED'?'upload_file':jm.status==='REVIEW'?'rate_review':'check_circle'} size={16} fill={jm.status==='SELESAI'} style={{color:jm.status==='TERDAFTAR'?C.orange:jm.status==='SUBMITTED'?C.teal:jm.status==='REVIEW'?C.purple:C.green}}/>
            <div className="flex-1">
              <p style={{fontSize:11,fontWeight:700,color:jm.status==='TERDAFTAR'?C.orange:jm.status==='SUBMITTED'?C.teal:jm.status==='REVIEW'?C.purple:C.green}}>
                {jm.status==='TERDAFTAR'?'Terdaftar — Upload konten sebelum deadline':jm.status==='SUBMITTED'?'Konten sudah disubmit — Menunggu review':jm.status==='REVIEW'?'Konten sedang direview admin':'Misi selesai!'}
              </p>
              <p style={{fontSize:9,color:C.textMuted,marginTop:1}}>Bergabung: {jm.joinedAt}{jm.submittedAt?` · Submit: ${jm.submittedAt}`:''}</p>
            </div>
          </div>
        )}
      </div>

      {/* Step Indicator */}
      {!done&&(
        <div className="stagger-2 flex items-center gap-1" style={{padding:'4px 0'}}>
          {steps.map((s,i)=>(
            <div key={i} className="flex items-center" style={{flex:i<steps.length-1?1:'none'}}>
              <button onClick={()=>setStep(i)} style={{
                width:34,height:34,borderRadius:10,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
                background:i===step?C.primary:i<step?C.green:C.surface,
                border:i>step?`1px solid ${C.border}`:'none',transition:'all 200ms',
              }}>
                {i<step?<MI name="check" size={16} style={{color:'white'}}/>:
                  <MI name={s.icon} size={16} style={{color:i===step?'white':C.textMuted}}/>}
              </button>
              {i<steps.length-1&&<div style={{flex:1,height:2,background:i<step?C.green:C.border,margin:'0 4px',borderRadius:2}}/>}
            </div>
          ))}
        </div>
      )}
      {!done&&<p style={{fontSize:12,fontWeight:700,color:C.primary,textAlign:'center',marginTop:-4}}>Step {step+1}: {steps[step].label}</p>}

      {/* ══════════ STEP 0: BRIEFING ══════════ */}
      {step===0&&(<div key="step0" className="step-enter flex flex-col gap-4">
        <Card className="stagger-3">
          <h3 className="flex items-center gap-1" style={{fontSize:12,fontWeight:700,color:C.textMuted,letterSpacing:1.5,textTransform:'uppercase',marginBottom:6}}>Briefing Misi <Tip text="Baca brief dengan teliti. Konten harus sesuai semua spesifikasi untuk lolos review."><MI name="info" size={11} style={{color:C.textMuted,cursor:'pointer'}}/></Tip></h3>
          <p style={{fontSize:13,color:C.textSec,lineHeight:1.6,marginBottom:12}}>{m.desc}</p>

          {/* Content Spec */}
          {m.contentSpec&&(
            <div style={{background:C.surfaceLight,borderRadius:10,padding:14,border:`1px solid ${C.border}`}}>
              <p style={{fontSize:10,fontWeight:700,color:C.primary,letterSpacing:1,textTransform:'uppercase',marginBottom:10}}>Spesifikasi Konten</p>
              <div className="grid grid-cols-2 gap-3">
                <div><p style={{fontSize:9,color:C.textMuted,fontWeight:600}}>FORMAT</p><p style={{fontSize:13,fontWeight:700,color:C.text}}>{m.contentSpec.format}</p></div>
                <div><p style={{fontSize:9,color:C.textMuted,fontWeight:600}}>TIPE</p><p style={{fontSize:13,fontWeight:700,color:C.text}}>{m.contentSpec.type}</p></div>
                {m.contentSpec.videoDuration&&<div><p style={{fontSize:9,color:C.textMuted,fontWeight:600}}>DURASI VIDEO</p><p style={{fontSize:13,fontWeight:700,color:C.text}}>{m.contentSpec.videoDuration}</p></div>}
                {m.contentSpec.aspectRatio&&<div><p style={{fontSize:9,color:C.textMuted,fontWeight:600}}>ASPECT RATIO</p><p style={{fontSize:13,fontWeight:700,color:C.text}}>{m.contentSpec.aspectRatio}</p></div>}
                {m.contentSpec.minPhotos&&<div><p style={{fontSize:9,color:C.textMuted,fontWeight:600}}>MIN FOTO</p><p style={{fontSize:13,fontWeight:700,color:C.text}}>{m.contentSpec.minPhotos} foto</p></div>}
                {m.contentSpec.minGroups&&<div><p style={{fontSize:9,color:C.textMuted,fontWeight:600}}>MIN GRUP</p><p style={{fontSize:13,fontWeight:700,color:C.text}}>{m.contentSpec.minGroups} grup</p></div>}
                {m.contentSpec.minTweets&&<div><p style={{fontSize:9,color:C.textMuted,fontWeight:600}}>MIN TWEET</p><p style={{fontSize:13,fontWeight:700,color:C.text}}>{m.contentSpec.minTweets} tweet</p></div>}
                {m.contentSpec.minPosts&&<div><p style={{fontSize:9,color:C.textMuted,fontWeight:600}}>MIN POST</p><p style={{fontSize:13,fontWeight:700,color:C.text}}>{m.contentSpec.minPosts} post</p></div>}
              </div>
              {m.contentSpec.note&&<p style={{fontSize:11,color:C.textSec,marginTop:10,lineHeight:1.4,borderTop:`1px solid ${C.border}`,paddingTop:8}}>{m.contentSpec.note}</p>}
            </div>
          )}
        </Card>

        {/* Platform & Location */}
        {(m.targetPlatforms||m.socialPlatform)&&(
          <Card className="stagger-4">
            <h3 style={{fontSize:12,fontWeight:700,color:C.textMuted,letterSpacing:1,textTransform:'uppercase',marginBottom:8}}>Platform</h3>
            {m.socialPlatform&&(
              <div className="flex items-center gap-3 mb-2" style={{padding:'8px 0'}}>
                <div style={{width:34,height:34,borderRadius:8,background:C.surfaceLight,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${C.border}`}}>
                  <SocialIcon platform={m.socialPlatform} size={16} color={pColor(m.socialPlatform)}/>
                </div>
                <div>
                  <p style={{fontSize:13,fontWeight:700,color:C.text}}>{pName(m.socialPlatform)} — {m.socialAction}</p>
                  <p style={{fontSize:10,color:C.textMuted}}>Akun: {SOCIALS.find(s=>s.platform===m.socialPlatform)?.handle}</p>
                </div>
              </div>
            )}
            {m.socialRequirements&&(
              <div style={{marginTop:4}}>
                {m.socialRequirements.map((r,i)=>(
                  <div key={i} className="flex items-center gap-2" style={{marginBottom:4}}>
                    <div style={{width:14,height:14,borderRadius:4,border:`1.5px solid ${C.border}`,flexShrink:0}}/>
                    <span style={{fontSize:12,color:C.textSec}}>{r}</span>
                  </div>
                ))}
              </div>
            )}
            {m.targetPlatforms&&!m.socialPlatform&&(
              <div className="flex flex-wrap gap-2">
                {m.targetPlatforms.map(p=>(
                  <div key={p} style={{background:C.surfaceLight,borderRadius:8,padding:'6px 12px',display:'flex',alignItems:'center',gap:5,border:`1px solid ${C.border}`}}>
                    {pIcon(p)?<MI name={pIcon(p)} size={14} style={{color:pColor(p)}}/>:<SocialIcon platform={p} size={14} color={pColor(p)}/>}
                    <span style={{fontSize:12,fontWeight:600,color:C.text}}>{pName(p)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* VISIT Location */}
        {m.visitLocation&&(
          <Card className="stagger-4" style={{borderLeft:`3px solid ${C.pink}`}}>
            <div className="flex items-center gap-2 mb-2">
              <MI name="location_on" size={18} fill style={{color:C.pink}}/>
              <h3 style={{fontSize:13,fontWeight:700,color:C.text}}>Lokasi</h3>
            </div>
            <p style={{fontSize:13,color:C.textSec}}>{m.visitLocation}</p>
            {m.locationNote&&<p style={{fontSize:11,color:C.textMuted,marginTop:2}}>{m.locationNote}</p>}
            {m.lat&&m.lng&&(
              <div style={{width:'100%',height:120,borderRadius:8,overflow:'hidden',marginTop:10,position:'relative',border:`1px solid ${C.border}`,background:C.bg}}>
                <div style={{position:'absolute',inset:0,opacity:0.08,backgroundImage:`linear-gradient(${C.border} 1px, transparent 1px), linear-gradient(90deg, ${C.border} 1px, transparent 1px)`,backgroundSize:'28px 28px'}}/>
                <div style={{position:'absolute',top:'35%',left:0,right:0,height:2,background:C.border,transform:'rotate(-5deg)',opacity:0.5}}/>
                <div style={{position:'absolute',top:0,bottom:0,left:'50%',width:2,background:C.border,transform:'rotate(3deg)',opacity:0.5}}/>
                <div style={{position:'absolute',top:'45%',left:'50%',transform:'translate(-50%,-100%)'}}>
                  <div style={{width:28,height:28,borderRadius:'50% 50% 50% 0',background:C.pink,transform:'rotate(-45deg)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 6px rgba(0,0,0,0.2)'}}>
                    <MI name="location_on" size={14} fill style={{color:'white',transform:'rotate(45deg)'}}/>
                  </div>
                </div>
                <div style={{position:'absolute',bottom:4,left:4,background:C.surface,borderRadius:4,padding:'2px 6px',fontSize:9,color:C.textSec,fontFamily:"'JetBrains Mono'",border:`1px solid ${C.border}`}}>
                  {m.lat.toFixed(4)}, {m.lng.toFixed(4)}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ── CONTENT CREATOR BRIEF: Visual & Tone ── */}
        <Card className="stagger-4" style={{borderLeft:`3px solid ${C.purple}`}}>
          <div className="flex items-center gap-2 mb-3">
            <div style={{width:28,height:28,borderRadius:8,background:C.purpleLight,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <MI name="palette" size={16} fill style={{color:C.purple}}/>
            </div>
            <h3 className="flex items-center gap-1" style={{fontSize:13,fontWeight:700,color:C.text}}>Panduan Konten <Tip text="Ikuti panduan ini agar kontenmu sesuai brief dan lolos review AI."><MI name="info" size={12} style={{color:C.textMuted,cursor:'pointer'}}/></Tip></h3>
          </div>

          {/* Mood & Tone */}
          <div className="flex gap-2 mb-3">
            <div style={{flex:1,background:C.surfaceLight,borderRadius:8,padding:10,border:`1px solid ${C.border}`,textAlign:'center'}}>
              <MI name="mood" size={18} fill style={{color:C.orange}}/>
              <p style={{fontSize:10,fontWeight:700,color:C.text,marginTop:2}}>Mood</p>
              <p style={{fontSize:11,fontWeight:600,color:C.orange}}>{m.type==='KRISIS'?'Bold & Urgent':m.type==='EDUKASI'?'Clean & Professional':'Warm & Engaging'}</p>
            </div>
            <div style={{flex:1,background:C.surfaceLight,borderRadius:8,padding:10,border:`1px solid ${C.border}`,textAlign:'center'}}>
              <MI name="record_voice_over" size={18} fill style={{color:C.primary}}/>
              <p style={{fontSize:10,fontWeight:700,color:C.text,marginTop:2}}>Gaya Bahasa</p>
              <p style={{fontSize:11,fontWeight:600,color:C.primary}}>{m.type==='KRISIS'?'Data-driven':m.type==='EDUKASI'?'Storytelling':'Kasual'}</p>
            </div>
          </div>

          {/* Hashtags */}
          {m.hashtags&&(
            <div style={{background:C.primaryLight,borderRadius:8,padding:10,border:'1px solid rgba(201,168,76,0.15)',marginBottom:10}}>
              <div className="flex items-center gap-2 mb-1">
                <MI name="tag" size={14} fill style={{color:C.primary}}/>
                <span style={{fontSize:10,fontWeight:700,color:C.primary,textTransform:'uppercase',letterSpacing:0.5}}>Hashtag Wajib</span>
              </div>
              <p style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:"'JetBrains Mono'",lineHeight:1.6}}>{m.hashtags}</p>
            </div>
          )}

          {/* Do's and Don'ts */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
            <div style={{background:`${C.green}08`,borderRadius:8,padding:10,border:`1px solid ${C.green}15`}}>
              <p style={{fontSize:10,fontWeight:700,color:C.green,marginBottom:4}}>LAKUKAN</p>
              {(m.type==='KRISIS'?['Sertakan sumber resmi','Gunakan data & fakta','Tone tegas tapi sopan']:m.type==='EDUKASI'?['Pakai infografis','Bahasa mudah dipahami','Sertakan contoh nyata']:['Konten original','Visual menarik','Ajak interaksi']).map((d,di)=>(
                <div key={di} className="flex items-start gap-1.5" style={{marginBottom:2}}>
                  <MI name="check" size={10} style={{color:C.green,marginTop:2,flexShrink:0}}/>
                  <span style={{fontSize:10,color:C.textSec,lineHeight:1.3}}>{d}</span>
                </div>
              ))}
            </div>
            <div style={{background:`${C.red}08`,borderRadius:8,padding:10,border:`1px solid ${C.red}15`}}>
              <p style={{fontSize:10,fontWeight:700,color:C.red,marginBottom:4}}>HINDARI</p>
              {(m.type==='KRISIS'?['Info belum terverifikasi','Attack personal','Bahasa provokatif']:m.type==='EDUKASI'?['Clickbait / misleading','Teks terlalu panjang','Info tanpa sumber']:['Repost tanpa credit','Konten sensitif','Spam / repetitif']).map((d,di)=>(
                <div key={di} className="flex items-start gap-1.5" style={{marginBottom:2}}>
                  <MI name="close" size={10} style={{color:C.red,marginTop:2,flexShrink:0}}/>
                  <span style={{fontSize:10,color:C.textSec,lineHeight:1.3}}>{d}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Opening Hook Suggestions */}
          <div style={{marginBottom:10}}>
            <div className="flex items-center gap-1.5 mb-2">
              <MI name="format_quote" size={14} fill style={{color:C.teal}}/>
              <span style={{fontSize:10,fontWeight:700,color:C.teal,textTransform:'uppercase',letterSpacing:0.5}}>Contoh Opening</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {(m.type==='KRISIS'?
                ['⚠️ KLARIFIKASI: Ini fakta sebenarnya...','Sebelum kamu share, baca ini dulu 👇','Banyak yang salah paham. Thread 🧵']:
                m.type==='EDUKASI'?
                ['Tau nggak sih? Ternyata...','5 hal yang jarang orang tau 📚','Thread penting! Yuk bahas... 🧵']:
                ['Hai guys! Yuk ikutan 🔥','Challenge baru nih! Siapa berani?','Konten seru yang wajib kamu coba ✨']
              ).map((hook,hi)=>(
                <div key={hi} style={{padding:'6px 10px',background:C.bg,borderRadius:6,border:`1px solid ${C.borderLight}`,fontSize:11,color:C.textSec,fontStyle:'italic',lineHeight:1.3}}>{hook}</div>
              ))}
            </div>
            <p style={{fontSize:9,color:C.textMuted,marginTop:4}}>Kamu boleh modifikasi, ini hanya contoh inspirasi</p>
          </div>

          {/* CTA */}
          <div style={{marginBottom:10}}>
            <div className="flex items-center gap-1.5 mb-2">
              <MI name="ads_click" size={14} fill style={{color:C.orange}}/>
              <span style={{fontSize:10,fontWeight:700,color:C.orange,textTransform:'uppercase',letterSpacing:0.5}}>Call to Action</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(m.type==='KRISIS'?['Share ke teman','Comment fakta yang kamu tau','Simpan untuk referensi']:['Like & share','Tag 3 temanmu','Follow untuk update','Comment pendapatmu']).map((cta,ci)=>(
                <span key={ci} style={{fontSize:10,fontWeight:600,color:C.text,background:C.surfaceLight,borderRadius:4,padding:'3px 8px',border:`1px solid ${C.borderLight}`}}>{cta}</span>
              ))}
            </div>
          </div>

          {/* Best Posting Time */}
          <div style={{background:C.surfaceLight,borderRadius:8,padding:10,border:`1px solid ${C.border}`}}>
            <div className="flex items-center gap-2 mb-2">
              <MI name="schedule" size={14} fill style={{color:C.primary}}/>
              <span style={{fontSize:10,fontWeight:700,color:C.primary,textTransform:'uppercase',letterSpacing:0.5}}>Waktu Posting Terbaik</span>
            </div>
            <div className="flex gap-2">
              {[{time:'07-09',label:'Pagi',pct:72},{time:'12-13',label:'Siang',pct:65},{time:'18-21',label:'Malam',pct:92}].map((slot,si)=>(
                <div key={si} style={{flex:1,textAlign:'center',padding:6,borderRadius:6,background:si===2?C.primaryLight:C.bg,border:`1px solid ${si===2?'rgba(201,168,76,0.2)':C.borderLight}`}}>
                  <p style={{fontSize:12,fontWeight:800,color:si===2?C.primary:C.text,fontFamily:"'JetBrains Mono'"}}>{slot.pct}%</p>
                  <p style={{fontSize:9,fontWeight:600,color:si===2?C.primary:C.textMuted}}>{slot.time}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* ── Caption Kamu (personalized) ── */}
        <Card className="stagger-4" style={{borderLeft:`3px solid ${C.teal}`}}>
          <div className="flex items-center gap-2 mb-3">
            <div style={{width:28,height:28,borderRadius:8,background:C.tealLight,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <MI name="edit_note" size={16} fill style={{color:C.teal}}/>
            </div>
            <h3 className="flex items-center gap-1" style={{fontSize:13,fontWeight:700,color:C.text}}>Caption Untukmu <Tip text="Caption yang sudah disiapkan khusus untukmu. Boleh dimodifikasi sesuai gaya kamu."><MI name="info" size={12} style={{color:C.textMuted,cursor:'pointer'}}/></Tip></h3>
          </div>
          <div style={{background:C.surfaceLight,borderRadius:10,padding:14,border:`1px solid ${C.border}`,marginBottom:8}}>
            <p style={{fontSize:13,color:C.text,lineHeight:1.6,fontStyle:'italic'}}>
              {m.type==='KRISIS'?`"⚠️ KLARIFIKASI: Berita soal ${m.title.split(':')[1]||m.title} yang viral itu TIDAK BENAR. Ini faktanya 👇\n\nBerdasarkan data resmi... [isi dengan fakta]. Jangan mudah percaya info yang belum terverifikasi!\n\n${m.hashtags||'#GERAK #Klarifikasi'}"`:
               m.type==='EDUKASI'?`"Tau nggak sih? ${m.title} itu ternyata lebih penting dari yang kita kira! 📚\n\nIni dia 3 fakta penting yang perlu kamu tau... [isi dengan fakta edukatif]\n\nShare ke teman biar makin banyak yang paham! 💡\n\n${m.hashtags||'#GERAK #Edukasi'}"`:
               `"Hai guys! Yuk ikutan campaign ${m.title}! 🔥\n\nIni cara gue berpartisipasi... [ceritakan pengalamanmu]\n\nSiapa yang udah ikutan? Tag 3 temanmu! ✨\n\n${m.hashtags||'#GERAK #GerakDigital'}"`}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>showToast('Caption disalin!')} className="btn-primary" style={{flex:1,padding:'8px 0',borderRadius:8,border:'none',background:C.teal,color:'white',fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
              <MI name="content_copy" size={14} style={{color:'white'}}/> Salin Caption
            </button>
            <button onClick={()=>showToast('Kamu boleh edit caption sesuai gayamu')} style={{flex:1,padding:'8px 0',borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',color:C.textSec,fontSize:12,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
              <MI name="edit" size={14} style={{color:C.textMuted}}/> Edit Sendiri
            </button>
          </div>
        </Card>

        {/* ── GAMIFICATION: Sistem Penilaian ── */}
        <Card className="stagger-4" style={{borderLeft:`3px solid ${C.primary}`}}>
          <div className="flex items-center gap-2 mb-3">
            <div style={{width:28,height:28,borderRadius:8,background:C.goldLight,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <MI name="emoji_events" size={16} fill style={{color:C.gold}}/>
            </div>
            <h3 className="flex items-center gap-1" style={{fontSize:13,fontWeight:700,color:C.text}}>Sistem Penilaian <Tip text="Begini cara poin misi dihitung. Selesaikan semua kriteria untuk XP maksimal!"><MI name="info" size={12} style={{color:C.textMuted,cursor:'pointer'}}/></Tip></h3>
          </div>

          {/* Base XP */}
          <div style={{background:C.surfaceLight,borderRadius:10,padding:12,border:`1px solid ${C.border}`,marginBottom:10}}>
            <div className="flex items-center justify-between mb-2">
              <span style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:'uppercase',letterSpacing:1}}>Poin Dasar</span>
              <span style={{fontSize:16,fontWeight:800,color:C.gold,fontFamily:"'JetBrains Mono'"}}>{m.xp} XP</span>
            </div>
            <p style={{fontSize:11,color:C.textSec,lineHeight:1.4}}>Didapat setelah submit diterima & lolos review</p>
          </div>

          {/* Scoring Criteria */}
          <p style={{fontSize:10,fontWeight:700,color:C.primary,letterSpacing:1,textTransform:'uppercase',marginBottom:8}}>Kriteria Penilaian</p>
          <div className="flex flex-col gap-2" style={{marginBottom:12}}>
            {[
              {icon:'check_circle',label:'Format sesuai brief',detail:'Resolusi, durasi, aspect ratio',weight:'Wajib',color:C.green},
              {icon:'tag',label:'Hashtag & caption lengkap',detail:'Semua hashtag wajib disertakan',weight:'Wajib',color:C.green},
              {icon:'auto_awesome',label:'Konten original',detail:'Bukan repost / duplikat',weight:'Wajib',color:C.green},
              {icon:'campaign',label:'Tone & messaging',detail:'Sesuai arahan brief misi',weight:'+10%',color:C.orange},
              {icon:'favorite',label:'Kualitas engagement',detail:'Like, komentar, share dari konten',weight:'+15%',color:C.purple},
            ].map((c,i)=>(
              <div key={i} className="flex items-start gap-3" style={{padding:'8px 10px',background:C.bg,borderRadius:8,border:`1px solid ${C.borderLight}`}}>
                <MI name={c.icon} size={16} fill style={{color:c.color,marginTop:1,flexShrink:0}}/>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span style={{fontSize:12,fontWeight:600,color:C.text}}>{c.label}</span>
                    <span style={{fontSize:10,fontWeight:700,color:c.color,background:`${c.color}15`,padding:'1px 6px',borderRadius:4}}>{c.weight}</span>
                  </div>
                  <span style={{fontSize:10,color:C.textMuted}}>{c.detail}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Viral Bonus Tiers */}
          <p style={{fontSize:10,fontWeight:700,color:C.primary,letterSpacing:1,textTransform:'uppercase',marginBottom:8}}>Bonus Viral</p>
          <div style={{background:`linear-gradient(135deg,${C.surface},${C.bg})`,borderRadius:10,padding:12,border:`1px solid ${C.border}`}}>
            <div className="flex flex-col gap-2">
              {[
                {views:'1K',bonus:'+25 XP',icon:'local_fire_department',color:C.orange,bg:C.orangeLight},
                {views:'10K',bonus:'+75 XP',icon:'whatshot',color:'#F97316',bg:'rgba(249,115,22,0.12)'},
                {views:'100K',bonus:'+200 XP',icon:'bolt',color:C.red,bg:C.redLight},
                {views:'1M+',bonus:'+500 XP',icon:'diamond',color:C.purple,bg:C.purpleLight},
              ].map((t,i)=>(
                <div key={i} className="flex items-center gap-3" style={{padding:'6px 8px',borderRadius:8,background:t.bg,border:`1px solid ${t.color}20`}}>
                  <MI name={t.icon} size={16} fill style={{color:t.color}}/>
                  <span style={{fontSize:12,fontWeight:600,color:C.text,flex:1}}>{t.views} views</span>
                  <span style={{fontSize:12,fontWeight:800,color:t.color,fontFamily:"'JetBrains Mono'"}}>{t.bonus}</span>
                </div>
              ))}
            </div>
            <p style={{fontSize:10,color:C.textMuted,marginTop:8,textAlign:'center'}}>Views dihitung 7 hari setelah posting</p>
          </div>

          {/* Speed & Early Bird Bonus */}
          <div className="grid grid-cols-2 gap-2" style={{marginTop:10}}>
            <div style={{background:C.tealLight,borderRadius:8,padding:10,border:`1px solid ${C.teal}20`,textAlign:'center'}}>
              <MI name="speed" size={18} fill style={{color:C.teal}}/>
              <p style={{fontSize:11,fontWeight:700,color:C.teal,marginTop:2}}>Early Bird</p>
              <p style={{fontSize:14,fontWeight:800,color:C.teal,fontFamily:"'JetBrains Mono'"}}>+{m.bonus||50} XP</p>
              <p style={{fontSize:9,color:C.textMuted,marginTop:2}}>10 orang pertama</p>
            </div>
            <div style={{background:C.purpleLight,borderRadius:8,padding:10,border:`1px solid ${C.purple}20`,textAlign:'center'}}>
              <MI name="military_tech" size={18} fill style={{color:C.purple}}/>
              <p style={{fontSize:11,fontWeight:700,color:C.purple,marginTop:2}}>Streak Bonus</p>
              <p style={{fontSize:14,fontWeight:800,color:C.purple,fontFamily:"'JetBrains Mono'"}}>+2x Multi</p>
              <p style={{fontSize:9,color:C.textMuted,marginTop:2}}>3 misi berturut-turut</p>
            </div>
          </div>
        </Card>

        {/* Consent + Next */}
        <div className="stagger-5">
          <label onClick={()=>setConsent(!consent)} className="flex items-start gap-3 tap-bounce" style={{cursor:'pointer',marginBottom:12,padding:'10px 12px',borderRadius:10,background:consent?C.primaryLight:'transparent',border:`1px solid ${consent?'rgba(201,168,76,0.2)':C.border}`,transition:'all 200ms'}}>
            <div style={{
              width:22,height:22,borderRadius:6,marginTop:1,flexShrink:0,
              background:consent?C.primary:'transparent',border:consent?'none':`2px solid ${C.border}`,
              display:'flex',alignItems:'center',justifyContent:'center',transition:'all 150ms',
              boxShadow:consent?'0 0 8px rgba(201,168,76,0.3)':'none',
            }}>{consent&&<MI name="check" size={14} style={{color:'white'}}/>}</div>
            <span style={{fontSize:12,color:consent?C.text:C.textMuted,lineHeight:1.4,fontWeight:consent?600:400,transition:'color 200ms'}}>Saya setuju berpartisipasi secara sukarela sesuai kebijakan yang berlaku.</span>
          </label>
        </div>
      </div>)}

      {/* ══════════ STEP 1: KIT & CONTOH ══════════ */}
      {step===1&&(<div key="step1" className="step-enter flex flex-col gap-4">
        {/* Kit Konten */}
        {m.templates?.length>0&&(
          <div className="stagger-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 style={{fontSize:14,fontWeight:700,color:C.text}}>Caption & Pesan</h3>
              <span style={{background:C.primaryLight,borderRadius:6,padding:'2px 8px',fontSize:10,fontWeight:700,color:C.primary}}>{m.templates.length} template</span>
            </div>
            {m.templates.map((t,i)=>(
              <Card key={i} style={{padding:14}}>
                <p style={{fontSize:13,color:C.textSec,lineHeight:1.5,fontStyle:'italic',marginBottom:10}}>"{t}"</p>
                <button onClick={e=>{e.stopPropagation();copyText(t)}} style={{width:'100%',padding:'8px 0',borderRadius:8,border:'none',background:C.primary,color:C.bg,fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                  <MI name="content_copy" size={14} style={{color:C.bg}}/> Salin Caption
                </button>
              </Card>
            ))}
          </div>
        )}

        {/* Example Media */}
        {m.exampleMedia&&m.exampleMedia.length>0&&(
          <div className="stagger-4 flex flex-col gap-3">
            <h3 style={{fontSize:14,fontWeight:700,color:C.text}}>Contoh & Referensi</h3>
            {m.exampleMedia.map((ex,i)=>(
              <Card key={i} style={{padding:14}}>
                <div className="flex items-center gap-3">
                  <div style={{width:56,height:56,borderRadius:10,background:C.surfaceLight,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${C.border}`,flexShrink:0}}>
                    <MI name={ex.type==='video'?'play_circle':'image'} size={24} style={{color:C.primary}}/>
                  </div>
                  <div className="flex-1">
                    <p style={{fontSize:13,fontWeight:700,color:C.text}}>{ex.label}</p>
                    <p style={{fontSize:11,color:C.textMuted,lineHeight:1.3,marginTop:2}}>{ex.desc}</p>
                  </div>
                  <MI name="download" size={20} style={{color:C.primary}}/>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Reference Posts to Like/Share */}
        {m.refPosts&&m.refPosts.length>0&&(
          <div className="stagger-5 flex flex-col gap-3">
            <h3 style={{fontSize:14,fontWeight:700,color:C.text}}>Post Resmi — Like & Share</h3>
            {m.refPosts.map((post,i)=>{
              const pc={instagram:'#E1306C',tiktok:'#E8E8E8',x:'#1DA1F2',facebook:'#1877F2'}[post.platform]||C.text;
              return(
              <Card key={i} style={{padding:0,overflow:'hidden'}}>
                <div className="flex items-center gap-3" style={{padding:'10px 14px',borderBottom:`1px solid ${C.borderLight}`}}>
                  <div style={{width:32,height:32,borderRadius:8,background:C.surfaceLight,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${C.border}`,fontSize:11,fontWeight:700,color:pc}}>{post.avatar}</div>
                  <div className="flex-1">
                    <p style={{fontSize:12,fontWeight:700,color:C.text}}>{post.handle}</p>
                    <div className="flex items-center gap-1"><SocialIcon platform={post.platform} size={10} color={pc}/><span style={{fontSize:10,color:C.textMuted}}>{post.author} · {post.time}</span></div>
                  </div>
                  <MI name="open_in_new" size={14} style={{color:C.textMuted}}/>
                </div>
                <div style={{padding:'10px 14px'}}>
                  <p style={{fontSize:12,color:C.text,lineHeight:1.5,whiteSpace:'pre-line'}}>{post.content}</p>
                  {post.image&&<div style={{width:'100%',height:90,borderRadius:6,marginTop:8,background:C.bg,border:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'center'}}><MI name="image" size={24} style={{color:C.textMuted}}/></div>}
                </div>
                <div className="flex items-center gap-3" style={{padding:'0 14px 6px'}}>
                  <span style={{fontSize:10,color:C.textMuted}}><MI name="favorite" size={12} style={{color:C.red,verticalAlign:'middle',marginRight:1}}/>{post.likes}</span>
                  <span style={{fontSize:10,color:C.textMuted}}><MI name="chat_bubble" size={12} style={{verticalAlign:'middle',marginRight:1}}/>{post.comments}</span>
                  <span style={{fontSize:10,color:C.textMuted}}><MI name="share" size={12} style={{verticalAlign:'middle',marginRight:1}}/>{post.shares}</span>
                </div>
                <div className="flex" style={{borderTop:`1px solid ${C.borderLight}`}}>
                  {post.actions.map((a,j)=>{
                    const ai={like:'favorite',comment:'chat_bubble',share:'share',repost:'repeat',reply:'reply'}[a]||'thumb_up';
                    const al={like:'Like',comment:'Comment',share:'Share',repost:'Repost',reply:'Reply'}[a]||a;
                    return <button key={j} onClick={e=>{e.stopPropagation();showToast(`${al} berhasil!`)}} style={{flex:1,padding:'9px 0',background:'transparent',border:'none',borderRight:j<post.actions.length-1?`1px solid ${C.borderLight}`:'none',color:C.primary,fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:3}}>
                      <MI name={ai} size={14} style={{color:C.primary}}/>{al}
                    </button>;
                  })}
                </div>
              </Card>);
            })}
          </div>
        )}

        {/* Open Platform */}
        {m.socialPlatform&&(
          <button className="stagger-6" style={{width:'100%',padding:'12px 0',borderRadius:10,border:'none',background:C.primary,color:C.bg,fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
            <SocialIcon platform={m.socialPlatform} size={16} color={C.bg}/>
            Buka {pName(m.socialPlatform)}
          </button>
        )}
      </div>)}

      {/* ══════════ STEP 2: SUBMIT ══════════ */}
      {step===2&&(<div key="step2" className="step-enter flex flex-col gap-4">
        {/* Upload Bukti */}
        <Card className="stagger-3">
          <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10}}>Upload Bukti</h3>
          {!uploaded?(
            <div onClick={()=>{setUploaded(true);showToast('Upload berhasil!')}} style={{border:`2px dashed ${C.border}`,borderRadius:10,padding:'24px 12px',textAlign:'center',cursor:'pointer',background:C.bg}}>
              <MI name="cloud_upload" size={32} style={{color:C.primary}}/>
              <p style={{fontSize:14,fontWeight:700,color:C.text,marginTop:8}}>Upload Foto / Video</p>
              <p style={{fontSize:12,color:C.textMuted,marginTop:2}}>Tap untuk pilih file</p>
              {m.contentSpec&&(
                <div className="flex gap-2 justify-center mt-3">
                  <span style={{background:C.primaryLight,color:C.primary,borderRadius:6,padding:'3px 10px',fontSize:11,fontWeight:600}}>{m.contentSpec.format}</span>
                  {m.contentSpec.videoDuration&&<span style={{background:C.purpleLight,color:C.purple,borderRadius:6,padding:'3px 10px',fontSize:11,fontWeight:600}}>{m.contentSpec.videoDuration}</span>}
                </div>
              )}
            </div>
          ):(
            <div style={{borderRadius:10,overflow:'hidden',position:'relative',border:`1px solid ${C.green}40`,background:C.greenLight}}>
              <div style={{width:'100%',height:120,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{textAlign:'center'}}>
                  <MI name="check_circle" size={32} fill style={{color:C.green}}/>
                  <p style={{fontSize:12,fontWeight:700,color:C.green,marginTop:4}}>File berhasil diupload</p>
                  <p style={{fontSize:10,color:C.textSec}}>konten_misi_{m.id}.mp4</p>
                </div>
              </div>
              {m.visitLocation&&m.lat&&(
                <div style={{position:'absolute',bottom:6,left:6,background:C.surface,borderRadius:4,padding:'2px 8px',fontSize:9,color:C.textSec,fontFamily:"'JetBrains Mono'",display:'flex',alignItems:'center',gap:3,border:`1px solid ${C.border}`}}>
                  <MI name="location_on" size={10} fill style={{color:C.pink}}/>{m.lat.toFixed(4)}, {m.lng.toFixed(4)}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Link Post */}
        {(m.socialPlatform||m.targetPlatforms)&&(
          <Card className="stagger-4">
            <div className="flex items-center gap-2 mb-2">
              <MI name="link" size={18} style={{color:C.primary}}/>
              <h3 style={{fontSize:13,fontWeight:700,color:C.text}}>Link Postingan</h3>
            </div>
            <p style={{fontSize:11,color:C.textMuted,marginBottom:8}}>Paste URL postingan kamu untuk verifikasi otomatis</p>
            <div style={{background:C.surfaceLight,borderRadius:8,padding:'10px 12px',border:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:8}}>
              <MI name="link" size={16} style={{color:C.textMuted}}/>
              <input value={linkVal} onChange={e=>setLinkVal(e.target.value)} placeholder="https://instagram.com/p/..." style={{border:'none',background:'transparent',fontSize:12,color:C.text,flex:1,outline:'none',fontFamily:'inherit'}}/>
            </div>
            {linkVal&&(
              <div className="flex items-center gap-2 mt-2" style={{background:C.greenLight,borderRadius:6,padding:'6px 10px'}}>
                <MI name="check_circle" size={14} fill style={{color:C.green}}/>
                <span style={{fontSize:11,fontWeight:600,color:C.green}}>Link terdeteksi</span>
              </div>
            )}
          </Card>
        )}

        {/* Geolocation Proof */}
        {m.visitLocation&&(
          <Card className="stagger-5" style={{borderLeft:`3px solid ${C.pink}`}}>
            <div className="flex items-center gap-2 mb-2">
              <MI name="my_location" size={18} style={{color:C.pink}}/>
              <h3 style={{fontSize:13,fontWeight:700,color:C.text}}>Verifikasi Lokasi</h3>
              {uploaded&&<span style={{marginLeft:'auto',fontSize:9,fontWeight:700,color:C.green,background:C.greenLight,padding:'2px 6px',borderRadius:4}}>OK</span>}
            </div>
            {!uploaded?(
              <p style={{fontSize:12,color:C.textMuted}}>Upload foto/video dulu untuk verifikasi geolokasi otomatis</p>
            ):(
              <div style={{background:C.surfaceLight,borderRadius:8,padding:10,border:`1px solid ${C.border}`}}>
                <div className="flex items-center gap-2 mb-1">
                  <MI name="location_on" size={14} fill style={{color:C.pink}}/>
                  <span style={{fontSize:12,fontWeight:600,color:C.text}}>{m.visitLocation}</span>
                </div>
                <p style={{fontSize:10,color:C.textMuted,fontFamily:"'JetBrains Mono'"}}>Geo: {m.lat?.toFixed(6)}, {m.lng?.toFixed(6)}</p>
                <p style={{fontSize:10,color:C.textMuted}}>Timestamp: 8 Mar 2026, 10:32 WIB</p>
                <div className="flex items-center gap-1 mt-2">
                  <MI name="check_circle" size={12} fill style={{color:C.green}}/>
                  <span style={{fontSize:10,fontWeight:600,color:C.green}}>Dalam radius 100m dari lokasi misi</span>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>)}

      {/* ══════════ STEP 3: REVIEW ══════════ */}
      {step===3&&(<div key="step3" className="step-enter flex flex-col gap-4">
        {/* AI Quality Check */}
        <Card className="stagger-3" style={{borderLeft:`3px solid ${C.primary}`}}>
          <div className="flex items-center gap-2 mb-3">
            <MI name="smart_toy" size={20} style={{color:C.primary}}/>
            <h3 style={{fontSize:14,fontWeight:700,color:C.text}}>AI Quality Check</h3>
          </div>
          {!aiResult&&!aiChecking&&(
            <div style={{textAlign:'center',padding:'12px 0'}}>
              <p style={{fontSize:13,color:C.textSec,marginBottom:12}}>Submisi kamu akan dicek otomatis oleh AI sebelum dikirim ke admin untuk review final.</p>
              <button onClick={doAiCheck} style={{background:C.primary,border:'none',borderRadius:10,padding:'12px 28px',color:C.bg,fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,margin:'0 auto'}}>
                <MI name="smart_toy" size={18} style={{color:C.bg}}/> Jalankan AI Check
              </button>
            </div>
          )}
          {aiChecking&&(
            <div style={{textAlign:'center',padding:'20px 0'}}>
              <div style={{width:40,height:40,borderRadius:'50%',border:`3px solid ${C.border}`,borderTopColor:C.primary,animation:'spin 1s linear infinite',margin:'0 auto 12px'}}/>
              <p style={{fontSize:13,fontWeight:600,color:C.text}}>AI sedang memeriksa konten...</p>
              <p style={{fontSize:11,color:C.textMuted,marginTop:4}}>Mengecek kesesuaian dengan brief misi</p>
            </div>
          )}
          {aiResult&&(
            <div>
              {/* Score */}
              <div className="flex items-center gap-3 mb-4" style={{background:aiResult.pass?C.greenLight:C.orangeLight,borderRadius:10,padding:14}}>
                <div style={{width:48,height:48,borderRadius:14,background:aiResult.pass?C.green:C.orange,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <span style={{fontSize:18,fontWeight:900,color:'white',fontFamily:"'JetBrains Mono'"}}>{aiResult.score}</span>
                </div>
                <div>
                  <p style={{fontSize:14,fontWeight:700,color:aiResult.pass?C.green:C.orange}}>{aiResult.pass?'Konten Sesuai':'Perlu Perbaikan'}</p>
                  <p style={{fontSize:11,color:C.textSec}}>AI Confidence Score: {aiResult.score}%</p>
                </div>
              </div>
              {/* Checklist */}
              {aiResult.checks.map((c,i)=>(
                <div key={i} className="flex items-start gap-2" style={{marginBottom:6}}>
                  <MI name={c.pass?'check_circle':'warning'} size={16} fill style={{color:c.pass?C.green:C.orange,flexShrink:0,marginTop:1}}/>
                  <div>
                    <p style={{fontSize:12,fontWeight:600,color:C.text}}>{c.label}</p>
                    {c.note&&<p style={{fontSize:10,color:C.orange,marginTop:1}}>{c.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Admin Review Status */}
        {aiResult&&(
          <Card className="stagger-4" style={{borderLeft:`3px solid ${C.orange}`}}>
            <div className="flex items-center gap-2 mb-2">
              <MI name="admin_panel_settings" size={20} style={{color:C.orange}}/>
              <h3 style={{fontSize:14,fontWeight:700,color:C.text}}>Review Admin</h3>
            </div>
            <div style={{background:C.orangeLight,borderRadius:10,padding:14,textAlign:'center'}}>
              <MI name="hourglass_top" size={28} style={{color:C.orange}}/>
              <p style={{fontSize:14,fontWeight:700,color:C.orange,marginTop:6}}>Menunggu Review</p>
              <p style={{fontSize:12,color:C.textSec,marginTop:4}}>Konten kamu telah lolos AI check dan dikirim ke admin. Estimasi review 1-24 jam.</p>
            </div>
            <div className="flex items-center gap-3 mt-3" style={{padding:'8px 0'}}>
              <div className="flex items-center gap-1">
                <MI name="check_circle" size={14} fill style={{color:C.green}}/>
                <span style={{fontSize:10,fontWeight:600,color:C.green}}>AI Check</span>
              </div>
              <div style={{flex:1,height:2,background:C.green,borderRadius:2}}/>
              <div className="flex items-center gap-1">
                <MI name="pending" size={14} style={{color:C.orange}}/>
                <span style={{fontSize:10,fontWeight:600,color:C.orange}}>Admin</span>
              </div>
              <div style={{flex:1,height:2,background:C.border,borderRadius:2}}/>
              <div className="flex items-center gap-1">
                <MI name="workspace_premium" size={14} style={{color:C.textMuted}}/>
                <span style={{fontSize:10,fontWeight:600,color:C.textMuted}}>XP</span>
              </div>
            </div>
          </Card>
        )}

        {/* Engagement Preview */}
        {uploaded&&(
          <Card className="stagger-5" style={{borderLeft:`3px solid ${C.green}`}}>
            <div className="flex items-center gap-2 mb-3">
              <MI name="analytics" size={18} style={{color:C.green}}/>
              <h3 style={{fontSize:13,fontWeight:700,color:C.text}}>Engagement (Live)</h3>
              <span style={{marginLeft:'auto',fontSize:9,fontWeight:700,color:C.green,background:C.greenLight,padding:'2px 6px',borderRadius:4}}>LIVE</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[{l:'Views',v:'1.2K'},{l:'Likes',v:'89'},{l:'Comments',v:'12'},{l:'Shares',v:'34'}].map((s,j)=>(
                <div key={j} style={{background:C.surfaceLight,borderRadius:6,padding:'6px 4px',textAlign:'center'}}>
                  <p style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:"'JetBrains Mono'"}}>{s.v}</p>
                  <p style={{fontSize:9,color:C.textMuted,fontWeight:600}}>{s.l}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span style={{fontSize:10,color:C.textMuted,fontWeight:600}}>Rate</span>
              <div className="flex-1"><ProgressBar progress={0.42} color={C.green} height={4}/></div>
              <span style={{fontSize:11,fontWeight:700,color:C.green,fontFamily:"'JetBrains Mono'"}}>8.4%</span>
            </div>
          </Card>
        )}
      </div>)}

      {/* ══════════ FIXED BOTTOM CTA ══════════ */}
      {!done&&(
        <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:390,maxWidth:'100vw',padding:'10px 16px 28px',background:'rgba(15,15,26,0.9)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',borderTop:`1px solid ${C.border}`,zIndex:20}}>
          {step===0&&!isJoined?(
            /* Not joined yet → "Ikut Misi" registers the member */
            <button onClick={()=>{if(consent){joinMission(m.id);setStep(1)}}} disabled={!consent} className={consent?'btn-primary':''} style={{
              width:'100%',padding:'14px 0',borderRadius:12,border:'none',
              background:consent?'linear-gradient(135deg,#C9A84C,#E8D48B)':'rgba(255,255,255,0.06)',color:consent?'#0B1120':C.textMuted,
              fontSize:15,fontWeight:700,cursor:consent?'pointer':'not-allowed',
              opacity:consent?1:0.5,transition:'all 200ms',display:'flex',alignItems:'center',justifyContent:'center',gap:6,
              boxShadow:consent?'0 4px 15px rgba(201,168,76,0.3)':'none',
            }}>
              <MI name="how_to_reg" size={18} style={{color:consent?'#0B1120':C.textMuted}}/> Ikut Misi
            </button>
          ):step===0&&isJoined?(
            /* Already joined, viewing briefing again → go to kit */
            <button onClick={()=>setStep(1)} className="btn-primary" style={{
              width:'100%',padding:'14px 0',borderRadius:12,border:'none',background:'linear-gradient(135deg,#C9A84C,#E8D48B)',
              color:'#0B1120',fontSize:15,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,
              boxShadow:'0 4px 15px rgba(201,168,76,0.3)',
            }}>
              Lihat Kit & Contoh <MI name="arrow_forward" size={18} style={{color:'#0B1120'}}/>
            </button>
          ):step===1?(
            <button onClick={()=>setStep(2)} className="btn-primary" style={{
              width:'100%',padding:'14px 0',borderRadius:12,border:'none',background:'linear-gradient(135deg,#C9A84C,#E8D48B)',
              color:'#0B1120',fontSize:15,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,
              boxShadow:'0 4px 15px rgba(201,168,76,0.3)',
            }}>
              Upload Konten <MI name="cloud_upload" size={18} style={{color:'#0B1120'}}/>
            </button>
          ):step===2?(
            <button onClick={()=>{if(uploaded){setJoinedMissions(p=>({...p,[m.id]:{...p[m.id],status:'SUBMITTED',submittedAt:'8 Mar 2026'}}));setStep(3)}}} disabled={!uploaded} className={uploaded?'btn-primary':''} style={{
              width:'100%',padding:'14px 0',borderRadius:12,border:'none',
              background:uploaded?'linear-gradient(135deg,#C9A84C,#E8D48B)':'rgba(255,255,255,0.06)',color:uploaded?'#0B1120':C.textMuted,
              fontSize:15,fontWeight:700,cursor:uploaded?'pointer':'not-allowed',
              opacity:uploaded?1:0.5,transition:'all 200ms',display:'flex',alignItems:'center',justifyContent:'center',gap:6,
              boxShadow:uploaded?'0 4px 15px rgba(201,168,76,0.3)':'none',
            }}>
              <MI name="send" size={18} style={{color:uploaded?'#0B1120':C.textMuted}}/> Kirim untuk Review
            </button>
          ):null}
          {/* Deadline reminder for joined missions */}
          {isJoined&&jm.status==='TERDAFTAR'&&step<3&&(
            <p style={{textAlign:'center',fontSize:10,color:C.orange,fontWeight:600,marginTop:6}}>
              <MI name="schedule" size={11} style={{verticalAlign:'middle',marginRight:2}}/>Deadline upload: {m.deadline}
            </p>
          )}
        </div>
      )}
    </div>);}

  /* ─── DESKTOP ADMIN DASHBOARD ─────────────────────────────────────── */
  function DesktopAdmin(){
    const sideItems=[
      {id:'dashboard',label:'Dashboard',icon:'dashboard'},
      {id:'narasi',label:'Narasi & Misi',icon:'campaign'},
      {id:'agents',label:'Anggota',icon:'group'},
    ];

    const agentsList=[
      {name:'Rina Dewi',gender:'F',age:28,tier:'Gold',missions:32,xp:6200,engagement:'14.2%',status:'active',avatar:'RD'},
      {name:'Budi Hartono',gender:'M',age:35,tier:'Gold',missions:28,xp:5800,engagement:'11.8%',status:'active',avatar:'BH'},
      {name:'Fajar Nugroho',gender:'M',age:24,tier:'Silver',missions:22,xp:5400,engagement:'16.1%',status:'active',avatar:'FN'},
      {name:'Arif Santoso',gender:'M',age:30,tier:'Silver',missions:24,xp:4820,engagement:'12.3%',status:'active',avatar:'AS'},
      {name:'Sari Utami',gender:'F',age:22,tier:'Silver',missions:20,xp:4600,engagement:'18.5%',status:'active',avatar:'SU'},
      {name:'Dewi Lestari',gender:'F',age:27,tier:'Bronze',missions:12,xp:2100,engagement:'9.4%',status:'idle',avatar:'DL'},
      {name:'Ahmad Rizki',gender:'M',age:19,tier:'Bronze',missions:8,xp:1500,engagement:'7.2%',status:'active',avatar:'AR'},
      {name:'Nina Safira',gender:'F',age:32,tier:'Bronze',missions:5,xp:800,engagement:'5.1%',status:'idle',avatar:'NS'},
    ];

    const submissionQueue=[
      {agent:'Arif Santoso',mission:'Post Reels IG: Tips Keamanan',platform:'instagram',time:'10 min lalu',aiScore:87,aiPass:true,briefMatch:92,briefChecks:[{l:'Format sesuai',ok:true},{l:'Durasi OK',ok:true},{l:'Hashtag ada',ok:true},{l:'CTA',ok:false}]},
      {agent:'Rina Dewi',mission:'Counter-Narasi Hoaks Vaksinasi',platform:'x',time:'25 min lalu',aiScore:92,aiPass:true,briefMatch:96,briefChecks:[{l:'Format sesuai',ok:true},{l:'Sumber resmi',ok:true},{l:'Multi-platform',ok:true},{l:'Tone sesuai',ok:true}]},
      {agent:'Fajar Nugroho',mission:'Duet TikTok #GerakUntukNegeri',platform:'tiktok',time:'1 jam lalu',aiScore:64,aiPass:false,briefMatch:58,briefChecks:[{l:'Format sesuai',ok:true},{l:'Durasi OK',ok:false},{l:'Hashtag ada',ok:false},{l:'Original',ok:true}]},
      {agent:'Sari Utami',mission:'Literasi Digital ke 5 Grup',platform:'whatsapp',time:'2 jam lalu',aiScore:95,aiPass:true,briefMatch:98,briefChecks:[{l:'Min 5 grup',ok:true},{l:'Min 20 anggota',ok:true},{l:'Pesan sesuai',ok:true},{l:'Lampiran ada',ok:true}]},
    ];

    const DCard=({children,style={},title,subtitle,action})=>(
      <div className="card-interactive" style={{background:C.surface,borderRadius:16,border:`1px solid ${C.border}`,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,0.2)',...style}}>
        {(title||action)&&<div className="flex items-center justify-between" style={{padding:'16px 20px',borderBottom:`1px solid ${C.borderLight}`}}>
          <div>
            {title&&<h3 style={{fontSize:15,fontWeight:700,color:C.text}}>{title}</h3>}
            {subtitle&&<p style={{fontSize:12,color:C.textMuted,marginTop:2}}>{subtitle}</p>}
          </div>
          {action}
        </div>}
        <div style={{padding:20}}>{children}</div>
      </div>
    );

    return(
      <div style={{display:'flex',minHeight:'100vh',background:C.bg,position:'relative',overflow:'hidden'}}>
        {/* Background Orbs */}
        <div className="orb orb-1" style={{width:400,height:400,background:'radial-gradient(circle,rgba(201,168,76,0.08),transparent 70%)',top:-100,right:'20%'}}/>
        <div className="orb orb-2" style={{width:300,height:300,background:'radial-gradient(circle,rgba(201,168,76,0.06),transparent 70%)',bottom:100,left:'10%'}}/>

        {/* Sidebar */}
        <aside style={{width:240,background:'rgba(15,15,26,0.8)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',borderRight:`1px solid ${C.border}`,padding:'20px 0',flexShrink:0,display:'flex',flexDirection:'column',zIndex:2}}>
          <div className="flex items-center gap-2 px-5 mb-6">
            <GerakMark size={24}/><div>
              <h1 className="shimmer-text" style={{fontSize:16,fontWeight:800,letterSpacing:1.5}}>GERAK</h1>
              <p style={{fontSize:8,color:C.textMuted,letterSpacing:2,textTransform:'uppercase'}}>Admin Panel</p>
            </div>
          </div>
          <nav className="flex flex-col gap-1 px-3">
            {sideItems.map(s=>(
              <button key={s.id} onClick={()=>{setAdSideTab(s.id);setAdSubTab(s.id==='dashboard'?'ringkasan':s.id==='narasi'?'monitoring':'');}} style={{
                display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,border:'none',cursor:'pointer',
                background:adSideTab===s.id?C.primaryLight:'transparent',color:adSideTab===s.id?C.primary:C.textSec,
                fontSize:13,fontWeight:adSideTab===s.id?700:500,textAlign:'left',transition:'all 200ms',width:'100%',
              }}>
                <MI name={s.icon} size={20} fill={adSideTab===s.id} style={{color:adSideTab===s.id?C.primary:C.textMuted}}/>{s.label}
              </button>
            ))}
          </nav>
          <div style={{marginTop:'auto',padding:'0 16px'}}>
            <button onClick={()=>setMode('member')} className="btn-ghost" style={{width:'100%',padding:'10px 0',borderRadius:10,border:`1px solid ${C.border}`,background:'transparent',color:C.textSec,fontSize:12,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              <MI name="phone_iphone" size={16}/> Member View
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main style={{flex:1,overflow:'auto',padding:28,zIndex:1}}>
          {/* Top Bar */}
          <div className="flex items-center justify-between" style={{marginBottom:24}}>
            <div>
              <h1 style={{fontSize:24,fontWeight:800,color:C.text}}>{adSideTab==='missionDetail'?'Detail Misi':sideItems.find(s=>s.id===adSideTab)?.label}</h1>
              <p style={{fontSize:13,color:C.textMuted}}>GERAK Command Center · {new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
            </div>
            <div className="flex items-center gap-3">
              <div style={{position:'relative'}}>
                <div style={{width:40,height:40,borderRadius:12,background:C.surfaceLight,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${C.border}`,cursor:'pointer',backdropFilter:'blur(12px)'}}>
                  <MI name="notifications" size={20} style={{color:C.text}}/>
                </div>
                <div className="dot-live" style={{position:'absolute',top:8,right:8,width:7,height:7,borderRadius:'50%',background:C.red}}/>
              </div>
              <div style={{width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,#C9A84C,#E8D48B)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'white',boxShadow:'0 0 12px rgba(201,168,76,0.3)'}}>AD</div>
            </div>
          </div>

          {/* ═══ DASHBOARD ═══ */}
          {adSideTab==='dashboard'&&(<div className="flex flex-col gap-5">
            {/* Sub-tab toggle */}
            <div className="flex gap-2" style={{background:C.surface,borderRadius:10,padding:4,border:`1px solid ${C.border}`,width:'fit-content'}}>
              {[{id:'ringkasan',label:'Ringkasan',icon:'dashboard'},{id:'analytics',label:'Analytics',icon:'analytics'}].map(t=>(
                <button key={t.id} onClick={()=>setAdSubTab(t.id)} style={{
                  padding:'8px 16px',borderRadius:8,border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:6,
                  background:adSubTab===t.id?C.primaryLight:'transparent',color:adSubTab===t.id?C.primary:C.textSec,
                  fontSize:12,fontWeight:adSubTab===t.id?700:500,transition:'all 200ms',
                }}>
                  <MI name={t.icon} size={16} fill={adSubTab===t.id} style={{color:adSubTab===t.id?C.primary:C.textMuted}}/>{t.label}
                </button>
              ))}
            </div>

            {adSubTab==='ringkasan'&&(<>
            {/* Stats Row */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
              {[{icon:'group',label:'Total Anggota',value:ADMIN_STATS.totalAgents.toLocaleString(),color:C.primary,bg:C.primaryLight,sub:'+24 minggu ini'},
                {icon:'person_check',label:'Aktif Hari Ini',value:ADMIN_STATS.activeToday.toString(),color:C.green,bg:C.greenLight,sub:`${Math.round(ADMIN_STATS.activeToday/ADMIN_STATS.totalAgents*100)}% dari total`},
                {icon:'target',label:'Misi Aktif',value:ADMIN_STATS.missionsActive.toString(),color:C.gold,bg:C.goldLight,sub:`${ADMIN_STATS.missionsCompleted} selesai total`},
                {icon:'public',label:'Total Reach',value:ADMIN_STATS.totalReach,color:C.purple,bg:C.purpleLight,sub:`Avg ${ADMIN_STATS.avgEngagement} engagement`},
              ].map((s,i)=>(
                <DCard key={i} style={{padding:0}}>
                  <div style={{padding:20}}>
                    <div className="flex items-center gap-3">
                      <div style={{width:40,height:40,borderRadius:10,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <MI name={s.icon} size={20} fill style={{color:s.color}}/>
                      </div>
                      <div>
                        <p style={{fontSize:24,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'"}}>{s.value}</p>
                        <p style={{fontSize:11,color:C.textMuted}}>{s.label}</p>
                      </div>
                    </div>
                    <p style={{fontSize:10,color:s.color,fontWeight:600,marginTop:8}}>{s.sub}</p>
                  </div>
                </DCard>
              ))}
            </div>

            {/* Two columns */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              {/* Submission Queue */}
              <DCard title="Antrian Review" subtitle={`${submissionQueue.length} submisi menunggu`}>
                {submissionQueue.map((s,i)=>(
                  <div key={i} style={{padding:'12px 0',borderBottom:i<submissionQueue.length-1?`1px solid ${C.borderLight}`:'none'}}>
                    <div className="flex items-center gap-3">
                      <div style={{width:40,height:40,borderRadius:10,background:s.aiPass?C.greenLight:C.orangeLight,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',flexShrink:0}}>
                        <span style={{fontSize:13,fontWeight:800,color:s.aiPass?C.green:C.orange,fontFamily:"'JetBrains Mono'",lineHeight:1}}>{s.aiScore}</span>
                        <span style={{fontSize:7,fontWeight:600,color:s.aiPass?C.green:C.orange,opacity:0.7}}>AI</span>
                      </div>
                      <div className="flex-1">
                        <p style={{fontSize:13,fontWeight:600,color:C.text}}>{s.agent}</p>
                        <p style={{fontSize:11,color:C.textMuted}}>{s.mission} · {s.time}</p>
                      </div>
                      <div style={{textAlign:'center',flexShrink:0}}>
                        <p style={{fontSize:15,fontWeight:800,color:s.briefMatch>=80?C.green:s.briefMatch>=60?C.orange:C.red,fontFamily:"'JetBrains Mono'"}}>{s.briefMatch}%</p>
                        <p style={{fontSize:8,fontWeight:600,color:C.textMuted}}>BRIEF MATCH</p>
                      </div>
                      <div className="flex gap-2">
                        <button style={{padding:'6px 12px',borderRadius:6,border:'none',background:C.green,color:'white',fontSize:11,fontWeight:700,cursor:'pointer'}}>Approve</button>
                        <button style={{padding:'6px 12px',borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',color:C.textSec,fontSize:11,fontWeight:600,cursor:'pointer'}}>Detail</button>
                      </div>
                    </div>
                    {/* Brief compliance checks */}
                    <div className="flex gap-2 mt-2 ml-12">
                      {s.briefChecks.map((bc,j)=>(
                        <span key={j} style={{fontSize:9,fontWeight:600,padding:'2px 6px',borderRadius:4,display:'flex',alignItems:'center',gap:2,
                          background:bc.ok?C.greenLight:C.orangeLight,color:bc.ok?C.green:C.orange,
                        }}>
                          <MI name={bc.ok?'check':'close'} size={10} style={{color:bc.ok?C.green:C.orange}}/>{bc.l}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </DCard>

              {/* Platform Performance */}
              <DCard title="Platform Performance" subtitle="Engagement rate per platform">
                {PLATFORM_STATS.map((p,i)=>(
                  <div key={i} className="flex items-center gap-3" style={{padding:'10px 0',borderBottom:i<PLATFORM_STATS.length-1?`1px solid ${C.borderLight}`:'none'}}>
                    <div style={{width:36,height:36,borderRadius:8,background:C.surfaceLight,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${C.border}`}}>
                      {p.platform==='facebook'?<MI name="thumb_up" size={18} style={{color:p.color}}/>:<SocialIcon platform={p.platform} size={18} color={p.color}/>}
                    </div>
                    <div className="flex-1">
                      <p style={{fontSize:13,fontWeight:600,color:C.text}}>{p.platform==='x'?'X (Twitter)':p.platform.charAt(0).toUpperCase()+p.platform.slice(1)}</p>
                      <div style={{marginTop:4}}><ProgressBar progress={parseFloat(p.engagement)/25} color={p.color} height={4}/></div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <p style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:"'JetBrains Mono'"}}>{p.engagement}</p>
                      <p style={{fontSize:10,fontWeight:600,color:p.trend.startsWith('+')?C.green:p.trend.startsWith('-')?C.red:C.textMuted}}>{p.trend}</p>
                    </div>
                  </div>
                ))}
              </DCard>
            </div>

            {/* Active Missions with Analytics */}
            <DCard title="Misi Aktif — Analisa" subtitle={`${MISSIONS.filter(m=>m.status!=='SELESAI').length} misi sedang berjalan`}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14}}>
                {MISSIONS.filter(m=>m.status!=='SELESAI').slice(0,6).map(m=>(
                  <div key={m.id} onClick={()=>{setSelectedAdMission(m.id);setAdSideTab('missionDetail')}} style={{background:C.surfaceLight,borderRadius:12,padding:16,border:`1px solid ${C.border}`,cursor:'pointer',transition:'border-color 150ms'}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.primary} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                    <div className="flex items-center gap-2 mb-2">
                      <div style={{width:26,height:26,borderRadius:6,background:typeBg(m.type),display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <MI name={typeIcon(m.type)} size={13} fill style={{color:typeColor(m.type)}}/>
                      </div>
                      <span style={{fontSize:10,fontWeight:700,color:typeColor(m.type),textTransform:'uppercase'}}>{m.type}</span>
                      <span style={{marginLeft:'auto',fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:4,
                        background:m.status==='PRIORITAS'?C.redLight:m.status==='SIAGA'?C.orangeLight:typeBg(m.type),
                        color:m.status==='PRIORITAS'?C.red:m.status==='SIAGA'?C.orange:typeColor(m.type)}}>{m.status}</span>
                    </div>
                    <p style={{fontSize:13,fontWeight:600,color:C.text,lineHeight:1.3,marginBottom:8}} className="line-clamp-2">{m.title}</p>
                    <div className="flex items-center justify-between mb-3">
                      <span style={{fontSize:12,fontWeight:700,color:C.gold,fontFamily:"'JetBrains Mono'"}}>+{m.xp} XP</span>
                      <span style={{fontSize:10,color:C.textMuted}}>{m.participants} joined · {m.deadline}</span>
                    </div>
                    {m.analytics&&(<>
                      <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10}}>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          <div style={{textAlign:'center'}}>
                            <p style={{fontSize:13,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'"}}>{m.analytics.reach}</p>
                            <p style={{fontSize:9,color:C.textMuted,fontWeight:600}}>Reach</p>
                          </div>
                          <div style={{textAlign:'center'}}>
                            <p style={{fontSize:13,fontWeight:800,color:C.green,fontFamily:"'JetBrains Mono'"}}>{m.analytics.engagement}</p>
                            <p style={{fontSize:9,color:C.textMuted,fontWeight:600}}>Engage</p>
                          </div>
                          <div style={{textAlign:'center'}}>
                            <p style={{fontSize:13,fontWeight:800,color:m.analytics.completion>=70?C.green:m.analytics.completion>=40?C.orange:C.red,fontFamily:"'JetBrains Mono'"}}>{m.analytics.completion}%</p>
                            <p style={{fontSize:9,color:C.textMuted,fontWeight:600}}>Selesai</p>
                          </div>
                        </div>
                        <div style={{marginTop:4}}><ProgressBar progress={m.analytics.completion/100} color={m.analytics.completion>=70?C.green:m.analytics.completion>=40?C.orange:C.red} height={3}/></div>
                        <div className="flex items-center justify-between mt-2">
                          <span style={{fontSize:9,color:C.textMuted}}>Sentimen: <b style={{color:m.analytics.sentiment>=70?C.green:m.analytics.sentiment>=40?C.orange:C.red}}>{m.analytics.sentiment}%</b></span>
                          <span style={{fontSize:9,color:C.textMuted}}>Konversi: <b style={{color:C.primary}}>{m.analytics.conversionRate}</b></span>
                        </div>
                      </div>
                    </>)}
                  </div>
                ))}
              </div>
            </DCard>
            </>)}

            {adSubTab==='analytics'&&(<>
            {/* Key Metrics */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
              {[{label:'Avg Join Rate',value:'68%',icon:'person_add',color:C.primary,sub:'per misi'},
                {label:'Completion Rate',value:'74%',icon:'task_alt',color:C.green,sub:'misi diselesaikan'},
                {label:'Avg Engagement',value:'12.3%',icon:'trending_up',color:C.orange,sub:'across platforms'},
                {label:'Total Reach',value:'2.4M',icon:'public',color:C.purple,sub:'semua platform'},
              ].map((s,i)=>(
                <DCard key={i} style={{padding:0}}>
                  <div style={{padding:16}}>
                    <div className="flex items-center gap-2 mb-2">
                      <MI name={s.icon} size={18} style={{color:s.color}}/>
                      <span style={{fontSize:12,color:C.textMuted}}>{s.label}</span>
                    </div>
                    <p style={{fontSize:28,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'"}}>{s.value}</p>
                    <p style={{fontSize:10,color:C.textMuted,marginTop:2}}>{s.sub}</p>
                  </div>
                </DCard>
              ))}
            </div>

            {/* Mission Performance */}
            <DCard title="Performa per Tipe Misi" subtitle="Join rate & engagement berdasarkan tipe">
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                {[{type:'EDUKASI',join:'72%',engagement:'11.2%',completed:42},{type:'AMPLIFIKASI',join:'65%',engagement:'14.8%',completed:38},
                  {type:'KRISIS',join:'89%',engagement:'18.5%',completed:12},{type:'KOMUNITAS',join:'54%',engagement:'8.4%',completed:18},
                  {type:'VISIT',join:'45%',engagement:'22.1%',completed:28},{type:'SOCIAL',join:'78%',engagement:'16.3%',completed:34},
                ].map((t,i)=>(
                  <div key={i} style={{background:C.surfaceLight,borderRadius:10,padding:16,border:`1px solid ${C.border}`}}>
                    <div className="flex items-center gap-2 mb-3">
                      <div style={{width:28,height:28,borderRadius:8,background:typeBg(t.type),display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <MI name={typeIcon(t.type)} size={14} fill style={{color:typeColor(t.type)}}/>
                      </div>
                      <span style={{fontSize:12,fontWeight:700,color:typeColor(t.type)}}>{t.type}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div><p style={{fontSize:16,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'"}}>{t.join}</p><p style={{fontSize:9,color:C.textMuted}}>Join Rate</p></div>
                      <div><p style={{fontSize:16,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'"}}>{t.engagement}</p><p style={{fontSize:9,color:C.textMuted}}>Engage</p></div>
                      <div><p style={{fontSize:16,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'"}}>{t.completed}</p><p style={{fontSize:9,color:C.textMuted}}>Selesai</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </DCard>

            {/* Agent Performance Distribution */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <DCard title="Distribusi Tier Anggota">
                {[{tier:'Gold',count:186,pct:15,color:C.orange},{tier:'Silver',count:524,pct:42,color:C.primary},{tier:'Bronze',count:537,pct:43,color:C.textMuted}].map((t,i)=>(
                  <div key={i} className="flex items-center gap-3" style={{marginBottom:12}}>
                    <span style={{fontSize:13,fontWeight:700,color:t.color,width:60}}>{t.tier}</span>
                    <div className="flex-1"><ProgressBar progress={t.pct/100} color={t.color} height={8}/></div>
                    <span style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:"'JetBrains Mono'",width:50,textAlign:'right'}}>{t.count}</span>
                    <span style={{fontSize:11,color:C.textMuted,width:30}}>{t.pct}%</span>
                  </div>
                ))}
              </DCard>
              <DCard title="Demografi Usia">
                {[{age:'18\u201324',count:412,pct:33},{age:'25\u201334',count:498,pct:40},{age:'35\u201344',count:237,pct:19},{age:'45+',count:100,pct:8}].map((a,i)=>(
                  <div key={i} className="flex items-center gap-3" style={{marginBottom:12}}>
                    <span style={{fontSize:13,fontWeight:600,color:C.text,width:60}}>{a.age}</span>
                    <div className="flex-1"><ProgressBar progress={a.pct/100} color={C.primary} height={8}/></div>
                    <span style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:"'JetBrains Mono'",width:50,textAlign:'right'}}>{a.count}</span>
                    <span style={{fontSize:11,color:C.textMuted,width:30}}>{a.pct}%</span>
                  </div>
                ))}
              </DCard>
            </div>
            </>)}
          </div>)}

          {/* ═══ NARASI & MISI ═══ */}
          {adSideTab==='narasi'&&(<div className="flex flex-col gap-5">
            {/* Sub-tab toggle */}
            <div className="flex gap-2" style={{background:C.surface,borderRadius:10,padding:4,border:`1px solid ${C.border}`,width:'fit-content'}}>
              {[{id:'monitoring',label:'Monitoring Narasi',icon:'monitoring'},{id:'create',label:'Buat Misi',icon:'add_circle'}].map(t=>(
                <button key={t.id} onClick={()=>setAdSubTab(t.id)} style={{
                  padding:'8px 16px',borderRadius:8,border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:6,
                  background:adSubTab===t.id?C.primaryLight:'transparent',color:adSubTab===t.id?C.primary:C.textSec,
                  fontSize:12,fontWeight:adSubTab===t.id?700:500,transition:'all 200ms',
                }}>
                  <MI name={t.icon} size={16} fill={adSubTab===t.id} style={{color:adSubTab===t.id?C.primary:C.textMuted}}/>{t.label}
                </button>
              ))}
            </div>

            {adSubTab==='monitoring'&&(<>
            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <button onClick={()=>setAdSubTab('create')} className="btn-primary" style={{padding:'10px 20px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#C9A84C,#E8D48B)',color:'#0B1120',fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6,boxShadow:'0 4px 15px rgba(201,168,76,0.3)'}}>
                <MI name="add_circle" size={18} style={{color:'#0B1120'}}/>Buat Misi Baru
              </button>
              <p style={{fontSize:12,color:C.textMuted}}>Pilih topik di bawah untuk membuat misi dari data sosial media</p>
            </div>
            <div style={{display:'grid',gridTemplateColumns:`repeat(${PLATFORM_STATS.length},1fr)`,gap:12}}>
              {PLATFORM_STATS.map((p,i)=>(
                <DCard key={i} style={{padding:0}}>
                  <div style={{padding:16,textAlign:'center'}}>
                    <div style={{width:40,height:40,borderRadius:10,background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px',border:`1px solid ${C.border}`}}>
                      {p.platform==='facebook'?<MI name="thumb_up" size={20} style={{color:p.color}}/>:<SocialIcon platform={p.platform} size={20} color={p.color}/>}
                    </div>
                    <p style={{fontSize:18,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'"}}>{p.reach}</p>
                    <p style={{fontSize:10,color:C.textMuted}}>Reach</p>
                    <p style={{fontSize:11,fontWeight:700,color:p.trend.startsWith('+')?C.green:C.red,marginTop:4}}>{p.trend}</p>
                  </div>
                </DCard>
              ))}
            </div>


            {/* ── AI Narrative Engine ── */}
            <div style={{background:C.primaryLight,borderRadius:12,padding:'16px 20px',border:`1px solid ${C.primary}15`,display:'flex',alignItems:'center',gap:12}}>
              <MI name="smart_toy" size={24} style={{color:C.primary}}/>
              <div className="flex-1">
                <p style={{fontSize:14,fontWeight:700,color:C.primary}}>AI Narrative Engine</p>
                <p style={{fontSize:12,color:C.textSec}}>{ADMIN_STATS.narrativesMonitored} narasi dipantau · {ADMIN_STATS.alertsToday} alerts hari ini</p>
              </div>
              <div className="flex items-center gap-6">
                {SENTIMENT_EMOTIONS.map(e=><div key={e.key} className="flex items-center gap-1"><span style={{fontSize:16}}>{e.emoji}</span><span style={{fontSize:11,fontWeight:600,color:C.textSec}}>{e.label}</span></div>)}
              </div>
            </div>

            {NARRATIVES.map(n=>{
              const exp=expandedNarrative===n.id;
              const vc=n.aiVerdict==='TOLAK'?C.red:n.aiVerdict==='DUKUNG'?C.green:C.orange;
              const vbg=n.aiVerdict==='TOLAK'?C.redLight:n.aiVerdict==='DUKUNG'?C.greenLight:C.orangeLight;
              const userAction=narrativeActions[n.id];
              return(
              <DCard key={n.id} style={{padding:0}}>
                <div style={{padding:'16px 20px',cursor:'pointer'}} onClick={()=>setExpandedNarrative(exp?null:n.id)}>
                  <div className="flex items-center gap-3 mb-3">
                    <div style={{width:10,height:10,borderRadius:'50%',background:n.urgency==='TINGGI'?C.red:n.urgency==='SEDANG'?C.orange:C.green}}/>
                    <h3 style={{fontSize:16,fontWeight:700,color:C.text,flex:1}}>{n.topic}</h3>
                    <PositiveMeter percent={n.positivePercent}/>
                    <span style={{fontSize:11,fontWeight:700,color:vc,background:vbg,padding:'4px 12px',borderRadius:6}}>AI: {n.aiVerdict} ({n.aiConfidence}%)</span>
                    {userAction&&<span style={{fontSize:11,fontWeight:700,padding:'4px 12px',borderRadius:6,
                      background:userAction==='DUKUNG'?C.green:userAction==='TOLAK'?C.red:C.orange,color:'white',
                    }}>Aksi: {userAction}</span>}
                    <span style={{fontSize:12,color:C.textMuted}}>Vol: {n.volume}</span>
                    <MI name={exp?'expand_less':'expand_more'} size={20} style={{color:C.textMuted}}/>
                  </div>
                  {/* Compact sentiment bar in collapsed view */}
                  <SentimentChart breakdown={n.sentimentBreakdown} compact/>
                </div>
                {exp&&(
                  <div style={{padding:'0 20px 20px'}}>
                    {/* Sentiment Analysis Panel */}
                    <div style={{background:C.bg,borderRadius:12,padding:20,marginBottom:16,border:`1px solid ${C.borderLight}`}}>
                      <div className="flex items-center gap-2 mb-4">
                        <MI name="bar_chart" size={20} style={{color:C.primary}}/>
                        <span style={{fontSize:14,fontWeight:700,color:C.text}}>Analisis Sentimen</span>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                        {/* Sentiment bars */}
                        <div>
                          <SentimentChart breakdown={n.sentimentBreakdown}/>
                          <div style={{marginTop:12}}>
                            {SENTIMENT_EMOTIONS.map(e=>(
                              <div key={e.key} className="flex items-center gap-3" style={{marginBottom:6}}>
                                <span style={{fontSize:16,width:24}}>{e.emoji}</span>
                                <span style={{fontSize:12,fontWeight:600,color:C.text,width:50}}>{e.label}</span>
                                <div style={{flex:1}}><ProgressBar progress={n.sentimentBreakdown[e.key]/100} color={e.color} height={8}/></div>
                                <span style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:"'JetBrains Mono'",width:36,textAlign:'right'}}>{n.sentimentBreakdown[e.key]}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Positive meter + trend */}
                        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12}}>
                          <div style={{width:100,height:100,borderRadius:'50%',background:n.positivePercent>=50?`${C.green}15`:n.positivePercent>=25?`${C.orange}15`:`${C.red}15`,display:'flex',alignItems:'center',justifyContent:'center',border:`3px solid ${n.positivePercent>=50?C.green:n.positivePercent>=25?C.orange:C.red}`}}>
                            <div style={{textAlign:'center'}}>
                              <p style={{fontSize:28,fontWeight:900,color:n.positivePercent>=50?C.green:n.positivePercent>=25?C.orange:C.red,fontFamily:"'JetBrains Mono'",lineHeight:1}}>{n.positivePercent}%</p>
                              <p style={{fontSize:9,color:C.textMuted,fontWeight:600}}>POSITIF</p>
                            </div>
                          </div>
                          <p style={{fontSize:12,color:C.textSec,textAlign:'center'}}>Volume <b style={{color:C.text}}>{n.volume}</b> · Trend <span style={{fontWeight:700,color:n.trend.startsWith('+')?C.red:C.green}}>{n.trend}</span></p>
                        </div>
                      </div>
                    </div>

                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                      <div style={{background:C.primaryLight,borderRadius:10,padding:16,border:`1px solid ${C.primary}10`}}>
                        <div className="flex items-center gap-2 mb-2">
                          <MI name="smart_toy" size={18} style={{color:C.primary}}/>
                          <span style={{fontSize:13,fontWeight:700,color:C.primary}}>Rekomendasi AI</span>
                        </div>
                        <p style={{fontSize:13,color:C.textSec,lineHeight:1.6,marginBottom:10}}>{n.aiReason}</p>
                        <div style={{background:C.bg,borderRadius:8,padding:12,border:`1px solid ${C.border}`}}>
                          <p style={{fontSize:11,fontWeight:700,color:C.primary,marginBottom:4}}>SARAN AKSI</p>
                          <p style={{fontSize:13,color:C.textSec,lineHeight:1.5}}>{n.aiSuggestion}</p>
                        </div>
                      </div>
                      <div>
                        <p style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:8}}>SUMBER</p>
                        {n.sources.map((s,j)=>(
                          <div key={j} className="flex items-center gap-3" style={{marginBottom:8,padding:10,background:C.bg,borderRadius:8}}>
                            <div style={{width:28,height:28,borderRadius:6,background:C.surfaceLight,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${C.border}`}}>
                              {s.platform==='whatsapp'?<MI name="chat" size={14} style={{color:'#25D366'}}/>:
                               s.platform==='facebook'?<MI name="thumb_up" size={14} style={{color:'#1877F2'}}/>:
                               <SocialIcon platform={s.platform} size={14} color={PLATFORM_STATS.find(p=>p.platform===s.platform)?.color||C.text}/>}
                            </div>
                            <div>
                              <span style={{fontSize:12,fontWeight:600,color:C.text}}>{s.platform.charAt(0).toUpperCase()+s.platform.slice(1)} · {s.count}</span>
                              <p style={{fontSize:11,color:C.textMuted,fontStyle:'italic'}}>"{s.sample}"</p>
                            </div>
                          </div>
                        ))}
                        {n.aiCounterNarrative.length>0&&<>
                          <p style={{fontSize:12,fontWeight:700,color:C.textMuted,margin:'12px 0 6px'}}>COUNTER-NARASI</p>
                          {n.aiCounterNarrative.map((cn,j)=>(
                            <div key={j} style={{padding:10,background:C.greenLight,borderRadius:8,marginBottom:6,border:`1px solid ${C.green}30`}}>
                              <p style={{fontSize:12,color:C.green,lineHeight:1.4,fontWeight:500}}>{cn}</p>
                            </div>
                          ))}
                        </>}
                      </div>
                    </div>

                    {/* User Action Buttons */}
                    <div style={{marginTop:16,padding:16,background:C.surfaceLight,borderRadius:10,border:`1px solid ${C.border}`}}>
                      <p style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:10,textTransform:'uppercase',letterSpacing:0.5}}>Pilih Aksi untuk Narasi Ini</p>
                      <div className="flex gap-3">
                        {[{action:'DUKUNG',icon:'thumb_up',label:'Dukung Narasi',desc:'Amplifikasi konten positif',color:C.green,bg:C.greenLight},
                          {action:'TOLAK',icon:'block',label:'Tolak Narasi',desc:'Deploy counter-narasi',color:C.red,bg:C.redLight},
                          {action:'MONITOR',icon:'visibility',label:'Monitor Saja',desc:'Pantau perkembangan',color:C.orange,bg:C.orangeLight},
                        ].map(a=>{
                          const isActive=userAction===a.action;
                          return <button key={a.action} onClick={()=>{setNarrativeActions(prev=>({...prev,[n.id]:isActive?undefined:a.action}));showToast(isActive?'Aksi dibatalkan':`Narasi di-${a.label.split(' ')[0].toLowerCase()}`)}} style={{
                            flex:1,padding:'14px 12px',borderRadius:10,border:isActive?'none':`1.5px solid ${a.color}40`,cursor:'pointer',
                            background:isActive?a.color:a.bg,color:isActive?'white':a.color,textAlign:'center',transition:'all 200ms',
                          }}>
                            <MI name={a.icon} size={22} fill={isActive} style={{color:isActive?'white':a.color,display:'block',margin:'0 auto 4px'}}/>
                            <p style={{fontSize:13,fontWeight:700}}>{a.label}</p>
                            <p style={{fontSize:10,fontWeight:500,opacity:0.8,marginTop:2}}>{a.desc}</p>
                          </button>;
                        })}
                      </div>
                    </div>

                    {/* Deploy / Create Mission Flow */}
                    {userAction&&userAction!=='MONITOR'&&!narrativeMissionFlow&&(
                      <button onClick={()=>{
                        setMissionForm(f=>({...f,
                          fromNarasi:true,
                          narasiTopic:n.topic,
                          narasiAction:userAction,
                          type:userAction==='TOLAK'?'KRISIS':'AMPLIFIKASI',
                          title:userAction==='TOLAK'?`Counter-Narasi: ${n.topic}`:`Amplifikasi: ${n.topic}`,
                          desc:n.aiSuggestion||'',
                          xp:userAction==='TOLAK'?300:200,
                          platforms:n.sources?.slice(0,2).map(s=>s.platform)||['tiktok'],
                          aiPlatformRec:[
                            {platform:'tiktok',score:92,reason:'Volume terbesar, audience muda aktif',reach:'~450K'},
                            {platform:'instagram',score:78,reason:'Engagement visual tinggi',reach:'~280K'},
                            {platform:'x',score:65,reason:'Counter-narasi cepat',reach:'~120K'},
                          ],
                          aiPersonas:[
                            {name:'Gen-Z Digital Native',age:'18-24',gender:'55% Wanita',emoji:'👩‍💻',color:C.purple,traits:['Aktif TikTok & Instagram','Suka konten visual pendek'],approach:'Bahasa kasual, meme, challenge.',bestPlatform:'TikTok, IG Reels',reach:'38%'},
                            {name:'Professional Millennial',age:'25-34',gender:'58% Pria',emoji:'👨‍💼',color:C.primary,traits:['Aktif X & LinkedIn','Suka data & fakta'],approach:'Data konkret, thread informatif.',bestPlatform:'X, Instagram',reach:'32%'},
                            {name:'Community Leader',age:'35-50',gender:'52% Pria',emoji:'👨‍👩‍👧‍👦',color:C.teal,traits:['Aktif WhatsApp & Facebook','Admin grup komunitas'],approach:'Pesan formal, forward-friendly.',bestPlatform:'WA, Facebook',reach:'22%'},
                          ],
                        }));
                        setAdSubTab('create');
                        showToast('Draft misi dibuat — edit sesuai kebutuhan');
                      }} style={{
                        width:'100%',marginTop:12,padding:'14px 0',borderRadius:12,border:'none',cursor:'pointer',
                        background:userAction==='TOLAK'?C.red:C.green,color:'white',fontSize:14,fontWeight:700,
                        display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                      }}>
                        <MI name={userAction==='TOLAK'?'campaign':'trending_up'} size={20} style={{color:'white'}}/>
                        {userAction==='TOLAK'?'Buat Misi Counter-Narasi':'Buat Misi Amplifikasi'}
                      </button>
                    )}
                    {!narrativeMissionFlow||narrativeMissionFlow.narrativeId!==n.id?(
                      <button onClick={()=>setNarrativeMissionFlow({narrativeId:n.id,step:0,prompt:userAction==='TOLAK'?`Counter-narasi untuk "${n.topic}": ${n.aiSuggestion}`:`Amplifikasi narasi "${n.topic}": ${n.aiSuggestion}`,impactLevel:50,people:0,points:0})} className="btn-primary" style={{width:'100%',marginTop:8,padding:'14px 0',borderRadius:12,border:'none',background:'linear-gradient(135deg,#C9A84C,#E8D48B)',color:'#0B1120',fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 4px 15px rgba(201,168,76,0.3)'}}>
                        <MI name="auto_awesome" size={20} style={{color:'#0B1120'}}/> Buat Misi dari Narasi Ini
                      </button>
                    ):(
                      /* ═══ NARRATIVE → MISSION CREATION FLOW ═══ */
                      <div style={{marginTop:16,background:C.surfaceLight,borderRadius:16,border:`1px solid ${C.border}`,overflow:'hidden',backdropFilter:'blur(20px)'}}>
                        {/* Flow Header */}
                        <div style={{padding:'14px 16px',borderBottom:`1px solid ${C.borderLight}`,background:C.primaryLight}}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MI name="auto_awesome" size={18} style={{color:C.primary}}/>
                              <span style={{fontSize:14,fontWeight:700,color:C.primary}}>AI Mission Builder</span>
                            </div>
                            <button onClick={()=>setNarrativeMissionFlow(null)} style={{background:'none',border:'none',cursor:'pointer'}}><MI name="close" size={18} style={{color:C.textMuted}}/></button>
                          </div>
                          {/* Step indicators */}
                          <div className="flex items-center gap-2 mt-3">
                            {['Prompt','Platform','Audience','Impact','Review'].map((sl,si)=>(
                              <div key={si} className="flex items-center" style={{flex:si<4?1:'none'}}>
                                <div style={{width:24,height:24,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,
                                  background:si<=narrativeMissionFlow.step?C.primary:'rgba(255,255,255,0.06)',color:si<=narrativeMissionFlow.step?'white':C.textMuted,
                                  border:si>narrativeMissionFlow.step?`1px solid ${C.border}`:'none',transition:'all 200ms'
                                }}>{si+1}</div>
                                {si<4&&<div style={{flex:1,height:2,background:si<narrativeMissionFlow.step?C.primary:C.border,margin:'0 4px',borderRadius:2,transition:'background 200ms'}}/>}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{padding:20}}>
                          {/* STEP 0: Custom Prompt */}
                          {narrativeMissionFlow.step===0&&(<div>
                            <h4 style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:8}}>Custom Prompt untuk Misi</h4>
                            <p style={{fontSize:11,color:C.textMuted,marginBottom:10}}>Edit prompt AI untuk membuat brief misi yang sesuai dengan strategi Anda</p>
                            <textarea value={narrativeMissionFlow.prompt} onChange={e=>setNarrativeMissionFlow(f=>({...f,prompt:e.target.value}))} rows={4} style={{width:'100%',padding:'12px',borderRadius:10,border:`1px solid ${C.border}`,background:C.surfaceLight,fontSize:13,color:C.text,outline:'none',resize:'vertical',fontFamily:'inherit'}}/>
                            <button onClick={()=>setNarrativeMissionFlow(f=>({...f,step:1,
                              aiPlatformRec:[
                                {platform:'tiktok',score:92,reason:'Volume terbesar ('+n.sources.find(s=>s.platform==='tiktok')?.count+'), audience muda aktif',audienceAge:'18-24 (62%)',reach:'~450K'},
                                {platform:'x',score:78,reason:'Trending topic aktif, cocok untuk counter-narasi cepat',audienceAge:'25-34 (48%)',reach:'~120K'},
                                {platform:'instagram',score:65,reason:'Visual engagement tinggi, cocok untuk infografis',audienceAge:'25-34 (55%)',reach:'~280K'},
                              ],
                              aiEventRec:[
                                {type:'KRISIS',title:'Flash Counter-Narasi',desc:'Respons cepat 24 jam, deploy ke semua platform',urgency:'TINGGI'},
                                {type:'EDUKASI',title:'Kampanye Edukasi Berkelanjutan',desc:'Misi 7 hari, fokus literasi & fakta',urgency:'SEDANG'},
                                {type:'AMPLIFIKASI',title:'Amplifikasi Konten Positif',desc:'Boost konten positif yang sudah ada',urgency:'RENDAH'},
                              ],
                              selectedPlatform:null,selectedEvent:null,
                            }))} className="btn-primary" style={{width:'100%',marginTop:12,padding:'12px 0',borderRadius:10,border:'none',background:'linear-gradient(135deg,#C9A84C,#E8D48B)',color:'#0B1120',fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,boxShadow:'0 4px 15px rgba(201,168,76,0.3)'}}>
                              <MI name="smart_toy" size={16} style={{color:'white'}}/> Analisis dengan AI
                            </button>
                          </div>)}

                          {/* STEP 1: Platform & Event Recommendation */}
                          {narrativeMissionFlow.step===1&&(<div>
                            <h4 style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:4}}>Rekomendasi Platform</h4>
                            <p style={{fontSize:11,color:C.textMuted,marginBottom:12}}>AI merekomendasikan platform berdasarkan analisis narasi</p>
                            <div className="flex flex-col gap-2 mb-4">
                              {narrativeMissionFlow.aiPlatformRec?.map((p,pi)=>(
                                <div key={pi} onClick={()=>setNarrativeMissionFlow(f=>({...f,selectedPlatform:p.platform}))} style={{
                                  padding:14,borderRadius:12,cursor:'pointer',transition:'all 200ms',
                                  background:narrativeMissionFlow.selectedPlatform===p.platform?C.primaryLight:C.glass,
                                  border:`1px solid ${narrativeMissionFlow.selectedPlatform===p.platform?'rgba(201,168,76,0.3)':C.border}`,
                                }}>
                                  <div className="flex items-center gap-3">
                                    <div style={{width:36,height:36,borderRadius:10,background:C.surfaceLight,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${C.border}`}}>
                                      <SocialIcon platform={p.platform} size={16} color={p.platform==='tiktok'?'#fff':PLATFORM_STATS.find(ps=>ps.platform===p.platform)?.color||C.text}/>
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span style={{fontSize:13,fontWeight:700,color:C.text}}>{p.platform.charAt(0).toUpperCase()+p.platform.slice(1)}</span>
                                        <span style={{fontSize:11,fontWeight:800,color:C.primary,fontFamily:"'JetBrains Mono'",background:C.primaryLight,padding:'1px 6px',borderRadius:4}}>{p.score}%</span>
                                      </div>
                                      <p style={{fontSize:11,color:C.textMuted,marginTop:2}}>{p.reason}</p>
                                    </div>
                                    <div style={{textAlign:'right'}}>
                                      <p style={{fontSize:11,fontWeight:600,color:C.textSec}}>{p.audienceAge}</p>
                                      <p style={{fontSize:10,color:C.textMuted}}>Reach: {p.reach}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <h4 style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:4}}>Tipe Misi yang Disarankan</h4>
                            <p style={{fontSize:11,color:C.textMuted,marginBottom:10}}>Pilih strategi kampanye</p>
                            <div className="flex flex-col gap-2">
                              {narrativeMissionFlow.aiEventRec?.map((ev,ei)=>(
                                <div key={ei} onClick={()=>setNarrativeMissionFlow(f=>({...f,selectedEvent:ev.type}))} style={{
                                  padding:12,borderRadius:10,cursor:'pointer',transition:'all 200ms',
                                  background:narrativeMissionFlow.selectedEvent===ev.type?`${typeColor(ev.type)}15`:C.glass,
                                  border:`1px solid ${narrativeMissionFlow.selectedEvent===ev.type?`${typeColor(ev.type)}30`:C.border}`,
                                }}>
                                  <div className="flex items-center gap-3">
                                    <div style={{width:28,height:28,borderRadius:8,background:typeBg(ev.type),display:'flex',alignItems:'center',justifyContent:'center'}}>
                                      <MI name={typeIcon(ev.type)} size={14} fill style={{color:typeColor(ev.type)}}/>
                                    </div>
                                    <div className="flex-1">
                                      <p style={{fontSize:12,fontWeight:700,color:C.text}}>{ev.title}</p>
                                      <p style={{fontSize:10,color:C.textMuted}}>{ev.desc}</p>
                                    </div>
                                    <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:4,background:ev.urgency==='TINGGI'?C.redLight:ev.urgency==='SEDANG'?C.orangeLight:C.greenLight,color:ev.urgency==='TINGGI'?C.red:ev.urgency==='SEDANG'?C.orange:C.green}}>{ev.urgency}</span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <button onClick={()=>setNarrativeMissionFlow(f=>({...f,step:2,
                              aiAudience:{
                                totalTalking:parseInt(n.volume.replace(/[^0-9]/g,''))*100,
                                demographics:{male:58,female:42},
                                ageGroups:[{age:'18-24',pct:38},{age:'25-34',pct:32},{age:'35-44',pct:18},{age:'45+',pct:12}],
                                topCities:['Jakarta','Surabaya','Bandung','Medan','Makassar'],
                                peakHours:'18:00-22:00 WIB',
                                sentiment:{...n.sentimentBreakdown},
                              }
                            }))} disabled={!narrativeMissionFlow.selectedPlatform||!narrativeMissionFlow.selectedEvent} className="btn-primary" style={{width:'100%',marginTop:14,padding:'12px 0',borderRadius:10,border:'none',background:narrativeMissionFlow.selectedPlatform&&narrativeMissionFlow.selectedEvent?'linear-gradient(135deg,#C9A84C,#E8D48B)':'rgba(255,255,255,0.06)',color:narrativeMissionFlow.selectedPlatform&&narrativeMissionFlow.selectedEvent?'white':C.textMuted,fontSize:13,fontWeight:700,cursor:narrativeMissionFlow.selectedPlatform&&narrativeMissionFlow.selectedEvent?'pointer':'not-allowed',opacity:narrativeMissionFlow.selectedPlatform&&narrativeMissionFlow.selectedEvent?1:0.5}}>
                              Lanjut: Analisis Audience <MI name="arrow_forward" size={16}/>
                            </button>
                          </div>)}

                          {/* STEP 2: Audience Analysis */}
                          {narrativeMissionFlow.step===2&&(<div>
                            <h4 style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:12}}>Analisis Audience</h4>
                            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                              <div style={{background:C.surfaceLight,borderRadius:12,padding:14,border:`1px solid ${C.border}`,textAlign:'center'}}>
                                <p style={{fontSize:24,fontWeight:800,color:C.primary,fontFamily:"'JetBrains Mono'",lineHeight:1}}>{(narrativeMissionFlow.aiAudience?.totalTalking||0).toLocaleString()}</p>
                                <p style={{fontSize:10,color:C.textMuted,marginTop:4}}>Orang membicarakan</p>
                              </div>
                              <div style={{background:C.surfaceLight,borderRadius:12,padding:14,border:`1px solid ${C.border}`,textAlign:'center'}}>
                                <p style={{fontSize:14,fontWeight:700,color:C.gold}}>{narrativeMissionFlow.aiAudience?.peakHours}</p>
                                <p style={{fontSize:10,color:C.textMuted,marginTop:4}}>Peak Hours</p>
                              </div>
                            </div>

                            {/* Gender */}
                            <div style={{marginBottom:14}}>
                              <p style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:6}}>GENDER</p>
                              <div className="flex gap-2">
                                <div style={{flex:narrativeMissionFlow.aiAudience?.demographics.male,background:C.primaryLight,borderRadius:8,padding:'8px 10px',textAlign:'center'}}>
                                  <span style={{fontSize:13,fontWeight:700,color:C.primary}}>{narrativeMissionFlow.aiAudience?.demographics.male}% Pria</span>
                                </div>
                                <div style={{flex:narrativeMissionFlow.aiAudience?.demographics.female,background:C.pinkLight,borderRadius:8,padding:'8px 10px',textAlign:'center'}}>
                                  <span style={{fontSize:13,fontWeight:700,color:C.pink}}>{narrativeMissionFlow.aiAudience?.demographics.female}% Wanita</span>
                                </div>
                              </div>
                            </div>

                            {/* Age Groups */}
                            <div style={{marginBottom:14}}>
                              <p style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:6}}>USIA</p>
                              {narrativeMissionFlow.aiAudience?.ageGroups.map((ag,ai)=>(
                                <div key={ai} className="flex items-center gap-3" style={{marginBottom:6}}>
                                  <span style={{fontSize:12,fontWeight:600,color:C.text,width:50}}>{ag.age}</span>
                                  <div className="flex-1"><ProgressBar progress={ag.pct/100} color={C.primary} height={6}/></div>
                                  <span style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:"'JetBrains Mono'",width:35,textAlign:'right'}}>{ag.pct}%</span>
                                </div>
                              ))}
                            </div>

                            {/* Top Cities */}
                            <div style={{marginBottom:14}}>
                              <p style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:6}}>KOTA TERATAS</p>
                              <div className="flex flex-wrap gap-2">
                                {narrativeMissionFlow.aiAudience?.topCities.map((city,ci)=>(
                                  <span key={ci} style={{fontSize:11,fontWeight:600,color:C.textSec,background:C.surfaceLight,border:`1px solid ${C.border}`,borderRadius:6,padding:'4px 10px'}}>{city}</span>
                                ))}
                              </div>
                            </div>

                            {/* Sentiment of audience */}
                            <div>
                              <p style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:6}}>SENTIMEN AUDIENCE</p>
                              <SentimentChart breakdown={narrativeMissionFlow.aiAudience?.sentiment}/>
                            </div>

                            <button onClick={()=>setNarrativeMissionFlow(f=>({...f,step:3}))} className="btn-primary" style={{width:'100%',marginTop:14,padding:'12px 0',borderRadius:10,border:'none',background:'linear-gradient(135deg,#C9A84C,#E8D48B)',color:'#0B1120',fontSize:13,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 15px rgba(201,168,76,0.3)'}}>
                              Lanjut: Tentukan Impact <MI name="arrow_forward" size={16}/>
                            </button>
                          </div>)}

                          {/* STEP 3: Impact Level & People Needed */}
                          {narrativeMissionFlow.step===3&&(()=>{
                            const imp=narrativeMissionFlow.impactLevel||50;
                            const basePopulation=parseInt(n.volume.replace(/[^0-9]/g,''))*100;
                            const peopleNeeded=Math.max(10,Math.round(basePopulation*(imp/100)*0.02));
                            const pointsPerPerson=imp>=80?400:imp>=60?300:imp>=40?200:150;
                            const totalPoints=peopleNeeded*pointsPerPerson;
                            const impactLabel=imp>=80?'Dominan':imp>=60?'Signifikan':imp>=40?'Moderat':'Minimal';
                            const impactColor=imp>=80?C.green:imp>=60?C.primary:imp>=40?C.orange:C.red;
                            return(<div>
                              <h4 style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:4}}>Target Efek & Skala Misi</h4>
                              <p style={{fontSize:11,color:C.textMuted,marginBottom:16}}>Atur level dampak yang diinginkan. AI akan menghitung orang & poin yang diperlukan.</p>

                              {/* Impact Slider */}
                              <div style={{background:C.surfaceLight,borderRadius:16,padding:20,border:`1px solid ${C.border}`,marginBottom:16}}>
                                <div className="flex items-center justify-between mb-3">
                                  <span style={{fontSize:12,fontWeight:700,color:C.textMuted}}>LEVEL DAMPAK</span>
                                  <span style={{fontSize:18,fontWeight:800,color:impactColor,fontFamily:"'JetBrains Mono'"}}>{imp}%</span>
                                </div>
                                <input type="range" min={10} max={100} value={imp} onChange={e=>setNarrativeMissionFlow(f=>({...f,impactLevel:parseInt(e.target.value)}))} style={{width:'100%',accentColor:C.primary,height:6,marginBottom:8}}/>
                                <div className="flex justify-between">
                                  <span style={{fontSize:10,color:C.textMuted}}>Minimal</span>
                                  <span style={{fontSize:10,color:C.textMuted}}>Moderat</span>
                                  <span style={{fontSize:10,color:C.textMuted}}>Dominan</span>
                                </div>
                                <div style={{textAlign:'center',marginTop:12,padding:'8px 0',background:`${impactColor}12`,borderRadius:8,border:`1px solid ${impactColor}20`}}>
                                  <span style={{fontSize:14,fontWeight:800,color:impactColor}}>{impactLabel}</span>
                                  <p style={{fontSize:10,color:C.textMuted,marginTop:2}}>
                                    {imp>=80?'Ubah narasi secara menyeluruh':imp>=60?'Ciptakan counter-narasi yang kuat':imp>=40?'Kurangi dampak narasi negatif':'Monitoring & respons dasar'}
                                  </p>
                                </div>
                              </div>

                              {/* Calculated Results */}
                              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16}}>
                                <div style={{background:C.primaryLight,borderRadius:12,padding:14,textAlign:'center',border:'1px solid rgba(201,168,76,0.15)'}}>
                                  <MI name="group" size={20} style={{color:C.primary}}/>
                                  <p style={{fontSize:20,fontWeight:800,color:C.primary,fontFamily:"'JetBrains Mono'",marginTop:4}}>{peopleNeeded.toLocaleString()}</p>
                                  <p style={{fontSize:9,color:C.textMuted,fontWeight:600}}>ORANG DIBUTUHKAN</p>
                                </div>
                                <div style={{background:C.goldLight,borderRadius:12,padding:14,textAlign:'center',border:'1px solid rgba(251,191,36,0.15)'}}>
                                  <MI name="toll" size={20} style={{color:C.gold}}/>
                                  <p style={{fontSize:20,fontWeight:800,color:C.gold,fontFamily:"'JetBrains Mono'",marginTop:4}}>{pointsPerPerson}</p>
                                  <p style={{fontSize:9,color:C.textMuted,fontWeight:600}}>XP PER ORANG</p>
                                </div>
                                <div style={{background:C.greenLight,borderRadius:12,padding:14,textAlign:'center',border:'1px solid rgba(34,197,94,0.15)'}}>
                                  <MI name="savings" size={20} style={{color:C.green}}/>
                                  <p style={{fontSize:20,fontWeight:800,color:C.green,fontFamily:"'JetBrains Mono'",marginTop:4}}>{(totalPoints/1000).toFixed(1)}K</p>
                                  <p style={{fontSize:9,color:C.textMuted,fontWeight:600}}>TOTAL POIN MISI</p>
                                </div>
                              </div>

                              {/* Summary */}
                              <div style={{background:C.surfaceLight,borderRadius:12,padding:14,border:`1px solid ${C.border}`,marginBottom:12}}>
                                <p style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:6}}>RINGKASAN AI</p>
                                <p style={{fontSize:12,color:C.textSec,lineHeight:1.5}}>
                                  Untuk mencapai dampak <b style={{color:impactColor}}>{impactLabel.toLowerCase()}</b> pada narasi "{n.topic}",
                                  dibutuhkan <b style={{color:C.primary}}>{peopleNeeded.toLocaleString()} anggota</b> aktif di <b style={{color:C.text}}>{narrativeMissionFlow.selectedPlatform?.charAt(0).toUpperCase()+narrativeMissionFlow.selectedPlatform?.slice(1)}</b>.
                                  Total budget poin: <b style={{color:C.gold}}>{totalPoints.toLocaleString()} XP</b>.
                                </p>
                              </div>

                              <button onClick={()=>setNarrativeMissionFlow(f=>({...f,step:4,people:peopleNeeded,points:pointsPerPerson,totalPoints,impactLabel}))} className="btn-primary" style={{width:'100%',padding:'12px 0',borderRadius:10,border:'none',background:'linear-gradient(135deg,#C9A84C,#E8D48B)',color:'#0B1120',fontSize:13,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 15px rgba(201,168,76,0.3)'}}>
                                Review & Buat Misi <MI name="arrow_forward" size={16}/>
                              </button>
                            </div>);
                          })()}

                          {/* STEP 4: Final Review & Create */}
                          {narrativeMissionFlow.step===4&&(<div>
                            <h4 style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:12}}>Review Misi</h4>
                            <div style={{background:C.surfaceLight,borderRadius:12,padding:16,border:`1px solid ${C.border}`,marginBottom:12}}>
                              <div className="flex items-center gap-3 mb-3">
                                <div style={{width:32,height:32,borderRadius:8,background:typeBg(narrativeMissionFlow.selectedEvent||'EDUKASI'),display:'flex',alignItems:'center',justifyContent:'center'}}>
                                  <MI name={typeIcon(narrativeMissionFlow.selectedEvent||'EDUKASI')} size={16} fill style={{color:typeColor(narrativeMissionFlow.selectedEvent||'EDUKASI')}}/>
                                </div>
                                <div>
                                  <p style={{fontSize:14,fontWeight:700,color:C.text}}>{narrativeMissionFlow.aiEventRec?.find(e=>e.type===narrativeMissionFlow.selectedEvent)?.title}</p>
                                  <p style={{fontSize:11,color:C.textMuted}}>Narasi: {n.topic}</p>
                                </div>
                              </div>
                              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                                {[
                                  {l:'Platform',v:narrativeMissionFlow.selectedPlatform?.charAt(0).toUpperCase()+narrativeMissionFlow.selectedPlatform?.slice(1)},
                                  {l:'Dampak',v:narrativeMissionFlow.impactLabel},
                                  {l:'Anggota Dibutuhkan',v:narrativeMissionFlow.people?.toLocaleString()},
                                  {l:'XP per Orang',v:narrativeMissionFlow.points?.toLocaleString()+' XP'},
                                  {l:'Total Budget XP',v:narrativeMissionFlow.totalPoints?.toLocaleString()+' XP'},
                                  {l:'Aksi Narasi',v:userAction||'–'},
                                ].map((item,ii)=>(
                                  <div key={ii} style={{padding:'6px 0',borderBottom:`1px solid ${C.borderLight}`}}>
                                    <p style={{fontSize:9,fontWeight:600,color:C.textMuted,textTransform:'uppercase'}}>{item.l}</p>
                                    <p style={{fontSize:13,fontWeight:700,color:C.text}}>{item.v}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <button onClick={()=>{
                              const flow=narrativeMissionFlow;
                              const evRec=flow.aiEventRec?.find(e=>e.type===flow.selectedEvent);
                              const aud=flow.aiAudience;
                              setMissionForm(f=>({...f,
                                fromNarasi:true,
                                narasiTopic:n.topic,
                                narasiAction:userAction,
                                type:flow.selectedEvent||'EDUKASI',
                                title:evRec?.title||'',
                                desc:flow.prompt||'',
                                xp:flow.points||200,
                                platforms:flow.selectedPlatform?[flow.selectedPlatform]:[],
                                targetGender:aud?.demographics?.male>60?'male':aud?.demographics?.female>60?'female':'all',
                                targetAge:aud?.ageGroups?.[0]?.age||'all',
                                targetCities:aud?.topCities||[],
                                maxPeople:flow.people||0,
                                aiPlatformRec:flow.aiPlatformRec||[],
                                aiPersonas:[
                                  {name:'Gen-Z Digital Native',age:'18-24',gender:'55% Wanita',emoji:'👩‍💻',color:C.purple,traits:['Aktif TikTok & Instagram','Suka konten visual pendek','Mudah share ke teman'],approach:'Gunakan bahasa kasual, meme, challenge.',bestPlatform:'TikTok, Instagram Reels',reach:'38%'},
                                  {name:'Professional Millennial',age:'25-34',gender:'58% Pria',emoji:'👨‍💼',color:C.primary,traits:['Aktif X & LinkedIn','Suka data & fakta','Influencer di lingkungan kerja'],approach:'Sajikan data konkret, thread informatif.',bestPlatform:'X, Instagram',reach:'32%'},
                                  {name:'Community Leader',age:'35-50',gender:'52% Pria',emoji:'👨‍👩‍👧‍👦',color:C.teal,traits:['Aktif WhatsApp & Facebook','Admin grup komunitas','Trusted source'],approach:'Pesan formal terpercaya, forward-friendly.',bestPlatform:'WhatsApp, Facebook',reach:'22%'},
                                ],
                                aiAudience:aud,
                                impactLevel:flow.impactLevel,
                                impactLabel:flow.impactLabel,
                              }));
                              setAdSubTab('create');
                              setNarrativeMissionFlow(null);
                              showToast('Data AI diteruskan ke Editor Misi');
                            }} className="btn-primary" style={{width:'100%',padding:'14px 0',borderRadius:12,border:'none',background:'linear-gradient(135deg,#C9A84C,#E8D48B)',color:'#0B1120',fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 4px 15px rgba(201,168,76,0.3)'}}>
                              <MI name="edit_note" size={18} style={{color:'#0B1120'}}/> Lanjutkan ke Editor Misi
                            </button>
                            <button onClick={()=>setNarrativeMissionFlow(f=>({...f,step:3}))} style={{width:'100%',marginTop:8,padding:'10px 0',borderRadius:10,border:`1px solid ${C.border}`,background:'transparent',color:C.textSec,fontSize:12,fontWeight:600,cursor:'pointer'}}>Kembali ke Impact</button>
                          </div>)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </DCard>);
            })}

          </>)}

          {/* ═══ CREATE MISSION ═══ */}
          {adSubTab==='create'&&(()=>{
            const tc=typeColor(missionForm.type);const tb=typeBg(missionForm.type);const ti=typeIcon(missionForm.type);
            const L=({children,label,icon})=>(<div><div className="flex items-center gap-2 mb-2"><MI name={icon} size={16} style={{color:C.textMuted}}/><label style={{fontSize:12,fontWeight:700,color:C.textMuted,textTransform:'uppercase',letterSpacing:0.5}}>{label}</label></div>{children}</div>);
            const AISuggest=({text,onApply,applied})=>(<div className="flex items-center gap-2" style={{marginTop:6,padding:'6px 10px',borderRadius:6,background:applied?`${C.green}08`:C.primaryLight,border:`1px solid ${applied?`${C.green}20`:'rgba(201,168,76,0.15)'}`,transition:'all 200ms'}}>
              <MI name={applied?'check_circle':'auto_awesome'} size={13} fill={applied} style={{color:applied?C.green:C.primary,flexShrink:0}}/>
              <p style={{fontSize:10,color:applied?C.green:C.textSec,flex:1,lineHeight:1.3}}>{applied?'Diterapkan':text}</p>
              {!applied&&onApply&&<button onClick={onApply} style={{padding:'3px 8px',borderRadius:4,border:'none',background:C.primary,color:'white',fontSize:9,fontWeight:700,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap'}}>Terapkan</button>}
            </div>);
            const estPeople=missionForm.targetGender==='all'&&missionForm.targetAge==='all'&&missionForm.targetTier==='all'?1247:missionForm.targetTier==='gold'?186:missionForm.targetTier==='silver'?524:537;
            const totalBudget=(missionForm.xp||200)*Math.min(estPeople,missionForm.maxPeople||estPeople);
            return(<div className="flex flex-col gap-5">
            {/* Source indicator */}
            {missionForm.fromNarasi&&(
              <div style={{background:C.primaryLight,borderRadius:10,padding:'12px 16px',border:`1px solid rgba(201,168,76,0.15)`,display:'flex',alignItems:'center',gap:10}}>
                <MI name="auto_awesome" size={20} style={{color:C.primary}}/>
                <div className="flex-1">
                  <p style={{fontSize:13,fontWeight:700,color:C.primary}}>Misi dari Narasi: "{missionForm.narasiTopic}"</p>
                  <p style={{fontSize:11,color:C.textSec}}>AI telah mengisi draft awal. Edit dan sesuaikan semua field.</p>
                </div>
                <button onClick={()=>setMissionForm(f=>({...f,fromNarasi:false}))} style={{padding:'6px 12px',borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',color:C.textSec,fontSize:11,fontWeight:600,cursor:'pointer'}}>Sembunyikan Rekomendasi</button>
              </div>
            )}

            {/* ──── AI RECOMMENDATIONS (from narasi) ──── */}
            {missionForm.fromNarasi&&(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                {/* Narasi Context + Platform Recs */}
                <DCard title="Rekomendasi AI dari Narasi" subtitle={`Analisis narasi: "${missionForm.narasiTopic||'—'}"`}>
                  <div className="flex flex-col gap-3">
                    {/* Impact badge */}
                    <div className="flex items-center gap-3" style={{padding:12,borderRadius:10,background:'linear-gradient(135deg,rgba(201,168,76,0.1),rgba(201,168,76,0.05))',border:`1px solid rgba(201,168,76,0.15)`}}>
                      <MI name="auto_awesome" size={20} style={{color:C.primary}}/>
                      <div className="flex-1">
                        <p style={{fontSize:12,fontWeight:700,color:C.primary}}>Dampak Target: {missionForm.impactLabel||'Moderat'}</p>
                        <p style={{fontSize:10,color:C.textMuted}}>Aksi: {missionForm.narasiAction==='TOLAK'?'Counter-Narasi':'Amplifikasi'} | {missionForm.maxPeople||0} orang dibutuhkan</p>
                      </div>
                      <span style={{fontSize:16,fontWeight:800,color:C.primary,fontFamily:"'JetBrains Mono'"}}>{missionForm.impactLevel||50}%</span>
                    </div>
                    {/* Platform recommendations */}
                    <p style={{fontSize:10,fontWeight:700,color:C.textMuted,textTransform:'uppercase',letterSpacing:0.5}}>Platform Terbaik</p>
                    {(missionForm.aiPlatformRec||[
                      {platform:'tiktok',score:92,reason:'Volume terbesar, audience muda aktif',reach:'~450K'},
                      {platform:'instagram',score:78,reason:'Engagement visual tinggi, cocok infografis',reach:'~280K'},
                      {platform:'x',score:65,reason:'Trending topic aktif, counter-narasi cepat',reach:'~120K'},
                    ]).map((p,pi)=>{
                      const sel2=missionForm.platforms.includes(p.platform);
                      return <div key={pi} onClick={()=>setMissionForm(f=>({...f,platforms:sel2?f.platforms.filter(x=>x!==p.platform):[...f.platforms,p.platform]}))} style={{
                        padding:12,borderRadius:10,cursor:'pointer',transition:'all 200ms',
                        background:sel2?C.primaryLight:C.glass,border:`1px solid ${sel2?'rgba(201,168,76,0.3)':C.border}`,
                      }}>
                        <div className="flex items-center gap-3">
                          <div style={{width:32,height:32,borderRadius:8,background:C.surfaceLight,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${C.border}`}}>
                            <SocialIcon platform={p.platform} size={14} color={pColor(p.platform)}/>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span style={{fontSize:12,fontWeight:700,color:C.text}}>{pName(p.platform)}</span>
                              <span style={{fontSize:10,fontWeight:800,color:C.primary,fontFamily:"'JetBrains Mono'",background:C.primaryLight,padding:'1px 5px',borderRadius:3}}>{p.score}%</span>
                              {pi===0&&<span style={{fontSize:8,fontWeight:800,color:'white',background:C.green,padding:'1px 5px',borderRadius:3}}>TOP</span>}
                            </div>
                            <p style={{fontSize:10,color:C.textMuted}}>{p.reason}</p>
                          </div>
                          <div style={{textAlign:'right'}}>
                            <p style={{fontSize:10,color:C.textSec}}>Reach: {p.reach}</p>
                            {sel2&&<MI name="check_circle" size={16} fill style={{color:C.primary,marginTop:2}}/>}
                          </div>
                        </div>
                      </div>;
                    })}
                    <p style={{fontSize:10,color:C.textMuted,fontStyle:'italic'}}>Klik platform untuk menambah/hapus dari misi</p>
                    {/* Audience summary from AI */}
                    {missionForm.aiAudience&&(
                      <div style={{background:C.surfaceLight,borderRadius:10,padding:12,border:`1px solid ${C.border}`}}>
                        <p style={{fontSize:10,fontWeight:700,color:C.textMuted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:8}}>Audience Insight</p>
                        <div className="flex gap-3 mb-2">
                          <div className="flex-1" style={{textAlign:'center'}}>
                            <p style={{fontSize:18,fontWeight:800,color:C.primary,fontFamily:"'JetBrains Mono'"}}>{(missionForm.aiAudience.totalTalking||0).toLocaleString()}</p>
                            <p style={{fontSize:9,color:C.textMuted}}>membicarakan</p>
                          </div>
                          <div className="flex-1" style={{textAlign:'center'}}>
                            <p style={{fontSize:13,fontWeight:700,color:C.gold}}>{missionForm.aiAudience.peakHours}</p>
                            <p style={{fontSize:9,color:C.textMuted}}>peak hours</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div style={{flex:missionForm.aiAudience.demographics?.male||50,background:C.primaryLight,borderRadius:6,padding:'4px 8px',textAlign:'center'}}>
                            <span style={{fontSize:11,fontWeight:700,color:C.primary}}>{missionForm.aiAudience.demographics?.male||50}% Pria</span>
                          </div>
                          <div style={{flex:missionForm.aiAudience.demographics?.female||50,background:C.pinkLight,borderRadius:6,padding:'4px 8px',textAlign:'center'}}>
                            <span style={{fontSize:11,fontWeight:700,color:C.pink}}>{missionForm.aiAudience.demographics?.female||50}% Wanita</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </DCard>

                {/* AI Persona */}
                <DCard title="Persona Target" subtitle="Profil audience ideal untuk narasi ini">
                  <div className="flex flex-col gap-3">
                    {(missionForm.aiPersonas||[
                      {name:'Gen-Z Digital Native',age:'18-24',gender:'55% Wanita',emoji:'👩‍💻',color:C.purple,traits:['Aktif TikTok & Instagram','Suka konten visual pendek','Mudah share ke teman'],approach:'Gunakan bahasa kasual, meme, challenge.',bestPlatform:'TikTok, Instagram Reels',reach:'38%'},
                      {name:'Professional Millennial',age:'25-34',gender:'58% Pria',emoji:'👨‍💼',color:C.primary,traits:['Aktif X & LinkedIn','Suka data & fakta','Influencer di lingkungan kerja'],approach:'Sajikan data konkret, thread informatif.',bestPlatform:'X, Instagram',reach:'32%'},
                      {name:'Community Leader',age:'35-50',gender:'52% Pria',emoji:'👨‍👩‍👧‍👦',color:C.teal,traits:['Aktif WhatsApp & Facebook','Admin grup komunitas','Trusted source'],approach:'Pesan formal terpercaya, forward-friendly.',bestPlatform:'WhatsApp, Facebook',reach:'22%'},
                    ]).map((persona,i)=>(
                      <div key={i} style={{padding:14,borderRadius:12,background:C.glass,border:`1px solid ${C.border}`,position:'relative',overflow:'hidden'}}>
                        <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${persona.color},${persona.color}50)`}}/>
                        <div className="flex items-start gap-3 mb-2">
                          <div style={{width:40,height:40,borderRadius:10,background:`${persona.color}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,border:`1px solid ${persona.color}25`}}>
                            {persona.emoji}
                          </div>
                          <div className="flex-1">
                            <p style={{fontSize:13,fontWeight:700,color:C.text}}>{persona.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span style={{fontSize:9,fontWeight:600,color:persona.color,background:`${persona.color}15`,padding:'1px 5px',borderRadius:3}}>{persona.age}</span>
                              <span style={{fontSize:9,color:C.textMuted}}>{persona.gender}</span>
                              <span style={{fontSize:9,fontWeight:700,color:C.primary,marginLeft:'auto'}}>{persona.reach}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {persona.traits.map((t,ti)=>(
                            <span key={ti} style={{fontSize:9,color:C.textSec,background:C.surfaceLight,borderRadius:3,padding:'1px 6px',border:`1px solid ${C.borderLight}`}}>{t}</span>
                          ))}
                        </div>
                        <div style={{background:C.bg,borderRadius:6,padding:'6px 8px',border:`1px solid ${C.borderLight}`}}>
                          <div className="flex items-start gap-2">
                            <MI name="lightbulb" size={12} fill style={{color:C.orange,flexShrink:0,marginTop:1}}/>
                            <p style={{fontSize:10,color:C.textSec,lineHeight:1.3}}>{persona.approach}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mt-2">
                          <MI name="devices" size={11} style={{color:C.textMuted}}/>
                          <span style={{fontSize:9,color:C.textMuted}}>Platform: </span>
                          <span style={{fontSize:9,fontWeight:600,color:persona.color}}>{persona.bestPlatform}</span>
                        </div>
                      </div>
                    ))}
                    {/* AI Insight */}
                    <div style={{background:C.primaryLight,borderRadius:8,padding:12,border:`1px solid rgba(201,168,76,0.15)`}}>
                      <div className="flex items-center gap-2 mb-1">
                        <MI name="smart_toy" size={14} style={{color:C.primary}}/>
                        <span style={{fontSize:11,fontWeight:700,color:C.primary}}>AI Insight</span>
                      </div>
                      <p style={{fontSize:11,color:C.textSec,lineHeight:1.4}}>
                        Prioritaskan persona yang sesuai dengan platform pilihan. Klik platform di sebelah kiri untuk auto-select di form misi.
                      </p>
                    </div>
                  </div>
                </DCard>
              </div>
            )}

            {/* ──── ROW 1: Type + Basic Info ──── */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
              <DCard title="Tipe & Detail Misi" subtitle="Pilih tipe dan isi informasi dasar">
                <div className="flex flex-col gap-4">
                  {/* Type selector with icons */}
                  <L label="Tipe Misi" icon="category">
                    <div className="grid grid-cols-3 gap-2">
                      {[{t:'EDUKASI',desc:'Edukasi komunitas'},{t:'AMPLIFIKASI',desc:'Boost konten'},{t:'KRISIS',desc:'Counter narasi'},{t:'KOMUNITAS',desc:'Kegiatan sosial'},{t:'VISIT',desc:'Kunjungan lokasi'},{t:'SOCIAL',desc:'Konten sosmed'}].map(({t,desc})=>(
                        <button key={t} onClick={()=>setMissionForm(f=>({...f,type:t}))} style={{
                          padding:'12px 8px',borderRadius:10,border:`1.5px solid ${missionForm.type===t?typeColor(t):C.border}`,
                          background:missionForm.type===t?typeBg(t):C.glass,color:missionForm.type===t?typeColor(t):C.textSec,
                          cursor:'pointer',textAlign:'center',transition:'all 200ms',
                        }}>
                          <MI name={typeIcon(t)} size={20} fill={missionForm.type===t} style={{color:missionForm.type===t?typeColor(t):C.textMuted,display:'block',margin:'0 auto 4px'}}/>
                          <p style={{fontSize:11,fontWeight:700}}>{t}</p>
                          <p style={{fontSize:9,color:C.textMuted,marginTop:1}}>{desc}</p>
                        </button>
                      ))}
                    </div>
                  </L>
                  {/* Type hint */}
                  <div style={{background:`${tc}10`,borderRadius:8,padding:10,border:`1px solid ${tc}20`,display:'flex',alignItems:'center',gap:8}}>
                    <MI name={ti} size={16} fill style={{color:tc,flexShrink:0}}/>
                    <p style={{fontSize:11,color:C.textSec,lineHeight:1.4}}>
                      {missionForm.type==='EDUKASI'?'Agent membagikan materi edukasi. Sertakan infografis & template pesan.':
                       missionForm.type==='AMPLIFIKASI'?'Agent like, comment, share konten yang sudah ada.':
                       missionForm.type==='KRISIS'?'Misi darurat counter-narasi. Sertakan fakta & sumber resmi.':
                       missionForm.type==='KOMUNITAS'?'Koordinasi kegiatan komunitas. Sertakan poster & link.':
                       missionForm.type==='VISIT'?'Kunjungan lokasi fisik. Sertakan alamat & panduan.':
                       'Konten original di sosmed. Sertakan contoh & hashtag.'}
                    </p>
                  </div>
                  {/* Title */}
                  <L label="Judul Misi" icon="title">
                    <input value={missionForm.title} onChange={e=>setMissionForm(f=>({...f,title:e.target.value}))} placeholder="e.g., Distribusi Materi Literasi Digital..." style={{width:'100%',padding:'10px 14px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:14,color:C.text,outline:'none',fontFamily:'inherit',background:C.surfaceLight}}/>
                    {!missionForm.title&&<AISuggest text={missionForm.type==='KRISIS'?'"Flash Counter: Klarifikasi Fakta Terbaru"':missionForm.type==='EDUKASI'?'"Kampanye Literasi Digital untuk Semua"':missionForm.type==='SOCIAL'?'"Challenge Konten Positif #GerakDigital"':'"Misi Komunitas: Aksi Nyata Bersama"'} onApply={()=>setMissionForm(f=>({...f,title:f.type==='KRISIS'?'Flash Counter: Klarifikasi Fakta Terbaru':f.type==='EDUKASI'?'Kampanye Literasi Digital untuk Semua':f.type==='SOCIAL'?'Challenge Konten Positif #GerakDigital':'Misi Komunitas: Aksi Nyata Bersama'}))}/>}
                  </L>
                  {/* Description */}
                  <L label="Deskripsi & Brief" icon="description">
                    <textarea value={missionForm.desc} onChange={e=>setMissionForm(f=>({...f,desc:e.target.value}))} placeholder="Jelaskan detail misi, apa yang harus dilakukan agent..." rows={4} style={{width:'100%',padding:'10px 14px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,color:C.text,outline:'none',resize:'vertical',fontFamily:'inherit',background:C.surfaceLight}}/>
                    {!missionForm.desc&&missionForm.title&&<AISuggest text="AI bisa generate deskripsi berdasarkan judul dan tipe misi" onApply={()=>setMissionForm(f=>({...f,desc:f.type==='KRISIS'?`Misi darurat untuk counter narasi negatif terkait "${f.title}". Agent diminta membuat konten klarifikasi dengan data dan sumber resmi. Pastikan tone profesional dan berbasis fakta.`:f.type==='EDUKASI'?`Bantu sebarkan informasi akurat tentang "${f.title}". Buat konten edukatif yang mudah dipahami dengan infografis dan data pendukung. Target: meningkatkan literasi masyarakat.`:`Ikut serta dalam kampanye "${f.title}". Buat konten original yang menarik dan shareable. Gunakan kreativitas untuk menyampaikan pesan positif kepada audience.`}))}/>}
                  </L>
                  {/* Hashtags */}
                  <L label="Hashtag Wajib" icon="tag">
                    <input value={missionForm.hashtags||''} onChange={e=>setMissionForm(f=>({...f,hashtags:e.target.value}))} placeholder="#GerakDigital #LiterasiDigital" style={{width:'100%',padding:'10px 14px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,color:C.text,outline:'none',fontFamily:'inherit',background:C.surfaceLight}}/>
                    {!(missionForm.hashtags||'').trim()&&<AISuggest text={`"#GERAK #${(missionForm.type||'').charAt(0)+(missionForm.type||'').slice(1).toLowerCase()} #GerakDigital"`} onApply={()=>setMissionForm(f=>({...f,hashtags:`#GERAK #${(f.type||'').charAt(0)+(f.type||'').slice(1).toLowerCase()} #GerakDigital`}))}/>}
                  </L>
                </div>
              </DCard>

              {/* Reward & Scoring */}
              <DCard title="Reward & Poin" subtitle="Atur sistem penilaian dan reward">
                <div className="flex flex-col gap-4">
                  {/* XP Controls */}
                  <L label="Poin XP Dasar" icon="toll">
                    <div className="flex items-center gap-3">
                      {[100,150,200,250,300,400,500].map(v=>(
                        <button key={v} onClick={()=>setMissionForm(f=>({...f,xp:v}))} style={{
                          padding:'8px 0',flex:1,borderRadius:6,border:`1px solid ${missionForm.xp===v?C.primary:C.border}`,
                          background:missionForm.xp===v?C.primaryLight:C.glass,color:missionForm.xp===v?C.primary:C.textSec,
                          fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:"'JetBrains Mono'",textAlign:'center',
                        }}>{v}</button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span style={{fontSize:11,color:C.textMuted}}>Custom:</span>
                      <input type="number" value={missionForm.xp} onChange={e=>setMissionForm(f=>({...f,xp:parseInt(e.target.value)||0}))} style={{width:80,padding:'6px 10px',borderRadius:6,border:`1px solid ${C.border}`,fontSize:13,color:C.primary,fontFamily:"'JetBrains Mono'",fontWeight:700,background:C.surfaceLight,textAlign:'center'}}/>
                      <span style={{fontSize:11,color:C.textMuted}}>XP per orang</span>
                    </div>
                    {(()=>{const rec=missionForm.type==='KRISIS'?400:missionForm.type==='VISIT'?350:missionForm.type==='EDUKASI'?250:200;return missionForm.xp!==rec?<AISuggest text={`AI rekomendasikan ${rec} XP untuk misi ${missionForm.type} (tingkat effort ${rec>=350?'tinggi':'sedang'})`} onApply={()=>setMissionForm(f=>({...f,xp:rec}))}/>:null;})()}
                  </L>
                  {/* Bonus tiers */}
                  <L label="Bonus & Multiplier" icon="emoji_events">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3" style={{padding:'8px 10px',background:C.surfaceLight,borderRadius:8,border:`1px solid ${C.border}`}}>
                        <MI name="speed" size={16} style={{color:C.teal}}/>
                        <span className="flex-1" style={{fontSize:12,color:C.text}}>Early Bird (10 pertama)</span>
                        <input type="number" value={missionForm.bonus||50} onChange={e=>setMissionForm(f=>({...f,bonus:parseInt(e.target.value)||0}))} style={{width:60,padding:'4px 8px',borderRadius:4,border:`1px solid ${C.border}`,fontSize:12,color:C.teal,fontFamily:"'JetBrains Mono'",fontWeight:700,background:C.bg,textAlign:'center'}}/>
                        <span style={{fontSize:10,color:C.textMuted}}>XP</span>
                      </div>
                      <div className="flex items-center gap-3" style={{padding:'8px 10px',background:C.surfaceLight,borderRadius:8,border:`1px solid ${C.border}`}}>
                        <MI name="local_fire_department" size={16} style={{color:C.orange}}/>
                        <span className="flex-1" style={{fontSize:12,color:C.text}}>Viral Bonus (10K+ views)</span>
                        <input type="number" value={missionForm.viralBonus||75} onChange={e=>setMissionForm(f=>({...f,viralBonus:parseInt(e.target.value)||0}))} style={{width:60,padding:'4px 8px',borderRadius:4,border:`1px solid ${C.border}`,fontSize:12,color:C.orange,fontFamily:"'JetBrains Mono'",fontWeight:700,background:C.bg,textAlign:'center'}}/>
                        <span style={{fontSize:10,color:C.textMuted}}>XP</span>
                      </div>
                      <div className="flex items-center gap-3" style={{padding:'8px 10px',background:C.surfaceLight,borderRadius:8,border:`1px solid ${C.border}`}}>
                        <MI name="diamond" size={16} style={{color:C.purple}}/>
                        <span className="flex-1" style={{fontSize:12,color:C.text}}>Kualitas Premium</span>
                        <input type="number" value={missionForm.qualityBonus||100} onChange={e=>setMissionForm(f=>({...f,qualityBonus:parseInt(e.target.value)||0}))} style={{width:60,padding:'4px 8px',borderRadius:4,border:`1px solid ${C.border}`,fontSize:12,color:C.purple,fontFamily:"'JetBrains Mono'",fontWeight:700,background:C.bg,textAlign:'center'}}/>
                        <span style={{fontSize:10,color:C.textMuted}}>XP</span>
                      </div>
                    </div>
                  </L>
                  {/* Deadline */}
                  <L label="Deadline & Durasi" icon="schedule">
                    <div className="flex gap-3">
                      <input type="date" value={missionForm.deadline||''} onChange={e=>setMissionForm(f=>({...f,deadline:e.target.value}))} style={{flex:1,padding:'10px 12px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,color:C.text,fontFamily:'inherit',background:C.surfaceLight}}/>
                      <select value={missionForm.urgency||'normal'} onChange={e=>setMissionForm(f=>({...f,urgency:e.target.value}))} style={{width:140,padding:'10px 12px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,color:C.text,background:C.surfaceLight,fontFamily:'inherit'}}>
                        <option value="normal">Normal</option>
                        <option value="urgent">Urgent (2 hari)</option>
                        <option value="flash">Flash (24 jam)</option>
                      </select>
                    </div>
                  </L>
                  {/* Budget estimate */}
                  <div style={{background:'linear-gradient(135deg,rgba(201,168,76,0.1),rgba(201,168,76,0.05))',borderRadius:10,padding:14,border:`1px solid rgba(201,168,76,0.15)`}}>
                    <p style={{fontSize:10,fontWeight:700,color:C.textMuted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:6}}>Estimasi Budget XP</p>
                    <div className="flex items-end justify-between">
                      <div>
                        <p style={{fontSize:28,fontWeight:800,color:C.primary,fontFamily:"'JetBrains Mono'",lineHeight:1}}>{totalBudget.toLocaleString()}</p>
                        <p style={{fontSize:11,color:C.textMuted,marginTop:2}}>Total XP ({missionForm.xp||200} × {Math.min(estPeople,missionForm.maxPeople||estPeople)} orang)</p>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <p style={{fontSize:11,color:C.textSec}}>+ bonus max <span style={{color:C.orange,fontWeight:700}}>{((missionForm.bonus||50)+(missionForm.viralBonus||75)+(missionForm.qualityBonus||100)).toLocaleString()}</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              </DCard>
            </div>

            {/* ──── ROW 2: Content + Platform + Location ──── */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:20}}>
              {/* Content Specs */}
              <DCard title="Spesifikasi Konten" subtitle="Format dan persyaratan konten">
                <div className="flex flex-col gap-4">
                  <L label="Format Konten" icon="view_agenda">
                    <select value={missionForm.format} onChange={e=>setMissionForm(f=>({...f,format:e.target.value}))} style={{width:'100%',padding:'10px 12px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,color:C.text,background:C.surfaceLight,fontFamily:'inherit'}}>
                      <option value="">Pilih format</option>
                      <option>Video Reels</option><option>Video TikTok</option><option>Thread</option>
                      <option>Post gambar</option><option>Teks + Infografis</option><option>Foto + Video</option>
                      <option>Like & Share</option><option>Forward pesan</option><option>Foto before-after</option>
                      <option>Dokumentasi acara</option>
                    </select>
                    {!missionForm.format&&<AISuggest text={missionForm.type==='KRISIS'?'AI: "Thread" paling efektif untuk counter-narasi':missionForm.type==='SOCIAL'||missionForm.type==='AMPLIFIKASI'?'AI: "Video Reels" punya engagement tertinggi':missionForm.type==='VISIT'?'AI: "Foto before-after" cocok untuk dokumentasi':'AI: "Teks + Infografis" ideal untuk edukasi'} onApply={()=>setMissionForm(f=>({...f,format:f.type==='KRISIS'?'Thread':f.type==='SOCIAL'||f.type==='AMPLIFIKASI'?'Video Reels':f.type==='VISIT'?'Foto before-after':'Teks + Infografis'}))}/>}
                  </L>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <L label="Durasi Video" icon="timer">
                      <input value={missionForm.duration} onChange={e=>setMissionForm(f=>({...f,duration:e.target.value}))} placeholder="30-60 detik" style={{width:'100%',padding:'10px 12px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,color:C.text,fontFamily:'inherit',background:C.surfaceLight}}/>
                    </L>
                    <L label="Aspect Ratio" icon="aspect_ratio">
                      <select value={missionForm.aspectRatio||''} onChange={e=>setMissionForm(f=>({...f,aspectRatio:e.target.value}))} style={{width:'100%',padding:'10px 12px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,color:C.text,background:C.surfaceLight,fontFamily:'inherit'}}>
                        <option value="">Auto</option><option>9:16 (Portrait)</option><option>1:1 (Square)</option><option>16:9 (Landscape)</option>
                      </select>
                    </L>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <L label="Min Foto" icon="photo_library">
                      <input type="number" value={missionForm.minPhotos||''} onChange={e=>setMissionForm(f=>({...f,minPhotos:parseInt(e.target.value)||0}))} placeholder="0" style={{width:'100%',padding:'10px 12px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,color:C.text,fontFamily:"'JetBrains Mono'",background:C.surfaceLight}}/>
                    </L>
                    <L label="Min Post/Tweet" icon="edit_note">
                      <input type="number" value={missionForm.minPosts||''} onChange={e=>setMissionForm(f=>({...f,minPosts:parseInt(e.target.value)||0}))} placeholder="0" style={{width:'100%',padding:'10px 12px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,color:C.text,fontFamily:"'JetBrains Mono'",background:C.surfaceLight}}/>
                    </L>
                  </div>
                  <L label="Catatan Tambahan" icon="info">
                    <textarea value={missionForm.specNote||''} onChange={e=>setMissionForm(f=>({...f,specNote:e.target.value}))} placeholder="Instruksi tambahan untuk agent..." rows={2} style={{width:'100%',padding:'10px 12px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:12,color:C.text,outline:'none',resize:'vertical',fontFamily:'inherit',background:C.surfaceLight}}/>
                  </L>
                </div>
              </DCard>

              {/* Platform & Requirements */}
              <DCard title="Platform & Persyaratan" subtitle="Pilih platform dan aturan">
                <div className="flex flex-col gap-4">
                  <L label="Platform Target" icon="devices">
                    <div className="flex flex-col gap-2">
                      {['instagram','tiktok','x','facebook','whatsapp','telegram'].map(p=>{
                        const sel2=missionForm.platforms.includes(p);
                        return <button key={p} onClick={()=>setMissionForm(f=>({...f,platforms:sel2?f.platforms.filter(x=>x!==p):[...f.platforms,p]}))} className="flex items-center gap-3" style={{
                          padding:'10px 12px',borderRadius:8,border:`1.5px solid ${sel2?pColor(p):C.border}`,
                          background:sel2?`${pColor(p)}08`:C.glass,cursor:'pointer',textAlign:'left',transition:'all 150ms',width:'100%',
                        }}>
                          <div style={{width:28,height:28,borderRadius:6,background:sel2?`${pColor(p)}15`:C.surfaceLight,display:'flex',alignItems:'center',justifyContent:'center'}}>
                            {pIcon(p)?<MI name={pIcon(p)} size={14} style={{color:sel2?pColor(p):C.textMuted}}/>:<SocialIcon platform={p} size={14} color={sel2?pColor(p):C.textMuted}/>}
                          </div>
                          <span className="flex-1" style={{fontSize:13,fontWeight:sel2?700:500,color:sel2?pColor(p):C.textSec}}>{pName(p)}</span>
                          {sel2&&<MI name="check_circle" size={18} fill style={{color:pColor(p)}}/>}
                        </button>;
                      })}
                    </div>
                  </L>
                  <L label="Persyaratan Khusus" icon="checklist">
                    <div className="flex flex-col gap-2">
                      {[{label:'Akun harus publik',key:'public'},{label:'Wajib tag akun official',key:'tag'},{label:'Gunakan hashtag campaign',key:'hashtag'},{label:'Sertakan link/sumber resmi',key:'source'}].map(r=>{
                        const on=(missionForm.requirements||[]).includes(r.key);
                        return <button key={r.key} onClick={()=>setMissionForm(f=>({...f,requirements:on?(f.requirements||[]).filter(x=>x!==r.key):[...(f.requirements||[]),r.key]}))} className="flex items-center gap-3" style={{padding:'8px 10px',background:on?C.primaryLight:C.surfaceLight,borderRadius:6,border:`1px solid ${on?'rgba(201,168,76,0.2)':C.border}`,cursor:'pointer',textAlign:'left',width:'100%',transition:'all 150ms'}}>
                          <div style={{width:18,height:18,borderRadius:4,border:on?'none':`2px solid ${C.border}`,background:on?C.primary:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            {on&&<MI name="check" size={12} style={{color:'white'}}/>}
                          </div>
                          <span style={{fontSize:12,color:on?C.text:C.textSec}}>{r.label}</span>
                        </button>;
                      })}
                    </div>
                  </L>
                </div>
              </DCard>

              {/* Location (always visible, expanded for VISIT) */}
              <DCard title="Lokasi & Wilayah" subtitle={missionForm.type==='VISIT'?'Wajib untuk misi VISIT':'Opsional — filter berdasarkan wilayah'}>
                <div className="flex flex-col gap-4">
                  {missionForm.type==='VISIT'&&(
                    <div style={{background:C.pinkLight,borderRadius:8,padding:10,border:`1px solid ${C.pink}20`,display:'flex',alignItems:'center',gap:6}}>
                      <MI name="info" size={16} style={{color:C.pink}}/>
                      <p style={{fontSize:11,color:C.pink,fontWeight:600}}>Misi VISIT memerlukan lokasi fisik</p>
                    </div>
                  )}
                  <L label="Nama Lokasi" icon="location_on">
                    <input value={missionForm.location||''} onChange={e=>setMissionForm(f=>({...f,location:e.target.value}))} placeholder="e.g., Posko Bantuan, Jl. Raya..." style={{width:'100%',padding:'10px 12px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,color:C.text,fontFamily:'inherit',background:C.surfaceLight}}/>
                  </L>
                  <L label="Catatan Lokasi" icon="note">
                    <input value={missionForm.locationNote||''} onChange={e=>setMissionForm(f=>({...f,locationNote:e.target.value}))} placeholder="Dekat alun-alun, parkir tersedia..." style={{width:'100%',padding:'10px 12px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,color:C.text,fontFamily:'inherit',background:C.surfaceLight}}/>
                  </L>
                  <L label="Wilayah Target" icon="map">
                    <div className="flex flex-wrap gap-2">
                      {['Jakarta','Surabaya','Bandung','Medan','Makassar','Semarang','Yogyakarta','Semua'].map(city=>{
                        const sel2=(missionForm.targetCities||[]).includes(city)||(!missionForm.targetCities?.length&&city==='Semua');
                        return <button key={city} onClick={()=>{
                          if(city==='Semua')setMissionForm(f=>({...f,targetCities:[]}));
                          else setMissionForm(f=>({...f,targetCities:sel2?(f.targetCities||[]).filter(c=>c!==city):[...(f.targetCities||[]),city]}));
                        }} style={{
                          padding:'6px 12px',borderRadius:6,border:`1px solid ${sel2?C.primary:C.border}`,
                          background:sel2?C.primaryLight:C.glass,color:sel2?C.primary:C.textSec,
                          fontSize:11,fontWeight:sel2?700:500,cursor:'pointer',
                        }}>{city}</button>;
                      })}
                    </div>
                  </L>
                  {/* Mini map placeholder for VISIT */}
                  {missionForm.type==='VISIT'&&missionForm.location&&(
                    <div style={{width:'100%',height:120,borderRadius:10,overflow:'hidden',position:'relative',border:`1px solid ${C.border}`,background:C.bg}}>
                      <div style={{position:'absolute',inset:0,opacity:0.08,backgroundImage:`linear-gradient(${C.border} 1px, transparent 1px), linear-gradient(90deg, ${C.border} 1px, transparent 1px)`,backgroundSize:'28px 28px'}}/>
                      <div style={{position:'absolute',top:'35%',left:0,right:0,height:2,background:C.border,transform:'rotate(-5deg)',opacity:0.5}}/>
                      <div style={{position:'absolute',top:0,bottom:0,left:'50%',width:2,background:C.border,transform:'rotate(3deg)',opacity:0.5}}/>
                      <div style={{position:'absolute',top:'45%',left:'50%',transform:'translate(-50%,-100%)'}}>
                        <div style={{width:28,height:28,borderRadius:'50% 50% 50% 0',background:C.pink,transform:'rotate(-45deg)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 6px rgba(0,0,0,0.2)'}}>
                          <MI name="location_on" size={14} fill style={{color:'white',transform:'rotate(45deg)'}}/>
                        </div>
                      </div>
                      <div style={{position:'absolute',bottom:4,left:4,background:C.surface,borderRadius:4,padding:'2px 6px',fontSize:9,color:C.textSec,fontFamily:"'JetBrains Mono'",border:`1px solid ${C.border}`}}>
                        {missionForm.location}
                      </div>
                    </div>
                  )}
                </div>
              </DCard>
            </div>

            {/* ──── ROW 3: People + Content Kit + Publish ──── */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:20}}>
              {/* Target People + Persona */}
              <DCard title="Target Audience & Persona" subtitle="Pilih profil dan atur jumlah per segmen">
                <div className="flex flex-col gap-4">
                  {/* Persona selection with qty */}
                  <L label="Segmen Persona" icon="people_alt">
                    <div className="flex flex-col gap-2">
                      {[
                        {id:'genz',name:'Gen-Z Digital Native',age:'18-24',emoji:'👩‍💻',color:C.purple,available:475,platform:'TikTok, IG Reels'},
                        {id:'millenial',name:'Professional Millennial',age:'25-34',emoji:'👨‍💼',color:C.primary,available:398,platform:'X, Instagram'},
                        {id:'leader',name:'Community Leader',age:'35-50',emoji:'👨‍👩‍👧‍👦',color:C.teal,available:265,platform:'WA, Facebook'},
                        {id:'senior',name:'Senior Advocate',age:'50+',emoji:'👴',color:C.orange,available:109,platform:'Facebook, WA'},
                      ].map(persona=>{
                        const personas=missionForm.personaAlloc||{};
                        const qty=personas[persona.id]||0;
                        const active=qty>0;
                        return <div key={persona.id} style={{padding:10,borderRadius:10,background:active?`${persona.color}08`:C.glass,border:`1px solid ${active?`${persona.color}25`:C.border}`,transition:'all 200ms'}}>
                          <div className="flex items-center gap-3">
                            <div onClick={()=>setMissionForm(f=>({...f,personaAlloc:{...(f.personaAlloc||{}),[persona.id]:active?0:Math.min(50,persona.available)}}))} style={{width:36,height:36,borderRadius:8,background:`${persona.color}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,cursor:'pointer',border:`1.5px solid ${active?persona.color:`${persona.color}30`}`,transition:'all 200ms'}}>
                              {persona.emoji}
                            </div>
                            <div className="flex-1" style={{minWidth:0}}>
                              <p style={{fontSize:12,fontWeight:700,color:active?C.text:C.textSec}}>{persona.name}</p>
                              <p style={{fontSize:9,color:C.textMuted}}>{persona.age} | {persona.platform} | {persona.available} tersedia</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={()=>setMissionForm(f=>({...f,personaAlloc:{...(f.personaAlloc||{}),[persona.id]:Math.max(0,qty-10)}}))} style={{width:24,height:24,borderRadius:4,border:`1px solid ${C.border}`,background:C.surfaceLight,color:C.textSec,fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                              <input type="number" value={qty} onChange={e=>setMissionForm(f=>({...f,personaAlloc:{...(f.personaAlloc||{}),[persona.id]:Math.min(persona.available,Math.max(0,parseInt(e.target.value)||0))}}))} style={{width:48,padding:'4px 0',borderRadius:4,border:`1px solid ${active?persona.color:C.border}`,fontSize:12,color:active?persona.color:C.textSec,fontFamily:"'JetBrains Mono'",fontWeight:700,background:C.bg,textAlign:'center'}}/>
                              <button onClick={()=>setMissionForm(f=>({...f,personaAlloc:{...(f.personaAlloc||{}),[persona.id]:Math.min(persona.available,qty+10)}}))} style={{width:24,height:24,borderRadius:4,border:`1px solid ${C.border}`,background:C.surfaceLight,color:C.textSec,fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                            </div>
                          </div>
                        </div>;
                      })}
                    </div>
                  </L>
                  {/* Filter overrides */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <L label="Gender" icon="wc">
                      <div className="flex gap-1">
                        {[{v:'all',l:'Semua'},{v:'male',l:'L'},{v:'female',l:'P'}].map(g=>(
                          <button key={g.v} onClick={()=>setMissionForm(f=>({...f,targetGender:g.v}))} style={{
                            flex:1,padding:'8px 4px',borderRadius:6,border:`1px solid ${missionForm.targetGender===g.v?C.primary:C.border}`,
                            background:missionForm.targetGender===g.v?C.primaryLight:C.glass,color:missionForm.targetGender===g.v?C.primary:C.textSec,
                            fontSize:11,fontWeight:missionForm.targetGender===g.v?700:500,cursor:'pointer',textAlign:'center',
                          }}>{g.l}</button>
                        ))}
                      </div>
                    </L>
                    <L label="Tier" icon="workspace_premium">
                      <select value={missionForm.targetTier} onChange={e=>setMissionForm(f=>({...f,targetTier:e.target.value}))} style={{width:'100%',padding:'8px 10px',borderRadius:6,border:`1px solid ${C.border}`,fontSize:12,color:C.text,background:C.surfaceLight,fontFamily:'inherit'}}>
                        <option value="all">Semua</option><option value="gold">Gold</option><option value="silver">Silver</option><option value="bronze">Bronze</option>
                      </select>
                    </L>
                  </div>
                  {/* Total summary */}
                  {(()=>{
                    const alloc=missionForm.personaAlloc||{};
                    const totalAlloc=Object.values(alloc).reduce((s,v)=>s+(v||0),0);
                    return <div style={{background:'linear-gradient(135deg,rgba(201,168,76,0.1),rgba(201,168,76,0.05))',borderRadius:10,padding:12,border:`1px solid rgba(201,168,76,0.15)`}}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p style={{fontSize:22,fontWeight:800,color:C.primary,fontFamily:"'JetBrains Mono'",lineHeight:1}}>{totalAlloc||estPeople}</p>
                          <p style={{fontSize:9,color:C.textMuted,marginTop:2}}>{totalAlloc?'total dari persona terpilih':'anggota memenuhi kriteria'}</p>
                        </div>
                        <div style={{textAlign:'right'}}>
                          {totalAlloc>0&&<p style={{fontSize:11,color:C.textSec}}>{Object.entries(alloc).filter(([,v])=>v>0).length} segmen aktif</p>}
                          <p style={{fontSize:10,color:C.textMuted}}>Budget: <span style={{color:C.gold,fontWeight:700,fontFamily:"'JetBrains Mono'"}}>{((missionForm.xp||200)*(totalAlloc||estPeople)).toLocaleString()} XP</span></p>
                        </div>
                      </div>
                      <ProgressBar progress={(totalAlloc||estPeople)/1247} color={C.primary} height={4}/>
                    </div>;
                  })()}
                </div>
              </DCard>

              {/* Content Kit */}
              <DCard title="Kit Konten & Referensi" subtitle="Template, file, dan materi pendukung">
                <div className="flex flex-col gap-4">
                  <L label="Caption / Template" icon="text_fields">
                    <textarea value={missionForm.template||''} onChange={e=>setMissionForm(f=>({...f,template:e.target.value}))} placeholder="Tulis template caption. Pisahkan beberapa template dengan enter ganda." rows={3} style={{width:'100%',padding:'10px 12px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:12,color:C.text,outline:'none',resize:'vertical',fontFamily:'inherit',background:C.surfaceLight}}/>
                    <p style={{fontSize:10,color:C.textMuted,marginTop:2}}>Muncul di Kit Konten agent</p>
                  </L>
                  <L label="Upload Referensi" icon="cloud_upload">
                    <div style={{border:`2px dashed ${C.border}`,borderRadius:8,padding:16,textAlign:'center',cursor:'pointer',background:C.glass}} onClick={()=>showToast('File picker (demo)')}>
                      <MI name="cloud_upload" size={28} style={{color:C.textMuted,display:'block',margin:'0 auto 6px'}}/>
                      <p style={{fontSize:12,fontWeight:600,color:C.text}}>Drag & drop atau klik</p>
                      <p style={{fontSize:10,color:C.textMuted,marginTop:2}}>PNG, JPG, MP4, PDF (max 50MB)</p>
                    </div>
                  </L>
                  {/* Quick add buttons */}
                  <div className="flex flex-wrap gap-2">
                    {[{name:'Infografis.png',type:'image',size:'2.4 MB',icon:'image',color:C.pink},
                      {name:'Brief_Misi.pdf',type:'doc',size:'1.2 MB',icon:'description',color:C.primary},
                      {name:'Contoh_Video.mp4',type:'video',size:'8.5 MB',icon:'videocam',color:C.purple}].map((f,fi)=>{
                      const added=(missionForm.files||[]).some(x=>x.name===f.name);
                      return <button key={fi} onClick={()=>{if(!added)setMissionForm(prev=>({...prev,files:[...(prev.files||[]),f]}))}} style={{
                        padding:'6px 10px',borderRadius:6,border:`1px solid ${added?f.color:C.border}`,background:added?`${f.color}10`:C.glass,
                        color:added?f.color:C.textSec,fontSize:10,fontWeight:600,cursor:added?'default':'pointer',display:'flex',alignItems:'center',gap:4,
                      }}>
                        <MI name={added?'check_circle':f.icon} size={14} style={{color:added?f.color:C.textMuted}}/> {added?'Ditambahkan':f.name}
                      </button>;
                    })}
                  </div>
                  {/* File list */}
                  {(missionForm.files||[]).length>0&&(
                    <div className="flex flex-col gap-2">
                      {(missionForm.files||[]).map((f,fi)=>(
                        <div key={fi} className="flex items-center gap-3" style={{padding:'8px 10px',background:C.surfaceLight,borderRadius:6,border:`1px solid ${C.border}`}}>
                          <MI name={f.type==='image'?'image':f.type==='video'?'videocam':'description'} size={16} style={{color:f.type==='image'?C.pink:f.type==='video'?C.purple:C.primary}}/>
                          <span className="flex-1" style={{fontSize:11,fontWeight:600,color:C.text}}>{f.name}</span>
                          <span style={{fontSize:10,color:C.textMuted}}>{f.size}</span>
                          <button onClick={()=>setMissionForm(prev=>({...prev,files:prev.files.filter((_,i)=>i!==fi)}))} style={{background:'none',border:'none',cursor:'pointer',padding:2}}>
                            <MI name="close" size={14} style={{color:C.textMuted}}/>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </DCard>

              {/* Preview & Publish */}
              <DCard title="Preview & Publikasi" subtitle="Review sebelum deploy misi">
                <div className="flex flex-col gap-4">
                  {/* Preview card */}
                  <div style={{background:C.bg,borderRadius:10,padding:14,border:`1px solid ${C.border}`}}>
                    <div className="flex items-center gap-2 mb-2">
                      <div style={{width:24,height:24,borderRadius:6,background:tb,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <MI name={ti} size={12} fill style={{color:tc}}/>
                      </div>
                      <span style={{fontSize:10,fontWeight:700,color:tc,textTransform:'uppercase',letterSpacing:0.5}}>{missionForm.type}</span>
                      <span style={{marginLeft:'auto',fontSize:10,fontWeight:700,color:tc,background:tb,padding:'2px 6px',borderRadius:4}}>TERBUKA</span>
                    </div>
                    <h4 style={{fontSize:14,fontWeight:700,color:C.text,lineHeight:1.3,marginBottom:4}}>{missionForm.title||'Judul misi...'}</h4>
                    <p style={{fontSize:11,color:C.textMuted,lineHeight:1.3,marginBottom:8}} className="line-clamp-2">{missionForm.desc||'Deskripsi misi...'}</p>
                    <div className="flex items-center gap-2">
                      <span style={{background:C.goldLight,color:C.gold,borderRadius:4,padding:'2px 8px',fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono'"}}>+{missionForm.xp||200} XP</span>
                      {(missionForm.bonus>0)&&<span style={{background:C.greenLight,color:C.green,borderRadius:4,padding:'2px 8px',fontSize:10,fontWeight:700}}>+{missionForm.bonus} bonus</span>}
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      {missionForm.platforms.slice(0,4).map(p=>(
                        <div key={p} style={{width:20,height:20,borderRadius:4,background:C.surfaceLight,display:'flex',alignItems:'center',justifyContent:'center'}}>
                          {pIcon(p)?<MI name={pIcon(p)} size={10} style={{color:pColor(p)}}/>:<SocialIcon platform={p} size={10} color={pColor(p)}/>}
                        </div>
                      ))}
                      {missionForm.platforms.length>4&&<span style={{fontSize:9,color:C.textMuted}}>+{missionForm.platforms.length-4}</span>}
                    </div>
                  </div>
                  {/* Checklist */}
                  <div className="flex flex-col gap-2">
                    <p style={{fontSize:10,fontWeight:700,color:C.textMuted,textTransform:'uppercase',letterSpacing:0.5}}>Kelengkapan</p>
                    {[{l:'Tipe misi dipilih',ok:true},{l:'Judul diisi',ok:!!missionForm.title},{l:'Deskripsi diisi',ok:!!missionForm.desc},{l:'Platform dipilih',ok:missionForm.platforms.length>0},{l:'XP ditentukan',ok:missionForm.xp>0},{l:'Deadline diset',ok:!!missionForm.deadline}].map((c,ci)=>(
                      <div key={ci} className="flex items-center gap-2" style={{fontSize:12,color:c.ok?C.green:C.textMuted}}>
                        <MI name={c.ok?'check_circle':'radio_button_unchecked'} size={16} fill={c.ok} style={{color:c.ok?C.green:C.textMuted}}/>
                        <span style={{fontWeight:c.ok?600:400}}>{c.l}</span>
                      </div>
                    ))}
                  </div>
                  {/* Review & Publish */}
                  <button onClick={()=>setMissionForm(f=>({...f,showReview:true}))} className="btn-primary" style={{width:'100%',padding:'14px 0',borderRadius:10,border:'none',background:'linear-gradient(135deg,#C9A84C,#E8D48B)',color:C.bg,fontSize:14,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 15px rgba(201,168,76,0.3)',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                    <MI name="rate_review" size={18} style={{color:C.bg}}/> Review & Publikasikan
                  </button>
                  <button onClick={()=>showToast('Draft tersimpan')} style={{width:'100%',padding:'10px 0',borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',color:C.textSec,fontSize:12,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                    <MI name="save" size={16} style={{color:C.textMuted}}/> Simpan sebagai Draft
                  </button>
                </div>
              </DCard>
            </div>
            {/* ──── ROW 3.5: AI Content Strategy ──── */}
            {missionForm.title&&!['AMPLIFIKASI'].includes(missionForm.type)&&(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:20}}>
                {/* Visual & Mood */}
                <DCard title="Visual & Mood Board" subtitle="Panduan tampilan konten">
                  <div className="flex flex-col gap-3">
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                      {[
                        {label:'Warm & Empathetic',color:'#F59E0B',icon:'favorite',desc:'Tone hangat, peduli'},
                        {label:'Bold & Urgent',color:'#EF4444',icon:'priority_high',desc:'Tegas, mendesak'},
                        {label:'Clean & Professional',color:'#3B82F6',icon:'business',desc:'Rapi, terpercaya'},
                        {label:'Fun & Engaging',color:'#A855F7',icon:'celebration',desc:'Ceria, interaktif'},
                      ].map((mood,mi)=>{
                        const sel2=missionForm.mood===mood.label;
                        return <button key={mi} onClick={()=>setMissionForm(f=>({...f,mood:mood.label}))} style={{
                          padding:10,borderRadius:8,border:`1.5px solid ${sel2?mood.color:C.border}`,
                          background:sel2?`${mood.color}10`:C.glass,cursor:'pointer',textAlign:'center',transition:'all 200ms',
                        }}>
                          <MI name={mood.icon} size={18} fill={sel2} style={{color:sel2?mood.color:C.textMuted,display:'block',margin:'0 auto 4px'}}/>
                          <p style={{fontSize:10,fontWeight:700,color:sel2?mood.color:C.textSec}}>{mood.label}</p>
                          <p style={{fontSize:8,color:C.textMuted}}>{mood.desc}</p>
                        </button>;
                      })}
                    </div>
                    <L label="Palet Warna" icon="palette">
                      <div className="flex gap-2">
                        {['#C9A84C','#22C55E','#3B82F6','#EF4444','#A855F7','#EC4899','#F59E0B','#14B8A6'].map(clr=>(
                          <div key={clr} onClick={()=>setMissionForm(f=>({...f,brandColors:[...(f.brandColors||[]).includes(clr)?(f.brandColors||[]).filter(c=>c!==clr):[...(f.brandColors||[]),clr]]}))} style={{
                            width:28,height:28,borderRadius:6,background:clr,cursor:'pointer',
                            border:(missionForm.brandColors||[]).includes(clr)?'3px solid white':'2px solid transparent',
                            boxShadow:(missionForm.brandColors||[]).includes(clr)?`0 0 0 2px ${clr}`:undefined,
                            transition:'all 150ms',
                          }}/>
                        ))}
                      </div>
                    </L>
                    <L label="Referensi Visual" icon="image">
                      <textarea value={missionForm.visualRef||''} onChange={e=>setMissionForm(f=>({...f,visualRef:e.target.value}))} placeholder="Deskripsikan visual yang diinginkan: clean minimalis, pakai foto real, bold typography..." rows={2} style={{width:'100%',padding:'8px 10px',borderRadius:6,border:`1px solid ${C.border}`,fontSize:11,color:C.text,outline:'none',resize:'vertical',fontFamily:'inherit',background:C.surfaceLight}}/>
                    </L>
                  </div>
                </DCard>

                {/* Tone & Voice */}
                <DCard title="Tone & Panduan Narasi" subtitle="Gaya bahasa dan pesan kunci">
                  <div className="flex flex-col gap-3">
                    <L label="Gaya Bahasa" icon="record_voice_over">
                      <div className="flex flex-wrap gap-2">
                        {['Kasual','Formal','Storytelling','Data-driven','Emosional','Humoris'].map(tone=>{
                          const sel2=missionForm.tone===tone;
                          return <button key={tone} onClick={()=>setMissionForm(f=>({...f,tone}))} style={{
                            padding:'6px 12px',borderRadius:6,border:`1px solid ${sel2?C.primary:C.border}`,
                            background:sel2?C.primaryLight:C.glass,color:sel2?C.primary:C.textSec,
                            fontSize:11,fontWeight:sel2?700:500,cursor:'pointer',
                          }}>{tone}</button>;
                        })}
                      </div>
                    </L>
                    <L label="Pesan Kunci (Key Message)" icon="key">
                      <textarea value={missionForm.keyMessage||''} onChange={e=>setMissionForm(f=>({...f,keyMessage:e.target.value}))} placeholder="Apa pesan utama yang harus tersampaikan?" rows={2} style={{width:'100%',padding:'8px 10px',borderRadius:6,border:`1px solid ${C.border}`,fontSize:11,color:C.text,outline:'none',resize:'vertical',fontFamily:'inherit',background:C.surfaceLight}}/>
                    </L>
                    <div>
                      <p style={{fontSize:10,fontWeight:700,color:C.textMuted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:6}}>DO&apos;S & DON&apos;TS</p>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                        <div style={{background:`${C.green}08`,borderRadius:8,padding:10,border:`1px solid ${C.green}15`}}>
                          <p style={{fontSize:10,fontWeight:700,color:C.green,marginBottom:4}}>DO&apos;s</p>
                          {['Gunakan data & fakta','Sertakan sumber resmi','Ajak interaksi (CTA)','Pakai visual menarik'].map((d,di)=>(
                            <div key={di} className="flex items-center gap-2" style={{marginBottom:3}}>
                              <MI name="check" size={10} style={{color:C.green}}/>
                              <span style={{fontSize:10,color:C.textSec}}>{d}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{background:`${C.red}08`,borderRadius:8,padding:10,border:`1px solid ${C.red}15`}}>
                          <p style={{fontSize:10,fontWeight:700,color:C.red,marginBottom:4}}>DON&apos;Ts</p>
                          {['Jangan pakai clickbait','Hindari info belum terverifikasi','Jangan attack personal','Hindari bahasa provokatif'].map((d,di)=>(
                            <div key={di} className="flex items-center gap-2" style={{marginBottom:3}}>
                              <MI name="close" size={10} style={{color:C.red}}/>
                              <span style={{fontSize:10,color:C.textSec}}>{d}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </DCard>

                {/* Hooks, CTA, Schedule */}
                <DCard title="Hook, CTA & Jadwal" subtitle="Opening, call-to-action, dan waktu posting">
                  <div className="flex flex-col gap-3">
                    <L label="Contoh Opening Hook" icon="format_quote">
                      <div className="flex flex-col gap-2">
                        {(missionForm.type==='KRISIS'?
                          ['Klarifikasi: Ini fakta sebenarnya...','Banyak yang salah paham. Thread...','Sebelum kamu share, baca ini dulu']:
                          missionForm.type==='EDUKASI'?
                          ['Tau nggak sih? Ternyata...','5 hal yang jarang orang tau tentang...','Thread penting! Yuk bahas...']:
                          ['Hai guys! Yuk ikutan...','Challenge baru nih! Siapa berani?','Konten seru yang wajib kamu coba']
                        ).map((hook,hi)=>(
                          <div key={hi} style={{padding:'8px 10px',background:C.surfaceLight,borderRadius:6,border:`1px solid ${C.borderLight}`,fontSize:11,color:C.text,fontStyle:'italic'}}>{hook}</div>
                        ))}
                      </div>
                    </L>
                    <L label="CTA (Call to Action)" icon="ads_click">
                      <div className="flex flex-wrap gap-2">
                        {['Share ke teman','Comment pendapatmu','Follow untuk update','Simpan untuk nanti','Tag 3 temanmu','Kunjungi link di bio'].map(cta=>{
                          const sel2=(missionForm.ctas||[]).includes(cta);
                          return <button key={cta} onClick={()=>setMissionForm(f=>({...f,ctas:sel2?(f.ctas||[]).filter(c=>c!==cta):[...(f.ctas||[]),cta]}))} style={{
                            padding:'5px 10px',borderRadius:5,border:`1px solid ${sel2?C.primary:C.border}`,
                            background:sel2?C.primaryLight:C.glass,color:sel2?C.primary:C.textSec,
                            fontSize:10,fontWeight:sel2?700:500,cursor:'pointer',
                          }}>{cta}</button>;
                        })}
                      </div>
                    </L>
                    <L label="Jadwal Posting Optimal" icon="schedule">
                      <div style={{background:C.surfaceLight,borderRadius:8,padding:10,border:`1px solid ${C.border}`}}>
                        <div className="flex items-center gap-3 mb-2">
                          <MI name="wb_sunny" size={16} style={{color:C.orange}}/>
                          <div className="flex-1">
                            <p style={{fontSize:12,fontWeight:700,color:C.text}}>Peak Hours</p>
                            <p style={{fontSize:10,color:C.textMuted}}>Berdasarkan analisis engagement platform</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {[{time:'07:00-09:00',label:'Pagi',pct:72,color:C.orange},{time:'12:00-13:00',label:'Siang',pct:65,color:C.primary},{time:'18:00-21:00',label:'Malam',pct:92,color:C.purple}].map((slot,si)=>(
                            <div key={si} style={{flex:1,textAlign:'center',padding:8,borderRadius:6,background:C.bg,border:`1px solid ${C.borderLight}`}}>
                              <p style={{fontSize:12,fontWeight:800,color:slot.color,fontFamily:"'JetBrains Mono'"}}>{slot.pct}%</p>
                              <p style={{fontSize:10,fontWeight:600,color:C.text}}>{slot.time}</p>
                              <p style={{fontSize:8,color:C.textMuted}}>{slot.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </L>
                  </div>
                </DCard>
              </div>
            )}

            {/* ──── ROW 4: AI Caption Generator (content creation only) ──── */}
            {!['AMPLIFIKASI'].includes(missionForm.type)&&(()=>{
              const alloc=missionForm.personaAlloc||{};
              const totalPeople=Object.values(alloc).reduce((s,v)=>s+(v||0),0)||Math.min(estPeople,missionForm.maxPeople||estPeople);
              const captions=missionForm.aiCaptions||[];
              const isContentType=!['AMPLIFIKASI'].includes(missionForm.type);
              const personaMap={genz:{name:'Gen-Z',emoji:'👩‍💻',color:C.purple},millenial:{name:'Millennial',emoji:'👨‍💼',color:C.primary},leader:{name:'Leader',emoji:'👨‍👩‍👧‍👦',color:C.teal},senior:{name:'Senior',emoji:'👴',color:C.orange}};
              const captionTemplates={
                EDUKASI:[
                  'Tau nggak sih? {topic} itu ternyata lebih penting dari yang kita kira. Yuk simak faktanya! 👇',
                  'Masih banyak yang salah paham soal {topic}. Ini dia penjelasan lengkapnya! 🧵',
                  'Thread penting! {topic} — fakta vs hoaks. Baca sampai selesai ya 📖',
                  'Jangan sampai salah info! Ini yang perlu kamu tau soal {topic} ✅',
                  'Kamu pasti sering dengar soal {topic}, tapi apakah bener? Cek di sini! 🔍',
                  '{topic} — 5 hal yang jarang orang tau. Nomor 3 bikin kaget! 😮',
                  'Penting banget! Sharing info soal {topic} biar makin banyak yang paham 💡',
                  'Edukasi diri sendiri dulu, baru share ke orang lain. Yuk bahas {topic}! 📚',
                ],
                KRISIS:[
                  'KLARIFIKASI: Berita soal {topic} yang viral itu TIDAK BENAR. Ini faktanya 👇',
                  'Stop sebar hoaks! Ini penjelasan resmi soal {topic} dari sumber terpercaya ✅',
                  'Banyak informasi menyesatkan soal {topic}. Ini yang sebenarnya terjadi:',
                  'Fakta vs Hoaks: {topic}. Jangan mudah percaya, cek dulu! 🔍',
                  'Waspada! Narasi soal {topic} ini sengaja dibuat untuk menyesatkan. Ini faktanya:',
                  'Verifikasi sebelum share! {topic} — ini data resmi yang bisa kamu periksa sendiri 📊',
                ],
                SOCIAL:[
                  'Konten baru! Yuk ramaikan campaign {topic} bareng-bareng! 🎯',
                  'Challenge accepted! Ikutan bikin konten tentang {topic} yuk! 🔥',
                  'Siapa yang udah ikutan {topic}? Share pengalaman kalian dong! ✨',
                  'Ini dia cara gue ikutan campaign {topic}! Kalian gimana? 👀',
                  'Yang belum ikutan {topic}, saatnya sekarang! Caranya gampang banget 💪',
                  'Seru banget ikutan {topic}! Coba deh, pasti ketagihan 🎉',
                ],
                KOMUNITAS:[
                  'Hai teman-teman! Yuk ramaikan acara {topic}! Kita ketemu di sana ya 🤝',
                  'Kabar gembira! {topic} akan segera dilaksanakan. Catat tanggalnya! 📅',
                  'Ajak keluarga dan teman ke {topic}! Banyak kegiatan seru menanti 🎊',
                  'Komunitas kita makin solid! Yuk dukung {topic} bareng-bareng 💪',
                  'Bergabung yuk di {topic}! Gratis dan terbuka untuk umum 🙌',
                ],
                VISIT:[
                  'Kunjungan ke {topic} — pengalaman langsung yang bikin mata terbuka! 📸',
                  'Hari ini aku ke {topic}. Ini yang aku lihat dan rasakan di sana... 🧵',
                  'Dokumentasi kunjungan {topic}. Ternyata kondisinya begini! 👀',
                  'Field report dari {topic}! Penting banget ini dishare ke lebih banyak orang 🔴',
                ],
              };
              const generateCaptions=(count)=>{
                const topic=missionForm.title||missionForm.narasiTopic||'topik ini';
                const templates=captionTemplates[missionForm.type]||captionTemplates.SOCIAL;
                const personaKeys=Object.entries(alloc).filter(([,v])=>v>0);
                const generated=[];
                for(let i=0;i<count;i++){
                  let persona=null;
                  if(personaKeys.length>0){
                    let cumul=0;const totalA=personaKeys.reduce((s,[,v])=>s+v,0);
                    const rand=Math.random()*totalA;
                    for(const [k,v] of personaKeys){cumul+=v;if(rand<=cumul){persona=k;break;}}
                  }
                  const tmpl=templates[i%templates.length];
                  let caption=tmpl.replace(/\{topic\}/g,topic);
                  // Add slight variations
                  const suffixes=['','','',` ${missionForm.hashtags||'#GERAK'}`,` ${missionForm.hashtags||'#GERAK #GerakDigital'}`,'',' Spread the word! 🗣️',' Share kalau setuju! 🙏',''];
                  caption+=suffixes[i%suffixes.length];
                  generated.push({id:i,caption,persona:persona||'genz',edited:false,approved:false});
                }
                return generated;
              };
              return <DCard title="AI Caption & Judul Generator" subtitle={`${totalPeople} caption unik untuk setiap peserta — review & edit sebelum deploy`}>
                <div className="flex flex-col gap-4">
                  {/* Generate button */}
                  {captions.length===0?(
                    <div style={{textAlign:'center',padding:20}}>
                      <div style={{width:56,height:56,borderRadius:16,background:C.primaryLight,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',border:`1px solid rgba(201,168,76,0.2)`}}>
                        <MI name="auto_awesome" size={28} style={{color:C.primary}}/>
                      </div>
                      <h4 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>Generate Caption Unik</h4>
                      <p style={{fontSize:12,color:C.textSec,lineHeight:1.4,marginBottom:16,maxWidth:500,margin:'0 auto 16px'}}>
                        AI akan membuat <b style={{color:C.primary}}>{totalPeople} caption berbeda</b> — satu untuk setiap peserta.
                        Disesuaikan dengan tipe misi ({missionForm.type}), persona target, dan tone yang berbeda-beda.
                      </p>
                      <button onClick={()=>setMissionForm(f=>({...f,aiCaptions:generateCaptions(Math.min(totalPeople,50))}))} className="btn-primary" style={{padding:'14px 32px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#C9A84C,#E8D48B)',color:C.bg,fontSize:14,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8,boxShadow:'0 4px 15px rgba(201,168,76,0.3)'}}>
                        <MI name="smart_toy" size={18} style={{color:C.bg}}/> Generate {Math.min(totalPeople,50)} Caption
                      </button>
                      {totalPeople>50&&<p style={{fontSize:10,color:C.textMuted,marginTop:8}}>Preview 50 pertama, sisanya auto-generated saat publish</p>}
                    </div>
                  ):(
                    <div className="flex flex-col gap-3">
                      {/* Stats bar */}
                      <div className="flex items-center gap-3" style={{padding:12,borderRadius:10,background:'linear-gradient(135deg,rgba(201,168,76,0.1),rgba(201,168,76,0.05))',border:`1px solid rgba(201,168,76,0.15)`}}>
                        <MI name="auto_awesome" size={18} style={{color:C.primary}}/>
                        <div className="flex-1">
                          <p style={{fontSize:12,fontWeight:700,color:C.primary}}>{captions.length} Caption Dibuat</p>
                          <p style={{fontSize:10,color:C.textMuted}}>{captions.filter(c=>c.approved).length} disetujui, {captions.filter(c=>c.edited).length} diedit</p>
                        </div>
                        <button onClick={()=>setMissionForm(f=>({...f,aiCaptions:f.aiCaptions.map(c=>({...c,approved:true}))}))} style={{padding:'6px 12px',borderRadius:6,border:`1px solid ${C.green}40`,background:`${C.green}10`,color:C.green,fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
                          <MI name="done_all" size={14} style={{color:C.green}}/> Setujui Semua
                        </button>
                        <button onClick={()=>setMissionForm(f=>({...f,aiCaptions:generateCaptions(Math.min(totalPeople,50))}))} style={{padding:'6px 12px',borderRadius:6,border:`1px solid ${C.border}`,background:C.glass,color:C.textSec,fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
                          <MI name="refresh" size={14} style={{color:C.textMuted}}/> Regenerate
                        </button>
                      </div>

                      {/* Filter by persona */}
                      <div className="flex gap-2">
                        <button onClick={()=>setMissionForm(f=>({...f,captionFilter:'all'}))} style={{padding:'5px 10px',borderRadius:6,border:`1px solid ${(!missionForm.captionFilter||missionForm.captionFilter==='all')?C.primary:C.border}`,background:(!missionForm.captionFilter||missionForm.captionFilter==='all')?C.primaryLight:C.glass,color:(!missionForm.captionFilter||missionForm.captionFilter==='all')?C.primary:C.textSec,fontSize:10,fontWeight:600,cursor:'pointer'}}>Semua ({captions.length})</button>
                        {Object.entries(personaMap).map(([k,v])=>{
                          const cnt=captions.filter(c=>c.persona===k).length;
                          if(cnt===0) return null;
                          return <button key={k} onClick={()=>setMissionForm(f=>({...f,captionFilter:k}))} style={{padding:'5px 10px',borderRadius:6,border:`1px solid ${missionForm.captionFilter===k?v.color:C.border}`,background:missionForm.captionFilter===k?`${v.color}15`:C.glass,color:missionForm.captionFilter===k?v.color:C.textSec,fontSize:10,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:3}}>
                            <span>{v.emoji}</span> {v.name} ({cnt})
                          </button>;
                        })}
                      </div>

                      {/* Caption list */}
                      <div style={{maxHeight:400,overflowY:'auto',display:'flex',flexDirection:'column',gap:8,paddingRight:4}} className="hide-scrollbar">
                        {captions.filter(c=>!missionForm.captionFilter||missionForm.captionFilter==='all'||c.persona===missionForm.captionFilter).map((cap,ci)=>{
                          const pm=personaMap[cap.persona]||personaMap.genz;
                          return <div key={cap.id} style={{padding:12,borderRadius:10,background:cap.approved?`${C.green}06`:C.glass,border:`1px solid ${cap.approved?`${C.green}20`:cap.edited?`${C.orange}20`:C.border}`,transition:'all 200ms'}}>
                            <div className="flex items-start gap-3">
                              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,minWidth:32}}>
                                <span style={{fontSize:10,fontWeight:800,color:C.textMuted,fontFamily:"'JetBrains Mono'"}}>{String(cap.id+1).padStart(2,'0')}</span>
                                <span style={{fontSize:14}}>{pm.emoji}</span>
                              </div>
                              <div className="flex-1" style={{minWidth:0}}>
                                <textarea value={cap.caption} onChange={e=>{
                                  const updated=[...captions];
                                  updated[captions.indexOf(cap)]={...cap,caption:e.target.value,edited:true};
                                  setMissionForm(f=>({...f,aiCaptions:updated}));
                                }} rows={2} style={{width:'100%',padding:'8px 10px',borderRadius:6,border:`1px solid ${C.borderLight}`,fontSize:12,color:C.text,background:C.surfaceLight,fontFamily:'inherit',resize:'vertical',outline:'none',lineHeight:1.4}}/>
                                <div className="flex items-center gap-2 mt-1">
                                  <span style={{fontSize:9,color:pm.color,fontWeight:600,background:`${pm.color}10`,padding:'1px 5px',borderRadius:3}}>{pm.name}</span>
                                  {cap.edited&&<span style={{fontSize:9,color:C.orange,fontWeight:600}}>Diedit</span>}
                                  {cap.approved&&<span style={{fontSize:9,color:C.green,fontWeight:600}}>Disetujui</span>}
                                </div>
                              </div>
                              <div className="flex flex-col gap-1">
                                <button onClick={()=>{
                                  const updated=[...captions];
                                  updated[captions.indexOf(cap)]={...cap,approved:!cap.approved};
                                  setMissionForm(f=>({...f,aiCaptions:updated}));
                                }} title={cap.approved?'Batalkan':'Setujui'} style={{width:28,height:28,borderRadius:6,border:`1px solid ${cap.approved?C.green:C.border}`,background:cap.approved?`${C.green}15`:C.glass,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                  <MI name={cap.approved?'check_circle':'check'} size={14} fill={cap.approved} style={{color:cap.approved?C.green:C.textMuted}}/>
                                </button>
                                <button onClick={()=>{
                                  const topic=missionForm.title||missionForm.narasiTopic||'topik ini';
                                  const templates=captionTemplates[missionForm.type]||captionTemplates.SOCIAL;
                                  const newTmpl=templates[Math.floor(Math.random()*templates.length)];
                                  const updated=[...captions];
                                  updated[captions.indexOf(cap)]={...cap,caption:newTmpl.replace(/\{topic\}/g,topic),edited:false,approved:false};
                                  setMissionForm(f=>({...f,aiCaptions:updated}));
                                }} title="Regenerate" style={{width:28,height:28,borderRadius:6,border:`1px solid ${C.border}`,background:C.glass,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                  <MI name="refresh" size={14} style={{color:C.textMuted}}/>
                                </button>
                              </div>
                            </div>
                          </div>;
                        })}
                      </div>

                      {/* Bulk progress */}
                      <div style={{background:C.surfaceLight,borderRadius:8,padding:10,border:`1px solid ${C.border}`}}>
                        <div className="flex items-center justify-between mb-2">
                          <span style={{fontSize:10,fontWeight:700,color:C.textMuted}}>PROGRESS REVIEW</span>
                          <span style={{fontSize:12,fontWeight:800,color:C.primary,fontFamily:"'JetBrains Mono'"}}>{captions.filter(c=>c.approved).length}/{captions.length}</span>
                        </div>
                        <ProgressBar progress={captions.filter(c=>c.approved).length/captions.length} color={C.green} height={6}/>
                      </div>
                    </div>
                  )}
                </div>
              </DCard>;
            })()}

            {/* ═══ REVIEW OVERLAY ═══ */}
            {missionForm.showReview&&(()=>{
              const checks=[
                {l:'Tipe misi',v:missionForm.type,ok:true},
                {l:'Judul',v:missionForm.title||'—',ok:!!missionForm.title},
                {l:'Deskripsi',v:(missionForm.desc||'').slice(0,80)+(missionForm.desc?.length>80?'...':''),ok:!!missionForm.desc},
                {l:'Platform',v:missionForm.platforms.map(p=>pName(p)).join(', ')||'—',ok:missionForm.platforms.length>0},
                {l:'XP',v:`${missionForm.xp||0} XP per orang`,ok:(missionForm.xp||0)>0},
                {l:'Deadline',v:missionForm.deadline||'—',ok:!!missionForm.deadline},
                {l:'Format',v:missionForm.format||'—',ok:!!missionForm.format},
                {l:'Hashtag',v:missionForm.hashtags||'—',ok:!!(missionForm.hashtags||'').trim()},
                {l:'Lokasi',v:missionForm.location||'Tidak diset',ok:missionForm.type!=='VISIT'||!!missionForm.location},
              ];
              const passCount=checks.filter(c=>c.ok).length;
              const aiScore=Math.round((passCount/checks.length)*100);
              const captions=missionForm.aiCaptions||[];
              const captionApproved=captions.filter(c=>c.approved).length;
              const alloc=missionForm.personaAlloc||{};
              const totalPeople=Object.values(alloc).reduce((s,v)=>s+(v||0),0)||estPeople;
              const warnings=[];
              if(!missionForm.title) warnings.push('Judul misi belum diisi');
              if(!missionForm.desc) warnings.push('Deskripsi belum diisi');
              if(missionForm.platforms.length===0) warnings.push('Belum memilih platform');
              if(!missionForm.deadline) warnings.push('Deadline belum diset');
              if(captions.length>0&&captionApproved<captions.length) warnings.push(`${captions.length-captionApproved} caption belum di-approve`);
              if(!missionForm.format) warnings.push('Format konten belum dipilih');
              return <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:40}}>
                <div style={{background:C.surface,borderRadius:20,border:`1px solid ${C.border}`,maxWidth:720,width:'100%',maxHeight:'85vh',overflow:'auto',boxShadow:'0 24px 80px rgba(0,0,0,0.5)'}} className="hide-scrollbar">
                  {/* Header */}
                  <div style={{padding:'20px 24px',borderBottom:`1px solid ${C.borderLight}`,background:C.primaryLight,borderRadius:'20px 20px 0 0',position:'sticky',top:0,zIndex:2}}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div style={{width:40,height:40,borderRadius:12,background:C.primary,display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <MI name="rate_review" size={20} style={{color:'white'}}/>
                        </div>
                        <div>
                          <h3 style={{fontSize:16,fontWeight:800,color:C.text}}>Review Misi</h3>
                          <p style={{fontSize:11,color:C.textMuted}}>Periksa semua detail sebelum publikasi</p>
                        </div>
                      </div>
                      <button onClick={()=>setMissionForm(f=>({...f,showReview:false}))} style={{width:32,height:32,borderRadius:8,border:`1px solid ${C.border}`,background:C.glass,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <MI name="close" size={18} style={{color:C.textMuted}}/>
                      </button>
                    </div>
                  </div>
                  <div style={{padding:24}} className="flex flex-col gap-5">
                    {/* AI Quality Score */}
                    <div className="flex gap-4">
                      <div style={{width:100,height:100,borderRadius:'50%',background:aiScore>=80?`${C.green}12`:aiScore>=60?`${C.orange}12`:`${C.red}12`,display:'flex',alignItems:'center',justifyContent:'center',border:`3px solid ${aiScore>=80?C.green:aiScore>=60?C.orange:C.red}`,flexShrink:0}}>
                        <div style={{textAlign:'center'}}>
                          <p style={{fontSize:28,fontWeight:900,color:aiScore>=80?C.green:aiScore>=60?C.orange:C.red,fontFamily:"'JetBrains Mono'",lineHeight:1}}>{aiScore}</p>
                          <p style={{fontSize:8,fontWeight:700,color:C.textMuted}}>AI SCORE</p>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:6}}>
                          {aiScore>=80?'Misi siap dipublikasikan!':aiScore>=60?'Beberapa item perlu dilengkapi':'Banyak item wajib belum terisi'}
                        </p>
                        {warnings.length>0&&<div className="flex flex-col gap-1">
                          {warnings.map((w,wi)=>(
                            <div key={wi} className="flex items-center gap-2">
                              <MI name="warning" size={12} fill style={{color:C.orange}}/>
                              <span style={{fontSize:11,color:C.orange}}>{w}</span>
                            </div>
                          ))}
                        </div>}
                        {warnings.length===0&&<div className="flex items-center gap-2">
                          <MI name="verified" size={16} fill style={{color:C.green}}/>
                          <span style={{fontSize:12,color:C.green,fontWeight:600}}>Semua item terisi lengkap</span>
                        </div>}
                      </div>
                    </div>

                    {/* Mission Preview Card */}
                    <div style={{background:C.bg,borderRadius:12,padding:16,border:`1px solid ${C.border}`}}>
                      <div className="flex items-center gap-2 mb-3">
                        <div style={{width:28,height:28,borderRadius:8,background:tb,display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <MI name={ti} size={14} fill style={{color:tc}}/>
                        </div>
                        <span style={{fontSize:11,fontWeight:700,color:tc,textTransform:'uppercase',letterSpacing:0.5}}>{missionForm.type}</span>
                        <span style={{marginLeft:'auto',fontSize:10,fontWeight:700,color:tc,background:tb,padding:'2px 8px',borderRadius:4}}>TERBUKA</span>
                      </div>
                      <h4 style={{fontSize:16,fontWeight:700,color:C.text,lineHeight:1.3,marginBottom:4}}>{missionForm.title||'Judul belum diisi'}</h4>
                      <p style={{fontSize:12,color:C.textMuted,lineHeight:1.4,marginBottom:10}}>{missionForm.desc||'Deskripsi belum diisi'}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{background:C.goldLight,color:C.gold,borderRadius:4,padding:'3px 10px',fontSize:12,fontWeight:700,fontFamily:"'JetBrains Mono'"}}>+{missionForm.xp||200} XP</span>
                        {(missionForm.bonus>0)&&<span style={{background:C.greenLight,color:C.green,borderRadius:4,padding:'3px 10px',fontSize:11,fontWeight:700}}>+{missionForm.bonus} early bird</span>}
                        {missionForm.deadline&&<span style={{background:C.surfaceLight,color:C.textSec,borderRadius:4,padding:'3px 10px',fontSize:11,fontWeight:600}}>Deadline: {missionForm.deadline}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        {missionForm.platforms.map(p=>(
                          <div key={p} className="flex items-center gap-1" style={{padding:'3px 8px',borderRadius:4,background:C.surfaceLight,border:`1px solid ${C.borderLight}`}}>
                            {pIcon(p)?<MI name={pIcon(p)} size={12} style={{color:pColor(p)}}/>:<SocialIcon platform={p} size={12} color={pColor(p)}/>}
                            <span style={{fontSize:10,fontWeight:600,color:C.textSec}}>{pName(p)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Detail Checklist */}
                    <div>
                      <p style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:8}}>Detail Kelengkapan</p>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                        {checks.map((c,ci)=>(
                          <div key={ci} className="flex items-center gap-2" style={{padding:'8px 10px',borderRadius:6,background:c.ok?`${C.green}06`:C.surfaceLight,border:`1px solid ${c.ok?`${C.green}15`:C.border}`}}>
                            <MI name={c.ok?'check_circle':'error'} size={14} fill style={{color:c.ok?C.green:C.orange,flexShrink:0}}/>
                            <div style={{flex:1,minWidth:0}}>
                              <p style={{fontSize:10,fontWeight:600,color:C.textMuted}}>{c.l}</p>
                              <p style={{fontSize:11,fontWeight:600,color:c.ok?C.text:C.orange,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.v}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Stats summary */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:10}}>
                      <div style={{background:C.primaryLight,borderRadius:8,padding:12,textAlign:'center',border:'1px solid rgba(201,168,76,0.15)'}}>
                        <p style={{fontSize:18,fontWeight:800,color:C.primary,fontFamily:"'JetBrains Mono'"}}>{totalPeople}</p>
                        <p style={{fontSize:9,color:C.textMuted,fontWeight:600}}>TARGET ORANG</p>
                      </div>
                      <div style={{background:C.goldLight,borderRadius:8,padding:12,textAlign:'center',border:'1px solid rgba(251,191,36,0.15)'}}>
                        <p style={{fontSize:18,fontWeight:800,color:C.gold,fontFamily:"'JetBrains Mono'"}}>{((missionForm.xp||200)*totalPeople/1000).toFixed(1)}K</p>
                        <p style={{fontSize:9,color:C.textMuted,fontWeight:600}}>TOTAL XP</p>
                      </div>
                      <div style={{background:C.greenLight,borderRadius:8,padding:12,textAlign:'center',border:'1px solid rgba(34,197,94,0.15)'}}>
                        <p style={{fontSize:18,fontWeight:800,color:C.green,fontFamily:"'JetBrains Mono'"}}>{missionForm.platforms.length}</p>
                        <p style={{fontSize:9,color:C.textMuted,fontWeight:600}}>PLATFORM</p>
                      </div>
                      <div style={{background:C.purpleLight,borderRadius:8,padding:12,textAlign:'center',border:'1px solid rgba(168,85,247,0.15)'}}>
                        <p style={{fontSize:18,fontWeight:800,color:C.purple,fontFamily:"'JetBrains Mono'"}}>{captions.length>0?`${captionApproved}/${captions.length}`:'—'}</p>
                        <p style={{fontSize:9,color:C.textMuted,fontWeight:600}}>CAPTION OK</p>
                      </div>
                    </div>

                    {/* AI Recommendation */}
                    <div style={{background:C.primaryLight,borderRadius:10,padding:14,border:'1px solid rgba(201,168,76,0.15)'}}>
                      <div className="flex items-center gap-2 mb-2">
                        <MI name="smart_toy" size={16} style={{color:C.primary}}/>
                        <span style={{fontSize:12,fontWeight:700,color:C.primary}}>AI Review</span>
                      </div>
                      <p style={{fontSize:12,color:C.textSec,lineHeight:1.5}}>
                        {aiScore>=80
                          ?`Misi "${missionForm.title}" sudah lengkap dan siap deploy ke ${missionForm.platforms.length} platform. Estimasi reach: ${totalPeople>200?'tinggi':'moderat'} dengan ${totalPeople} anggota aktif.`
                          :`Lengkapi item yang ditandai kuning untuk meningkatkan efektivitas misi. ${!missionForm.deadline?'Deadline sangat penting untuk urgensi.':''} ${missionForm.platforms.length===0?'Pilih minimal 1 platform target.':''}`}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button onClick={()=>setMissionForm(f=>({...f,showReview:false}))} style={{flex:1,padding:'14px 0',borderRadius:10,border:`1px solid ${C.border}`,background:'transparent',color:C.textSec,fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                        <MI name="arrow_back" size={16} style={{color:C.textMuted}}/> Kembali Edit
                      </button>
                      <button onClick={()=>{setMissionForm(f=>({...f,showReview:false}));showToast('Misi berhasil dipublikasikan!');}} className="btn-primary" style={{flex:2,padding:'14px 0',borderRadius:10,border:'none',background:aiScore>=60?'linear-gradient(135deg,#22C55E,#16A34A)':'linear-gradient(135deg,#F59E0B,#D97706)',color:'white',fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,boxShadow:aiScore>=60?'0 4px 15px rgba(34,197,94,0.3)':'0 4px 15px rgba(245,158,11,0.3)'}}>
                        <MI name="rocket_launch" size={18} style={{color:'white'}}/> {aiScore>=60?'Konfirmasi & Publikasikan':'Publikasikan Anyway'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>;
            })()}

          </div>);})()}

          </div>)}

          {/* ═══ AGENTS ═══ */}
          {adSideTab==='agents'&&(<div className="flex flex-col gap-5">
            {/* Filter Row */}
            <div className="flex gap-3">
              {['Semua','Gold','Silver','Bronze'].map(t=>(
                <button key={t} style={{padding:'8px 16px',borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontSize:13,fontWeight:600,cursor:'pointer'}}>{t}</button>
              ))}
            </div>
            <DCard title="Daftar Anggota" subtitle={`${agentsList.length} anggota terdaftar`}>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr>{['Anggota','Gender','Usia','Tier','Misi','XP','Engagement','Status'].map(h=>(
                      <th key={h} style={{padding:'8px 12px',fontSize:11,fontWeight:700,color:C.textMuted,textAlign:'left',borderBottom:`1px solid ${C.border}`,textTransform:'uppercase',letterSpacing:0.5}}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {agentsList.map((a,i)=>(
                      <tr key={i} style={{borderBottom:`1px solid ${C.borderLight}`}}>
                        <td style={{padding:'10px 12px'}}>
                          <div className="flex items-center gap-2">
                            <div style={{width:32,height:32,borderRadius:8,background:C.primaryLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:C.primary}}>{a.avatar}</div>
                            <span style={{fontSize:13,fontWeight:600,color:C.text}}>{a.name}</span>
                          </div>
                        </td>
                        <td style={{padding:'10px 12px',fontSize:12,color:C.textSec}}>{a.gender==='M'?'Laki-laki':'Perempuan'}</td>
                        <td style={{padding:'10px 12px',fontSize:12,color:C.textSec}}>{a.age}</td>
                        <td style={{padding:'10px 12px'}}><span style={{fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:4,background:a.tier==='Gold'?C.orangeLight:a.tier==='Silver'?C.borderLight:C.bg,color:a.tier==='Gold'?C.orange:a.tier==='Silver'?C.textSec:C.textMuted}}>{a.tier}</span></td>
                        <td style={{padding:'10px 12px',fontSize:13,fontWeight:600,color:C.text,fontFamily:"'JetBrains Mono'"}}>{a.missions}</td>
                        <td style={{padding:'10px 12px',fontSize:13,fontWeight:600,color:C.orange,fontFamily:"'JetBrains Mono'"}}>{a.xp.toLocaleString()}</td>
                        <td style={{padding:'10px 12px',fontSize:13,fontWeight:600,color:C.text,fontFamily:"'JetBrains Mono'"}}>{a.engagement}</td>
                        <td style={{padding:'10px 12px'}}><span style={{width:8,height:8,borderRadius:'50%',background:a.status==='active'?C.green:C.textMuted,display:'inline-block',marginRight:4}}/><span style={{fontSize:12,color:a.status==='active'?C.green:C.textMuted}}>{a.status==='active'?'Aktif':'Idle'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DCard>
          </div>)}

          {/* ═══ MISSION DETAIL (Admin) ═══ */}
          {adSideTab==='missionDetail'&&(()=>{
            const m=MISSIONS.find(x=>x.id===selectedAdMission)||MISSIONS[0];
            const tc=typeColor(m.type);
            // Registered members (joined but haven't uploaded yet)
            const registeredMembers=[
              {agent:'Maya Sari',avatar:'MS',joinedAt:'7 Mar 2026',tier:'Gold',platform:'instagram'},
              {agent:'Reza Pratama',avatar:'RP',joinedAt:'7 Mar 2026',tier:'Silver',platform:'tiktok'},
              {agent:'Nadia Putri',avatar:'NP',joinedAt:'8 Mar 2026',tier:'Bronze',platform:'x'},
              {agent:'Dimas Aditya',avatar:'DA',joinedAt:'8 Mar 2026',tier:'Silver',platform:'tiktok'},
            ];
            // Submitted posts (uploaded content) with geo + social tracking
            const missionPosts=[
              {agent:'Arif Santoso',avatar:'AS',platform:'tiktok',title:'Tips Aman Pakai WiFi Publik',link:'tiktok.com/@arifsantoso_/video/123',date:'6 Mar 2026',time:'14:32',views:'128.4K',likes:'12.3K',comments:'1.2K',shares:'4.5K',rate:14.2,status:'SELESAI',xp:m.xp,lat:-6.2088,lng:106.8456,city:'Jakarta',likedBy:['Rina Dewi','Sari Utami','Budi Hartono'],sharedBy:['Rina Dewi','Fajar Nugroho']},
              {agent:'Rina Dewi',avatar:'RD',platform:'instagram',title:'Cara Cek Fakta Berita Online',link:'instagram.com/p/ABC123',date:'5 Mar 2026',time:'09:15',views:'45.8K',likes:'5.6K',comments:'342',shares:'1.8K',rate:11.8,status:'SELESAI',xp:m.xp,lat:-6.9175,lng:107.6191,city:'Bandung',likedBy:['Arif Santoso','Sari Utami'],sharedBy:['Arif Santoso']},
              {agent:'Fajar Nugroho',avatar:'FN',platform:'x',title:'Thread: Panduan Keamanan Digital',link:'x.com/fajar_n/status/456',date:'4 Mar 2026',time:'20:45',views:'18.2K',likes:'2.1K',comments:'187',shares:'956',rate:9.4,status:'REVIEW',xp:0,lat:-7.7956,lng:110.3695,city:'Yogyakarta',likedBy:['Arif Santoso'],sharedBy:[]},
              {agent:'Sari Utami',avatar:'SU',platform:'tiktok',title:'POV: Kamu Kena Phishing',link:'tiktok.com/@sariutami/video/789',date:'3 Mar 2026',time:'16:20',views:'256.1K',likes:'28.9K',comments:'3.4K',shares:'8.7K',rate:18.1,status:'SELESAI',xp:m.xp,lat:-7.2575,lng:112.7521,city:'Surabaya',likedBy:['Arif Santoso','Rina Dewi','Fajar Nugroho','Budi Hartono','Ahmad Rizki'],sharedBy:['Rina Dewi','Budi Hartono','Ahmad Rizki']},
              {agent:'Budi Hartono',avatar:'BH',platform:'instagram',title:'Infografis Keamanan Digital',link:'instagram.com/p/DEF456',date:'3 Mar 2026',time:'11:08',views:'22.3K',likes:'3.2K',comments:'156',shares:'890',rate:8.6,status:'REVIEW',xp:0,lat:-5.1477,lng:119.4327,city:'Makassar',likedBy:['Sari Utami','Ahmad Rizki'],sharedBy:['Ahmad Rizki']},
              {agent:'Ahmad Rizki',avatar:'AR',platform:'x',title:'5 Tanda Penipuan Online',link:'x.com/ahmad_r/status/101',date:'2 Mar 2026',time:'08:30',views:'8.1K',likes:'920',comments:'78',shares:'310',rate:7.1,status:'DITOLAK',xp:0,lat:-8.6705,lng:115.2126,city:'Bali',likedBy:['Sari Utami'],sharedBy:[]},
            ];
            const completedCount=missionPosts.filter(p=>p.status==='SELESAI').length;
            const reviewCount=missionPosts.filter(p=>p.status==='REVIEW').length;
            const totalReach=missionPosts.reduce((s,p)=>s+parseFloat(p.views)*1000,0);
            return(<div className="flex flex-col gap-5">
              {/* Back + Header */}
              <button onClick={()=>setAdSideTab('dashboard')} style={{color:C.textSec,fontSize:13,fontWeight:600,background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
                <MI name="arrow_back" size={18} style={{color:C.textSec}}/> Kembali ke Dashboard
              </button>

              <DCard style={{padding:0}}>
                <div style={{padding:'20px 24px',borderBottom:`1px solid ${C.borderLight}`}}>
                  <div className="flex items-center gap-3 mb-3">
                    <div style={{width:36,height:36,borderRadius:10,background:typeBg(m.type),display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <MI name={typeIcon(m.type)} size={18} fill style={{color:tc}}/>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span style={{fontSize:11,fontWeight:700,color:tc,textTransform:'uppercase',letterSpacing:1}}>{m.type}</span>
                        <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:4,background:typeBg(m.type),color:tc}}>{m.status}</span>
                      </div>
                      <h2 style={{fontSize:20,fontWeight:800,color:C.text,marginTop:4}}>{m.title}</h2>
                    </div>
                    <span style={{fontSize:16,fontWeight:800,color:C.gold,fontFamily:"'JetBrains Mono'",background:C.goldLight,padding:'6px 14px',borderRadius:8,border:'1px solid rgba(201,168,76,0.2)'}}>+{m.xp} XP</span>
                  </div>
                  <p style={{fontSize:13,color:C.textSec,lineHeight:1.5}}>{m.desc}</p>
                </div>
                {/* Mission Pipeline Stats */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:0,borderBottom:`1px solid ${C.borderLight}`}}>
                  {[
                    {l:'Terdaftar',v:registeredMembers.length.toString(),c:C.orange,icon:'how_to_reg'},
                    {l:'Uploaded',v:missionPosts.length.toString(),c:C.teal,icon:'upload_file'},
                    {l:'Review',v:reviewCount.toString(),c:C.purple,icon:'rate_review'},
                    {l:'Selesai',v:completedCount.toString(),c:C.green,icon:'check_circle'},
                    {l:'Reach Total',v:m.analytics?.reach||'—',c:C.primary,icon:'visibility'},
                    {l:'Engagement',v:m.analytics?.engagement||'—',c:C.pink,icon:'trending_up'},
                  ].map((s,i)=>(
                    <div key={i} style={{padding:'16px 8px',textAlign:'center',borderRight:i<5?`1px solid ${C.borderLight}`:'none'}}>
                      <MI name={s.icon} size={14} style={{color:s.c,marginBottom:4}}/>
                      <p style={{fontSize:18,fontWeight:800,color:s.c,fontFamily:"'JetBrains Mono'"}}>{s.v}</p>
                      <p style={{fontSize:9,color:C.textMuted,fontWeight:600,marginTop:2}}>{s.l}</p>
                    </div>
                  ))}
                </div>
                {m.analytics&&(
                  <div style={{padding:'16px 24px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
                    {[{l:'Completion',v:`${m.analytics.completion}%`,c:m.analytics.completion>=70?C.green:C.orange},
                      {l:'Sentimen',v:`${m.analytics.sentiment}%`,c:m.analytics.sentiment>=70?C.green:C.orange},
                      {l:'Konversi',v:m.analytics.conversionRate,c:C.primary},
                      {l:'Avg Time',v:m.analytics.avgTime,c:C.textSec},
                    ].map((s,i)=>(
                      <div key={i} style={{background:C.surfaceLight,borderRadius:8,padding:12,textAlign:'center'}}>
                        <p style={{fontSize:16,fontWeight:800,color:s.c,fontFamily:"'JetBrains Mono'"}}>{s.v}</p>
                        <p style={{fontSize:10,color:C.textMuted}}>{s.l}</p>
                      </div>
                    ))}
                  </div>
                )}
              </DCard>

              {/* Pipeline Funnel */}
              <DCard title="Pipeline Anggota" subtitle="Funnel: Daftar → Upload → Review → Selesai">
                <div className="flex items-center gap-3" style={{padding:'8px 0'}}>
                  {[
                    {label:'Daftar',count:m.participants,color:C.primary,icon:'how_to_reg'},
                    {label:'Upload',count:missionPosts.length+registeredMembers.length-registeredMembers.length,color:C.teal,icon:'cloud_upload'},
                    {label:'Review',count:reviewCount,color:C.purple,icon:'rate_review'},
                    {label:'Selesai',count:completedCount,color:C.green,icon:'check_circle'},
                  ].map((s,i,arr)=>(
                    <React.Fragment key={i}>
                      <div style={{flex:1,textAlign:'center'}}>
                        <div style={{width:48,height:48,borderRadius:'50%',background:`${s.color}15`,border:`2px solid ${s.color}`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 6px'}}>
                          <span style={{fontSize:18,fontWeight:800,color:s.color,fontFamily:"'JetBrains Mono'"}}>{s.count}</span>
                        </div>
                        <p style={{fontSize:10,fontWeight:700,color:s.color}}>{s.label}</p>
                        {i>0&&<p style={{fontSize:9,color:C.textMuted,marginTop:2}}>{arr[0].count>0?Math.round(s.count/arr[0].count*100):0}%</p>}
                      </div>
                      {i<arr.length-1&&<MI name="arrow_forward" size={16} style={{color:C.textMuted,flexShrink:0}}/>}
                    </React.Fragment>
                  ))}
                </div>
                {/* Conversion bar */}
                <div style={{marginTop:8,background:C.surfaceLight,borderRadius:6,height:8,overflow:'hidden',display:'flex'}}>
                  <div style={{width:`${m.participants>0?(registeredMembers.length/m.participants)*100:0}%`,background:C.orange,transition:'width 600ms'}}/>
                  <div style={{width:`${m.participants>0?((missionPosts.length-completedCount-reviewCount)/m.participants)*100:0}%`,background:C.teal,transition:'width 600ms'}}/>
                  <div style={{width:`${m.participants>0?(reviewCount/m.participants)*100:0}%`,background:C.purple,transition:'width 600ms'}}/>
                  <div style={{width:`${m.participants>0?(completedCount/m.participants)*100:0}%`,background:C.green,transition:'width 600ms'}}/>
                </div>
                <div className="flex gap-4 mt-2" style={{justifyContent:'center'}}>
                  {[{l:'Menunggu',c:C.orange},{l:'Upload',c:C.teal},{l:'Review',c:C.purple},{l:'Selesai',c:C.green}].map(s=>(
                    <div key={s.l} className="flex items-center gap-1">
                      <div style={{width:8,height:8,borderRadius:2,background:s.c}}/>
                      <span style={{fontSize:9,color:C.textMuted}}>{s.l}</span>
                    </div>
                  ))}
                </div>
              </DCard>

              {/* ═══ 3D GLOBE — Social Media Monitoring ═══ */}
              {(()=>{
                // Build arcs from social interactions (likes/shares between agents)
                const arcs=[];
                missionPosts.forEach(post=>{
                  (post.likedBy||[]).forEach(liker=>{
                    const likerPost=missionPosts.find(p=>p.agent===liker);
                    if(likerPost&&likerPost.agent!==post.agent){
                      arcs.push({startLat:likerPost.lat,startLng:likerPost.lng,endLat:post.lat,endLng:post.lng,color:['rgba(201,168,76,0.6)','rgba(201,168,76,0.15)'],label:`${liker} → liked → ${post.agent}`,type:'like'});
                    }
                  });
                  (post.sharedBy||[]).forEach(sharer=>{
                    const sharerPost=missionPosts.find(p=>p.agent===sharer);
                    if(sharerPost&&sharerPost.agent!==post.agent){
                      arcs.push({startLat:sharerPost.lat,startLng:sharerPost.lng,endLat:post.lat,endLng:post.lng,color:['rgba(45,212,191,0.7)','rgba(45,212,191,0.15)'],label:`${sharer} → shared → ${post.agent}`,type:'share'});
                    }
                  });
                });
                // Points for each post location
                const points=missionPosts.map(p=>({lat:p.lat,lng:p.lng,agent:p.agent,city:p.city,platform:p.platform,title:p.title,views:p.views,rate:p.rate,status:p.status,size:Math.max(0.3,p.rate/20),color:p.status==='SELESAI'?C.green:p.status==='REVIEW'?C.orange:C.red}));

                return(<>
                <DCard title="3D Globe — Peta Konten Aktif" subtitle="Geolokasi post anggota & interaksi sosial antar kota" action={<div className="flex items-center gap-3">
                  {[{l:'Like',c:'#C9A84C'},{l:'Share',c:'#2DD4BF'}].map(x=>(
                    <div key={x.l} className="flex items-center gap-1"><div style={{width:10,height:3,borderRadius:2,background:x.c}}/><span style={{fontSize:10,color:C.textMuted}}>{x.l}</span></div>
                  ))}
                </div>}>
                  <div style={{position:'relative',borderRadius:12,overflow:'hidden',background:'radial-gradient(ellipse at center,#0a1628 0%,#060d1a 100%)',border:`1px solid ${C.border}`}}>
                    <Globe
                      width={760} height={480}
                      globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
                      bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                      backgroundImageUrl=""
                      backgroundColor="rgba(0,0,0,0)"
                      atmosphereColor="rgba(201,168,76,0.3)"
                      atmosphereAltitude={0.2}
                      pointsData={points}
                      pointLat="lat" pointLng="lng"
                      pointAltitude={d=>d.size*0.06}
                      pointRadius={d=>d.size*0.5}
                      pointColor="color"
                      pointLabel={d=>`<div style="background:#0F1A2E;border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:10px 14px;font-family:Inter,sans-serif;min-width:180px;box-shadow:0 8px 32px rgba(0,0,0,0.5)">
                        <div style="font-size:13px;font-weight:700;color:#F1F5F9;margin-bottom:4px">${d.agent}</div>
                        <div style="font-size:11px;color:#94A3B8;margin-bottom:6px">${d.city} · ${d.platform}</div>
                        <div style="font-size:11px;color:#C9A84C;font-weight:600">${d.title}</div>
                        <div style="display:flex;gap:12px;margin-top:6px">
                          <span style="font-size:10px;color:#94A3B8">👁 ${d.views}</span>
                          <span style="font-size:10px;color:${d.status==='SELESAI'?'#22C55E':d.status==='REVIEW'?'#F59E0B':'#EF4444'};font-weight:600">${d.status}</span>
                          <span style="font-size:10px;color:#C9A84C;font-weight:700">${d.rate}%</span>
                        </div>
                      </div>`}
                      arcsData={arcs}
                      arcStartLat="startLat" arcStartLng="startLng"
                      arcEndLat="endLat" arcEndLng="endLng"
                      arcColor="color"
                      arcDashLength={0.4} arcDashGap={0.2} arcDashAnimateTime={2500}
                      arcStroke={0.5}
                      arcLabel={d=>`<div style="background:#0F1A2E;border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:6px 10px;font-family:Inter;font-size:10px;color:#94A3B8;box-shadow:0 4px 16px rgba(0,0,0,0.4)">${d.label}</div>`}
                      animateIn={true}
                      // Camera focused on Indonesia
                      pointOfView={{lat:-2.5,lng:118,altitude:2.2}}
                    />
                    {/* Overlay Stats */}
                    <div style={{position:'absolute',top:16,left:16,display:'flex',flexDirection:'column',gap:8}}>
                      <div style={{background:'rgba(15,26,46,0.85)',backdropFilter:'blur(12px)',borderRadius:8,padding:'8px 12px',border:'1px solid rgba(255,255,255,0.08)'}}>
                        <p style={{fontSize:9,color:C.textMuted,fontWeight:600,textTransform:'uppercase',letterSpacing:1}}>Total Post</p>
                        <p style={{fontSize:20,fontWeight:800,color:C.primary,fontFamily:"'JetBrains Mono'"}}>{missionPosts.length}</p>
                      </div>
                      <div style={{background:'rgba(15,26,46,0.85)',backdropFilter:'blur(12px)',borderRadius:8,padding:'8px 12px',border:'1px solid rgba(255,255,255,0.08)'}}>
                        <p style={{fontSize:9,color:C.textMuted,fontWeight:600,textTransform:'uppercase',letterSpacing:1}}>Kota Aktif</p>
                        <p style={{fontSize:20,fontWeight:800,color:C.teal,fontFamily:"'JetBrains Mono'"}}>{new Set(missionPosts.map(p=>p.city)).size}</p>
                      </div>
                      <div style={{background:'rgba(15,26,46,0.85)',backdropFilter:'blur(12px)',borderRadius:8,padding:'8px 12px',border:'1px solid rgba(255,255,255,0.08)'}}>
                        <p style={{fontSize:9,color:C.textMuted,fontWeight:600,textTransform:'uppercase',letterSpacing:1}}>Interaksi</p>
                        <p style={{fontSize:20,fontWeight:800,color:'#C9A84C',fontFamily:"'JetBrains Mono'"}}>{arcs.length}</p>
                      </div>
                    </div>
                    {/* City Legend */}
                    <div style={{position:'absolute',bottom:16,right:16,display:'flex',flexDirection:'column',gap:4}}>
                      {[...new Set(missionPosts.map(p=>p.city))].map(city=>{
                        const cp=missionPosts.find(p=>p.city===city);
                        return(<div key={city} className="flex items-center gap-2" style={{background:'rgba(15,26,46,0.85)',backdropFilter:'blur(12px)',borderRadius:6,padding:'4px 10px',border:'1px solid rgba(255,255,255,0.06)'}}>
                          <div style={{width:6,height:6,borderRadius:'50%',background:cp.status==='SELESAI'?C.green:cp.status==='REVIEW'?C.orange:C.red}}/>
                          <span style={{fontSize:10,color:C.textSec,fontWeight:600}}>{city}</span>
                          <span style={{fontSize:9,color:C.textMuted}}>{cp.agent}</span>
                        </div>);
                      })}
                    </div>
                  </div>
                </DCard>

                {/* ═══ CONTENT TIMELINE ═══ */}
                <DCard title="Timeline Konten" subtitle="Kronologi postingan anggota misi ini">
                  <div style={{position:'relative',paddingLeft:28}}>
                    {/* Vertical line */}
                    <div style={{position:'absolute',left:10,top:0,bottom:0,width:2,background:`linear-gradient(to bottom,${C.primary},${C.border})`,borderRadius:1}}/>
                    {missionPosts.sort((a,b)=>new Date('2026-03-'+b.date.split(' ')[0])-new Date('2026-03-'+a.date.split(' ')[0])).map((post,i)=>{
                      const stCol=post.status==='SELESAI'?C.green:post.status==='REVIEW'?C.orange:C.red;
                      return(
                      <div key={i} style={{position:'relative',paddingBottom:i<missionPosts.length-1?20:0}}>
                        {/* Timeline dot */}
                        <div style={{position:'absolute',left:-22,top:4,width:12,height:12,borderRadius:'50%',background:stCol,border:'2px solid #0B1120',boxShadow:`0 0 8px ${stCol}40`}}/>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,background:C.surfaceLight,borderRadius:10,padding:16,border:`1px solid ${C.border}`}}>
                          {/* Left: Content Info */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div style={{width:28,height:28,borderRadius:8,background:C.primaryLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:C.primary}}>{post.avatar}</div>
                              <div>
                                <p style={{fontSize:13,fontWeight:700,color:C.text}}>{post.agent}</p>
                                <p style={{fontSize:10,color:C.textMuted}}>{post.city} · {post.date}, {post.time}</p>
                              </div>
                              <span style={{marginLeft:'auto',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:4,background:post.status==='SELESAI'?C.greenLight:post.status==='REVIEW'?C.orangeLight:C.redLight,color:stCol}}>{post.status}</span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <SocialIcon platform={post.platform} size={14} color={pColor(post.platform)}/>
                              <p style={{fontSize:12,fontWeight:600,color:C.text}}>{post.title}</p>
                            </div>
                            {/* Engagement */}
                            <div className="flex gap-3">
                              {[{l:'Views',v:post.views,c:C.primary},{l:'Likes',v:post.likes,c:C.pink},{l:'Comments',v:post.comments,c:C.teal},{l:'Shares',v:post.shares,c:C.orange}].map(s=>(
                                <div key={s.l} style={{textAlign:'center'}}>
                                  <p style={{fontSize:12,fontWeight:700,color:s.c,fontFamily:"'JetBrains Mono'"}}>{s.v}</p>
                                  <p style={{fontSize:8,color:C.textMuted,fontWeight:600}}>{s.l}</p>
                                </div>
                              ))}
                              <div style={{marginLeft:'auto',textAlign:'right'}}>
                                <p style={{fontSize:16,fontWeight:800,color:post.rate>15?C.green:post.rate>10?C.orange:C.textSec,fontFamily:"'JetBrains Mono'"}}>{post.rate}%</p>
                                <p style={{fontSize:8,color:C.textMuted,fontWeight:600}}>Rate</p>
                              </div>
                            </div>
                          </div>
                          {/* Right: Social interactions - who liked & shared */}
                          <div style={{borderLeft:`1px solid ${C.border}`,paddingLeft:16}}>
                            <p style={{fontSize:10,fontWeight:700,color:C.textMuted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:6}}>Interaksi Antar Anggota</p>
                            {post.likedBy&&post.likedBy.length>0&&(
                              <div style={{marginBottom:8}}>
                                <div className="flex items-center gap-1 mb-2">
                                  <MI name="favorite" size={12} fill style={{color:C.pink}}/>
                                  <span style={{fontSize:10,fontWeight:600,color:C.pink}}>Dilike oleh ({post.likedBy.length})</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {post.likedBy.map(name=>{
                                    const p2=missionPosts.find(p=>p.agent===name);
                                    return(<span key={name} style={{fontSize:9,fontWeight:600,padding:'2px 8px',borderRadius:4,background:C.primaryLight,color:C.primary,display:'inline-flex',alignItems:'center',gap:3}}>
                                      {p2&&<SocialIcon platform={p2.platform} size={8} color={C.primary}/>}{name.split(' ')[0]}
                                    </span>);
                                  })}
                                </div>
                              </div>
                            )}
                            {post.sharedBy&&post.sharedBy.length>0&&(
                              <div>
                                <div className="flex items-center gap-1 mb-2">
                                  <MI name="share" size={12} style={{color:C.teal}}/>
                                  <span style={{fontSize:10,fontWeight:600,color:C.teal}}>Dishare oleh ({post.sharedBy.length})</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {post.sharedBy.map(name=>{
                                    const p2=missionPosts.find(p=>p.agent===name);
                                    return(<span key={name} style={{fontSize:9,fontWeight:600,padding:'2px 8px',borderRadius:4,background:C.tealLight,color:C.teal,display:'inline-flex',alignItems:'center',gap:3}}>
                                      {p2&&<SocialIcon platform={p2.platform} size={8} color={C.teal}/>}{name.split(' ')[0]}
                                    </span>);
                                  })}
                                </div>
                              </div>
                            )}
                            {(!post.likedBy||post.likedBy.length===0)&&(!post.sharedBy||post.sharedBy.length===0)&&(
                              <p style={{fontSize:11,color:C.textMuted,fontStyle:'italic'}}>Belum ada interaksi</p>
                            )}
                          </div>
                        </div>
                      </div>);
                    })}
                  </div>
                </DCard>

                {/* ═══ SOCIAL INTERACTION GRAPH ═══ */}
                <DCard title="Jaringan Interaksi Anggota" subtitle="Siapa yang me-like dan men-share post siapa">
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                    {missionPosts.map(post=>{
                      const totalInteractions=(post.likedBy?.length||0)+(post.sharedBy?.length||0);
                      const stCol=post.status==='SELESAI'?C.green:post.status==='REVIEW'?C.orange:C.red;
                      return(
                      <div key={post.agent} style={{background:C.surfaceLight,borderRadius:10,padding:14,border:`1px solid ${C.border}`,position:'relative',overflow:'hidden'}}>
                        {/* Glow for high interaction */}
                        {totalInteractions>=4&&<div style={{position:'absolute',top:-20,right:-20,width:60,height:60,borderRadius:'50%',background:'radial-gradient(circle,rgba(201,168,76,0.12),transparent 70%)',pointerEvents:'none'}}/>}
                        <div className="flex items-center gap-2 mb-3">
                          <div style={{width:32,height:32,borderRadius:8,background:C.primaryLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:C.primary}}>{post.avatar}</div>
                          <div className="flex-1">
                            <p style={{fontSize:12,fontWeight:700,color:C.text}}>{post.agent.split(' ')[0]}</p>
                            <p style={{fontSize:9,color:C.textMuted}}>{post.city}</p>
                          </div>
                          <SocialIcon platform={post.platform} size={14} color={pColor(post.platform)}/>
                        </div>
                        {/* Interaction Score */}
                        <div style={{textAlign:'center',marginBottom:10}}>
                          <div style={{width:48,height:48,borderRadius:'50%',background:`${C.primary}15`,border:`2px solid ${totalInteractions>=4?C.primary:C.border}`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto',boxShadow:totalInteractions>=4?`0 0 12px ${C.primary}30`:'none'}}>
                            <span style={{fontSize:18,fontWeight:800,color:totalInteractions>=4?C.primary:C.textSec,fontFamily:"'JetBrains Mono'"}}>{totalInteractions}</span>
                          </div>
                          <p style={{fontSize:9,color:C.textMuted,marginTop:4}}>interaksi</p>
                        </div>
                        {/* Like / Share breakdown */}
                        <div className="flex gap-2">
                          <div style={{flex:1,background:`${C.pink}10`,borderRadius:6,padding:'6px 4px',textAlign:'center'}}>
                            <MI name="favorite" size={12} fill style={{color:C.pink}}/>
                            <p style={{fontSize:13,fontWeight:700,color:C.pink,fontFamily:"'JetBrains Mono'"}}>{post.likedBy?.length||0}</p>
                            <p style={{fontSize:8,color:C.textMuted}}>Likes</p>
                          </div>
                          <div style={{flex:1,background:`${C.teal}10`,borderRadius:6,padding:'6px 4px',textAlign:'center'}}>
                            <MI name="share" size={12} style={{color:C.teal}}/>
                            <p style={{fontSize:13,fontWeight:700,color:C.teal,fontFamily:"'JetBrains Mono'"}}>{post.sharedBy?.length||0}</p>
                            <p style={{fontSize:8,color:C.textMuted}}>Shares</p>
                          </div>
                        </div>
                        {/* Rate badge */}
                        <div style={{marginTop:8,textAlign:'center'}}>
                          <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:4,background:post.rate>15?C.greenLight:post.rate>10?C.orangeLight:C.surfaceLight,color:post.rate>15?C.green:post.rate>10?C.orange:C.textMuted}}>{post.rate}% eng.</span>
                          <span style={{fontSize:9,marginLeft:6,fontWeight:600,padding:'2px 6px',borderRadius:4,background:post.status==='SELESAI'?C.greenLight:post.status==='REVIEW'?C.orangeLight:C.redLight,color:stCol}}>{post.status}</span>
                        </div>
                      </div>);
                    })}
                  </div>
                  {/* Top Interactions */}
                  <div style={{marginTop:16,padding:12,background:C.bg,borderRadius:8,border:`1px solid ${C.border}`}}>
                    <p style={{fontSize:10,fontWeight:700,color:C.textMuted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:8}}>Top Cross-Interaction</p>
                    <div className="flex flex-col gap-2">
                      {arcs.slice(0,6).map((arc,i)=>(
                        <div key={i} className="flex items-center gap-2" style={{fontSize:11,color:C.textSec}}>
                          <MI name={arc.type==='like'?'favorite':'share'} size={12} fill={arc.type==='like'} style={{color:arc.type==='like'?C.pink:C.teal}}/>
                          <span style={{fontWeight:600,color:C.text}}>{arc.label.split(' → ')[0]}</span>
                          <MI name="arrow_forward" size={10} style={{color:C.textMuted}}/>
                          <span style={{color:arc.type==='like'?C.pink:C.teal,fontWeight:600}}>{arc.type==='like'?'liked':'shared'}</span>
                          <MI name="arrow_forward" size={10} style={{color:C.textMuted}}/>
                          <span style={{fontWeight:600,color:C.text}}>{arc.label.split(' → ')[2]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </DCard>
                </>);
              })()}

              {/* Registered Members (not uploaded yet) */}
              <DCard title="Anggota Terdaftar" subtitle={`${registeredMembers.length} anggota belum upload konten`}>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr>{['Anggota','Tier','Platform','Bergabung','Status','Aksi'].map(h=>(
                        <th key={h} style={{padding:'10px 12px',fontSize:11,fontWeight:700,color:C.textMuted,textAlign:'left',borderBottom:`1px solid ${C.border}`,textTransform:'uppercase',letterSpacing:0.5,whiteSpace:'nowrap'}}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {registeredMembers.map((mem,i)=>(
                        <tr key={i} style={{borderBottom:`1px solid ${C.borderLight}`}}>
                          <td style={{padding:'12px'}}>
                            <div className="flex items-center gap-2">
                              <div style={{width:32,height:32,borderRadius:8,background:C.orangeLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:C.orange}}>{mem.avatar}</div>
                              <span style={{fontSize:13,fontWeight:600,color:C.text}}>{mem.agent}</span>
                            </div>
                          </td>
                          <td style={{padding:'12px'}}><span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:4,background:mem.tier==='Gold'?C.goldLight:mem.tier==='Silver'?C.surfaceLight:C.orangeLight,color:mem.tier==='Gold'?C.gold:mem.tier==='Silver'?C.textSec:C.orange}}>{mem.tier}</span></td>
                          <td style={{padding:'12px'}}>
                            <div className="flex items-center gap-2">
                              <SocialIcon platform={mem.platform} size={14} color={pColor(mem.platform)}/>
                              <span style={{fontSize:12,color:C.text}}>{pName(mem.platform)}</span>
                            </div>
                          </td>
                          <td style={{padding:'12px',fontSize:12,color:C.textSec}}>{mem.joinedAt}</td>
                          <td style={{padding:'12px'}}><span style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:4,background:C.orangeLight,color:C.orange}}>Menunggu Upload</span></td>
                          <td style={{padding:'12px'}}>
                            <button onClick={()=>showToast(`Reminder dikirim ke ${mem.agent}`)} style={{fontSize:11,fontWeight:600,color:C.primary,background:C.primaryLight,border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer'}}>
                              <MI name="notifications_active" size={12} style={{verticalAlign:'middle',marginRight:3}}/>Remind
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DCard>

              {/* Submissions Table */}
              <DCard title="Konten yang Disubmit" subtitle={`${missionPosts.length} submission untuk misi ini`}>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr>{['Anggota','Platform','Konten','Link','Views','Likes','Rate','Status','Aksi'].map(h=>(
                        <th key={h} style={{padding:'10px 12px',fontSize:11,fontWeight:700,color:C.textMuted,textAlign:'left',borderBottom:`1px solid ${C.border}`,textTransform:'uppercase',letterSpacing:0.5,whiteSpace:'nowrap'}}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {missionPosts.map((post,i)=>{
                        const stCol=post.status==='SELESAI'?C.green:post.status==='REVIEW'?C.orange:C.red;
                        const stBg=post.status==='SELESAI'?C.greenLight:post.status==='REVIEW'?C.orangeLight:C.redLight;
                        return(
                        <tr key={i} style={{borderBottom:`1px solid ${C.borderLight}`}}>
                          <td style={{padding:'12px'}}>
                            <div className="flex items-center gap-2">
                              <div style={{width:32,height:32,borderRadius:8,background:C.primaryLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:C.primary}}>{post.avatar}</div>
                              <span style={{fontSize:13,fontWeight:600,color:C.text}}>{post.agent}</span>
                            </div>
                          </td>
                          <td style={{padding:'12px'}}>
                            <div className="flex items-center gap-2">
                              <SocialIcon platform={post.platform} size={14} color={pColor(post.platform)}/>
                              <span style={{fontSize:12,color:C.text}}>{pName(post.platform)}</span>
                            </div>
                          </td>
                          <td style={{padding:'12px',maxWidth:200}}><p style={{fontSize:12,fontWeight:600,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{post.title}</p><p style={{fontSize:10,color:C.textMuted}}>{post.date}</p></td>
                          <td style={{padding:'12px'}}><span style={{fontSize:11,color:C.primary,fontFamily:"'JetBrains Mono'",cursor:'pointer',textDecoration:'underline',textDecorationColor:'rgba(201,168,76,0.3)'}}>{post.link}</span></td>
                          <td style={{padding:'12px',fontSize:13,fontWeight:700,color:C.text,fontFamily:"'JetBrains Mono'",whiteSpace:'nowrap'}}>{post.views}</td>
                          <td style={{padding:'12px',fontSize:13,fontWeight:600,color:C.text,fontFamily:"'JetBrains Mono'",whiteSpace:'nowrap'}}>{post.likes}</td>
                          <td style={{padding:'12px'}}>
                            <div className="flex items-center gap-2">
                              <ProgressBar progress={post.rate/25} color={post.rate>15?C.green:post.rate>10?C.orange:C.textSec} height={4}/>
                              <span style={{fontSize:11,fontWeight:700,color:post.rate>15?C.green:post.rate>10?C.orange:C.text,fontFamily:"'JetBrains Mono'",whiteSpace:'nowrap'}}>{post.rate}%</span>
                            </div>
                          </td>
                          <td style={{padding:'12px'}}><span style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:4,background:stBg,color:stCol,whiteSpace:'nowrap'}}>{post.status==='SELESAI'?'Selesai':post.status==='REVIEW'?'Direview':'Ditolak'}</span></td>
                          <td style={{padding:'12px'}}>
                            {post.status==='REVIEW'&&(
                              <div className="flex gap-1">
                                <button onClick={()=>showToast(`Postingan ${post.agent} disetujui!`)} style={{width:28,height:28,borderRadius:6,border:'none',background:C.greenLight,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                  <MI name="check" size={14} style={{color:C.green}}/>
                                </button>
                                <button onClick={()=>showToast(`Postingan ${post.agent} ditolak`)} style={{width:28,height:28,borderRadius:6,border:'none',background:C.redLight,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                  <MI name="close" size={14} style={{color:C.red}}/>
                                </button>
                              </div>
                            )}
                            {post.status==='SELESAI'&&<span style={{fontSize:10,fontWeight:700,color:C.gold,fontFamily:"'JetBrains Mono'"}}>+{post.xp} XP</span>}
                          </td>
                        </tr>);
                      })}
                    </tbody>
                  </table>
                </div>
              </DCard>

              {/* Per-Platform Breakdown */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
                {['tiktok','instagram','x'].map(plat=>{
                  const posts=missionPosts.filter(p=>p.platform===plat);
                  const tViews=posts.reduce((s,p)=>s+parseFloat(p.views)*1000,0);
                  return(
                  <DCard key={plat} style={{padding:0}}>
                    <div style={{padding:16,textAlign:'center'}}>
                      <div style={{width:40,height:40,borderRadius:10,background:`${pColor(plat)}15`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px'}}>
                        <SocialIcon platform={plat} size={20} color={pColor(plat)}/>
                      </div>
                      <p style={{fontSize:14,fontWeight:700,color:C.text}}>{pName(plat)}</p>
                      <p style={{fontSize:20,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'",marginTop:4}}>{posts.length}</p>
                      <p style={{fontSize:10,color:C.textMuted}}>postingan</p>
                      <p style={{fontSize:11,color:C.textSec,marginTop:4}}>Avg Rate: <b style={{color:posts.length?C.green:C.textMuted}}>{posts.length?(posts.reduce((s,p)=>s+p.rate,0)/posts.length).toFixed(1):0}%</b></p>
                    </div>
                  </DCard>);
                })}
              </div>
            </div>);
          })()}
        </main>
      </div>
    );
  }

  /* ─── TAB BAR ───────────────────────────────────────────────────── */
  const tabs=[
    {id:'beranda',label:'Home',icon:'home'},
    {id:'misi',label:'Misi',icon:'target'},
    {id:'pangkat',label:'Pangkat',icon:'military_tech'},
    {id:'profil',label:'Profil',icon:'person'},
    {id:'konten',label:'Konten',icon:'analytics'},
    {id:'toko',label:'Toko',icon:'storefront'},
  ];

  const render=()=>{
    switch(screen){
      case 'beranda':return <Beranda/>;case 'misi':return <PapanMisi/>;
      case 'pangkat':return <PangkatLencana/>;case 'profil':return <Profil/>;
      case 'konten':return <KontenSaya/>;case 'toko':return <TokoPoin/>;case 'detail':return <DetailMisi/>;
      default:return <Beranda/>;
    }
  };

  /* ─── MODE: ADMIN vs MEMBER ─────────────────────────────────────── */
  if(mode==='admin') return(<>
    <DesktopAdmin/>
    {toast&&<div style={{position:'fixed',bottom:40,left:'50%',transform:'translateX(-50%)',background:'linear-gradient(135deg,#C9A84C,#E8D48B)',padding:'10px 20px',borderRadius:12,fontSize:13,fontWeight:600,color:'#0B1120',animation:'toastIn 200ms ease-out',zIndex:100,boxShadow:'0 8px 24px rgba(201,168,76,0.3)',border:'1px solid rgba(255,255,255,0.1)'}}>{toast}</div>}
  </>);

  return(
    <div className="flex items-center justify-center" style={{minHeight:'100vh',background:C.bg,padding:'20px 0',position:'relative',overflow:'hidden'}}>
      {/* Decorative Orbs */}
      <div className="orb orb-1" style={{width:300,height:300,background:'radial-gradient(circle,rgba(201,168,76,0.15),transparent 70%)',top:-50,left:-80}}/>
      <div className="orb orb-2" style={{width:250,height:250,background:'radial-gradient(circle,rgba(201,168,76,0.08),transparent 70%)',bottom:100,right:-60}}/>

      {/* Mode Toggle */}
      <button onClick={()=>setMode('admin')} className="btn-primary" style={{position:'fixed',top:20,right:20,zIndex:200,padding:'8px 16px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#C9A84C,#E8D48B)',color:'#0B1120',fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6,boxShadow:'0 4px 15px rgba(201,168,76,0.3)'}}>
        <MI name="dashboard" size={16} style={{color:'#0B1120'}}/> Admin Dashboard
      </button>

      <div style={{width:390,maxWidth:'100vw',height:844,maxHeight:'calc(100vh - 40px)',background:C.bg,borderRadius:44,overflow:'hidden',position:'relative',border:'2px solid rgba(255,255,255,0.08)',boxShadow:'0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset',display:'flex',flexDirection:'column'}}>
        {/* Status Bar */}
        <div className="flex justify-between items-center" style={{padding:'14px 28px 6px',fontSize:12,color:C.text,fontWeight:600,flexShrink:0}}>
          <span style={{fontFamily:"'JetBrains Mono'",fontSize:13,fontWeight:600,color:'white'}}>09:41</span>
          <div style={{width:120,height:30,background:'#1a1a2e',borderRadius:15,border:'1px solid rgba(255,255,255,0.06)'}}/>
          <div className="flex gap-1 items-center">
            <MI name="signal_cellular_alt" size={14} style={{color:'white'}}/>
            <MI name="wifi" size={14} style={{color:'white'}}/>
            <MI name="battery_full" size={14} style={{color:'white'}}/>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar" style={{padding:'4px 16px 8px'}}><div key={k} className="page-enter">{render()}</div></div>

        {/* Bottom Nav */}
        {screen!=='detail'&&(
          <nav className="flex" style={{padding:'6px 4px 28px',flexShrink:0,background:'rgba(15,15,26,0.9)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',borderTop:`1px solid ${C.border}`}}>
            {tabs.map(tab=>{const active=screen===tab.id;return(
              <button key={tab.id} onClick={()=>nav(tab.id)} className="flex flex-1 flex-col items-center justify-center gap-0.5" style={{background:'none',border:'none',cursor:'pointer',padding:'6px 0',position:'relative'}}>
                <div style={{width:active?30:26,height:active?30:26,borderRadius:active?10:7,background:active?'linear-gradient(135deg,#C9A84C,#E8D48B)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 200ms cubic-bezier(.16,1,.3,1)',boxShadow:active?'0 4px 12px rgba(201,168,76,0.3)':'none'}}>
                  <MI name={tab.icon} size={18} fill={active} style={{color:active?'white':C.textMuted}}/>
                </div>
                <span style={{fontSize:9,fontWeight:active?700:500,color:active?C.primary:C.textMuted,letterSpacing:0.3}}>{tab.label}</span>
              </button>
            );})}
          </nav>
        )}
      </div>

      {/* Toast */}
      {toast&&<div style={{position:'fixed',bottom:120,left:'50%',transform:'translateX(-50%)',background:'linear-gradient(135deg,#C9A84C,#E8D48B)',padding:'10px 20px',borderRadius:12,fontSize:13,fontWeight:600,color:'#0B1120',animation:'toastIn 200ms ease-out',zIndex:100,boxShadow:'0 8px 24px rgba(201,168,76,0.3)',border:'1px solid rgba(255,255,255,0.1)'}}>
        {toast}
      </div>}
    </div>
  );
}

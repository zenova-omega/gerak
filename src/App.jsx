import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Globe from 'react-globe.gl';
import ForceGraph3D from 'react-force-graph-3d';
import { useSpring, animated } from '@react-spring/web';
import {
  Plus, PlusCircle, UserGear, ChartLine, ArrowLeft, ArrowRight,
  Sparkle, BatteryFull, Lightning, ChatDots, ChatCenteredDots, Check, CheckCircle, X,
  CloudArrowUp, CopySimple, SquaresFour, CheckSquare, DownloadSimple, Pencil,
  Notebook, Trophy, CaretDown, Heart, Flag, Quotes, UsersThree, ClockCounterClockwise,
  HourglassSimple, UserCheck, ImageSquare, Info, Link, Fire, MapPin, MedalMilitary,
  Smiley, Crosshair, Bell, BellRinging, ArrowSquareOut, Palette, CircleNotch,
  Phone, Globe as GlobeIcon, Star, MoonStars, Tag, ThumbsUp, Coins, HandPointing,
  TrendUp, ShieldCheck, Eye, Warning, Sun, WifiHigh, Medal,
  RocketLaunch, FloppyDisk, PiggyBank, Timer, MagnifyingGlass, MagnifyingGlassMinus,
  PaperPlaneRight, ShareNetwork, CellSignalFull, Robot, Gauge, Target,
  Broadcast, Repeat, ChatCentered, MonitorPlay, Storefront, House, Person,
  ShoppingBag, IdentificationBadge, Lock, Barricade, CalendarBlank,
  Diamond, Moon, Flame, Ranking, FlagBanner, Brain, SecurityCamera,
  HandWaving, Camera, MusicNote, Article, Lightbulb, VideoCamera,
  TextT, Sliders, Ruler, CloudArrowDown, Swap, Circle, Confetti, Bookmark
} from '@phosphor-icons/react';

/* ─── ICON ───────────────────────────────────────────────────────── */
const ICON_MAP = {
  add: Plus, add_circle: PlusCircle, admin_panel_settings: UserGear,
  analytics: ChartLine, arrow_back: ArrowLeft, arrow_forward: ArrowRight,
  arrow_forward_ios: ArrowRight, auto_awesome: Sparkle, bar_chart: ChartLine,
  battery_full: BatteryFull, bolt: Lightning, chat: ChatDots, chat_bubble: ChatCenteredDots,
  check: Check, check_circle: CheckCircle, close: X, cloud_upload: CloudArrowUp,
  content_copy: CopySimple, dashboard: SquaresFour, done_all: CheckSquare,
  download: DownloadSimple, edit: Pencil, edit_note: Notebook, emoji_events: Trophy,
  expand_more: CaretDown, expand_less: CaretDown, favorite: Heart, flag: Flag,
  format_quote: Quotes, group: UsersThree, history: ClockCounterClockwise,
  hourglass_top: HourglassSimple, how_to_reg: UserCheck, image: ImageSquare, info: Info,
  lightbulb: Lightbulb, link: Link, local_fire_department: Fire, location_on: MapPin,
  military_tech: MedalMilitary, mood: Smiley, my_location: Crosshair,
  notifications: Bell, notifications_active: BellRinging, open_in_new: ArrowSquareOut,
  palette: Palette, pending: CircleNotch, phone_iphone: Phone, phone_android: Phone,
  public: GlobeIcon, rate_review: Star, record_voice_over: Broadcast,
  refresh: Repeat, rocket_launch: RocketLaunch, save: FloppyDisk, savings: PiggyBank,
  schedule: Timer, search: MagnifyingGlass, search_off: MagnifyingGlassMinus,
  send: PaperPlaneRight, share: ShareNetwork, signal_cellular_alt: CellSignalFull,
  smart_toy: Robot, speed: Gauge, star: Star, stars: MoonStars, tag: Tag,
  thumb_up: ThumbsUp, toll: Coins, touch_app: HandPointing, trending_up: TrendUp,
  verified: ShieldCheck, visibility: Eye, warning: Warning, wb_sunny: Sun,
  wifi: WifiHigh, workspace_premium: Medal, target: Target,
  person: Person, person_check: UserCheck, home: House, storefront: Storefront,
  campaign: Broadcast, school: Lightbulb, groups: UsersThree,
  warning_amber: Warning, priority_high: Warning, block: Barricade,
  monitor: MonitorPlay, inventory_2: ShoppingBag, description: Notebook,
  cloud_download: CloudArrowDown, play_circle: MonitorPlay,
  upload_file: CloudArrowUp, upload: CloudArrowUp, login: ArrowRight,
  logout: ArrowLeft, whatshot: Flame, volcano: Flame, calendar_month: CalendarBlank,
  diamond: Diamond, dark_mode: Moon, leaderboard: Ranking,
  waving_hand: HandWaving, photo_camera: Camera, music_note: MusicNote,
  security: SecurityCamera, psychology: Brain, slow_motion_video: VideoCamera,
  view_carousel: ImageSquare, bookmark: Bookmark, checkroom: IdentificationBadge,
  styler: IdentificationBadge, lock: Lock, category: Sliders,
  text_fields: TextT, timer: Timer, aspect_ratio: Ruler,
  videocam: VideoCamera, celebration: Confetti, business: IdentificationBadge,
  article: Article, repeat: Repeat, reply: ChatCentered,
  account_balance_wallet: Coins, shopping_bag: ShoppingBag,
  swap_horiz: Swap, monitoring: Eye, radio_button_unchecked: Circle,
  wifi_tethering: Broadcast, check_box: CheckSquare,
};

function MI({ name, size=24, fill=false, style={} }) {
  const IconComp = ICON_MAP[name];
  if (!IconComp) return <span style={{ display:'inline-flex', width:size, height:size, alignItems:'center', justifyContent:'center', fontSize:size*0.6, color:style.color||'currentColor', ...style }}>?</span>;
  return <IconComp size={size} weight={fill?'fill':'duotone'} style={{ display:'inline-block', verticalAlign:'middle', lineHeight:1, flexShrink:0, ...style }} />;
}

/* ─── TOOLTIP ────────────────────────────────────────────────────── */
function Tip({children,text}){
  const [show,setShow]=useState(false);
  return(<span style={{position:'relative',display:'inline-flex',alignItems:'center',cursor:'pointer'}} onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)} onClick={()=>setShow(s=>!s)}>
    {children}
    {show&&<span style={{position:'absolute',bottom:'calc(100% + 6px)',left:'50%',transform:'translateX(-50%)',background:C.surfaceDark,color:C.textLight,fontSize:11,fontWeight:500,padding:'6px 10px',borderRadius:8,whiteSpace:'nowrap',maxWidth:200,textAlign:'center',lineHeight:1.3,boxShadow:`0 4px 12px ${C.shadow}`,border:`1px solid ${C.overlay10}`,zIndex:50,pointerEvents:'none',animation:'fadeInUp 150ms ease'}}>{text}</span>}
  </span>);
}

/* ─── GERAK LOGO SVG ─────────────────────────────────────────────── */
function GerakMark({size=28}){return(
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <defs>
      <linearGradient id="gmark" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1B5E20"/>
        <stop offset="100%" stopColor="#2E7D32"/>
      </linearGradient>
    </defs>
    <polygon points="10,6 30,20 10,34 16,20" fill="url(#gmark)"/>
    <polygon points="20,12 34,20 20,28 23,20" fill="url(#gmark)" opacity="0.4"/>
  </svg>
)}

/* ─── Animal3D removed — using RankInsignia instead ─── */

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
  bg:'#F5F0E8', bgCard:'#FFFFFF', white:'#FFFFFF', black:'#1A1A1A',
  primary:'#1B5E20', primaryLight:'rgba(27,94,32,0.08)', primaryMid:'rgba(27,94,32,0.15)', primaryDark:'#0D3B0F',
  primaryGlow:'rgba(27,94,32,0.15)', primaryFaint:'rgba(27,94,32,0.04)', primaryHover:'rgba(27,94,32,0.06)',
  primaryAccent:'#2E7D32',
  secondary:'#37474F', secondaryLight:'rgba(55,71,79,0.08)', secondaryGlow:'rgba(55,71,79,0.15)',
  accent:'#B71C1C', accentLight:'rgba(183,28,28,0.08)', accentGlow:'rgba(183,28,28,0.15)',
  text:'#1E293B', textLight:'#334155', textSec:'#475569', textMuted:'#64748B', textDark:'#94A3B8',
  border:'#E2DDD4', borderLight:'rgba(0,0,0,0.06)',
  overlay06:'rgba(0,0,0,0.03)', overlay08:'rgba(0,0,0,0.04)', overlay10:'rgba(0,0,0,0.06)', overlay15:'rgba(0,0,0,0.08)',
  shadow:'rgba(0,0,0,0.08)', shadowLight:'rgba(0,0,0,0.05)', backdrop:'rgba(0,0,0,0.4)',
  green:'#2E7D32', greenLight:'rgba(46,125,50,0.08)',
  red:'#C62828', redLight:'rgba(198,40,40,0.08)',
  orange:'#C2410C', orangeLight:'rgba(194,65,12,0.08)',
  purple:'#6D28D9', purpleLight:'rgba(109,40,217,0.08)',
  pink:'#BE185D', pinkLight:'rgba(190,24,93,0.08)',
  teal:'#0D9488', tealLight:'rgba(13,148,136,0.08)',
  gold:'#92400E', goldLight:'rgba(146,64,14,0.1)',
  silver:'#64748B', bronze:'#78350F',
  glass:'rgba(255,255,255,0.55)', glassBorder:'rgba(255,255,255,0.45)',
  surface:'rgba(255,255,255,0.6)', surfaceLight:'rgba(245,240,232,0.7)', surfaceDark:'#EDE8DF',
  surfaceGlass:'rgba(255,255,255,0.45)', surfaceGlass2:'rgba(255,255,255,0.55)',
};

/* ─── MISSION TYPES ──────────────────────────────────────────── */
// EVENT      = Kehadiran fisik: rally, town hall, gotong royong, posko
// KONTEN     = Content creation: video, foto, artikel, infografis
// ENGAGEMENT = Like, share, comment, repost konten yang sudah ada
// EDUKASI    = Distribusi materi edukasi ke grup/komunitas
// AKSI       = Aksi langsung: petisi, door-to-door, rekrutmen relawan
const typeColor=t=>({EVENT:C.purple,KONTEN:C.primary,ENGAGEMENT:C.orange,EDUKASI:C.secondary,AKSI:C.accent}[t]||C.primary);
const typeBg=t=>({EVENT:C.purpleLight,KONTEN:C.primaryLight,ENGAGEMENT:C.orangeLight,EDUKASI:C.secondaryLight,AKSI:C.accentLight}[t]||C.primaryLight);
const typeGradient=t=>({EVENT:`linear-gradient(135deg,${C.purple},#7C3AED)`,KONTEN:`linear-gradient(135deg,${C.primary},${C.primaryAccent})`,ENGAGEMENT:`linear-gradient(135deg,${C.orange},#EA580C)`,EDUKASI:`linear-gradient(135deg,${C.secondary},#546E7A)`,AKSI:`linear-gradient(135deg,${C.accent},#D32F2F)`}[t]||`linear-gradient(135deg,${C.primary},${C.primaryAccent})`);
const typeIcon=t=>({EVENT:'event',KONTEN:'videocam',ENGAGEMENT:'thumb_up',EDUKASI:'school',AKSI:'front_hand'}[t]||'star');
const typeDesc=t=>({EVENT:'Kehadiran & Partisipasi',KONTEN:'Buat Konten Original',ENGAGEMENT:'Like, Share & Comment',EDUKASI:'Distribusi Materi',AKSI:'Aksi Lapangan'}[t]||'');
const typeBonuses=t=>({
  EVENT:[{label:'Paling Tepat Waktu',icon:'timer',xp:100,color:C.teal},{label:'Dokumentasi Terbaik',icon:'photo_camera',xp:150,color:C.primary},{label:'Koordinator Lapangan',icon:'handshake',xp:200,color:C.purple}],
  KONTEN:[{label:'Konten Terbaik',icon:'emoji_events',xp:250,color:C.gold},{label:'Paling Engaging',icon:'trending_up',xp:200,color:C.green},{label:'Paling Cepat Submit',icon:'speed',xp:100,color:C.teal},{label:'Paling Kreatif',icon:'auto_awesome',xp:150,color:C.purple}],
  ENGAGEMENT:[{label:'Top Engager',icon:'favorite',xp:150,color:C.red},{label:'Komentar Terbaik',icon:'chat_bubble',xp:100,color:C.primary},{label:'Paling Konsisten',icon:'repeat',xp:100,color:C.teal}],
  EDUKASI:[{label:'Jangkauan Terluas',icon:'public',xp:200,color:C.purple},{label:'Distribusi Tercepat',icon:'speed',xp:100,color:C.teal},{label:'Feedback Terbaik',icon:'thumb_up',xp:150,color:C.green}],
  AKSI:[{label:'Target Tercapai Duluan',icon:'flag',xp:200,color:C.gold},{label:'Relawan Terbanyak',icon:'group_add',xp:150,color:C.primary},{label:'Area Terluas',icon:'map',xp:100,color:C.teal}],
}[t]||[]);
const pName=p=>({whatsapp:'WhatsApp',telegram:'Telegram',instagram:'Instagram',tiktok:'TikTok',x:'X',facebook:'Facebook'}[p]||p);
const pColor=p=>({whatsapp:'#25D366',telegram:'#0088cc',instagram:'#E1306C',tiktok:'#1A1A1A',x:'#1DA1F2',facebook:'#1877F2'}[p]||C.text);
const pIcon=p=>({whatsapp:'chat',telegram:'send',facebook:'thumb_up'}[p]);

/* Stub removed features so admin panel doesn't crash */
const NARRATIVES=[];
const PLATFORM_STATS=[];
const SENTIMENT_EMOTIONS=[];
const SOCIALS=[];
function SentimentChart(){return null}
function PositiveMeter(){return null}

/* ─── DATA ───────────────────────────────────────────────────────── */

const MISSIONS=[
  /* ─── EVENT — Kehadiran fisik TNI AD ─── */
  {id:1,type:'EVENT',title:'Upacara HUT TNI AD ke-81 di Mabes AD',
    desc:'Hadir dan dokumentasikan upacara peringatan HUT TNI AD. Abadikan momen kebanggaan prajurit dan showcase alutsista.',
    xp:400,bonus:100,participants:89,status:'TERBUKA',deadline:'22 Apr 2026',
    analytics:{completion:32,avgTime:'4.5 jam',topCity:'Jakarta'},
    eventSpec:{location:'Markas Besar TNI AD, Jl. Veteran III, Jakarta Pusat',date:'22 Apr 2026, 07:00',capacity:500,checkin:'QR Code + ID',lat:-6.1753,lng:106.8290,note:'Seragam rapih, bawa ID resmi. Parkir di area yang ditentukan.'},
    contentSpec:{format:'Foto + Video',minPhotos:10,videoDuration:'60-180 detik',note:'Foto: barisan prajurit, alutsista, pejabat, suasana khidmat.'},
    templates:['Dirgahayu TNI AD ke-81! Prajurit tangguh, rakyat terlindungi.']},
  {id:2,type:'EVENT',title:'Bakti Sosial TNI AD — Operasi Pembangunan Desa',
    desc:'Dokumentasikan kegiatan bakti sosial prajurit TNI AD di desa tertinggal. Tunjukkan sisi kemanusiaan TNI AD.',
    xp:500,bonus:100,participants:45,status:'TERBUKA',deadline:'28 Mar 2026',
    analytics:{completion:40,avgTime:'6.0 jam',topCity:'Cianjur'},
    eventSpec:{location:'Desa Sukamanah, Kab. Cianjur',date:'28 Mar 2026, 06:00',capacity:80,checkin:'GPS + Selfie',lat:-6.8204,lng:107.1414,note:'Koordinasi dengan Kodim 0608. Bawa perlengkapan lapangan.'},
    contentSpec:{format:'Foto + Video',minPhotos:8,videoDuration:'60-120 detik',note:'Foto: prajurit membantu warga, pembangunan, interaksi hangat TNI-rakyat.'},
    templates:['TNI AD hadir untuk rakyat. Bersama kita membangun desa!']},
  {id:3,type:'EVENT',title:'Pameran Alutsista & Open Base Kodam Jaya',
    desc:'Liput pameran alutsista TNI AD yang terbuka untuk publik. Dokumentasikan antusiasme masyarakat dan kecanggihan peralatan militer Indonesia.',
    xp:350,bonus:50,participants:72,status:'SIAGA',deadline:'15 Apr 2026',
    analytics:{completion:18,avgTime:'3.5 jam',topCity:'Jakarta'},
    eventSpec:{location:'Lapangan Kodam Jaya, Kramat Jati',date:'15 Apr 2026, 08:00',capacity:300,checkin:'QR Code',lat:-6.2756,lng:106.8696,note:'Terbuka untuk umum. Bawa keluarga!'},
    contentSpec:{format:'Foto + Video',minPhotos:6,note:'Foto: alutsista, pengunjung antusias, prajurit menjelaskan alat.'},
    templates:['Keren banget! Pameran alutsista TNI AD buat publik. Bangga jadi Indonesia!']},

  /* ─── KONTEN — Content creation TNI AD ─── */
  {id:4,type:'KONTEN',title:'Video Reels: Hari-Hari Prajurit TNI AD',
    desc:'Buat video menarik tentang keseharian prajurit TNI AD — latihan, kehidupan barak, kedisiplinan, dan momen humanis. Tunjukkan sisi inspiratif tentara kita.',
    xp:350,bonus:75,participants:134,status:'TERBUKA',deadline:'25 Mar 2026',
    analytics:{completion:62,avgTime:'2.5 jam',topCity:'Bandung'},
    kontenSpec:{format:'Video (portrait 9:16)',duration:'30-90 detik',platform:['Instagram','TikTok','YouTube Shorts'],hashtags:['#TNIAD','#PrajuritHebat','#TNIADUntukRakyat','#DISPENAD'],guidelines:['Min 30 detik durasi','Musik patriotik atau trending audio','Text overlay fakta/caption','Tone positif & inspiratif, bukan propaganda']},
    templates:['Tahukah kamu? Prajurit TNI AD bukan cuma latihan perang, tapi juga bantu masyarakat setiap hari!'],
    exampleMedia:[{type:'video',label:'Contoh konten TNI AD viral',desc:'Video behind-the-scenes kehidupan prajurit'}]},
  {id:5,type:'KONTEN',title:'Infografis: Peran TNI AD dalam Bencana Alam',
    desc:'Buat infografis dengan data resmi tentang kontribusi TNI AD dalam penanggulangan bencana alam di Indonesia. Sertakan data jumlah misi, korban tertolong, dan wilayah terjangkau.',
    xp:300,participants:56,status:'TERBUKA',deadline:'5 Apr 2026',
    analytics:{completion:35,avgTime:'3.0 jam',topCity:'Yogyakarta'},
    kontenSpec:{format:'Gambar / Carousel',duration:null,platform:['Instagram','X','Facebook'],hashtags:['#TNIAD','#SiagaBencana','#TNIADPeduli','#DISPENAD'],guidelines:['Min 3 slide untuk carousel','Data dari sumber resmi TNI AD/BNPB','Design profesional & mudah dibaca','Sertakan logo TNI AD']},
    templates:['Fakta: TNI AD sudah menyelamatkan ribuan korban bencana di 2025. Ini datanya:'],
    exampleMedia:[{type:'image',label:'Template infografis TNI AD',desc:'Referensi layout dan warna resmi'}]},
  {id:6,type:'KONTEN',title:'Challenge #BanggaTNIAD — Video Apresiasi Prajurit',
    desc:'Buat video kreatif untuk mengapresiasi perjuangan prajurit TNI AD. Ceritakan pengalaman positifmu dengan TNI AD atau tunjukkan rasa bangga terhadap tentara kita.',
    xp:300,bonus:50,participants:215,status:'TERBUKA',deadline:'30 Mar 2026',
    analytics:{completion:75,avgTime:'1.5 jam',topCity:'Jakarta'},
    kontenSpec:{format:'Video (portrait 9:16)',duration:'15-60 detik',platform:['TikTok','Instagram'],hashtags:['#BanggaTNIAD','#TNIAD','#PrajuritKebanggaan','#DISPENAD'],guidelines:['Min 15 detik konten original','Ceritakan kisah personal','Tantang 3 teman untuk ikutan','Gunakan audio patriotik']},
    templates:['Aku bangga sama TNI AD karena... #BanggaTNIAD']},

  /* ─── ENGAGEMENT — Like, share, comment konten TNI AD ─── */
  {id:7,type:'ENGAGEMENT',title:'Dukung Konten Resmi DISPENAD di Medsos',
    desc:'Like, comment positif, dan share postingan resmi akun DISPENAD TNI AD. Bantu viralkan pesan positif tentang TNI AD.',
    xp:200,participants:178,status:'TERBUKA',deadline:'20 Mar 2026',
    analytics:{completion:65,avgTime:'1.5 jam',topCity:'Surabaya'},
    engagementSpec:{actions:['Like post resmi','Tulis komentar positif & relevan (min 10 kata)','Share/repost ke akun pribadi'],targetPosts:3,note:'Komentar harus natural, relevan, dan positif. Hindari komentar generik/spam.'},
    refPosts:[
      {platform:'Instagram',author:'@taborpenad',content:'Prajurit Kodam IV/Diponegoro bantu warga terdampak banjir di Demak. TNI AD selalu hadir untuk rakyat!',likes:'18.7K',shares:'5.4K',actions:['like','comment','share']},
      {platform:'X',author:'@peaborpenad',content:'Thread: 7 Fakta Tentang Modernisasi Alutsista TNI AD 2026 yang Bikin Bangga',likes:'8.3K',shares:'4.1K',actions:['like','repost','reply']},
      {platform:'TikTok',author:'@tniad_official',content:'POV: Kamu lihat prajurit TNI AD nolong nenek di jalan 🫡',likes:'245K',shares:'32K',actions:['like','comment','share']},
    ],templates:['TNI AD selalu hadir untuk rakyat. Terima kasih prajurit! 🫡']},
  {id:8,type:'ENGAGEMENT',title:'Viralkan Video Latihan Gabungan TNI AD',
    desc:'Like dan share video latihan gabungan TNI AD yang menunjukkan profesionalisme dan kesiapan tempur prajurit Indonesia.',
    xp:180,bonus:30,participants:203,status:'TERBUKA',deadline:'18 Mar 2026',
    analytics:{completion:82,avgTime:'1.2 jam',topCity:'Jakarta'},
    engagementSpec:{actions:['Like video','Share ke story/feed dengan caption personal','Tag 3 teman'],targetPosts:2,note:'Tunjukkan rasa bangga dalam caption personal'},
    templates:['Keren abis! Latihan gabungan TNI AD bikin bangga. Indonesia kuat! 💪🇮🇩']},

  /* ─── EDUKASI — Distribusi materi TNI AD ─── */
  {id:9,type:'EDUKASI',title:'Sebarkan Materi Wawasan Kebangsaan TNI AD',
    desc:'Distribusikan materi edukasi tentang peran TNI AD dalam menjaga kedaulatan NKRI ke grup komunitas. Termasuk infografis sejarah TNI AD dan program TMMD.',
    xp:250,bonus:50,participants:145,status:'TERBUKA',deadline:'22 Mar 2026',
    analytics:{completion:68,avgTime:'2.0 jam',topCity:'Jakarta'},
    edukasiSpec:{material:'Infografis + Video Singkat DISPENAD',channels:['WhatsApp','Telegram'],minGroups:5,minGroupSize:20,note:'Kirim ke grup komunitas, alumni, atau keluarga dengan min 20 anggota'},
    templates:['Tahukah kamu peran penting TNI AD dalam menjaga NKRI? Simak faktanya di sini! Sumber: DISPENAD TNI AD','TNI AD bukan hanya menjaga perbatasan, tapi juga aktif membantu masyarakat melalui program TMMD. Ini buktinya!'],
    exampleMedia:[{type:'image',label:'Infografis Peran TNI AD',desc:'Materi resmi DISPENAD untuk distribusi'}]},
  {id:12,type:'EDUKASI',title:'Sosialisasi Rekrutmen Prajurit TNI AD 2026',
    desc:'Bantu sebarkan informasi rekrutmen prajurit TNI AD ke kalangan anak muda. Distribusikan poster dan persyaratan resmi ke grup-grup komunitas.',
    xp:200,participants:98,status:'TERBUKA',deadline:'15 Apr 2026',
    analytics:{completion:42,avgTime:'1.8 jam',topCity:'Semarang'},
    edukasiSpec:{material:'Poster Rekrutmen + FAQ PDF',channels:['WhatsApp','Telegram','Instagram'],minGroups:3,minGroupSize:15,note:'Target: grup pemuda, alumni SMA/SMK, komunitas olahraga'},
    templates:['Mau jadi prajurit TNI AD? Ini persyaratan dan jadwal pendaftaran 2026. Info resmi dari DISPENAD!']},

  /* ─── AKSI — Aksi langsung untuk TNI AD ─── */
  {id:10,type:'AKSI',title:'Rekrutmen Relawan Pendukung Baksos TNI AD',
    desc:'Bantu koordinasi relawan sipil untuk mendukung kegiatan bakti sosial TNI AD di wilayah terdampak bencana.',
    xp:350,participants:67,status:'SIAGA',deadline:'25 Mar 2026',
    analytics:{completion:30,avgTime:'4.5 jam',topCity:'Makassar'},
    aksiSpec:{actionType:'Rekrutmen Relawan Sipil',target:100,unit:'relawan',method:'Online form + koordinasi Kodim',area:'Indonesia Timur',note:'Relawan akan berkoordinasi dengan satuan TNI AD setempat'},
    templates:['Mari bergabung sebagai relawan pendukung baksos TNI AD! Daftar sekarang melalui link resmi berikut.']},
  {id:11,type:'AKSI',title:'Kampanye Dukung Modernisasi Alutsista TNI AD',
    desc:'Galang dukungan publik untuk modernisasi alutsista TNI AD melalui petisi digital dan penyebaran informasi tentang pentingnya pertahanan negara.',
    xp:250,bonus:50,participants:412,status:'TERBUKA',deadline:'10 Apr 2026',
    analytics:{completion:52,avgTime:'1.5 jam',topCity:'Jakarta'},
    aksiSpec:{actionType:'Petisi Digital & Kampanye',target:25000,unit:'dukungan',method:'Share link + posting konten',area:'Nasional',note:'Sertakan data resmi tentang kebutuhan modernisasi dari Kemhan/TNI AD'},
    templates:['TNI AD yang kuat = Indonesia yang aman. Dukung modernisasi alutsista untuk masa depan pertahanan negara! 🇮🇩']},
];

const RANKS=[
  {name:'Prajurit',xp:0,icon:'person',subtitle:'Langkah Pertama'},
  {name:'Kopral',xp:1000,icon:'military_tech',subtitle:'Keandalan & Disiplin'},
  {name:'Sersan',xp:5000,icon:'shield',subtitle:'Kepemimpinan Lapangan'},
  {name:'Letnan',xp:15000,icon:'stars',subtitle:'Komando & Strategi'},
  {name:'Kapten',xp:50000,icon:'workspace_premium',subtitle:'Pemimpin Tertinggi'},
];

/* ─── RANK INSIGNIA ILLUSTRATIONS ─────────────────────────────────── */
/* ─── RANK INSIGNIA — Hexagonal winged emblem (game-style) ────────── */
function RankInsignia({rank=0,size=120,showLabel=true}){
  const s=size;
  const palettes=[
    {body:['#B0BEC5','#78909C','#546E7A','#37474F'],wing:['#90A4AE','#607D8B','#455A64'],star:'#CFD8DC',glow:'rgba(120,144,156,0.3)',label:'#546E7A',spec:'rgba(255,255,255,0.5)'},
    {body:['#81C784','#43A047','#2E7D32','#1B5E20'],wing:['#66BB6A','#388E3C','#1B5E20'],star:'#A5D6A7',glow:'rgba(67,160,71,0.35)',label:'#2E7D32',spec:'rgba(255,255,255,0.5)'},
    {body:['#E0E0E0','#BDBDBD','#9E9E9E','#616161'],wing:['#BDBDBD','#9E9E9E','#757575'],star:'#F5F5F5',glow:'rgba(189,189,189,0.35)',label:'#757575',spec:'rgba(255,255,255,0.6)'},
    {body:['#FFD54F','#FFC107','#FFA000','#E65100'],wing:['#FFB300','#F9A825','#E65100'],star:'#FFF8E1',glow:'rgba(255,160,0,0.4)',label:'#E65100',spec:'rgba(255,255,255,0.55)'},
    {body:['#CE93D8','#AB47BC','#7B1FA2','#4A148C'],wing:['#E040FB','#7C4DFF','#00BCD4'],star:'#E1BEE7',glow:'rgba(171,71,188,0.45)',label:'#7B1FA2',spec:'rgba(255,255,255,0.5)',rainbow:true},
  ];
  const p=palettes[rank]||palettes[0];
  const id=`ri${rank}_${Math.random().toString(36).slice(2,7)}`;
  const labels=['PRAJURIT','KOPRAL','SERSAN','LETNAN','KAPTEN'];

  /* Hexagon points (cx=60, cy=52, r=30) — flat-top */
  const hr=30, hx=60, hy=52;
  const hex=Array.from({length:6},(_,i)=>{const a=Math.PI/3*i-Math.PI/6;return`${hx+hr*Math.cos(a)},${hy+hr*Math.sin(a)}`;}).join(' ');
  /* Inner hex (r=24) */
  const ihr=24;
  const ihex=Array.from({length:6},(_,i)=>{const a=Math.PI/3*i-Math.PI/6;return`${hx+ihr*Math.cos(a)},${hy+ihr*Math.sin(a)}`;}).join(' ');

  return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:showLabel?6:0}}>
      <svg width={s} height={s*0.88} viewBox="0 0 120 105" fill="none" style={{overflow:'visible'}}>
        <defs>
          <linearGradient id={`${id}b`} x1="60" y1="15" x2="60" y2="85" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={p.body[0]}/><stop offset="35%" stopColor={p.body[1]}/><stop offset="70%" stopColor={p.body[2]}/><stop offset="100%" stopColor={p.body[3]}/>
          </linearGradient>
          <linearGradient id={`${id}wl`} x1="0" y1="40" x2="38" y2="65" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={p.wing[0]}/><stop offset="50%" stopColor={p.wing[1]}/><stop offset="100%" stopColor={p.wing[2]}/>
          </linearGradient>
          <linearGradient id={`${id}wr`} x1="120" y1="40" x2="82" y2="65" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={p.wing[0]}/><stop offset="50%" stopColor={p.wing[1]}/><stop offset="100%" stopColor={p.wing[2]}/>
          </linearGradient>
          <radialGradient id={`${id}sp`} cx="50" cy="40" r="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="white" stopOpacity="0.6"/><stop offset="60%" stopColor="white" stopOpacity="0.1"/><stop offset="100%" stopColor="white" stopOpacity="0"/>
          </radialGradient>
          <filter id={`${id}ds`}><feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="rgba(0,0,0,0.3)"/></filter>
          <filter id={`${id}gs`}><feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="rgba(0,0,0,0.5)"/></filter>
          <radialGradient id={`${id}ag`} cx="60" cy="52" r="55" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={p.body[1]} stopOpacity="0.2"/><stop offset="100%" stopColor={p.body[1]} stopOpacity="0"/>
          </radialGradient>
          {p.rainbow&&<linearGradient id={`${id}rb`} x1="30" y1="20" x2="90" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E040FB"/><stop offset="30%" stopColor="#7C4DFF"/><stop offset="60%" stopColor="#448AFF"/><stop offset="100%" stopColor="#00BCD4"/>
          </linearGradient>}
          {p.rainbow&&<linearGradient id={`${id}rwl`} x1="0" y1="35" x2="40" y2="65" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00BCD4"/><stop offset="50%" stopColor="#7C4DFF"/><stop offset="100%" stopColor="#E040FB"/>
          </linearGradient>}
          {p.rainbow&&<linearGradient id={`${id}rwr`} x1="120" y1="35" x2="80" y2="65" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF4081"/><stop offset="50%" stopColor="#E040FB"/><stop offset="100%" stopColor="#7C4DFF"/>
          </linearGradient>}
        </defs>

        {/* Ambient glow */}
        <ellipse cx="60" cy="52" rx="52" ry="42" fill={`url(#${id}ag)`}/>

        {/* ── Left wing (3 layered feathers) ── */}
        <g filter={`url(#${id}ds)`}>
          <path d="M34 42 L8 28 L2 38 L14 48 L4 52 L14 58 L28 62 L34 60 Z" fill={p.rainbow?`url(#${id}rwl)`:`url(#${id}wl)`}/>
          <path d="M34 42 L8 28 L2 38 L14 48 L4 52 L14 58 L28 62 L34 60 Z" fill="url(#${id}sp)" opacity="0.4"/>
          {/* Wing segment lines */}
          <path d="M14 48 L30 50" stroke="white" strokeWidth="0.5" opacity="0.2"/>
          <path d="M14 58 L30 57" stroke="white" strokeWidth="0.5" opacity="0.15"/>
          <path d="M8 28 L28 42" stroke="white" strokeWidth="0.6" opacity="0.12"/>
        </g>

        {/* ── Right wing (mirror) ── */}
        <g filter={`url(#${id}ds)`}>
          <path d="M86 42 L112 28 L118 38 L106 48 L116 52 L106 58 L92 62 L86 60 Z" fill={p.rainbow?`url(#${id}rwr)`:`url(#${id}wr)`}/>
          <path d="M86 42 L112 28 L118 38 L106 48 L116 52 L106 58 L92 62 L86 60 Z" fill="url(#${id}sp)" opacity="0.4"/>
          <path d="M106 48 L90 50" stroke="white" strokeWidth="0.5" opacity="0.2"/>
          <path d="M106 58 L90 57" stroke="white" strokeWidth="0.5" opacity="0.15"/>
          <path d="M112 28 L92 42" stroke="white" strokeWidth="0.6" opacity="0.12"/>
        </g>

        {/* ── Hexagonal body ── */}
        <g filter={`url(#${id}ds)`}>
          <polygon points={hex} fill={p.rainbow?`url(#${id}rb)`:`url(#${id}b)`}/>
          <polygon points={hex} fill={`url(#${id}sp)`}/>
          <polygon points={hex} fill="none" stroke={p.body[0]} strokeWidth="1.2" strokeOpacity="0.35"/>
        </g>
        {/* Inner hex border */}
        <polygon points={ihex} fill="none" stroke={p.body[0]} strokeWidth="0.6" strokeOpacity="0.2"/>

        {/* ── 6-pointed star / compass emblem ── */}
        <g filter={`url(#${id}gs)`}>
          {/* Main 6-pointed star (two overlapping triangles) */}
          <polygon points="60,32 65,45 78,45 68,53 72,66 60,58 48,66 52,53 42,45 55,45" fill="white" opacity="0.9"/>
          {/* Inner highlight */}
          <polygon points="60,37 63,45 72,45 66,50 68,59 60,54 52,59 54,50 48,45 57,45" fill="white" opacity="0.15"/>
          {/* Center diamond accent */}
          <polygon points="60,44 64,52 60,60 56,52" fill={p.star} opacity="0.4"/>
        </g>

        {/* Specular gloss line across hex top */}
        <path d={`M${hx-hr*0.7} ${hy-hr*0.45} Q${hx} ${hy-hr*0.65} ${hx+hr*0.7} ${hy-hr*0.45}`} stroke="white" strokeWidth="1" opacity="0.2" fill="none"/>

        {/* Ground shadow */}
        <ellipse cx="60" cy="98" rx="22" ry="3.5" fill={p.body[3]} opacity="0.1"/>
      </svg>
      {showLabel&&<span style={{fontSize:Math.max(9,s*0.065),fontWeight:800,color:p.label,letterSpacing:2,fontFamily:"'Plus Jakarta Sans'",textTransform:'uppercase'}}>{labels[rank]}</span>}
    </div>
  );
}

/* ─── BADGE SHAPE — Hexagonal winged emblem (mini, game-style) ─── */
function BadgeShape({color,size=64,icon,unlocked=true,rarity='common'}){
  const rc=RARITY_COLORS[rarity]||RARITY_COLORS.common;
  const s=size;
  const col=unlocked?color:'#94A3B8';
  const id=`bs${Math.random().toString(36).slice(2,7)}`;

  /* Hex (cx=32,cy=28,r=18 flat-top) */
  const hr=18,hx=32,hy=28;
  const hex=Array.from({length:6},(_,i)=>{const a=Math.PI/3*i-Math.PI/6;return`${hx+hr*Math.cos(a)},${hy+hr*Math.sin(a)}`;}).join(' ');

  return(
    <div className={unlocked?'':'badge-locked-hex'} style={{position:'relative',width:s,height:s*0.88}}>
      {unlocked&&<div style={{position:'absolute',inset:-6,borderRadius:'50%',background:`radial-gradient(circle,${rc.glow},transparent 65%)`,filter:'blur(8px)',animation:rarity==='legendary'?'pulse 2.5s ease-in-out infinite':rarity==='epic'?'pulse 4s ease-in-out infinite':undefined}}/>}
      <svg width={s} height={s*0.88} viewBox="0 0 64 56" fill="none" style={{position:'relative',zIndex:1,overflow:'visible'}}>
        <defs>
          <linearGradient id={`${id}b`} x1="32" y1="8" x2="32" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={col}/><stop offset="60%" stopColor={col} stopOpacity="0.75"/><stop offset="100%" stopColor={col} stopOpacity="0.45"/>
          </linearGradient>
          <radialGradient id={`${id}g`} cx="26" cy="22" r="18" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="white" stopOpacity={unlocked?"0.55":"0.15"}/><stop offset="70%" stopColor="white" stopOpacity={unlocked?"0.1":"0.02"}/><stop offset="100%" stopColor="white" stopOpacity="0"/>
          </radialGradient>
          <filter id={`${id}d`}><feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor={unlocked?`${color}40`:'rgba(0,0,0,0.08)'}/></filter>
        </defs>
        {/* Mini wings */}
        <g opacity={unlocked?0.75:0.25}>
          <path d="M16 24 L4 18 L2 24 L8 28 L3 31 L10 35 L16 34 Z" fill={col} opacity="0.7"/>
          <path d="M16 24 L4 18 L2 24 L8 28 L3 31 L10 35 L16 34 Z" fill="white" opacity="0.15"/>
          <path d="M48 24 L60 18 L62 24 L56 28 L61 31 L54 35 L48 34 Z" fill={col} opacity="0.7"/>
          <path d="M48 24 L60 18 L62 24 L56 28 L61 31 L54 35 L48 34 Z" fill="white" opacity="0.15"/>
        </g>
        {/* Hex body */}
        <g filter={`url(#${id}d)`}>
          <polygon points={hex} fill={`url(#${id}b)`}/>
          <polygon points={hex} fill={`url(#${id}g)`}/>
          <polygon points={hex} fill="none" stroke="white" strokeWidth="0.6" strokeOpacity={unlocked?0.25:0.08}/>
        </g>
      </svg>
      {/* Icon centered on hex */}
      <div className={unlocked?'':'badge-locked-lock'} style={{position:'absolute',top:0,left:0,width:s,height:s*0.88,display:'flex',alignItems:'center',justifyContent:'center',zIndex:2,paddingBottom:s*0.02}}>
        <MI name={unlocked?icon:'lock'} size={s*0.3} fill={unlocked} style={{color:'white',filter:unlocked?'drop-shadow(0 1px 2px rgba(0,0,0,0.45))':'none',opacity:unlocked?1:0.4}}/>
      </div>
      {!unlocked&&<div style={{position:'absolute',inset:0,background:'rgba(245,240,232,0.3)',zIndex:3}}/>}
    </div>
  );
}

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
  {name:'Bergabung',desc:'Resmi bergabung dengan GERAK DISPENAD',icon:'waving_hand',color:C.green,bg:C.greenLight,unlocked:true,rarity:'common',cat:'Pangkat'},
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
const RARITY_COLORS={common:{label:'Standar',gradient:'linear-gradient(135deg,#64748B,#94A3B8)',border:'#64748B',glow:'rgba(100,116,139,0.25)'},rare:{label:'Lanjutan',gradient:'linear-gradient(135deg,#1565C0,#42A5F5)',border:'#1565C0',glow:'rgba(21,101,192,0.3)'},epic:{label:'Elite',gradient:'linear-gradient(135deg,#6D28D9,#A78BFA)',border:'#6D28D9',glow:'rgba(109,40,217,0.3)'},legendary:{label:'Kehormatan',gradient:'linear-gradient(135deg,#92400E,#D97706)',border:'#92400E',glow:'rgba(146,64,14,0.35)'}};

const ACTIVITY=[
  {mission:'Wawasan Kebangsaan TNI AD',type:'EDUKASI',date:'8 Mar',xp:250,status:'SELESAI'},
  {mission:'Dukung Konten DISPENAD',type:'ENGAGEMENT',date:'7 Mar',xp:200,status:'PROSES'},
  {mission:'Reels Prajurit TNI AD',type:'KONTEN',date:'6 Mar',xp:350,status:'PROSES'},
  {mission:'#BanggaTNIAD Challenge',type:'KONTEN',date:'5 Mar',xp:300,status:'SELESAI'},
  {mission:'Baksos TNI AD Cianjur',type:'EVENT',date:'4 Mar',xp:500,status:'SELESAI'},
];

const LEADERBOARD=[
  {name:'Kpt. Rina Dewi',xp:6200,rank:1,avatar:'RD',rankIdx:3},
  {name:'Ltn. Budi Hartono',xp:5800,rank:2,avatar:'BH',rankIdx:2},
  {name:'Srs. Fajar Nugroho',xp:5400,rank:3,avatar:'FN',rankIdx:2},
  {name:'Arif Santoso',xp:4820,rank:4,avatar:'AS',isYou:true,rankIdx:1},
  {name:'Kpl. Sari Utami',xp:4600,rank:5,avatar:'SU',rankIdx:1},
];

/* ─── ADMIN / AI DATA ────────────────────────────────────────────── */
const ADMIN_STATS={totalAgents:1247,activeToday:834,missionsActive:8,missionsCompleted:156,totalParticipation:'18.4K',avgCompletion:'72%',totalReach:'2.4M',avgEngagement:'12.3%',narrativesMonitored:0,alertsToday:0};

/* ─── PROGRESS BAR (react-spring animated) ───────────────────────── */
function ProgressBar({progress=0,color=C.primary,height=6,bg=C.overlay08,gold=false}){
  const spring = useSpring({ width: `${progress*100}%`, from: { width: '0%' }, config: { tension: 120, friction: 20 } });
  return <div style={{height,borderRadius:height,background:bg,overflow:'hidden',width:'100%'}}>
    <animated.div className={gold?'xp-bar-gold':'xp-bar-fill'} style={{height:'100%',borderRadius:height,background:color,...spring}}/>
  </div>;
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
  const [adSideTab,setAdSideTab]=useState('dashboard');
  const [adSubTab,setAdSubTab]=useState('ringkasan');
  const [missionForm,setMissionForm]=useState({type:'EVENT',title:'',desc:'',xp:200,format:'',duration:'',platforms:[],targetGender:'all',targetAge:'all',targetTier:'all'});
  const [selectedAdMission,setSelectedAdMission]=useState(null);
  // Stubs for removed narrative features (admin panel references)
  const expandedNarrative=null,setExpandedNarrative=()=>{};
  const narrativeActions={},setNarrativeActions=()=>{};
  const narrativeMissionFlow=null,setNarrativeMissionFlow=()=>{};
  const monitorView='network',setMonitorView=()=>{};
  const globeSelPost=null,setGlobeSelPost=()=>{};
  const [confirmRedeem,setConfirmRedeem]=useState(null); // item id for shop confirm
  const [logoutConfirm,setLogoutConfirm]=useState(false);
  const [publishing,setPublishing]=useState(false);
  // joinedMissions: {missionId: {status:'TERDAFTAR'|'SUBMITTED'|'REVIEW'|'SELESAI', joinedAt, submittedAt?}}
  const [joinedMissions,setJoinedMissions]=useState({
    9:{status:'SELESAI',joinedAt:'2 Mar 2026',submittedAt:'4 Mar 2026'},
    2:{status:'REVIEW',joinedAt:'3 Mar 2026',submittedAt:'5 Mar 2026'},
    1:{status:'TERDAFTAR',joinedAt:'7 Mar 2026'},
    4:{status:'TERDAFTAR',joinedAt:'8 Mar 2026'},
    6:{status:'SUBMITTED',joinedAt:'6 Mar 2026',submittedAt:'7 Mar 2026'},
  });
  const [k,setK]=useState(0);
  const scrollRef=useRef(null);

  const nav=useCallback(s=>{setScreen(s);setK(n=>n+1);requestAnimationFrame(()=>{scrollRef.current?.scrollTo({top:0})});},[]);
  const [toastExiting,setToastExiting]=useState(false);
  const showToast=useCallback(m=>{setToastExiting(false);setToast(m);setTimeout(()=>{setToastExiting(true);setTimeout(()=>{setToast(null);setToastExiting(false)},200)},1800)},[]);
  const copyText=useCallback(async t=>{try{await navigator.clipboard.writeText(t)}catch{}showToast('Tersalin!')},[showToast]);
  const openM=useCallback(m=>{setSel(m);setConsent(false);setStarted(false);setUploaded(false);nav('detail')},[nav]);
  const joinMission=useCallback((mId)=>{setJoinedMissions(p=>({...p,[mId]:{status:'TERDAFTAR',joinedAt:'8 Mar 2026'}}));showToast('Berhasil mendaftar misi!')},[showToast]);
  const startM=useCallback(()=>{if(!consent)return;setStarted(true);setTimeout(()=>{nav('misi');setSel(null)},1200)},[consent,nav]);
  const filtered=filter==='Semua'?MISSIONS:filter==='Selesai'?MISSIONS.filter(m=>m.status==='SELESAI'):MISSIONS.filter(m=>m.type===filter.toUpperCase());

  /* ─── SHARED COMPONENTS ─────────────────────────────────────────── */
  function Card({children,style={},className='',onClick,accent}){
    return <div onClick={onClick} className={`${className} ${onClick?'card-interactive':'card-hover'} glass-card`} style={{
      background:'rgba(255,255,255,0.55)',
      backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
      borderRadius:16,padding:16,
      border:'1px solid rgba(255,255,255,0.45)',
      cursor:onClick?'pointer':'default',
      boxShadow:'0 4px 30px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)',
      borderLeft:accent?`3px solid ${accent}`:undefined,
      ...style
    }}>{children}</div>;
  }

  function Badge({badge,size=52,compact=false}){
    const col=badge.color||C.primary;
    const unlocked=badge.unlocked;
    const rc=RARITY_COLORS[badge.rarity||'common']||RARITY_COLORS.common;
    const badgeSpring = useSpring({
      from: { scale: unlocked?0.5:1, opacity: unlocked?0:1 },
      to: { scale: 1, opacity: 1 },
      config: { tension: 200, friction: 12 },
      reset: false,
      immediate: !unlocked,
    });

    if(compact) return(
      <div className={`flex flex-col items-center gap-1.5 ${unlocked?'badge-item badge-unlocked':'badge-locked'}`} style={{minWidth:56,cursor:'pointer'}} onClick={()=>showToast(unlocked?`${badge.name} — ${badge.desc||''}`:`${badge.name} — ${badge.desc||'Belum terbuka'}`)}>
        <BadgeShape color={col} size={size} icon={badge.icon} unlocked={unlocked} rarity={badge.rarity}/>
        <span className={unlocked?'':'badge-locked-name'} style={{fontSize:11,color:unlocked?C.text:C.textMuted,textAlign:'center',fontWeight:unlocked?600:400,maxWidth:60,lineHeight:1.2}}>
          {unlocked?badge.name:badge.name}
        </span>
      </div>
    );

    // Card-style badge
    return(
      <animated.div className={unlocked?'badge-item badge-unlocked':'badge-locked'}
        onClick={()=>showToast(unlocked?`${badge.name} — ${badge.desc||''}`:`${badge.name} — ${badge.desc||'Belum terbuka'}`)}
        style={{
          ...badgeSpring,
          position:'relative',overflow:'hidden',borderRadius:16,
          background:unlocked?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.3)',
          backdropFilter:'blur(20px) saturate(180%)',WebkitBackdropFilter:'blur(20px) saturate(180%)',
          border:`1px solid ${unlocked?'rgba(255,255,255,0.45)':'rgba(255,255,255,0.25)'}`,
          padding:'16px 10px 12px',textAlign:'center',cursor:'pointer',
          boxShadow:unlocked?`0 4px 30px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)`:'0 2px 16px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.3)',
        }}>
        {/* Top rarity accent line — uses real color, CSS controls visibility */}
        <div className={unlocked?'':'badge-locked-accent'} style={{position:'absolute',top:0,left:0,right:0,height:unlocked?2:2,background:rc.gradient,opacity:unlocked?0.8:0.15}}/>
        {/* Background glow — shows for both, brighter on unlocked */}
        <div style={{position:'absolute',top:-20,left:'50%',transform:'translateX(-50%)',width:60,height:60,borderRadius:'50%',background:`radial-gradient(circle,${col}${unlocked?'15':'08'},transparent 70%)`,filter:'blur(12px)',pointerEvents:'none',transition:'opacity 300ms'}}/>
        {/* Badge shape */}
        <div style={{display:'flex',justifyContent:'center',marginBottom:8,position:'relative'}}>
          <BadgeShape color={col} size={size} icon={badge.icon} unlocked={unlocked} rarity={badge.rarity}/>
        </div>
        {/* Name — always show real name, CSS dims locked */}
        <p className={unlocked?'':'badge-locked-name'} style={{fontSize:11,fontWeight:unlocked?700:500,color:unlocked?C.text:C.textMuted,lineHeight:1.2,marginBottom:2,opacity:unlocked?1:0.6}}>
          {badge.name}
        </p>
        {/* Desc — show requirement for locked */}
        {!unlocked&&<p className="badge-locked-name" style={{fontSize:11,color:C.textDark,lineHeight:1.3,marginBottom:3,opacity:0.5}}>{badge.desc}</p>}
        {/* Rarity tag */}
        <span className={unlocked?'':'badge-locked-tag'} style={{
          display:'inline-block',fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',
          padding:'2px 8px',borderRadius:9999,
          background:unlocked?`${rc.border}18`:'rgba(71,85,105,0.12)',
          color:unlocked?rc.border:C.textDark,
          border:`1px solid ${unlocked?`${rc.border}30`:'rgba(71,85,105,0.15)'}`,
        }}>{rc.label}</span>
      </animated.div>
    );
  }

  function Chip({label,active,onClick,color}){
    return <button onClick={onClick} className="chip-btn" style={{
      padding:'6px 16px',borderRadius:9999,border:active?'none':`1px solid ${C.border}`,flexShrink:0,
      background:active?(color||C.primary):C.surface,
      color:active?C.bg:C.textSec,fontSize:13,fontWeight:active?700:500,cursor:'pointer',
      letterSpacing:active?'0.02em':'0',
      boxShadow:active?`0 2px 8px ${(color||C.primary)}30`:'none',
    }}>{label}</button>;
  }

  /* ─── RANK BADGE (mini hexagonal metallic) ─── */
  function RankBadge({rankIdx=1,size=48}){
    const s=size;
    const palettes=[
      {from:'#B0BEC5',to:'#455A64'},
      {from:'#66BB6A',to:'#1B5E20'},
      {from:'#E0E0E0',to:'#757575'},
      {from:'#FFD700',to:'#E65100'},
      {from:'#CE93D8',to:'#4A148C'},
    ];
    const p=palettes[rankIdx]||palettes[0];
    const rankIcons=['person','military_tech','star','stars','workspace_premium'];
    const id=`rb${rankIdx}${s}`;
    /* Hex (cx=24,cy=24,r=20 flat-top) */
    const hex=Array.from({length:6},(_,i)=>{const a=Math.PI/3*i-Math.PI/6;return`${24+20*Math.cos(a)},${24+20*Math.sin(a)}`;}).join(' ');
    return(
      <div style={{width:s,height:s,position:'relative'}}>
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none" style={{overflow:'visible'}}>
          <defs>
            <linearGradient id={`${id}g`} x1="24" y1="2" x2="24" y2="46" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={p.from}/><stop offset="100%" stopColor={p.to}/>
            </linearGradient>
            <radialGradient id={`${id}s`} cx="18" cy="16" r="18" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="white" stopOpacity="0.5"/><stop offset="100%" stopColor="white" stopOpacity="0"/>
            </radialGradient>
            <filter id={`${id}d`}><feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="rgba(0,0,0,0.2)"/></filter>
          </defs>
          <g filter={`url(#${id}d)`}>
            <polygon points={hex} fill={`url(#${id}g)`}/>
            <polygon points={hex} fill={`url(#${id}s)`}/>
            <polygon points={hex} fill="none" stroke="white" strokeWidth="0.6" strokeOpacity="0.25"/>
          </g>
        </svg>
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <MI name={rankIcons[rankIdx]||'military_tech'} size={s*0.38} fill style={{color:'white',filter:'drop-shadow(0 1px 2px rgba(0,0,0,0.35))'}}/>
        </div>
      </div>
    );
  }

  /* ─── BERANDA ──────────────────────────────────────────────────── */
  function Beranda(){
    const curRank=1;
    const xpCur=4820,xpMax=5000,xpPct=Math.round(xpCur/xpMax*100);
    /* SVG circular progress ring */
    const ringR=38,ringC=2*Math.PI*ringR,ringOff=ringC*(1-xpCur/xpMax);

    return(
    <div key={k} className="flex flex-col pb-4">

      {/* ═══════ DARK GRADIENT HERO ═══════ */}
      <div className="stagger-1" style={{
        background:`linear-gradient(145deg,${C.primaryDark},${C.primary} 60%,${C.primaryAccent})`,
        borderRadius:20,padding:'20px 16px 24px',marginBottom:16,position:'relative',overflow:'hidden',
        boxShadow:`0 8px 32px rgba(27,94,32,0.25)`,
      }}>
        {/* Decorative orbs */}
        <div style={{position:'absolute',top:-30,right:-30,width:120,height:120,borderRadius:'50%',background:'rgba(255,255,255,0.06)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:-20,left:-20,width:80,height:80,borderRadius:'50%',background:'rgba(255,255,255,0.04)',pointerEvents:'none'}}/>

        {/* Top bar: Logo + Notification */}
        <div className="flex items-center justify-between" style={{marginBottom:20,position:'relative',zIndex:1}}>
          <div className="flex items-center gap-2.5">
            <div style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <MI name="rocket_launch" size={16} fill style={{color:'#FFFFFF'}}/>
            </div>
            <div>
              <h2 style={{fontSize:14,fontWeight:900,color:'#FFFFFF',letterSpacing:2,lineHeight:1}}>GERAK</h2>
              <p style={{fontSize:10,fontWeight:500,color:'rgba(255,255,255,0.6)',letterSpacing:1,textTransform:'uppercase',lineHeight:1,marginTop:2}}>DISPENAD TNI AD</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div role="button" aria-label="Notifications" style={{position:'relative',cursor:'pointer'}} className="tap-bounce" onClick={()=>showToast('Tidak ada notifikasi baru')}>
              <div style={{width:36,height:36,borderRadius:12,background:'rgba(255,255,255,0.12)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid rgba(255,255,255,0.15)'}}>
                <MI name="notifications" size={18} style={{color:'#FFFFFF'}}/>
              </div>
              <div style={{position:'absolute',top:5,right:5,width:7,height:7,borderRadius:'50%',background:'#EF4444',border:'2px solid rgba(0,0,0,0.2)'}} className="urgency-pulse"/>
            </div>
          </div>
        </div>

        {/* User + Circular XP Ring */}
        <div className="flex items-center gap-4" style={{position:'relative',zIndex:1}}>
          {/* Circular XP progress ring with rank emblem inside */}
          <div style={{position:'relative',width:88,height:88,flexShrink:0}}>
            <svg width="88" height="88" viewBox="0 0 88 88" style={{transform:'rotate(-90deg)'}}>
              <circle cx="44" cy="44" r={ringR} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5"/>
              <circle cx="44" cy="44" r={ringR} fill="none" stroke="#FFFFFF" strokeWidth="5"
                strokeLinecap="round" strokeDasharray={ringC} strokeDashoffset={ringOff}
                className="progress-ring-stroke" style={{filter:'drop-shadow(0 0 6px rgba(255,255,255,0.3))'}}/>
            </svg>
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <RankBadge rankIdx={curRank} size={48}/>
            </div>
          </div>

          <div className="flex-1" style={{minWidth:0}}>
            <p style={{fontSize:12,fontWeight:500,color:'rgba(255,255,255,0.7)'}}>Selamat Pagi,</p>
            <h1 style={{fontSize:20,fontWeight:800,color:'#FFFFFF',lineHeight:1.2,marginTop:2}}>Arif Santoso</h1>
            <div className="flex items-center gap-2" style={{marginTop:6}}>
              <span style={{background:'rgba(255,255,255,0.15)',borderRadius:6,padding:'3px 8px',fontSize:11,fontWeight:700,color:'#FFFFFF',letterSpacing:0.3,border:'1px solid rgba(255,255,255,0.1)'}}>
                {RANKS[curRank].name}
              </span>
              <span style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.6)'}}>Lv.{curRank+1}</span>
            </div>
            {/* XP inline */}
            <div style={{marginTop:8}}>
              <div className="flex items-center justify-between mb-1">
                <span style={{fontSize:10,fontWeight:600,color:'rgba(255,255,255,0.5)'}}>XP</span>
                <span style={{fontSize:11,fontWeight:700,fontFamily:"'Space Mono'",color:'#FFFFFF'}}>{xpCur.toLocaleString()} / {xpMax.toLocaleString()}</span>
              </div>
              <div style={{height:5,borderRadius:9999,background:'rgba(255,255,255,0.12)',overflow:'hidden'}}>
                <div className="xp-bar-gold" style={{height:'100%',borderRadius:9999,width:`${xpPct}%`,background:'linear-gradient(90deg,rgba(255,255,255,0.6),rgba(255,255,255,0.9),rgba(255,255,255,0.6))',backgroundSize:'200% 100%'}}/>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ BENTO STATS GRID ═══ */}
      <div className="stagger-2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
        {/* Large stat: Missions */}
        <div className="tap-bounce glass-card" style={{background:'rgba(255,255,255,0.5)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',borderRadius:16,padding:14,border:'1px solid rgba(255,255,255,0.45)',boxShadow:'0 4px 30px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)',cursor:'pointer',gridRow:'span 2',display:'flex',flexDirection:'column',justifyContent:'space-between',position:'relative',overflow:'hidden'}} onClick={()=>nav('misi')}>
          <div style={{position:'absolute',bottom:-10,right:-10,width:64,height:64,borderRadius:'50%',background:C.primaryLight,opacity:0.5,pointerEvents:'none'}}/>
          <div style={{width:36,height:36,borderRadius:10,background:C.primaryLight,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:8}}>
            <MI name="target" size={18} fill style={{color:C.primary}}/>
          </div>
          <div>
            <p style={{fontSize:32,fontWeight:800,color:C.text,fontFamily:"'Plus Jakarta Sans'",lineHeight:1}}>24</p>
            <p style={{fontSize:11,color:C.textSec,fontWeight:600,marginTop:4}}>Misi Selesai</p>
          </div>
          <div style={{marginTop:10}}>
            <div className="flex items-center justify-between mb-1">
              <span style={{fontSize:10,color:C.textMuted}}>Target 30</span>
              <span style={{fontSize:10,fontWeight:700,color:C.primary}}>80%</span>
            </div>
            <div style={{height:4,borderRadius:99,background:C.primaryLight,overflow:'hidden'}}>
              <div style={{width:'80%',height:'100%',borderRadius:99,background:`linear-gradient(90deg,${C.primary},${C.primaryAccent})`}}/>
            </div>
          </div>
          <div className="flex items-center gap-1" style={{marginTop:6}}>
            <MI name="trending_up" size={13} style={{color:C.green}}/>
            <span style={{fontSize:10,fontWeight:700,color:C.green}}>+3 minggu ini</span>
          </div>
        </div>
        {/* Streak */}
        <div className="tap-bounce glass-card" style={{background:'rgba(255,255,255,0.5)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',borderRadius:16,padding:14,border:'1px solid rgba(255,255,255,0.45)',boxShadow:'0 4px 30px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)',cursor:'pointer',position:'relative',overflow:'hidden'}} onClick={()=>showToast('Streak: 7 hari berturut-turut!')}>
          <div style={{position:'absolute',top:-8,right:-8,width:40,height:40,borderRadius:'50%',background:C.orangeLight,opacity:0.6,pointerEvents:'none'}}/>
          <div className="flex items-center justify-between">
            <div style={{width:30,height:30,borderRadius:8,background:C.orangeLight,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <MI name="local_fire_department" size={15} fill style={{color:C.orange}}/>
            </div>
            <span style={{fontSize:10,fontWeight:700,color:C.orange,background:C.orangeLight,borderRadius:6,padding:'2px 6px'}}>AKTIF</span>
          </div>
          <p style={{fontSize:24,fontWeight:800,color:C.text,fontFamily:"'Plus Jakarta Sans'",marginTop:8,lineHeight:1}}>7<span style={{fontSize:12,fontWeight:600,color:C.textMuted,marginLeft:2}}>hari</span></p>
          <p style={{fontSize:10,color:C.textSec,fontWeight:500,marginTop:2}}>Streak Berturut</p>
          {/* Mini streak dots */}
          <div className="flex gap-1" style={{marginTop:6}}>
            {[1,1,1,1,1,1,1].map((_,i)=>(
              <div key={i} style={{width:6,height:6,borderRadius:'50%',background:C.orange,opacity:0.7+i*0.04}}/>
            ))}
          </div>
        </div>
        {/* Rank */}
        <div className="tap-bounce glass-card" style={{background:'rgba(255,255,255,0.5)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',borderRadius:16,padding:14,border:'1px solid rgba(255,255,255,0.45)',boxShadow:'0 4px 30px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)',cursor:'pointer',position:'relative',overflow:'hidden'}} onClick={()=>nav('pangkat')}>
          <div style={{position:'absolute',bottom:-6,right:-6,width:36,height:36,borderRadius:'50%',background:C.tealLight,opacity:0.5,pointerEvents:'none'}}/>
          <div className="flex items-center justify-between">
            <div style={{width:30,height:30,borderRadius:8,background:C.tealLight,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <MI name="leaderboard" size={15} fill style={{color:C.teal}}/>
            </div>
            <MI name="arrow_forward" size={14} style={{color:C.textMuted}}/>
          </div>
          <p style={{fontSize:24,fontWeight:800,color:C.text,fontFamily:"'Plus Jakarta Sans'",marginTop:8,lineHeight:1}}>#4<span style={{fontSize:12,fontWeight:600,color:C.textMuted,marginLeft:2}}>of 1.2K</span></p>
          <p style={{fontSize:10,color:C.textSec,fontWeight:500,marginTop:2}}>Peringkat</p>
          <div className="flex items-center gap-1" style={{marginTop:4}}>
            <MI name="arrow_upward" size={11} style={{color:C.teal}}/>
            <span style={{fontSize:10,fontWeight:600,color:C.teal}}>Naik 2 posisi</span>
          </div>
        </div>
      </div>

      {/* ═══ LEADERBOARD — Mini Podium ═══ */}
      <Card className="stagger-3" style={{padding:0,overflow:'hidden',marginBottom:16}}>
        <div className="flex items-center justify-between" style={{padding:'12px 14px 0'}}>
          <h3 style={{fontSize:13,fontWeight:700,color:C.text,display:'flex',alignItems:'center',gap:5}}>
            <MI name="emoji_events" size={15} fill style={{color:C.gold}}/>Leaderboard
          </h3>
          <button onClick={()=>nav('pangkat')} className="link-action" style={{fontSize:11,fontWeight:600,color:C.primary,background:'none',border:'none',cursor:'pointer'}}>
            Semua <MI name="arrow_forward" size={12} style={{color:'inherit'}}/>
          </button>
        </div>
        {/* Mini Podium — 2nd | 1st | 3rd */}
        <div className="flex items-end justify-center gap-3" style={{padding:'12px 14px 14px'}}>
          {[LEADERBOARD[1],LEADERBOARD[0],LEADERBOARD[2]].map((lb,i)=>{
            const order=[2,1,3];const heights=[56,72,48];const medalColors=['#A8A8A8','#C9A96E','#CD7F32'];
            const isFirst=i===1;
            return(
            <div key={i} className="flex flex-col items-center" style={{flex:1}}>
              <RankBadge rankIdx={lb.rankIdx} size={isFirst?38:30}/>
              <p style={{fontSize:10,fontWeight:700,color:C.text,marginTop:4,textAlign:'center',lineHeight:1.2}} className="truncate" title={lb.name}>{lb.name.split(' ')[0]}</p>
              <span style={{fontSize:10,fontWeight:700,fontFamily:"'Space Mono'",color:C.textMuted,marginTop:1}}>{lb.xp.toLocaleString()}</span>
              <div style={{
                width:'100%',height:heights[i],borderRadius:'10px 10px 0 0',marginTop:6,
                background:isFirst?`linear-gradient(180deg,${C.primary},${C.primaryDark})`:
                  i===0?'linear-gradient(180deg,#C0C0C0,#A0A0A0)':'linear-gradient(180deg,#CD9B6A,#A67B4B)',
                display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:6,
              }}>
                <span style={{fontSize:14,fontWeight:900,color:'#FFFFFF',fontFamily:"'Space Mono'"}}>{order[i]}</span>
              </div>
            </div>);
          })}
        </div>
        {/* Your rank */}
        <div className="flex items-center gap-3" style={{padding:'10px 14px',borderTop:`1px solid ${C.border}`,background:C.primaryLight}}>
          <span style={{fontSize:12,fontWeight:800,color:C.primary,fontFamily:"'Space Mono'",width:18,textAlign:'center'}}>4</span>
          <RankBadge rankIdx={curRank} size={30}/>
          <div className="flex-1" style={{minWidth:0}}>
            <p style={{fontSize:12,fontWeight:600,color:C.text}}>Arif Santoso <span style={{fontSize:10,fontWeight:700,color:C.primary,marginLeft:4}}>Kamu</span></p>
          </div>
          <span style={{fontSize:12,fontWeight:700,fontFamily:"'Space Mono'",color:C.primary}}>4,820</span>
        </div>
      </Card>

      {/* ═══ BADGE SHOWCASE ═══ */}
      <div className="stagger-5" style={{marginBottom:20}}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-1" style={{fontSize:14,fontWeight:700,color:C.text}}>
            <MI name="workspace_premium" size={16} fill style={{color:C.gold}}/> Lencana Terbaru
          </h3>
          <button onClick={()=>nav('pangkat')} className="link-action" style={{color:C.primary,fontSize:11,fontWeight:600,background:'none',border:'none',cursor:'pointer'}}>
            Semua <MI name="arrow_forward" size={12} style={{color:'inherit'}}/>
          </button>
        </div>
        {/* Horizontal scroll badges */}
        <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-2 scroll-peek" style={{scrollSnapType:'x mandatory'}}>
          {BADGES.filter(b=>b.unlocked).slice(0,5).map((b,i)=>(
            <div key={i} className="tap-bounce" style={{flexShrink:0,scrollSnapAlign:'start'}}>
              <Badge badge={b} size={44} compact/>
            </div>
          ))}
          {/* See all */}
          <div onClick={()=>nav('pangkat')} className="tap-bounce" style={{
            flexShrink:0,width:90,scrollSnapAlign:'start',borderRadius:14,
            border:`2px dashed ${C.border}`,display:'flex',flexDirection:'column',
            alignItems:'center',justifyContent:'center',cursor:'pointer',gap:3,
            background:C.primaryFaint,minHeight:100,
          }}>
            <span style={{fontSize:18,fontWeight:800,color:C.primary,fontFamily:"'Space Mono'"}}>+{Math.max(0,BADGES.filter(b=>b.unlocked).length-5)}</span>
            <span style={{fontSize:10,color:C.primary,fontWeight:600}}>Lihat</span>
          </div>
        </div>
        {/* Collection progress */}
        <div className="flex items-center gap-3 mt-2.5" style={{padding:'0 2px'}}>
          <span style={{fontSize:11,fontWeight:700,color:C.text,fontFamily:"'Space Mono'"}}>{BADGES.filter(b=>b.unlocked).length}/{BADGES.length}</span>
          <div className="flex-1"><ProgressBar progress={BADGES.filter(b=>b.unlocked).length/BADGES.length} color={C.gold} height={4}/></div>
          <span style={{fontSize:10,fontWeight:600,color:C.textMuted}}>{Math.round(BADGES.filter(b=>b.unlocked).length/BADGES.length*100)}%</span>
        </div>
      </div>

      {/* ═══ DAILY BRIEF — Featured Mission ═══ */}
      <div className="stagger-6" style={{marginBottom:20,borderRadius:18,overflow:'hidden',position:'relative',
        background:`linear-gradient(135deg,${C.primaryDark},${C.primary} 70%,${C.primaryAccent})`,
        boxShadow:`0 4px 20px rgba(27,94,32,0.2)`,
      }}>
        {/* Decorative pattern */}
        <div style={{position:'absolute',top:-20,right:-20,width:100,height:100,borderRadius:'50%',background:'rgba(255,255,255,0.05)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:-10,left:40,width:60,height:60,borderRadius:'50%',background:'rgba(255,255,255,0.03)',pointerEvents:'none'}}/>
        <div style={{padding:'16px 16px 14px',position:'relative',zIndex:1}}>
          <div className="flex items-center justify-between" style={{marginBottom:10}}>
            <span className="flex items-center gap-1.5" style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.7)',letterSpacing:1.5,textTransform:'uppercase'}}>
              <MI name="wb_sunny" size={12} fill style={{color:'rgba(255,255,255,0.8)'}}/> Misi Hari Ini
            </span>
            <span style={{background:'rgba(255,255,255,0.15)',borderRadius:6,padding:'3px 8px',fontSize:10,fontWeight:700,color:'#FFFFFF',backdropFilter:'blur(4px)',border:'1px solid rgba(255,255,255,0.1)'}}>BRIEFING</span>
          </div>
          <h3 style={{fontSize:16,fontWeight:700,color:'#FFFFFF',lineHeight:1.3,marginBottom:10}}>{MISSIONS[0]?.title||'Misi Hari Ini'}</h3>
          <div className="flex items-center gap-3" style={{marginBottom:14}}>
            <span style={{background:'rgba(255,255,255,0.15)',borderRadius:6,padding:'3px 8px',fontSize:11,fontWeight:700,fontFamily:"'Space Mono'",color:'#FFFFFF'}}>+250 XP</span>
            <span style={{color:'rgba(255,255,255,0.6)',fontSize:11,fontWeight:500}}>Deadline: 12 Mar</span>
          </div>
          <button onClick={()=>openM(MISSIONS[0])} className="btn-primary tap-bounce" style={{
            background:'rgba(255,255,255,0.95)',border:'none',borderRadius:12,padding:'10px 20px',
            color:C.primary,fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4,
          }}>
            Mulai Misi <span className="arrow-nudge" style={{display:'inline-flex'}}><MI name="arrow_forward" size={16} style={{color:C.primary}}/></span>
          </button>
        </div>
      </div>

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
            <div key={i} style={{background:'rgba(255,255,255,0.45)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',borderRadius:10,padding:'8px 4px',textAlign:'center',border:'1px solid rgba(255,255,255,0.4)',boxShadow:'inset 0 1px 0 rgba(255,255,255,0.5)'}}>
              <MI name={s.icon} size={14} style={{color:s.c}}/>
              <p style={{fontSize:16,fontWeight:800,color:s.c,fontFamily:"'Space Mono'"}}>{s.v}</p>
              <p style={{fontSize:10,color:C.textMuted,fontWeight:600}}>{s.l}</p>
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
              <Card key={m.id} onClick={()=>openM(m)} accent={tc} style={{padding:12}}>
                <div className="flex items-center gap-3">
                  <div style={{width:36,height:36,borderRadius:12,background:typeBg(m.type),display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <MI name={typeIcon(m.type)} size={16} fill style={{color:tc}}/>
                  </div>
                  <div className="flex-1" style={{minWidth:0}}>
                    <h4 style={{fontSize:12,fontWeight:700,color:C.text,lineHeight:1.3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.title}</h4>
                    <div className="flex items-center gap-2" style={{marginTop:3}}>
                      <span style={{fontSize:10,fontWeight:700,color:C.gold,fontFamily:"'Space Mono'"}}>+{m.xp} XP</span>
                      <span style={{fontSize:10,color:C.textMuted}}>{m.deadline}</span>
                    </div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div className="flex items-center gap-1" style={{background:st.bg,borderRadius:6,padding:'4px 8px'}}>
                      <MI name={st.icon} size={12} fill={j.status==='SELESAI'} style={{color:st.color}}/>
                      <span style={{fontSize:10,fontWeight:700,color:st.color,whiteSpace:'nowrap'}}>{st.label}</span>
                    </div>
                    {j.status==='TERDAFTAR'&&(
                      <p style={{fontSize:10,color:C.orange,fontWeight:600,marginTop:3}}>Deadline: {m.deadline}</p>
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

      {/* ═══ ACTIVE MISSIONS ═══ */}
      <div className="stagger-6" style={{marginBottom:20}}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="flex items-center gap-1" style={{fontSize:14,fontWeight:700,color:C.text}}>
            <MI name="rocket_launch" size={16} fill style={{color:C.primary}}/> Misi Aktif
          </h3>
          <button onClick={()=>nav('misi')} className="link-action" style={{color:C.primary,fontSize:11,fontWeight:600,background:'none',border:'none',cursor:'pointer'}}>Semua <MI name="arrow_forward" size={12} style={{color:'inherit'}}/></button>
        </div>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 scroll-peek" style={{scrollSnapType:'x mandatory'}}>
          {MISSIONS.filter(m=>m.status!=='SELESAI'&&!joinedMissions[m.id]).slice(0,4).map(m=>{
            const tc=typeColor(m.type);
            return(
            <div key={m.id} className="tap-bounce" onClick={()=>openM(m)} style={{
              minWidth:200,flexShrink:0,scrollSnapAlign:'start',borderRadius:16,overflow:'hidden',
              background:'rgba(255,255,255,0.5)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
              border:'1px solid rgba(255,255,255,0.45)',cursor:'pointer',
              boxShadow:'0 4px 30px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)',
            }}>
              {/* Colored header strip */}
              <div style={{height:4,background:typeGradient(m.type)}}/>
              <div style={{padding:'12px 14px 14px'}}>
                <div className="flex items-center gap-2 mb-2">
                  <div style={{width:28,height:28,borderRadius:8,background:typeBg(m.type),display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <MI name={typeIcon(m.type)} size={14} fill style={{color:tc}}/>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,color:tc,textTransform:'uppercase',letterSpacing:0.5}}>{m.type}</span>
                </div>
                <h4 style={{fontSize:13,fontWeight:600,color:C.text,lineHeight:1.3,marginBottom:8,minHeight:34}} className="line-clamp-2">{m.title}</h4>
                <div className="flex items-center gap-2" style={{marginBottom:10}}>
                  <span style={{fontSize:11,fontWeight:700,color:C.gold,fontFamily:"'Space Mono'"}}>+{m.xp} XP</span>
                  <span style={{fontSize:10,color:C.textMuted,fontWeight:500}}>{m.deadline}</span>
                </div>
                <div style={{
                  background:`linear-gradient(135deg,${C.primary},${C.primaryAccent})`,
                  borderRadius:10,padding:'7px 0',textAlign:'center',
                  fontSize:11,fontWeight:700,color:'#FFFFFF',letterSpacing:0.5,
                }}>IKUT MISI</div>
              </div>
            </div>);
          })}
        </div>
      </div>

      {/* ═══ QUICK ACTIONS ═══ */}
      <div className="stagger-7" style={{marginBottom:16}}>
        <div className="flex gap-2">
          {[
            {icon:'add_task',label:'Buat Misi',color:C.primary,bg:C.primaryLight,action:()=>showToast('Segera hadir!')},
            {icon:'qr_code_scanner',label:'Scan QR',color:C.teal,bg:C.tealLight,action:()=>showToast('Scan QR misi')},
            {icon:'share',label:'Undang',color:C.purple,bg:C.purpleLight,action:()=>showToast('Link undangan disalin!')},
            {icon:'help',label:'Panduan',color:C.orange,bg:C.orangeLight,action:()=>showToast('Panduan DISPENAD')},
          ].map((a,i)=>(
            <div key={i} className="tap-bounce flex-1 glass-card" onClick={a.action} style={{background:'rgba(255,255,255,0.45)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',borderRadius:14,padding:'12px 4px',textAlign:'center',border:'1px solid rgba(255,255,255,0.4)',boxShadow:'0 2px 16px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.5)',cursor:'pointer'}}>
              <div style={{width:36,height:36,borderRadius:10,background:a.bg,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 6px'}}>
                <MI name={a.icon} size={18} style={{color:a.color}}/>
              </div>
              <p style={{fontSize:10,fontWeight:600,color:C.textSec}}>{a.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );}

  /* ─── PAPAN MISI ────────────────────────────────────────────────── */
  function PapanMisi(){
    const filters=['Semua','Event','Konten','Engagement','Edukasi','Aksi','Selesai'];
    return(<div key={k} className="flex flex-col gap-4 pb-4">
      <h1 className="stagger-1" style={{fontSize:22,fontWeight:800,color:C.text,paddingTop:4}}>Papan Misi</h1>
      <div className="stagger-2 flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        {filters.map(f=><Chip key={f} label={f} active={filter===f} onClick={()=>setFilter(f)}/>)}
      </div>
      {filtered.length===0&&(
        <Card className="stagger-3" style={{textAlign:'center',padding:'32px 16px'}}>
          <div className="empty-float"><MI name="search_off" size={40} style={{color:C.textMuted,opacity:0.5}}/></div>
          <p style={{fontSize:14,fontWeight:700,color:C.textMuted,marginTop:8}}>Tidak ada misi</p>
          <p style={{fontSize:12,color:C.textMuted,marginTop:2}}>Coba filter lain untuk melihat misi</p>
          <button onClick={()=>setFilter('Semua')} style={{marginTop:12,padding:'8px 20px',borderRadius:8,border:`1px solid ${C.primary}`,background:'transparent',color:C.primary,fontSize:12,fontWeight:700,cursor:'pointer'}}>Reset Filter</button>
        </Card>
      )}
      {filtered.map((m,i)=>{const tc=typeColor(m.type);const done=m.status==='SELESAI';
        const daysLeft=m.deadline?Math.max(0,Math.round((new Date(m.deadline.replace(/(\d+) (\w+) (\d+)/,'$2 $1, $3'))-new Date())/(1000*60*60*24))):99;
        const urgent=daysLeft<=2&&!done;
        return(
        <Card key={m.id} className={`stagger-${Math.min(i+3,7)} ${urgent?'urgency-pulse':''}`} onClick={()=>openM(m)} accent={urgent?C.red:tc} style={{opacity:done?0.6:1,position:'relative',overflow:'hidden',borderColor:urgent?C.red:undefined}}>
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
              <span style={{fontSize:12,fontWeight:700,color:done?C.textMuted:C.gold,fontFamily:"'Space Mono'"}}>+{m.xp} XP</span>
              <span style={{fontSize:11,color:C.textMuted}}>
                <MI name="group" size={14} style={{color:C.textMuted,verticalAlign:'middle',marginRight:2}}/>{m.participants}
              </span>
              {!done&&<span style={{fontSize:10,color:urgent?C.red:daysLeft<=5?C.orange:C.textMuted,fontWeight:urgent?700:500}}>
                <MI name="schedule" size={12} style={{verticalAlign:'middle',marginRight:1,color:urgent?C.red:daysLeft<=5?C.orange:C.textMuted}}/>{daysLeft}h
              </span>}
            </div>
            {!done&&!joinedMissions[m.id]&&<span className="btn-gold" style={{background:`linear-gradient(135deg,${C.primary},${C.primaryAccent})`,borderRadius:8,padding:'6px 14px',fontSize:11,fontWeight:700,color:C.bg,display:'inline-block',letterSpacing:0.5}}>IKUT</span>}
            {!done&&joinedMissions[m.id]&&(()=>{const jst=joinedMissions[m.id].status;return(
              <span style={{borderRadius:8,padding:'5px 12px',fontSize:10,fontWeight:700,
                background:jst==='TERDAFTAR'?C.orangeLight:jst==='SUBMITTED'?C.tealLight:jst==='REVIEW'?C.purpleLight:C.greenLight,
                color:jst==='TERDAFTAR'?C.orange:jst==='SUBMITTED'?C.teal:jst==='REVIEW'?C.purple:C.green,
                display:'flex',alignItems:'center',gap:3}}>
                <MI name={jst==='TERDAFTAR'?'cloud_upload':jst==='SUBMITTED'?'hourglass_top':'rate_review'} size={12}/>
                {jst==='TERDAFTAR'?'Upload':jst==='SUBMITTED'?'Submitted':'Review'}
              </span>);})()}
            {done&&<span style={{fontSize:11,fontWeight:600,color:C.green,display:'flex',alignItems:'center',gap:3}}><MI name="check_circle" size={14} fill style={{verticalAlign:'middle'}}/> Selesai</span>}
          </div>
        </Card>
      );})}
    </div>);}

  /* ─── PANGKAT & LENCANA ─────────────────────────────────────────── */
  function PangkatLencana(){
    const [badgeCat,setBadgeCat]=useState('Semua');
    const unlocked=BADGES.filter(b=>b.unlocked).length;
    const cats=['Semua','Misi','Streak','Sosial','Pangkat'];
    const filtered=badgeCat==='Semua'?BADGES:BADGES.filter(b=>b.cat===badgeCat);

    return(<div key={k} className="flex flex-col gap-4 pb-4">
      <h1 className="stagger-1" style={{fontSize:22,fontWeight:800,color:C.text,paddingTop:4}}>Pangkat & Lencana</h1>

      {/* ─── Current Rank Hero Card ─── */}
      <Card className="stagger-2" style={{padding:0,overflow:'hidden',position:'relative'}}>
        {/* Gradient bg */}
        <div style={{position:'absolute',inset:0,background:`linear-gradient(135deg,${C.primaryLight},${C.primaryFaint},transparent)`,pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:-40,right:-40,width:140,height:140,borderRadius:'50%',background:`radial-gradient(circle,${C.primaryGlow}40,transparent 70%)`,pointerEvents:'none'}}/>
        <div style={{padding:'24px 20px',display:'flex',alignItems:'center',gap:16,position:'relative'}}>
          {/* Rank insignia */}
          <div style={{flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center'}}>
            <RankInsignia rank={1} size={80} showLabel={false}/>
          </div>
          {/* Info */}
          <div className="flex-1" style={{minWidth:0}}>
            <span style={{fontSize:10,fontWeight:700,color:C.textMuted,letterSpacing:2,textTransform:'uppercase'}}>Pangkat Saat Ini</span>
            <h2 style={{fontSize:22,fontWeight:800,color:C.text,lineHeight:1.1,marginTop:4}}>Kopral</h2>
            <div className="flex items-center gap-2 mt-2">
              <span style={{background:`linear-gradient(135deg,${C.primaryMid},${C.primaryFaint})`,borderRadius:9999,padding:'3px 10px',border:`1px solid ${C.primary}40`,fontSize:11,fontWeight:700,color:C.primary,fontFamily:"'Space Mono'"}}>4,820 XP</span>
              <span style={{fontSize:10,color:C.textMuted}}>/ 5,000</span>
            </div>
            {/* Progress */}
            <div style={{marginTop:10}}>
              <ProgressBar progress={0.964} color={C.gold} height={6} gold/>
              <div className="flex items-center justify-between mt-1.5">
                <span style={{fontSize:10,fontWeight:600,color:C.primary}}>96%</span>
                <span style={{fontSize:10,color:C.textMuted,display:'flex',alignItems:'center',gap:2}}>
                  180 XP ke <span style={{color:C.primary,fontWeight:600,marginLeft:2}}>Sersan</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ─── Rank Progression ─── */}
      <Card className="stagger-2b" style={{padding:0,overflow:'hidden'}}>
        <div style={{padding:'16px 20px',display:'flex',alignItems:'center',gap:16}}>
          <RankBadge rankIdx={1} size={64}/>
          <div className="flex-1" style={{minWidth:0}}>
            <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>Pangkat & Insignia</h3>
            <p style={{fontSize:11,color:C.textMuted,lineHeight:1.4}}>Insignia berubah sesuai pangkat. Naik pangkat untuk membuka lencana baru!</p>
          </div>
        </div>
        {/* Rank uniform progression preview */}
        <div style={{borderTop:`1px solid ${C.border}`,padding:'12px 20px',display:'flex',alignItems:'center',gap:8,overflowX:'auto'}} className="hide-scrollbar">
          {RANKS.map((r,i)=>{
            const cur=i===1,unlocked=i<=1;
            return(
              <div key={i} style={{flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center',gap:4,opacity:unlocked?1:0.35,position:'relative'}}>
                <RankBadge rankIdx={i} size={40}/>
                <span style={{fontSize:10,fontWeight:700,color:cur?C.primary:unlocked?C.textSec:C.textMuted,textAlign:'center',maxWidth:56,lineHeight:1.2}}>{r.name}</span>
                {cur&&<div style={{position:'absolute',top:-3,right:-3,width:10,height:10,borderRadius:'50%',background:C.primary,border:`1.5px solid ${C.bg}`}}/>}
                {!unlocked&&<MI name="lock" size={10} style={{color:C.textMuted,position:'absolute',top:14,left:'50%',transform:'translateX(-50%)'}}/>}
              </div>
            );
          })}
        </div>
        {/* Unlockable items tied to badges */}
        <div style={{borderTop:`1px solid ${C.border}`,padding:'12px 20px'}}>
          <p style={{fontSize:10,fontWeight:600,color:C.textMuted,marginBottom:8,letterSpacing:0.5,textTransform:'uppercase'}}>Item Terbuka dari Lencana</p>
          <div className="flex gap-2 flex-wrap">
            {[
              {name:'Baret Ksatria',badge:'Naik Pangkat',unlocked:true,icon:'military_tech'},
              {name:'Helm Tempur',badge:'Krisis Hero',unlocked:true,icon:'security'},
              {name:'Topi Rimba',badge:'Field Agent',unlocked:true,icon:'forest'},
              {name:'Seragam Hitam',badge:'Elite',unlocked:false,icon:'diamond'},
              {name:'Seragam Desert',badge:'Streak 30',unlocked:true,icon:'whatshot'},
            ].map((item,i)=>(
              <div key={i} style={{
                display:'flex',alignItems:'center',gap:4,padding:'4px 10px',borderRadius:8,
                background:item.unlocked?`${C.primaryLight}`:`${C.surface}`,
                border:`1px solid ${item.unlocked?C.primary+'30':C.border}`,
                opacity:item.unlocked?1:0.5,
              }}>
                <MI name={item.icon} size={12} style={{color:item.unlocked?C.primary:C.textMuted}}/>
                <span style={{fontSize:10,fontWeight:600,color:item.unlocked?C.text:C.textMuted}}>{item.name}</span>
                {!item.unlocked&&<MI name="lock" size={8} style={{color:C.textMuted}}/>}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ─── Rank Ladder — visual cards ─── */}
      <div className="stagger-3">
        <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:12}}>Jenjang Pangkat</h3>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
          {RANKS.map((r,i)=>{
            const cur=i===1,done=i<1;
            const rankColors=[
              {bg:`linear-gradient(135deg,#33415520,${C.surface})`,border:'#64748B',accent:'#94A3B8'},
              {bg:`linear-gradient(135deg,${C.primary}20,${C.surface})`,border:C.primary,accent:C.primary},
              {bg:`linear-gradient(135deg,${C.secondary}20,${C.surface})`,border:C.secondary,accent:C.secondary},
              {bg:`linear-gradient(135deg,${C.purple}20,${C.surface})`,border:C.purple,accent:C.purple},
              {bg:`linear-gradient(135deg,${C.accent}20,${C.surface})`,border:C.accent,accent:C.accent},
            ][i];
            return(
              <div key={i} style={{
                flexShrink:0,width:130,borderRadius:12,overflow:'hidden',
                background:cur?rankColors.bg:`linear-gradient(135deg,${C.surface},${C.bg})`,
                border:`1.5px solid ${cur?rankColors.border:done?C.green+'40':C.border}`,
                padding:'14px 10px 12px',textAlign:'center',position:'relative',
                boxShadow:cur?`0 4px 20px ${rankColors.accent}20`:'none',
                opacity:!cur&&!done?0.5:1,
              }}>
                {cur&&<div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${rankColors.accent},transparent)`,opacity:0.6}}/>}
                {/* Rank insignia */}
                <RankInsignia rank={i} size={56} showLabel={false}/>
                <p style={{fontSize:11,fontWeight:700,color:cur?rankColors.accent:done?C.green:C.textMuted,marginTop:6,lineHeight:1.2}}>{r.name}</p>
                {r.subtitle&&<p style={{fontSize:10,fontWeight:600,color:cur?rankColors.accent:C.textMuted,marginTop:1,letterSpacing:0.3,lineHeight:1.2,opacity:cur?0.7:1}}>{r.subtitle}</p>}
                <p style={{fontSize:10,fontWeight:600,color:cur?rankColors.accent:C.textMuted,fontFamily:"'Space Mono'",marginTop:3,opacity:cur?0.8:1}}>{r.xp.toLocaleString()} XP</p>
                {cur&&<div style={{marginTop:5,background:`${rankColors.accent}20`,borderRadius:9999,padding:'2px 8px',display:'inline-block'}}>
                  <span style={{fontSize:10,fontWeight:700,color:rankColors.accent,letterSpacing:0.5}}>SAAT INI</span>
                </div>}
                {done&&<div style={{marginTop:5}}><MI name="check_circle" size={14} fill style={{color:C.green}}/></div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Badges Grid ─── */}
      <div className="stagger-4">
        <div className="flex justify-between items-center mb-2">
          <h3 style={{fontSize:16,fontWeight:700,color:C.text}}>Koleksi Lencana</h3>
          <span style={{fontSize:12,fontWeight:700,color:C.primary,fontFamily:"'Space Mono'"}}>{unlocked}/{BADGES.length}</span>
        </div>
        {/* Progress */}
        <div className="flex items-center gap-3 mb-3">
          <ProgressBar progress={unlocked/BADGES.length} color={C.gold} height={4}/>
          <span style={{fontSize:10,color:C.textMuted,fontWeight:600,flexShrink:0}}>{Math.round(unlocked/BADGES.length*100)}%</span>
        </div>
        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-3 pb-1">
          {cats.map(c2=>(
            <button key={c2} onClick={()=>setBadgeCat(c2)} style={{
              padding:'5px 14px',borderRadius:9999,flexShrink:0,fontSize:12,fontWeight:badgeCat===c2?700:500,
              background:badgeCat===c2?C.primaryLight:'transparent',color:badgeCat===c2?C.primary:C.textMuted,
              border:`1px solid ${badgeCat===c2?C.primary+'30':C.border}`,cursor:'pointer',transition:'all 150ms ease',
            }}>{c2}</button>
          ))}
        </div>
        {/* Rarity legend */}
        <div className="flex gap-3 mb-3" style={{paddingLeft:2}}>
          {Object.entries(RARITY_COLORS).map(([k2,v])=>(
            <div key={k2} className="flex items-center gap-1.5">
              <div style={{width:8,height:8,borderRadius:2,background:v.gradient}}/>
              <span style={{fontSize:10,color:C.textMuted,fontWeight:500}}>{v.label}</span>
            </div>
          ))}
        </div>
        {/* Badge grid */}
        <div className="grid grid-cols-3 gap-3">
          {filtered.map((b,i)=><Badge key={i} badge={b} size={48}/>)}
        </div>
      </div>
    </div>);}

  /* ─── PROFIL ────────────────────────────────────────────────────── */
  function Profil(){return(
    <div key={k} className="flex flex-col gap-4 pb-4">
      {/* Profile Header */}
      <Card className="stagger-1" style={{textAlign:'center',padding:24,position:'relative',overflow:'hidden'}}>
        <div className="orb orb-2" style={{width:120,height:120,background:'radial-gradient(circle,rgba(249,115,22,0.12),transparent 70%)',top:-20,left:-30}}/>
        <div style={{margin:'0 auto 12px',position:'relative',zIndex:1,display:'flex',justifyContent:'center'}}>
          <RankBadge rankIdx={1} size={72}/>
        </div>
        <h2 style={{fontSize:18,fontWeight:800,color:C.text,position:'relative',zIndex:1}}>Mayor Arif Santoso</h2>
        <p style={{fontSize:11,color:C.textMuted,fontFamily:"'Space Mono'",marginTop:2,position:'relative',zIndex:1}}>NRP-20240812</p>
        <span style={{display:'inline-block',background:C.goldLight,borderRadius:8,padding:'4px 12px',fontSize:11,fontWeight:700,color:C.gold,marginTop:8,border:'1px solid rgba(249,115,22,0.2)',position:'relative',zIndex:1}}>Kopral</span>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[{l:'Misi',v:'24'},{l:'XP',v:'4,820'},{l:'Rank',v:'#12'}].map((s,i)=>(
            <div key={i} style={{background:C.surfaceLight,borderRadius:12,padding:'8px 0',textAlign:'center',border:`1px solid ${C.border}`,position:'relative',zIndex:1}}>
              <p style={{fontSize:16,fontWeight:800,color:C.text,fontFamily:"'Space Mono'"}}>{s.v}</p>
              <p style={{fontSize:10,color:C.textMuted,fontWeight:600}}>{s.l}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Social Accounts */}
      <Card className="stagger-2">
        <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:12}}>Akun Terhubung</h3>
        {SOCIALS.map((s,i)=>(
          <div key={s.key} className="flex items-center gap-3 social-row" style={{padding:'10px 4px',borderBottom:i<SOCIALS.length-1?`1px solid ${C.borderLight}`:'none',cursor:'pointer'}}>
            <div className="stat-icon" style={{width:38,height:38,borderRadius:12,background:C.surfaceLight,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${C.border}`}}>
              <SocialIcon platform={s.platform} size={18} color={s.color}/>
            </div>
            <div className="flex-1">
              <p style={{fontSize:13,fontWeight:600,color:C.text}}>{s.label}</p>
              <p style={{fontSize:11,color:C.textMuted}}>{s.handle}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:"'Space Mono'"}}>{s.followers}</span>
              <span style={{fontSize:10,padding:'2px 6px',borderRadius:4,fontWeight:700,background:C.greenLight,color:C.green}}>Connected</span>
            </div>
          </div>
        ))}
        <button onClick={()=>showToast('Fitur hubungkan akun segera hadir')} className="btn-admin" style={{width:'100%',marginTop:12,padding:'10px 0',borderRadius:8,border:`1px dashed ${C.border}`,background:'transparent',color:C.primary,fontWeight:600,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
          <MI name="add" size={16} style={{color:'inherit'}}/> Hubungkan Akun Lain
        </button>
      </Card>

      {/* Badges */}
      <div className="stagger-3">
        <div className="flex justify-between items-center mb-3">
          <h3 style={{fontSize:14,fontWeight:700,color:C.text}}>Lencana</h3>
          <button onClick={()=>nav('pangkat')} className="link-action" style={{color:C.primary,fontSize:12,fontWeight:600,background:'none',border:'none',cursor:'pointer'}}>Semua <MI name="arrow_forward" size={12} style={{color:'inherit'}}/></button>
        </div>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
          {BADGES.filter(b=>b.unlocked).slice(0,5).map((b,i)=>(
            <div key={i} style={{flexShrink:0,width:90}}>
              <Badge badge={b} size={42} compact={false}/>
            </div>
          ))}
        </div>
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
              <span style={{fontSize:11,fontWeight:700,color:C.gold,fontFamily:"'Space Mono'"}}>+{a.xp}</span>
              <span style={{fontSize:10,padding:'2px 6px',borderRadius:4,fontWeight:700,
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
              <span className="toggle-knob" style={{width:18,height:18,borderRadius:'50%',background:C.white,position:'absolute',top:3,left:s.on?23:3,boxShadow:s.on?`0 0 8px rgba(27,94,32,0.3), 0 1px 3px rgba(0,0,0,0.1)`:'0 1px 3px rgba(0,0,0,0.1)'}}/>
            </button>
          </div>
        ))}
        <button onClick={()=>setMode('admin')} className="btn-admin" style={{width:'100%',marginTop:14,padding:'10px 0',borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.primary,fontWeight:700,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
          <MI name="dashboard" size={16} style={{color:C.primary}}/> Admin Dashboard
        </button>
        <button onClick={()=>{if(logoutConfirm){showToast('Berhasil keluar');setLogoutConfirm(false)}else{setLogoutConfirm(true);setTimeout(()=>setLogoutConfirm(false),3000)}}} className={logoutConfirm?'confirm-bounce':''} style={{width:'100%',marginTop:8,padding:'10px 0',borderRadius:8,border:`1px solid ${logoutConfirm?C.red:C.redLight}`,background:logoutConfirm?C.red:C.redLight,color:logoutConfirm?'white':C.red,fontWeight:700,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4,transition:'all 200ms'}}>
          <MI name={logoutConfirm?'warning':'logout'} size={16} style={{color:logoutConfirm?'white':C.red}}/> {logoutConfirm?'Yakin keluar?':'Keluar'}
        </button>
      </Card>
    </div>
  );}

  /* ─── ADMIN DASHBOARD ───────────────────────────────────────────── */
  function AdminDashboard(){
    const tabs2=[{id:'overview',label:'Overview'},{id:'missions',label:'Kelola Misi'}];
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
              <p style={{fontSize:20,fontWeight:800,color:C.text,fontFamily:"'Space Mono'"}}>{s.value}</p>
              <p style={{fontSize:11,color:C.textMuted,fontWeight:500}}>{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Reach & Engagement */}
        <div className="stagger-4 grid grid-cols-2 gap-3">
          <Card style={{padding:14,background:'linear-gradient(135deg,rgba(249,115,22,0.15),rgba(249,115,22,0.08))',border:'1px solid rgba(249,115,22,0.2)'}}>
            <MI name="public" size={20} style={{color:C.primary}}/>
            <p style={{fontSize:22,fontWeight:800,color:C.text,marginTop:4,fontFamily:"'Space Mono'"}}>{ADMIN_STATS.totalReach}</p>
            <p style={{fontSize:11,color:C.textSec}}>Total Reach</p>
          </Card>
          <Card style={{padding:14,background:'linear-gradient(135deg,rgba(249,115,22,0.1),rgba(245,158,11,0.06))',border:'1px solid rgba(249,115,22,0.15)'}}>
            <MI name="trending_up" size={20} style={{color:C.gold}}/>
            <p style={{fontSize:22,fontWeight:800,color:C.text,marginTop:4,fontFamily:"'Space Mono'"}}>{ADMIN_STATS.avgEngagement}</p>
            <p style={{fontSize:11,color:C.textSec}}>Avg Engagement</p>
          </Card>
        </div>

        {/* Mission Type Breakdown */}
        <Card className="stagger-5">
          <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:12}}>Misi per Tipe</h3>
          {['EVENT','KONTEN','ENGAGEMENT','EDUKASI','AKSI'].map((t,i)=>{
            const count=MISSIONS.filter(m=>m.type===t).length;
            return(
            <div key={t} className="flex items-center gap-3" style={{padding:'8px 0',borderBottom:i<4?`1px solid ${C.borderLight}`:'none'}}>
              <div style={{width:32,height:32,borderRadius:8,background:typeBg(t),display:'flex',alignItems:'center',justifyContent:'center'}}>
                <MI name={typeIcon(t)} size={16} fill style={{color:typeColor(t)}}/>
              </div>
              <div className="flex-1">
                <p style={{fontSize:12,fontWeight:600,color:C.text}}>{t.charAt(0)+t.slice(1).toLowerCase()}</p>
                <p style={{fontSize:10,color:C.textMuted}}>{typeDesc(t)}</p>
              </div>
              <span style={{fontSize:16,fontWeight:800,color:typeColor(t),fontFamily:"'Space Mono'"}}>{count}</span>
            </div>);
          })}
        </Card>
      </>)}

      {/* === KELOLA MISI === */}
      {adminTab==='missions'&&(<>

        {/* Mission list for admin */}
        {MISSIONS.map((m,i)=>{
          const tc=typeColor(m.type);
          return(
          <Card key={m.id} className={`stagger-${Math.min(i+3,7)}`} onClick={()=>setSelectedAdMission(m.id)} style={{padding:12,cursor:'pointer'}}>
            <div className="flex items-center gap-3">
              <div style={{width:36,height:36,borderRadius:10,background:typeBg(m.type),display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <MI name={typeIcon(m.type)} size={18} fill style={{color:tc}}/>
              </div>
              <div className="flex-1" style={{minWidth:0}}>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{fontSize:10,fontWeight:700,color:tc,textTransform:'uppercase',letterSpacing:0.5}}>{m.type}</span>
                  <span style={{fontSize:10,color:C.textMuted}}>{m.deadline}</span>
                </div>
                <h3 style={{fontSize:13,fontWeight:600,color:C.text,lineHeight:1.3}} className="truncate">{m.title}</h3>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <span style={{fontSize:12,fontWeight:700,color:C.gold,fontFamily:"'Space Mono'"}}>{m.xp} XP</span>
                <p style={{fontSize:10,color:C.textMuted,marginTop:1}}>{m.participants} peserta</p>
              </div>
            </div>
            {/* Completion bar */}
            <div style={{marginTop:8}}>
              <div className="flex items-center justify-between mb-1">
                <span style={{fontSize:10,color:C.textMuted}}>Completion</span>
                <span style={{fontSize:10,fontWeight:700,color:tc}}>{m.analytics?.completion||0}%</span>
              </div>
              <div style={{height:3,borderRadius:99,background:C.borderLight,overflow:'hidden'}}>
                <div style={{width:`${m.analytics?.completion||0}%`,height:'100%',borderRadius:99,background:tc}}/>
              </div>
            </div>
          </Card>);
        })}
      </>)}
    </div>);}

  /* ─── UPLOAD & VERIFIKASI ───────────────────────────────────────── */
  function KontenSaya(){
    const [kontenTab,setKontenTab]=useState('semua');
    const myPosts=[
      {id:1,platform:'tiktok',type:'video',title:'POV: Prajurit TNI AD Nolong Nenek di Jalan',date:'6 Mar 2026',thumb:'video',
        views:'328.4K',likes:'42.3K',comments:'5.2K',shares:'14.5K',saves:'8.1K',rate:21.2,trending:true,
        missionId:4,missionTitle:'Video Reels: Hari-Hari Prajurit TNI AD',status:'SELESAI',xpEarned:350},
      {id:2,platform:'instagram',type:'reels',title:'Behind The Scenes Latihan Prajurit TNI AD',date:'4 Mar 2026',thumb:'image',
        views:'85.8K',likes:'11.6K',comments:'842',shares:'3.8K',saves:'2.9K',rate:14.8,trending:true,
        missionId:4,missionTitle:'Video Reels: Hari-Hari Prajurit TNI AD',status:'SELESAI',xpEarned:350},
      {id:3,platform:'x',type:'thread',title:'Thread: 7 Fakta Modernisasi Alutsista TNI AD',date:'2 Mar 2026',thumb:'article',
        views:'45.2K',likes:'6.1K',comments:'387',shares:'2.9K',saves:'1.4K',rate:12.4,trending:false,
        missionId:7,missionTitle:'Dukung Konten Resmi DISPENAD',status:'SELESAI',xpEarned:200},
      {id:4,platform:'tiktok',type:'video',title:'Saat TNI AD Bantu Korban Banjir Demak',date:'28 Feb 2026',thumb:'video',
        views:'456.1K',likes:'58.9K',comments:'7.4K',shares:'18.7K',saves:'9.2K',rate:22.1,trending:true,
        missionId:2,missionTitle:'Bakti Sosial TNI AD — Operasi Pembangunan Desa',status:'SELESAI',xpEarned:500},
      {id:5,platform:'instagram',type:'carousel',title:'Infografis Peran TNI AD dalam Bencana Alam',date:'25 Feb 2026',thumb:'image',
        views:'62.3K',likes:'8.2K',comments:'456',shares:'3.9K',saves:'2.4K',rate:11.6,trending:false,
        missionId:5,missionTitle:'Infografis: Peran TNI AD dalam Bencana Alam',status:'REVIEW',xpEarned:0},
    ];
    const filtered=kontenTab==='semua'?myPosts:myPosts.filter(p=>p.platform===kontenTab);
    const totalViews='470.8K';const totalLikes='52.1K';const totalShares='16.8K';const avgRate='12.4%';
    const totalXpEarned=myPosts.reduce((s,p)=>s+p.xpEarned,0);
    const pCol=p=>({instagram:'#E1306C',tiktok:'#1A1A1A',x:'#1DA1F2'}[p]||C.text);
    const pLbl=p=>({instagram:'Instagram',tiktok:'TikTok',x:'X (Twitter)'}[p]||p);
    const tIcon=t=>({video:'play_circle',reels:'slow_motion_video',thread:'article',carousel:'view_carousel'}[t]||'image');

    return(<div key={k} className="flex flex-col gap-4 pb-4">
      <div className="stagger-1 flex items-center justify-between" style={{paddingTop:4}}>
        <h1 style={{fontSize:22,fontWeight:800,color:C.text}}>Konten Saya</h1>
        {totalXpEarned>0&&<div style={{background:C.goldLight,borderRadius:8,padding:'4px 12px',border:'1px solid rgba(249,115,22,0.2)',display:'flex',alignItems:'center',gap:4}}>
          <MI name="stars" size={14} fill style={{color:C.gold}}/>
          <span style={{fontSize:13,fontWeight:800,color:C.gold,fontFamily:"'Space Mono'"}}>{totalXpEarned} XP</span>
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
                  <p style={{fontSize:10,color:C.orange,fontWeight:600}}>Deadline: {m.deadline}</p>
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
          <div key={i} className={`num-pop num-pop-d${Math.min(i+1,3)}`} style={{background:C.surface,borderRadius:12,padding:'10px 6px',textAlign:'center',border:`1px solid ${C.border}`}}>
            <MI name={s.icon} size={16} style={{color:s.c}}/>
            <p style={{fontSize:13,fontWeight:800,color:C.text,fontFamily:"'Space Mono'",marginTop:2}}>{s.v}</p>
            <p style={{fontSize:10,color:C.textMuted,fontWeight:600}}>{s.l}</p>
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
                <p style={{fontSize:13,fontWeight:800,color:C.text,fontFamily:"'Space Mono'"}}>{d.views}</p>
                <p style={{fontSize:10,color:C.green}}>Best: {d.topRate}%</p>
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
                <p style={{fontSize:11,fontWeight:700,color:C.text,fontFamily:"'Space Mono'"}}>{m.v}</p>
                <p style={{fontSize:10,color:C.textMuted,fontWeight:600}}>{m.l}</p>
              </div>
            ))}
          </div>

          {/* Engagement Rate Bar */}
          <div className="flex items-center gap-2" style={{padding:'0 14px 12px'}}>
            <span style={{fontSize:10,color:C.textMuted,fontWeight:600}}>Engagement</span>
            <div className="flex-1"><ProgressBar progress={post.rate/25} color={post.rate>15?C.green:post.rate>10?C.orange:C.textSec} height={4}/></div>
            <span style={{fontSize:11,fontWeight:700,color:post.rate>15?C.green:post.rate>10?C.orange:C.text,fontFamily:"'Space Mono'"}}>{post.rate}%</span>
          </div>

          {/* Mission Link + Status + XP */}
          {post.missionTitle&&(
            <div className="flex items-center gap-2" style={{padding:'8px 14px',borderTop:`1px solid ${C.border}`,background:C.surfaceLight}}>
              <MI name="flag" size={12} style={{color:C.primary}}/>
              <p style={{fontSize:10,color:C.textSec,flex:1}}>Misi: <span style={{color:C.primary,fontWeight:600}}>{post.missionTitle}</span></p>
              <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:4,
                background:post.status==='SELESAI'?C.greenLight:C.orangeLight,
                color:post.status==='SELESAI'?C.green:C.orange,
              }}>{post.status==='SELESAI'?'Selesai':'Direview'}</span>
              {post.status==='SELESAI'&&post.xpEarned>0&&(
                <span style={{fontSize:10,fontWeight:800,color:C.gold,background:C.goldLight,borderRadius:6,padding:'2px 8px',fontFamily:"'Space Mono'",border:'1px solid rgba(249,115,22,0.2)'}}>+{post.xpEarned} XP</span>
              )}
              {post.status==='REVIEW'&&(
                <span style={{fontSize:10,color:C.textMuted,fontStyle:'italic'}}>Menunggu</span>
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
      /* ── Merchandise TNI AD ── */
      {id:1,cat:'apparel',name:'Kaos TNI AD Tactical',desc:'Kaos cotton combed 30s, desain patch TNI AD resmi',cost:1500,icon:'checkroom',color:C.primary,stock:25,popular:true},
      {id:2,cat:'apparel',name:'Jaket Parka TNI AD',desc:'Jaket parka waterproof, patch emblem TNI AD di lengan',cost:4500,icon:'checkroom',color:'#2D5016',stock:8,popular:true},
      {id:3,cat:'apparel',name:'Topi Tactical TNI AD',desc:'Topi tactical velcro patch, logo TNI AD',cost:800,icon:'styler',color:C.primary,stock:30},
      {id:4,cat:'apparel',name:'Lanyard ID Card DISPENAD',desc:'Lanyard military-style TNI AD dengan badge holder',cost:300,icon:'badge',color:C.teal,stock:50},
      /* ── Aksesoris & Koleksi ── */
      {id:5,cat:'koleksi',name:'Mug Keramik TNI AD',desc:'Mug keramik 350ml, desain insignia pangkat TNI AD',cost:600,icon:'coffee',color:C.gold,stock:40,popular:true},
      {id:6,cat:'koleksi',name:'Tumbler Stainless TNI AD',desc:'Tumbler 500ml vacuum insulated, logo TNI AD engraved',cost:1200,icon:'water_drop',color:'#2D5016',stock:15},
      {id:7,cat:'koleksi',name:'Kalender Meja TNI AD 2026',desc:'Kalender premium foto kegiatan TNI AD & quotes prajurit',cost:500,icon:'calendar_month',color:C.primary,stock:35},
      {id:8,cat:'koleksi',name:'Sticker Pack Emblem TNI AD',desc:'20 stiker vinyl tahan air, desain pangkat & lencana TNI AD',cost:200,icon:'auto_awesome',color:C.purple,stock:100},
      {id:9,cat:'koleksi',name:'Pin Enamel Insignia TNI AD',desc:'Pin enamel premium koleksi insignia TNI AD',cost:400,icon:'military_tech',color:C.gold,stock:20},
      /* ── Sponsor & Voucher ── */
      {id:10,cat:'sponsor',name:'Voucher BRI Rp50K',desc:'Voucher belanja dari Bank BRI untuk anggota aktif',cost:1000,icon:'account_balance',color:'#003399',stock:20,popular:true,sponsor:'Bank BRI'},
      {id:11,cat:'sponsor',name:'Voucher Mandiri Rp100K',desc:'e-Voucher Bank Mandiri, berlaku di merchant pilihan',cost:1800,icon:'account_balance',color:'#003366',stock:10,sponsor:'Bank Mandiri'},
      {id:12,cat:'sponsor',name:'Paket Data Telkomsel 10GB',desc:'Kuota internet 10GB 30 hari, sponsor Telkomsel',cost:800,icon:'wifi',color:C.red,stock:30,sponsor:'Telkomsel'},
      {id:13,cat:'sponsor',name:'GoPay Rp50K',desc:'Saldo GoPay dari sponsor GoTo Group',cost:1000,icon:'account_balance_wallet',color:C.green,stock:25,sponsor:'GoTo'},
      /* ── Eksklusif ── */
      {id:14,cat:'eksklusif',name:'Sertifikat Anggota Aktif',desc:'Sertifikat digital + cetak dengan QR verifikasi',cost:3000,icon:'workspace_premium',color:C.gold,stock:5},
      {id:15,cat:'eksklusif',name:'Undangan HUT TNI AD Gala',desc:'Akses VIP ke acara peringatan HUT TNI AD',cost:8000,icon:'celebration',color:C.purple,stock:3},
      {id:16,cat:'eksklusif',name:'Mentorship Perwira TNI AD',desc:'Sesi mentoring 1 jam dengan perwira TNI AD',cost:5000,icon:'school',color:C.primary,stock:5},
    ];
    const cats=[{id:'semua',label:'Semua'},{id:'apparel',label:'Apparel'},{id:'koleksi',label:'Koleksi'},{id:'sponsor',label:'Sponsor'},{id:'eksklusif',label:'Eksklusif'}];
    const filtered=shopTab==='semua'?rewardItems:rewardItems.filter(r=>r.cat===shopTab);

    return(<div key={k} className="flex flex-col gap-4 pb-4">
      {/* Header + Points Balance */}
      <div className="stagger-1">
        <h1 style={{fontSize:22,fontWeight:800,color:C.text,paddingTop:4,marginBottom:8}}>Toko Poin</h1>
        <div style={{background:'linear-gradient(135deg,rgba(249,115,22,0.15),rgba(249,115,22,0.08))',borderRadius:12,padding:'16px 14px',border:`1px solid rgba(249,115,22,0.2)`,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',right:-10,top:-10,opacity:0.06}}><MI name="stars" size={80} fill style={{color:C.gold}}/></div>
          <p style={{fontSize:10,fontWeight:700,color:C.textMuted,textTransform:'uppercase',letterSpacing:1,marginBottom:2}}>Poin Tersedia</p>
          <div className="flex items-end gap-2">
            <p style={{fontSize:32,fontWeight:900,color:C.gold,fontFamily:"'Space Mono'",lineHeight:1}}>{userPoints.toLocaleString()}</p>
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
              {item.popular&&!item.sponsor&&<span style={{position:'absolute',top:8,right:8,fontSize:10,fontWeight:700,color:C.orange,background:C.orangeLight,padding:'2px 6px',borderRadius:4}}>Populer</span>}
              {item.sponsor&&<span style={{position:'absolute',top:8,right:8,fontSize:9,fontWeight:700,color:C.white,background:'linear-gradient(135deg,#003399,#0055AA)',padding:'2px 7px',borderRadius:4,letterSpacing:0.3}}>{item.sponsor}</span>}
              <div style={{width:44,height:44,borderRadius:12,background:`${item.color}15`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px',border:`1px solid ${item.color}20`}}>
                <MI name={item.icon} size={22} style={{color:item.color}}/>
              </div>
              <p style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:2}}>{item.name}</p>
              <p style={{fontSize:10,color:C.textMuted,marginBottom:8,lineHeight:1.3}}>{item.desc}</p>
              <div className="flex items-center justify-center gap-1 mb-2">
                <MI name="stars" size={14} fill style={{color:C.gold}}/>
                <span style={{fontSize:15,fontWeight:800,color:C.gold,fontFamily:"'Space Mono'"}}>{item.cost.toLocaleString()}</span>
              </div>
              <p style={{fontSize:10,color:C.textMuted}}>Stok: {item.stock}</p>
            </div>
            <button onClick={()=>{
              if(!canAfford)return;
              if(confirmRedeem===item.id){showToast(`${item.name} berhasil ditukar!`);setConfirmRedeem(null)}
              else{setConfirmRedeem(item.id);setTimeout(()=>setConfirmRedeem(cr=>cr===item.id?null:cr),3000)}
            }} className={`btn-gold ${confirmRedeem===item.id?'confirm-bounce':''}`} style={{
              width:'100%',padding:'10px 0',border:'none',cursor:canAfford?'pointer':'not-allowed',borderRadius:0,
              background:confirmRedeem===item.id?C.green:canAfford?`linear-gradient(135deg,${C.primary},${C.primaryAccent})`:C.overlay15,
              color:confirmRedeem===item.id?'white':canAfford?C.bg:C.textMuted,fontSize:12,fontWeight:700,
              display:'flex',alignItems:'center',justifyContent:'center',gap:4,
            }}>
              {confirmRedeem===item.id&&<MI name="check_circle" size={14} style={{color:C.white}}/>}
              {confirmRedeem===item.id?'Konfirmasi?':canAfford?'Tukar Sekarang':'Poin Kurang'}
            </button>
          </Card>
        );})}
      </div>

      {/* Riwayat Penukaran */}
      <Card className="stagger-6">
        <h3 style={{fontSize:12,fontWeight:700,color:C.textMuted,letterSpacing:1,textTransform:'uppercase',marginBottom:10}}>Riwayat Penukaran</h3>
        {[
          {name:'Mug Keramik TNI AD',date:'1 Mar 2026',cost:600,status:'Berhasil'},
          {name:'Voucher BRI Rp50K',date:'22 Feb 2026',cost:1000,status:'Berhasil'},
          {name:'Sticker Pack Emblem',date:'10 Feb 2026',cost:200,status:'Berhasil'},
        ].map((h,i)=>(
          <div key={i} className="flex items-center gap-3" style={{padding:'8px 0',borderBottom:i<2?`1px solid ${C.border}`:'none'}}>
            <div style={{width:28,height:28,borderRadius:8,background:C.greenLight,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <MI name="check_circle" size={14} fill style={{color:C.green}}/>
            </div>
            <div className="flex-1">
              <p style={{fontSize:12,fontWeight:600,color:C.text}}>{h.name}</p>
              <p style={{fontSize:10,color:C.textMuted}}>{h.date}</p>
            </div>
            <span style={{fontSize:11,fontWeight:700,color:C.red,fontFamily:"'Space Mono'"}}>-{h.cost}</span>
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
    const [uploading,setUploading]=useState(false);
    const [joining,setJoining]=useState(false);
    const done=m.status==='SELESAI'||(jm&&jm.status==='SELESAI');

    const steps=isJoined?[
      {label:'Briefing',icon:'description',color:C.primary},
      {label:'Kit & Contoh',icon:'inventory_2',color:C.secondary},
      {label:'Upload',icon:'cloud_upload',color:C.accent},
      {label:'Review',icon:'verified',color:C.green},
    ]:[
      {label:'Briefing',icon:'description',color:C.primary},
      {label:'Kit & Contoh',icon:'inventory_2',color:C.secondary},
      {label:'Upload',icon:'cloud_upload',color:C.accent},
      {label:'Review',icon:'verified',color:C.green},
    ];

    const doAiCheck=()=>{setAiChecking(true);setTimeout(()=>{setAiChecking(false);setAiResult({pass:true,score:87,checks:[{label:'Format konten sesuai',pass:true},{label:'Hashtag terdeteksi',pass:true},{label:'Durasi memenuhi syarat',pass:true},{label:'Konten original (bukan duplikat)',pass:true},{label:'Tone & messaging sesuai brief',pass:false,note:'Minor: pertimbangkan tambah CTA'}]});},2000)};


    return(<div key={k} className="flex flex-col gap-4" style={{paddingBottom:0,minHeight:'100%'}}>
      {/* Back */}
      <button onClick={()=>nav('misi')} className="stagger-1 back-btn" style={{color:C.textSec,fontSize:13,fontWeight:600,background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:4,paddingTop:4}}>
        <MI name="arrow_back" size={18} style={{color:'inherit'}}/> Kembali
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
          <span style={{background:C.goldLight,color:C.gold,borderRadius:8,padding:'4px 12px',fontSize:13,fontWeight:800,fontFamily:"'Space Mono'",border:'1px solid rgba(249,115,22,0.2)'}}>+{m.xp} XP</span>
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
              <p style={{fontSize:10,color:C.textMuted,marginTop:1}}>Bergabung: {jm.joinedAt}{jm.submittedAt?` · Submit: ${jm.submittedAt}`:''}</p>
            </div>
          </div>
        )}
      </div>

      {/* Step Indicator */}
      {!done&&(
        <div className="stagger-2 flex items-center gap-1" style={{padding:'4px 0'}}>
          {steps.map((s,i)=>(
            <div key={i} className="flex items-center" style={{flex:i<steps.length-1?1:'none'}}>
              <button onClick={()=>{if(!isJoined&&i>0)return;setStep(i)}} style={{
                width:34,height:34,borderRadius:12,cursor:(!isJoined&&i>0)?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
                background:i===step?s.color:i<step?C.green:C.surface,
                border:i>step?`1px solid ${C.border}`:'none',transition:'all 200ms',
                opacity:(!isJoined&&i>0)?0.4:1,
              }}>
                {i<step?<MI name="check" size={16} style={{color:C.white}}/>:
                  <MI name={s.icon} size={16} style={{color:i===step?'white':C.textMuted}}/>}
              </button>
              {i<steps.length-1&&<div style={{flex:1,height:2,background:i<step?C.green:C.border,margin:'0 4px',borderRadius:2}}/>}
            </div>
          ))}
        </div>
      )}
      {!done&&<p style={{fontSize:12,fontWeight:700,color:steps[step].color,textAlign:'center',marginTop:-4}}>Step {step+1}: {steps[step].label}</p>}

      {/* ══════════ STEP 0: BRIEFING ══════════ */}
      {step===0&&(<div key="step0" className="step-enter flex flex-col gap-4">
        <Card className="stagger-3">
          <h3 className="flex items-center gap-1" style={{fontSize:12,fontWeight:700,color:C.textMuted,letterSpacing:1.5,textTransform:'uppercase',marginBottom:6}}>Briefing Misi <Tip text="Baca brief dengan teliti. Konten harus sesuai semua spesifikasi untuk lolos review."><MI name="info" size={11} style={{color:C.textMuted,cursor:'pointer'}}/></Tip></h3>
          <p style={{fontSize:13,color:C.textSec,lineHeight:1.6,marginBottom:12}}>{m.desc}</p>

          {/* Content Spec */}
          {m.contentSpec&&(
            <div style={{background:C.surfaceLight,borderRadius:12,padding:14,border:`1px solid ${C.border}`}}>
              <p style={{fontSize:10,fontWeight:700,color:C.primary,letterSpacing:1,textTransform:'uppercase',marginBottom:10}}>Spesifikasi Konten</p>
              <div className="grid grid-cols-2 gap-3">
                <div><p style={{fontSize:10,color:C.textMuted,fontWeight:600}}>FORMAT</p><p style={{fontSize:13,fontWeight:700,color:C.text}}>{m.contentSpec.format}</p></div>
                <div><p style={{fontSize:10,color:C.textMuted,fontWeight:600}}>TIPE</p><p style={{fontSize:13,fontWeight:700,color:C.text}}>{m.contentSpec.type}</p></div>
                {m.contentSpec.videoDuration&&<div><p style={{fontSize:10,color:C.textMuted,fontWeight:600}}>DURASI VIDEO</p><p style={{fontSize:13,fontWeight:700,color:C.text}}>{m.contentSpec.videoDuration}</p></div>}
                {m.contentSpec.aspectRatio&&<div><p style={{fontSize:10,color:C.textMuted,fontWeight:600}}>ASPECT RATIO</p><p style={{fontSize:13,fontWeight:700,color:C.text}}>{m.contentSpec.aspectRatio}</p></div>}
                {m.contentSpec.minPhotos&&<div><p style={{fontSize:10,color:C.textMuted,fontWeight:600}}>MIN FOTO</p><p style={{fontSize:13,fontWeight:700,color:C.text}}>{m.contentSpec.minPhotos} foto</p></div>}
                {m.contentSpec.minGroups&&<div><p style={{fontSize:10,color:C.textMuted,fontWeight:600}}>MIN GRUP</p><p style={{fontSize:13,fontWeight:700,color:C.text}}>{m.contentSpec.minGroups} grup</p></div>}
                {m.contentSpec.minTweets&&<div><p style={{fontSize:10,color:C.textMuted,fontWeight:600}}>MIN TWEET</p><p style={{fontSize:13,fontWeight:700,color:C.text}}>{m.contentSpec.minTweets} tweet</p></div>}
                {m.contentSpec.minPosts&&<div><p style={{fontSize:10,color:C.textMuted,fontWeight:600}}>MIN POST</p><p style={{fontSize:13,fontWeight:700,color:C.text}}>{m.contentSpec.minPosts} post</p></div>}
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

        {/* EVENT Location & Details */}
        {m.eventSpec&&(
          <Card className="stagger-4" style={{borderLeft:`3px solid ${C.purple}`}}>
            <div className="flex items-center gap-2 mb-2">
              <MI name="event" size={18} fill style={{color:C.purple}}/>
              <h3 style={{fontSize:13,fontWeight:700,color:C.text}}>Detail Event</h3>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <MI name="location_on" size={14} style={{color:C.purple,marginTop:1,flexShrink:0}}/>
                <div><p style={{fontSize:12,fontWeight:600,color:C.text}}>{m.eventSpec.location}</p>
                {m.eventSpec.note&&<p style={{fontSize:10,color:C.textMuted}}>{m.eventSpec.note}</p>}</div>
              </div>
              <div className="flex items-center gap-2">
                <MI name="schedule" size={14} style={{color:C.purple,flexShrink:0}}/>
                <p style={{fontSize:12,color:C.textSec}}>{m.eventSpec.date}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <MI name="groups" size={14} style={{color:C.purple}}/>
                  <span style={{fontSize:11,color:C.textSec}}>Kapasitas: {m.eventSpec.capacity}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MI name="qr_code" size={14} style={{color:C.purple}}/>
                  <span style={{fontSize:11,color:C.textSec}}>Check-in: {m.eventSpec.checkin}</span>
                </div>
              </div>
            </div>
            {m.eventSpec.lat&&(
              <div style={{width:'100%',height:100,borderRadius:8,overflow:'hidden',marginTop:10,position:'relative',border:`1px solid ${C.border}`,background:C.bg}}>
                <div style={{position:'absolute',inset:0,opacity:0.08,backgroundImage:`linear-gradient(${C.border} 1px, transparent 1px), linear-gradient(90deg, ${C.border} 1px, transparent 1px)`,backgroundSize:'28px 28px'}}/>
                <div style={{position:'absolute',top:'45%',left:'50%',transform:'translate(-50%,-100%)'}}>
                  <div style={{width:28,height:28,borderRadius:'50% 50% 50% 0',background:C.purple,transform:'rotate(-45deg)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 6px rgba(0,0,0,0.1)'}}>
                    <MI name="location_on" size={14} fill style={{color:C.white,transform:'rotate(45deg)'}}/>
                  </div>
                </div>
                <div style={{position:'absolute',bottom:4,left:4,background:C.surface,borderRadius:4,padding:'2px 6px',fontSize:10,color:C.textSec,fontFamily:"'Space Mono'",border:`1px solid ${C.border}`}}>
                  {m.eventSpec.lat.toFixed(4)}, {m.eventSpec.lng.toFixed(4)}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* KONTEN Specs */}
        {m.kontenSpec&&(
          <Card className="stagger-4" style={{borderLeft:`3px solid ${C.primary}`}}>
            <div className="flex items-center gap-2 mb-2">
              <MI name="videocam" size={18} fill style={{color:C.primary}}/>
              <h3 style={{fontSize:13,fontWeight:700,color:C.text}}>Panduan Konten</h3>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              <span style={{fontSize:11,fontWeight:600,color:C.primary,background:C.primaryLight,borderRadius:6,padding:'3px 8px'}}>{m.kontenSpec.format}</span>
              {m.kontenSpec.duration&&<span style={{fontSize:11,color:C.textSec,background:C.surfaceLight,borderRadius:6,padding:'3px 8px'}}>{m.kontenSpec.duration}</span>}
            </div>
            {m.kontenSpec.guidelines&&m.kontenSpec.guidelines.map((g,gi)=>(
              <div key={gi} className="flex items-start gap-1.5" style={{marginBottom:2}}>
                <MI name="check_circle" size={12} style={{color:C.primary,marginTop:1,flexShrink:0}}/>
                <span style={{fontSize:11,color:C.textSec,lineHeight:1.3}}>{g}</span>
              </div>
            ))}
            {m.kontenSpec.hashtags&&(
              <div className="flex flex-wrap gap-1 mt-2">
                {m.kontenSpec.hashtags.map((h,hi)=>(
                  <span key={hi} style={{fontSize:10,fontWeight:700,color:C.primary,fontFamily:"'Space Mono'"}}>{h}</span>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* ENGAGEMENT Specs */}
        {m.engagementSpec&&(
          <Card className="stagger-4" style={{borderLeft:`3px solid ${C.orange}`}}>
            <div className="flex items-center gap-2 mb-2">
              <MI name="thumb_up" size={18} fill style={{color:C.orange}}/>
              <h3 style={{fontSize:13,fontWeight:700,color:C.text}}>Aksi yang Dibutuhkan</h3>
            </div>
            {m.engagementSpec.actions.map((a,ai)=>(
              <div key={ai} className="flex items-center gap-2" style={{padding:'6px 0',borderBottom:ai<m.engagementSpec.actions.length-1?`1px solid ${C.borderLight}`:'none'}}>
                <div style={{width:24,height:24,borderRadius:6,background:C.orangeLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:C.orange}}>{ai+1}</div>
                <span style={{fontSize:12,color:C.text}}>{a}</span>
              </div>
            ))}
            {m.engagementSpec.note&&<p style={{fontSize:10,color:C.textMuted,marginTop:6}}>{m.engagementSpec.note}</p>}
          </Card>
        )}

        {/* EDUKASI Specs */}
        {m.edukasiSpec&&(
          <Card className="stagger-4" style={{borderLeft:`3px solid ${C.secondary}`}}>
            <div className="flex items-center gap-2 mb-2">
              <MI name="school" size={18} fill style={{color:C.secondary}}/>
              <h3 style={{fontSize:13,fontWeight:700,color:C.text}}>Panduan Distribusi</h3>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              <span style={{fontSize:11,fontWeight:600,color:C.secondary,background:C.secondaryLight,borderRadius:6,padding:'3px 8px'}}>{m.edukasiSpec.material}</span>
            </div>
            <div className="flex items-center gap-4 mb-2">
              <div className="flex items-center gap-1.5">
                <MI name="groups" size={14} style={{color:C.secondary}}/>
                <span style={{fontSize:11,color:C.textSec}}>Min {m.edukasiSpec.minGroups} grup</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MI name="person" size={14} style={{color:C.secondary}}/>
                <span style={{fontSize:11,color:C.textSec}}>Min {m.edukasiSpec.minGroupSize} anggota/grup</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {m.edukasiSpec.channels.map((ch,ci)=>(
                <span key={ci} style={{fontSize:10,fontWeight:600,color:C.text,background:C.surfaceLight,borderRadius:4,padding:'2px 8px',border:`1px solid ${C.border}`}}>{ch}</span>
              ))}
            </div>
          </Card>
        )}

        {/* AKSI Specs */}
        {m.aksiSpec&&(
          <Card className="stagger-4" style={{borderLeft:`3px solid ${C.accent}`}}>
            <div className="flex items-center gap-2 mb-2">
              <MI name="front_hand" size={18} fill style={{color:C.accent}}/>
              <h3 style={{fontSize:13,fontWeight:700,color:C.text}}>Detail Aksi</h3>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              <span style={{fontSize:11,fontWeight:600,color:C.accent,background:C.accentLight,borderRadius:6,padding:'3px 8px'}}>{m.aksiSpec.actionType}</span>
              <span style={{fontSize:11,color:C.textSec,background:C.surfaceLight,borderRadius:6,padding:'3px 8px'}}>{m.aksiSpec.method}</span>
            </div>
            <div className="flex items-center gap-4 mb-2">
              <div className="flex items-center gap-1.5">
                <MI name="flag" size={14} style={{color:C.accent}}/>
                <span style={{fontSize:11,fontWeight:700,color:C.text,fontFamily:"'Space Mono'"}}>Target: {m.aksiSpec.target.toLocaleString()} {m.aksiSpec.unit}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MI name="map" size={14} style={{color:C.accent}}/>
                <span style={{fontSize:11,color:C.textSec}}>{m.aksiSpec.area}</span>
              </div>
            </div>
            {m.aksiSpec.note&&<p style={{fontSize:10,color:C.textMuted}}>{m.aksiSpec.note}</p>}
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
              <p style={{fontSize:11,fontWeight:600,color:C.orange}}>{m.type==='AKSI'?'Bold & Urgent':m.type==='EDUKASI'?'Clean & Professional':m.type==='EVENT'?'Energik & Inklusif':'Warm & Engaging'}</p>
            </div>
            <div style={{flex:1,background:C.surfaceLight,borderRadius:8,padding:10,border:`1px solid ${C.border}`,textAlign:'center'}}>
              <MI name="record_voice_over" size={18} fill style={{color:C.primary}}/>
              <p style={{fontSize:10,fontWeight:700,color:C.text,marginTop:2}}>Gaya Bahasa</p>
              <p style={{fontSize:11,fontWeight:600,color:C.primary}}>{m.type==='AKSI'?'Persuasif':m.type==='EDUKASI'?'Storytelling':m.type==='EVENT'?'Ajakan Hangat':'Kasual'}</p>
            </div>
          </div>

          {/* Hashtags */}
          {m.hashtags&&(
            <div style={{background:C.primaryLight,borderRadius:8,padding:10,border:'1px solid rgba(249,115,22,0.15)',marginBottom:10}}>
              <div className="flex items-center gap-2 mb-1">
                <MI name="tag" size={14} fill style={{color:C.primary}}/>
                <span style={{fontSize:10,fontWeight:700,color:C.primary,textTransform:'uppercase',letterSpacing:0.5}}>Hashtag Wajib</span>
              </div>
              <p style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:"'Space Mono'",lineHeight:1.6}}>{m.hashtags}</p>
            </div>
          )}

          {/* Do's and Don'ts */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
            <div style={{background:`${C.green}08`,borderRadius:8,padding:10,border:`1px solid ${C.green}15`}}>
              <p style={{fontSize:10,fontWeight:700,color:C.green,marginBottom:4}}>LAKUKAN</p>
              {(m.type==='AKSI'?['Sertakan link/form resmi','Jelaskan dampak nyata','Ajak partisipasi aktif']:m.type==='EVENT'?['Datang tepat waktu','Dokumentasi lengkap','Patuhi aturan lokasi']:m.type==='EDUKASI'?['Pakai infografis','Bahasa mudah dipahami','Sertakan contoh nyata']:m.type==='ENGAGEMENT'?['Komentar relevan & positif','Share ke audiens yang tepat','Ikuti panduan engagement']:['Konten original','Visual menarik','Ajak interaksi']).map((d,di)=>(
                <div key={di} className="flex items-start gap-1.5" style={{marginBottom:2}}>
                  <MI name="check" size={10} style={{color:C.green,marginTop:2,flexShrink:0}}/>
                  <span style={{fontSize:10,color:C.textSec,lineHeight:1.3}}>{d}</span>
                </div>
              ))}
            </div>
            <div style={{background:`${C.red}08`,borderRadius:8,padding:10,border:`1px solid ${C.red}15`}}>
              <p style={{fontSize:10,fontWeight:700,color:C.red,marginBottom:4}}>HINDARI</p>
              {(m.type==='AKSI'?['Info belum terverifikasi','Spam link berlebihan','Bahasa provokatif']:m.type==='EVENT'?['Datang terlambat','Buat konten tanpa izin','Ganggu acara']:m.type==='EDUKASI'?['Clickbait / misleading','Teks terlalu panjang','Info tanpa sumber']:m.type==='ENGAGEMENT'?['Komentar spam/copy-paste','Bot-like behavior','Engagement palsu']:['Repost tanpa credit','Konten sensitif','Spam / repetitif']).map((d,di)=>(
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
              {(m.type==='EVENT'?
                ['Yuk ramaikan acara ini bareng!','Datang dan jadi bagian dari perubahan','Jangan lewatkan momen bersejarah ini']:
                m.type==='AKSI'?
                ['Suara kamu penting! Dukung gerakan ini','Satu langkah kecil, dampak besar','Mari bertindak sekarang']:
                m.type==='EDUKASI'?
                ['Tau nggak sih? Ternyata...','5 hal yang jarang orang tau','Informasi penting yang harus kamu tau']:
                ['Hai guys! Yuk ikutan','Challenge baru nih! Siapa berani?','Konten seru yang wajib kamu coba']
              ).map((hook,hi)=>(
                <div key={hi} style={{padding:'6px 10px',background:C.bg,borderRadius:6,border:`1px solid ${C.borderLight}`,fontSize:11,color:C.textSec,fontStyle:'italic',lineHeight:1.3}}>{hook}</div>
              ))}
            </div>
            <p style={{fontSize:10,color:C.textMuted,marginTop:4}}>Kamu boleh modifikasi, ini hanya contoh inspirasi</p>
          </div>

          {/* CTA */}
          <div style={{marginBottom:10}}>
            <div className="flex items-center gap-1.5 mb-2">
              <MI name="ads_click" size={14} fill style={{color:C.orange}}/>
              <span style={{fontSize:10,fontWeight:700,color:C.orange,textTransform:'uppercase',letterSpacing:0.5}}>Call to Action</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(m.type==='EVENT'?['Hadir & dokumentasi','Ajak teman ikut','Share momen di grup']:m.type==='AKSI'?['Tanda tangani petisi','Share ke 10 kontak','Rekrut 3 relawan']:['Like & share','Tag 3 temanmu','Comment pendapatmu']).map((cta,ci)=>(
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
                <div key={si} style={{flex:1,textAlign:'center',padding:6,borderRadius:6,background:si===2?C.primaryLight:C.bg,border:`1px solid ${si===2?C.primaryMid:C.borderLight}`}}>
                  <p style={{fontSize:12,fontWeight:800,color:si===2?C.primary:C.text,fontFamily:"'Space Mono'"}}>{slot.pct}%</p>
                  <p style={{fontSize:10,fontWeight:600,color:si===2?C.primary:C.textMuted}}>{slot.time}</p>
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
          <div style={{background:C.surfaceLight,borderRadius:12,padding:14,border:`1px solid ${C.border}`,marginBottom:8}}>
            <p style={{fontSize:13,color:C.text,lineHeight:1.6,fontStyle:'italic'}}>
              {m.type==='EVENT'?`"Hadir di ${m.title}! Bangga bisa menyaksikan langsung dedikasi prajurit TNI AD.\n\nYuk ramaikan dan tunjukkan dukungan!\n\n#TNIAD #DISPENAD #TNIADUntukRakyat"`:
               m.type==='AKSI'?`"Mari bergabung dalam ${m.title}! Setiap aksi kecil mendukung TNI AD kita.\n\nIkut kontribusi sekarang!\n\n#TNIAD #DukungTNIAD #DISPENAD"`:
               m.type==='EDUKASI'?`"Tau nggak sih? ${m.title} — ini ternyata lebih penting dari yang kita kira!\n\nFakta penting yang perlu kamu tau...\n\nShare ke teman biar makin banyak yang paham!\n\n#TNIAD #DISPENAD #WawasanKebangsaan"`:
               `"Yuk ikutan ${m.title}!\n\nIni cara gue dukung TNI AD... [ceritakan pengalamanmu]\n\nSiapa yang udah ikutan? Tag 3 temanmu!\n\n#TNIAD #BanggaTNIAD #DISPENAD"`}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>{const cap=m.type==='EVENT'?`Hadir di ${m.title}! Bangga dukung TNI AD!\n\n#TNIAD #DISPENAD #TNIADUntukRakyat`:m.type==='AKSI'?`Mari bergabung dalam ${m.title}! Dukung TNI AD kita.\n\n#TNIAD #DukungTNIAD #DISPENAD`:m.type==='EDUKASI'?`${m.title} — informasi penting yang perlu kamu tau!\n\n#TNIAD #DISPENAD #WawasanKebangsaan`:`Yuk ikutan ${m.title}! Tag 3 temanmu!\n\n#TNIAD #BanggaTNIAD #DISPENAD`;copyText(cap)}} className="btn-primary" style={{flex:1,padding:'8px 0',borderRadius:8,border:'none',background:C.teal,color:C.white,fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
              <MI name="content_copy" size={14} style={{color:C.white}}/> Salin Caption
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
          <div style={{background:C.surfaceLight,borderRadius:12,padding:12,border:`1px solid ${C.border}`,marginBottom:10}}>
            <div className="flex items-center justify-between mb-2">
              <span style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:'uppercase',letterSpacing:1}}>Poin Dasar</span>
              <span style={{fontSize:16,fontWeight:800,color:C.gold,fontFamily:"'Space Mono'"}}>{m.xp} XP</span>
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
          <div style={{background:`linear-gradient(135deg,${C.surface},${C.bg})`,borderRadius:12,padding:12,border:`1px solid ${C.border}`}}>
            <div className="flex flex-col gap-2">
              {[
                {views:'1K',bonus:'+25 XP',icon:'local_fire_department',color:C.orange,bg:C.orangeLight},
                {views:'10K',bonus:'+75 XP',icon:'whatshot',color:C.accent,bg:C.accentLight},
                {views:'100K',bonus:'+200 XP',icon:'bolt',color:C.red,bg:C.redLight},
                {views:'1M+',bonus:'+500 XP',icon:'diamond',color:C.purple,bg:C.purpleLight},
              ].map((t,i)=>(
                <div key={i} className="flex items-center gap-3" style={{padding:'6px 8px',borderRadius:8,background:t.bg,border:`1px solid ${t.color}20`}}>
                  <MI name={t.icon} size={16} fill style={{color:t.color}}/>
                  <span style={{fontSize:12,fontWeight:600,color:C.text,flex:1}}>{t.views} views</span>
                  <span style={{fontSize:12,fontWeight:800,color:t.color,fontFamily:"'Space Mono'"}}>{t.bonus}</span>
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
              <p style={{fontSize:14,fontWeight:800,color:C.teal,fontFamily:"'Space Mono'"}}>+{m.bonus||50} XP</p>
              <p style={{fontSize:10,color:C.textMuted,marginTop:2}}>10 orang pertama</p>
            </div>
            <div style={{background:C.purpleLight,borderRadius:8,padding:10,border:`1px solid ${C.purple}20`,textAlign:'center'}}>
              <MI name="military_tech" size={18} fill style={{color:C.purple}}/>
              <p style={{fontSize:11,fontWeight:700,color:C.purple,marginTop:2}}>Streak Bonus</p>
              <p style={{fontSize:14,fontWeight:800,color:C.purple,fontFamily:"'Space Mono'"}}>+2x Multi</p>
              <p style={{fontSize:10,color:C.textMuted,marginTop:2}}>3 misi berturut-turut</p>
            </div>
          </div>

          {/* Bonus Kategori per Tipe Misi */}
          <p style={{fontSize:10,fontWeight:700,color:C.gold,letterSpacing:1,textTransform:'uppercase',marginTop:12,marginBottom:8}}>Bonus Kategori — {m.type}</p>
          <div className="flex flex-col gap-2">
            {typeBonuses(m.type).map((b,bi)=>(
              <div key={bi} className="flex items-center gap-3" style={{padding:'8px 10px',borderRadius:10,background:`${b.color}10`,border:`1px solid ${b.color}18`}}>
                <div style={{width:30,height:30,borderRadius:8,background:`${b.color}18`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <MI name={b.icon} size={16} fill style={{color:b.color}}/>
                </div>
                <span style={{fontSize:12,fontWeight:600,color:C.text,flex:1}}>{b.label}</span>
                <span style={{fontSize:12,fontWeight:800,color:b.color,fontFamily:"'Space Mono'"}}>+{b.xp} XP</span>
              </div>
            ))}
          </div>
          <p style={{fontSize:10,color:C.textMuted,marginTop:6,textAlign:'center'}}>Bonus diberikan otomatis setelah review admin</p>
        </Card>

        {/* Consent + Next */}
        <div className="stagger-5">
          <label onClick={()=>setConsent(!consent)} className="flex items-start gap-3 tap-bounce" style={{cursor:'pointer',marginBottom:12,padding:'10px 12px',borderRadius:12,background:consent?C.primaryLight:'transparent',border:`1px solid ${consent?C.primaryMid:C.border}`,transition:'all 200ms'}}>
            <div style={{
              width:22,height:22,borderRadius:6,marginTop:1,flexShrink:0,
              background:consent?C.primary:'transparent',border:consent?'none':`2px solid ${C.border}`,
              display:'flex',alignItems:'center',justifyContent:'center',transition:'all 150ms',
              boxShadow:consent?'0 0 8px rgba(249,115,22,0.3)':'none',
            }}>{consent&&<MI name="check" size={14} style={{color:C.white}}/>}</div>
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
                  <div style={{width:56,height:56,borderRadius:12,background:C.surfaceLight,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${C.border}`,flexShrink:0}}>
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
              const pc={instagram:'#E1306C',tiktok:'#1A1A1A',x:'#1DA1F2',facebook:'#1877F2'}[post.platform]||C.text;
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
          <button className="stagger-6" style={{width:'100%',padding:'12px 0',borderRadius:12,border:'none',background:C.primary,color:C.bg,fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
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
            <div onClick={()=>{if(uploading)return;setUploading(true);setTimeout(()=>{setUploading(false);setUploaded(true);showToast('Upload berhasil!');},1200);}} style={{border:`2px dashed ${uploading?C.primary:C.border}`,borderRadius:12,padding:'24px 12px',textAlign:'center',cursor:uploading?'wait':'pointer',background:C.bg,transition:'border-color 200ms'}}>
              {uploading?(
                <>
                  <MI name="pending" size={32} style={{color:C.primary,animation:'spin 1s linear infinite'}}/>
                  <p style={{fontSize:14,fontWeight:700,color:C.text,marginTop:8}}>Mengupload...</p>
                  <div style={{marginTop:8,height:4,borderRadius:2,background:C.overlay08,overflow:'hidden',maxWidth:200,margin:'8px auto 0'}}>
                    <div style={{height:'100%',borderRadius:2,background:`linear-gradient(90deg,${C.primary},${C.primaryAccent})`,animation:'xpFill 1.2s cubic-bezier(.16,1,.3,1) both',width:'100%'}}/>
                  </div>
                </>
              ):(
                <>
                  <MI name="cloud_upload" size={32} style={{color:C.primary}}/>
                  <p style={{fontSize:14,fontWeight:700,color:C.text,marginTop:8}}>Upload Foto / Video</p>
                  <p style={{fontSize:12,color:C.textMuted,marginTop:2}}>Tap untuk pilih file</p>
                </>
              )}
              {m.contentSpec&&(
                <div className="flex gap-2 justify-center mt-3">
                  <span style={{background:C.primaryLight,color:C.primary,borderRadius:6,padding:'3px 10px',fontSize:11,fontWeight:600}}>{m.contentSpec.format}</span>
                  {m.contentSpec.videoDuration&&<span style={{background:C.purpleLight,color:C.purple,borderRadius:6,padding:'3px 10px',fontSize:11,fontWeight:600}}>{m.contentSpec.videoDuration}</span>}
                </div>
              )}
            </div>
          ):(
            <div style={{borderRadius:12,overflow:'hidden',position:'relative',border:`1px solid ${C.green}40`,background:C.greenLight}}>
              <div style={{width:'100%',height:120,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{textAlign:'center'}}>
                  <MI name="check_circle" size={32} fill style={{color:C.green}}/>
                  <p style={{fontSize:12,fontWeight:700,color:C.green,marginTop:4}}>File berhasil diupload</p>
                  <p style={{fontSize:10,color:C.textSec}}>konten_misi_{m.id}.mp4</p>
                </div>
              </div>
              {m.eventSpec?.location&&m.eventSpec?.lat&&(
                <div style={{position:'absolute',bottom:6,left:6,background:C.surface,borderRadius:4,padding:'2px 8px',fontSize:10,color:C.textSec,fontFamily:"'Space Mono'",display:'flex',alignItems:'center',gap:3,border:`1px solid ${C.border}`}}>
                  <MI name="location_on" size={10} fill style={{color:C.pink}}/>{m.eventSpec?.lat.toFixed(4)}, {m.eventSpec?.lng.toFixed(4)}
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
        {m.eventSpec?.location&&(
          <Card className="stagger-5" style={{borderLeft:`3px solid ${C.pink}`}}>
            <div className="flex items-center gap-2 mb-2">
              <MI name="my_location" size={18} style={{color:C.pink}}/>
              <h3 style={{fontSize:13,fontWeight:700,color:C.text}}>Verifikasi Lokasi</h3>
              {uploaded&&<span style={{marginLeft:'auto',fontSize:10,fontWeight:700,color:C.green,background:C.greenLight,padding:'2px 6px',borderRadius:4}}>OK</span>}
            </div>
            {!uploaded?(
              <p style={{fontSize:12,color:C.textMuted}}>Upload foto/video dulu untuk verifikasi geolokasi otomatis</p>
            ):(
              <div style={{background:C.surfaceLight,borderRadius:8,padding:10,border:`1px solid ${C.border}`}}>
                <div className="flex items-center gap-2 mb-1">
                  <MI name="location_on" size={14} fill style={{color:C.pink}}/>
                  <span style={{fontSize:12,fontWeight:600,color:C.text}}>{m.eventSpec?.location}</span>
                </div>
                <p style={{fontSize:10,color:C.textMuted,fontFamily:"'Space Mono'"}}>Geo: {m.eventSpec?.lat?.toFixed(6)}, {m.eventSpec?.lng?.toFixed(6)}</p>
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
      {step===3&&(<div key="step3" className="step-enter flex flex-col gap-4" style={{position:'relative'}}>
        {/* Confetti celebration on AI pass */}
        {aiResult&&aiResult.pass&&(
          <div style={{position:'absolute',top:-40,left:'50%',transform:'translateX(-50%)',pointerEvents:'none',zIndex:30,fontSize:40,animation:'fadeInUp 400ms ease both',textAlign:'center'}}>
            🎉
          </div>
        )}
        {/* AI Quality Check */}
        <Card className="stagger-3" style={{borderLeft:`3px solid ${C.primary}`}}>
          <div className="flex items-center gap-2 mb-3">
            <MI name="smart_toy" size={20} style={{color:C.primary}}/>
            <h3 style={{fontSize:14,fontWeight:700,color:C.text}}>AI Quality Check</h3>
          </div>
          {!aiResult&&!aiChecking&&(
            <div style={{textAlign:'center',padding:'12px 0'}}>
              <p style={{fontSize:13,color:C.textSec,marginBottom:12}}>Submisi kamu akan dicek otomatis oleh AI sebelum dikirim ke admin untuk review final.</p>
              <button onClick={doAiCheck} style={{background:C.primary,border:'none',borderRadius:12,padding:'12px 28px',color:C.bg,fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,margin:'0 auto'}}>
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
              <div className="flex items-center gap-3 mb-4" style={{background:aiResult.pass?C.greenLight:C.orangeLight,borderRadius:12,padding:14}}>
                <div style={{width:48,height:48,borderRadius:12,background:aiResult.pass?C.green:C.orange,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <span style={{fontSize:18,fontWeight:900,color:C.white,fontFamily:"'Space Mono'"}}>{aiResult.score}</span>
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
            <div style={{background:C.orangeLight,borderRadius:12,padding:14,textAlign:'center'}}>
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
              <span style={{marginLeft:'auto',fontSize:10,fontWeight:700,color:C.green,background:C.greenLight,padding:'2px 6px',borderRadius:4}}>LIVE</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[{l:'Views',v:'1.2K'},{l:'Likes',v:'89'},{l:'Comments',v:'12'},{l:'Shares',v:'34'}].map((s,j)=>(
                <div key={j} style={{background:C.surfaceLight,borderRadius:6,padding:'6px 4px',textAlign:'center'}}>
                  <p style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:"'Space Mono'"}}>{s.v}</p>
                  <p style={{fontSize:10,color:C.textMuted,fontWeight:600}}>{s.l}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span style={{fontSize:10,color:C.textMuted,fontWeight:600}}>Rate</span>
              <div className="flex-1"><ProgressBar progress={0.42} color={C.green} height={4}/></div>
              <span style={{fontSize:11,fontWeight:700,color:C.green,fontFamily:"'Space Mono'"}}>8.4%</span>
            </div>
          </Card>
        )}
      </div>)}

      {/* ══════════ BOTTOM CTA ══════════ */}
      {(()=>{
        const hasLinkSection=!!(m.socialPlatform||m.targetPlatforms);
        const canSubmit=uploaded&&(hasLinkSection?linkVal.trim():true);
        return(
        <div style={{position:'sticky',bottom:-8,zIndex:20,background:`linear-gradient(to top, ${C.bg} 60%, transparent)`,padding:'20px 0 8px',marginTop:16}}>
          {done ? (
            <button
              onClick={()=>nav('misi')}
              className="tap-bounce"
              style={{width:'100%',padding:'14px 0',borderRadius:12,border:`1px solid ${C.border}`,
                background:C.surface,color:C.textSec,fontSize:15,fontWeight:700,cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              <MI name="arrow_back" size={20} style={{color:C.textSec}}/>
              Kembali ke Misi
            </button>
          ) : step===0&&isJoined&&!done ? (
            <button
              onClick={()=>setStep(1)}
              className="btn-gold tap-bounce"
              style={{width:'100%',padding:'14px 0',borderRadius:12,border:'none',
                background:`linear-gradient(135deg,${C.primary},${C.primaryAccent})`,color:C.bg,fontSize:15,fontWeight:700,cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                boxShadow:`0 4px 16px ${C.primaryGlow}`}}>
              <MI name="arrow_forward" size={20} style={{color:C.bg}}/>
              Lanjut ke Kit
            </button>
          ) : step===0&&!isJoined ? (
            <button
              disabled={!consent||joining}
              onClick={()=>{if(joining)return;setJoining(true);setTimeout(()=>{joinMission(m.id);setJoining(false);setStep(1);},500);}}
              className={consent&&!joining?'btn-gold tap-bounce':''}
              style={{width:'100%',padding:'14px 0',borderRadius:12,border:'none',
                background:consent?`linear-gradient(135deg,${C.primary},${C.primaryAccent})`:C.overlay06,
                color:consent?C.bg:C.textMuted,fontSize:15,fontWeight:700,cursor:consent&&!joining?'pointer':'not-allowed',
                display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                boxShadow:consent?`0 4px 16px ${C.primaryGlow}`:'none',
                transition:'all 250ms cubic-bezier(.16,1,.3,1)',opacity:consent?1:0.5}}>
              {joining?<MI name="pending" size={20} style={{color:C.bg,animation:'spin 1s linear infinite'}}/>:<MI name="how_to_reg" size={20} style={{color:consent?C.bg:C.textMuted}}/>}
              {joining?'Mendaftar...':'Ikut Misi'}
            </button>
          ) : step===1&&isJoined ? (
            <button
              onClick={()=>setStep(2)}
              className="btn-gold tap-bounce"
              style={{width:'100%',padding:'14px 0',borderRadius:12,border:'none',
                background:`linear-gradient(135deg,${C.primary},${C.primaryAccent})`,color:C.bg,fontSize:15,fontWeight:700,cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                boxShadow:`0 4px 16px ${C.primaryGlow}`}}>
              <MI name="cloud_upload" size={20} style={{color:C.bg}}/>
              Lanjut Upload
            </button>
          ) : step===2&&isJoined ? (
            <button
              disabled={!canSubmit}
              onClick={()=>{setAiResult(null);setStep(3);setJoinedMissions(p=>({...p,[m.id]:{...p[m.id],status:'SUBMITTED',submittedAt:'8 Mar 2026'}}));showToast('Bukti berhasil dikirim!')}}
              className={canSubmit?'btn-gold tap-bounce':''}
              style={{width:'100%',padding:'14px 0',borderRadius:12,border:'none',
                background:canSubmit?`linear-gradient(135deg,${C.primary},${C.primaryAccent})`:C.overlay06,
                color:canSubmit?C.bg:C.textMuted,fontSize:15,fontWeight:700,
                cursor:canSubmit?'pointer':'not-allowed',
                display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                boxShadow:canSubmit?`0 4px 16px ${C.primaryGlow}`:'none',
                opacity:canSubmit?1:0.5}}>
              <MI name="send" size={20} style={{color:canSubmit?C.bg:C.textMuted}}/>
              Kirim Bukti
            </button>
          ) : step===3 ? (
            <button
              onClick={()=>nav('misi')}
              className="tap-bounce"
              style={{width:'100%',padding:'14px 0',borderRadius:12,border:`1px solid ${C.border}`,
                background:C.surface,color:C.textSec,fontSize:15,fontWeight:700,cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              <MI name="arrow_back" size={20} style={{color:C.textSec}}/>
              Kembali ke Misi
            </button>
          ) : null}
        </div>);
      })()}

    </div>);}

  /* ─── DESKTOP ADMIN DASHBOARD ─────────────────────────────────────── */
  function DesktopAdmin(){
    const sideItems=[
      {id:'dashboard',label:'Dashboard',icon:'dashboard'},
      {id:'misi',label:'Manajemen Misi',icon:'assignment'},
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
      {agent:'Arif Santoso',mission:'Reels: Hari-Hari Prajurit TNI AD',platform:'instagram',time:'10 min lalu',aiScore:87,aiPass:true,briefMatch:92,briefChecks:[{l:'Format sesuai',ok:true},{l:'Durasi OK',ok:true},{l:'Hashtag ada',ok:true},{l:'CTA',ok:false}]},
      {agent:'Rina Dewi',mission:'Dukung Konten Resmi DISPENAD',platform:'x',time:'25 min lalu',aiScore:92,aiPass:true,briefMatch:96,briefChecks:[{l:'Format sesuai',ok:true},{l:'Sumber resmi',ok:true},{l:'Multi-platform',ok:true},{l:'Tone sesuai',ok:true}]},
      {agent:'Fajar Nugroho',mission:'Challenge #BanggaTNIAD',platform:'tiktok',time:'1 jam lalu',aiScore:64,aiPass:false,briefMatch:58,briefChecks:[{l:'Format sesuai',ok:true},{l:'Durasi OK',ok:false},{l:'Hashtag ada',ok:false},{l:'Original',ok:true}]},
      {agent:'Sari Utami',mission:'Wawasan Kebangsaan ke 5 Grup',platform:'whatsapp',time:'2 jam lalu',aiScore:95,aiPass:true,briefMatch:98,briefChecks:[{l:'Min 5 grup',ok:true},{l:'Min 20 anggota',ok:true},{l:'Pesan sesuai',ok:true},{l:'Lampiran ada',ok:true}]},
    ];

    const DCard=({children,style={},title,subtitle,action,accent,noPad})=>(
      <div className="card-interactive" style={{background:C.surface,borderRadius:16,border:`1px solid ${accent?`${accent}33`:C.border}`,overflow:'hidden',boxShadow:`0 4px 24px rgba(0,0,0,0.25)${accent?`, 0 0 0 1px ${accent}11`:''}`,position:'relative',...style}}>
        {accent&&<div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${accent},transparent)`,opacity:0.6}}/>}
        {(title||action)&&<div className="flex items-center justify-between" style={{padding:'16px 20px',borderBottom:`1px solid ${C.borderLight}`}}>
          <div>
            {title&&<h3 style={{fontSize:15,fontWeight:700,color:C.text,letterSpacing:-0.2}}>{title}</h3>}
            {subtitle&&<p style={{fontSize:12,color:C.textMuted,marginTop:2}}>{subtitle}</p>}
          </div>
          {action}
        </div>}
        <div style={{padding:noPad?0:20}}>{children}</div>
      </div>
    );

    return(
      <div style={{display:'flex',minHeight:'100vh',background:C.bg,position:'relative',overflow:'hidden'}}>
        {/* Background Orbs */}
        <div className="orb orb-1" style={{width:400,height:400,background:'radial-gradient(circle,rgba(249,115,22,0.08),transparent 70%)',top:-100,right:'20%'}}/>
        <div className="orb orb-2" style={{width:300,height:300,background:'radial-gradient(circle,rgba(249,115,22,0.06),transparent 70%)',bottom:100,left:'10%'}}/>

        {/* Sidebar */}
        <aside style={{width:260,background:'linear-gradient(180deg,rgba(15,15,26,0.95),rgba(11,17,32,0.98))',backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',borderRight:`1px solid ${C.border}`,padding:'24px 0',flexShrink:0,display:'flex',flexDirection:'column',zIndex:2}}>
          <div className="flex items-center gap-3 px-6 mb-8">
            <div style={{width:36,height:36,borderRadius:12,background:`linear-gradient(135deg,${C.primary},${C.primaryAccent})`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 20px rgba(249,115,22,0.3)'}}>
              <GerakMark size={20}/>
            </div>
            <div>
              <h1 className="shimmer-text" style={{fontSize:17,fontWeight:800,letterSpacing:1.5}}>GERAK</h1>
              <p style={{fontSize:10,color:C.textMuted,letterSpacing:2.5,textTransform:'uppercase',fontWeight:500}}>Command Center</p>
            </div>
          </div>
          <p style={{fontSize:10,fontWeight:700,color:C.textMuted,textTransform:'uppercase',letterSpacing:2,padding:'0 24px',marginBottom:8}}>Menu</p>
          <nav className="flex flex-col gap-1 px-3">
            {sideItems.map(s=>{
              const active=adSideTab===s.id;
              return(
              <button key={s.id} onClick={()=>{setAdSideTab(s.id);setAdSubTab(s.id==='dashboard'?'ringkasan':s.id==='misi'?'list':'');}} style={{
                display:'flex',alignItems:'center',gap:10,padding:'11px 14px',borderRadius:12,border:'none',cursor:'pointer',position:'relative',
                background:active?'linear-gradient(135deg,rgba(249,115,22,0.15),rgba(249,115,22,0.05))':'transparent',
                color:active?C.primary:C.textSec,
                fontSize:13,fontWeight:active?700:500,textAlign:'left',transition:'all 200ms',width:'100%',
              }}>
                {active&&<div style={{position:'absolute',left:0,top:'50%',transform:'translateY(-50%)',width:3,height:20,borderRadius:'0 3px 3px 0',background:C.primary,boxShadow:`0 0 8px ${C.primary}`}}/>}
                <MI name={s.icon} size={20} fill={active} style={{color:active?C.primary:C.textMuted}}/>{s.label}
                {s.id==='agents'&&<span style={{marginLeft:'auto',fontSize:10,fontWeight:700,color:C.textMuted,background:C.surfaceLight,padding:'2px 7px',borderRadius:6}}>1.2K</span>}
              </button>);
            })}
          </nav>
          <div style={{margin:'auto 16px 0',display:'flex',flexDirection:'column',gap:12}}>
            <div style={{padding:16,borderRadius:12,background:'linear-gradient(135deg,rgba(249,115,22,0.08),rgba(249,115,22,0.02))',border:`1px solid rgba(249,115,22,0.15)`}}>
              <div className="flex items-center gap-2 mb-2">
                <MI name="bolt" size={16} fill style={{color:C.gold}}/>
                <span style={{fontSize:11,fontWeight:700,color:C.gold}}>Sistem Aktif</span>
              </div>
              <p style={{fontSize:10,color:C.textMuted,lineHeight:1.4}}>Semua sistem aktif. {ADMIN_STATS.missionsActive} misi berjalan.</p>
            </div>
            <button onClick={()=>setMode('member')} className="btn-ghost" style={{width:'100%',padding:'11px 0',borderRadius:12,border:`1px solid ${C.border}`,background:'transparent',color:C.textSec,fontSize:12,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              <MI name="phone_iphone" size={16}/> Member View
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main style={{flex:1,overflow:'auto',padding:28,zIndex:1}}>
          {/* Top Bar */}
          <div className="flex items-center justify-between" style={{marginBottom:28,paddingBottom:20,borderBottom:`1px solid ${C.borderLight}`}}>
            <div>
              <div className="flex items-center gap-2" style={{marginBottom:4}}>
                {adSideTab==='missionDetail'&&<button onClick={()=>setAdSideTab('misi')} style={{background:'none',border:'none',cursor:'pointer',color:C.textMuted,fontSize:12,display:'flex',alignItems:'center',gap:2}}><MI name="arrow_back" size={14}/>Misi</button>}
                {adSideTab==='missionDetail'&&<span style={{color:C.textMuted,fontSize:12}}>/</span>}
              </div>
              <h1 style={{fontSize:26,fontWeight:800,color:C.text,letterSpacing:-0.5}}>{adSideTab==='missionDetail'?'Detail Misi':sideItems.find(s=>s.id===adSideTab)?.label}</h1>
              <p style={{fontSize:13,color:C.textMuted,marginTop:2}}>{new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div style={{position:'relative'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,padding:'9px 14px',borderRadius:12,background:C.surfaceLight,border:`1px solid ${C.border}`,width:200}}>
                  <MI name="search" size={16} style={{color:C.textMuted}}/>
                  <input placeholder="Cari..." style={{background:'transparent',border:'none',outline:'none',color:C.text,fontSize:12,width:'100%',fontFamily:'Inter'}}/>
                </div>
              </div>
              <div style={{width:1,height:28,background:C.border}}/>
              <div style={{position:'relative',cursor:'pointer'}}>
                <div style={{width:40,height:40,borderRadius:12,background:C.surfaceLight,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${C.border}`,backdropFilter:'blur(12px)',transition:'border-color 200ms'}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.primary} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                  <MI name="notifications" size={20} style={{color:C.text}}/>
                </div>
                <div className="dot-live" style={{position:'absolute',top:8,right:8,width:7,height:7,borderRadius:'50%',background:C.red,border:`2px solid ${C.bg}`}}/>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'6px 12px 6px 6px',borderRadius:12,background:C.surfaceLight,border:`1px solid ${C.border}`,cursor:'pointer'}}>
                <div style={{width:32,height:32,borderRadius:12,background:`linear-gradient(135deg,${C.primary},${C.primaryAccent})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:C.white,boxShadow:`0 0 12px ${C.primaryGlow}`}}>AD</div>
                <div>
                  <p style={{fontSize:12,fontWeight:600,color:C.text,lineHeight:1.2}}>Admin</p>
                  <p style={{fontSize:10,color:C.textMuted}}>Super Admin</p>
                </div>
                <MI name="expand_more" size={16} style={{color:C.textMuted}}/>
              </div>
            </div>
          </div>

          {/* ═══ DASHBOARD ═══ */}
          {adSideTab==='dashboard'&&(<div className="flex flex-col gap-5">
            {/* Sub-tab toggle */}
            <div className="flex gap-2" style={{background:C.surface,borderRadius:12,padding:4,border:`1px solid ${C.border}`,width:'fit-content'}}>
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
              {[{icon:'group',label:'Total Anggota',value:ADMIN_STATS.totalAgents.toLocaleString(),color:C.primary,bg:C.primaryLight,sub:'+24 minggu ini',trend:'+3.2%',up:true},
                {icon:'person_check',label:'Aktif Hari Ini',value:ADMIN_STATS.activeToday.toString(),color:C.green,bg:C.greenLight,sub:`${Math.round(ADMIN_STATS.activeToday/ADMIN_STATS.totalAgents*100)}% dari total`,trend:'+12%',up:true},
                {icon:'target',label:'Misi Aktif',value:ADMIN_STATS.missionsActive.toString(),color:C.gold,bg:C.goldLight,sub:`${ADMIN_STATS.missionsCompleted} selesai total`,trend:'+2',up:true},
                {icon:'public',label:'Total Reach',value:ADMIN_STATS.totalReach,color:C.purple,bg:C.purpleLight,sub:`Avg ${ADMIN_STATS.avgEngagement} engagement`,trend:'+18%',up:true},
              ].map((s,i)=>(
                <DCard key={i} style={{padding:0}} accent={s.color}>
                  <div style={{padding:20,position:'relative',overflow:'hidden'}}>
                    {/* Background glow */}
                    <div style={{position:'absolute',top:-20,right:-20,width:80,height:80,borderRadius:'50%',background:s.bg,filter:'blur(30px)',opacity:0.5}}/>
                    <div className="flex items-center justify-between mb-3" style={{position:'relative'}}>
                      <div style={{width:44,height:44,borderRadius:12,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${s.color}22`}}>
                        <MI name={s.icon} size={22} fill style={{color:s.color}}/>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:3,padding:'3px 8px',borderRadius:6,background:s.up?C.greenLight:C.redLight}}>
                        <MI name={s.up?'trending_up':'trending_down'} size={12} style={{color:s.up?C.green:C.red}}/>
                        <span style={{fontSize:10,fontWeight:700,color:s.up?C.green:C.red}}>{s.trend}</span>
                      </div>
                    </div>
                    <div style={{position:'relative'}}>
                      <p style={{fontSize:28,fontWeight:800,color:C.text,fontFamily:"'Space Mono'",letterSpacing:-1,lineHeight:1}}>{s.value}</p>
                      <p style={{fontSize:12,color:C.textMuted,marginTop:6,fontWeight:500}}>{s.label}</p>
                      <p style={{fontSize:10,color:s.color,fontWeight:600,marginTop:6,opacity:0.8}}>{s.sub}</p>
                    </div>
                    {/* Mini sparkline decoration */}
                    <svg viewBox="0 0 80 24" style={{position:'absolute',bottom:12,right:16,width:80,height:24,opacity:0.3}}>
                      <polyline points={i===0?"0,18 12,14 24,16 36,10 48,12 60,6 72,8 80,2":i===1?"0,20 12,18 24,12 36,16 48,8 60,10 72,4 80,2":i===2?"0,16 12,14 24,18 36,12 48,10 60,14 72,6 80,4":"0,22 12,16 24,14 36,18 48,10 60,8 72,6 80,2"} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </DCard>
              ))}
            </div>

            {/* Two columns */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              {/* Submission Queue */}
              <DCard title="Antrian Review" subtitle={`${submissionQueue.length} submisi menunggu`} accent={C.orange}
                action={<span style={{fontSize:10,fontWeight:700,color:C.orange,padding:'4px 10px',borderRadius:6,background:C.orangeLight,display:'flex',alignItems:'center',gap:4}}><MI name="pending" size={12} fill style={{color:C.orange}}/>{submissionQueue.length} Pending</span>}>
                <div className="flex flex-col gap-3">
                {submissionQueue.map((s,i)=>(
                  <div key={i} style={{padding:14,borderRadius:12,background:C.surfaceLight,border:`1px solid ${s.aiPass?C.greenLight:C.orangeLight}`,transition:'border-color 200ms'}} onMouseEnter={e=>e.currentTarget.style.borderColor=s.aiPass?C.green:C.orange} onMouseLeave={e=>e.currentTarget.style.borderColor=s.aiPass?C.greenLight:C.orangeLight}>
                    <div className="flex items-center gap-3">
                      {/* AI Score Ring */}
                      <div style={{width:44,height:44,borderRadius:'50%',position:'relative',flexShrink:0}}>
                        <svg viewBox="0 0 44 44" style={{width:44,height:44,transform:'rotate(-90deg)'}}>
                          <circle cx="22" cy="22" r="18" fill="none" stroke={C.border} strokeWidth="3"/>
                          <circle cx="22" cy="22" r="18" fill="none" stroke={s.aiPass?C.green:C.orange} strokeWidth="3" strokeDasharray={`${s.aiScore*1.13} 113`} strokeLinecap="round"/>
                        </svg>
                        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column'}}>
                          <span style={{fontSize:12,fontWeight:800,color:s.aiPass?C.green:C.orange,fontFamily:"'Space Mono'",lineHeight:1}}>{s.aiScore}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{fontSize:13,fontWeight:600,color:C.text}}>{s.agent}</p>
                        <p style={{fontSize:11,color:C.textMuted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.mission}</p>
                        <p style={{fontSize:10,color:C.textMuted,marginTop:2}}>{s.time}</p>
                      </div>
                      <div style={{textAlign:'center',flexShrink:0}}>
                        <p style={{fontSize:16,fontWeight:800,color:s.briefMatch>=80?C.green:s.briefMatch>=60?C.orange:C.red,fontFamily:"'Space Mono'"}}>{s.briefMatch}%</p>
                        <p style={{fontSize:10,fontWeight:600,color:C.textMuted,letterSpacing:0.5}}>BRIEF</p>
                      </div>
                    </div>
                    {/* Brief compliance checks */}
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {s.briefChecks.map((bc,j)=>(
                        <span key={j} style={{fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:6,display:'flex',alignItems:'center',gap:3,
                          background:bc.ok?C.greenLight:C.orangeLight,color:bc.ok?C.green:C.orange,
                        }}>
                          <MI name={bc.ok?'check_circle':'cancel'} size={11} fill style={{color:bc.ok?C.green:C.orange}}/>{bc.l}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-3 justify-end">
                      <button style={{padding:'7px 16px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#22C55E,#16A34A)',color:C.white,fontSize:11,fontWeight:700,cursor:'pointer',boxShadow:'0 2px 8px rgba(34,197,94,0.3)',display:'flex',alignItems:'center',gap:4}}><MI name="check" size={14}/>Approve</button>
                      <button style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',color:C.textSec,fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}><MI name="visibility" size={14}/>Detail</button>
                    </div>
                  </div>
                ))}
                </div>
              </DCard>

              {/* Misi per Tipe */}
              <DCard title="Misi per Tipe" subtitle="Distribusi misi aktif" accent={C.primary}>
                <div className="flex flex-col gap-3">
                {['EVENT','KONTEN','ENGAGEMENT','EDUKASI','AKSI'].map((t,i)=>{
                  const count=MISSIONS.filter(m=>m.type===t).length;
                  const active=MISSIONS.filter(m=>m.type===t&&m.status!=='SELESAI').length;
                  const tc2=typeColor(t);
                  return(
                  <div key={i} style={{padding:14,borderRadius:12,background:C.surfaceLight,border:`1px solid ${C.border}`,transition:'border-color 200ms'}} onMouseEnter={e=>e.currentTarget.style.borderColor=tc2+'66'} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                    <div className="flex items-center gap-3">
                      <div style={{width:40,height:40,borderRadius:12,background:typeBg(t),display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${tc2}22`}}>
                        <MI name={typeIcon(t)} size={18} fill style={{color:tc2}}/>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p style={{fontSize:13,fontWeight:600,color:C.text}}>{t}</p>
                          <div className="flex items-center gap-2">
                            <span style={{fontSize:15,fontWeight:800,color:C.text,fontFamily:"'Space Mono'"}}>{count}</span>
                            <span style={{fontSize:10,fontWeight:700,color:C.green,padding:'2px 6px',borderRadius:4,background:C.greenLight}}>{active} aktif</span>
                          </div>
                        </div>
                        <div style={{height:6,borderRadius:6,background:C.overlay06,overflow:'hidden'}}>
                          <div style={{height:'100%',borderRadius:6,background:`linear-gradient(90deg,${tc2}88,${tc2})`,width:`${count>0?(active/count*100):0}%`,transition:'width 1s ease-out'}}/>
                        </div>
                        <p style={{fontSize:10,color:C.textMuted,marginTop:6}}>{typeDesc(t)}</p>
                      </div>
                    </div>
                  </div>);
                })}
                </div>
              </DCard>
            </div>

            {/* Active Missions with Analytics */}
            <DCard title="Misi Aktif — Analisa" subtitle={`${MISSIONS.filter(m=>m.status!=='SELESAI').length} misi sedang berjalan`} accent={C.gold}
              action={<button style={{fontSize:11,fontWeight:600,color:C.primary,background:C.primaryLight,border:'none',padding:'6px 12px',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}><MI name="add" size={14}/>Buat Misi</button>}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14}}>
                {MISSIONS.filter(m=>m.status!=='SELESAI').slice(0,6).map(m=>{
                  const tc2=typeColor(m.type);
                  return(
                  <div key={m.id} onClick={()=>{setSelectedAdMission(m.id);setAdSideTab('missionDetail')}} style={{background:C.surfaceLight,borderRadius:12,padding:16,border:`1px solid ${C.border}`,cursor:'pointer',transition:'all 200ms',position:'relative',overflow:'hidden'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=tc2+'55';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 8px 24px rgba(0,0,0,0.2)`}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none'}}>
                    {/* Type accent line */}
                    <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${tc2},transparent)`}}/>
                    <div className="flex items-center gap-2 mb-3">
                      <div style={{width:28,height:28,borderRadius:8,background:typeBg(m.type),display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <MI name={typeIcon(m.type)} size={14} fill style={{color:tc2}}/>
                      </div>
                      <span style={{fontSize:10,fontWeight:700,color:tc2,textTransform:'uppercase',letterSpacing:0.5}}>{m.type}</span>
                      <span style={{marginLeft:'auto',fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:6,
                        background:m.status==='PRIORITAS'?C.redLight:m.status==='SIAGA'?C.orangeLight:typeBg(m.type),
                        color:m.status==='PRIORITAS'?C.red:m.status==='SIAGA'?C.orange:tc2}}>{m.status}</span>
                    </div>
                    <p style={{fontSize:13,fontWeight:600,color:C.text,lineHeight:1.4,marginBottom:10}} className="line-clamp-2">{m.title}</p>
                    <div className="flex items-center justify-between mb-3">
                      <span style={{fontSize:12,fontWeight:700,color:C.gold,fontFamily:"'Space Mono'",display:'flex',alignItems:'center',gap:3}}><MI name="star" size={13} fill style={{color:C.gold}}/>+{m.xp} XP</span>
                      <span style={{fontSize:10,color:C.textMuted}}><b style={{color:C.text}}>{m.participants}</b> joined · {m.deadline}</span>
                    </div>
                    {m.analytics&&(
                      <div style={{borderTop:`1px solid ${C.border}`,paddingTop:12}}>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          {[{v:m.analytics.reach,l:'Reach',c:C.text},{v:m.analytics.engagement,l:'Engage',c:C.green},{v:m.analytics.completion+'%',l:'Selesai',c:m.analytics.completion>=70?C.green:m.analytics.completion>=40?C.orange:C.red}].map((x,xi)=>(
                            <div key={xi} style={{textAlign:'center',padding:'6px 0',borderRadius:8,background:`${x.c}08`}}>
                              <p style={{fontSize:14,fontWeight:800,color:x.c,fontFamily:"'Space Mono'"}}>{x.v}</p>
                              <p style={{fontSize:10,color:C.textMuted,fontWeight:600,marginTop:2}}>{x.l}</p>
                            </div>
                          ))}
                        </div>
                        <div style={{marginTop:4,position:'relative'}}>
                          <div style={{height:4,borderRadius:4,background:C.overlay06,overflow:'hidden'}}>
                            <div style={{height:'100%',borderRadius:4,background:`linear-gradient(90deg,${m.analytics.completion>=70?C.green:m.analytics.completion>=40?C.orange:C.red}88,${m.analytics.completion>=70?C.green:m.analytics.completion>=40?C.orange:C.red})`,width:`${m.analytics.completion}%`,transition:'width 1s ease-out'}}/>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <span style={{fontSize:10,color:C.textMuted}}>Sentimen: <b style={{color:m.analytics.sentiment>=70?C.green:m.analytics.sentiment>=40?C.orange:C.red}}>{m.analytics.sentiment}%</b></span>
                          <span style={{fontSize:10,color:C.textMuted}}>Konversi: <b style={{color:C.primary}}>{m.analytics.conversionRate}</b></span>
                        </div>
                      </div>
                    )}
                  </div>);
                })}
              </div>
            </DCard>
            </>)}

            {adSubTab==='analytics'&&(<>
            {/* Key Metrics */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
              {[{label:'Avg Join Rate',value:'68%',icon:'person_add',color:C.primary,sub:'per misi',pct:68},
                {label:'Completion Rate',value:'74%',icon:'task_alt',color:C.green,sub:'misi diselesaikan',pct:74},
                {label:'Avg Engagement',value:'12.3%',icon:'trending_up',color:C.orange,sub:'across platforms',pct:49},
                {label:'Total Reach',value:'2.4M',icon:'public',color:C.purple,sub:'semua platform',pct:82},
              ].map((s,i)=>(
                <DCard key={i} style={{padding:0}} accent={s.color}>
                  <div style={{padding:20,position:'relative'}}>
                    <div style={{position:'absolute',top:16,right:16}}>
                      <svg viewBox="0 0 48 48" style={{width:48,height:48}}>
                        <circle cx="24" cy="24" r="20" fill="none" stroke={`${s.color}15`} strokeWidth="4"/>
                        <circle cx="24" cy="24" r="20" fill="none" stroke={s.color} strokeWidth="4" strokeDasharray={`${s.pct*1.26} 126`} strokeLinecap="round" style={{transform:'rotate(-90deg)',transformOrigin:'center',transition:'stroke-dasharray 1.5s ease'}}/>
                      </svg>
                    </div>
                    <MI name={s.icon} size={20} fill style={{color:s.color,marginBottom:8,display:'block'}}/>
                    <p style={{fontSize:30,fontWeight:800,color:C.text,fontFamily:"'Space Mono'",letterSpacing:-1}}>{s.value}</p>
                    <p style={{fontSize:12,color:C.textMuted,marginTop:4,fontWeight:500}}>{s.label}</p>
                    <p style={{fontSize:10,color:s.color,fontWeight:600,marginTop:6}}>{s.sub}</p>
                  </div>
                </DCard>
              ))}
            </div>

            {/* Mission Performance */}
            <DCard title="Performa per Tipe Misi" subtitle="Join rate & engagement berdasarkan tipe" accent={C.teal}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
                {[{type:'EVENT',join:'72%',engagement:'22.1%',completed:28},{type:'KONTEN',join:'65%',engagement:'14.8%',completed:38},
                  {type:'ENGAGEMENT',join:'89%',engagement:'18.5%',completed:42},{type:'EDUKASI',join:'54%',engagement:'11.2%',completed:18},
                  {type:'AKSI',join:'45%',engagement:'16.3%',completed:12},
                ].map((t,i)=>{
                  const tc2=typeColor(t.type);
                  return(
                  <div key={i} style={{background:C.surfaceLight,borderRadius:12,padding:16,border:`1px solid ${C.border}`,position:'relative',overflow:'hidden',transition:'border-color 200ms'}} onMouseEnter={e=>e.currentTarget.style.borderColor=tc2+'44'} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                    <div style={{position:'absolute',top:0,left:0,width:'100%',height:2,background:`linear-gradient(90deg,${tc2},transparent)`}}/>
                    <div className="flex items-center gap-2 mb-4">
                      <div style={{width:32,height:32,borderRadius:12,background:typeBg(t.type),display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <MI name={typeIcon(t.type)} size={16} fill style={{color:tc2}}/>
                      </div>
                      <span style={{fontSize:12,fontWeight:700,color:tc2}}>{t.type}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[{v:t.join,l:'Join'},{v:t.engagement,l:'Engage'},{v:t.completed,l:'Selesai'}].map((x,xi)=>(
                        <div key={xi}>
                          <p style={{fontSize:17,fontWeight:800,color:C.text,fontFamily:"'Space Mono'"}}>{x.v}</p>
                          <p style={{fontSize:10,color:C.textMuted,marginTop:2}}>{x.l}</p>
                        </div>
                      ))}
                    </div>
                  </div>);
                })}
              </div>
            </DCard>

            {/* Agent Performance Distribution */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <DCard title="Distribusi Tier Anggota" accent={C.orange}>
                <div className="flex items-center gap-6 mb-4">
                  {/* Donut Chart */}
                  <svg viewBox="0 0 120 120" style={{width:100,height:100,flexShrink:0}}>
                    <circle cx="60" cy="60" r="48" fill="none" stroke={C.textMuted} strokeWidth="12" strokeDasharray={`${43*3.015} ${100*3.015}`} strokeDashoffset={`${-(15+42)*3.015}`} style={{transform:'rotate(-90deg)',transformOrigin:'center'}}/>
                    <circle cx="60" cy="60" r="48" fill="none" stroke={C.primary} strokeWidth="12" strokeDasharray={`${42*3.015} ${100*3.015}`} strokeDashoffset={`${-15*3.015}`} style={{transform:'rotate(-90deg)',transformOrigin:'center'}}/>
                    <circle cx="60" cy="60" r="48" fill="none" stroke={C.orange} strokeWidth="12" strokeDasharray={`${15*3.015} ${100*3.015}`} style={{transform:'rotate(-90deg)',transformOrigin:'center'}}/>
                    <text x="60" y="56" textAnchor="middle" style={{fontSize:20,fontWeight:800,fill:C.text,fontFamily:"'Space Mono'"}}>1,247</text>
                    <text x="60" y="72" textAnchor="middle" style={{fontSize:10,fill:C.textMuted}}>Total</text>
                  </svg>
                  <div className="flex flex-col gap-3 flex-1">
                    {[{tier:'Gold',count:186,pct:15,color:C.orange,icon:'workspace_premium'},{tier:'Silver',count:524,pct:42,color:C.primary,icon:'military_tech'},{tier:'Bronze',count:537,pct:43,color:C.textMuted,icon:'shield'}].map((t,i)=>(
                      <div key={i} className="flex items-center gap-2">
                        <MI name={t.icon} size={16} fill style={{color:t.color}}/>
                        <span style={{fontSize:12,fontWeight:600,color:t.color,width:50}}>{t.tier}</span>
                        <div className="flex-1"><ProgressBar progress={t.pct/100} color={t.color} height={6}/></div>
                        <span style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:"'Space Mono'",width:40,textAlign:'right'}}>{t.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </DCard>
              <DCard title="Demografi Usia" accent={C.purple}>
                <div className="flex flex-col gap-3">
                {[{age:'18\u201324',count:412,pct:33,color:C.teal},{age:'25\u201334',count:498,pct:40,color:C.primary},{age:'35\u201344',count:237,pct:19,color:C.purple},{age:'45+',count:100,pct:8,color:C.pink}].map((a,i)=>(
                  <div key={i} className="flex items-center gap-3">
                    <span style={{fontSize:12,fontWeight:600,color:C.text,width:48,flexShrink:0}}>{a.age}</span>
                    <div className="flex-1" style={{position:'relative'}}>
                      <div style={{height:24,borderRadius:6,background:C.glass,overflow:'hidden'}}>
                        <div style={{height:'100%',borderRadius:6,background:`linear-gradient(90deg,${a.color}66,${a.color})`,width:`${a.pct*2}%`,transition:'width 1s ease-out',display:'flex',alignItems:'center',justifyContent:'flex-end',paddingRight:8}}>
                          <span style={{fontSize:10,fontWeight:700,color:C.white,textShadow:'0 1px 3px rgba(0,0,0,0.3)'}}>{a.pct}%</span>
                        </div>
                      </div>
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:"'Space Mono'",width:40,textAlign:'right'}}>{a.count}</span>
                  </div>
                ))}
                </div>
              </DCard>
            </div>
            </>)}
          </div>)}

          {/* ═══ MANAJEMEN MISI ═══ */}
          {adSideTab==='misi'&&(<div className="flex flex-col gap-5">
            {/* Sub-tab toggle */}
            <div className="flex gap-2" style={{background:C.surface,borderRadius:12,padding:4,border:`1px solid ${C.border}`,width:'fit-content'}}>
              {[{id:'list',label:'Semua Misi',icon:'list'},{id:'create',label:'Buat Misi',icon:'add_circle'}].map(t=>(
                <button key={t.id} onClick={()=>setAdSubTab(t.id)} style={{
                  padding:'8px 16px',borderRadius:8,border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:6,
                  background:adSubTab===t.id?C.primaryLight:'transparent',color:adSubTab===t.id?C.primary:C.textSec,
                  fontSize:12,fontWeight:adSubTab===t.id?700:500,transition:'all 200ms',
                }}>
                  <MI name={t.icon} size={16} fill={adSubTab===t.id} style={{color:adSubTab===t.id?C.primary:C.textMuted}}/>{t.label}
                </button>
              ))}
            </div>

            {adSubTab==='list'&&(<>
            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <button onClick={()=>setAdSubTab('create')} className="btn-primary" style={{padding:'10px 20px',borderRadius:12,border:'none',background:`linear-gradient(135deg,${C.primary},${C.primaryAccent})`,color:C.bg,fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6,boxShadow:'0 4px 15px rgba(249,115,22,0.3)'}}>
                <MI name="add_circle" size={18} style={{color:C.bg}}/>Buat Misi Baru
              </button>
              <p style={{fontSize:12,color:C.textMuted}}>{MISSIONS.length} misi total · {MISSIONS.filter(m=>m.status!=='SELESAI').length} aktif</p>
            </div>

            {/* Mission Type Filter Pills */}
            <div className="flex gap-2 flex-wrap">
              {['ALL','EVENT','KONTEN','ENGAGEMENT','EDUKASI','AKSI'].map(t=>(
                <button key={t} style={{
                  padding:'6px 14px',borderRadius:8,border:`1px solid ${t==='ALL'?C.border:typeColor(t)+'30'}`,cursor:'pointer',
                  background:t==='ALL'?C.surfaceLight:typeBg(t),color:t==='ALL'?C.text:typeColor(t),
                  fontSize:11,fontWeight:600,display:'flex',alignItems:'center',gap:4,transition:'all 200ms',
                }}>
                  {t!=='ALL'&&<MI name={typeIcon(t)} size={13} fill style={{color:typeColor(t)}}/>}
                  {t==='ALL'?'Semua':t}
                  <span style={{fontSize:10,fontWeight:700,opacity:0.7}}>({t==='ALL'?MISSIONS.length:MISSIONS.filter(m=>m.type===t).length})</span>
                </button>
              ))}
            </div>

            {/* Mission Cards Grid */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14}}>
              {MISSIONS.map(m=>{
                const tc2=typeColor(m.type);
                return(
                <div key={m.id} onClick={()=>{setSelectedAdMission(m.id);setAdSideTab('missionDetail')}} style={{background:C.surfaceLight,borderRadius:12,padding:16,border:`1px solid ${C.border}`,cursor:'pointer',transition:'all 200ms',position:'relative',overflow:'hidden'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=tc2+'55';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 8px 24px rgba(0,0,0,0.2)`}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none'}}>
                  <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${tc2},transparent)`}}/>
                  <div className="flex items-center gap-2 mb-3">
                    <div style={{width:28,height:28,borderRadius:8,background:typeBg(m.type),display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <MI name={typeIcon(m.type)} size={14} fill style={{color:tc2}}/>
                    </div>
                    <span style={{fontSize:10,fontWeight:700,color:tc2,textTransform:'uppercase',letterSpacing:0.5}}>{m.type}</span>
                    <span style={{marginLeft:'auto',fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:6,
                      background:m.status==='PRIORITAS'?C.redLight:m.status==='SIAGA'?C.orangeLight:typeBg(m.type),
                      color:m.status==='PRIORITAS'?C.red:m.status==='SIAGA'?C.orange:tc2}}>{m.status}</span>
                  </div>
                  <p style={{fontSize:13,fontWeight:600,color:C.text,lineHeight:1.4,marginBottom:10}} className="line-clamp-2">{m.title}</p>
                  <div className="flex items-center justify-between mb-3">
                    <span style={{fontSize:12,fontWeight:700,color:C.gold,fontFamily:"'Space Mono'",display:'flex',alignItems:'center',gap:3}}><MI name="star" size={13} fill style={{color:C.gold}}/>+{m.xp} XP</span>
                    <span style={{fontSize:10,color:C.textMuted}}><b style={{color:C.text}}>{m.participants}</b> joined · {m.deadline}</span>
                  </div>
                  {m.analytics&&(
                    <div style={{borderTop:`1px solid ${C.border}`,paddingTop:12}}>
                      <div className="grid grid-cols-3 gap-2">
                        {[{v:m.analytics.reach,l:'Reach',c:C.text},{v:m.analytics.engagement,l:'Engage',c:C.green},{v:m.analytics.completion+'%',l:'Selesai',c:m.analytics.completion>=70?C.green:m.analytics.completion>=40?C.orange:C.red}].map((x,xi)=>(
                          <div key={xi} style={{textAlign:'center',padding:'6px 0',borderRadius:8,background:`${x.c}08`}}>
                            <p style={{fontSize:14,fontWeight:800,color:x.c,fontFamily:"'Space Mono'"}}>{x.v}</p>
                            <p style={{fontSize:10,color:C.textMuted,fontWeight:600,marginTop:2}}>{x.l}</p>
                          </div>
                        ))}
                      </div>
                      <div style={{marginTop:8}}>
                        <div style={{height:4,borderRadius:4,background:C.overlay06,overflow:'hidden'}}>
                          <div style={{height:'100%',borderRadius:4,background:`linear-gradient(90deg,${m.analytics.completion>=70?C.green:m.analytics.completion>=40?C.orange:C.red}88,${m.analytics.completion>=70?C.green:m.analytics.completion>=40?C.orange:C.red})`,width:`${m.analytics.completion}%`,transition:'width 1s ease-out'}}/>
                        </div>
                      </div>
                    </div>
                  )}
                </div>);
              })}
            </div>
            </>)}

            {adSubTab==='create'&&(()=>{
              const aiScore=Math.floor(Math.random()*30)+65;
              const publishing=false;
              return(
              <DCard title="Buat Misi Baru" subtitle="Isi detail misi untuk anggota" accent={C.primary} style={{maxWidth:700}}>
                <div className="flex flex-col gap-4">
                  {/* Mission Type */}
                  <div>
                    <p style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:8,textTransform:'uppercase',letterSpacing:0.5}}>TIPE MISI</p>
                    <div className="flex gap-2 flex-wrap">
                      {['EVENT','KONTEN','ENGAGEMENT','EDUKASI','AKSI'].map(t=>(
                        <button key={t} onClick={()=>setMissionForm(f=>({...f,type:t}))} style={{
                          padding:'8px 16px',borderRadius:10,border:`1.5px solid ${missionForm.type===t?typeColor(t):C.border}`,cursor:'pointer',
                          background:missionForm.type===t?typeBg(t):'transparent',color:missionForm.type===t?typeColor(t):C.textSec,
                          fontSize:12,fontWeight:missionForm.type===t?700:500,display:'flex',alignItems:'center',gap:6,transition:'all 200ms',
                        }}>
                          <MI name={typeIcon(t)} size={16} fill={missionForm.type===t} style={{color:missionForm.type===t?typeColor(t):C.textMuted}}/>{t}
                          <span style={{fontSize:10,color:C.textMuted,fontWeight:400}}>{typeDesc(t)}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <p style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:6}}>JUDUL MISI</p>
                    <input value={missionForm.title||''} onChange={e=>setMissionForm(f=>({...f,title:e.target.value}))} placeholder="Judul misi..." style={{width:'100%',padding:'12px 14px',borderRadius:12,border:`1px solid ${C.border}`,background:C.surfaceLight,fontSize:13,color:C.text,outline:'none',fontFamily:'inherit'}}/>
                  </div>

                  {/* Description */}
                  <div>
                    <p style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:6}}>DESKRIPSI</p>
                    <textarea value={missionForm.desc||''} onChange={e=>setMissionForm(f=>({...f,desc:e.target.value}))} rows={3} placeholder="Deskripsi misi..." style={{width:'100%',padding:'12px 14px',borderRadius:12,border:`1px solid ${C.border}`,background:C.surfaceLight,fontSize:13,color:C.text,outline:'none',resize:'vertical',fontFamily:'inherit'}}/>
                  </div>

                  {/* XP & Deadline */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div>
                      <p style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:6}}>XP REWARD</p>
                      <input type="number" value={missionForm.xp||200} onChange={e=>setMissionForm(f=>({...f,xp:parseInt(e.target.value)}))} style={{width:'100%',padding:'12px 14px',borderRadius:12,border:`1px solid ${C.border}`,background:C.surfaceLight,fontSize:13,color:C.text,outline:'none',fontFamily:"'Space Mono'"}}/>
                    </div>
                    <div>
                      <p style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:6}}>DEADLINE</p>
                      <input type="text" value={missionForm.deadline||''} onChange={e=>setMissionForm(f=>({...f,deadline:e.target.value}))} placeholder="e.g. 3 hari lagi" style={{width:'100%',padding:'12px 14px',borderRadius:12,border:`1px solid ${C.border}`,background:C.surfaceLight,fontSize:13,color:C.text,outline:'none',fontFamily:'inherit'}}/>
                    </div>
                  </div>

                  {/* Publish */}
                  <button onClick={()=>{showToast('Misi berhasil dipublikasikan!');setAdSubTab('list')}} className="btn-primary" style={{width:'100%',padding:'14px 0',borderRadius:12,border:'none',background:`linear-gradient(135deg,${C.primary},${C.primaryAccent})`,color:C.white,fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,boxShadow:'0 4px 15px rgba(249,115,22,0.3)'}}>
                    <MI name="rocket_launch" size={18} style={{color:C.white}}/> Publikasikan Misi
                  </button>
                </div>
              </DCard>);
            })()}

          </div>)}
          {/* ═══ AGENTS ═══ */}
          {adSideTab==='agents'&&(<div className="flex flex-col gap-5">
            {/* Summary Stats */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
              {[{label:'Total Anggota',value:'1,247',icon:'group',color:C.primary},{label:'Aktif',value:'892',icon:'person_check',color:C.green},{label:'Rata-rata XP',value:'2,840',icon:'star',color:C.gold},{label:'Top Engagement',value:'18.5%',icon:'trending_up',color:C.purple}].map((s,i)=>(
                <div key={i} style={{padding:16,borderRadius:12,background:`linear-gradient(135deg,${s.color}08,${s.color}03)`,border:`1px solid ${s.color}22`}}>
                  <div className="flex items-center gap-2 mb-1">
                    <MI name={s.icon} size={16} fill style={{color:s.color}}/>
                    <span style={{fontSize:11,color:C.textMuted}}>{s.label}</span>
                  </div>
                  <p style={{fontSize:22,fontWeight:800,color:C.text,fontFamily:"'Space Mono'"}}>{s.value}</p>
                </div>
              ))}
            </div>
            {/* Filter Row */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2" style={{background:C.surface,borderRadius:12,padding:4,border:`1px solid ${C.border}`}}>
                {['Semua','Gold','Silver','Bronze'].map(t=>(
                  <button key={t} style={{padding:'8px 14px',borderRadius:8,border:'none',background:t==='Semua'?C.primaryLight:'transparent',color:t==='Semua'?C.primary:C.textSec,fontSize:12,fontWeight:t==='Semua'?700:500,cursor:'pointer',transition:'all 200ms'}}>{t}</button>
                ))}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderRadius:12,background:C.surfaceLight,border:`1px solid ${C.border}`}}>
                <MI name="search" size={16} style={{color:C.textMuted}}/>
                <input placeholder="Cari anggota..." style={{background:'transparent',border:'none',outline:'none',color:C.text,fontSize:12,width:160,fontFamily:'Inter'}}/>
              </div>
            </div>
            <DCard title="Daftar Anggota" subtitle={`${agentsList.length} anggota terdaftar`} noPad accent={C.primary}>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:C.glass}}>{['#','Anggota','Gender','Usia','Tier','Misi','XP','Engagement','Status'].map(h=>(
                      <th key={h} style={{padding:'12px 16px',fontSize:10,fontWeight:700,color:C.textMuted,textAlign:'left',borderBottom:`1px solid ${C.border}`,textTransform:'uppercase',letterSpacing:1}}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {agentsList.map((a,i)=>(
                      <tr key={i} style={{borderBottom:`1px solid ${C.borderLight}`,cursor:'pointer',transition:'background 150ms'}} onMouseEnter={e=>e.currentTarget.style.background=C.glass} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{padding:'12px 16px',fontSize:12,color:C.textMuted,fontFamily:"'Space Mono'",fontWeight:600}}>{i+1}</td>
                        <td style={{padding:'12px 16px'}}>
                          <div className="flex items-center gap-3">
                            <div style={{width:36,height:36,borderRadius:12,background:`linear-gradient(135deg,${a.tier==='Gold'?C.orangeLight:a.tier==='Silver'?C.primaryHover:C.surfaceLight},transparent)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:a.tier==='Gold'?C.orange:C.primary,border:`1px solid ${a.tier==='Gold'?C.orange+'33':C.border}`}}>{a.avatar}</div>
                            <div>
                              <span style={{fontSize:13,fontWeight:600,color:C.text,display:'block'}}>{a.name}</span>
                              <span style={{fontSize:10,color:C.textMuted}}>ID-{1000+i}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{padding:'12px 16px',fontSize:12,color:C.textSec}}>{a.gender==='M'?'Laki-laki':'Perempuan'}</td>
                        <td style={{padding:'12px 16px',fontSize:12,color:C.textSec}}>{a.age}</td>
                        <td style={{padding:'12px 16px'}}>
                          <span style={{fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:6,display:'inline-flex',alignItems:'center',gap:3,
                            background:a.tier==='Gold'?C.orangeLight:a.tier==='Silver'?C.primaryHover:C.surfaceLight,
                            color:a.tier==='Gold'?C.orange:a.tier==='Silver'?C.primary:C.textMuted,
                            border:`1px solid ${a.tier==='Gold'?C.orange+'22':a.tier==='Silver'?C.primary+'22':C.border}`}}>
                            <MI name={a.tier==='Gold'?'workspace_premium':a.tier==='Silver'?'military_tech':'shield'} size={12} fill style={{color:a.tier==='Gold'?C.orange:a.tier==='Silver'?C.primary:C.textMuted}}/>{a.tier}
                          </span>
                        </td>
                        <td style={{padding:'12px 16px',fontSize:13,fontWeight:600,color:C.text,fontFamily:"'Space Mono'"}}>{a.missions}</td>
                        <td style={{padding:'12px 16px'}}>
                          <span style={{fontSize:13,fontWeight:700,color:C.gold,fontFamily:"'Space Mono'"}}>{a.xp.toLocaleString()}</span>
                        </td>
                        <td style={{padding:'12px 16px'}}>
                          <div className="flex items-center gap-2">
                            <div style={{width:40,height:4,borderRadius:2,background:C.overlay06,overflow:'hidden'}}>
                              <div style={{height:'100%',borderRadius:2,background:parseFloat(a.engagement)>=15?C.green:parseFloat(a.engagement)>=10?C.orange:C.red,width:`${parseFloat(a.engagement)/25*100}%`}}/>
                            </div>
                            <span style={{fontSize:12,fontWeight:600,color:C.text,fontFamily:"'Space Mono'"}}>{a.engagement}</span>
                          </div>
                        </td>
                        <td style={{padding:'12px 16px'}}>
                          <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:6,
                            background:a.status==='active'?C.greenLight:C.surfaceLight,
                            color:a.status==='active'?C.green:C.textMuted}}>
                            <span style={{width:6,height:6,borderRadius:'50%',background:a.status==='active'?C.green:C.textMuted}}/>
                            {a.status==='active'?'Aktif':'Idle'}
                          </span>
                        </td>
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
                    <div style={{width:36,height:36,borderRadius:12,background:typeBg(m.type),display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <MI name={typeIcon(m.type)} size={18} fill style={{color:tc}}/>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span style={{fontSize:11,fontWeight:700,color:tc,textTransform:'uppercase',letterSpacing:1}}>{m.type}</span>
                        <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:4,background:typeBg(m.type),color:tc}}>{m.status}</span>
                      </div>
                      <h2 style={{fontSize:20,fontWeight:800,color:C.text,marginTop:4}}>{m.title}</h2>
                    </div>
                    <span style={{fontSize:16,fontWeight:800,color:C.gold,fontFamily:"'Space Mono'",background:C.goldLight,padding:'6px 14px',borderRadius:8,border:'1px solid rgba(249,115,22,0.2)'}}>+{m.xp} XP</span>
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
                      <p style={{fontSize:18,fontWeight:800,color:s.c,fontFamily:"'Space Mono'"}}>{s.v}</p>
                      <p style={{fontSize:10,color:C.textMuted,fontWeight:600,marginTop:2}}>{s.l}</p>
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
                        <p style={{fontSize:16,fontWeight:800,color:s.c,fontFamily:"'Space Mono'"}}>{s.v}</p>
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
                          <span style={{fontSize:18,fontWeight:800,color:s.color,fontFamily:"'Space Mono'"}}>{s.count}</span>
                        </div>
                        <p style={{fontSize:10,fontWeight:700,color:s.color}}>{s.label}</p>
                        {i>0&&<p style={{fontSize:10,color:C.textMuted,marginTop:2}}>{arr[0].count>0?Math.round(s.count/arr[0].count*100):0}%</p>}
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
                      <span style={{fontSize:10,color:C.textMuted}}>{s.l}</span>
                    </div>
                  ))}
                </div>
              </DCard>

              {/* ═══ 3D SOCIAL MEDIA MONITORING ═══ */}
              {(()=>{
                // Build arcs & graph data from social interactions
                const arcs=[];const graphLinks=[];const interactionMap={};
                missionPosts.forEach(post=>{
                  interactionMap[post.agent]={likes:post.likedBy?.length||0,shares:post.sharedBy?.length||0,total:(post.likedBy?.length||0)+(post.sharedBy?.length||0)};
                  (post.likedBy||[]).forEach(liker=>{
                    const lp=missionPosts.find(p=>p.agent===liker);
                    if(lp&&lp.agent!==post.agent){
                      arcs.push({startLat:lp.lat,startLng:lp.lng,endLat:post.lat,endLng:post.lng,color:['rgba(249,115,22,0.6)','rgba(249,115,22,0.15)'],label:`${liker} → liked → ${post.agent}`,type:'like'});
                      graphLinks.push({source:lp.agent,target:post.agent,type:'like',color:'rgba(236,72,153,0.5)'});
                    }
                  });
                  (post.sharedBy||[]).forEach(sharer=>{
                    const sp=missionPosts.find(p=>p.agent===sharer);
                    if(sp&&sp.agent!==post.agent){
                      arcs.push({startLat:sp.lat,startLng:sp.lng,endLat:post.lat,endLng:post.lng,color:['rgba(45,212,191,0.7)','rgba(45,212,191,0.15)'],label:`${sharer} → shared → ${post.agent}`,type:'share'});
                      graphLinks.push({source:sp.agent,target:post.agent,type:'share',color:'rgba(45,212,191,0.5)'});
                    }
                  });
                });
                const points=missionPosts.map(p=>({lat:p.lat,lng:p.lng,agent:p.agent,city:p.city,platform:p.platform,title:p.title,views:p.views,rate:p.rate,status:p.status,size:Math.max(0.3,p.rate/20),color:p.status==='SELESAI'?C.green:p.status==='REVIEW'?C.orange:C.red}));
                // Force graph data
                const graphNodes=missionPosts.map(p=>{const ti=interactionMap[p.agent]||{total:0};return{id:p.agent,avatar:p.avatar,platform:p.platform,city:p.city,title:p.title,views:p.views,rate:p.rate,status:p.status,val:Math.max(3,ti.total*2+p.rate/5),color:pColor(p.platform)};});
                const graphData={nodes:graphNodes,links:graphLinks};
                // View mode state is controlled by parent
                const viewModes=[{id:'network',label:'3D Network',icon:'hub'},{id:'globe',label:'Globe',icon:'public'},{id:'timeline',label:'Timeline',icon:'timeline'}];

                return(<>
                {/* ─── VIEW MODE SELECTOR ─── */}
                <DCard style={{padding:0}}>
                  <div style={{padding:'16px 24px',borderBottom:`1px solid ${C.borderLight}`}}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 style={{fontSize:16,fontWeight:800,color:C.text}}>Social Media Monitoring</h3>
                        <p style={{fontSize:11,color:C.textMuted,marginTop:2}}>Visualisasi interaksi konten anggota secara real-time</p>
                      </div>
                      <div className="flex gap-1" style={{background:C.surfaceLight,borderRadius:8,padding:3,border:`1px solid ${C.border}`}}>
                        {viewModes.map(v=>(
                          <button key={v.id} onClick={()=>setMonitorView(v.id)} className={monitorView===v.id?'btn-primary':''} style={{
                            padding:'6px 14px',borderRadius:6,border:'none',fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4,
                            background:monitorView===v.id?`linear-gradient(135deg,${C.primary},${C.primaryAccent})`:'transparent',
                            color:monitorView===v.id?C.bg:C.textMuted,
                          }}><MI name={v.icon} size={14}/>{v.label}</button>
                        ))}
                      </div>
                    </div>
                    {/* Quick Stats Row */}
                    <div className="flex gap-4 mt-3">
                      {[{l:'Konten',v:missionPosts.length,c:C.primary},{l:'Kota',v:new Set(missionPosts.map(p=>p.city)).size,c:C.teal},{l:'Interaksi',v:arcs.length,c:C.primary},{l:'Avg Rate',v:(missionPosts.reduce((s,p)=>s+p.rate,0)/missionPosts.length).toFixed(1)+'%',c:C.green}].map(s=>(
                        <div key={s.l} className="flex items-center gap-2">
                          <div style={{width:8,height:8,borderRadius:'50%',background:s.c}}/>
                          <span style={{fontSize:11,color:C.textMuted}}>{s.l}:</span>
                          <span style={{fontSize:12,fontWeight:800,color:s.c,fontFamily:"'Space Mono'"}}>{s.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ─── VIEW: 3D FORCE-DIRECTED NETWORK GRAPH ─── */}
                  {monitorView==='network'&&(
                    <div style={{position:'relative',height:520,background:'radial-gradient(ellipse at 50% 50%,#0d1525 0%,#060a14 100%)'}}>
                      <ForceGraph3D
                        graphData={graphData}
                        width={760} height={520}
                        backgroundColor="rgba(0,0,0,0)"
                        nodeVal="val"
                        nodeColor="color"
                        nodeOpacity={0.95}
                        nodeResolution={16}
                        nodeLabel={node=>`<div style="background:#FFFFFF;border:1px solid #E2DDD4;border-radius:10px;padding:12px 16px;font-family:Inter,sans-serif;min-width:220px;box-shadow:0 12px 40px rgba(0,0,0,0.15)">
                          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                            <div style="width:32px;height:32px;border-radius:8px;background:${node.color}25;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:${node.color};border:1px solid ${node.color}40">${node.avatar}</div>
                            <div>
                              <div style="font-size:14px;font-weight:700;color:#1E293B">${node.id}</div>
                              <div style="font-size:10px;color:#64748B">${node.city} · ${node.platform}</div>
                            </div>
                          </div>
                          <div style="font-size:12px;color:#1B5E20;font-weight:600;margin-bottom:6px">${node.title}</div>
                          <div style="display:flex;gap:16px;padding-top:6px;border-top:1px solid rgba(0,0,0,0.06)">
                            <span style="font-size:11px;color:#64748B">Views <b style="color:#1E293B">${node.views}</b></span>
                            <span style="font-size:11px;color:#64748B">Rate <b style="color:${node.rate>15?'#10B981':node.rate>10?'#E65100':'#64748B'}">${node.rate}%</b></span>
                            <span style="font-size:11px;color:${node.status==='SELESAI'?'#22C55E':node.status==='REVIEW'?'#F59E0B':'#EF4444'};font-weight:600">${node.status}</span>
                          </div>
                        </div>`}
                        linkColor="color"
                        linkWidth={link=>link.type==='share'?2:1.2}
                        linkOpacity={0.6}
                        linkDirectionalParticles={3}
                        linkDirectionalParticleWidth={link=>link.type==='share'?2.5:1.5}
                        linkDirectionalParticleColor={link=>link.type==='like'?'#B71C1C':'#2E7D32'}
                        linkDirectionalParticleSpeed={0.005}
                        linkLabel={link=>`<div style="background:#FFFFFF;border:1px solid #E2DDD4;border-radius:6px;padding:6px 10px;font-family:Inter;font-size:10px;color:#64748B;box-shadow:0 4px 16px rgba(0,0,0,0.08)"><span style="color:${link.type==='like'?'#B71C1C':'#37474F'}">${link.type==='like'?'Liked':'Shared'}</span> ${link.source.id||link.source} → ${link.target.id||link.target}</div>`}
                        enableNodeDrag={true}
                        enableNavigationControls={true}
                        showNavInfo={false}
                      />
                      {/* Legend */}
                      <div style={{position:'absolute',top:16,left:16,display:'flex',flexDirection:'column',gap:6}}>
                        <div style={{background:C.surfaceGlass,backdropFilter:'blur(12px)',borderRadius:8,padding:'10px 14px',border:`1px solid ${C.overlay08}`}}>
                          <p style={{fontSize:10,fontWeight:700,color:C.textMuted,textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Platform Nodes</p>
                          {[{p:'tiktok',c:'#1A1A1A'},{p:'instagram',c:'#E1306C'},{p:'x',c:'#1DA1F2'}].map(x=>(
                            <div key={x.p} className="flex items-center gap-2" style={{marginBottom:3}}>
                              <div style={{width:8,height:8,borderRadius:'50%',background:x.c}}/>
                              <span style={{fontSize:10,color:C.textSec}}>{pName(x.p)}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{background:C.surfaceGlass,backdropFilter:'blur(12px)',borderRadius:8,padding:'10px 14px',border:`1px solid ${C.overlay08}`}}>
                          <p style={{fontSize:10,fontWeight:700,color:C.textMuted,textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Particle Flows</p>
                          {[{l:'Like',c:'#B71C1C'},{l:'Share',c:'#2E7D32'}].map(x=>(
                            <div key={x.l} className="flex items-center gap-2" style={{marginBottom:3}}>
                              <div style={{width:14,height:3,borderRadius:2,background:x.c}}/>
                              <span style={{fontSize:10,color:C.textSec}}>{x.l}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Interaction insight */}
                      <div style={{position:'absolute',bottom:16,left:16,right:16,display:'flex',gap:8}}>
                        {missionPosts.sort((a,b)=>(interactionMap[b.agent]?.total||0)-(interactionMap[a.agent]?.total||0)).slice(0,3).map((p,i)=>(
                          <div key={p.agent} style={{flex:1,background:C.surfaceGlass,backdropFilter:'blur(12px)',borderRadius:8,padding:'10px 12px',border:`1px solid ${i===0?C.primaryGlow:C.overlay06}`,boxShadow:i===0?'0 0 20px rgba(249,115,22,0.1)':'none'}}>
                            <div className="flex items-center gap-2 mb-1">
                              {i===0&&<MI name="emoji_events" size={14} fill style={{color:C.gold}}/>}
                              <span style={{fontSize:11,fontWeight:700,color:i===0?C.gold:C.text}}>{p.agent.split(' ')[0]}</span>
                              <SocialIcon platform={p.platform} size={10} color={pColor(p.platform)}/>
                            </div>
                            <div className="flex items-center gap-3">
                              <span style={{fontSize:10,color:C.pink}}><MI name="favorite" size={10} fill style={{verticalAlign:'middle'}}/> {interactionMap[p.agent]?.likes||0}</span>
                              <span style={{fontSize:10,color:C.teal}}><MI name="share" size={10} style={{verticalAlign:'middle'}}/> {interactionMap[p.agent]?.shares||0}</span>
                              <span style={{fontSize:10,fontWeight:800,color:C.primary,fontFamily:"'Space Mono'",marginLeft:'auto'}}>{interactionMap[p.agent]?.total||0}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ─── VIEW: 3D GLOBE ─── */}
                  {monitorView==='globe'&&(()=>{
                    // Each post = one pin on the globe with avatar, click to show detail
                    const htmlData=missionPosts.map(p=>({...p,size:20}));
                    const selP=globeSelPost?missionPosts.find(x=>x.agent===globeSelPost):null;
                    return(
                    <div style={{position:'relative',height:520,background:'radial-gradient(ellipse at center,#0a1628 0%,#060d1a 100%)'}}>
                      <Globe
                        width={760} height={520}
                        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
                        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                        backgroundImageUrl="" backgroundColor="rgba(0,0,0,0)"
                        atmosphereColor="rgba(249,115,22,0.25)" atmosphereAltitude={0.18}
                        htmlElementsData={htmlData}
                        htmlLat="lat" htmlLng="lng"
                        htmlAltitude={0.01}
                        htmlElement={d=>{
                          const el=document.createElement('div');
                          const pc=d.platform==='instagram'?'#E1306C':d.platform==='tiktok'?'#1A1A1A':'#1DA1F2';
                          const isSel=globeSelPost===d.agent;
                          el.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;transform:translate(-50%,-50%)">
                            <div style="width:${isSel?40:32}px;height:${isSel?40:32}px;border-radius:50%;background:#FFFFFF;border:2.5px solid ${isSel?'#1B5E20':pc};display:flex;align-items:center;justify-content:center;font-size:${isSel?13:11}px;font-weight:700;color:${isSel?'#1B5E20':pc};box-shadow:0 0 ${isSel?16:8}px ${isSel?'rgba(27,94,32,0.3)':pc+'30'};transition:all 200ms">
                              ${d.avatar}
                            </div>
                            <div style="margin-top:3px;background:rgba(255,255,255,0.92);border-radius:4px;padding:1px 6px;font-size:8px;font-weight:700;color:${pc};font-family:Inter,sans-serif;white-space:nowrap;border:1px solid ${pc}30">${d.agent.split(' ')[0]}</div>
                          </div>`;
                          el.style.cursor='pointer';
                          el.onclick=(e)=>{e.stopPropagation();setGlobeSelPost(prev=>prev===d.agent?null:d.agent);};
                          return el;
                        }}
                        ringsData={missionPosts.map(p=>({lat:p.lat,lng:p.lng,maxR:p.rate/12,propagationSpeed:1.5,repeatPeriod:1500,color:()=>(p.status==='SELESAI'?C.green:p.status==='REVIEW'?C.orange:C.red)+'50'}))}
                        ringMaxRadius="maxR" ringPropagationSpeed="propagationSpeed" ringRepeatPeriod="repeatPeriod"
                        onGlobeClick={()=>setGlobeSelPost(null)}
                        animateIn={true}
                        pointOfView={{lat:-2.5,lng:118,altitude:2.2}}
                      />
                      {/* Overlay: stats */}
                      <div style={{position:'absolute',top:16,left:16,display:'flex',flexDirection:'column',gap:6}}>
                        {[{l:'Konten',v:missionPosts.length,c:C.primary},{l:'Kota',v:new Set(missionPosts.map(p=>p.city)).size,c:C.teal},{l:'Avg Rate',v:(missionPosts.reduce((s,p)=>s+p.rate,0)/missionPosts.length).toFixed(1)+'%',c:C.green}].map(s=>(
                          <div key={s.l} style={{background:C.surfaceGlass2,backdropFilter:'blur(12px)',borderRadius:8,padding:'8px 14px',border:`1px solid ${C.overlay06}`}}>
                            <p style={{fontSize:10,color:C.textMuted,fontWeight:600,textTransform:'uppercase',letterSpacing:1}}>{s.l}</p>
                            <p style={{fontSize:20,fontWeight:800,color:s.c,fontFamily:"'Space Mono'"}}>{s.v}</p>
                          </div>
                        ))}
                      </div>
                      {/* Click hint */}
                      {!globeSelPost&&(
                        <div style={{position:'absolute',bottom:16,left:'50%',transform:'translateX(-50%)',background:C.surfaceGlass,backdropFilter:'blur(12px)',borderRadius:8,padding:'8px 16px',border:`1px solid ${C.overlay06}`,display:'flex',alignItems:'center',gap:6}}>
                          <MI name="touch_app" size={14} style={{color:C.primary}}/>
                          <span style={{fontSize:11,color:C.textMuted}}>Klik avatar untuk lihat detail postingan</span>
                        </div>
                      )}
                      {/* ── SELECTED POST DETAIL CARD ── */}
                      {selP&&(
                        <div style={{position:'absolute',top:16,right:16,width:320,background:`${C.bg}f2`,backdropFilter:'blur(20px)',borderRadius:12,border:`1px solid ${C.border}`,boxShadow:'0 20px 60px rgba(0,0,0,0.12)',overflow:'hidden',animation:'fadeInUp 250ms ease'}}>
                          {/* Header */}
                          <div style={{background:`linear-gradient(135deg,${C.primaryFaint},transparent)`,padding:'14px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:12}}>
                            <div style={{width:44,height:44,borderRadius:12,background:`${pColor(selP.platform)}20`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700,color:pColor(selP.platform),border:`2px solid ${pColor(selP.platform)}50`,flexShrink:0}}>
                              {selP.avatar}
                            </div>
                            <div style={{flex:1}}>
                              <p style={{fontSize:14,fontWeight:700,color:C.text}}>{selP.agent}</p>
                              <div style={{display:'flex',alignItems:'center',gap:6,marginTop:2}}>
                                <SocialIcon platform={selP.platform} size={12} color={pColor(selP.platform)}/>
                                <span style={{fontSize:11,color:C.textSec}}>{selP.city}</span>
                                <span style={{fontSize:10,color:C.textMuted}}>{selP.date}, {selP.time}</span>
                              </div>
                            </div>
                            <button aria-label="Close post details" onClick={()=>setGlobeSelPost(null)} style={{width:24,height:24,borderRadius:8,border:'none',background:C.overlay06,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                              <MI name="close" size={14} style={{color:C.textSec}}/>
                            </button>
                          </div>
                          {/* Content */}
                          <div style={{padding:'12px 16px'}}>
                            <p style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:8,lineHeight:1.3}}>{selP.title}</p>
                            {/* Content preview */}
                            <div style={{background:C.black,borderRadius:8,height:56,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${C.borderLight}`,marginBottom:12}}>
                              <MI name={selP.platform==='x'?'article':'play_circle'} size={24} style={{color:pColor(selP.platform),opacity:0.3}}/>
                              <span style={{fontSize:11,color:C.textMuted,marginLeft:6}}>{selP.platform==='x'?'Thread':'Video/Image'}</span>
                            </div>
                            {/* Metrics */}
                            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:12}}>
                              {[{l:'Views',v:selP.views,c:C.primary},{l:'Likes',v:selP.likes,c:C.accent},{l:'Comments',v:selP.comments,c:C.secondary},{l:'Shares',v:selP.shares,c:C.orange}].map(s=>(
                                <div key={s.l} style={{background:C.glass,borderRadius:6,padding:'6px 4px',textAlign:'center'}}>
                                  <p style={{fontSize:12,fontWeight:700,color:s.c,fontFamily:"'Space Mono'"}}>{s.v}</p>
                                  <p style={{fontSize:10,color:C.textMuted,fontWeight:600}}>{s.l}</p>
                                </div>
                              ))}
                            </div>
                            {/* Engagement + Status */}
                            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                              <div style={{display:'flex',alignItems:'center',gap:6}}>
                                <div style={{background:selP.rate>15?C.greenLight:selP.rate>10?C.orangeLight:`${C.textSec}1a`,borderRadius:6,padding:'4px 10px'}}>
                                  <span style={{fontSize:16,fontWeight:800,color:selP.rate>15?C.green:selP.rate>10?C.orange:C.textSec,fontFamily:"'Space Mono'"}}>{selP.rate}%</span>
                                </div>
                                <span style={{fontSize:10,color:C.textMuted}}>engagement</span>
                              </div>
                              <span style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:6,background:selP.status==='SELESAI'?C.greenLight:selP.status==='REVIEW'?C.orangeLight:C.redLight,color:selP.status==='SELESAI'?C.green:selP.status==='REVIEW'?C.orange:C.red}}>{selP.status}</span>
                            </div>
                            {/* Liked by */}
                            {selP.likedBy&&selP.likedBy.length>0&&(
                              <div style={{marginTop:12,paddingTop:10,borderTop:`1px solid ${C.border}`}}>
                                <p style={{fontSize:10,fontWeight:700,color:C.textMuted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:6}}>Interaksi dari anggota lain</p>
                                <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                                  {selP.likedBy.map(name=>{
                                    const p2=missionPosts.find(p=>p.agent===name);
                                    return(<div key={name} onClick={()=>setGlobeSelPost(name)} style={{display:'flex',alignItems:'center',gap:4,background:C.glass,borderRadius:6,padding:'3px 8px',cursor:'pointer',border:`1px solid ${C.overlay06}`}}>
                                      <div style={{width:16,height:16,borderRadius:4,background:p2?`${pColor(p2.platform)}20`:C.overlay10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:p2?pColor(p2.platform):C.textSec}}>{p2?.avatar||'?'}</div>
                                      <span style={{fontSize:10,fontWeight:600,color:C.text}}>{name.split(' ')[0]}</span>
                                      <MI name="favorite" size={8} fill style={{color:C.pink}}/>
                                    </div>);
                                  })}
                                  {selP.sharedBy?.map(name=>{
                                    if(selP.likedBy?.includes(name))return null;
                                    const p2=missionPosts.find(p=>p.agent===name);
                                    return(<div key={name+'s'} onClick={()=>setGlobeSelPost(name)} style={{display:'flex',alignItems:'center',gap:4,background:C.glass,borderRadius:6,padding:'3px 8px',cursor:'pointer',border:`1px solid ${C.overlay06}`}}>
                                      <div style={{width:16,height:16,borderRadius:4,background:p2?`${pColor(p2.platform)}20`:C.overlay10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:p2?pColor(p2.platform):C.textSec}}>{p2?.avatar||'?'}</div>
                                      <span style={{fontSize:10,fontWeight:600,color:C.text}}>{name.split(' ')[0]}</span>
                                      <MI name="share" size={8} style={{color:C.secondary}}/>
                                    </div>);
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>);
                  })()}

                  {/* ─── VIEW: TIMELINE ─── */}
                  {monitorView==='timeline'&&(
                    <div style={{padding:24}}>
                      <div style={{position:'relative',paddingLeft:32}}>
                        <div style={{position:'absolute',left:12,top:0,bottom:0,width:2,background:`linear-gradient(to bottom,${C.primary},${C.border})`,borderRadius:1}}/>
                        {[...missionPosts].sort((a,b)=>parseInt(b.date.split(' ')[0])-parseInt(a.date.split(' ')[0])).map((post,i)=>{
                          const stCol=post.status==='SELESAI'?C.green:post.status==='REVIEW'?C.orange:C.red;
                          const ti=interactionMap[post.agent]||{likes:0,shares:0,total:0};
                          return(
                          <div key={i} style={{position:'relative',paddingBottom:i<missionPosts.length-1?20:0}}>
                            <div style={{position:'absolute',left:-24,top:6,width:14,height:14,borderRadius:'50%',background:stCol,border:`3px solid ${C.bg}`,boxShadow:`0 0 10px ${stCol}50`}}/>
                            <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:16,background:C.surfaceLight,borderRadius:12,padding:16,border:`1px solid ${C.border}`,transition:'box-shadow 200ms'}}
                              onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 4px 24px ${stCol}15`}
                              onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
                              <div>
                                <div className="flex items-center gap-2 mb-3">
                                  <div style={{width:32,height:32,borderRadius:8,background:`${pColor(post.platform)}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:pColor(post.platform),border:`1px solid ${pColor(post.platform)}30`}}>{post.avatar}</div>
                                  <div className="flex-1">
                                    <p style={{fontSize:13,fontWeight:700,color:C.text}}>{post.agent}</p>
                                    <div className="flex items-center gap-2">
                                      <SocialIcon platform={post.platform} size={10} color={pColor(post.platform)}/>
                                      <span style={{fontSize:10,color:C.textMuted}}>{post.city} · {post.date}, {post.time}</span>
                                    </div>
                                  </div>
                                  <span style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:6,background:post.status==='SELESAI'?C.greenLight:post.status==='REVIEW'?C.orangeLight:C.redLight,color:stCol}}>{post.status}</span>
                                </div>
                                <p style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:10}}>{post.title}</p>
                                {/* Content preview placeholder */}
                                <div style={{background:C.bg,borderRadius:8,height:48,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${C.border}`,marginBottom:10}}>
                                  <MI name={post.platform==='x'?'article':'play_circle'} size={20} style={{color:pColor(post.platform),opacity:0.4}}/>
                                  <span style={{fontSize:11,color:C.textMuted,marginLeft:6}}>{post.platform==='x'?'Thread Preview':'Video/Image Preview'}</span>
                                </div>
                                {/* Engagement */}
                                <div className="flex gap-4">
                                  {[{l:'Views',v:post.views,ic:'visibility',c:C.primary},{l:'Likes',v:post.likes,ic:'favorite',c:C.pink},{l:'Comments',v:post.comments,ic:'chat_bubble',c:C.teal},{l:'Shares',v:post.shares,ic:'share',c:C.orange}].map(s=>(
                                    <div key={s.l} className="flex items-center gap-1">
                                      <MI name={s.ic} size={12} style={{color:s.c}}/>
                                      <span style={{fontSize:12,fontWeight:700,color:s.c,fontFamily:"'Space Mono'"}}>{s.v}</span>
                                    </div>
                                  ))}
                                  <div style={{marginLeft:'auto',background:post.rate>15?C.greenLight:post.rate>10?C.orangeLight:C.surfaceLight,borderRadius:6,padding:'2px 10px'}}>
                                    <span style={{fontSize:13,fontWeight:800,color:post.rate>15?C.green:post.rate>10?C.orange:C.textSec,fontFamily:"'Space Mono'"}}>{post.rate}%</span>
                                  </div>
                                </div>
                              </div>
                              {/* Right: Social interactions */}
                              <div style={{borderLeft:`1px solid ${C.border}`,paddingLeft:16}}>
                                <div className="flex items-center justify-between mb-3">
                                  <p style={{fontSize:10,fontWeight:700,color:C.textMuted,textTransform:'uppercase',letterSpacing:0.5}}>Interaksi Antar Anggota</p>
                                  <div style={{background:`${C.primary}15`,borderRadius:6,padding:'2px 8px',border:`1px solid ${C.primary}30`}}>
                                    <span style={{fontSize:12,fontWeight:800,color:C.primary,fontFamily:"'Space Mono'"}}>{ti.total}</span>
                                  </div>
                                </div>
                                {post.likedBy&&post.likedBy.length>0&&(
                                  <div style={{marginBottom:10}}>
                                    <div className="flex items-center gap-1 mb-2">
                                      <MI name="favorite" size={12} fill style={{color:C.pink}}/>
                                      <span style={{fontSize:10,fontWeight:600,color:C.pink}}>Liked by ({post.likedBy.length})</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {post.likedBy.map(name=>{
                                        const p2=missionPosts.find(p=>p.agent===name);
                                        return(<div key={name} className="flex items-center gap-2" style={{background:C.bg,borderRadius:6,padding:'4px 8px',border:`1px solid ${C.border}`}}>
                                          {p2&&<SocialIcon platform={p2.platform} size={10} color={pColor(p2.platform)}/>}
                                          <span style={{fontSize:10,fontWeight:600,color:C.text}}>{name.split(' ')[0]}</span>
                                          {p2&&<span style={{fontSize:10,color:C.textMuted}}>{p2.city}</span>}
                                        </div>);
                                      })}
                                    </div>
                                  </div>
                                )}
                                {post.sharedBy&&post.sharedBy.length>0&&(
                                  <div>
                                    <div className="flex items-center gap-1 mb-2">
                                      <MI name="share" size={12} style={{color:C.teal}}/>
                                      <span style={{fontSize:10,fontWeight:600,color:C.teal}}>Shared by ({post.sharedBy.length})</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {post.sharedBy.map(name=>{
                                        const p2=missionPosts.find(p=>p.agent===name);
                                        return(<div key={name} className="flex items-center gap-2" style={{background:C.bg,borderRadius:6,padding:'4px 8px',border:`1px solid ${C.border}`}}>
                                          {p2&&<SocialIcon platform={p2.platform} size={10} color={pColor(p2.platform)}/>}
                                          <span style={{fontSize:10,fontWeight:600,color:C.text}}>{name.split(' ')[0]}</span>
                                          {p2&&<span style={{fontSize:10,color:C.textMuted}}>{p2.city}</span>}
                                        </div>);
                                      })}
                                    </div>
                                  </div>
                                )}
                                {ti.total===0&&<p style={{fontSize:11,color:C.textMuted,fontStyle:'italic'}}>Belum ada interaksi</p>}
                              </div>
                            </div>
                          </div>);
                        })}
                      </div>
                    </div>
                  )}
                </DCard>

                {/* ─── INTERACTION LEADERBOARD ─── */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                  <DCard title="Top Influencer" subtitle="Anggota dengan interaksi tertinggi">
                    {missionPosts.sort((a,b)=>(interactionMap[b.agent]?.total||0)-(interactionMap[a.agent]?.total||0)).map((post,i)=>{
                      const ti=interactionMap[post.agent]||{likes:0,shares:0,total:0};
                      return(
                      <div key={post.agent} className="flex items-center gap-3" style={{padding:'10px 0',borderBottom:i<missionPosts.length-1?`1px solid ${C.borderLight}`:'none'}}>
                        <span style={{fontSize:14,fontWeight:800,color:i===0?C.gold:i===1?C.textSec:i===2?C.orange:C.textMuted,fontFamily:"'Space Mono'",width:24,textAlign:'center'}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`}</span>
                        <div style={{width:32,height:32,borderRadius:8,background:`${pColor(post.platform)}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:pColor(post.platform),border:`1px solid ${pColor(post.platform)}30`}}>{post.avatar}</div>
                        <div className="flex-1">
                          <p style={{fontSize:12,fontWeight:700,color:C.text}}>{post.agent}</p>
                          <div className="flex items-center gap-2">
                            <span style={{fontSize:10,color:C.pink}}><MI name="favorite" size={9} fill style={{verticalAlign:'middle'}}/> {ti.likes}</span>
                            <span style={{fontSize:10,color:C.teal}}><MI name="share" size={9} style={{verticalAlign:'middle'}}/> {ti.shares}</span>
                            <span style={{fontSize:10,color:C.textMuted}}>{post.city}</span>
                          </div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <p style={{fontSize:16,fontWeight:800,color:i===0?C.gold:C.primary,fontFamily:"'Space Mono'"}}>{ti.total}</p>
                          <p style={{fontSize:10,color:C.textMuted}}>interaksi</p>
                        </div>
                      </div>);
                    })}
                  </DCard>

                  <DCard title="Cross-Interaction Flow" subtitle="Alur like & share antar anggota">
                    <div className="flex flex-col gap-2">
                      {arcs.map((arc,i)=>(
                        <div key={i} className="flex items-center gap-2" style={{background:C.surfaceLight,borderRadius:8,padding:'8px 12px',border:`1px solid ${C.border}`}}>
                          <div style={{width:24,height:24,borderRadius:6,background:arc.type==='like'?`${C.pink}15`:`${C.teal}15`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <MI name={arc.type==='like'?'favorite':'share'} size={12} fill={arc.type==='like'} style={{color:arc.type==='like'?C.pink:C.teal}}/>
                          </div>
                          <span style={{fontSize:11,fontWeight:700,color:C.text}}>{arc.label.split(' → ')[0].split(' ')[0]}</span>
                          <MI name="arrow_forward" size={12} style={{color:arc.type==='like'?C.pink:C.teal}}/>
                          <span style={{fontSize:10,fontWeight:700,color:arc.type==='like'?C.pink:C.teal,textTransform:'uppercase',letterSpacing:0.5}}>{arc.type}</span>
                          <MI name="arrow_forward" size={12} style={{color:arc.type==='like'?C.pink:C.teal}}/>
                          <span style={{fontSize:11,fontWeight:700,color:C.text}}>{(arc.label.split(' → ')[2]||'').split(' ')[0]}</span>
                        </div>
                      ))}
                    </div>
                  </DCard>
                </div>
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
                          <td style={{padding:'12px'}}><span style={{fontSize:11,color:C.primary,fontFamily:"'Space Mono'",cursor:'pointer',textDecoration:'underline',textDecorationColor:C.primaryGlow}}>{post.link}</span></td>
                          <td style={{padding:'12px',fontSize:13,fontWeight:700,color:C.text,fontFamily:"'Space Mono'",whiteSpace:'nowrap'}}>{post.views}</td>
                          <td style={{padding:'12px',fontSize:13,fontWeight:600,color:C.text,fontFamily:"'Space Mono'",whiteSpace:'nowrap'}}>{post.likes}</td>
                          <td style={{padding:'12px'}}>
                            <div className="flex items-center gap-2">
                              <ProgressBar progress={post.rate/25} color={post.rate>15?C.green:post.rate>10?C.orange:C.textSec} height={4}/>
                              <span style={{fontSize:11,fontWeight:700,color:post.rate>15?C.green:post.rate>10?C.orange:C.text,fontFamily:"'Space Mono'",whiteSpace:'nowrap'}}>{post.rate}%</span>
                            </div>
                          </td>
                          <td style={{padding:'12px'}}><span style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:4,background:stBg,color:stCol,whiteSpace:'nowrap'}}>{post.status==='SELESAI'?'Selesai':post.status==='REVIEW'?'Direview':'Ditolak'}</span></td>
                          <td style={{padding:'12px'}}>
                            {post.status==='REVIEW'&&(
                              <div className="flex gap-1">
                                <button aria-label="Approve post" onClick={()=>showToast(`Postingan ${post.agent} disetujui!`)} style={{width:28,height:28,borderRadius:8,border:'none',background:C.greenLight,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                  <MI name="check" size={14} style={{color:C.green}}/>
                                </button>
                                <button aria-label="Reject post" onClick={()=>showToast(`Postingan ${post.agent} ditolak`)} style={{width:28,height:28,borderRadius:8,border:'none',background:C.redLight,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                  <MI name="close" size={14} style={{color:C.red}}/>
                                </button>
                              </div>
                            )}
                            {post.status==='SELESAI'&&<span style={{fontSize:10,fontWeight:700,color:C.gold,fontFamily:"'Space Mono'"}}>+{post.xp} XP</span>}
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
                      <div style={{width:40,height:40,borderRadius:12,background:`${pColor(plat)}15`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px'}}>
                        <SocialIcon platform={plat} size={20} color={pColor(plat)}/>
                      </div>
                      <p style={{fontSize:14,fontWeight:700,color:C.text}}>{pName(plat)}</p>
                      <p style={{fontSize:20,fontWeight:800,color:C.text,fontFamily:"'Space Mono'",marginTop:4}}>{posts.length}</p>
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
    {toast&&<div role="alert" className={toastExiting?'toast-exit':'toast-enter'} style={{position:'fixed',bottom:40,left:'50%',transform:'translateX(-50%)',background:`linear-gradient(135deg,${C.primary},${C.primaryAccent})`,padding:'10px 20px',borderRadius:12,fontSize:13,fontWeight:600,color:C.bg,zIndex:100,boxShadow:`0 8px 24px ${C.primaryGlow}`,border:`1px solid ${C.overlay10}`}}>{toast}</div>}
  </>);

  return(
    <div className="flex items-center justify-center noise-bg mesh-bg" style={{minHeight:'100vh',background:C.bg,paddingTop:20,paddingBottom:20,position:'relative',overflow:'hidden'}}>
      {/* Decorative Orbs */}
      <div className="orb orb-1" style={{width:300,height:300,background:'radial-gradient(circle,rgba(249,115,22,0.15),transparent 70%)',top:-50,left:-80}}/>
      <div className="orb orb-2" style={{width:250,height:250,background:'radial-gradient(circle,rgba(249,115,22,0.08),transparent 70%)',bottom:100,right:-60}}/>

      {/* Admin Toggle — top-right corner */}
      <div style={{position:'fixed',top:12,right:12,zIndex:200,display:'flex',alignItems:'center',gap:8}}>
        <button onClick={()=>setMode('admin')} className="btn-admin tap-bounce" style={{padding:'7px 14px',borderRadius:12,border:`1px solid ${C.border}`,background:C.surfaceGlass,backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',color:C.textSec,fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:5,boxShadow:'0 2px 12px rgba(0,0,0,0.08)'}}>
          <MI name="dashboard" size={14} style={{color:C.primary}}/> Admin
        </button>
      </div>

      <div style={{width:390,maxWidth:'100vw',height:844,maxHeight:'calc(100vh - 40px)',background:C.bg,borderRadius:44,overflow:'hidden',position:'relative',border:'1px solid #E2DDD4',boxShadow:'0 20px 60px rgba(0,0,0,0.12)',display:'flex',flexDirection:'column'}}>
        {/* Status Bar */}
        <div className="flex justify-between items-center" style={{padding:'14px 28px 6px',fontSize:12,color:C.text,fontWeight:600,flexShrink:0}}>
          <span style={{fontFamily:"'Space Mono'",fontSize:13,fontWeight:600,color:C.text}}>09:41</span>
          <div style={{width:120,height:30,background:C.text,borderRadius:16,border:`1px solid ${C.overlay06}`}}/>
          <div className="flex gap-1 items-center">
            <MI name="signal_cellular_alt" size={14} style={{color:C.text}}/>
            <MI name="wifi" size={14} style={{color:C.text}}/>
            <MI name="battery_full" size={14} style={{color:C.text}}/>
          </div>
        </div>

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto hide-scrollbar" style={{padding:'4px 16px 8px'}}><div key={k} className="page-enter">{render()}</div></div>

        {/* Bottom Nav */}
        {screen!=='detail'&&(
          <nav className="flex" role="tablist" aria-label="Main navigation" style={{padding:'6px 4px 28px',flexShrink:0,background:'rgba(255,255,255,0.55)',backdropFilter:'blur(24px) saturate(180%)',WebkitBackdropFilter:'blur(24px) saturate(180%)',borderTop:'1px solid rgba(255,255,255,0.45)',boxShadow:'0 -4px 30px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.6)'}}>
            {tabs.map(tab=>{const active=screen===tab.id;return(
              <button key={tab.id} role="tab" aria-selected={active} aria-label={tab.label} onClick={()=>nav(tab.id)} className="flex flex-1 flex-col items-center justify-center gap-0.5 tap-bounce" style={{background:'none',border:'none',cursor:'pointer',padding:'10px 0',minHeight:48,position:'relative'}}>
                <div style={{width:active?30:26,height:active?30:26,borderRadius:active?12:8,background:active?`linear-gradient(135deg,${C.primary},${C.primaryAccent})`:'transparent',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 250ms cubic-bezier(.16,1,.3,1)',boxShadow:active?`0 4px 12px ${C.primaryGlow}`:'none'}}>
                  <MI name={tab.icon} size={18} fill={active} style={{color:active?C.white:C.textMuted,transition:'color 200ms'}}/>
                </div>
                <span style={{fontSize:10,fontWeight:active?700:500,color:active?C.primary:C.textMuted,letterSpacing:0.3,transition:'all 200ms'}}>{tab.label}</span>
                {active&&<div className="nav-dot" style={{position:'absolute',bottom:2,width:4,height:4,borderRadius:2,background:C.primary,boxShadow:`0 0 6px ${C.primary}60`}}/>}
              </button>
            );})}
          </nav>
        )}
      </div>

      {/* Toast */}
      {toast&&<div role="alert" className={toastExiting?'toast-exit':'toast-enter'} style={{position:'fixed',bottom:120,left:'50%',transform:'translateX(-50%)',background:`linear-gradient(135deg,${C.primary},${C.primaryAccent})`,padding:'10px 20px',borderRadius:12,fontSize:13,fontWeight:600,color:C.bg,zIndex:100,boxShadow:`0 8px 24px ${C.primaryGlow}`,border:`1px solid ${C.overlay10}`}}>
        {toast}
      </div>}
    </div>
  );
}

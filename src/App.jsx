import React, { useState, useCallback, useRef, useEffect, useMemo, lazy, Suspense } from 'react';
import Globe from 'react-globe.gl';
import ForceGraph3D from 'react-force-graph-3d';
import { useSpring, animated, useTransition } from '@react-spring/web';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { Player } from '@remotion/player';
import { SplashIntro } from './remotion/scenes/SplashIntro';
import { IndonesiaNetwork } from './remotion/scenes/IndonesiaNetwork';
import { IntroVideo } from './remotion/scenes/IntroVideo';
import { MissionTypes } from './remotion/scenes/MissionTypes';
import { GamifikasiReward } from './remotion/scenes/GamifikasiReward';
import { OperationalFlow } from './remotion/scenes/OperationalFlow';
import { Demographics } from './remotion/scenes/Demographics';
import { ClosingQuote } from './remotion/scenes/ClosingQuote';
import {
  Plus, CirclePlus, UserCog, BarChart3, ArrowLeft, ArrowRight, ChevronRight,
  Sparkles, BatteryFull, Zap, MessageCircle, MessageSquare,
  Check, CheckCircle, X, CloudUpload, Copy, LayoutDashboard, ListChecks,
  Download, Pencil, NotebookPen, Trophy, ChevronDown, ChevronUp,
  Heart, Flag, Quote, Users, History, Hourglass, UserCheck,
  Image, Info, Lightbulb, Link2, Flame, MapPin, Medal, Smile, Crosshair,
  Bell, BellRing, ExternalLink, Palette, Loader, Smartphone,
  Star, Moon, Tag, ThumbsUp, Coins, Pointer, TrendingUp, ShieldCheck,
  Eye, AlertTriangle, Sun, Wifi, Award, Target, User, Home, Store,
  Megaphone, GraduationCap, ShieldAlert, Monitor, Package, FileText, Globe as GlobeIcon,
  CloudDownload, PlayCircle, Upload, LogIn, LogOut, Calendar, CalendarDays,
  Diamond, BarChart, Hand, Camera, Music, Brain, Shield, Video,
  Type, SlidersHorizontal, Ruler, Bookmark, Lock, Repeat, Reply,
  Wallet, ShoppingBag, ArrowLeftRight, Circle, Radio, SquareCheck,
  PartyPopper, Building, QrCode, TreePine, UserPlus, Handshake,
  ScanLine, ArrowUp, MousePointerClick, Map, IdCard, Rocket,
  Save, PiggyBank, Timer, Search, SearchX, Send, Share2, Signal,
  Gauge, Bot, Mic, Landmark, ListTodo, ClipboardList, Coffee,
  HelpCircle, Droplets, CheckSquare, Instagram, Youtube
} from 'lucide-react';

/* ─── PLACEHOLDER IMAGES — Contextual Military SVG ───────────────── */
const AVATAR_COLORS={
  'RD':{bg:'#14532D',accent:'#D97706',gender:'F',img:'/images/avatar-rd.png'},
  'BH':{bg:'#1C1917',accent:'#14532D',gender:'M',img:'/images/avatar-bh.png'},
  'FN':{bg:'#0A2F17',accent:'#1F7542',gender:'M',img:'/images/avatar-fn.png'},
  'AS':{bg:'#14532D',accent:'#991B1B',gender:'M',img:'/images/avatar-as.png'},
  'SU':{bg:'#92400E',accent:'#D97706',gender:'F',img:'/images/avatar-su.png'},
  'RS':{bg:'#0D9488',accent:'#14532D',gender:'F',img:'/images/avatar-rs.png'},
  'DP':{bg:'#44403C',accent:'#D97706',gender:'M',img:'/images/avatar-dp.png'},
  'AR':{bg:'#7C3AED',accent:'#14532D',gender:'M',img:'/images/avatar-ar.png'},
  'NS':{bg:'#0D9488',accent:'#1F7542',gender:'F',img:'/images/avatar-ns.png'},
  'MS':{bg:'#DB2777',accent:'#991B1B',gender:'F'},
  'RP':{bg:'#1C1917',accent:'#D97706',gender:'M'},
  'NP':{bg:'#7C3AED',accent:'#DB2777',gender:'F'},
  'DA':{bg:'#14532D',accent:'#0D9488',gender:'M',img:'/images/avatar-da.png'},
  'TA':{bg:'#991B1B',accent:'#D97706',gender:'M',img:'/images/avatar-ta.png'},
  'WN':{bg:'#44403C',accent:'#14532D',gender:'F'},
  'SN':{bg:'#14532D',accent:'#D97706',gender:'M'},
};
function AvatarImg({initials,size=36,style={}}){
  const c=AVATAR_COLORS[initials]||{bg:'#14532D',accent:'#1F7542',gender:'M'};
  if(c.img)return(<div style={{width:size,height:size,borderRadius:size*0.3,overflow:'hidden',flexShrink:0,...style}}>
    <img src={c.img} alt={initials} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
  </div>);
  return(<div style={{width:size,height:size,borderRadius:size*0.3,background:`linear-gradient(145deg,${c.bg},${c.accent})`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,position:'relative',overflow:'hidden',...style}}>
    <svg width={size*0.7} height={size*0.7} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" fill="rgba(255,255,255,0.85)"/>
      <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="rgba(255,255,255,0.7)"/>
      {c.gender==='M'&&<rect x="9" y="5" width="6" height="1" rx="0.5" fill={c.bg} opacity="0.3"/>}
    </svg>
    <span style={{position:'absolute',bottom:size<30?0:1,right:size<30?0:1,fontSize:Math.max(7,size*0.22),fontWeight:800,color:'rgba(255,255,255,0.6)',lineHeight:1}}>{initials}</span>
  </div>);
}
/* Contextual illustration card for missions/posts/products */
const MISSION_ILLUST={
  1:{icon:'flag',label:'Upacara HUT',bg:'#14532D',accent:'#991B1B',img:'/images/mission-event-hut-tniad.png'},
  2:{icon:'favorite',label:'Bakti Sosial',bg:'#0A2F17',accent:'#D97706',img:'/images/mission-event-baksos.png'},
  3:{icon:'target',label:'Pameran Alutsista',bg:'#1C1917',accent:'#14532D',img:'/images/mission-event-pameran-alutsista.png'},
  4:{icon:'play_circle',label:'Video Reels',bg:'#7C3AED',accent:'#DB2777',img:'/images/mission-konten-video-reels.png'},
  5:{icon:'image',label:'Infografis',bg:'#0D9488',accent:'#14532D',img:'/images/mission-konten-infografis.png'},
  6:{icon:'celebration',label:'Challenge',bg:'#D97706',accent:'#991B1B',img:'/images/mission-konten-challenge.png'},
  7:{icon:'thumb_up',label:'Engagement',bg:'#1DA1F2',accent:'#14532D',img:'/images/mission-engagement-medsos.png'},
  8:{icon:'play_circle',label:'Latihan Gabungan',bg:'#991B1B',accent:'#D97706',img:'/images/mission-engagement-latgab.png'},
  9:{icon:'school',label:'Wawasan Kebangsaan',bg:'#14532D',accent:'#7C3AED',img:'/images/mission-edukasi-wawasan.png'},
  10:{icon:'lightbulb',label:'Relawan Baksos',bg:'#44403C',accent:'#D97706',img:'/images/mission-aksi-relawan.png'},
  11:{icon:'campaign',label:'Modernisasi',bg:'#14532D',accent:'#991B1B',img:'/images/mission-aksi-modernisasi.png'},
  12:{icon:'how_to_reg',label:'Rekrutmen',bg:'#0A2F17',accent:'#D97706',img:'/images/mission-edukasi-rekrutmen.png'},
  13:{icon:'local_fire_department',label:'Bencana Sumatra',bg:'#991B1B',accent:'#D97706',img:'/images/mission-event-bencana-sumatra.png'},
  14:{icon:'favorite',label:'Bantuan TNI',bg:'#14532D',accent:'#991B1B',img:'/images/mission-event-bantuan-tni-sumatra.png'},
  15:{icon:'stars',label:'Kunjungan KASAD',bg:'#1C1917',accent:'#14532D',img:'/images/mission-event-kasad-sumatra.png'},
};
function IllustCard({icon,label,bg='#14532D',accent='#D97706',height=120,style={},img}){
  if(img)return(<div style={{width:'100%',height,position:'relative',overflow:'hidden',...style}}>
    <img src={img} alt={label||''} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
    <div style={{position:'absolute',inset:0,background:'linear-gradient(0deg,rgba(0,0,0,0.35) 0%,transparent 60%)'}}/>
    {label&&<span style={{position:'absolute',bottom:6,left:8,color:'rgba(255,255,255,0.85)',fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',textShadow:'0 1px 3px rgba(0,0,0,0.5)'}}>{label}</span>}
  </div>);
  return(<div style={{width:'100%',height,background:`linear-gradient(135deg,${bg},${accent}40)`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden',...style}}>
    <div style={{position:'absolute',top:-20,right:-20,width:80,height:80,borderRadius:'50%',background:'rgba(255,255,255,0.06)'}}/>
    <div style={{position:'absolute',bottom:-10,left:-10,width:50,height:50,borderRadius:'50%',background:'rgba(255,255,255,0.04)'}}/>
    <MI name={icon} size={32} style={{color:'rgba(255,255,255,0.7)'}}/>
    {label&&<span style={{color:'rgba(255,255,255,0.5)',fontSize:10,fontWeight:700,marginTop:4,letterSpacing:1,textTransform:'uppercase'}}>{label}</span>}
  </div>);
}
const POST_ILLUST={
  video:{icon:'play_circle',bg:'#1C1917',accent:'#991B1B'},
  reels:{icon:'slow_motion_video',bg:'#7C3AED',accent:'#E1306C'},
  thread:{icon:'article',bg:'#1DA1F2',accent:'#14532D'},
  carousel:{icon:'view_carousel',bg:'#E1306C',accent:'#D97706'},
  image:{icon:'image',bg:'#0D9488',accent:'#14532D'},
};

/* ─── ICON (Lucide React) ────────────────────────────────────────── */
const ICON_MAP = {
  add: Plus, add_circle: CirclePlus, admin_panel_settings: UserCog,
  ads_click: MousePointerClick, analytics: BarChart3, arrow_back: ArrowLeft,
  arrow_forward: ArrowRight, arrow_forward_ios: ChevronRight, arrow_upward: ArrowUp,
  auto_awesome: Sparkles, badge: IdCard, bar_chart: BarChart3,
  battery_full: BatteryFull, bolt: Zap, bookmark: Bookmark,
  calendar_month: Calendar, campaign: Megaphone, category: SlidersHorizontal,
  celebration: PartyPopper, chat: MessageCircle, chat_bubble: MessageSquare,
  check: Check, check_circle: CheckCircle, check_box: SquareCheck,
  close: X, cloud_download: CloudDownload, cloud_upload: CloudUpload,
  content_copy: Copy, dashboard: LayoutDashboard, description: FileText,
  diamond: Diamond, done_all: ListChecks, download: Download,
  dark_mode: Moon, edit: Pencil, edit_note: NotebookPen,
  emoji_events: Trophy, event: CalendarDays, expand_more: ChevronDown,
  expand_less: ChevronUp, favorite: Heart, flag: Flag,
  forest: TreePine, format_quote: Quote, front_hand: Hand,
  group: Users, group_add: UserPlus, groups: Users,
  handshake: Handshake, history: History, home: Home,
  hourglass_top: Hourglass, how_to_reg: UserCheck, image: Image,
  info: Info, inventory_2: Package, leaderboard: BarChart,
  lightbulb: Lightbulb, link: Link2, local_fire_department: Flame,
  location_on: MapPin, lock: Lock, login: LogIn, logout: LogOut,
  map: Map, military_tech: Medal, monitor: Monitor, mood: Smile,
  music_note: Music, my_location: Crosshair,
  notifications: Bell, notifications_active: BellRing,
  open_in_new: ExternalLink, palette: Palette, pending: Loader,
  person: User, person_add: UserPlus, person_check: UserCheck,
  phone_iphone: Smartphone, photo_camera: Camera, play_circle: PlayCircle,
  priority_high: AlertTriangle, psychology: Brain, public: GlobeIcon,
  qr_code: QrCode, qr_code_scanner: ScanLine, rate_review: Star,
  record_voice_over: Mic, refresh: Repeat, repeat: Repeat, reply: Reply,
  rocket_launch: Rocket, save: Save, savings: PiggyBank,
  schedule: Timer, school: GraduationCap, search: Search, search_off: SearchX,
  security: Shield, send: Send, share: Share2,
  shopping_bag: ShoppingBag, signal_cellular_alt: Signal,
  slow_motion_video: Video, smart_toy: Bot, speed: Gauge,
  star: Star, stars: Award, storefront: Store, swap_horiz: ArrowLeftRight,
  tag: Tag, target: Target, text_fields: Type, thumb_up: ThumbsUp,
  timer: Timer, toll: Coins, touch_app: Pointer, trending_up: TrendingUp,
  tune: SlidersHorizontal, upload: Upload, upload_file: Upload,
  verified: ShieldCheck, videocam: Video, view_carousel: Image,
  visibility: Eye, volcano: Flame, warning: AlertTriangle,
  warning_amber: AlertTriangle, waving_hand: Hand, wb_sunny: Sun,
  whatshot: Flame, wifi: Wifi, wifi_tethering: Radio,
  workspace_premium: Award, account_balance_wallet: Wallet,
  article: FileText, block: ShieldAlert, business: Building,
  monitoring: Eye, radio_button_unchecked: Circle,
  aspect_ratio: Ruler, styler: IdCard, checkroom: IdCard,
  account_balance: Landmark, add_task: ListTodo, assignment: ClipboardList,
  coffee: Coffee, help: HelpCircle, water_drop: Droplets,
  task_alt: CheckSquare, sentiment_satisfied: Smile,
  facebook: GlobeIcon, instagram: Instagram, tiktok: Music, x: MessageSquare, youtube: Youtube,
};

function MI({ name, size=24, fill=false, style={} }) {
  const IconComp = ICON_MAP[name];
  if (!IconComp) return <span style={{ display:'inline-flex', width:size, height:size, alignItems:'center', justifyContent:'center', fontSize:size*0.6, color:style.color||'currentColor', ...style }}>?</span>;
  return <IconComp size={size} strokeWidth={fill?1.5:1.75} fill={fill?'currentColor':'none'} style={{ display:'inline-block', verticalAlign:'middle', lineHeight:1, flexShrink:0, ...style }} />;
}

/* ─── TOOLTIP ────────────────────────────────────────────────────── */
function Tip({children,text}){
  const [show,setShow]=useState(false);
  return(<span style={{position:'relative',display:'inline-flex',alignItems:'center',cursor:'pointer'}} onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)} onClick={()=>setShow(s=>!s)}>
    {children}
    {show&&<span style={{position:'absolute',bottom:'calc(100% + 6px)',left:'50%',transform:'translateX(-50%)',background:C.surfaceDark,color:C.textLight,fontSize:11,fontWeight:500,padding:'6px 10px',borderRadius:8,whiteSpace:'nowrap',maxWidth:200,textAlign:'center',lineHeight:1.3,boxShadow:`0 4px 12px ${C.shadow}`,border:`1px solid ${C.overlay10}`,zIndex:50,pointerEvents:'none',animation:'fadeInUp 150ms ease'}}>{text}</span>}
  </span>);
}

/* ─── SINAR LOGO SVG ─────────────────────────────────────────────── */
function SinarMark({size=28}){return(
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <defs>
      <linearGradient id="smark" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#14532D"/>
        <stop offset="100%" stopColor="#1F7542"/>
      </linearGradient>
      <linearGradient id="sray" x1="20" y1="0" x2="20" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#D97706"/>
        <stop offset="100%" stopColor="#F59E0B"/>
      </linearGradient>
      <linearGradient id="sred" x1="20" y1="0" x2="20" y2="10" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#991B1B"/>
        <stop offset="100%" stopColor="#B91C1C"/>
      </linearGradient>
    </defs>
    {/* Shield shape */}
    <path d="M20 3 L36 10 L36 22 C36 30 28 36 20 38 C12 36 4 30 4 22 L4 10 Z" fill="url(#smark)"/>
    <path d="M20 3 L36 10 L36 22 C36 30 28 36 20 38 C12 36 4 30 4 22 L4 10 Z" fill="white" opacity="0.06"/>
    {/* Red top accent stripe */}
    <path d="M20 3 L36 10 L4 10 Z" fill="url(#sred)" opacity="0.6"/>
    {/* Light rays (sinar) */}
    <path d="M20 13 L22 18 L20 17 L18 18 Z" fill="url(#sray)" opacity="0.9"/>
    <path d="M20 13 L24 20 L20 18.5 L16 20 Z" fill="url(#sray)" opacity="0.5"/>
    {/* Star center */}
    <circle cx="20" cy="22" r="4" fill="url(#sray)" opacity="0.85"/>
    <circle cx="20" cy="22" r="2" fill="white" opacity="0.4"/>
    {/* Bottom rays */}
    <path d="M14 26 L20 24 L26 26 L20 32 Z" fill="white" opacity="0.12"/>
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
  bg:'#F5F3EE', bgCard:'#FFFFFF', white:'#FFFFFF', black:'#1A1814',
  primary:'#1B4332', primaryLight:'rgba(27,67,50,0.08)', primaryMid:'rgba(27,67,50,0.15)', primaryDark:'#0B2619',
  primaryGlow:'rgba(27,67,50,0.15)', primaryFaint:'rgba(27,67,50,0.04)', primaryHover:'rgba(27,67,50,0.06)',
  primaryAccent:'#2D6A4F',
  secondary:'#1A1814', secondaryLight:'rgba(26,24,20,0.08)', secondaryGlow:'rgba(26,24,20,0.15)',
  accent:'#B8860B', accentLight:'rgba(184,134,11,0.08)', accentGlow:'rgba(184,134,11,0.15)',
  patriot:'#8B1A1A', patriotLight:'rgba(139,26,26,0.08)', patriotGlow:'rgba(139,26,26,0.15)',
  text:'#1A1814', textLight:'#2C2820', textSec:'#3D3929', textMuted:'#6B6555', textDark:'#524E42',
  border:'#DDD9D0', borderLight:'rgba(0,0,0,0.06)',
  overlay06:'rgba(0,0,0,0.03)', overlay08:'rgba(0,0,0,0.04)', overlay10:'rgba(0,0,0,0.06)', overlay15:'rgba(0,0,0,0.08)',
  shadow:'rgba(0,0,0,0.08)', shadowLight:'rgba(0,0,0,0.04)', backdrop:'rgba(0,0,0,0.4)',
  green:'#16A34A', greenLight:'rgba(22,163,74,0.08)',
  red:'#8B1A1A', redLight:'rgba(139,26,26,0.08)',
  orange:'#C2410C', orangeLight:'rgba(194,65,12,0.08)',
  purple:'#6D28D9', purpleLight:'rgba(109,40,217,0.08)',
  pink:'#BE185D', pinkLight:'rgba(190,24,93,0.08)',
  teal:'#0F766E', tealLight:'rgba(15,118,110,0.08)',
  gold:'#B8860B', goldLight:'rgba(184,134,11,0.1)',
  silver:'#6B6555', bronze:'#8B6914',
  glass:'rgba(255,255,255,0.88)', glassBorder:'rgba(184,134,11,0.1)',
  surface:'rgba(255,255,255,0.88)', surfaceLight:'rgba(245,243,238,0.8)', surfaceDark:'#EDE9E0',
  surfaceGlass:'rgba(255,255,255,0.72)', surfaceGlass2:'rgba(255,255,255,0.88)',
};

/* ─── ACCOUNT TYPES ─────────────────────────────────────────────── */
const ACCOUNT_TYPES={
  prajurit:{label:'Prajurit',desc:'Anggota TNI AD aktif',color:C.primary,icon:'military_tech',xpMultiplier:1,missionTypes:['EVENT','KONTEN','ENGAGEMENT','EDUKASI','AKSI']},
  suami:{label:'Suami',desc:'Suami prajurit TNI AD',color:C.accent,icon:'favorite',xpMultiplier:0.7,missionTypes:['EVENT','KONTEN','ENGAGEMENT']},
  istri:{label:'Istri',desc:'Istri prajurit TNI AD',color:C.teal,icon:'favorite',xpMultiplier:0.7,missionTypes:['EVENT','KONTEN','ENGAGEMENT']},
  anak:{label:'Anak',desc:'Anak prajurit TNI AD',color:C.purple,icon:'school',xpMultiplier:0.5,missionTypes:['KONTEN','ENGAGEMENT']},
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

/* ─── INDONESIA MISSION MAP DATA ─────────────────────────────────── */
const INDONESIA_GEO_URL='https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const KODAM_ZONES=[
  {id:'kodam-jaya',name:'Kodam Jaya',city:'Jakarta',coords:[106.845,-6.208],missions:12,active:8,agents:48200,status:'hot'},
  {id:'kodam-siliwangi',name:'Kodam III/Siliwangi',city:'Bandung',coords:[107.619,-6.917],missions:9,active:6,agents:38100,status:'hot'},
  {id:'kodam-diponegoro',name:'Kodam IV/Diponegoro',city:'Semarang',coords:[110.420,-6.966],missions:8,active:5,agents:35400,status:'warm'},
  {id:'kodam-brawijaya',name:'Kodam V/Brawijaya',city:'Surabaya',coords:[112.751,-7.250],missions:10,active:7,agents:41200,status:'hot'},
  {id:'kodam-bukit-barisan',name:'Kodam I/Bukit Barisan',city:'Medan',coords:[98.672,3.595],missions:6,active:3,agents:28700,status:'warm'},
  {id:'kodam-sriwijaya',name:'Kodam II/Sriwijaya',city:'Palembang',coords:[104.746,-2.991],missions:5,active:3,agents:22300,status:'warm'},
  {id:'kodam-tanjungpura',name:'Kodam XII/Tanjungpura',city:'Pontianak',coords:[109.343,-0.026],missions:4,active:2,agents:18600,status:'cool'},
  {id:'kodam-merdeka',name:'Kodam XIII/Merdeka',city:'Manado',coords:[124.842,1.455],missions:3,active:2,agents:15200,status:'cool'},
  {id:'kodam-hasanuddin',name:'Kodam XIV/Hasanuddin',city:'Makassar',coords:[119.432,-5.148],missions:5,active:3,agents:24800,status:'warm'},
  {id:'kodam-pattimura',name:'Kodam XVI/Pattimura',city:'Ambon',coords:[128.174,-3.694],missions:2,active:1,agents:8400,status:'cool'},
  {id:'kodam-cenderawasih',name:'Kodam XVII/Cenderawasih',city:'Jayapura',coords:[140.718,-2.537],missions:3,active:1,agents:12100,status:'cool'},
  {id:'kodam-kasuari',name:'Kodam XVIII/Kasuari',city:'Manokwari',coords:[134.084,-0.862],missions:2,active:1,agents:6800,status:'cool'},
  {id:'kodam-udayana',name:'Kodam IX/Udayana',city:'Denpasar',coords:[115.219,-8.650],missions:4,active:2,agents:19500,status:'warm'},
  {id:'kodam-iskandar-muda',name:'Kodam IM',city:'Banda Aceh',coords:[95.322,5.548],missions:3,active:2,agents:14200,status:'cool'},
  {id:'kodam-mulawarman',name:'Kodam VI/Mulawarman',city:'Balikpapan',coords:[116.831,-1.238],missions:4,active:2,agents:16900,status:'warm'},
];
const mapStatusColor=s=>({hot:C.patriot,warm:C.accent,cool:C.primary}[s]||C.primary);
const mapStatusPulse=s=>s==='hot';

/* ─── INDONESIA MISSION MAP COMPONENT ────────────────────────────── */
function IndonesiaMissionMap({onSelectZone,large}){
  const [hoveredZone,setHoveredZone]=useState(null);
  const [mapFilter,setMapFilter]=useState('all'); // all, hot, warm, cool
  const filtered=mapFilter==='all'?KODAM_ZONES:KODAM_ZONES.filter(z=>z.status===mapFilter);
  const totalMissions=KODAM_ZONES.reduce((a,z)=>a+z.missions,0);
  const totalActive=KODAM_ZONES.reduce((a,z)=>a+z.active,0);
  const totalAgents=KODAM_ZONES.reduce((a,z)=>a+z.agents,0);
  const mapH=large?380:220;

  return(
    <div style={{borderRadius:16,overflow:'hidden',background:C.bgCard,border:`1px solid ${C.border}`,position:'relative'}}>
      {/* Header */}
      <div style={{padding:'14px 16px 8px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <h3 style={{fontSize:14,fontWeight:700,color:C.text,display:'flex',alignItems:'center',gap:6}}>
            <MI name="map" size={16} style={{color:C.primary}}/> Peta Operasi Nasional
          </h3>
          <p style={{fontSize:10,color:C.textMuted,marginTop:2}}>37 Kodam (2026) · {totalMissions} Misi · {(totalAgents/1000).toFixed(1)}K Personel</p>
        </div>
        <div className="flex gap-1">
          {[{id:'all',label:'Semua'},{id:'hot',label:'Aktif',color:C.patriot},{id:'warm',label:'Siaga',color:C.accent},{id:'cool',label:'Normal',color:C.primary}].map(f=>(
            <button key={f.id} onClick={()=>setMapFilter(f.id)} className="tap-bounce" style={{
              padding:'4px 10px',borderRadius:6,fontSize:10,fontWeight:mapFilter===f.id?700:500,
              background:mapFilter===f.id?(f.color||C.primary)+'15':'transparent',
              color:mapFilter===f.id?(f.color||C.primary):C.textMuted,
              border:`1px solid ${mapFilter===f.id?(f.color||C.primary)+'30':C.border}`,
              cursor:'pointer',transition:'all 150ms',
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Map — scrollable container */}
      <div style={{position:'relative',height:mapH,overflow:'auto',cursor:'grab'}} onMouseDown={e=>{e.currentTarget.style.cursor='grabbing'}} onMouseUp={e=>{e.currentTarget.style.cursor='grab'}}>
        {/* Google Maps-style light background */}
        <div style={{position:'absolute',inset:0,width:large?'130%':'100%',height:'100%',background:'linear-gradient(180deg,#E8F0E8 0%,#D4E4D4 30%,#C8DCD0 60%,#B8D4C8 100%)'}}/>
        {/* Water/ocean areas */}
        <div style={{position:'absolute',inset:0,width:large?'130%':'100%',height:'100%',background:'radial-gradient(ellipse 50% 40% at 30% 70%,rgba(147,197,210,0.4),transparent 60%), radial-gradient(ellipse 40% 50% at 75% 30%,rgba(147,197,210,0.3),transparent 50%)',pointerEvents:'none'}}/>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{center:[118,-2.5],scale:large?1200:900}}
          style={{width:large?'130%':'100%',height:'100%',position:'relative',zIndex:1}}
          width={large?600:400} height={mapH}
        >
          <Geographies geography={INDONESIA_GEO_URL}>
            {({geographies})=>geographies.filter(g=>g.properties.name==='Indonesia').map(geo=>(
              <Geography key={geo.rsmKey} geography={geo}
                fill="rgba(200,220,200,0.6)" stroke="rgba(20,83,45,0.25)" strokeWidth={0.8}
                style={{default:{outline:'none'},hover:{outline:'none',fill:'rgba(180,210,180,0.7)'},pressed:{outline:'none'}}}
              />
            ))}
          </Geographies>

          {filtered.map(zone=>{
            const col=mapStatusColor(zone.status);
            const isHovered=hoveredZone===zone.id;
            const r=Math.max(4,Math.min(12,zone.agents/5000));
            return(
              <Marker key={zone.id} coordinates={zone.coords}
                onMouseEnter={()=>setHoveredZone(zone.id)}
                onMouseLeave={()=>setHoveredZone(null)}
                onClick={()=>onSelectZone&&onSelectZone(zone)}
                style={{cursor:'pointer'}}
              >
                {mapStatusPulse(zone.status)&&(
                  <circle r={r+6} fill={col} opacity={0.15} className="dot-live"/>
                )}
                <circle r={isHovered?r+2:r} fill={col} opacity={isHovered?0.9:0.7}
                  stroke={C.white} strokeWidth={1.5}
                  style={{transition:'r 200ms ease, opacity 200ms ease',filter:`drop-shadow(0 0 ${isHovered?6:3}px ${col}80)`}}
                />
                {(isHovered||zone.status==='hot')&&(
                  <text textAnchor="middle" y={-r-6} style={{
                    fontSize:8,fontWeight:700,fill:C.text,fontFamily:"'Inter'",
                    textShadow:'0 0 4px white, 0 0 4px white, 0 0 4px white',
                  }}>{zone.city}</text>
                )}
              </Marker>
            );
          })}
        </ComposableMap>

        {/* Hover tooltip */}
        {hoveredZone&&(()=>{
          const z=KODAM_ZONES.find(zn=>zn.id===hoveredZone);
          if(!z) return null;
          return(
            <div style={{position:'absolute',bottom:8,left:8,right:8,background:C.glass,backdropFilter:'blur(12px)',
              WebkitBackdropFilter:'blur(12px)',borderRadius:10,padding:'10px 12px',
              border:`1px solid ${mapStatusColor(z.status)}30`,
              boxShadow:`0 4px 16px rgba(0,0,0,0.08)`,zIndex:10,
              animation:'fadeInUp 150ms ease',
            }}>
              <div className="flex items-center justify-between">
                <div>
                  <p style={{fontSize:12,fontWeight:700,color:C.text}}>{z.name}</p>
                  <p style={{fontSize:10,color:C.textMuted}}>{z.city}</p>
                </div>
                <div style={{padding:'3px 8px',borderRadius:6,fontSize:10,fontWeight:700,
                  background:mapStatusColor(z.status)+'15',color:mapStatusColor(z.status),
                  border:`1px solid ${mapStatusColor(z.status)}30`,textTransform:'uppercase',
                }}>{z.status==='hot'?'Aktif':z.status==='warm'?'Siaga':'Normal'}</div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div style={{textAlign:'center'}}>
                  <p style={{fontSize:14,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'"}}>{z.missions}</p>
                  <p style={{fontSize:9,color:C.textMuted}}>Misi</p>
                </div>
                <div style={{textAlign:'center'}}>
                  <p style={{fontSize:14,fontWeight:800,color:C.green,fontFamily:"'JetBrains Mono'"}}>{z.active}</p>
                  <p style={{fontSize:9,color:C.textMuted}}>Aktif</p>
                </div>
                <div style={{textAlign:'center'}}>
                  <p style={{fontSize:14,fontWeight:800,color:C.accent,fontFamily:"'JetBrains Mono'"}}>{(z.agents/1000).toFixed(1)}K</p>
                  <p style={{fontSize:9,color:C.textMuted}}>Personel</p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Legend + Summary */}
      <div style={{padding:'10px 16px 14px',borderTop:`1px solid ${C.borderLight}`}}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {[{label:'Aktif',color:C.patriot},{label:'Siaga',color:C.accent},{label:'Normal',color:C.primary}].map(l=>(
              <div key={l.label} className="flex items-center gap-1.5">
                <div style={{width:8,height:8,borderRadius:'50%',background:l.color,boxShadow:`0 0 4px ${l.color}60`}}/>
                <span style={{fontSize:10,color:C.textMuted,fontWeight:500}}>{l.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <div style={{width:6,height:6,borderRadius:'50%',background:C.green}} className="dot-live"/>
            <span style={{fontSize:10,fontWeight:600,color:C.green}}>{totalActive} aktif</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── DATA ───────────────────────────────────────────────────────── */

const MISSIONS=[
  /* ─── EVENT — Kehadiran fisik TNI AD ─── */
  {id:1,type:'EVENT',title:'Upacara HUT TNI AD ke-81 di Mabes AD',
    desc:'Hadir dan dokumentasikan upacara peringatan HUT TNI AD. Abadikan momen kebanggaan prajurit dan showcase alutsista.',
    xp:400,bonus:100,participants:89,status:'TERBUKA',deadline:'22 Apr 2026',
    analytics:{completion:32,avgTime:'4.5 jam',topCity:'Jakarta',reach:'12.4K',engagement:'8.2%',sentiment:72,conversionRate:'18%'},
    eventSpec:{location:'Markas Besar TNI AD, Jl. Veteran III, Jakarta Pusat',date:'22 Apr 2026, 07:00',capacity:500,checkin:'QR Code + ID',lat:-6.1753,lng:106.8290,note:'Seragam rapih, bawa ID resmi. Parkir di area yang ditentukan.'},
    contentSpec:{format:'Foto + Video',minPhotos:10,videoDuration:'60-180 detik',note:'Foto: barisan prajurit, alutsista, pejabat, suasana khidmat.'},
    templates:['Dirgahayu TNI AD ke-81! Prajurit tangguh, rakyat terlindungi.']},
  {id:2,type:'EVENT',title:'Bakti Sosial TNI AD — Operasi Pembangunan Desa',
    desc:'Dokumentasikan kegiatan bakti sosial prajurit TNI AD di desa tertinggal. Tunjukkan sisi kemanusiaan TNI AD.',
    xp:500,bonus:100,participants:45,status:'TERBUKA',deadline:'28 Mar 2026',
    analytics:{completion:40,avgTime:'6.0 jam',topCity:'Cianjur',reach:'8.7K',engagement:'11.5%',sentiment:85,conversionRate:'22%'},
    eventSpec:{location:'Desa Sukamanah, Kab. Cianjur',date:'28 Mar 2026, 06:00',capacity:80,checkin:'GPS + Selfie',lat:-6.8204,lng:107.1414,note:'Koordinasi dengan Kodim 0608. Bawa perlengkapan lapangan.'},
    contentSpec:{format:'Foto + Video',minPhotos:8,videoDuration:'60-120 detik',note:'Foto: prajurit membantu warga, pembangunan, interaksi hangat TNI-rakyat.'},
    templates:['TNI AD hadir untuk rakyat. Bersama kita membangun desa!']},
  {id:3,type:'EVENT',title:'Pameran Alutsista & Open Base Kodam Jaya',
    desc:'Liput pameran alutsista TNI AD yang terbuka untuk publik. Dokumentasikan antusiasme masyarakat dan kecanggihan peralatan militer Indonesia.',
    xp:350,bonus:50,participants:72,status:'SIAGA',deadline:'15 Apr 2026',
    analytics:{completion:18,avgTime:'3.5 jam',topCity:'Jakarta',reach:'5.3K',engagement:'6.1%',sentiment:68,conversionRate:'12%'},
    eventSpec:{location:'Lapangan Kodam Jaya, Kramat Jati',date:'15 Apr 2026, 08:00',capacity:300,checkin:'QR Code',lat:-6.2756,lng:106.8696,note:'Terbuka untuk umum. Bawa keluarga!'},
    contentSpec:{format:'Foto + Video',minPhotos:6,note:'Foto: alutsista, pengunjung antusias, prajurit menjelaskan alat.'},
    templates:['Keren banget! Pameran alutsista TNI AD buat publik. Bangga jadi Indonesia!']},

  /* ─── KONTEN — Content creation TNI AD ─── */
  {id:4,type:'KONTEN',title:'Video Reels: Hari-Hari Prajurit TNI AD',
    desc:'Buat video menarik tentang keseharian prajurit TNI AD — latihan, kehidupan barak, kedisiplinan, dan momen humanis. Tunjukkan sisi inspiratif tentara kita.',
    xp:350,bonus:75,participants:134,status:'TERBUKA',deadline:'25 Mar 2026',
    analytics:{completion:62,avgTime:'2.5 jam',topCity:'Bandung',reach:'45.2K',engagement:'18.7%',sentiment:91,conversionRate:'35%'},
    kontenSpec:{format:'Video (portrait 9:16)',duration:'30-90 detik',platform:['Instagram','TikTok','YouTube Shorts'],hashtags:['#TNIAD','#PrajuritHebat','#TNIADUntukRakyat','#DISPENAD'],guidelines:['Min 30 detik durasi','Musik patriotik atau trending audio','Text overlay fakta/caption','Tone positif & inspiratif, bukan propaganda']},
    templates:['Tahukah kamu? Prajurit TNI AD bukan cuma latihan perang, tapi juga bantu masyarakat setiap hari!'],
    exampleMedia:[{type:'video',label:'Contoh konten TNI AD viral',desc:'Video behind-the-scenes kehidupan prajurit'}]},
  {id:5,type:'KONTEN',title:'Infografis: Peran TNI AD dalam Bencana Alam',
    desc:'Buat infografis dengan data resmi tentang kontribusi TNI AD dalam penanggulangan bencana alam di Indonesia. Sertakan data jumlah misi, korban tertolong, dan wilayah terjangkau.',
    xp:300,participants:56,status:'TERBUKA',deadline:'5 Apr 2026',
    analytics:{completion:35,avgTime:'3.0 jam',topCity:'Yogyakarta',reach:'9.8K',engagement:'7.4%',sentiment:76,conversionRate:'15%'},
    kontenSpec:{format:'Gambar / Carousel',duration:null,platform:['Instagram','X','Facebook'],hashtags:['#TNIAD','#SiagaBencana','#TNIADPeduli','#DISPENAD'],guidelines:['Min 3 slide untuk carousel','Data dari sumber resmi TNI AD/BNPB','Design profesional & mudah dibaca','Sertakan logo TNI AD']},
    templates:['Fakta: TNI AD sudah menyelamatkan ribuan korban bencana di 2025. Ini datanya:'],
    exampleMedia:[{type:'image',label:'Template infografis TNI AD',desc:'Referensi layout dan warna resmi'}]},
  {id:6,type:'KONTEN',title:'Challenge #BanggaTNIAD — Video Apresiasi Prajurit',
    desc:'Buat video kreatif untuk mengapresiasi perjuangan prajurit TNI AD. Ceritakan pengalaman positifmu dengan TNI AD atau tunjukkan rasa bangga terhadap tentara kita.',
    xp:300,bonus:50,participants:215,status:'TERBUKA',deadline:'30 Mar 2026',
    analytics:{completion:75,avgTime:'1.5 jam',topCity:'Jakarta',reach:'128K',engagement:'24.3%',sentiment:94,conversionRate:'42%'},
    kontenSpec:{format:'Video (portrait 9:16)',duration:'15-60 detik',platform:['TikTok','Instagram'],hashtags:['#BanggaTNIAD','#TNIAD','#PrajuritKebanggaan','#DISPENAD'],guidelines:['Min 15 detik konten original','Ceritakan kisah personal','Tantang 3 teman untuk ikutan','Gunakan audio patriotik']},
    templates:['Aku bangga sama TNI AD karena... #BanggaTNIAD']},

  /* ─── ENGAGEMENT — Like, share, comment konten TNI AD ─── */
  {id:7,type:'ENGAGEMENT',title:'Dukung Konten Resmi DISPENAD di Medsos',
    desc:'Like, comment positif, dan share postingan resmi akun TNI AD. Bantu viralkan pesan positif tentang TNI AD.',
    xp:200,participants:178,status:'TERBUKA',deadline:'20 Mar 2026',
    analytics:{completion:65,avgTime:'1.5 jam',topCity:'Surabaya',reach:'67.5K',engagement:'15.8%',sentiment:78,conversionRate:'28%'},
    engagementSpec:{actions:['Like post resmi','Tulis komentar positif & relevan (min 10 kata)','Share/repost ke akun pribadi'],targetPosts:3,note:'Komentar harus natural, relevan, dan positif. Hindari komentar generik/spam.'},
    refPosts:[
      {platform:'instagram',handle:'@dispenad_tniad',avatar:'DA',author:'TNI AD',time:'2h ago',content:'Prajurit Kodam IV/Diponegoro bantu warga terdampak banjir di Demak. TNI AD selalu hadir untuk rakyat!',image:true,img:'/images/post-dispenad-banjir-demak.png',likes:'18.7K',comments:'2.3K',shares:'5.4K',actions:['like','comment','share']},
      {platform:'x',handle:'@dispenad_tniad',avatar:'DA',author:'TNI AD',time:'5h ago',content:'Thread: 7 Fakta Tentang Modernisasi Alutsista TNI AD 2026 yang Bikin Bangga',likes:'8.3K',comments:'1.1K',shares:'4.1K',actions:['like','repost','reply']},
      {platform:'tiktok',handle:'@tniad_official',avatar:'TA',author:'TNI AD Official',time:'1d ago',content:'POV: Kamu lihat prajurit TNI AD nolong nenek di jalan',image:true,img:'/images/post-tiktok-dispenad-nenek.png',likes:'245K',comments:'18.2K',shares:'32K',actions:['like','comment','share']},
    ],templates:['TNI AD selalu hadir untuk rakyat. Terima kasih prajurit! 🫡']},
  {id:8,type:'ENGAGEMENT',title:'Viralkan Video Latihan Gabungan TNI AD',
    desc:'Like dan share video latihan gabungan TNI AD yang menunjukkan profesionalisme dan kesiapan tempur prajurit Indonesia.',
    xp:180,bonus:30,participants:203,status:'TERBUKA',deadline:'18 Mar 2026',
    analytics:{completion:82,avgTime:'1.2 jam',topCity:'Jakarta',reach:'185K',engagement:'22.1%',sentiment:96,conversionRate:'38%'},
    engagementSpec:{actions:['Like video','Share ke story/feed dengan caption personal','Tag 3 teman'],targetPosts:2,note:'Tunjukkan rasa bangga dalam caption personal'},
    templates:['Keren abis! Latihan gabungan TNI AD bikin bangga. Indonesia kuat! 💪🇮🇩']},

  /* ─── EDUKASI — Distribusi materi TNI AD ─── */
  {id:9,type:'EDUKASI',title:'Sebarkan Materi Wawasan Kebangsaan TNI AD',
    desc:'Distribusikan materi edukasi tentang peran TNI AD dalam menjaga kedaulatan NKRI ke grup komunitas. Termasuk infografis sejarah TNI AD dan program TMMD.',
    xp:250,bonus:50,participants:145,status:'TERBUKA',deadline:'22 Mar 2026',
    analytics:{completion:68,avgTime:'2.0 jam',topCity:'Jakarta',reach:'34.2K',engagement:'12.6%',sentiment:82,conversionRate:'25%'},
    edukasiSpec:{material:'Infografis + Video Singkat DISPENAD',channels:['WhatsApp','Telegram'],minGroups:5,minGroupSize:20,note:'Kirim ke grup komunitas, alumni, atau keluarga dengan min 20 anggota'},
    templates:['Tahukah kamu peran penting TNI AD dalam menjaga NKRI? Simak faktanya di sini! Sumber: TNI AD','TNI AD bukan hanya menjaga perbatasan, tapi juga aktif membantu masyarakat melalui program TMMD. Ini buktinya!'],
    exampleMedia:[{type:'image',label:'Infografis Peran TNI AD',desc:'Materi resmi DISPENAD untuk distribusi'}]},
  {id:12,type:'EDUKASI',title:'Sosialisasi Rekrutmen Prajurit TNI AD 2026',
    desc:'Bantu sebarkan informasi rekrutmen prajurit TNI AD ke kalangan anak muda. Distribusikan poster dan persyaratan resmi ke grup-grup komunitas.',
    xp:200,participants:98,status:'TERBUKA',deadline:'15 Apr 2026',
    analytics:{completion:42,avgTime:'1.8 jam',topCity:'Semarang',reach:'15.6K',engagement:'9.3%',sentiment:71,conversionRate:'19%'},
    edukasiSpec:{material:'Poster Rekrutmen + FAQ PDF',channels:['WhatsApp','Telegram','Instagram'],minGroups:3,minGroupSize:15,note:'Target: grup pemuda, alumni SMA/SMK, komunitas olahraga'},
    templates:['Mau jadi prajurit TNI AD? Ini persyaratan dan jadwal pendaftaran 2026. Info resmi dari DISPENAD!']},

  /* ─── AKSI — Aksi langsung bersama masyarakat ─── */
  {id:10,type:'AKSI',title:'Rekrutmen Relawan Pendukung Baksos TNI AD',
    desc:'Bantu koordinasi relawan sipil untuk mendukung kegiatan bakti sosial TNI AD di wilayah terdampak bencana.',
    xp:350,participants:67,status:'SIAGA',deadline:'25 Mar 2026',
    analytics:{completion:30,avgTime:'4.5 jam',topCity:'Makassar',reach:'6.1K',engagement:'5.8%',sentiment:65,conversionRate:'10%'},
    aksiSpec:{actionType:'Rekrutmen Relawan Sipil',target:100,unit:'relawan',method:'Online form + koordinasi Kodim',area:'Indonesia Timur',note:'Relawan akan berkoordinasi dengan satuan TNI AD setempat'},
    templates:['Mari bergabung sebagai relawan pendukung baksos TNI AD! Daftar sekarang melalui link resmi berikut.']},
  {id:11,type:'AKSI',title:'Kampanye Dukung Modernisasi Alutsista TNI AD',
    desc:'Galang dukungan publik untuk modernisasi alutsista TNI AD melalui petisi digital dan penyebaran informasi tentang pentingnya pertahanan negara.',
    xp:250,bonus:50,participants:412,status:'TERBUKA',deadline:'10 Apr 2026',
    analytics:{completion:52,avgTime:'1.5 jam',topCity:'Jakarta',reach:'92.3K',engagement:'16.4%',sentiment:88,conversionRate:'31%'},
    aksiSpec:{actionType:'Petisi Digital & Kampanye',target:25000,unit:'dukungan',method:'Share link + posting konten',area:'Nasional',note:'Sertakan data resmi tentang kebutuhan modernisasi dari Kemhan/TNI AD'},
    templates:['TNI AD yang kuat = Indonesia yang aman. Dukung modernisasi alutsista untuk masa depan pertahanan negara! 🇮🇩']},

  /* ─── EVENT SUMATERA — Bencana, Bantuan TNI, KASAD ─── */
  {id:13,type:'EVENT',title:'Tanggap Darurat Bencana Banjir & Longsor Sumatera Barat',
    desc:'Dokumentasikan operasi tanggap darurat TNI AD dalam penanganan bencana banjir bandang dan longsor di Sumatera Barat. Abadikan heroisme prajurit yang menyelamatkan warga.',
    xp:600,bonus:150,participants:34,status:'PRIORITAS',deadline:'20 Mar 2026',
    analytics:{completion:15,avgTime:'8.0 jam',topCity:'Padang',reach:'28.5K',engagement:'19.2%',sentiment:92,conversionRate:'26%'},
    eventSpec:{location:'Kab. Agam & Kab. Tanah Datar, Sumatera Barat',date:'18-22 Mar 2026',capacity:60,checkin:'GPS + Selfie',lat:-0.4666,lng:100.3783,note:'Zona bencana — wajib koordinasi dengan Posko Kodim 0304/Agam. Bawa perlengkapan hujan & sepatu lapangan.'},
    contentSpec:{format:'Foto + Video',minPhotos:15,videoDuration:'60-300 detik',note:'Dokumentasi: evakuasi warga, pencarian korban, penyaluran bantuan, kerja sama TNI-masyarakat. Hindari foto korban meninggal.'},
    templates:['TNI AD sigap tanggap bencana di Sumatera Barat. Prajurit berjuang di tengah lumpur dan hujan demi keselamatan rakyat.','Banjir & longsor Sumbar: TNI AD evakuasi ratusan warga. Inilah wujud nyata prajurit untuk rakyat.']},
  {id:14,type:'EVENT',title:'Distribusi Bantuan Kemanusiaan TNI AD untuk Korban Bencana Sumbar',
    desc:'Liput dan dokumentasikan distribusi bantuan kemanusiaan dari TNI AD ke pengungsi bencana Sumatera Barat. Tunjukkan peran TNI AD sebagai pelindung dan pelayan rakyat.',
    xp:450,bonus:100,participants:52,status:'TERBUKA',deadline:'25 Mar 2026',
    analytics:{completion:22,avgTime:'5.0 jam',topCity:'Padang',reach:'15.8K',engagement:'14.6%',sentiment:88,conversionRate:'21%'},
    eventSpec:{location:'Posko Pengungsi Kab. Agam, Sumatera Barat',date:'20-25 Mar 2026',capacity:100,checkin:'QR Code + ID',lat:-0.4853,lng:100.3648,note:'Koordinasi dengan Tim Baksos Kodam I/Bukit Barisan. Bawa identitas resmi.'},
    contentSpec:{format:'Foto + Video',minPhotos:10,videoDuration:'60-180 detik',note:'Foto: prajurit membagikan sembako, mendirikan tenda, membantu medis. Video: wawancara singkat warga penerima bantuan.'},
    templates:['TNI AD hadir untuk rakyat Sumbar. Sembako, obat-obatan, dan tenda darurat disalurkan langsung oleh prajurit ke pengungsi.','Bantuan TNI AD tiba di Sumbar! Ratusan paket sembako dan selimut untuk keluarga terdampak bencana.']},
  {id:15,type:'EVENT',title:'Kunjungan KASAD ke Lokasi Bencana Sumatera Barat',
    desc:'Dokumentasikan kunjungan kerja Kepala Staf TNI AD (KASAD) ke lokasi bencana Sumatera Barat. Liputan inspeksi pasukan, pertemuan dengan pejabat daerah, dan interaksi langsung dengan penyintas.',
    xp:700,bonus:200,participants:20,status:'SIAGA',deadline:'22 Mar 2026',
    analytics:{completion:0,avgTime:'-',topCity:'Padang',reach:'0',engagement:'0%',sentiment:0,conversionRate:'0%'},
    eventSpec:{location:'Kodam I/Bukit Barisan & Lokasi Bencana, Sumbar',date:'22 Mar 2026, 09:00',capacity:30,checkin:'Akreditasi Khusus',lat:-0.9492,lng:100.3543,note:'KEAMANAN TINGGI — Akreditasi dari Puspen TNI AD wajib. Dress code formal. Koordinasi dengan Ajudan KASAD.'},
    contentSpec:{format:'Foto + Video',minPhotos:20,videoDuration:'120-300 detik',note:'Foto: KASAD inspeksi pasukan, KASAD menyapa pengungsi, KASAD memimpin rapat koordinasi. Video: pidato KASAD, suasana kunjungan.'},
    templates:['KASAD tinjau langsung penanganan bencana di Sumbar. "TNI AD akan terus hadir untuk rakyat" — Jenderal TNI.','Kunjungan KASAD ke Sumatera Barat: Pastikan setiap korban bencana mendapat pertolongan maksimal dari TNI AD.']},
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
      {showLabel&&<span style={{fontSize:Math.max(9,s*0.065),fontWeight:800,color:p.label,letterSpacing:2,fontFamily:"'Inter'",textTransform:'uppercase'}}>{labels[rank]}</span>}
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
      {!unlocked&&<div style={{position:'absolute',inset:0,background:'rgba(248,250,252,0.3)',zIndex:3}}/>}
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
const RARITY_COLORS={common:{label:'Prajurit',gradient:'linear-gradient(135deg,#546E7A,#78909C)',border:'#546E7A',glow:'rgba(84,110,122,0.25)'},rare:{label:'Bintara',gradient:'linear-gradient(135deg,#14532D,#2E7D32)',border:'#14532D',glow:'rgba(20,83,45,0.3)'},epic:{label:'Perwira',gradient:'linear-gradient(135deg,#6D28D9,#A78BFA)',border:'#6D28D9',glow:'rgba(109,40,217,0.3)'},legendary:{label:'Kehormatan',gradient:'linear-gradient(135deg,#92400E,#D97706)',border:'#92400E',glow:'rgba(146,64,14,0.35)'}};

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
const ADMIN_STATS={totalAgents:445067,activeToday:94234,missionsActive:8,missionsCompleted:156,totalParticipation:'1.2M',avgCompletion:'72%',totalReach:'24.8M',avgEngagement:'12.3%',narrativesMonitored:0,alertsToday:0,totalFamily:216740,prajuritCount:400000,suamiCount:32220,istriCount:142300,anakCount:42220};

/* ─── PROGRESS BAR (react-spring animated) ───────────────────────── */
function ProgressBar({progress=0,color=C.primary,height=6,bg=C.overlay08,gold=false}){
  const spring = useSpring({ width: `${progress*100}%`, from: { width: '0%' }, config: { tension: 120, friction: 20 } });
  return <div style={{height,borderRadius:height,background:bg,overflow:'hidden',width:'100%'}}>
    <animated.div className={gold?'xp-bar-gold':'xp-bar-fill'} style={{height:'100%',borderRadius:height,background:color,...spring}}/>
  </div>;
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function App(){
  const [mode,setMode]=useState(()=>{
    if(typeof window==='undefined') return 'member';
    const p=window.location.pathname.toLowerCase();
    if(p.startsWith('/presentation')) return 'presentation';
    if(p.startsWith('/admin')) return 'admin';
    if(window.location.search.includes('mode=presentation')) return 'presentation';
    if(window.location.search.includes('mode=admin')) return 'admin';
    return 'member';
  }); // 'member' | 'admin' | 'presentation'
  const [presSlide,setPresSlide]=useState(-1); // -1 = splash
  const [adminPin,setAdminPin]=useState('');
  const [adminLoginVisible,setAdminLoginVisible]=useState(false);
  const ADMIN_PIN='1234'; // Demo pin
  const tryAdminLogin=()=>{
    if(adminPin===ADMIN_PIN){setMode('admin');setAdminLoginVisible(false);setAdminPin('');}
    else{showToast('PIN salah');setAdminPin('');}
  };
  const [screen,setScreen]=useState('beranda');
  const [sel,setSel]=useState(null);
  const [filter,setFilter]=useState('Semua');
  const [consent,setConsent]=useState(false);
  const [started,setStarted]=useState(false);
  const [showSplash,setShowSplash]=useState(mode==='member');
  useEffect(()=>{if(showSplash){const t=setTimeout(()=>setShowSplash(false),3200);return()=>clearTimeout(t);}},[showSplash]);

  /* ─── ACCOUNT & USER DATA ───────────────────────────────────────── */
  const [accountType,setAccountType]=useState('prajurit'); // 'prajurit' | 'suami' | 'istri' | 'anak'
  const [userData]=useState({
    name:'Arif Santoso',nrp:'31200456',satuan:'Yonif 403/WP',pangkat:'Mayor',
    kk:'3201011234560001',
    family:[
      {name:'Ratna Sari',type:'istri',id:'3201011234560001-S',joined:true,xp:1240,rank:0},
      {name:'Dimas Arif',type:'anak',id:'3201011234560001-A1',joined:true,xp:680,rank:0},
      {name:'Putri Arif',type:'anak',id:'3201011234560001-A2',joined:false,xp:0,rank:0},
    ],
  });
  const acctInfo=ACCOUNT_TYPES[accountType];
  const [toast,setToast]=useState(null);
  const [notif,setNotif]=useState(true);
  const [privacy,setPrivacy]=useState(false);
  const [verified,setVerified]=useState({});
  const [uploaded,setUploaded]=useState(false);
  const [adminTab,setAdminTab]=useState('overview');
  const [adSideTab,setAdSideTab]=useState('dashboard');
  const [adSubTab,setAdSubTab]=useState('ringkasan');
  const [missionForm,setMissionForm]=useState({type:'EVENT',step:0,title:'',desc:'',xp:200,bonus:0,deadline:'',status:'TERBUKA',
    /* EVENT */ location:'',eventDate:'',capacity:100,checkin:'QR Code',lat:'',lng:'',eventNote:'',
    /* KONTEN */ format:'Video (portrait 9:16)',duration:'30-60 detik',platforms:['Instagram','TikTok'],hashtags:['#TNIAD','#DISPENAD'],guidelines:[''],
    /* ENGAGEMENT */ actions:['Like post','Tulis komentar positif (min 10 kata)','Share/repost ke akun kamu'],targetPosts:2,engNote:'',
    /* EDUKASI */ material:'Infografis + Video Singkat',channels:['WhatsApp','Telegram'],minGroups:5,minGroupSize:20,eduNote:'',
    /* AKSI */ actionType:'',target:100,unit:'',method:'',area:'',aksiNote:'',
    /* Content spec */ contentFormat:'Foto + Video',minPhotos:3,videoDuration:'60-120 detik',contentNote:'',
    /* Templates */ templates:[''],
  });
  const [selectedAdMission,setSelectedAdMission]=useState(null);
  const [adminMissionFilter,setAdminMissionFilter]=useState('Semua');
  const [adminAgentFilter,setAdminAgentFilter]=useState('Semua');
  const [adminAgentSearch,setAdminAgentSearch]=useState('');
  const [selectedAgent,setSelectedAgent]=useState(null);
  // Stubs for removed narrative features (admin panel references)
  const expandedNarrative=null,setExpandedNarrative=()=>{};
  const narrativeActions={},setNarrativeActions=()=>{};
  const narrativeMissionFlow=null,setNarrativeMissionFlow=()=>{};
  const monitorView='network',setMonitorView=()=>{};
  const globeSelPost=null,setGlobeSelPost=()=>{};
  const [confirmRedeem,setConfirmRedeem]=useState(null); // item id for shop confirm
  const [logoutConfirm,setLogoutConfirm]=useState(false);
  const [publishing,setPublishing]=useState(false);
  const [settingsXP,setSettingsXP]=useState({EVENT:{base:400,bonus:100},KONTEN:{base:300,bonus:75},ENGAGEMENT:{base:200,bonus:50},EDUKASI:{base:250,bonus:60},AKSI:{base:350,bonus:80}});
  const [settingsPlatforms,setSettingsPlatforms]=useState({Instagram:true,TikTok:true,YouTube:true,'X (Twitter)':true,Facebook:true,WhatsApp:true,Telegram:true});
  const [settingsNotif,setSettingsNotif]=useState({newMission:true,deadline:true,submission:true,weeklyReport:false});
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
  const allowedTypes=acctInfo.missionTypes;
  const allMissions=MISSIONS.filter(m=>allowedTypes.includes(m.type));
  const filtered=filter==='Semua'?allMissions:filter==='Selesai'?allMissions.filter(m=>m.status==='SELESAI'):allMissions.filter(m=>m.type===filter.toUpperCase());

  /* ─── SHARED COMPONENTS ─────────────────────────────────────────── */
  function Card({children,style={},className='',onClick,accent}){
    return <div onClick={onClick} className={`${className} ${onClick?'card-interactive':'card-hover'} glass-card`} style={{
      background:'rgba(255,255,255,0.72)',
      backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
      borderRadius:16,padding:16,
      border:'1px solid rgba(255,255,255,0.55)',
      cursor:onClick?'pointer':'default',
      boxShadow:'0 1px 3px rgba(0,0,0,0.04), 0 4px 24px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.7)',
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
        background:`linear-gradient(145deg,${C.primaryDark},${C.primary} 60%,#1C1917)`,
        borderRadius:20,padding:'20px 16px 24px',marginBottom:16,position:'relative',overflow:'hidden',
        boxShadow:`0 8px 32px rgba(20,83,45,0.25)`,
        borderTop:`4px solid ${C.patriot}`,
      }}>
        {/* Decorative patriotic orbs */}
        <div style={{position:'absolute',top:-30,right:-30,width:140,height:140,borderRadius:'50%',background:'rgba(153,27,27,0.2)',filter:'blur(40px)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:-20,left:-20,width:100,height:100,borderRadius:'50%',background:'rgba(217,119,6,0.15)',filter:'blur(30px)',pointerEvents:'none'}}/>

        {/* Top bar: Logo + Notification */}
        <div className="flex items-center justify-between" style={{marginBottom:20,position:'relative',zIndex:1}}>
          <div className="flex items-center gap-2.5">
            <SinarMark size={28}/>
            <div>
              <h2 style={{fontSize:14,fontWeight:900,color:'#FFFFFF',letterSpacing:2.5,lineHeight:1}}>SINAR</h2>
              <p style={{fontSize:10,fontWeight:600,color:'rgba(255,255,255,0.55)',letterSpacing:1.5,textTransform:'uppercase',lineHeight:1,marginTop:2}}>TNI AD</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div role="button" aria-label="Notifications" style={{position:'relative',cursor:'pointer'}} className="tap-bounce" onClick={()=>showToast('Tidak ada notifikasi baru')}>
              <div style={{width:44,height:44,borderRadius:12,background:'rgba(255,255,255,0.12)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid rgba(255,255,255,0.15)'}}>
                <MI name="notifications" size={20} style={{color:'#FFFFFF'}}/>
              </div>
              <div style={{position:'absolute',top:6,right:6,width:8,height:8,borderRadius:'50%',background:'#EF4444',border:'2px solid rgba(0,0,0,0.2)'}} className="urgency-pulse"/>
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
              <AvatarImg initials="AS" size={52} style={{borderRadius:'50%',border:'2px solid rgba(255,255,255,0.4)'}}/>
            </div>
            <div style={{position:'absolute',bottom:0,right:0}}><RankBadge rankIdx={curRank} size={24}/></div>
          </div>

          <div className="flex-1" style={{minWidth:0}}>
            <p style={{fontSize:13,fontWeight:500,color:'rgba(255,255,255,0.7)'}}>Selamat Pagi,</p>
            <h1 style={{fontSize:22,fontWeight:800,color:'#FFFFFF',lineHeight:1.2,marginTop:2}}>{userData.name}</h1>
            <div className="flex items-center gap-2 flex-wrap" style={{marginTop:6}}>
              <span style={{background:'rgba(255,255,255,0.15)',borderRadius:6,padding:'3px 8px',fontSize:11,fontWeight:700,color:'#FFFFFF',letterSpacing:0.3,border:'1px solid rgba(255,255,255,0.1)'}}>
                {RANKS[curRank].name}
              </span>
              <span style={{background:acctInfo.color+'30',borderRadius:5,padding:'2px 7px',fontSize:10,fontWeight:700,color:'#FFFFFF',letterSpacing:0.5,border:'1px solid rgba(255,255,255,0.1)'}}>
                {acctInfo.label}
              </span>
            </div>
            <p style={{fontSize:10,fontWeight:500,color:'rgba(255,255,255,0.45)',marginTop:4,fontFamily:"'JetBrains Mono'"}}>NRP {userData.nrp} · {userData.satuan}</p>
            {/* XP inline */}
            <div style={{marginTop:8}}>
              <div className="flex items-center justify-between mb-1">
                <span style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.5)'}}>XP</span>
                <span style={{fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono'",color:'#FFFFFF'}}>{xpCur.toLocaleString()} / {xpMax.toLocaleString()}</span>
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
        <div className="tap-bounce glass-card" style={{background:'rgba(255,255,255,0.85)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',borderRadius:16,padding:14,border:'1px solid rgba(217,119,6,0.1)',boxShadow:'0 4px 30px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)',cursor:'pointer',gridRow:'span 2',display:'flex',flexDirection:'column',justifyContent:'space-between',position:'relative',overflow:'hidden'}} onClick={()=>nav('misi')}>
          <div style={{position:'absolute',bottom:-10,right:-10,width:64,height:64,borderRadius:'50%',background:C.primaryLight,opacity:0.5,pointerEvents:'none'}}/>
          <div style={{width:36,height:36,borderRadius:10,background:C.primaryLight,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:8}}>
            <MI name="target" size={18} fill style={{color:C.primary}}/>
          </div>
          <div>
            <Tip text="Total misi yang telah diselesaikan"><p style={{fontSize:32,fontWeight:800,color:C.text,fontFamily:"'Inter'",lineHeight:1}}>24</p></Tip>
            <p style={{fontSize:12,color:C.textSec,fontWeight:600,marginTop:4}}>Misi Selesai</p>
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
        <div className="tap-bounce glass-card" style={{background:'rgba(255,255,255,0.85)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',borderRadius:16,padding:14,border:'1px solid rgba(217,119,6,0.1)',boxShadow:'0 4px 30px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)',cursor:'pointer',position:'relative',overflow:'hidden'}} onClick={()=>showToast('Streak: 7 hari berturut-turut!')}>
          <div style={{position:'absolute',top:-8,right:-8,width:40,height:40,borderRadius:'50%',background:C.orangeLight,opacity:0.6,pointerEvents:'none'}}/>
          <div className="flex items-center justify-between">
            <div style={{width:30,height:30,borderRadius:8,background:C.orangeLight,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <MI name="local_fire_department" size={15} fill style={{color:C.orange}}/>
            </div>
            <span style={{fontSize:10,fontWeight:700,color:C.orange,background:C.orangeLight,borderRadius:6,padding:'2px 6px'}}>AKTIF</span>
          </div>
          <Tip text="Login & selesaikan misi setiap hari untuk mempertahankan streak"><p style={{fontSize:24,fontWeight:800,color:C.text,fontFamily:"'Inter'",marginTop:8,lineHeight:1}}>7<span style={{fontSize:12,fontWeight:600,color:C.textMuted,marginLeft:2}}>hari</span></p></Tip>
          <p style={{fontSize:11,color:C.textSec,fontWeight:500,marginTop:2}}>Streak Berturut</p>
          {/* Mini streak dots */}
          <div className="flex gap-1" style={{marginTop:6}}>
            {[1,1,1,1,1,1,1].map((_,i)=>(
              <div key={i} style={{width:6,height:6,borderRadius:'50%',background:C.orange,opacity:0.7+i*0.04}}/>
            ))}
          </div>
        </div>
        {/* Rank */}
        <div className="tap-bounce glass-card" style={{background:'rgba(255,255,255,0.85)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',borderRadius:16,padding:14,border:'1px solid rgba(217,119,6,0.1)',boxShadow:'0 4px 30px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)',cursor:'pointer',position:'relative',overflow:'hidden'}} onClick={()=>nav('pangkat')}>
          <div style={{position:'absolute',bottom:-6,right:-6,width:36,height:36,borderRadius:'50%',background:C.tealLight,opacity:0.5,pointerEvents:'none'}}/>
          <div className="flex items-center justify-between">
            <div style={{width:30,height:30,borderRadius:8,background:C.tealLight,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <MI name="leaderboard" size={15} fill style={{color:C.teal}}/>
            </div>
            <MI name="arrow_forward" size={14} style={{color:C.textMuted}}/>
          </div>
          <Tip text="Peringkat kamu di antara semua anggota SINAR"><p style={{fontSize:24,fontWeight:800,color:C.text,fontFamily:"'Inter'",marginTop:8,lineHeight:1}}>#4<span style={{fontSize:12,fontWeight:600,color:C.textMuted,marginLeft:2}}>of 1.2K</span></p></Tip>
          <p style={{fontSize:11,color:C.textSec,fontWeight:500,marginTop:2}}>Peringkat</p>
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
              <div style={{position:'relative'}}>
                <AvatarImg initials={lb.avatar} size={isFirst?44:36} style={{borderRadius:'50%',border:isFirst?`3px solid ${C.gold}`:`2px solid ${medalColors[i]}`}}/>
                <div style={{position:'absolute',bottom:-4,right:-2}}><RankBadge rankIdx={lb.rankIdx} size={isFirst?22:18}/></div>
              </div>
              <p style={{fontSize:10,fontWeight:700,color:C.text,marginTop:4,textAlign:'center',lineHeight:1.2}} className="truncate" title={lb.name}>{lb.name.split(' ')[0]}</p>
              <span style={{fontSize:10,fontWeight:700,fontFamily:"'JetBrains Mono'",color:C.textMuted,marginTop:1}}>{lb.xp.toLocaleString()}</span>
              <div style={{
                width:'100%',height:heights[i],borderRadius:'10px 10px 0 0',marginTop:6,
                background:isFirst?`linear-gradient(180deg,${C.primary},${C.primaryDark})`:
                  i===0?'linear-gradient(180deg,#C0C0C0,#A0A0A0)':'linear-gradient(180deg,#CD9B6A,#A67B4B)',
                display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:6,
              }}>
                <span style={{fontSize:14,fontWeight:900,color:'#FFFFFF',fontFamily:"'JetBrains Mono'"}}>{order[i]}</span>
              </div>
            </div>);
          })}
        </div>
        {/* Your rank */}
        <div className="flex items-center gap-3" style={{padding:'10px 14px',borderTop:`1px solid ${C.border}`,background:C.primaryLight}}>
          <span style={{fontSize:12,fontWeight:800,color:C.primary,fontFamily:"'JetBrains Mono'",width:18,textAlign:'center'}}>4</span>
          <div style={{position:'relative'}}>
            <AvatarImg initials="AS" size={32} style={{borderRadius:'50%',border:`2px solid ${C.primary}`}}/>
            <div style={{position:'absolute',bottom:-3,right:-2}}><RankBadge rankIdx={curRank} size={16}/></div>
          </div>
          <div className="flex-1" style={{minWidth:0}}>
            <p style={{fontSize:12,fontWeight:600,color:C.text}}>Arif Santoso <span style={{fontSize:10,fontWeight:700,color:C.primary,marginLeft:4}}>Kamu</span></p>
          </div>
          <span style={{fontSize:12,fontWeight:700,fontFamily:"'JetBrains Mono'",color:C.primary}}>4,820</span>
        </div>
      </Card>

      {/* ═══ DAILY BRIEF — Featured Mission ═══ */}
      <div className="stagger-6" style={{marginBottom:20,borderRadius:18,overflow:'hidden',position:'relative',
        boxShadow:`0 4px 20px rgba(27,94,32,0.2)`,
      }}>
        <img src="/images/hero-banner-gerak-sinar.png" alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',pointerEvents:'none'}}/>
        <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,rgba(20,83,45,0.82),rgba(27,94,32,0.7) 70%,rgba(101,163,13,0.6))',pointerEvents:'none'}}/>
        <div style={{padding:'16px 16px 14px',position:'relative',zIndex:1}}>
          <div className="flex items-center justify-between" style={{marginBottom:10}}>
            <span className="flex items-center gap-1.5" style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.7)',letterSpacing:1.5,textTransform:'uppercase'}}>
              <MI name="wb_sunny" size={12} fill style={{color:'rgba(255,255,255,0.8)'}}/> Misi Hari Ini
            </span>
            <span style={{background:'rgba(255,255,255,0.15)',borderRadius:6,padding:'3px 8px',fontSize:10,fontWeight:700,color:'#FFFFFF',backdropFilter:'blur(4px)',border:'1px solid rgba(255,255,255,0.1)'}}>BRIEFING</span>
          </div>
          <h3 style={{fontSize:16,fontWeight:700,color:'#FFFFFF',lineHeight:1.3,marginBottom:10}}>{MISSIONS[0]?.title||'Misi Hari Ini'}</h3>
          <div className="flex items-center gap-3" style={{marginBottom:14}}>
            <span style={{background:'rgba(255,255,255,0.15)',borderRadius:6,padding:'3px 8px',fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono'",color:'#FFFFFF'}}>+250 XP</span>
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
        <div style={{borderRadius:12,overflow:'hidden',background:`linear-gradient(135deg,${C.primaryDark},${C.primary})`,padding:'10px 8px',marginBottom:12}}>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              {l:'Terdaftar',v:Object.values(joinedMissions).filter(j=>j.status==='TERDAFTAR').length,accent:'#FDE68A',icon:'how_to_reg'},
              {l:'Submitted',v:Object.values(joinedMissions).filter(j=>j.status==='SUBMITTED').length,accent:'#99F6E4',icon:'upload_file'},
              {l:'Review',v:Object.values(joinedMissions).filter(j=>j.status==='REVIEW').length,accent:'#C4B5FD',icon:'rate_review'},
              {l:'Selesai',v:Object.values(joinedMissions).filter(j=>j.status==='SELESAI').length,accent:'#86EFAC',icon:'check_circle'},
            ].map((s,i)=>(
              <div key={i} style={{background:'rgba(255,255,255,0.1)',borderRadius:8,padding:'8px 4px',textAlign:'center',border:'1px solid rgba(255,255,255,0.08)'}}>
                <MI name={s.icon} size={12} style={{color:s.accent,opacity:0.8}}/>
                <p style={{fontSize:15,fontWeight:800,color:'#FFFFFF',fontFamily:"'JetBrains Mono'",marginTop:1}}>{s.v}</p>
                <p style={{fontSize:9,color:'rgba(255,255,255,0.5)',fontWeight:700,marginTop:2,textTransform:'uppercase',letterSpacing:0.3}}>{s.l}</p>
              </div>
            ))}
          </div>
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
                      <span style={{fontSize:10,fontWeight:700,color:C.gold,fontFamily:"'JetBrains Mono'"}}>+{m.xp} XP</span>
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
              background:'rgba(255,255,255,0.72)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
              border:'1px solid rgba(255,255,255,0.45)',cursor:'pointer',
              boxShadow:'0 4px 30px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)',
            }}>
              {/* Mission image or colored header strip */}
              {MISSION_ILLUST[m.id]?.img?
                <div style={{height:80,position:'relative',overflow:'hidden'}}>
                  <img src={MISSION_ILLUST[m.id].img} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  <div style={{position:'absolute',inset:0,background:'linear-gradient(0deg,rgba(0,0,0,0.3) 0%,transparent 60%)'}}/>
                </div>
              :<div style={{height:4,background:typeGradient(m.type)}}/>}
              <div style={{padding:'12px 14px 14px'}}>
                <div className="flex items-center gap-2 mb-2">
                  <div style={{width:28,height:28,borderRadius:8,background:typeBg(m.type),display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <MI name={typeIcon(m.type)} size={14} fill style={{color:tc}}/>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,color:tc,textTransform:'uppercase',letterSpacing:0.5}}>{m.type}</span>
                </div>
                <h4 style={{fontSize:13,fontWeight:600,color:C.text,lineHeight:1.3,marginBottom:8,minHeight:34}} className="line-clamp-2">{m.title}</h4>
                <div className="flex items-center gap-2" style={{marginBottom:10}}>
                  <span style={{fontSize:11,fontWeight:700,color:C.gold,fontFamily:"'JetBrains Mono'"}}>+{m.xp} XP</span>
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
        <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-2 scroll-peek" style={{scrollSnapType:'x mandatory'}}>
          {BADGES.filter(b=>b.unlocked).slice(0,5).map((b,i)=>(
            <div key={i} className="tap-bounce" style={{flexShrink:0,scrollSnapAlign:'start'}}>
              <Badge badge={b} size={44} compact/>
            </div>
          ))}
          <div onClick={()=>nav('pangkat')} className="tap-bounce" style={{
            flexShrink:0,width:90,scrollSnapAlign:'start',borderRadius:14,
            border:`2px dashed ${C.border}`,display:'flex',flexDirection:'column',
            alignItems:'center',justifyContent:'center',cursor:'pointer',gap:3,
            background:C.primaryFaint,minHeight:100,
          }}>
            <span style={{fontSize:18,fontWeight:800,color:C.primary,fontFamily:"'JetBrains Mono'"}}>+{Math.max(0,BADGES.filter(b=>b.unlocked).length-5)}</span>
            <span style={{fontSize:10,color:C.primary,fontWeight:600}}>Lihat</span>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2.5" style={{padding:'0 2px'}}>
          <span style={{fontSize:11,fontWeight:700,color:C.text,fontFamily:"'JetBrains Mono'"}}>{BADGES.filter(b=>b.unlocked).length}/{BADGES.length}</span>
          <div className="flex-1"><ProgressBar progress={BADGES.filter(b=>b.unlocked).length/BADGES.length} color={C.gold} height={4}/></div>
          <span style={{fontSize:10,fontWeight:600,color:C.textMuted}}>{Math.round(BADGES.filter(b=>b.unlocked).length/BADGES.length*100)}%</span>
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
            <div key={i} className="tap-bounce flex-1" onClick={a.action} style={{background:C.surface,borderRadius:14,padding:'12px 4px',textAlign:'center',border:`1px solid ${C.border}`,cursor:'pointer'}}>
              <div style={{width:36,height:36,borderRadius:10,background:a.bg,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 6px'}}>
                <MI name={a.icon} size={18} style={{color:a.color}}/>
              </div>
              <p style={{fontSize:11,fontWeight:600,color:C.textSec}}>{a.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );}

  /* ─── PAPAN MISI ────────────────────────────────────────────────── */
  function PapanMisi(){
    const filters=['Semua','Event','Konten','Engagement','Edukasi','Aksi','Selesai'];
    const totalParticipants=allMissions.reduce((s,m)=>s+m.participants,0);
    const totalReachEst=totalParticipants*120;
    const activeMCount=allMissions.filter(m=>m.status!=='SELESAI').length;
    const completedMCount=allMissions.filter(m=>m.status==='SELESAI').length;
    return(<div key={k} className="flex flex-col gap-3 pb-4">
      <h1 className="stagger-1" style={{fontSize:22,fontWeight:800,color:C.text,paddingTop:4,marginBottom:-4}}>Papan Misi</h1>

      {/* Stats Summary — military dashboard style */}
      <div className="stagger-2" style={{borderRadius:14,overflow:'hidden',position:'relative',background:`linear-gradient(135deg,${C.primaryDark},${C.primary})`,padding:'14px 12px 12px'}}>
        <div style={{position:'absolute',top:-30,right:-20,width:90,height:90,borderRadius:'50%',background:'rgba(255,255,255,0.04)'}}/>
        <div style={{position:'absolute',bottom:-15,left:30,width:50,height:50,borderRadius:'50%',background:'rgba(255,255,255,0.03)'}}/>
        <div className="flex items-center gap-1.5" style={{marginBottom:10}}>
          <MI name="bar_chart" size={12} style={{color:'rgba(255,255,255,0.6)'}}/>
          <span style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.6)',letterSpacing:1.5,textTransform:'uppercase'}}>Ringkasan Operasi</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            {l:'Aktif',v:activeMCount,icon:'target',accent:'#86EFAC'},
            {l:'Selesai',v:completedMCount,icon:'check_circle',accent:'#FDE68A'},
            {l:'Peserta',v:totalParticipants>1000?`${(totalParticipants/1000).toFixed(1)}K`:totalParticipants,icon:'group',accent:'#FFFFFF'},
            {l:'Reach',v:`${(totalReachEst/1000000).toFixed(1)}M`,icon:'public',accent:'#99F6E4'},
          ].map((s,i)=>(
            <div key={i} style={{background:'rgba(255,255,255,0.1)',borderRadius:10,padding:'10px 4px',textAlign:'center',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.08)'}}>
              <MI name={s.icon} size={13} style={{color:s.accent,opacity:0.8}}/>
              <p style={{fontSize:17,fontWeight:800,color:'#FFFFFF',fontFamily:"'JetBrains Mono'",marginTop:2,lineHeight:1}}>{s.v}</p>
              <p style={{fontSize:9,color:'rgba(255,255,255,0.55)',fontWeight:700,marginTop:3,textTransform:'uppercase',letterSpacing:0.5}}>{s.l}</p>
            </div>
          ))}
        </div>
      </div>

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
        <Card key={m.id} className={`stagger-${Math.min(i+3,7)} ${urgent?'urgency-pulse':''}`} onClick={()=>openM(m)} accent={urgent?C.red:tc} style={{opacity:done?0.6:1,position:'relative',overflow:'hidden',borderColor:urgent?C.red:undefined,padding:0}}>
          {/* Mission Thumbnail */}
          {MISSION_ILLUST[m.id]&&(()=>{const il=MISSION_ILLUST[m.id];return(
            <div style={{position:'relative',overflow:'hidden',opacity:done?0.5:1}}>
              <IllustCard icon={il.icon} label={il.label} bg={il.bg} accent={il.accent} height={80} img={il.img}/>
              <div style={{position:'absolute',top:8,right:8}}>
                <span style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:6,
                  background:m.status==='PRIORITAS'?'rgba(153,27,27,0.85)':m.status==='SIAGA'?'rgba(234,88,12,0.85)':done?'rgba(0,0,0,0.4)':'rgba(20,83,45,0.85)',
                  color:'#fff',
                }}>{m.status}</span>
              </div>
            </div>);})()}
          <div style={{padding:16}}>
          <div className="flex items-center justify-between mb-2" style={{position:'relative',zIndex:1}}>
            <div className="flex items-center gap-2">
              <div style={{width:28,height:28,borderRadius:8,background:typeBg(m.type),display:'flex',alignItems:'center',justifyContent:'center'}}>
                <MI name={typeIcon(m.type)} size={14} fill style={{color:tc}}/>
              </div>
              <span style={{fontSize:11,fontWeight:700,color:tc,textTransform:'uppercase',letterSpacing:0.5}}>{m.type}</span>
            </div>
            {!MISSION_ILLUST[m.id]&&<span style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:6,
              background:m.status==='PRIORITAS'?C.redLight:m.status==='SIAGA'?C.orangeLight:done?C.borderLight:typeBg(m.type),
              color:m.status==='PRIORITAS'?C.red:m.status==='SIAGA'?C.orange:done?C.textMuted:tc,
            }}>{m.status}</span>}
          </div>
          <h3 style={{fontSize:16,fontWeight:700,color:done?C.textMuted:C.text,lineHeight:1.3,marginBottom:4,position:'relative',zIndex:1}} className="line-clamp-2">{m.title}</h3>
          <p style={{fontSize:13,color:C.textMuted,marginBottom:8,lineHeight:1.4,position:'relative',zIndex:1}} className="line-clamp-2">{m.desc}</p>
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
      <h1 className="stagger-1" style={{fontSize:24,fontWeight:800,color:C.text,paddingTop:4}}>Pangkat & Lencana</h1>

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
              <span style={{background:`linear-gradient(135deg,${C.primaryMid},${C.primaryFaint})`,borderRadius:9999,padding:'3px 10px',border:`1px solid ${C.primary}40`,fontSize:11,fontWeight:700,color:C.primary,fontFamily:"'JetBrains Mono'"}}>4,820 XP</span>
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
                <p style={{fontSize:10,fontWeight:600,color:cur?rankColors.accent:C.textMuted,fontFamily:"'JetBrains Mono'",marginTop:3,opacity:cur?0.8:1}}>{r.xp.toLocaleString()} XP</p>
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
          <span style={{fontSize:12,fontWeight:700,color:C.primary,fontFamily:"'JetBrains Mono'"}}>{unlocked}/{BADGES.length}</span>
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
      <Card className="stagger-1" style={{textAlign:'center',padding:0,position:'relative',overflow:'hidden',borderTop:`4px solid ${C.patriot}`}}>
        {/* Cover Image */}
        <div style={{position:'relative',width:'100%',height:80,overflow:'hidden'}}>
          <img src="/images/hero-banner-gerak-sinar.png" alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(20,83,45,0.4) 0%,rgba(255,255,255,0.9) 100%)',pointerEvents:'none'}}/>
        </div>
        <div style={{padding:'0 24px 24px',marginTop:-36,position:'relative',zIndex:2}}>
        <div style={{margin:'0 auto 12px',position:'relative',zIndex:1,display:'flex',justifyContent:'center'}}>
          <div style={{position:'relative'}}>
            <AvatarImg initials="AS" size={72} style={{borderRadius:'50%',border:`3px solid ${C.primary}`}}/>
            <div style={{position:'absolute',bottom:-2,right:-2}}><RankBadge rankIdx={1} size={28}/></div>
          </div>
        </div>
        <h2 style={{fontSize:18,fontWeight:800,color:C.text,position:'relative',zIndex:1}}>{userData.pangkat} {userData.name}</h2>
        <p style={{fontSize:11,color:C.textMuted,fontFamily:"'JetBrains Mono'",marginTop:2,position:'relative',zIndex:1}}>NRP {userData.nrp}</p>
        <div className="flex items-center justify-center gap-2 mt-2" style={{position:'relative',zIndex:1}}>
          <span style={{display:'inline-block',background:C.primaryLight,borderRadius:8,padding:'4px 12px',fontSize:11,fontWeight:700,color:C.primary,border:`1px solid ${C.primary}20`}}>
            {acctInfo.label}
          </span>
          <span style={{display:'inline-block',background:C.patriotLight,borderRadius:8,padding:'4px 12px',fontSize:11,fontWeight:700,color:C.patriot,border:`1px solid ${C.patriot}30`}}>
            Terverifikasi
          </span>
          <span style={{display:'inline-block',background:C.surfaceLight,borderRadius:8,padding:'4px 12px',fontSize:11,fontWeight:600,color:C.textSec,border:`1px solid ${C.border}`}}>
            {userData.satuan}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4" style={{position:'relative',zIndex:1}}>
          <div style={{borderRadius:12,padding:12,border:`1px solid rgba(153,27,27,0.1)`,background:C.bgCard}}>
            <div className="flex items-center gap-1.5 mb-2" style={{color:C.patriot}}>
              <MI name="military_tech" size={14} style={{color:C.patriot}}/>
              <span style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:0.5}}>Tipe Akun</span>
            </div>
            <p style={{fontSize:16,fontWeight:800,color:C.text}}>Militer</p>
            <p style={{fontSize:10,color:C.textMuted}}>Dinas Aktif</p>
          </div>
          <div style={{borderRadius:12,padding:12,border:`1px solid rgba(217,119,6,0.15)`,background:C.bgCard}}>
            <div className="flex items-center gap-1.5 mb-2" style={{color:C.accent}}>
              <MI name="stars" size={14} style={{color:C.accent}}/>
              <span style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:0.5}}>Total Kontribusi</span>
            </div>
            <p style={{fontSize:16,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'"}}>4,820 <span style={{fontSize:11,fontWeight:500,color:C.textMuted,fontFamily:"'Inter'"}}>XP</span></p>
            <p style={{fontSize:10,color:C.accent,fontWeight:600}}>Peringkat #12</p>
          </div>
        </div>
        </div>
      </Card>

      {/* ─── Quick Actions ─── */}
      <Card className="stagger-2">
        <div className="flex gap-3">
          <button onClick={()=>nav('konten')} style={{flex:1,padding:'12px 14px',borderRadius:12,border:`1px solid ${C.border}`,background:C.glass,display:'flex',alignItems:'center',gap:8,cursor:'pointer',textAlign:'left'}}>
            <MI name="analytics" size={18} style={{color:C.primary}}/>
            <div><p style={{fontSize:13,fontWeight:600,color:C.text}}>Konten Saya</p><p style={{fontSize:11,color:C.textMuted}}>Postingan & performa</p></div>
            <MI name="chevron_right" size={16} style={{color:C.textMuted,marginLeft:'auto'}}/>
          </button>
          <button onClick={()=>nav('toko')} style={{flex:1,padding:'12px 14px',borderRadius:12,border:`1px solid ${C.border}`,background:C.glass,display:'flex',alignItems:'center',gap:8,cursor:'pointer',textAlign:'left'}}>
            <MI name="storefront" size={18} style={{color:C.gold}}/>
            <div><p style={{fontSize:13,fontWeight:600,color:C.text}}>Toko Poin</p><p style={{fontSize:11,color:C.textMuted}}>Tukar XP → reward</p></div>
            <MI name="chevron_right" size={16} style={{color:C.textMuted,marginLeft:'auto'}}/>
          </button>
        </div>
      </Card>

      {/* ─── Keluarga Saya (Family) ─── */}
      {accountType==='prajurit'&&<Card className="stagger-2">
        <div className="flex items-center justify-between mb-3" style={{paddingBottom:10,borderBottom:`1px solid ${C.border}`}}>
          <div className="flex items-center gap-2">
            <MI name="group" size={18} fill style={{color:C.primary}}/>
            <h3 style={{fontSize:14,fontWeight:700,color:C.text}}>Keluarga Saya</h3>
          </div>
          <span style={{fontSize:10,fontWeight:700,color:C.primary,background:C.primaryLight,borderRadius:6,padding:'3px 8px'}}>{userData.family.filter(f=>f.joined).length} Terhubung</span>
        </div>
        {userData.family.map((f,i)=>(
          <div key={i} className="flex items-center gap-3" style={{padding:'10px 0',borderBottom:i<userData.family.length-1?`1px solid ${C.borderLight}`:'none'}}>
            <AvatarImg initials={f.name.split(' ').map(w=>w[0]).join('').slice(0,2)} size={36} style={{borderRadius:10,border:`2px solid ${ACCOUNT_TYPES[f.type]?.color||C.border}`}}/>
            <div className="flex-1" style={{minWidth:0}}>
              <p style={{fontSize:13,fontWeight:600,color:C.text}}>{f.name}</p>
              <div className="flex items-center gap-2">
                <span style={{fontSize:10,fontWeight:600,color:ACCOUNT_TYPES[f.type]?.color}}>{ACCOUNT_TYPES[f.type]?.label}</span>
                <span style={{fontSize:10,color:C.textMuted,fontFamily:"'JetBrains Mono'"}}>{f.id.split('-').pop()}</span>
              </div>
            </div>
            {f.joined?(
              <div className="flex flex-col items-end gap-1">
                <span style={{fontSize:11,fontWeight:700,color:C.gold,fontFamily:"'JetBrains Mono'"}}>{f.xp.toLocaleString()} XP</span>
                <span style={{fontSize:10,fontWeight:600,color:C.green,background:C.greenLight,padding:'1px 6px',borderRadius:4}}>Aktif</span>
              </div>
            ):(
              <button onClick={()=>showToast(`Link undangan dikirim ke ${f.name}`)} className="tap-bounce" style={{fontSize:11,fontWeight:600,color:C.primary,background:C.primaryLight,border:`1px solid ${C.primary}20`,borderRadius:8,padding:'5px 12px',cursor:'pointer'}}>
                Undang
              </button>
            )}
          </div>
        ))}
        <button onClick={()=>showToast('Link undangan keluarga tersalin!')} className="btn-admin tap-bounce" style={{width:'100%',marginTop:12,padding:'10px 0',borderRadius:10,border:`2px dashed ${C.border}`,background:'transparent',color:C.textMuted,fontWeight:500,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
          <MI name="add" size={14} style={{color:'inherit'}}/> Tambah Anggota Keluarga
        </button>
      </Card>}

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
              <span style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:"'JetBrains Mono'"}}>{s.followers}</span>
              <span style={{fontSize:10,padding:'2px 6px',borderRadius:4,fontWeight:700,background:C.greenLight,color:C.green}}>Terhubung</span>
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
              <span style={{fontSize:11,fontWeight:700,color:C.gold,fontFamily:"'JetBrains Mono'"}}>+{a.xp}</span>
              <span style={{fontSize:10,padding:'2px 6px',borderRadius:4,fontWeight:700,
                background:a.status==='SELESAI'?C.greenLight:C.orangeLight,
                color:a.status==='SELESAI'?C.green:C.orange}}>{a.status}</span>
            </div>
          </div>
        ))}
      </Card>

      {/* Account Type Switcher (Demo) */}
      <Card className="stagger-5">
        <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10}}>Tipe Akun</h3>
        <div className="flex gap-2">
          {Object.entries(ACCOUNT_TYPES).map(([key,at])=>(
            <button key={key} onClick={()=>setAccountType(key)} className="tap-bounce" style={{
              flex:1,padding:'10px 6px',borderRadius:10,border:`1.5px solid ${accountType===key?at.color:C.border}`,
              background:accountType===key?at.color+'12':'transparent',cursor:'pointer',textAlign:'center',
              transition:'all 200ms',
            }}>
              <MI name={at.icon} size={20} fill={accountType===key} style={{color:accountType===key?at.color:C.textMuted}}/>
              <p style={{fontSize:11,fontWeight:accountType===key?700:500,color:accountType===key?at.color:C.textMuted,marginTop:4}}>{at.label}</p>
              <p style={{fontSize:10,color:C.textDark,marginTop:2}}>XP ×{at.xpMultiplier}</p>
            </button>
          ))}
        </div>
        <p style={{fontSize:10,color:C.textMuted,marginTop:8,lineHeight:1.4,textAlign:'center'}}>
          {acctInfo.desc} — Akses {acctInfo.missionTypes.length} tipe misi
        </p>
      </Card>

      {/* Preferences */}
      <div className="stagger-6">
        <h3 style={{fontSize:12,fontWeight:700,color:C.textMuted,textTransform:'uppercase',letterSpacing:1,marginBottom:10,paddingLeft:4}}>Pengaturan</h3>
        <Card style={{padding:0,overflow:'hidden'}}>
          {[
            {icon:'person',label:'Informasi Pribadi'},
            {icon:'lock',label:'Keamanan & Privasi'},
            {icon:'military_tech',label:'Riwayat Dinas'},
            {icon:'notifications',label:'Notifikasi'},
          ].map((item,i,arr)=>(
            <div key={i} onClick={item.action||(()=>showToast(item.label))} className="flex items-center justify-between lb-row" style={{padding:'14px 14px',minHeight:48,borderBottom:i<arr.length-1?`1px solid ${C.borderLight}`:'none',cursor:'pointer'}}>
              <div className="flex items-center gap-3">
                <div style={{width:36,height:36,borderRadius:8,background:C.primaryLight,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <MI name={item.icon} size={18} style={{color:C.primary}}/>
                </div>
                <span style={{fontSize:13,fontWeight:500,color:C.text}}>{item.label}</span>
              </div>
              <MI name="arrow_forward_ios" size={14} style={{color:C.textMuted}}/>
            </div>
          ))}
        </Card>
        <button onClick={()=>{if(logoutConfirm){showToast('Berhasil keluar');setLogoutConfirm(false)}else{setLogoutConfirm(true);setTimeout(()=>setLogoutConfirm(false),3000)}}} className={`tap-bounce ${logoutConfirm?'confirm-bounce':''}`} style={{width:'100%',marginTop:12,padding:'12px 0',borderRadius:12,border:`1px solid ${C.patriot}`,background:logoutConfirm?C.patriot:C.white,color:logoutConfirm?'white':C.patriot,fontWeight:700,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,transition:'all 200ms',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
          <MI name={logoutConfirm?'warning':'logout'} size={16} style={{color:logoutConfirm?'white':C.patriot}}/> {logoutConfirm?'Yakin keluar?':'Sign Out'}
        </button>
      </div>
    </div>
  );}

  /* ─── ADMIN DASHBOARD ───────────────────────────────────────────── */
  function AdminDashboard(){
    const tabs2=[{id:'overview',label:'Overview'},{id:'missions',label:'Misi'},{id:'members',label:'Anggota'},{id:'rewards',label:'Poin & Reward'},{id:'broadcast',label:'Broadcast'},{id:'reports',label:'Laporan'}];
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
          {[{icon:'group',label:'Total Anggota',value:'445K',color:C.primary,bg:C.primaryLight,sub:`${(ADMIN_STATS.prajuritCount/1000).toFixed(0)}K Prajurit · ${((ADMIN_STATS.suamiCount+ADMIN_STATS.istriCount+ADMIN_STATS.anakCount)/1000).toFixed(0)}K Keluarga`},
            {icon:'person_check',label:'Aktif Hari Ini',value:'89.2K',color:C.green,bg:C.greenLight},
            {icon:'target',label:'Misi Aktif',value:ADMIN_STATS.missionsActive.toString(),color:C.accent,bg:C.accentLight},
            {icon:'check_circle',label:'Misi Selesai',value:ADMIN_STATS.missionsCompleted.toString(),color:C.teal,bg:C.tealLight},
          ].map((s,i)=>(
            <Card key={i} style={{padding:14}}>
              <div style={{width:32,height:32,borderRadius:8,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:8}}>
                <MI name={s.icon} size={18} fill style={{color:s.color}}/>
              </div>
              <p style={{fontSize:20,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'"}}>{s.value}</p>
              <p style={{fontSize:11,color:C.textMuted,fontWeight:500}}>{s.label}</p>
              {s.sub&&<p style={{fontSize:9,color:C.textDark,fontWeight:500,marginTop:2}}>{s.sub}</p>}
            </Card>
          ))}
        </div>

        {/* Reach & Engagement */}
        <div className="stagger-4 grid grid-cols-2 gap-3">
          <Card style={{padding:14,background:'linear-gradient(135deg,rgba(20,83,45,0.12),rgba(20,83,45,0.06))',border:'1px solid rgba(20,83,45,0.15)'}}>
            <MI name="public" size={20} style={{color:C.primary}}/>
            <p style={{fontSize:22,fontWeight:800,color:C.text,marginTop:4,fontFamily:"'JetBrains Mono'"}}>24.8M</p>
            <p style={{fontSize:11,color:C.textSec}}>Total Reach</p>
          </Card>
          <Card style={{padding:14,background:'linear-gradient(135deg,rgba(20,83,45,0.08),rgba(20,83,45,0.04))',border:'1px solid rgba(20,83,45,0.12)'}}>
            <MI name="trending_up" size={20} style={{color:C.gold}}/>
            <p style={{fontSize:22,fontWeight:800,color:C.text,marginTop:4,fontFamily:"'JetBrains Mono'"}}>{ADMIN_STATS.avgEngagement}</p>
            <p style={{fontSize:11,color:C.textSec}}>Avg Engagement</p>
          </Card>
        </div>

        {/* Indonesia Mission Heat Map */}
        <div className="stagger-5">
          <IndonesiaMissionMap onSelectZone={z=>showToast(`${z.name}: ${z.missions} misi, ${z.active} aktif`)}/>
        </div>

        {/* Mission Type Breakdown */}
        <Card className="stagger-6">
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
              <span style={{fontSize:16,fontWeight:800,color:typeColor(t),fontFamily:"'JetBrains Mono'"}}>{count}</span>
            </div>);
          })}
        </Card>
      </>)}

      {/* === KELOLA MISI === */}
      {adminTab==='missions'&&(()=>{
        const missionTypes=['Semua','EVENT','KONTEN','ENGAGEMENT','EDUKASI','AKSI'];
        const filteredMissions=adminMissionFilter==='Semua'?MISSIONS:MISSIONS.filter(m=>m.type===adminMissionFilter);
        const totalReach=filteredMissions.reduce((s,m)=>s+(m.participants||0)*120,0);
        const avgCompletion=Math.round(filteredMissions.reduce((s,m)=>s+(m.analytics?.completion||0),0)/filteredMissions.length);
        const activeMissions=filteredMissions.filter(m=>m.status!=='SELESAI').length;
        return(<>
        {/* Mission Summary Stats */}
        <div className="stagger-3 grid grid-cols-3 gap-2">
          {[
            {label:'Misi Aktif',value:activeMissions.toString(),icon:'target',color:C.accent},
            {label:'Avg Completion',value:`${avgCompletion}%`,icon:'trending_up',color:C.green},
            {label:'Est. Reach',value:`${(totalReach/1000000).toFixed(1)}M`,icon:'public',color:C.primary},
          ].map((s,i)=>(
            <Card key={i} style={{padding:10,textAlign:'center'}}>
              <MI name={s.icon} size={16} style={{color:s.color}}/>
              <p style={{fontSize:16,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'",marginTop:2}}>{s.value}</p>
              <p style={{fontSize:9,color:C.textMuted,fontWeight:600}}>{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Type Filter */}
        <div className="stagger-4 flex gap-2 overflow-x-auto hide-scrollbar">
          {missionTypes.map(t=>(
            <button key={t} onClick={()=>setAdminMissionFilter(t)} className="chip-btn" style={{
              padding:'6px 12px',borderRadius:8,fontSize:11,fontWeight:adminMissionFilter===t?700:500,flexShrink:0,
              background:adminMissionFilter===t?(t==='Semua'?C.primary:typeColor(t))+'15':'transparent',
              color:adminMissionFilter===t?(t==='Semua'?C.primary:typeColor(t)):C.textMuted,
              border:`1px solid ${adminMissionFilter===t?(t==='Semua'?C.primary:typeColor(t))+'30':C.border}`,
              cursor:'pointer',
            }}>{t==='Semua'?'Semua':t.charAt(0)+t.slice(1).toLowerCase()}</button>
          ))}
        </div>

        {/* Create Mission CTA */}
        <button onClick={()=>{setAdminTab('missions');setMissionForm(f=>({...f,step:0}));setSelectedAdMission(null);showToast('Buat misi baru — gunakan form di bawah')}} className="btn-primary tap-bounce stagger-4" style={{
          width:'100%',padding:'12px 0',borderRadius:10,border:'none',
          background:`linear-gradient(135deg,${C.primary},${C.primaryAccent})`,
          color:C.white,fontWeight:700,fontSize:13,cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',gap:6,
          boxShadow:`0 4px 16px ${C.primaryGlow}`,
        }}>
          <MI name="add_circle" size={18} style={{color:C.white}}/> Buat Misi Baru
        </button>

        {/* Mission list with reach/engagement */}
        {filteredMissions.map((m,i)=>{
          const tc=typeColor(m.type);
          const estReach=m.participants*120;
          const estEngagement=((m.analytics?.completion||0)*0.15).toFixed(1);
          return(
          <Card key={m.id} className={`stagger-${Math.min(i+5,7)}`} onClick={()=>setSelectedAdMission(m.id)} style={{padding:12,cursor:'pointer'}}>
            <div className="flex items-center gap-3">
              {MISSION_ILLUST[m.id]?(()=>{const il=MISSION_ILLUST[m.id];return(
                <div style={{width:48,height:48,borderRadius:10,overflow:'hidden',flexShrink:0}}>
                  <IllustCard icon={il.icon} bg={il.bg} accent={il.accent} height={48} img={il.img}/>
                </div>);})():<div style={{width:36,height:36,borderRadius:10,background:typeBg(m.type),display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <MI name={typeIcon(m.type)} size={18} fill style={{color:tc}}/>
              </div>}
              <div className="flex-1" style={{minWidth:0}}>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{fontSize:10,fontWeight:700,color:tc,textTransform:'uppercase',letterSpacing:0.5}}>{m.type}</span>
                  <span style={{fontSize:10,fontWeight:600,color:m.status==='SELESAI'?C.green:m.status==='TERBUKA'?C.accent:C.textMuted,
                    background:m.status==='SELESAI'?C.greenLight:m.status==='TERBUKA'?C.accentLight:C.surfaceLight,
                    padding:'1px 6px',borderRadius:4}}>{m.status}</span>
                </div>
                <h3 style={{fontSize:13,fontWeight:600,color:C.text,lineHeight:1.3}} className="truncate">{m.title}</h3>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <span style={{fontSize:12,fontWeight:700,color:C.gold,fontFamily:"'JetBrains Mono'"}}>{m.xp} XP</span>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-4 gap-2 mt-3" style={{padding:8,borderRadius:8,background:C.surfaceLight}}>
              <div style={{textAlign:'center'}}>
                <p style={{fontSize:12,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'"}}>{m.participants}</p>
                <p style={{fontSize:8,color:C.textMuted,fontWeight:600}}>Peserta</p>
              </div>
              <div style={{textAlign:'center'}}>
                <p style={{fontSize:12,fontWeight:800,color:C.primary,fontFamily:"'JetBrains Mono'"}}>{(estReach/1000).toFixed(1)}K</p>
                <p style={{fontSize:8,color:C.textMuted,fontWeight:600}}>Reach</p>
              </div>
              <div style={{textAlign:'center'}}>
                <p style={{fontSize:12,fontWeight:800,color:C.accent,fontFamily:"'JetBrains Mono'"}}>{estEngagement}%</p>
                <p style={{fontSize:8,color:C.textMuted,fontWeight:600}}>Engagement</p>
              </div>
              <div style={{textAlign:'center'}}>
                <p style={{fontSize:12,fontWeight:800,color:tc,fontFamily:"'JetBrains Mono'"}}>{m.analytics?.completion||0}%</p>
                <p style={{fontSize:8,color:C.textMuted,fontWeight:600}}>Completion</p>
              </div>
            </div>

            {/* Completion bar */}
            <div style={{marginTop:6}}>
              <div style={{height:3,borderRadius:99,background:C.borderLight,overflow:'hidden'}}>
                <div style={{width:`${m.analytics?.completion||0}%`,height:'100%',borderRadius:99,background:tc,transition:'width 600ms ease'}}/>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span style={{fontSize:9,color:C.textMuted}}>Deadline: {m.deadline}</span>
                <span style={{fontSize:9,color:C.textMuted}}>Lokasi: {m.analytics?.topCity||'-'}</span>
              </div>
            </div>
          </Card>);
        })}
      </>);})()}

      {/* === ANGGOTA (MEMBERS MANAGEMENT) === */}
      {adminTab==='members'&&(<>
        {/* Member Stats */}
        <div className="stagger-3 grid grid-cols-4 gap-2">
          {[{label:'Prajurit',value:'400K',color:C.primary,icon:'military_tech'},{label:'Suami',value:'32.2K',color:C.accent,icon:'favorite'},{label:'Istri',value:'142.3K',color:C.teal,icon:'favorite'},{label:'Anak',value:'42.2K',color:C.purple,icon:'school'}].map((s,i)=>(
            <Card key={i} style={{padding:10,textAlign:'center'}}>
              <MI name={s.icon} size={18} fill style={{color:s.color}}/>
              <p style={{fontSize:15,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'",marginTop:3}}>{s.value}</p>
              <p style={{fontSize:9,color:C.textMuted,fontWeight:600}}>{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Demographics */}
        <Card className="stagger-4">
          <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:12}}>Demografi Anggota</h3>

          {/* Gender */}
          <div style={{marginBottom:14}}>
            <p style={{fontSize:11,fontWeight:600,color:C.textSec,marginBottom:6}}>Gender</p>
            <div className="flex gap-2 mb-2">
              {[{label:'Pria',value:'286.4K',pct:64,color:C.primary},{label:'Wanita',value:'158.7K',pct:36,color:C.teal}].map((g,i)=>(
                <div key={i} className="flex-1" style={{padding:10,borderRadius:10,background:g.color+'08',border:`1px solid ${g.color}15`}}>
                  <div className="flex items-center justify-between mb-1">
                    <span style={{fontSize:11,fontWeight:600,color:g.color}}>{g.label}</span>
                    <span style={{fontSize:10,fontWeight:700,color:g.color}}>{g.pct}%</span>
                  </div>
                  <p style={{fontSize:16,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'"}}>{g.value}</p>
                  <div style={{height:3,borderRadius:99,background:g.color+'20',overflow:'hidden',marginTop:4}}>
                    <div style={{width:`${g.pct}%`,height:'100%',borderRadius:99,background:g.color}}/>
                  </div>
                </div>
              ))}
            </div>
            <p style={{fontSize:9,color:C.textDark}}>*Prajurit: 92% pria, 8% wanita · Suami: 100% pria · Istri: 100% wanita · Anak: 55% pria, 45% wanita</p>
          </div>

          {/* Age Distribution */}
          <div style={{marginBottom:14}}>
            <p style={{fontSize:11,fontWeight:600,color:C.textSec,marginBottom:6}}>Kelompok Usia</p>
            <div className="flex flex-col gap-2">
              {[
                {range:'18-24',pct:22,count:'90.8K',color:C.purple},
                {range:'25-34',pct:38,count:'156.9K',color:C.primary},
                {range:'35-44',pct:26,count:'107.3K',color:C.accent},
                {range:'45-54',pct:11,count:'45.4K',color:C.teal},
                {range:'55+',pct:3,count:'12.4K',color:C.textMuted},
              ].map((a,i)=>(
                <div key={i} className="flex items-center gap-3">
                  <span style={{fontSize:11,fontWeight:600,color:C.textSec,width:36,flexShrink:0}}>{a.range}</span>
                  <div className="flex-1" style={{height:16,borderRadius:6,background:C.surfaceLight,overflow:'hidden',position:'relative'}}>
                    <div style={{width:`${a.pct}%`,height:'100%',borderRadius:6,background:a.color,transition:'width 800ms cubic-bezier(.16,1,.3,1)',display:'flex',alignItems:'center',paddingLeft:6}}>
                      {a.pct>15&&<span style={{fontSize:9,fontWeight:700,color:'white'}}>{a.pct}%</span>}
                    </div>
                  </div>
                  <span style={{fontSize:10,fontWeight:600,color:C.textMuted,width:40,textAlign:'right',fontFamily:"'JetBrains Mono'",flexShrink:0}}>{a.count}</span>
                </div>
              ))}
            </div>
            <p style={{fontSize:9,color:C.textDark,marginTop:4}}>Rata-rata usia: 31.4 tahun · Anak (di bawah 18): 42.2K terpisah</p>
          </div>

          {/* Education */}
          <div style={{marginBottom:14}}>
            <p style={{fontSize:11,fontWeight:600,color:C.textSec,marginBottom:6}}>Pendidikan Terakhir</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                {label:'SMA/SMK',pct:42,color:C.accent},
                {label:'D3/D4',pct:18,color:C.teal},
                {label:'S1',pct:32,color:C.primary},
                {label:'S2+',pct:8,color:C.purple},
              ].map((e,i)=>(
                <div key={i} style={{textAlign:'center',padding:8,borderRadius:8,background:e.color+'08',border:`1px solid ${e.color}12`}}>
                  <p style={{fontSize:16,fontWeight:800,color:e.color,fontFamily:"'JetBrains Mono'"}}>{e.pct}%</p>
                  <p style={{fontSize:9,color:C.textMuted,fontWeight:600,marginTop:2}}>{e.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pangkat Distribution */}
          <div style={{marginBottom:14}}>
            <p style={{fontSize:11,fontWeight:600,color:C.textSec,marginBottom:6}}>Distribusi Pangkat</p>
            <div className="flex flex-col gap-2">
              {[
                {rank:'Tamtama (Prada-Kopka)',pct:45,count:'180K',color:C.textMuted},
                {rank:'Bintara (Serda-Pelda)',pct:38,count:'152K',color:C.accent},
                {rank:'Perwira Pertama (Letda-Kapten)',pct:12,count:'48K',color:C.primary},
                {rank:'Perwira Menengah (Mayor-Kolonel)',pct:4,count:'16K',color:C.gold},
                {rank:'Perwira Tinggi (Brigjen+)',pct:1,count:'4K',color:C.patriot},
              ].map((p,i)=>(
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1" style={{minWidth:0}}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{fontSize:10,fontWeight:600,color:C.text}} className="truncate">{p.rank}</span>
                      <span style={{fontSize:10,fontWeight:700,color:p.color,fontFamily:"'JetBrains Mono'",flexShrink:0,marginLeft:8}}>{p.count}</span>
                    </div>
                    <div style={{height:4,borderRadius:99,background:C.surfaceLight,overflow:'hidden'}}>
                      <div style={{width:`${p.pct}%`,height:'100%',borderRadius:99,background:p.color}}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Social Media Connected */}
          <div>
            <p style={{fontSize:11,fontWeight:600,color:C.textSec,marginBottom:6}}>Akun Sosial Media Terhubung</p>
            <div className="flex flex-col gap-2">
              {[
                {platform:'Instagram',connected:'312.4K',pct:76,color:'#E1306C',icon:'instagram'},
                {platform:'TikTok',connected:'278.6K',pct:67,color:'#1A1A1A',icon:'tiktok'},
                {platform:'X (Twitter)',connected:'189.2K',pct:46,color:'#1DA1F2',icon:'x'},
                {platform:'Facebook',connected:'156.8K',pct:38,color:'#1877F2',icon:'facebook'},
                {platform:'YouTube',connected:'98.4K',pct:24,color:'#FF0000',icon:'youtube'},
              ].map((s,i)=>(
                <div key={i} className="flex items-center gap-3" style={{padding:'6px 0'}}>
                  <div style={{width:28,height:28,borderRadius:8,background:s.color+'15',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {s.icon==='instagram'?<IgIcon size={14} color={s.color}/>:
                     s.icon==='tiktok'?<TiktokIcon size={14} color={s.color}/>:
                     s.icon==='x'?<XIcon size={14} color={s.color}/>:
                     <MI name={s.icon==='facebook'?'thumb_up':'play_circle'} size={14} style={{color:s.color}}/>}
                  </div>
                  <div className="flex-1" style={{minWidth:0}}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{fontSize:11,fontWeight:600,color:C.text}}>{s.platform}</span>
                      <span style={{fontSize:10,fontWeight:700,color:C.textSec,fontFamily:"'JetBrains Mono'"}}>{s.connected} <span style={{color:C.textMuted,fontWeight:500}}>({s.pct}%)</span></span>
                    </div>
                    <div style={{height:3,borderRadius:99,background:s.color+'15',overflow:'hidden'}}>
                      <div style={{width:`${s.pct}%`,height:'100%',borderRadius:99,background:s.color}}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{marginTop:8,padding:10,borderRadius:8,background:C.primaryLight,border:`1px solid ${C.primary}15`}}>
              <div className="flex items-center gap-2">
                <MI name="info" size={14} style={{color:C.primary}}/>
                <p style={{fontSize:10,color:C.primary,fontWeight:600}}>Total reach potensial: <span style={{fontFamily:"'JetBrains Mono'",fontWeight:800}}>83.6M</span> audiens (asumsi avg 100 followers/akun)</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Regional Map: Age Heatmap */}
        <Card className="stagger-5">
          <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:6}}>Sebaran Usia per Wilayah</h3>
          <p style={{fontSize:10,color:C.textMuted,marginBottom:10}}>Rata-rata usia anggota per Kodam</p>
          <div className="flex flex-col gap-2">
            {[
              {kodam:'Kodam Jaya (Jakarta)',avgAge:29.1,young:34,color:C.purple},
              {kodam:'Kodam V/Brawijaya (Surabaya)',avgAge:30.8,young:28,color:C.primary},
              {kodam:'Kodam III/Siliwangi (Bandung)',avgAge:31.2,young:26,color:C.primary},
              {kodam:'Kodam I/Bukit Barisan (Medan)',avgAge:33.5,young:21,color:C.accent},
              {kodam:'Kodam XVII/Cenderawasih (Papua)',avgAge:27.4,young:42,color:C.purple},
            ].map((k,i)=>(
              <div key={i} className="flex items-center gap-3" style={{padding:'6px 0',borderBottom:i<4?`1px solid ${C.borderLight}`:'none'}}>
                <div className="flex-1" style={{minWidth:0}}>
                  <p style={{fontSize:11,fontWeight:600,color:C.text}} className="truncate">{k.kodam}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span style={{fontSize:10,color:C.textMuted}}>Avg: <strong style={{color:k.color}}>{k.avgAge}</strong> thn</span>
                    <span style={{fontSize:9,color:C.textDark}}>·</span>
                    <span style={{fontSize:10,color:C.purple}}>Gen Z: <strong>{k.young}%</strong></span>
                  </div>
                </div>
                <div style={{width:48,height:24,borderRadius:6,background:`linear-gradient(90deg,${C.purple}${Math.round(k.young/42*99).toString(16).padStart(2,'0')},${C.accent}${Math.round((100-k.young)/100*99).toString(16).padStart(2,'0')})`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <span style={{fontSize:9,fontWeight:800,color:C.white}}>{k.avgAge}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="stagger-6">
          <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10}}>Aksi Cepat</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              {icon:'person_add',label:'Tambah Anggota',desc:'Input NRP baru',color:C.primary},
              {icon:'upload',label:'Import CSV',desc:'Bulk upload data',color:C.accent},
              {icon:'download',label:'Export Data',desc:'Download .xlsx',color:C.green},
              {icon:'qr_code',label:'QR Registrasi',desc:'Generate QR link',color:C.purple},
            ].map((a,i)=>(
              <button key={i} onClick={()=>showToast(a.label)} className="tap-bounce lb-row" style={{
                padding:12,borderRadius:12,border:`1px solid ${C.border}`,background:C.bgCard,
                cursor:'pointer',textAlign:'left',display:'flex',alignItems:'flex-start',gap:10,
              }}>
                <div style={{width:36,height:36,borderRadius:10,background:a.color+'12',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <MI name={a.icon} size={18} style={{color:a.color}}/>
                </div>
                <div>
                  <p style={{fontSize:12,fontWeight:600,color:C.text}}>{a.label}</p>
                  <p style={{fontSize:10,color:C.textMuted}}>{a.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Members by Kodam */}
        <Card className="stagger-5">
          <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10}}>Anggota per Kodam</h3>
          {KODAM_ZONES.sort((a,b)=>b.agents-a.agents).slice(0,8).map((z,i)=>{
            const pct=Math.round(z.agents/KODAM_ZONES.reduce((s,zz)=>s+zz.agents,0)*100);
            return(
            <div key={z.id} className="flex items-center gap-3" style={{padding:'8px 0',borderBottom:i<7?`1px solid ${C.borderLight}`:'none'}}>
              <div style={{width:28,height:28,borderRadius:8,background:mapStatusColor(z.status)+'15',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <span style={{fontSize:11,fontWeight:800,color:mapStatusColor(z.status)}}>{i+1}</span>
              </div>
              <div className="flex-1" style={{minWidth:0}}>
                <p style={{fontSize:12,fontWeight:600,color:C.text}} className="truncate">{z.name}</p>
                <div style={{height:3,borderRadius:99,background:C.borderLight,overflow:'hidden',marginTop:4}}>
                  <div style={{width:`${pct}%`,height:'100%',borderRadius:99,background:mapStatusColor(z.status),transition:'width 600ms ease'}}/>
                </div>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <span style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:"'JetBrains Mono'"}}>{(z.agents/1000).toFixed(1)}K</span>
                <p style={{fontSize:9,color:C.textMuted}}>{pct}%</p>
              </div>
            </div>);
          })}
        </Card>

        {/* Recent Activity */}
        <Card className="stagger-6">
          <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10}}>Aktivitas Terbaru</h3>
          {[
            {action:'Registrasi baru',name:'Koptu Ahmad Fauzi',kodam:'Kodam Jaya',time:'5 menit lalu',icon:'person_add',color:C.green},
            {action:'Naik pangkat',name:'Sertu Budi Pratama',kodam:'Kodam V/Brawijaya',time:'12 menit lalu',icon:'trending_up',color:C.accent},
            {action:'Keluarga bergabung',name:'Ratna Sari (Istri)',kodam:'Kodam III/Siliwangi',time:'28 menit lalu',icon:'group_add',color:C.teal},
            {action:'Akun diverifikasi',name:'Kapten Dedy Kurniawan',kodam:'Kodam XIV/Hasanuddin',time:'1 jam lalu',icon:'verified',color:C.primary},
            {action:'Reward ditebus',name:'Pratu Indra Wijaya',kodam:'Kodam IV/Diponegoro',time:'2 jam lalu',icon:'stars',color:C.gold},
          ].map((a,i)=>(
            <div key={i} className="flex items-center gap-3" style={{padding:'8px 0',borderBottom:i<4?`1px solid ${C.borderLight}`:'none'}}>
              <div style={{width:32,height:32,borderRadius:8,background:a.color+'12',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <MI name={a.icon} size={16} style={{color:a.color}}/>
              </div>
              <div className="flex-1" style={{minWidth:0}}>
                <p style={{fontSize:12,fontWeight:600,color:C.text}}>{a.action}</p>
                <p style={{fontSize:10,color:C.textMuted}}>{a.name} · {a.kodam}</p>
              </div>
              <span style={{fontSize:10,color:C.textDark,flexShrink:0}}>{a.time}</span>
            </div>
          ))}
        </Card>
      </>)}

      {/* === POIN & REWARD === */}
      {adminTab==='rewards'&&(<>
        {/* Points Overview */}
        <div className="stagger-3 grid grid-cols-2 gap-3">
          <Card style={{padding:14,background:`linear-gradient(135deg,${C.goldLight},rgba(217,119,6,0.04))`,border:`1px solid ${C.accent}20`}}>
            <MI name="stars" size={20} fill style={{color:C.accent}}/>
            <p style={{fontSize:22,fontWeight:800,color:C.text,marginTop:4,fontFamily:"'JetBrains Mono'"}}>8.4M</p>
            <p style={{fontSize:11,color:C.textSec}}>Total XP Distributed</p>
          </Card>
          <Card style={{padding:14,background:`linear-gradient(135deg,${C.greenLight},rgba(22,163,74,0.04))`,border:`1px solid ${C.green}20`}}>
            <MI name="toll" size={20} style={{color:C.green}}/>
            <p style={{fontSize:22,fontWeight:800,color:C.text,marginTop:4,fontFamily:"'JetBrains Mono'"}}>2.1M</p>
            <p style={{fontSize:11,color:C.textSec}}>Poin Ditukar</p>
          </Card>
        </div>

        {/* Reward Actions */}
        <Card className="stagger-4">
          <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10}}>Kelola Reward</h3>
          {[
            {icon:'add_circle',label:'Buat Reward Baru',desc:'Tambah item reward ke katalog',color:C.primary},
            {icon:'edit',label:'Update Poin Misi',desc:'Ubah XP untuk misi tertentu',color:C.accent},
            {icon:'stars',label:'Bonus XP Manual',desc:'Beri bonus XP ke anggota/kodam',color:C.gold},
            {icon:'emoji_events',label:'Buat Event Reward',desc:'Special reward event terbatas',color:C.purple},
          ].map((a,i)=>(
            <div key={i} onClick={()=>showToast(a.label)} className="flex items-center gap-3 lb-row" style={{padding:'10px 0',borderBottom:i<3?`1px solid ${C.borderLight}`:'none',cursor:'pointer'}}>
              <div style={{width:36,height:36,borderRadius:10,background:a.color+'12',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <MI name={a.icon} size={18} style={{color:a.color}}/>
              </div>
              <div className="flex-1">
                <p style={{fontSize:12,fontWeight:600,color:C.text}}>{a.label}</p>
                <p style={{fontSize:10,color:C.textMuted}}>{a.desc}</p>
              </div>
              <MI name="arrow_forward_ios" size={14} style={{color:C.textMuted}}/>
            </div>
          ))}
        </Card>

        {/* Reward Catalog */}
        <Card className="stagger-5">
          <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10}}>Katalog Reward Aktif</h3>
          {[
            {name:'Voucher Tokopedia 50K',cost:'500 XP',claimed:1240,stock:5000,color:C.green},
            {name:'Merchandise TNI AD',cost:'800 XP',claimed:890,stock:2000,color:C.primary},
            {name:'Sertifikat Digital Apresiasi',cost:'200 XP',claimed:3200,stock:99999,color:C.accent},
            {name:'Tiket Konser Spesial',cost:'2000 XP',claimed:156,stock:500,color:C.purple},
            {name:'Voucher Pulsa 25K',cost:'250 XP',claimed:2800,stock:10000,color:C.teal},
          ].map((r,i)=>(
            <div key={i} className="flex items-center gap-3" style={{padding:'10px 0',borderBottom:i<4?`1px solid ${C.borderLight}`:'none'}}>
              <div style={{width:36,height:36,borderRadius:10,background:r.color+'12',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <MI name="storefront" size={16} style={{color:r.color}}/>
              </div>
              <div className="flex-1" style={{minWidth:0}}>
                <p style={{fontSize:12,fontWeight:600,color:C.text}}>{r.name}</p>
                <p style={{fontSize:10,color:C.textMuted}}>{r.cost} · {r.claimed.toLocaleString()} ditebus</p>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{height:3,width:48,borderRadius:99,background:C.borderLight,overflow:'hidden'}}>
                  <div style={{width:`${Math.min(100,r.claimed/r.stock*100)}%`,height:'100%',borderRadius:99,background:r.color}}/>
                </div>
                <p style={{fontSize:9,color:C.textDark,marginTop:2}}>{r.stock-r.claimed>99999?'∞':((r.stock-r.claimed)/1000).toFixed(1)+'K'} sisa</p>
              </div>
            </div>
          ))}
        </Card>

        {/* Top Earners */}
        <Card className="stagger-6">
          <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10}}>Top XP Earners Bulan Ini</h3>
          {[
            {name:'Kapten Surya Dharma',kodam:'Kodam Jaya',xp:12450,rank:1,avatar:'SN'},
            {name:'Lettu Andika Pratama',kodam:'Kodam V/Brawijaya',xp:11200,rank:2,avatar:'AR'},
            {name:'Mayor Dwi Santoso',kodam:'Kodam III/Siliwangi',xp:10800,rank:3,avatar:'DP'},
            {name:'Serma Rizky Fadillah',kodam:'Kodam IV/Diponegoro',xp:9650,rank:4,avatar:'RS'},
            {name:'Pratu Bagas Nugroho',kodam:'Kodam XIV/Hasanuddin',xp:8900,rank:5,avatar:'BH'},
          ].map((e,i)=>(
            <div key={i} className="flex items-center gap-3" style={{padding:'8px 0',borderBottom:i<4?`1px solid ${C.borderLight}`:'none'}}>
              <div style={{position:'relative'}}>
                <AvatarImg initials={e.avatar} size={32} style={{borderRadius:'50%',border:i<3?`2px solid ${[C.gold,C.primary,C.accent][i]}`:`1px solid ${C.border}`}}/>
                <div style={{position:'absolute',bottom:-2,right:-2,width:16,height:16,borderRadius:'50%',background:i<3?[C.gold,C.primary,C.accent][i]:C.surfaceLight,display:'flex',alignItems:'center',justifyContent:'center',border:`1.5px solid ${C.bg}`,fontSize:8,fontWeight:800,color:i<3?'#fff':C.textMuted}}>{e.rank}</div>
              </div>
              <div className="flex-1" style={{minWidth:0}}>
                <p style={{fontSize:12,fontWeight:600,color:C.text}}>{e.name}</p>
                <p style={{fontSize:10,color:C.textMuted}}>{e.kodam}</p>
              </div>
              <span style={{fontSize:13,fontWeight:800,color:C.gold,fontFamily:"'JetBrains Mono'"}}>{e.xp.toLocaleString()}</span>
            </div>
          ))}
        </Card>
      </>)}

      {/* === BROADCAST === */}
      {adminTab==='broadcast'&&(<>
        {/* Broadcast Stats */}
        <div className="stagger-3 grid grid-cols-2 gap-3">
          <Card style={{padding:14}}>
            <MI name="send" size={18} style={{color:C.primary}}/>
            <p style={{fontSize:20,fontWeight:800,color:C.text,marginTop:4,fontFamily:"'JetBrains Mono'"}}>47</p>
            <p style={{fontSize:11,color:C.textMuted}}>Total Broadcast</p>
          </Card>
          <Card style={{padding:14}}>
            <MI name="visibility" size={18} style={{color:C.green}}/>
            <p style={{fontSize:20,fontWeight:800,color:C.text,marginTop:4,fontFamily:"'JetBrains Mono'"}}>94.2%</p>
            <p style={{fontSize:11,color:C.textMuted}}>Open Rate</p>
          </Card>
        </div>

        {/* New Broadcast */}
        <Card className="stagger-4" style={{borderLeft:`3px solid ${C.patriot}`}}>
          <div className="flex items-center gap-2 mb-3">
            <MI name="notifications_active" size={18} fill style={{color:C.patriot}}/>
            <h3 style={{fontSize:14,fontWeight:700,color:C.text}}>Kirim Broadcast Baru</h3>
          </div>
          <div className="flex flex-col gap-3">
            {/* Target */}
            <div>
              <p style={{fontSize:11,fontWeight:600,color:C.textSec,marginBottom:4}}>Target Penerima</p>
              <div className="flex gap-2 flex-wrap">
                {[{label:'Semua (412.8K)',active:true},{label:'Prajurit Only'},{label:'Per Kodam'},{label:'Per Pangkat'}].map((t,i)=>(
                  <button key={i} className="tap-bounce" style={{
                    padding:'6px 12px',borderRadius:8,fontSize:11,fontWeight:t.active?700:500,
                    background:t.active?C.primary:C.surfaceLight,color:t.active?C.white:C.textMuted,
                    border:`1px solid ${t.active?C.primary:C.border}`,cursor:'pointer',
                  }}>{t.label}</button>
                ))}
              </div>
            </div>
            {/* Priority */}
            <div>
              <p style={{fontSize:11,fontWeight:600,color:C.textSec,marginBottom:4}}>Tingkat Urgensi</p>
              <div className="flex gap-2">
                {[{label:'Normal',color:C.primary,active:false},{label:'Penting',color:C.accent,active:true},{label:'Darurat',color:C.patriot,active:false}].map((p,i)=>(
                  <button key={i} className="tap-bounce" style={{
                    padding:'6px 14px',borderRadius:8,fontSize:11,fontWeight:p.active?700:500,
                    background:p.active?p.color+'15':C.surfaceLight,color:p.active?p.color:C.textMuted,
                    border:`1px solid ${p.active?p.color+'40':C.border}`,cursor:'pointer',flex:1,
                  }}>{p.label}</button>
                ))}
              </div>
            </div>
            {/* Message */}
            <div>
              <p style={{fontSize:11,fontWeight:600,color:C.textSec,marginBottom:4}}>Pesan</p>
              <div style={{minHeight:64,borderRadius:10,border:`1px solid ${C.border}`,background:C.surfaceLight,padding:10,fontSize:12,color:C.textMuted,lineHeight:1.5}}>
                Ketuk untuk menulis pesan broadcast...
              </div>
            </div>
            {/* Send Button */}
            <button onClick={()=>showToast('Broadcast terkirim ke 412,847 anggota!')} className="btn-primary tap-bounce" style={{
              width:'100%',padding:'12px 0',borderRadius:10,border:'none',
              background:`linear-gradient(135deg,${C.primary},${C.primaryAccent})`,
              color:C.white,fontWeight:700,fontSize:13,cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',gap:6,
              boxShadow:`0 4px 16px ${C.primaryGlow}`,
            }}>
              <MI name="send" size={16} style={{color:C.white}}/> Kirim Broadcast
            </button>
          </div>
        </Card>

        {/* Recent Broadcasts */}
        <Card className="stagger-5">
          <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10}}>Broadcast Terakhir</h3>
          {[
            {title:'Misi Baru: Upacara HUT TNI AD ke-81',target:'Semua Anggota',time:'2 jam lalu',urgency:'Penting',read:'89.2K',color:C.accent},
            {title:'Pengingat: Deadline Submit Konten',target:'Prajurit (EVENT)',time:'6 jam lalu',urgency:'Normal',read:'45.1K',color:C.primary},
            {title:'DARURAT: Banjir Demak — Mobilisasi Bantuan',target:'Kodam IV/Diponegoro',time:'1 hari lalu',urgency:'Darurat',read:'35.4K',color:C.patriot},
            {title:'Update: Reward Baru di Toko SINAR',target:'Semua Anggota',time:'2 hari lalu',urgency:'Normal',read:'112.6K',color:C.primary},
            {title:'Pelatihan Digital Content untuk Kader',target:'Prajurit Only',time:'3 hari lalu',urgency:'Penting',read:'67.8K',color:C.accent},
          ].map((b,i)=>(
            <div key={i} className="flex items-center gap-3" style={{padding:'10px 0',borderBottom:i<4?`1px solid ${C.borderLight}`:'none'}}>
              <div style={{width:4,height:36,borderRadius:4,background:b.color,flexShrink:0}}/>
              <div className="flex-1" style={{minWidth:0}}>
                <p style={{fontSize:12,fontWeight:600,color:C.text,lineHeight:1.3}} className="truncate">{b.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span style={{fontSize:10,fontWeight:600,color:b.color,background:b.color+'12',padding:'1px 6px',borderRadius:4}}>{b.urgency}</span>
                  <span style={{fontSize:10,color:C.textMuted}}>{b.target}</span>
                </div>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <p style={{fontSize:11,fontWeight:700,color:C.text,fontFamily:"'JetBrains Mono'"}}>{b.read}</p>
                <p style={{fontSize:9,color:C.textDark}}>{b.time}</p>
              </div>
            </div>
          ))}
        </Card>
      </>)}

      {/* === LAPORAN === */}
      {adminTab==='reports'&&(<>
        {/* Report Period */}
        <Card className="stagger-3" style={{padding:14}}>
          <div className="flex items-center justify-between mb-3">
            <h3 style={{fontSize:14,fontWeight:700,color:C.text}}>Laporan Periode</h3>
            <div className="flex gap-1">
              {['7D','30D','90D','1Y'].map(p=>(
                <button key={p} className="tap-bounce" style={{
                  padding:'4px 10px',borderRadius:6,fontSize:10,fontWeight:600,
                  background:p==='30D'?C.primaryLight:'transparent',
                  color:p==='30D'?C.primary:C.textMuted,
                  border:`1px solid ${p==='30D'?C.primary+'30':C.border}`,cursor:'pointer',
                }}>{p}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              {label:'Misi Selesai',value:'156',change:'+23%',up:true},
              {label:'Anggota Baru',value:'12.4K',change:'+18%',up:true},
              {label:'XP Didistribusikan',value:'2.1M',change:'+31%',up:true},
              {label:'Reward Ditebus',value:'8.2K',change:'+12%',up:true},
              {label:'Avg Completion Rate',value:'72%',change:'-3%',up:false},
              {label:'Avg Engagement',value:'12.3%',change:'+5%',up:true},
            ].map((s,i)=>(
              <div key={i} style={{padding:10,borderRadius:10,background:C.surfaceLight,border:`1px solid ${C.borderLight}`}}>
                <p style={{fontSize:10,color:C.textMuted,fontWeight:500}}>{s.label}</p>
                <p style={{fontSize:18,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'",marginTop:2}}>{s.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  <MI name={s.up?'trending_up':'trending_up'} size={12} style={{color:s.up?C.green:C.red,transform:s.up?'none':'scaleY(-1)'}}/>
                  <span style={{fontSize:10,fontWeight:700,color:s.up?C.green:C.red}}>{s.change}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Performing Kodam */}
        <Card className="stagger-4">
          <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10}}>Performa Kodam</h3>
          {KODAM_ZONES.sort((a,b)=>(b.active/b.missions)-(a.active/a.missions)).slice(0,6).map((z,i)=>{
            const completionRate=Math.round(((z.missions-z.active)/z.missions)*100);
            return(
            <div key={z.id} className="flex items-center gap-3" style={{padding:'8px 0',borderBottom:i<5?`1px solid ${C.borderLight}`:'none'}}>
              <div style={{width:28,height:28,borderRadius:8,background:mapStatusColor(z.status)+'15',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <MI name="location_on" size={14} style={{color:mapStatusColor(z.status)}}/>
              </div>
              <div className="flex-1">
                <p style={{fontSize:12,fontWeight:600,color:C.text}}>{z.city}</p>
                <p style={{fontSize:10,color:C.textMuted}}>{z.missions} misi · {z.active} aktif</p>
              </div>
              <div style={{textAlign:'right'}}>
                <span style={{fontSize:12,fontWeight:800,color:completionRate>60?C.green:C.accent,fontFamily:"'JetBrains Mono'"}}>{completionRate}%</span>
                <p style={{fontSize:9,color:C.textDark}}>selesai</p>
              </div>
            </div>);
          })}
        </Card>

        {/* Export Actions */}
        <Card className="stagger-5">
          <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10}}>Export Laporan</h3>
          {[
            {icon:'description',label:'Laporan Bulanan',desc:'PDF ringkasan aktivitas bulan ini',format:'PDF',color:C.patriot},
            {icon:'analytics',label:'Data Misi & Partisipasi',desc:'Spreadsheet detail semua misi',format:'XLSX',color:C.green},
            {icon:'group',label:'Data Anggota',desc:'Database anggota per Kodam',format:'CSV',color:C.primary},
            {icon:'trending_up',label:'Analisis Performa',desc:'Dashboard metrics & KPI',format:'PDF',color:C.accent},
            {icon:'public',label:'Laporan Jangkauan',desc:'Social media reach & engagement',format:'XLSX',color:C.purple},
          ].map((r,i)=>(
            <div key={i} onClick={()=>showToast(`Mengunduh ${r.label}...`)} className="flex items-center gap-3 lb-row" style={{padding:'10px 0',borderBottom:i<4?`1px solid ${C.borderLight}`:'none',cursor:'pointer'}}>
              <div style={{width:36,height:36,borderRadius:10,background:r.color+'12',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <MI name={r.icon} size={18} style={{color:r.color}}/>
              </div>
              <div className="flex-1">
                <p style={{fontSize:12,fontWeight:600,color:C.text}}>{r.label}</p>
                <p style={{fontSize:10,color:C.textMuted}}>{r.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <span style={{fontSize:9,fontWeight:700,color:r.color,background:r.color+'12',padding:'2px 6px',borderRadius:4}}>{r.format}</span>
                <MI name="download" size={14} style={{color:C.textMuted}}/>
              </div>
            </div>
          ))}
        </Card>
      </>)}
    </div>);}

  /* ─── UPLOAD & VERIFIKASI ───────────────────────────────────────── */
  function KontenSaya(){
    const [kontenTab,setKontenTab]=useState('semua');
    const myPosts=[
      {id:1,platform:'tiktok',type:'video',title:'POV: Prajurit TNI AD Nolong Nenek di Jalan',date:'6 Mar 2026',
        views:'328.4K',likes:'42.3K',comments:'5.2K',shares:'14.5K',saves:'8.1K',rate:21.2,trending:true,
        missionId:4,missionTitle:'Video Reels: Hari-Hari Prajurit TNI AD',status:'SELESAI',xpEarned:350,
        img:'/images/post-tiktok-nolong-nenek.png'},
      {id:2,platform:'instagram',type:'reels',title:'Behind The Scenes Latihan Prajurit TNI AD',date:'4 Mar 2026',
        views:'85.8K',likes:'11.6K',comments:'842',shares:'3.8K',saves:'2.9K',rate:14.8,trending:true,
        missionId:4,missionTitle:'Video Reels: Hari-Hari Prajurit TNI AD',status:'SELESAI',xpEarned:350,
        img:'/images/post-ig-bts-latihan.png'},
      {id:3,platform:'x',type:'thread',title:'Thread: 7 Fakta Modernisasi Alutsista TNI AD',date:'2 Mar 2026',
        views:'45.2K',likes:'6.1K',comments:'387',shares:'2.9K',saves:'1.4K',rate:12.4,trending:false,
        missionId:7,missionTitle:'Dukung Konten Resmi DISPENAD',status:'SELESAI',xpEarned:200},
      {id:4,platform:'tiktok',type:'video',title:'Saat TNI AD Bantu Korban Banjir Demak',date:'28 Feb 2026',
        views:'456.1K',likes:'58.9K',comments:'7.4K',shares:'18.7K',saves:'9.2K',rate:22.1,trending:true,
        missionId:2,missionTitle:'Bakti Sosial TNI AD — Operasi Pembangunan Desa',status:'SELESAI',xpEarned:500,
        img:'/images/post-tiktok-banjir.png'},
      {id:5,platform:'instagram',type:'carousel',title:'Infografis Peran TNI AD dalam Bencana Alam',date:'25 Feb 2026',
        views:'62.3K',likes:'8.2K',comments:'456',shares:'3.9K',saves:'2.4K',rate:11.6,trending:false,
        missionId:5,missionTitle:'Infografis: Peran TNI AD dalam Bencana Alam',status:'REVIEW',xpEarned:0,
        img:'/images/post-ig-infografis-bencana.png'},
    ];
    const filtered=kontenTab==='semua'?myPosts:myPosts.filter(p=>p.platform===kontenTab);
    const totalViews='470.8K';const totalLikes='52.1K';const totalShares='16.8K';const avgRate='12.4%';
    const totalXpEarned=myPosts.reduce((s,p)=>s+p.xpEarned,0);
    const pCol=p=>({instagram:'#E1306C',tiktok:'#1A1A1A',x:'#1DA1F2'}[p]||C.text);
    const pLbl=p=>({instagram:'Instagram',tiktok:'TikTok',x:'X (Twitter)'}[p]||p);
    const tIcon=t=>({video:'play_circle',reels:'slow_motion_video',thread:'article',carousel:'view_carousel'}[t]||'image');

    return(<div key={k} className="flex flex-col gap-4 pb-4">
      <div className="stagger-1 flex items-center justify-between" style={{paddingTop:4}}>
        <h1 style={{fontSize:24,fontWeight:800,color:C.text}}>Konten Saya</h1>
        {totalXpEarned>0&&<div style={{background:C.goldLight,borderRadius:8,padding:'4px 12px',border:'1px solid rgba(20,83,45,0.15)',display:'flex',alignItems:'center',gap:4}}>
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
                  <p style={{fontSize:10,color:C.orange,fontWeight:600}}>Deadline: {m.deadline}</p>
                </div>
                <MI name="arrow_forward_ios" size={12} style={{color:C.textMuted}}/>
              </div>);
            })}
          </div>
        </Card>);
      })()}

      {/* Overview Stats */}
      <div className="stagger-2" style={{borderRadius:14,overflow:'hidden',position:'relative',background:`linear-gradient(135deg,${C.primaryDark},${C.primary})`,padding:'14px 10px 12px'}}>
        <div style={{position:'absolute',top:-30,right:-20,width:80,height:80,borderRadius:'50%',background:'rgba(255,255,255,0.04)'}}/>
        <div className="flex items-center gap-1.5" style={{marginBottom:10}}>
          <MI name="analytics" size={12} style={{color:'rgba(255,255,255,0.6)'}}/>
          <span style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.6)',letterSpacing:1.5,textTransform:'uppercase'}}>Performa Konten</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[{l:'Views',v:totalViews,accent:'#FFFFFF'},{l:'Likes',v:totalLikes,accent:'#FCA5A5'},{l:'Shares',v:totalShares,accent:'#99F6E4'},{l:'Eng. Rate',v:avgRate,accent:'#FDE68A'}].map((s,i)=>(
            <div key={i} style={{background:'rgba(255,255,255,0.1)',borderRadius:10,padding:'10px 4px',textAlign:'center',border:'1px solid rgba(255,255,255,0.08)'}}>
              <p style={{fontSize:15,fontWeight:800,color:s.accent,fontFamily:"'JetBrains Mono'",lineHeight:1}}>{s.v}</p>
              <p style={{fontSize:9,color:'rgba(255,255,255,0.5)',fontWeight:700,marginTop:3,textTransform:'uppercase',letterSpacing:0.3}}>{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Platform Breakdown */}
      <Card className="stagger-3">
        <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10}}>Performa per Platform</h3>
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
          <div style={{margin:'10px 14px',borderRadius:10,overflow:'hidden',position:'relative'}}>
            {post.img?
              <img src={post.img} alt="" style={{width:'100%',height:120,objectFit:'cover',display:'block'}}/>
            :(()=>{const pi=POST_ILLUST[post.type]||POST_ILLUST.video;return(
              <IllustCard icon={pi.icon} bg={pi.bg} accent={pi.accent} height={120}/>
            );})()}
            <div style={{position:'absolute',inset:0,background:'linear-gradient(0deg,rgba(0,0,0,0.5) 0%,transparent 50%)',pointerEvents:'none'}}/>
            {(post.type==='video'||post.type==='reels')&&<div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:40,height:40,borderRadius:'50%',background:'rgba(255,255,255,0.85)',display:'flex',alignItems:'center',justifyContent:'center'}}><MI name="play_circle" size={24} fill style={{color:C.primary}}/></div>}
            <p style={{position:'absolute',bottom:8,left:10,right:10,fontSize:12,fontWeight:700,color:'#fff',lineHeight:1.3}}>{post.title}</p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-5 gap-1" style={{padding:'0 14px 10px'}}>
            {[{l:'Views',v:post.views,icon:'visibility'},{l:'Likes',v:post.likes,icon:'favorite'},{l:'Comments',v:post.comments,icon:'chat_bubble'},{l:'Shares',v:post.shares,icon:'share'},{l:'Saves',v:post.saves,icon:'bookmark'}].map((m,j)=>(
              <div key={j} style={{background:C.surfaceLight,borderRadius:6,padding:'6px 2px',textAlign:'center'}}>
                <MI name={m.icon} size={13} style={{color:C.textMuted}}/>
                <p style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:"'JetBrains Mono'"}}>{m.v}</p>
                <p style={{fontSize:10,color:C.textMuted,fontWeight:600}}>{m.l}</p>
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
              <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:4,
                background:post.status==='SELESAI'?C.greenLight:C.orangeLight,
                color:post.status==='SELESAI'?C.green:C.orange,
              }}>{post.status==='SELESAI'?'Selesai':'Direview'}</span>
              {post.status==='SELESAI'&&post.xpEarned>0&&(
                <span style={{fontSize:10,fontWeight:800,color:C.gold,background:C.goldLight,borderRadius:6,padding:'2px 8px',fontFamily:"'JetBrains Mono'",border:'1px solid rgba(20,83,45,0.15)'}}>+{post.xpEarned} XP</span>
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
      {id:1,cat:'apparel',name:'Kaos TNI AD Tactical',desc:'Kaos cotton combed 30s, desain patch TNI AD resmi',cost:1500,icon:'checkroom',color:C.primary,stock:25,popular:true,img:'/images/shop-kaos-tactical-v2.png'},
      {id:2,cat:'apparel',name:'Jaket Parka TNI AD',desc:'Jaket parka waterproof, patch emblem TNI AD di lengan',cost:4500,icon:'checkroom',color:'#2D5016',stock:8,popular:true,img:'/images/shop-jaket-parka-v2.png'},
      {id:3,cat:'apparel',name:'Topi Tactical TNI AD',desc:'Topi tactical velcro patch, logo TNI AD',cost:800,icon:'styler',color:C.primary,stock:30,img:'/images/shop-topi-tactical.png'},
      {id:4,cat:'apparel',name:'Lanyard ID Card DISPENAD',desc:'Lanyard military-style TNI AD dengan badge holder',cost:300,icon:'badge',color:C.teal,stock:50,img:'/images/shop-lanyard.png'},
      /* ── Aksesoris & Koleksi ── */
      {id:5,cat:'koleksi',name:'Mug Keramik TNI AD',desc:'Mug keramik 350ml, desain insignia pangkat TNI AD',cost:600,icon:'coffee',color:C.gold,stock:40,popular:true,img:'/images/shop-mug-keramik-v2.png'},
      {id:6,cat:'koleksi',name:'Tumbler Stainless TNI AD',desc:'Tumbler 500ml vacuum insulated, logo TNI AD engraved',cost:1200,icon:'water_drop',color:'#2D5016',stock:15,img:'/images/shop-tumbler.png'},
      {id:7,cat:'koleksi',name:'Kalender Meja TNI AD 2026',desc:'Kalender premium foto kegiatan TNI AD & quotes prajurit',cost:500,icon:'calendar_month',color:C.primary,stock:35,img:'/images/shop-kalender.png'},
      {id:8,cat:'koleksi',name:'Sticker Pack Emblem TNI AD',desc:'20 stiker vinyl tahan air, desain pangkat & lencana TNI AD',cost:200,icon:'auto_awesome',color:C.purple,stock:100,img:'/images/shop-sticker-pack.png'},
      {id:9,cat:'koleksi',name:'Pin Enamel Insignia TNI AD',desc:'Pin enamel premium koleksi insignia TNI AD',cost:400,icon:'military_tech',color:C.gold,stock:20,img:'/images/shop-pin-enamel-v2.png'},
      /* ── Sponsor & Voucher ── */
      {id:10,cat:'sponsor',name:'Voucher BRI Rp50K',desc:'Voucher belanja dari Bank BRI untuk anggota aktif',cost:1000,icon:'account_balance',color:'#003399',stock:20,popular:true,sponsor:'Bank BRI',img:'/images/shop-voucher-bri.png'},
      {id:11,cat:'sponsor',name:'Voucher Mandiri Rp100K',desc:'e-Voucher Bank Mandiri, berlaku di merchant pilihan',cost:1800,icon:'account_balance',color:'#003366',stock:10,sponsor:'Bank Mandiri',img:'/images/shop-voucher-mandiri.png'},
      {id:12,cat:'sponsor',name:'Paket Data Telkomsel 10GB',desc:'Kuota internet 10GB 30 hari, sponsor Telkomsel',cost:800,icon:'wifi',color:C.red,stock:30,sponsor:'Telkomsel',img:'/images/shop-data-telkomsel.png'},
      {id:13,cat:'sponsor',name:'GoPay Rp50K',desc:'Saldo GoPay dari sponsor GoTo Group',cost:1000,icon:'account_balance_wallet',color:C.green,stock:25,sponsor:'GoTo',img:'/images/shop-gopay.png'},
      /* ── Eksklusif ── */
      {id:14,cat:'eksklusif',name:'Sertifikat Anggota Aktif',desc:'Sertifikat digital + cetak dengan QR verifikasi',cost:3000,icon:'workspace_premium',color:C.gold,stock:5,img:'/images/shop-sertifikat.png'},
      {id:15,cat:'eksklusif',name:'Undangan HUT TNI AD Gala',desc:'Akses VIP ke acara peringatan HUT TNI AD',cost:8000,icon:'celebration',color:C.purple,stock:3,img:'/images/shop-undangan-gala.png'},
      {id:16,cat:'eksklusif',name:'Mentorship Perwira TNI AD',desc:'Sesi mentoring 1 jam dengan perwira TNI AD',cost:5000,icon:'school',color:C.primary,stock:5,img:'/images/shop-mentorship.png'},
    ];
    const cats=[{id:'semua',label:'Semua'},{id:'apparel',label:'Apparel'},{id:'koleksi',label:'Koleksi'},{id:'sponsor',label:'Sponsor'},{id:'eksklusif',label:'Eksklusif'}];
    const filtered=shopTab==='semua'?rewardItems:rewardItems.filter(r=>r.cat===shopTab);

    return(<div key={k} className="flex flex-col gap-4 pb-4">
      {/* Header + Points Balance */}
      <div className="stagger-1">
        <h1 style={{fontSize:24,fontWeight:800,color:C.text,paddingTop:4,marginBottom:8}}>Toko Poin</h1>
        <div style={{borderRadius:14,overflow:'hidden',marginBottom:8}}>
          <img src="/images/shop-merchandise-collection.png" alt="Merchandise TNI AD" style={{width:'100%',height:120,objectFit:'cover',display:'block'}}/>
        </div>
        <div style={{background:`linear-gradient(135deg,${C.primaryLight},${C.primaryFaint})`,borderRadius:14,padding:'18px 16px',border:`1px solid ${C.primary}15`,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',right:-10,top:-10,opacity:0.06}}><MI name="stars" size={80} fill style={{color:C.gold}}/></div>
          <p style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>Poin Tersedia</p>
          <div className="flex items-end gap-2">
            <p style={{fontSize:36,fontWeight:900,color:C.gold,fontFamily:"'JetBrains Mono'",lineHeight:1}}>{userPoints.toLocaleString()}</p>
            <p style={{fontSize:13,color:C.textSec,marginBottom:3}}>XP</p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <MI name="history" size={14} style={{color:C.textMuted}}/>
            <p style={{fontSize:12,color:C.textSec}}>3 penukaran terakhir bulan ini</p>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="stagger-2 flex gap-2 overflow-x-auto hide-scrollbar" style={{paddingBottom:2}}>
        {cats.map(c=>(
          <button key={c.id} onClick={()=>setShopTab(c.id)} style={{
            padding:'8px 16px',borderRadius:10,border:`1px solid ${shopTab===c.id?C.primary:C.border}`,
            background:shopTab===c.id?C.primaryLight:'transparent',color:shopTab===c.id?C.primary:C.textSec,
            fontSize:13,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0,
          }}>{c.label}</button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map((item,i)=>{
          const canAfford=userPoints>=item.cost;
          return(
          <Card key={item.id} className={`stagger-${Math.min(i+3,7)}`} style={{padding:0,overflow:'hidden'}}>
            <div style={{position:'relative',width:'100%',overflow:'hidden'}}>
              {item.img?
                <img src={item.img} alt={item.name} style={{width:'100%',height:100,objectFit:'cover',display:'block'}}/>
              :<IllustCard icon={item.icon} bg={item.color} accent={item.cat==='sponsor'?'#003399':item.cat==='eksklusif'?'#92400E':'#14532D'} height={100}/>}
              {item.popular&&!item.sponsor&&<span style={{position:'absolute',top:6,right:6,fontSize:10,fontWeight:700,color:C.white,background:C.orange,padding:'3px 8px',borderRadius:6}}>Populer</span>}
              {item.sponsor&&<span style={{position:'absolute',top:6,right:6,fontSize:10,fontWeight:700,color:C.white,background:'linear-gradient(135deg,#003399,#0055AA)',padding:'3px 8px',borderRadius:6,letterSpacing:0.3}}>{item.sponsor}</span>}
            </div>
            <div style={{padding:'12px 12px 12px',textAlign:'center',position:'relative'}}>
              <p style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:3,lineHeight:1.2}}>{item.name}</p>
              <p style={{fontSize:11,color:C.textMuted,marginBottom:10,lineHeight:1.4}}>{item.desc}</p>
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <MI name="stars" size={16} fill style={{color:C.gold}}/>
                <span style={{fontSize:17,fontWeight:800,color:C.gold,fontFamily:"'JetBrains Mono'"}}>{item.cost.toLocaleString()}</span>
              </div>
              <Tip text={canAfford?`Kamu punya ${userPoints} poin, cukup untuk menukar item ini`:`Butuh ${item.cost-userPoints} poin lagi`}>
                <p style={{fontSize:11,color:canAfford?C.green:C.textMuted,fontWeight:600}}>Stok: {item.stock} {!canAfford&&`· Kurang ${(item.cost-userPoints).toLocaleString()}`}</p>
              </Tip>
            </div>
            <button onClick={()=>{
              if(!canAfford)return;
              if(confirmRedeem===item.id){showToast(`${item.name} berhasil ditukar!`);setConfirmRedeem(null)}
              else{setConfirmRedeem(item.id);setTimeout(()=>setConfirmRedeem(cr=>cr===item.id?null:cr),3000)}
            }} className={`btn-gold ${confirmRedeem===item.id?'confirm-bounce':''}`} style={{
              width:'100%',padding:'12px 0',border:'none',cursor:canAfford?'pointer':'not-allowed',
              borderRadius:0,
              background:confirmRedeem===item.id?C.green:canAfford?`linear-gradient(135deg,${C.primary},${C.primaryAccent})`:C.overlay15,
              color:confirmRedeem===item.id?'white':canAfford?'#FFFFFF':C.textMuted,fontSize:13,fontWeight:700,
              display:'flex',alignItems:'center',justifyContent:'center',gap:6,
              minHeight:44,
            }}>
              {confirmRedeem===item.id&&<MI name="check_circle" size={16} style={{color:C.white}}/>}
              {confirmRedeem===item.id?'Konfirmasi Tukar?':canAfford?'Tukar Sekarang':'Poin Kurang'}
            </button>
          </Card>
        );})}
      </div>

      {/* Riwayat Penukaran */}
      <Card className="stagger-6">
        <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:12}}>Riwayat Penukaran</h3>
        {[
          {name:'Mug Keramik TNI AD',date:'1 Mar 2026',cost:600,status:'Berhasil'},
          {name:'Voucher BRI Rp50K',date:'22 Feb 2026',cost:1000,status:'Berhasil'},
          {name:'Sticker Pack Emblem',date:'10 Feb 2026',cost:200,status:'Berhasil'},
        ].map((h,i)=>(
          <div key={i} className="flex items-center gap-3" style={{padding:'10px 0',borderBottom:i<2?`1px solid ${C.border}`:'none'}}>
            <div style={{width:32,height:32,borderRadius:8,background:C.greenLight,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <MI name="check_circle" size={16} fill style={{color:C.green}}/>
            </div>
            <div className="flex-1">
              <p style={{fontSize:13,fontWeight:600,color:C.text}}>{h.name}</p>
              <p style={{fontSize:11,color:C.textMuted}}>{h.date}</p>
            </div>
            <span style={{fontSize:13,fontWeight:700,color:C.red,fontFamily:"'JetBrains Mono'"}}>-{h.cost}</span>
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

      {/* Mission Hero Image */}
      {MISSION_ILLUST[m.id]&&(()=>{const il=MISSION_ILLUST[m.id];return(
      <div className="stagger-1" style={{borderRadius:16,overflow:'hidden',position:'relative'}}>
        <IllustCard icon={il.icon} label={il.label} bg={il.bg} accent={il.accent} height={120} img={il.img}/>
        <div style={{position:'absolute',bottom:10,left:12,display:'flex',alignItems:'center',gap:6}}>
          <div style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <MI name={typeIcon(m.type)} size={14} fill style={{color:'#fff'}}/>
          </div>
          <span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.8)',textTransform:'uppercase',letterSpacing:1}}>{m.type}</span>
        </div>
        <span style={{position:'absolute',top:10,right:10,background:'rgba(255,255,255,0.15)',color:'#fff',borderRadius:6,padding:'3px 8px',fontSize:10,fontWeight:700}}>{m.status}</span>
      </div>);})()}

      {/* Header + Reward */}
      <div className="stagger-1">
        {!MISSION_ILLUST[m.id]&&<div className="flex items-center gap-2 mb-2">
          <div style={{width:28,height:28,borderRadius:8,background:typeBg(m.type),display:'flex',alignItems:'center',justifyContent:'center'}}>
            <MI name={typeIcon(m.type)} size={14} fill style={{color:tc}}/>
          </div>
          <span style={{fontSize:11,fontWeight:700,color:tc,textTransform:'uppercase',letterSpacing:1}}>{m.type}</span>
          <span style={{marginLeft:'auto',background:typeBg(m.type),color:tc,borderRadius:6,padding:'3px 8px',fontSize:10,fontWeight:700}}>{m.status}</span>
        </div>}
        <h2 style={{fontSize:20,fontWeight:800,color:C.text,lineHeight:1.2,marginBottom:6}}>{m.title}</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <span style={{background:C.goldLight,color:C.gold,borderRadius:8,padding:'4px 12px',fontSize:13,fontWeight:800,fontFamily:"'JetBrains Mono'",border:'1px solid rgba(20,83,45,0.15)'}}>+{m.xp} XP</span>
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
                width:40,height:40,borderRadius:12,cursor:(!isJoined&&i>0)?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
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

        {/* Demografi Peserta Misi */}
        <Card className="stagger-4">
          <h3 style={{fontSize:12,fontWeight:700,color:C.textMuted,letterSpacing:1.5,textTransform:'uppercase',marginBottom:10}}>
            <MI name="group" size={14} style={{verticalAlign:'middle',marginRight:4}}/>Demografi Peserta
          </h3>
          {/* Gender split */}
          <div style={{marginBottom:12}}>
            <p style={{fontSize:11,fontWeight:600,color:C.textSec,marginBottom:4}}>Gender</p>
            <div className="flex gap-2">
              {[{label:'Pria',pct:Math.round(55+m.id*3)%100||62,color:C.primary},{label:'Wanita',pct:100-(Math.round(55+m.id*3)%100||62),color:C.teal}].map((g,i)=>(
                <div key={i} className="flex-1" style={{padding:8,borderRadius:8,background:g.color+'08',border:`1px solid ${g.color}15`}}>
                  <div className="flex items-center justify-between">
                    <span style={{fontSize:10,fontWeight:600,color:g.color}}>{g.label}</span>
                    <span style={{fontSize:10,fontWeight:700,color:g.color,fontFamily:"'JetBrains Mono'"}}>{g.pct}%</span>
                  </div>
                  <div style={{height:3,borderRadius:99,background:g.color+'20',overflow:'hidden',marginTop:4}}>
                    <div style={{width:`${g.pct}%`,height:'100%',borderRadius:99,background:g.color}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Age distribution */}
          <div style={{marginBottom:12}}>
            <p style={{fontSize:11,fontWeight:600,color:C.textSec,marginBottom:4}}>Kelompok Usia</p>
            <div className="flex flex-col gap-1.5">
              {[
                {range:'18-24',pct:18+((m.id*7)%15),color:C.purple},
                {range:'25-34',pct:32+((m.id*3)%10),color:C.primary},
                {range:'35-44',pct:28-((m.id*2)%8),color:C.accent},
                {range:'45+',pct:22-((m.id*5)%12),color:C.teal},
              ].map((a,i)=>(
                <div key={i} className="flex items-center gap-2">
                  <span style={{fontSize:10,fontWeight:600,color:C.textSec,width:32,flexShrink:0}}>{a.range}</span>
                  <div className="flex-1" style={{height:12,borderRadius:4,background:C.surfaceLight,overflow:'hidden'}}>
                    <div style={{width:`${a.pct}%`,height:'100%',borderRadius:4,background:a.color,display:'flex',alignItems:'center',paddingLeft:4}}>
                      {a.pct>15&&<span style={{fontSize:9,fontWeight:700,color:'white'}}>{a.pct}%</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Rank & Platform */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p style={{fontSize:10,fontWeight:600,color:C.textSec,marginBottom:4}}>Pangkat</p>
              <div className="flex flex-col gap-1">
                {[{label:'Tamtama',pct:42,color:C.textMuted},{label:'Bintara',pct:35,color:C.accent},{label:'Perwira',pct:23,color:C.primary}].map((r,i)=>(
                  <div key={i} className="flex items-center justify-between">
                    <span style={{fontSize:10,color:C.textSec}}>{r.label}</span>
                    <span style={{fontSize:10,fontWeight:700,color:r.color,fontFamily:"'JetBrains Mono'"}}>{r.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p style={{fontSize:10,fontWeight:600,color:C.textSec,marginBottom:4}}>Platform Aktif</p>
              <div className="flex flex-col gap-1">
                {[{platform:'Instagram',pct:38,color:'#E1306C'},{platform:'TikTok',pct:32,color:'#1A1A1A'},{platform:'X',pct:18,color:'#1DA1F2'},{platform:'YouTube',pct:12,color:'#FF0000'}].map((p,i)=>(
                  <div key={i} className="flex items-center gap-1.5">
                    <SocialIcon platform={p.platform.toLowerCase()==='x'?'x':p.platform.toLowerCase()} size={10} color={p.color}/>
                    <span style={{fontSize:10,color:C.textSec,flex:1}}>{p.platform}</span>
                    <span style={{fontSize:10,fontWeight:700,color:p.color,fontFamily:"'JetBrains Mono'"}}>{p.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p style={{fontSize:10,color:C.textDark,marginTop:8}}>*Data berdasarkan {m.participants} peserta terdaftar misi ini</p>
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
                <div style={{position:'absolute',bottom:4,left:4,background:C.surface,borderRadius:4,padding:'2px 6px',fontSize:10,color:C.textSec,fontFamily:"'JetBrains Mono'",border:`1px solid ${C.border}`}}>
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
                  <span key={hi} style={{fontSize:10,fontWeight:700,color:C.primary,fontFamily:"'JetBrains Mono'"}}>{h}</span>
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
                <span style={{fontSize:11,fontWeight:700,color:C.text,fontFamily:"'JetBrains Mono'"}}>Target: {m.aksiSpec.target.toLocaleString()} {m.aksiSpec.unit}</span>
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
            <div style={{background:C.primaryLight,borderRadius:8,padding:10,border:'1px solid rgba(20,83,45,0.12)',marginBottom:10}}>
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
                  <p style={{fontSize:12,fontWeight:800,color:si===2?C.primary:C.text,fontFamily:"'JetBrains Mono'"}}>{slot.pct}%</p>
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
              <p style={{fontSize:10,color:C.textMuted,marginTop:2}}>10 orang pertama</p>
            </div>
            <div style={{background:C.purpleLight,borderRadius:8,padding:10,border:`1px solid ${C.purple}20`,textAlign:'center'}}>
              <MI name="military_tech" size={18} fill style={{color:C.purple}}/>
              <p style={{fontSize:11,fontWeight:700,color:C.purple,marginTop:2}}>Streak Bonus</p>
              <p style={{fontSize:14,fontWeight:800,color:C.purple,fontFamily:"'JetBrains Mono'"}}>+2x Multi</p>
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
                <span style={{fontSize:12,fontWeight:800,color:b.color,fontFamily:"'JetBrains Mono'"}}>+{b.xp} XP</span>
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
              boxShadow:consent?'0 0 8px rgba(20,83,45,0.2)':'none',
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
                  <div style={{width:56,height:56,borderRadius:12,overflow:'hidden',flexShrink:0,position:'relative'}}>
                    {MISSION_ILLUST[m.id]?.img?
                      <img src={MISSION_ILLUST[m.id].img} alt="" style={{width:56,height:56,objectFit:'cover',display:'block'}}/>
                    :<IllustCard icon={ex.type==='video'?'play_circle':'image'} bg={ex.type==='video'?'#1C1917':'#0D9488'} accent="#14532D" height={56}/>}
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
                  <AvatarImg initials={post.avatar} size={32} style={{borderRadius:8}}/>
                  <div className="flex-1">
                    <p style={{fontSize:12,fontWeight:700,color:C.text}}>{post.handle}</p>
                    <div className="flex items-center gap-1"><SocialIcon platform={post.platform} size={10} color={pc}/><span style={{fontSize:10,color:C.textMuted}}>{post.author} · {post.time}</span></div>
                  </div>
                  <MI name="open_in_new" size={14} style={{color:C.textMuted}}/>
                </div>
                <div style={{padding:'10px 14px'}}>
                  <p style={{fontSize:12,color:C.text,lineHeight:1.5,whiteSpace:'pre-line'}}>{post.content}</p>
                  {post.image&&<div style={{width:'100%',borderRadius:8,marginTop:8,overflow:'hidden'}}>
                    {post.img?
                      <img src={post.img} alt="" style={{width:'100%',height:160,objectFit:'cover',display:'block'}}/>
                    :<IllustCard icon={post.platform==='tiktok'?'play_circle':'image'} label={post.platform==='tiktok'?'Video':'Foto'} bg={post.platform==='instagram'?'#833AB4':post.platform==='tiktok'?'#1A1A1A':'#1DA1F2'} accent="#14532D" height={120}/>}
                  </div>}
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
                <div style={{position:'absolute',bottom:6,left:6,background:C.surface,borderRadius:4,padding:'2px 8px',fontSize:10,color:C.textSec,fontFamily:"'JetBrains Mono'",display:'flex',alignItems:'center',gap:3,border:`1px solid ${C.border}`}}>
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
                <p style={{fontSize:10,color:C.textMuted,fontFamily:"'JetBrains Mono'"}}>Geo: {m.eventSpec?.lat?.toFixed(6)}, {m.eventSpec?.lng?.toFixed(6)}</p>
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
                  <span style={{fontSize:18,fontWeight:900,color:C.white,fontFamily:"'JetBrains Mono'"}}>{aiResult.score}</span>
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
                  <p style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:"'JetBrains Mono'"}}>{s.v}</p>
                  <p style={{fontSize:10,color:C.textMuted,fontWeight:600}}>{s.l}</p>
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
      {id:'dashboard',label:'Dashboard',icon:'dashboard',badge:4},
      {id:'misi',label:'Manajemen Misi',icon:'assignment',badge:MISSIONS.filter(m=>m.status!=='SELESAI').length},
      {id:'agents',label:'Anggota',icon:'group'},
      {id:'broadcast',label:'Broadcast',icon:'campaign'},
      {id:'settings',label:'Pengaturan',icon:'settings'},
    ];

    const agentsList=[
      {name:'Kpt. Rina Dewi',gender:'F',age:28,tier:'Gold',missions:32,xp:6200,engagement:'14.2%',status:'active',avatar:'RD',acctType:'prajurit',nrp:'31190234',satuan:'Yonif 315/Garuda'},
      {name:'Ltn. Budi Hartono',gender:'M',age:35,tier:'Gold',missions:28,xp:5800,engagement:'11.8%',status:'active',avatar:'BH',acctType:'prajurit',nrp:'31180189',satuan:'Denma Mabesad'},
      {name:'Srs. Fajar Nugroho',gender:'M',age:24,tier:'Silver',missions:22,xp:5400,engagement:'16.1%',status:'active',avatar:'FN',acctType:'prajurit',nrp:'31210456',satuan:'Yonkav 1/Kostrad'},
      {name:'Mayor Arif Santoso',gender:'M',age:30,tier:'Silver',missions:24,xp:4820,engagement:'12.3%',status:'active',avatar:'AS',acctType:'prajurit',nrp:'31200456',satuan:'Yonif 403/WP'},
      {name:'Kpl. Sari Utami',gender:'F',age:22,tier:'Silver',missions:20,xp:4600,engagement:'18.5%',status:'active',avatar:'SU',acctType:'prajurit',nrp:'31220312',satuan:'Puspen TNI AD'},
      {name:'Ratna Sari',gender:'F',age:27,tier:'Bronze',missions:12,xp:2100,engagement:'9.4%',status:'active',avatar:'RS',acctType:'istri',nrp:'-',satuan:'Kel. Mayor Arif'},
      {name:'Dedi Prasetyo',gender:'M',age:34,tier:'Bronze',missions:10,xp:1800,engagement:'8.1%',status:'active',avatar:'DP',acctType:'suami',nrp:'-',satuan:'Kel. Kpt. Rina'},
      {name:'Ahmad Rizki',gender:'M',age:19,tier:'Bronze',missions:8,xp:1500,engagement:'7.2%',status:'active',avatar:'AR',acctType:'anak',nrp:'-',satuan:'Kel. Ltn. Budi'},
      {name:'Nina Safira',gender:'F',age:32,tier:'Bronze',missions:5,xp:800,engagement:'5.1%',status:'idle',avatar:'NS',acctType:'istri',nrp:'-',satuan:'Kel. Srs. Fajar'},
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
            {title&&<h3 style={{fontSize:18,fontWeight:700,color:C.text,letterSpacing:-0.3}}>{title}</h3>}
            {subtitle&&<p style={{fontSize:13,color:C.textMuted,marginTop:4}}>{subtitle}</p>}
          </div>
          {action}
        </div>}
        <div style={{padding:noPad?0:20}}>{children}</div>
      </div>
    );

    return(
      <div style={{display:'flex',minHeight:'100vh',background:C.bg,position:'relative',overflow:'hidden'}}>
        {/* Background Orbs */}
        <div className="orb orb-1" style={{width:400,height:400,background:'radial-gradient(circle,rgba(20,83,45,0.06),transparent 70%)',top:-100,right:'20%'}}/>
        <div className="orb orb-2" style={{width:300,height:300,background:'radial-gradient(circle,rgba(20,83,45,0.05),transparent 70%)',bottom:100,left:'10%'}}/>

        {/* Sidebar — On-brand TNI AD green */}
        <aside style={{width:260,background:`linear-gradient(180deg,#0B2619,#0E3420,#0B2619)`,borderRight:'1px solid rgba(255,255,255,0.06)',padding:'24px 0',flexShrink:0,display:'flex',flexDirection:'column',zIndex:2}}>
          <div className="flex items-center gap-3" style={{padding:'0 20px',marginBottom:32}}>
            <div style={{width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))',display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid rgba(255,255,255,0.06)'}}>
              <SinarMark size={22}/>
            </div>
            <div>
              <h1 style={{fontSize:16,fontWeight:900,color:'#FFFFFF',letterSpacing:3}}>SINAR</h1>
              <p style={{fontSize:9,color:'rgba(255,255,255,0.35)',letterSpacing:2,textTransform:'uppercase',fontWeight:600}}>Command Center</p>
            </div>
          </div>

          <p style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.2)',textTransform:'uppercase',letterSpacing:3,padding:'0 20px',marginBottom:10}}>Menu</p>
          <nav className="flex flex-col gap-1" style={{padding:'0 10px'}}>
            {sideItems.map(s=>{
              const active=adSideTab===s.id;
              return(
              <button key={s.id} onClick={()=>{setAdSideTab(s.id);setAdSubTab(s.id==='dashboard'?'ringkasan':s.id==='misi'?'list':'');setSelectedAdMission(null);}} style={{
                display:'flex',alignItems:'center',gap:10,padding:'11px 14px',borderRadius:10,border:'none',cursor:'pointer',position:'relative',
                background:active?'rgba(255,255,255,0.08)':'transparent',
                color:active?'#FFFFFF':'rgba(255,255,255,0.5)',
                fontSize:13,fontWeight:active?700:500,textAlign:'left',transition:'all 200ms',width:'100%',
              }} onMouseEnter={e=>{if(!active)e.currentTarget.style.background='rgba(255,255,255,0.04)'}} onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent'}}>
                {active&&<div style={{position:'absolute',left:0,top:'50%',transform:'translateY(-50%)',width:3,height:20,borderRadius:'0 3px 3px 0',background:'#B8860B',boxShadow:'0 0 8px rgba(184,134,11,0.4)'}}/>}
                <MI name={s.icon} size={18} fill={active} style={{color:active?'#B8860B':'rgba(255,255,255,0.35)'}}/>{s.label}
                {s.badge>0&&<span style={{marginLeft:'auto',fontSize:10,fontWeight:700,color:'#B8860B',background:'rgba(184,134,11,0.15)',padding:'2px 8px',borderRadius:6,minWidth:22,textAlign:'center'}}>{s.badge}</span>}
                {s.id==='agents'&&<span style={{marginLeft:s.badge?4:'auto',fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.35)',background:'rgba(255,255,255,0.06)',padding:'2px 8px',borderRadius:6}}>412K</span>}
              </button>);
            })}
          </nav>

          {/* Presentation mode button */}
          <div style={{padding:'0 10px',marginTop:16}}>
            <button onClick={()=>setMode('presentation')} style={{
              display:'flex',alignItems:'center',gap:8,width:'100%',padding:'10px 14px',borderRadius:10,border:'1px solid rgba(184,134,11,0.15)',
              background:'linear-gradient(135deg,rgba(184,134,11,0.08),rgba(139,26,26,0.05))',
              color:'#B8860B',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 200ms',
            }} onMouseEnter={e=>e.currentTarget.style.background='linear-gradient(135deg,rgba(184,134,11,0.15),rgba(139,26,26,0.1))'} onMouseLeave={e=>e.currentTarget.style.background='linear-gradient(135deg,rgba(184,134,11,0.08),rgba(139,26,26,0.05))'}>
              <MI name="play_circle" size={16} style={{color:'#B8860B'}}/> Mode Presentasi
            </button>
          </div>

          <div style={{margin:'auto 12px 0',display:'flex',flexDirection:'column',gap:10}}>
            <div style={{padding:14,borderRadius:10,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)'}}>
              <div className="flex items-center gap-2 mb-2">
                <div style={{width:6,height:6,borderRadius:'50%',background:'#22C55E',boxShadow:'0 0 6px rgba(34,197,94,0.4)'}}/>
                <span style={{fontSize:10,fontWeight:700,color:'#22C55E'}}>Sistem Aktif</span>
              </div>
              <p style={{fontSize:10,color:'rgba(255,255,255,0.3)',lineHeight:1.4}}>Semua operasional. {ADMIN_STATS.missionsActive} misi berjalan.</p>
            </div>
            <button onClick={()=>setMode('member')} style={{width:'100%',padding:'10px 0',borderRadius:10,border:'1px solid rgba(255,255,255,0.08)',background:'transparent',color:'rgba(255,255,255,0.45)',fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,transition:'all 200ms'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <MI name="phone_iphone" size={14}/> Member View
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main style={{flex:1,overflow:'auto',padding:'24px 32px',zIndex:1}}>
          {/* Top Bar */}
          <div className="flex items-center justify-between" style={{marginBottom:24,paddingBottom:16,borderBottom:`1px solid ${C.borderLight}`}}>
            <div>
              <div className="flex items-center gap-2" style={{marginBottom:4}}>
                {adSideTab==='missionDetail'&&<button onClick={()=>setAdSideTab('misi')} style={{background:'none',border:'none',cursor:'pointer',color:C.textMuted,fontSize:12,display:'flex',alignItems:'center',gap:2}}><MI name="arrow_back" size={14}/>Misi</button>}
                {adSideTab==='missionDetail'&&<span style={{color:C.textMuted,fontSize:12}}>/</span>}
              </div>
              <h1 style={{fontSize:26,fontWeight:800,color:C.text,letterSpacing:-0.3}}>{adSideTab==='missionDetail'?'Detail Misi':sideItems.find(s=>s.id===adSideTab)?.label}</h1>
              <p style={{fontSize:13,color:C.textMuted,marginTop:4}}>{new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
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
              {[{icon:'group',label:'Total Anggota',value:'445K',color:C.primary,bg:C.primaryLight,sub:'400K Prajurit · 32K Suami · 142K Istri · 42K Anak',trend:'+1.8K',up:true},
                {icon:'person_check',label:'Aktif Hari Ini',value:'89.2K',color:C.green,bg:C.greenLight,sub:'21.6% dari total anggota',trend:'+12%',up:true},
                {icon:'target',label:'Misi Aktif',value:ADMIN_STATS.missionsActive.toString(),color:C.accent,bg:C.accentLight,sub:`${ADMIN_STATS.missionsCompleted} selesai total`,trend:'+2',up:true},
                {icon:'public',label:'Total Reach',value:'24.8M',color:C.purple,bg:C.purpleLight,sub:`Avg ${ADMIN_STATS.avgEngagement} engagement`,trend:'+18%',up:true},
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
                        <MI name={s.up?'trending_up':'trending_down'} size={13} style={{color:s.up?C.green:C.red}}/>
                        <span style={{fontSize:12,fontWeight:700,color:s.up?C.green:C.red}}>{s.trend}</span>
                      </div>
                    </div>
                    <div style={{position:'relative'}}>
                      <p style={{fontSize:36,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'",letterSpacing:-1,lineHeight:1}}>{s.value}</p>
                      <p style={{fontSize:14,color:C.textMuted,marginTop:8,fontWeight:600}}>{s.label}</p>
                      <p style={{fontSize:12,color:s.color,fontWeight:600,marginTop:6,opacity:0.85}}>{s.sub}</p>
                    </div>
                    {/* Mini sparkline decoration */}
                    <svg viewBox="0 0 80 24" style={{position:'absolute',bottom:12,right:16,width:80,height:24,opacity:0.3}}>
                      <polyline points={i===0?"0,18 12,14 24,16 36,10 48,12 60,6 72,8 80,2":i===1?"0,20 12,18 24,12 36,16 48,8 60,10 72,4 80,2":i===2?"0,16 12,14 24,18 36,12 48,10 60,14 72,6 80,4":"0,22 12,16 24,14 36,18 48,10 60,8 72,6 80,2"} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </DCard>
              ))}
            </div>

            {/* Two columns — Map LEFT (larger), Review RIGHT */}
            <div style={{display:'grid',gridTemplateColumns:'1.4fr 1fr',gap:16}}>
              {/* Indonesia Mission Heat Map — LEFT, larger */}
              <DCard title="Peta Operasi Nasional" subtitle="Sebaran misi di seluruh Indonesia — scroll untuk geser" accent={C.primary}>
                <IndonesiaMissionMap onSelectZone={z=>showToast(`${z.name}: ${z.missions} misi, ${z.active} aktif`)} large/>
              </DCard>

              {/* Submission Queue — RIGHT */}
              <DCard title="Antrian Review" subtitle={`${submissionQueue.length} submisi menunggu review`} accent={C.orange}
                action={<span style={{fontSize:11,fontWeight:700,color:C.orange,padding:'5px 12px',borderRadius:8,background:C.orangeLight,display:'flex',alignItems:'center',gap:5}}><MI name="pending" size={14} fill style={{color:C.orange}}/>{submissionQueue.length} Pending</span>}>
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
                          <span style={{fontSize:12,fontWeight:800,color:s.aiPass?C.green:C.orange,fontFamily:"'JetBrains Mono'",lineHeight:1}}>{s.aiScore}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{fontSize:14,fontWeight:600,color:C.text}}>{s.agent}</p>
                        <p style={{fontSize:12,color:C.textMuted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.mission}</p>
                        <p style={{fontSize:11,color:C.textMuted,marginTop:2}}>{s.time}</p>
                      </div>
                      <div style={{textAlign:'center',flexShrink:0}}>
                        <p style={{fontSize:16,fontWeight:800,color:s.briefMatch>=80?C.green:s.briefMatch>=60?C.orange:C.red,fontFamily:"'JetBrains Mono'"}}>{s.briefMatch}%</p>
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

            </div>

            {/* Misi per Tipe — full width horizontal layout */}
            <DCard title="Misi per Tipe" subtitle="Distribusi misi aktif berdasarkan tipe" accent={C.primary}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12}}>
              {['EVENT','KONTEN','ENGAGEMENT','EDUKASI','AKSI'].map((t,i)=>{
                const count=MISSIONS.filter(m=>m.type===t).length;
                const active=MISSIONS.filter(m=>m.type===t&&m.status!=='SELESAI').length;
                const tc2=typeColor(t);
                const totalParticipants=MISSIONS.filter(m=>m.type===t).reduce((s,m)=>s+m.participants,0);
                return(
                <div key={i} style={{padding:16,borderRadius:14,background:C.surfaceLight,border:`1px solid ${C.border}`,transition:'border-color 200ms',textAlign:'center'}} onMouseEnter={e=>e.currentTarget.style.borderColor=tc2+'66'} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                  <div style={{width:44,height:44,borderRadius:12,background:typeBg(t),display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${tc2}22`,margin:'0 auto 10px'}}>
                    <MI name={typeIcon(t)} size={20} fill style={{color:tc2}}/>
                  </div>
                  <p style={{fontSize:13,fontWeight:700,color:tc2,marginBottom:8}}>{t}</p>
                  <p style={{fontSize:24,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'",lineHeight:1}}>{count}</p>
                  <p style={{fontSize:11,color:C.textMuted,marginTop:4}}>misi</p>
                  <div style={{height:5,borderRadius:6,background:C.overlay06,overflow:'hidden',margin:'10px 0 8px'}}>
                    <div style={{height:'100%',borderRadius:6,background:`linear-gradient(90deg,${tc2}88,${tc2})`,width:`${count>0?(active/count*100):0}%`,transition:'width 1s ease-out'}}/>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{fontSize:11,fontWeight:600,color:C.green}}>{active} aktif</span>
                    <span style={{fontSize:11,fontWeight:600,color:C.textMuted,fontFamily:"'JetBrains Mono'"}}>{totalParticipants}</span>
                  </div>
                </div>);
              })}
              </div>
            </DCard>

            {/* Active Missions with Analytics */}
            <DCard title="Misi Aktif — Analisa" subtitle={`${MISSIONS.filter(m=>m.status!=='SELESAI').length} misi sedang berjalan`} accent={C.gold}
              action={<button onClick={()=>{setAdSideTab('misi');setAdSubTab('list')}} style={{fontSize:12,fontWeight:600,color:C.primary,background:C.primaryLight,border:'none',padding:'7px 14px',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}><MI name="open_in_new" size={14}/>Lihat Semua</button>}>
              {/* Mission table — cleaner, more scannable */}
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:C.glass}}>
                      {['Misi','Tipe','Status','Peserta','Reach','Engage','Selesai','Sentimen'].map(h=>(
                        <th key={h} style={{padding:'12px 14px',fontSize:12,fontWeight:700,color:C.textMuted,textAlign:'left',borderBottom:`1px solid ${C.border}`,textTransform:'uppercase',letterSpacing:0.5,whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MISSIONS.filter(m=>m.status!=='SELESAI').slice(0,8).map(m=>{
                      const tc2=typeColor(m.type);
                      return(
                      <tr key={m.id} onClick={()=>{setSelectedAdMission(m.id);setAdSideTab('missionDetail')}} style={{borderBottom:`1px solid ${C.borderLight}`,cursor:'pointer',transition:'background 150ms'}} onMouseEnter={e=>e.currentTarget.style.background=C.glass} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{padding:'14px',maxWidth:280}}>
                          <p style={{fontSize:14,fontWeight:600,color:C.text,lineHeight:1.4}} className="line-clamp-1">{m.title}</p>
                          <span style={{fontSize:12,color:C.gold,fontWeight:600,fontFamily:"'JetBrains Mono'"}}>{m.deadline}</span>
                        </td>
                        <td style={{padding:'14px'}}>
                          <span style={{fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:6,background:typeBg(m.type),color:tc2,display:'inline-flex',alignItems:'center',gap:4}}>
                            <MI name={typeIcon(m.type)} size={12} fill style={{color:tc2}}/>{m.type}
                          </span>
                        </td>
                        <td style={{padding:'14px'}}>
                          <span style={{fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:6,
                            background:m.status==='PRIORITAS'?C.redLight:m.status==='SIAGA'?C.orangeLight:C.greenLight,
                            color:m.status==='PRIORITAS'?C.red:m.status==='SIAGA'?C.orange:C.green}}>{m.status}</span>
                        </td>
                        <td style={{padding:'14px',fontSize:15,fontWeight:700,color:C.text,fontFamily:"'JetBrains Mono'"}}>{m.participants}</td>
                        <td style={{padding:'14px',fontSize:14,fontWeight:700,color:C.primary,fontFamily:"'JetBrains Mono'"}}>{m.analytics?.reach||'—'}</td>
                        <td style={{padding:'14px',fontSize:14,fontWeight:700,color:C.green,fontFamily:"'JetBrains Mono'"}}>{m.analytics?.engagement||'—'}</td>
                        <td style={{padding:'14px'}}>
                          <div className="flex items-center gap-2">
                            <div style={{flex:1,height:6,borderRadius:4,background:C.overlay06,overflow:'hidden',maxWidth:60}}>
                              <div style={{height:'100%',borderRadius:4,background:m.analytics?.completion>=70?C.green:m.analytics?.completion>=40?C.orange:C.red,width:`${m.analytics?.completion||0}%`}}/>
                            </div>
                            <span style={{fontSize:14,fontWeight:700,color:m.analytics?.completion>=70?C.green:m.analytics?.completion>=40?C.orange:C.red,fontFamily:"'JetBrains Mono'"}}>{m.analytics?.completion||0}%</span>
                          </div>
                        </td>
                        <td style={{padding:'14px',fontSize:14,fontWeight:700,color:m.analytics?.sentiment>=70?C.green:C.orange,fontFamily:"'JetBrains Mono'"}}>{m.analytics?.sentiment||0}%</td>
                      </tr>);
                    })}
                  </tbody>
                </table>
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
                    <MI name={s.icon} size={22} fill style={{color:s.color,marginBottom:10,display:'block'}}/>
                    <p style={{fontSize:36,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'",letterSpacing:-1}}>{s.value}</p>
                    <p style={{fontSize:14,color:C.textMuted,marginTop:6,fontWeight:600}}>{s.label}</p>
                    <p style={{fontSize:12,color:s.color,fontWeight:600,marginTop:8}}>{s.sub}</p>
                  </div>
                </DCard>
              ))}
            </div>

            {/* Mission Effectiveness Over Time */}
            <DCard title="Efektivitas Misi — Tren Waktu" subtitle="Reach & engagement 6 bulan terakhir"
                action={<button onClick={()=>showToast('Laporan analitik diekspor ke PDF')} style={{fontSize:11,fontWeight:600,color:C.primary,background:C.primaryLight,border:'none',padding:'6px 12px',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}><MI name="picture_as_pdf" size={14}/>Export PDF</button>} accent={C.primary}>
              <div style={{position:'relative',padding:'8px 0'}}>
                {/* Y-axis labels */}
                <div style={{position:'absolute',left:0,top:8,bottom:32,display:'flex',flexDirection:'column',justifyContent:'space-between',width:44}}>
                  {['3M','2M','1M','500K','0'].map((l,i)=>(
                    <span key={i} style={{fontSize:11,fontWeight:600,color:C.textMuted,fontFamily:"'JetBrains Mono'",textAlign:'right',width:40}}>{l}</span>
                  ))}
                </div>
                <div style={{marginLeft:52}}>
                  <svg viewBox="0 0 600 200" style={{width:'100%',height:220}} preserveAspectRatio="none">
                    {[0,50,100,150].map(y=>(
                      <line key={y} x1="0" y1={y} x2="600" y2={y} stroke={C.border} strokeWidth="0.5" strokeDasharray="4,4"/>
                    ))}
                    <defs>
                      <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.primary} stopOpacity="0.3"/>
                        <stop offset="100%" stopColor={C.primary} stopOpacity="0.02"/>
                      </linearGradient>
                      <linearGradient id="engageGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.green} stopOpacity="0.25"/>
                        <stop offset="100%" stopColor={C.green} stopOpacity="0.02"/>
                      </linearGradient>
                    </defs>
                    <path d="M0,160 C50,148 100,120 150,105 C200,92 250,78 300,60 C350,48 400,52 450,38 C500,28 550,20 600,12 L600,200 L0,200 Z" fill="url(#reachGrad)"/>
                    <path d="M0,160 C50,148 100,120 150,105 C200,92 250,78 300,60 C350,48 400,52 450,38 C500,28 550,20 600,12" fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round"/>
                    <path d="M0,178 C50,172 100,155 150,148 C200,140 250,128 300,118 C350,110 400,115 450,102 C500,92 550,84 600,72 L600,200 L0,200 Z" fill="url(#engageGrad)"/>
                    <path d="M0,178 C50,172 100,155 150,148 C200,140 250,128 300,118 C350,110 400,115 450,102 C500,92 550,84 600,72" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round"/>
                    {[[0,160],[120,120],[240,92],[360,60],[480,52],[600,12]].map(([x,y],i)=>(
                      <circle key={'r'+i} cx={x} cy={y} r="5" fill={C.primary} stroke={C.surface} strokeWidth="2.5"/>
                    ))}
                    {[[0,178],[120,155],[240,140],[360,118],[480,115],[600,72]].map(([x,y],i)=>(
                      <circle key={'e'+i} cx={x} cy={y} r="5" fill={C.green} stroke={C.surface} strokeWidth="2.5"/>
                    ))}
                  </svg>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:8}}>
                    {['Okt','Nov','Des','Jan','Feb','Mar'].map((m,i)=>(
                      <span key={i} style={{fontSize:12,fontWeight:600,color:C.textMuted}}>{m}</span>
                    ))}
                  </div>
                </div>
                <div style={{display:'flex',gap:24,justifyContent:'center',marginTop:16}}>
                  {[{label:'Total Reach',value:'2.4M',color:C.primary},{label:'Engagement',value:'347K',color:C.green},{label:'Avg Rate',value:'14.5%',color:C.orange}].map((s,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:10,height:10,borderRadius:3,background:s.color}}/>
                      <div>
                        <span style={{fontSize:16,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'"}}>{s.value}</span>
                        <span style={{fontSize:12,color:C.textMuted,marginLeft:6}}>{s.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DCard>

            {/* Mission Performance - Horizontal Bar Chart */}
            <DCard title="Performa per Tipe Misi" subtitle="Join rate & engagement berdasarkan tipe" accent={C.teal}>
              <div style={{display:'flex',flexDirection:'column',gap:18}}>
                {[{type:'EVENT',join:72,engagement:22.1,completed:28},
                  {type:'KONTEN',join:65,engagement:14.8,completed:38},
                  {type:'ENGAGEMENT',join:89,engagement:18.5,completed:42},
                  {type:'EDUKASI',join:54,engagement:11.2,completed:18},
                  {type:'AKSI',join:45,engagement:16.3,completed:12},
                ].map((t,i)=>{
                  const tc2=typeColor(t.type);
                  return(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:14}}>
                    <div style={{width:120,display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                      <div style={{width:36,height:36,borderRadius:10,background:typeBg(t.type),display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <MI name={typeIcon(t.type)} size={18} fill style={{color:tc2}}/>
                      </div>
                      <span style={{fontSize:14,fontWeight:700,color:tc2}}>{t.type}</span>
                    </div>
                    <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:12,fontWeight:600,color:C.textMuted,width:56,flexShrink:0}}>Join</span>
                        <div style={{flex:1,height:16,borderRadius:4,background:C.overlay06,overflow:'hidden'}}>
                          <div style={{height:'100%',borderRadius:4,background:`linear-gradient(90deg,${tc2}88,${tc2})`,width:`${t.join}%`,transition:'width 1s ease-out'}}/>
                        </div>
                        <span style={{fontSize:15,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'",width:52,textAlign:'right'}}>{t.join}%</span>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:12,fontWeight:600,color:C.textMuted,width:56,flexShrink:0}}>Engage</span>
                        <div style={{flex:1,height:16,borderRadius:4,background:C.overlay06,overflow:'hidden'}}>
                          <div style={{height:'100%',borderRadius:4,background:`linear-gradient(90deg,${C.green}88,${C.green})`,width:`${Math.min(t.engagement*3.5,100)}%`,transition:'width 1s ease-out'}}/>
                        </div>
                        <span style={{fontSize:15,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'",width:52,textAlign:'right'}}>{t.engagement}%</span>
                      </div>
                    </div>
                    <div style={{textAlign:'center',flexShrink:0,minWidth:52,padding:'8px 0',borderRadius:8,background:C.surfaceLight}}>
                      <p style={{fontSize:20,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'",lineHeight:1}}>{t.completed}</p>
                      <p style={{fontSize:11,color:C.textMuted,marginTop:3}}>Selesai</p>
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
                    <text x="60" y="56" textAnchor="middle" style={{fontSize:20,fontWeight:800,fill:C.text,fontFamily:"'JetBrains Mono'"}}>1,247</text>
                    <text x="60" y="72" textAnchor="middle" style={{fontSize:10,fill:C.textMuted}}>Total</text>
                  </svg>
                  <div className="flex flex-col gap-3 flex-1">
                    {[{tier:'Gold',count:186,pct:15,color:C.orange,icon:'workspace_premium'},{tier:'Silver',count:524,pct:42,color:C.primary,icon:'military_tech'},{tier:'Bronze',count:537,pct:43,color:C.textMuted,icon:'shield'}].map((t,i)=>(
                      <div key={i} className="flex items-center gap-2">
                        <MI name={t.icon} size={16} fill style={{color:t.color}}/>
                        <span style={{fontSize:12,fontWeight:600,color:t.color,width:50}}>{t.tier}</span>
                        <div className="flex-1"><ProgressBar progress={t.pct/100} color={t.color} height={6}/></div>
                        <span style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:"'JetBrains Mono'",width:40,textAlign:'right'}}>{t.count}</span>
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
                    <span style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:"'JetBrains Mono'",width:40,textAlign:'right'}}>{a.count}</span>
                  </div>
                ))}
                </div>
              </DCard>
            </div>
            </>)}
          </div>)}

          {/* ═══ MANAJEMEN MISI ═══ */}
          {adSideTab==='misi'&&(<div className="flex flex-col gap-5">

            {adSubTab==='list'&&(<>
            {/* Header Row — stats + CTA */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div style={{padding:'10px 16px',borderRadius:10,background:C.primaryLight,display:'flex',alignItems:'center',gap:6}}>
                  <MI name="assignment" size={18} fill style={{color:C.primary}}/>
                  <span style={{fontSize:15,fontWeight:800,color:C.primary,fontFamily:"'JetBrains Mono'"}}>{MISSIONS.length}</span>
                  <span style={{fontSize:13,color:C.textSec}}>Total Misi</span>
                </div>
                <div style={{padding:'10px 16px',borderRadius:10,background:C.greenLight,display:'flex',alignItems:'center',gap:6}}>
                  <MI name="play_circle" size={18} fill style={{color:C.green}}/>
                  <span style={{fontSize:15,fontWeight:800,color:C.green,fontFamily:"'JetBrains Mono'"}}>{MISSIONS.filter(m=>m.status!=='SELESAI').length}</span>
                  <span style={{fontSize:13,color:C.textSec}}>Aktif</span>
                </div>
                <div style={{padding:'10px 16px',borderRadius:10,background:C.orangeLight,display:'flex',alignItems:'center',gap:6}}>
                  <MI name="rate_review" size={18} fill style={{color:C.orange}}/>
                  <span style={{fontSize:15,fontWeight:800,color:C.orange,fontFamily:"'JetBrains Mono'"}}>{MISSIONS.reduce((s,m)=>s+Math.max(0,Math.round(m.participants*0.15)),0)}</span>
                  <span style={{fontSize:13,color:C.textSec}}>Review</span>
                </div>
              </div>
              <button onClick={()=>setAdSubTab('create')} style={{padding:'12px 24px',borderRadius:12,border:'none',background:`linear-gradient(135deg,${C.primary},${C.primaryAccent})`,color:C.white,fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:8,boxShadow:'0 4px 15px rgba(20,83,45,0.25)',transition:'transform 150ms'}} onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'} onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}>
                <MI name="add_circle" size={20} style={{color:C.white}}/>Buat Misi Baru
              </button>
            </div>

            {/* Mission Type Filter Pills */}
            <div className="flex gap-2 flex-wrap">
              {['ALL','EVENT','KONTEN','ENGAGEMENT','EDUKASI','AKSI'].map(t=>(
                <button key={t} style={{
                  padding:'8px 16px',borderRadius:10,border:`1.5px solid ${t==='ALL'?C.border:typeColor(t)+'30'}`,cursor:'pointer',
                  background:t==='ALL'?C.surfaceLight:typeBg(t),color:t==='ALL'?C.text:typeColor(t),
                  fontSize:12,fontWeight:600,display:'flex',alignItems:'center',gap:5,transition:'all 200ms',
                }}>
                  {t!=='ALL'&&<MI name={typeIcon(t)} size={14} fill style={{color:typeColor(t)}}/>}
                  {t==='ALL'?'Semua':t}
                  <span style={{fontSize:11,fontWeight:700,opacity:0.7}}>({t==='ALL'?MISSIONS.length:MISSIONS.filter(m=>m.type===t).length})</span>
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
                    <span style={{fontSize:12,fontWeight:700,color:tc2,textTransform:'uppercase',letterSpacing:0.5}}>{m.type}</span>
                    <span style={{marginLeft:'auto',fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:7,
                      background:m.status==='PRIORITAS'?C.redLight:m.status==='SIAGA'?C.orangeLight:typeBg(m.type),
                      color:m.status==='PRIORITAS'?C.red:m.status==='SIAGA'?C.orange:tc2}}>{m.status}</span>
                  </div>
                  <p style={{fontSize:15,fontWeight:700,color:C.text,lineHeight:1.4,marginBottom:12}} className="line-clamp-2">{m.title}</p>
                  <div className="flex items-center justify-between mb-3">
                    <span style={{fontSize:13,fontWeight:700,color:C.gold,fontFamily:"'JetBrains Mono'",display:'flex',alignItems:'center',gap:3}}><MI name="star" size={14} fill style={{color:C.gold}}/>+{m.xp} XP</span>
                    <span style={{fontSize:12,color:C.textMuted}}><b style={{color:C.text}}>{m.participants}</b> joined · {m.deadline}</span>
                  </div>
                  {m.analytics&&(
                    <div style={{borderTop:`1px solid ${C.border}`,paddingTop:12}}>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:8}}>
                        {[
                          {v:m.analytics.reach,l:'Reach',icon:'visibility',c:C.primary},
                          {v:m.analytics.engagement,l:'Engage',icon:'trending_up',c:C.green},
                          {v:m.analytics.completion+'%',l:'Selesai',icon:'task_alt',c:m.analytics.completion>=70?C.green:m.analytics.completion>=40?C.orange:C.red},
                          {v:Math.max(0,Math.round(m.participants*0.15)),l:'Review',icon:'rate_review',c:C.orange},
                        ].map((x,xi)=>(
                          <div key={xi} style={{textAlign:'center',padding:'10px 6px',borderRadius:8,background:`${x.c}0A`}}>
                            <MI name={x.icon} size={14} style={{color:x.c,display:'block',margin:'0 auto 3px'}}/>
                            <p style={{fontSize:16,fontWeight:800,color:x.c,fontFamily:"'JetBrains Mono'",lineHeight:1.2}}>{x.v}</p>
                            <p style={{fontSize:11,color:C.textMuted,fontWeight:600,marginTop:3}}>{x.l}</p>
                          </div>
                        ))}
                      </div>
                      <div style={{position:'relative'}}>
                        <div style={{height:6,borderRadius:4,background:C.overlay06,overflow:'hidden'}}>
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
              const mf=missionForm;
              const tc=typeColor(mf.type);
              const totalSteps=4; /* 0=Tipe & Info Dasar, 1=Detail Tipe, 2=Konten & Template, 3=Review */
              const stepLabels=['Tipe & Info Dasar','Detail per Tipe','Konten & Template','Review & Publikasi'];
              const stepIcons=['category','tune','edit_note','rocket_launch'];
              const FLabel=({children})=><p style={{fontSize:13,fontWeight:700,color:C.textMuted,marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>{children}</p>;
              const FInput=({value,onChange,placeholder,type='text',mono})=><input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{width:'100%',padding:'11px 14px',borderRadius:12,border:`1px solid ${C.border}`,background:C.surfaceLight,fontSize:13,color:C.text,outline:'none',fontFamily:mono?"'JetBrains Mono'":'inherit'}}/>;
              const FArea=({value,onChange,placeholder,rows=3})=><textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder} style={{width:'100%',padding:'11px 14px',borderRadius:12,border:`1px solid ${C.border}`,background:C.surfaceLight,fontSize:13,color:C.text,outline:'none',resize:'vertical',fontFamily:'inherit'}}/>;
              const FChip=({label,active,onClick,color:cc})=><button onClick={onClick} style={{padding:'6px 12px',borderRadius:8,border:`1.5px solid ${active?cc||tc:C.border}`,background:active?`${cc||tc}12`:'transparent',color:active?cc||tc:C.textSec,fontSize:11,fontWeight:active?700:500,cursor:'pointer',transition:'all 150ms'}}>{label}</button>;
              const FTagInput=({tags,setTags,placeholder})=>{
                const [val,setVal]=useState('');
                return(<div>
                  <div className="flex flex-wrap gap-1.5 mb-2">{tags.filter(Boolean).map((t,i)=>(<span key={i} style={{fontSize:11,fontWeight:600,color:tc,background:`${tc}12`,borderRadius:6,padding:'3px 8px',display:'flex',alignItems:'center',gap:3}}>{t}<button onClick={()=>setTags(tags.filter((_,j)=>j!==i))} style={{background:'none',border:'none',cursor:'pointer',padding:0,lineHeight:1}}><MI name="close" size={10} style={{color:tc}}/></button></span>))}</div>
                  <div className="flex gap-2"><FInput value={val} onChange={e=>setVal(e.target.value)} placeholder={placeholder}/><button onClick={()=>{if(val.trim()){setTags([...tags,val.trim()]);setVal('')}}} style={{padding:'0 14px',borderRadius:12,border:'none',background:tc,color:'white',fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>+ Tambah</button></div>
                </div>);
              };
              const FListInput=({items,setItems,placeholder})=>{
                return(<div className="flex flex-col gap-2">{items.map((item,i)=>(<div key={i} className="flex gap-2"><FInput value={item} onChange={e=>{const n=[...items];n[i]=e.target.value;setItems(n)}} placeholder={placeholder}/>{items.length>1&&<button onClick={()=>setItems(items.filter((_,j)=>j!==i))} style={{width:36,flexShrink:0,borderRadius:12,border:`1px solid ${C.border}`,background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><MI name="close" size={14} style={{color:C.red}}/></button>}</div>))}<button onClick={()=>setItems([...items,''])} style={{padding:'8px 0',borderRadius:12,border:`1px dashed ${C.border}`,background:'transparent',color:C.textMuted,fontSize:12,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><MI name="add" size={14}/>Tambah Baris</button></div>);
              };

              return(<div style={{maxWidth:740}}>
              {/* Back button */}
              <button onClick={()=>setAdSubTab('list')} style={{display:'flex',alignItems:'center',gap:6,background:'none',border:'none',cursor:'pointer',color:C.textSec,fontSize:13,fontWeight:600,marginBottom:16,padding:0}}>
                <MI name="arrow_back" size={18} style={{color:C.textSec}}/>Kembali ke Daftar Misi
              </button>
              {/* Step Header */}
              <div style={{background:C.surfaceLight,borderRadius:16,padding:'18px 22px',border:`1px solid ${C.border}`,marginBottom:20}}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <MI name="add_circle" size={22} fill style={{color:tc}}/>
                    <h3 style={{fontSize:18,fontWeight:800,color:C.text}}>Buat Misi Baru</h3>
                  </div>
                  <span style={{fontSize:12,fontWeight:700,color:tc,background:`${tc}12`,padding:'5px 12px',borderRadius:8}}>Step {mf.step+1}/{totalSteps}</span>
                </div>
                <div className="flex items-center gap-2">
                  {stepLabels.map((sl,si)=>(
                    <div key={si} className="flex items-center" style={{flex:si<totalSteps-1?1:'none'}}>
                      <button onClick={()=>setMissionForm(f=>({...f,step:si}))} style={{width:38,height:38,borderRadius:10,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:'none',
                        background:si<=mf.step?tc:C.overlay06,color:si<=mf.step?'white':C.textMuted,transition:'all 200ms'}}>
                        {si<mf.step?<MI name="check" size={14} style={{color:'white'}}/>:<MI name={stepIcons[si]} size={14} style={{color:si<=mf.step?'white':C.textMuted}}/>}
                      </button>
                      {si<totalSteps-1&&<div style={{flex:1,height:2,background:si<mf.step?tc:C.border,margin:'0 4px',borderRadius:2,transition:'background 200ms'}}/>}
                    </div>
                  ))}
                </div>
                <p style={{fontSize:14,fontWeight:600,color:tc,marginTop:8}}>{stepLabels[mf.step]}</p>
              </div>

              {/* ══ STEP 0: Tipe & Info Dasar ══ */}
              {mf.step===0&&(
              <DCard accent={tc}>
                <div className="flex flex-col gap-5">
                  <div>
                    <FLabel>Tipe Misi</FLabel>
                    <div className="flex gap-2 flex-wrap">
                      {['EVENT','KONTEN','ENGAGEMENT','EDUKASI','AKSI'].map(t=>(
                        <button key={t} onClick={()=>setMissionForm(f=>({...f,type:t}))} style={{
                          padding:'10px 16px',borderRadius:12,border:`1.5px solid ${mf.type===t?typeColor(t):C.border}`,cursor:'pointer',
                          background:mf.type===t?typeBg(t):'transparent',color:mf.type===t?typeColor(t):C.textSec,
                          fontSize:12,fontWeight:mf.type===t?700:500,display:'flex',alignItems:'center',gap:6,transition:'all 200ms',
                        }}>
                          <MI name={typeIcon(t)} size={16} fill={mf.type===t} style={{color:mf.type===t?typeColor(t):C.textMuted}}/>{t}
                        </button>
                      ))}
                    </div>
                    <p style={{fontSize:11,color:tc,fontWeight:600,marginTop:6}}>{typeDesc(mf.type)}</p>
                  </div>
                  <div><FLabel>Judul Misi</FLabel><FInput value={mf.title} onChange={e=>setMissionForm(f=>({...f,title:e.target.value}))} placeholder="Judul misi yang jelas dan menarik..."/></div>
                  <div><FLabel>Deskripsi</FLabel><FArea value={mf.desc} onChange={e=>setMissionForm(f=>({...f,desc:e.target.value}))} placeholder="Jelaskan apa yang harus dilakukan anggota..."/></div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
                    <div><FLabel>XP Reward</FLabel><FInput type="number" value={mf.xp} onChange={e=>setMissionForm(f=>({...f,xp:parseInt(e.target.value)||0}))} mono/></div>
                    <div><FLabel>Bonus XP</FLabel><FInput type="number" value={mf.bonus} onChange={e=>setMissionForm(f=>({...f,bonus:parseInt(e.target.value)||0}))} mono/></div>
                    <div><FLabel>Deadline</FLabel><FInput value={mf.deadline} onChange={e=>setMissionForm(f=>({...f,deadline:e.target.value}))} placeholder="22 Apr 2026"/></div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div>
                      <FLabel>Status</FLabel>
                      <div className="flex gap-2">{['TERBUKA','SIAGA','PRIORITAS'].map(s=>(<FChip key={s} label={s} active={mf.status===s} onClick={()=>setMissionForm(f=>({...f,status:s}))} color={s==='PRIORITAS'?C.red:s==='SIAGA'?C.orange:C.green}/>))}</div>
                    </div>
                  </div>
                </div>
              </DCard>
              )}

              {/* ══ STEP 1: Detail per Tipe ══ */}
              {mf.step===1&&(
              <DCard accent={tc} title={`Detail ${mf.type}`} subtitle={`Pengaturan khusus tipe ${mf.type}`}>
                <div className="flex flex-col gap-4">

                  {/* EVENT fields */}
                  {mf.type==='EVENT'&&(<>
                    <div><FLabel>Lokasi Event</FLabel><FInput value={mf.location} onChange={e=>setMissionForm(f=>({...f,location:e.target.value}))} placeholder="Markas Besar TNI AD, Jl. Veteran III, Jakarta Pusat"/></div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                      <div><FLabel>Tanggal & Waktu</FLabel><FInput value={mf.eventDate} onChange={e=>setMissionForm(f=>({...f,eventDate:e.target.value}))} placeholder="22 Apr 2026, 07:00"/></div>
                      <div><FLabel>Kapasitas</FLabel><FInput type="number" value={mf.capacity} onChange={e=>setMissionForm(f=>({...f,capacity:parseInt(e.target.value)||0}))} mono/></div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                      <div>
                        <FLabel>Metode Check-in</FLabel>
                        <div className="flex gap-2">{['QR Code','GPS + Selfie','QR Code + ID','Manual'].map(c=>(<FChip key={c} label={c} active={mf.checkin===c} onClick={()=>setMissionForm(f=>({...f,checkin:c}))}/>))}</div>
                      </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                      <div><FLabel>Latitude</FLabel><FInput value={mf.lat} onChange={e=>setMissionForm(f=>({...f,lat:e.target.value}))} placeholder="-6.1753" mono/></div>
                      <div><FLabel>Longitude</FLabel><FInput value={mf.lng} onChange={e=>setMissionForm(f=>({...f,lng:e.target.value}))} placeholder="106.8290" mono/></div>
                    </div>
                    <div><FLabel>Catatan Lokasi</FLabel><FInput value={mf.eventNote} onChange={e=>setMissionForm(f=>({...f,eventNote:e.target.value}))} placeholder="Instruksi parkir, dress code, dll"/></div>
                  </>)}

                  {/* KONTEN fields */}
                  {mf.type==='KONTEN'&&(<>
                    <div>
                      <FLabel>Format Konten</FLabel>
                      <div className="flex gap-2 flex-wrap">{['Video (portrait 9:16)','Video (landscape 16:9)','Gambar / Carousel','Infografis','Artikel / Thread'].map(f=>(<FChip key={f} label={f} active={mf.format===f} onClick={()=>setMissionForm(fm=>({...fm,format:f}))}/>))}</div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                      <div><FLabel>Durasi (jika video)</FLabel><FInput value={mf.duration} onChange={e=>setMissionForm(f=>({...f,duration:e.target.value}))} placeholder="30-60 detik"/></div>
                    </div>
                    <div>
                      <FLabel>Platform Target</FLabel>
                      <div className="flex gap-2 flex-wrap">{['Instagram','TikTok','YouTube Shorts','X','Facebook'].map(p=>(<FChip key={p} label={p} active={mf.platforms.includes(p)} onClick={()=>setMissionForm(f=>({...f,platforms:f.platforms.includes(p)?f.platforms.filter(x=>x!==p):[...f.platforms,p]}))}/>))}</div>
                    </div>
                    <div><FLabel>Hashtag Wajib</FLabel><FTagInput tags={mf.hashtags} setTags={tags=>setMissionForm(f=>({...f,hashtags:tags}))} placeholder="#TNIAD"/></div>
                    <div><FLabel>Panduan / Guidelines</FLabel><FListInput items={mf.guidelines} setItems={g=>setMissionForm(f=>({...f,guidelines:g}))} placeholder="Min 30 detik durasi..."/></div>
                  </>)}

                  {/* ENGAGEMENT fields */}
                  {mf.type==='ENGAGEMENT'&&(<>
                    <div><FLabel>Aksi yang Dibutuhkan</FLabel><FListInput items={mf.actions} setItems={a=>setMissionForm(f=>({...f,actions:a}))} placeholder="Like post resmi..."/></div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                      <div><FLabel>Target Post</FLabel><FInput type="number" value={mf.targetPosts} onChange={e=>setMissionForm(f=>({...f,targetPosts:parseInt(e.target.value)||1}))} mono/></div>
                    </div>
                    <div><FLabel>Catatan Engagement</FLabel><FArea value={mf.engNote} onChange={e=>setMissionForm(f=>({...f,engNote:e.target.value}))} placeholder="Komentar harus natural, relevan, dan positif..." rows={2}/></div>
                  </>)}

                  {/* EDUKASI fields */}
                  {mf.type==='EDUKASI'&&(<>
                    <div><FLabel>Jenis Materi</FLabel><FInput value={mf.material} onChange={e=>setMissionForm(f=>({...f,material:e.target.value}))} placeholder="Infografis + Video Singkat DISPENAD"/></div>
                    <div>
                      <FLabel>Channel Distribusi</FLabel>
                      <div className="flex gap-2 flex-wrap">{['WhatsApp','Telegram','Instagram','Facebook','LINE','X'].map(ch=>(<FChip key={ch} label={ch} active={mf.channels.includes(ch)} onClick={()=>setMissionForm(f=>({...f,channels:f.channels.includes(ch)?f.channels.filter(x=>x!==ch):[...f.channels,ch]}))}/>))}</div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                      <div><FLabel>Min Grup</FLabel><FInput type="number" value={mf.minGroups} onChange={e=>setMissionForm(f=>({...f,minGroups:parseInt(e.target.value)||1}))} mono/></div>
                      <div><FLabel>Min Anggota/Grup</FLabel><FInput type="number" value={mf.minGroupSize} onChange={e=>setMissionForm(f=>({...f,minGroupSize:parseInt(e.target.value)||1}))} mono/></div>
                    </div>
                    <div><FLabel>Catatan Distribusi</FLabel><FArea value={mf.eduNote} onChange={e=>setMissionForm(f=>({...f,eduNote:e.target.value}))} placeholder="Kirim ke grup komunitas, alumni, keluarga..." rows={2}/></div>
                  </>)}

                  {/* AKSI fields */}
                  {mf.type==='AKSI'&&(<>
                    <div><FLabel>Jenis Aksi</FLabel><FInput value={mf.actionType} onChange={e=>setMissionForm(f=>({...f,actionType:e.target.value}))} placeholder="Rekrutmen Relawan Sipil"/></div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
                      <div><FLabel>Target</FLabel><FInput type="number" value={mf.target} onChange={e=>setMissionForm(f=>({...f,target:parseInt(e.target.value)||0}))} mono/></div>
                      <div><FLabel>Satuan</FLabel><FInput value={mf.unit} onChange={e=>setMissionForm(f=>({...f,unit:e.target.value}))} placeholder="relawan"/></div>
                      <div><FLabel>Area</FLabel><FInput value={mf.area} onChange={e=>setMissionForm(f=>({...f,area:e.target.value}))} placeholder="Nasional"/></div>
                    </div>
                    <div><FLabel>Metode</FLabel><FInput value={mf.method} onChange={e=>setMissionForm(f=>({...f,method:e.target.value}))} placeholder="Online form + koordinasi Kodim"/></div>
                    <div><FLabel>Catatan Aksi</FLabel><FArea value={mf.aksiNote} onChange={e=>setMissionForm(f=>({...f,aksiNote:e.target.value}))} placeholder="Relawan akan berkoordinasi dengan satuan TNI AD setempat" rows={2}/></div>
                  </>)}
                </div>
              </DCard>
              )}

              {/* ══ STEP 2: Konten & Template ══ */}
              {mf.step===2&&(
              <DCard accent={tc} title="Konten & Template" subtitle="Spesifikasi konten dan template caption untuk anggota">
                <div className="flex flex-col gap-4">
                  {/* Content Spec (for EVENT types that need photo/video documentation) */}
                  {(mf.type==='EVENT'||mf.type==='KONTEN')&&(<>
                    <div>
                      <FLabel>Format Dokumentasi</FLabel>
                      <div className="flex gap-2 flex-wrap">{['Foto + Video','Foto only','Video only','Foto before-after'].map(f=>(<FChip key={f} label={f} active={mf.contentFormat===f} onClick={()=>setMissionForm(fm=>({...fm,contentFormat:f}))}/>))}</div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                      <div><FLabel>Min Foto</FLabel><FInput type="number" value={mf.minPhotos} onChange={e=>setMissionForm(f=>({...f,minPhotos:parseInt(e.target.value)||0}))} mono/></div>
                      <div><FLabel>Durasi Video</FLabel><FInput value={mf.videoDuration} onChange={e=>setMissionForm(f=>({...f,videoDuration:e.target.value}))} placeholder="60-120 detik"/></div>
                    </div>
                    <div><FLabel>Catatan Konten</FLabel><FArea value={mf.contentNote} onChange={e=>setMissionForm(f=>({...f,contentNote:e.target.value}))} placeholder="Foto: suasana, pembicara, peserta. Hindari foto wajah anak-anak." rows={2}/></div>
                  </>)}

                  {/* Template Captions */}
                  <div>
                    <FLabel>Template Caption untuk Anggota</FLabel>
                    <p style={{fontSize:11,color:C.textMuted,marginBottom:8}}>Anggota bisa copy-paste caption ini saat posting. Buat beberapa variasi.</p>
                    <FListInput items={mf.templates} setItems={t=>setMissionForm(f=>({...f,templates:t}))} placeholder="Dirgahayu TNI AD ke-81! Prajurit tangguh, rakyat terlindungi..."/>
                  </div>

                  {/* Bonus Kategori Preview */}
                  <div style={{background:`${tc}08`,borderRadius:12,padding:16,border:`1px solid ${tc}20`}}>
                    <div className="flex items-center gap-2 mb-3">
                      <MI name="emoji_events" size={18} fill style={{color:C.gold}}/>
                      <p style={{fontSize:12,fontWeight:700,color:C.text}}>Bonus Kategori — {mf.type}</p>
                    </div>
                    <p style={{fontSize:11,color:C.textMuted,marginBottom:8}}>Bonus otomatis yang diberikan admin setelah review. Anggota akan melihat ini di detail misi.</p>
                    <div className="flex flex-col gap-2">
                      {typeBonuses(mf.type).map((b,bi)=>(
                        <div key={bi} className="flex items-center gap-3" style={{padding:'6px 8px',borderRadius:8,background:`${b.color}10`,border:`1px solid ${b.color}15`}}>
                          <MI name={b.icon} size={14} fill style={{color:b.color}}/>
                          <span style={{fontSize:11,fontWeight:600,color:C.text,flex:1}}>{b.label}</span>
                          <span style={{fontSize:11,fontWeight:800,color:b.color,fontFamily:"'JetBrains Mono'"}}>+{b.xp} XP</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </DCard>
              )}

              {/* ══ STEP 3: Review & Publikasi ══ */}
              {mf.step===3&&(
              <DCard accent={tc} title="Review & Publikasi" subtitle="Periksa kembali sebelum dipublikasikan">
                <div className="flex flex-col gap-4">
                  {/* Preview Card */}
                  <div style={{background:C.surfaceLight,borderRadius:14,padding:18,border:`1px solid ${C.border}`,position:'relative',overflow:'hidden'}}>
                    <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${tc},transparent)`}}/>
                    <div className="flex items-center gap-2 mb-2">
                      <div style={{width:28,height:28,borderRadius:8,background:typeBg(mf.type),display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <MI name={typeIcon(mf.type)} size={14} fill style={{color:tc}}/>
                      </div>
                      <span style={{fontSize:11,fontWeight:700,color:tc,textTransform:'uppercase'}}>{mf.type}</span>
                      <span style={{marginLeft:'auto',fontSize:10,fontWeight:700,color:mf.status==='PRIORITAS'?C.red:mf.status==='SIAGA'?C.orange:C.green,background:mf.status==='PRIORITAS'?C.redLight:mf.status==='SIAGA'?C.orangeLight:C.greenLight,padding:'3px 8px',borderRadius:6}}>{mf.status}</span>
                    </div>
                    <h3 style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:4}}>{mf.title||'(Belum ada judul)'}</h3>
                    <p style={{fontSize:12,color:C.textSec,lineHeight:1.5,marginBottom:10}}>{mf.desc||'(Belum ada deskripsi)'}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span style={{fontSize:13,fontWeight:800,color:C.gold,fontFamily:"'JetBrains Mono'"}}><MI name="star" size={13} fill style={{color:C.gold,verticalAlign:'middle',marginRight:2}}/>+{mf.xp} XP</span>
                      {mf.bonus>0&&<span style={{fontSize:11,fontWeight:700,color:C.green}}>+{mf.bonus} bonus</span>}
                      {mf.deadline&&<span style={{fontSize:11,color:C.textMuted}}><MI name="schedule" size={12} style={{verticalAlign:'middle',marginRight:2}}/>{mf.deadline}</span>}
                    </div>
                  </div>

                  {/* Member App Preview */}
                  <div style={{background:C.surfaceLight,borderRadius:14,padding:18,border:`1px solid ${C.border}`}}>
                    <div className="flex items-center gap-2 mb-4">
                      <MI name="phone_iphone" size={16} style={{color:C.primary}}/>
                      <p style={{fontSize:12,fontWeight:700,color:C.text}}>Preview di Member App</p>
                      <span style={{fontSize:10,color:C.textMuted,marginLeft:'auto'}}>Seperti yang dilihat anggota</span>
                    </div>
                    {/* Mini phone mockup */}
                    <div style={{width:220,margin:'0 auto',background:C.bg,borderRadius:20,border:`2px solid ${C.border}`,overflow:'hidden',boxShadow:'0 8px 24px rgba(0,0,0,0.1)'}}>
                      {/* Notch */}
                      <div style={{height:16,background:C.text,display:'flex',justifyContent:'center',alignItems:'center'}}>
                        <div style={{width:60,height:8,borderRadius:6,background:C.bg,opacity:0.3}}/>
                      </div>
                      {/* Mission card preview */}
                      <div style={{padding:10}}>
                        {/* Back */}
                        <div className="flex items-center gap-1 mb-2">
                          <MI name="arrow_back" size={10} style={{color:C.textMuted}}/>
                          <span style={{fontSize:8,color:C.textMuted}}>Kembali</span>
                        </div>
                        {/* Hero illust */}
                        <div style={{height:48,borderRadius:8,background:`linear-gradient(135deg,${tc}88,${tc}20)`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:6}}>
                          <MI name={typeIcon(mf.type)} size={16} style={{color:'rgba(255,255,255,0.7)'}}/>
                        </div>
                        <div style={{padding:'4px 0'}}>
                          <div className="flex items-center gap-1 mb-1">
                            <div style={{width:12,height:12,borderRadius:3,background:typeBg(mf.type),display:'flex',alignItems:'center',justifyContent:'center'}}>
                              <MI name={typeIcon(mf.type)} size={7} fill style={{color:tc}}/>
                            </div>
                            <span style={{fontSize:7,fontWeight:700,color:tc,textTransform:'uppercase'}}>{mf.type}</span>
                          </div>
                          <p style={{fontSize:9,fontWeight:700,color:C.text,lineHeight:1.2,marginBottom:3}}>{mf.title||'Judul Misi'}</p>
                          <div className="flex items-center gap-2">
                            <span style={{fontSize:7,fontWeight:700,color:C.gold,fontFamily:"'JetBrains Mono'"}}>{mf.xp>0?`+${mf.xp} XP`:'+XP'}</span>
                            {mf.deadline&&<span style={{fontSize:7,color:C.textMuted}}>{mf.deadline}</span>}
                          </div>
                          <p style={{fontSize:7,color:C.textSec,marginTop:3,lineHeight:1.3}} className="line-clamp-2">{mf.desc||'Deskripsi misi...'}</p>
                          {/* Fake buttons */}
                          <div style={{marginTop:6,background:`linear-gradient(135deg,${C.primary},${C.primaryAccent})`,borderRadius:6,padding:'4px 0',textAlign:'center'}}>
                            <span style={{fontSize:7,fontWeight:700,color:'#fff'}}>IKUT MISI</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p style={{fontSize:10,color:C.textMuted,textAlign:'center',marginTop:8}}>Anggota melihat misi seperti ini di app SINAR</p>
                  </div>

                  {/* Summary Checklist */}
                  <div className="flex flex-col gap-2">
                    {[
                      {label:'Judul Misi',ok:!!mf.title},
                      {label:'Deskripsi',ok:!!mf.desc},
                      {label:'XP & Deadline',ok:mf.xp>0&&!!mf.deadline},
                      {label:`Detail ${mf.type}`,ok:mf.type==='EVENT'?!!mf.location:mf.type==='KONTEN'?!!mf.format:mf.type==='ENGAGEMENT'?mf.actions.some(Boolean):mf.type==='EDUKASI'?!!mf.material:!!mf.actionType},
                      {label:'Template Caption',ok:mf.templates.some(Boolean)},
                    ].map((c,ci)=>(
                      <div key={ci} className="flex items-center gap-2" style={{padding:'6px 8px',borderRadius:8,background:c.ok?C.greenLight:C.orangeLight,border:`1px solid ${c.ok?C.green+'20':C.orange+'20'}`}}>
                        <MI name={c.ok?'check_circle':'warning'} size={14} fill style={{color:c.ok?C.green:C.orange}}/>
                        <span style={{fontSize:12,fontWeight:600,color:c.ok?C.green:C.orange}}>{c.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Publish + Draft Buttons */}
                  <div style={{display:'flex',gap:10}}>
                    <button onClick={()=>{showToast('Misi disimpan sebagai draft');setAdSubTab('list')}} style={{flex:'0 0 auto',padding:'14px 20px',borderRadius:12,border:`1px solid ${C.border}`,background:C.surfaceLight,color:C.textSec,fontSize:14,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                      <MI name="save" size={16}/> Simpan Draft
                    </button>
                    <button onClick={()=>{showToast('Misi berhasil dipublikasikan!');setMissionForm(f=>({...f,step:0,title:'',desc:''}));setAdSubTab('list')}} className="btn-primary" style={{flex:1,padding:'14px 0',borderRadius:12,border:'none',background:`linear-gradient(135deg,${C.primary},${C.primaryAccent})`,color:C.white,fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,boxShadow:'0 4px 15px rgba(20,83,45,0.2)'}}>
                      <MI name="rocket_launch" size={18} style={{color:C.white}}/> Publikasikan Misi
                    </button>
                  </div>
                </div>
              </DCard>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-3" style={{marginTop:16}}>
                {mf.step>0&&<button onClick={()=>setMissionForm(f=>({...f,step:f.step-1}))} style={{flex:1,padding:'12px 0',borderRadius:12,border:`1px solid ${C.border}`,background:'transparent',color:C.textSec,fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                  <MI name="arrow_back" size={16}/> Kembali
                </button>}
                {mf.step<totalSteps-1&&<button onClick={()=>setMissionForm(f=>({...f,step:f.step+1}))} className="btn-primary" style={{flex:1,padding:'12px 0',borderRadius:12,border:'none',background:tc,color:'white',fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                  Lanjut <MI name="arrow_forward" size={16}/>
                </button>}
              </div>
              </div>);
            })()}

          </div>)}
          {/* ═══ AGENTS ═══ */}
          {adSideTab==='agents'&&(<div className="flex flex-col gap-5">
            {/* Summary Stats */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
              {[{label:'Prajurit',value:'400K',icon:'military_tech',color:C.primary},{label:'Keluarga',value:'184.5K',icon:'favorite',color:C.teal},{label:'Aktif Hari Ini',value:'89.2K',icon:'person_check',color:C.green},{label:'Top Engagement',value:'18.5%',icon:'trending_up',color:C.purple}].map((s,i)=>(
                <div key={i} style={{padding:18,borderRadius:12,background:`linear-gradient(135deg,${s.color}08,${s.color}03)`,border:`1px solid ${s.color}22`}}>
                  <div className="flex items-center gap-2 mb-2">
                    <MI name={s.icon} size={18} fill style={{color:s.color}}/>
                    <span style={{fontSize:13,color:C.textMuted,fontWeight:500}}>{s.label}</span>
                  </div>
                  <p style={{fontSize:28,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'"}}>{s.value}</p>
                </div>
              ))}
            </div>
            {/* Demographics Grid */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
              {/* Gender */}
              <DCard title="Gender" subtitle="Distribusi jenis kelamin">
                <div className="flex flex-col gap-2">
                  {[{label:'Pria',value:'286.4K',pct:64,color:C.primary},{label:'Wanita',value:'158.7K',pct:36,color:C.teal}].map((g,i)=>(
                    <div key={i} className="flex items-center gap-3">
                      <span style={{fontSize:11,fontWeight:600,color:g.color,width:48}}>{g.label}</span>
                      <div className="flex-1" style={{height:22,borderRadius:6,background:g.color+'12',overflow:'hidden'}}>
                        <div style={{width:`${g.pct}%`,height:'100%',borderRadius:6,background:g.color,display:'flex',alignItems:'center',paddingLeft:8}}>
                          <span style={{fontSize:11,fontWeight:700,color:'#fff'}}>{g.pct}%</span>
                        </div>
                      </div>
                      <span style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:"'JetBrains Mono'",width:52,textAlign:'right'}}>{g.value}</span>
                    </div>
                  ))}
                </div>
                <p style={{fontSize:11,color:C.textDark,marginTop:8}}>Prajurit: 92% pria · Suami: 100% pria · Istri: 100% wanita</p>
              </DCard>
              {/* Age Distribution */}
              <DCard title="Usia" subtitle="Kelompok usia anggota">
                <div className="flex flex-col gap-2">
                  {[{range:'18-24',pct:22,count:'90.8K',color:C.purple},{range:'25-34',pct:38,count:'156.9K',color:C.primary},{range:'35-44',pct:26,count:'107.3K',color:C.accent},{range:'45-54',pct:11,count:'45.4K',color:C.teal},{range:'55+',pct:3,count:'12.4K',color:C.textMuted}].map((a,i)=>(
                    <div key={i} className="flex items-center gap-2">
                      <span style={{fontSize:12,fontWeight:600,color:C.textSec,width:34,flexShrink:0}}>{a.range}</span>
                      <div className="flex-1" style={{height:16,borderRadius:4,background:C.surfaceLight,overflow:'hidden'}}>
                        <div style={{width:`${a.pct}%`,height:'100%',borderRadius:4,background:a.color}}/>
                      </div>
                      <span style={{fontSize:12,fontWeight:600,color:C.textMuted,fontFamily:"'JetBrains Mono'",width:40,textAlign:'right',flexShrink:0}}>{a.count}</span>
                    </div>
                  ))}
                </div>
                <p style={{fontSize:11,color:C.textDark,marginTop:6}}>Rata-rata: 31.4 tahun</p>
              </DCard>
              {/* Education + Social */}
              <DCard title="Pendidikan & Sosmed" subtitle="Latar belakang anggota">
                <div className="flex flex-col gap-3">
                  <div>
                    <p style={{fontSize:12,fontWeight:600,color:C.textSec,marginBottom:6}}>Pendidikan</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[{l:'SMA',p:42,c:C.accent},{l:'D3',p:18,c:C.teal},{l:'S1',p:32,c:C.primary},{l:'S2+',p:8,c:C.purple}].map((e,i)=>(
                        <div key={i} style={{textAlign:'center',padding:'6px 4px',borderRadius:8,background:e.c+'08'}}>
                          <p style={{fontSize:15,fontWeight:800,color:e.c,fontFamily:"'JetBrains Mono'"}}>{e.p}%</p>
                          <p style={{fontSize:10,color:C.textMuted}}>{e.l}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p style={{fontSize:12,fontWeight:600,color:C.textSec,marginBottom:6}}>Sosial Media</p>
                    {[{p:'Instagram',v:'76%',c:'#E1306C'},{p:'TikTok',v:'67%',c:'#1A1A1A'},{p:'X',v:'46%',c:'#1DA1F2'}].map((s,i)=>(
                      <div key={i} className="flex items-center gap-2" style={{padding:'3px 0'}}>
                        <span style={{fontSize:12,color:C.textSec,width:60,flexShrink:0}}>{s.p}</span>
                        <div className="flex-1" style={{height:8,borderRadius:4,background:s.c+'15',overflow:'hidden'}}>
                          <div style={{width:s.v,height:'100%',borderRadius:4,background:s.c}}/>
                        </div>
                        <span style={{fontSize:12,fontWeight:700,color:s.c,width:32,textAlign:'right',fontFamily:"'JetBrains Mono'"}}>{s.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </DCard>
            </div>

            {/* Filter Row */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2" style={{background:C.surface,borderRadius:12,padding:4,border:`1px solid ${C.border}`}}>
                {['Semua','Prajurit','Suami','Istri','Anak'].map(t=>(
                  <button key={t} onClick={()=>setAdminAgentFilter(t)} style={{padding:'8px 14px',borderRadius:8,border:'none',background:adminAgentFilter===t?C.primaryLight:'transparent',color:adminAgentFilter===t?C.primary:C.textSec,fontSize:12,fontWeight:adminAgentFilter===t?700:500,cursor:'pointer',transition:'all 200ms'}}>{t}</button>
                ))}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderRadius:12,background:C.surfaceLight,border:`1px solid ${C.border}`}}>
                <MI name="search" size={16} style={{color:C.textMuted}}/>
                <input value={adminAgentSearch} onChange={e=>setAdminAgentSearch(e.target.value)} placeholder="Cari nama, NRP, atau satuan..." style={{background:'transparent',border:'none',outline:'none',color:C.text,fontSize:12,width:160,fontFamily:'Inter'}}/>
              </div>
            </div>
            {/* Agent Detail Modal */}
            {selectedAgent&&<div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)'}} onClick={()=>setSelectedAgent(null)}>
              <div onClick={e=>e.stopPropagation()} style={{width:520,maxHeight:'80vh',overflow:'auto',borderRadius:16,background:C.bg,border:`1px solid ${C.border}`,boxShadow:'0 24px 80px rgba(0,0,0,0.3)'}}>
                <div style={{padding:'24px 28px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:16}}>
                  <AvatarImg initials={selectedAgent.avatar} size={56} style={{borderRadius:16,border:`3px solid ${selectedAgent.tier==='Gold'?C.gold:selectedAgent.tier==='Silver'?C.silver:C.border}`}}/>
                  <div style={{flex:1}}>
                    <h3 style={{fontSize:18,fontWeight:700,color:C.text}}>{selectedAgent.name}</h3>
                    <p style={{fontSize:13,color:C.textMuted}}>NRP {selectedAgent.nrp} · {selectedAgent.satuan}</p>
                    <div className="flex gap-2 mt-1">
                      <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:5,background:ACCOUNT_TYPES[selectedAgent.acctType]?.color+'12',color:ACCOUNT_TYPES[selectedAgent.acctType]?.color}}>{ACCOUNT_TYPES[selectedAgent.acctType]?.label}</span>
                      <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:5,background:selectedAgent.tier==='Gold'?C.accentLight:C.surfaceLight,color:selectedAgent.tier==='Gold'?C.accent:C.primary}}>{selectedAgent.tier}</span>
                    </div>
                  </div>
                  <button onClick={()=>setSelectedAgent(null)} style={{background:'none',border:'none',cursor:'pointer',padding:8}}><MI name="close" size={20} style={{color:C.textMuted}}/></button>
                </div>
                <div style={{padding:'20px 28px'}}>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
                    {[{v:selectedAgent.missions,l:'Misi Selesai',c:C.primary},{v:selectedAgent.xp.toLocaleString(),l:'Total XP',c:C.gold},{v:selectedAgent.engagement,l:'Engagement',c:C.green},{v:selectedAgent.status==='active'?'Aktif':'Idle',l:'Status',c:selectedAgent.status==='active'?C.green:C.textMuted}].map((s,i)=>(
                      <div key={i} style={{textAlign:'center',padding:'12px 8px',borderRadius:10,background:s.c+'08',border:`1px solid ${s.c}15`}}>
                        <p style={{fontSize:18,fontWeight:800,color:s.c,fontFamily:"'JetBrains Mono'"}}>{s.v}</p>
                        <p style={{fontSize:10,color:C.textMuted,marginTop:2}}>{s.l}</p>
                      </div>
                    ))}
                  </div>
                  <h4 style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:8}}>Riwayat Misi Terbaru</h4>
                  {[{m:selectedAgent.missions>20?'Upacara HUT TNI AD':'Bakti Sosial Kodam',t:'EVENT',s:'SELESAI',xp:400},{m:selectedAgent.tier==='Gold'?'Video Viral Challenge':'Video Reels Pendek',t:'KONTEN',s:'SELESAI',xp:300},{m:selectedAgent.xp>5000?'Kampanye Digital Nasional':'Like & Share Konten Resmi',t:selectedAgent.xp>5000?'AKSI':'ENGAGEMENT',s:selectedAgent.status==='active'?'SELESAI':'REVIEW',xp:selectedAgent.xp>5000?350:200}].map((h,i)=>(
                    <div key={i} className="flex items-center gap-3" style={{padding:'8px 0',borderBottom:i<2?`1px solid ${C.borderLight}`:'none'}}>
                      <MI name={h.t==='EVENT'?'event':h.t==='KONTEN'?'play_circle':'thumb_up'} size={16} style={{color:C.primary}}/>
                      <div style={{flex:1}}><p style={{fontSize:12,fontWeight:600,color:C.text}}>{h.m}</p><span style={{fontSize:10,color:C.textMuted}}>{h.t}</span></div>
                      <span style={{fontSize:10,fontWeight:700,color:h.s==='SELESAI'?C.green:C.orange}}>{h.s}</span>
                      <span style={{fontSize:11,fontWeight:700,color:C.gold,fontFamily:"'JetBrains Mono'"}}>+{h.xp}</span>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-4">
                    <button onClick={()=>{showToast(`Reminder dikirim ke ${selectedAgent.name}`);setSelectedAgent(null);}} style={{flex:1,padding:'10px',borderRadius:10,border:`1px solid ${C.border}`,background:C.surfaceLight,color:C.text,fontSize:12,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><MI name="notifications" size={14} style={{color:C.primary}}/>Kirim Reminder</button>
                    <button onClick={()=>{showToast(`Data ${selectedAgent.name} diekspor`);setSelectedAgent(null);}} style={{flex:1,padding:'10px',borderRadius:10,border:`1px solid ${C.border}`,background:C.surfaceLight,color:C.text,fontSize:12,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><MI name="download" size={14} style={{color:C.primary}}/>Export Data</button>
                  </div>
                </div>
              </div>
            </div>}

            <DCard title="Daftar Anggota" subtitle={`${agentsList.length} anggota terdaftar`} noPad accent={C.primary}
                action={<button onClick={()=>showToast('Data anggota diekspor ke CSV')} style={{fontSize:11,fontWeight:600,color:C.primary,background:C.primaryLight,border:'none',padding:'6px 12px',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}><MI name="download" size={14}/>Export CSV</button>}>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:C.glass}}>{['#','Anggota','Tipe','Tier','Misi','XP','Engage','Status'].map(h=>(
                      <th key={h} style={{padding:'14px 16px',fontSize:12,fontWeight:700,color:C.textMuted,textAlign:'left',borderBottom:`1px solid ${C.border}`,textTransform:'uppercase',letterSpacing:0.8}}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {(adminAgentFilter==='Semua'?agentsList:agentsList.filter(a=>a.acctType===adminAgentFilter.toLowerCase())).filter(a=>!adminAgentSearch||a.name.toLowerCase().includes(adminAgentSearch.toLowerCase())||a.nrp.toLowerCase().includes(adminAgentSearch.toLowerCase())||a.satuan.toLowerCase().includes(adminAgentSearch.toLowerCase())).map((a,i)=>(
                      <tr key={i} onClick={()=>setSelectedAgent(a)} style={{borderBottom:`1px solid ${C.borderLight}`,cursor:'pointer',transition:'background 150ms'}} onMouseEnter={e=>e.currentTarget.style.background=C.glass} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{padding:'14px 16px',fontSize:13,color:C.textMuted,fontFamily:"'JetBrains Mono'",fontWeight:600}}>{i+1}</td>
                        <td style={{padding:'12px 16px'}}>
                          <div className="flex items-center gap-3">
                            <AvatarImg initials={a.avatar} size={36} style={{borderRadius:12,border:`2px solid ${a.tier==='Gold'?C.gold:a.tier==='Silver'?C.silver:C.border}`}}/>
                            <div>
                              <span style={{fontSize:14,fontWeight:600,color:C.text,display:'block'}}>{a.name}</span>
                              <span style={{fontSize:11,color:C.textMuted}}>ID-{1000+i}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{padding:'12px 16px'}}>
                          <span style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:5,
                            background:ACCOUNT_TYPES[a.acctType]?.color+'12',
                            color:ACCOUNT_TYPES[a.acctType]?.color}}>
                            {ACCOUNT_TYPES[a.acctType]?.label}
                          </span>
                        </td>

                        <td style={{padding:'12px 16px'}}>
                          <span style={{fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:6,display:'inline-flex',alignItems:'center',gap:3,
                            background:a.tier==='Gold'?C.accentLight:a.tier==='Silver'?C.primaryHover:C.surfaceLight,
                            color:a.tier==='Gold'?C.accent:a.tier==='Silver'?C.primary:C.textMuted,
                            border:`1px solid ${a.tier==='Gold'?C.accent+'22':a.tier==='Silver'?C.primary+'22':C.border}`}}>
                            <MI name={a.tier==='Gold'?'workspace_premium':a.tier==='Silver'?'military_tech':'shield'} size={12} fill style={{color:a.tier==='Gold'?C.accent:a.tier==='Silver'?C.primary:C.textMuted}}/>{a.tier}
                          </span>
                        </td>
                        <td style={{padding:'14px 16px',fontSize:14,fontWeight:600,color:C.text,fontFamily:"'JetBrains Mono'"}}>{a.missions}</td>
                        <td style={{padding:'14px 16px'}}>
                          <span style={{fontSize:14,fontWeight:700,color:C.gold,fontFamily:"'JetBrains Mono'"}}>{a.xp.toLocaleString()}</span>
                        </td>
                        <td style={{padding:'14px 16px'}}>
                          <span style={{fontSize:14,fontWeight:700,color:parseFloat(a.engagement)>=15?C.green:parseFloat(a.engagement)>=10?C.orange:C.textMuted,fontFamily:"'JetBrains Mono'"}}>{a.engagement}</span>
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
              {/* Back + Breadcrumb + Actions */}
              <div className="flex items-center gap-2">
                <button onClick={()=>setAdSideTab('misi')} style={{color:C.textSec,fontSize:13,fontWeight:600,background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
                  <MI name="arrow_back" size={18} style={{color:C.textSec}}/> Manajemen Misi
                </button>
                <span style={{color:C.textMuted,fontSize:12}}>/</span>
                <span style={{fontSize:12,fontWeight:600,color:C.primary}}>{(MISSIONS.find(x=>x.id===selectedAdMission)||MISSIONS[0]).title}</span>
                <div style={{marginLeft:'auto',display:'flex',gap:8}}>
                  <button onClick={()=>{showToast('Misi diduplikasi — buka Manajemen Misi untuk edit');setAdSideTab('misi');setAdSubTab('list');}} style={{fontSize:11,fontWeight:600,color:C.primary,background:C.primaryLight,border:'none',padding:'6px 14px',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}><MI name="content_copy" size={14}/>Duplikasi</button>
                  <button onClick={()=>showToast('Laporan misi diekspor ke PDF')} style={{fontSize:11,fontWeight:600,color:C.accent,background:C.accentLight,border:'none',padding:'6px 14px',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}><MI name="download" size={14}/>Export</button>
                </div>
              </div>

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
                    <span style={{fontSize:16,fontWeight:800,color:C.gold,fontFamily:"'JetBrains Mono'",background:C.goldLight,padding:'6px 14px',borderRadius:8,border:'1px solid rgba(20,83,45,0.15)'}}>+{m.xp} XP</span>
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
                    <div key={i} style={{padding:'18px 10px',textAlign:'center',borderRight:i<5?`1px solid ${C.borderLight}`:'none'}}>
                      <MI name={s.icon} size={16} style={{color:s.c,marginBottom:6}}/>
                      <p style={{fontSize:22,fontWeight:800,color:s.c,fontFamily:"'JetBrains Mono'"}}>{s.v}</p>
                      <p style={{fontSize:12,color:C.textMuted,fontWeight:600,marginTop:4}}>{s.l}</p>
                    </div>
                  ))}
                </div>
                {m.analytics&&(
                  <div style={{padding:'18px 24px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
                    {[{l:'Completion',v:`${m.analytics.completion}%`,c:m.analytics.completion>=70?C.green:C.orange},
                      {l:'Sentimen',v:`${m.analytics.sentiment}%`,c:m.analytics.sentiment>=70?C.green:C.orange},
                      {l:'Konversi',v:m.analytics.conversionRate,c:C.primary},
                      {l:'Avg Time',v:m.analytics.avgTime,c:C.textSec},
                    ].map((s,i)=>(
                      <div key={i} style={{background:C.surfaceLight,borderRadius:10,padding:14,textAlign:'center'}}>
                        <p style={{fontSize:20,fontWeight:800,color:s.c,fontFamily:"'JetBrains Mono'"}}>{s.v}</p>
                        <p style={{fontSize:12,color:C.textMuted,marginTop:3,fontWeight:500}}>{s.l}</p>
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

              {/* ═══ DEMOGRAFI PESERTA MISI ═══ */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
                {/* Gender */}
                <DCard title="Gender Peserta" subtitle={`Distribusi dari ${m.participants} peserta`} accent={C.primary}>
                  <div className="flex flex-col gap-3">
                    {[{label:'Pria',value:Math.round(m.participants*0.64),pct:64,color:C.primary},{label:'Wanita',value:Math.round(m.participants*0.36),pct:36,color:C.teal}].map((g,i)=>(
                      <div key={i} style={{padding:12,borderRadius:10,background:`${g.color}08`,border:`1px solid ${g.color}15`}}>
                        <div className="flex items-center justify-between mb-1">
                          <span style={{fontSize:12,fontWeight:600,color:g.color}}>{g.label}</span>
                          <span style={{fontSize:12,fontWeight:700,color:g.color,fontFamily:"'JetBrains Mono'"}}>{g.pct}%</span>
                        </div>
                        <p style={{fontSize:18,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'"}}>{g.value}</p>
                        <div style={{height:4,borderRadius:99,background:`${g.color}20`,overflow:'hidden',marginTop:6}}>
                          <div style={{width:`${g.pct}%`,height:'100%',borderRadius:99,background:g.color}}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </DCard>

                {/* Age Distribution */}
                <DCard title="Kelompok Usia" subtitle="Distribusi usia peserta misi" accent={C.purple}>
                  <div className="flex flex-col gap-2">
                    {[
                      {range:'18-24',pct:22,color:C.purple},
                      {range:'25-34',pct:38,color:C.primary},
                      {range:'35-44',pct:26,color:C.accent},
                      {range:'45-54',pct:11,color:C.teal},
                      {range:'55+',pct:3,color:C.textMuted},
                    ].map((a,i)=>(
                      <div key={i} className="flex items-center gap-3">
                        <span style={{fontSize:11,fontWeight:600,color:C.textSec,width:40,flexShrink:0}}>{a.range}</span>
                        <div className="flex-1" style={{height:18,borderRadius:6,background:C.surfaceLight,overflow:'hidden',position:'relative'}}>
                          <div style={{width:`${a.pct}%`,height:'100%',borderRadius:6,background:a.color,display:'flex',alignItems:'center',paddingLeft:6}}>
                            {a.pct>12&&<span style={{fontSize:9,fontWeight:700,color:'white'}}>{a.pct}%</span>}
                          </div>
                        </div>
                        <span style={{fontSize:11,fontWeight:700,color:C.textMuted,fontFamily:"'JetBrains Mono'",width:32,textAlign:'right',flexShrink:0}}>{Math.round(m.participants*a.pct/100)}</span>
                      </div>
                    ))}
                  </div>
                  <p style={{fontSize:10,color:C.textDark,marginTop:8}}>Rata-rata usia: 31.4 tahun</p>
                </DCard>

                {/* Pangkat & Platform */}
                <DCard title="Pangkat & Platform" subtitle="Distribusi pangkat dan sosmed" accent={C.accent}>
                  <div style={{marginBottom:14}}>
                    <p style={{fontSize:10,fontWeight:700,color:C.textMuted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:6}}>Distribusi Pangkat</p>
                    <div className="flex flex-col gap-2">
                      {[
                        {rank:'Tamtama',pct:45,color:C.textMuted},
                        {rank:'Bintara',pct:38,color:C.accent},
                        {rank:'Perwira Pertama',pct:12,color:C.primary},
                        {rank:'Perwira Menengah+',pct:5,color:C.gold},
                      ].map((r,i)=>(
                        <div key={i} className="flex items-center gap-2">
                          <span style={{fontSize:11,fontWeight:600,color:C.textSec,width:90,flexShrink:0}} className="truncate">{r.rank}</span>
                          <div className="flex-1" style={{height:6,borderRadius:99,background:C.surfaceLight,overflow:'hidden'}}>
                            <div style={{width:`${r.pct}%`,height:'100%',borderRadius:99,background:r.color}}/>
                          </div>
                          <span style={{fontSize:10,fontWeight:700,color:r.color,fontFamily:"'JetBrains Mono'",width:28,textAlign:'right',flexShrink:0}}>{r.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p style={{fontSize:10,fontWeight:700,color:C.textMuted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:6}}>Platform Aktif</p>
                    <div className="flex flex-col gap-2">
                      {[
                        {platform:'Instagram',pct:38,color:'#E1306C'},
                        {platform:'TikTok',pct:32,color:'#1A1A1A'},
                        {platform:'X',pct:18,color:'#1DA1F2'},
                        {platform:'YouTube',pct:12,color:'#FF0000'},
                      ].map((p,i)=>(
                        <div key={i} className="flex items-center gap-2">
                          <SocialIcon platform={p.platform.toLowerCase()==='x'?'x':p.platform.toLowerCase()} size={12} color={p.color}/>
                          <span style={{fontSize:11,fontWeight:600,color:C.textSec,flex:1}}>{p.platform}</span>
                          <span style={{fontSize:11,fontWeight:700,color:p.color,fontFamily:"'JetBrains Mono'"}}>{p.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </DCard>
              </div>

              {/* ═══ CAMPAIGN EFFECTIVENESS DASHBOARD ═══ */}
              {(()=>{
                // Timeline virality data (simulated 14-day campaign)
                const timelineData=[
                  {day:'1 Mar',reach:1200,engagement:180,sentiment:62,shares:45},
                  {day:'2 Mar',reach:2800,engagement:420,sentiment:68,shares:120},
                  {day:'3 Mar',reach:5400,engagement:810,sentiment:71,shares:290},
                  {day:'4 Mar',reach:12000,engagement:1800,sentiment:74,shares:680},
                  {day:'5 Mar',reach:28000,engagement:4200,sentiment:78,shares:1500},
                  {day:'6 Mar',reach:45000,engagement:6750,sentiment:82,shares:2800},
                  {day:'7 Mar',reach:68000,engagement:10200,sentiment:85,shares:4100},
                  {day:'8 Mar',reach:95000,engagement:14250,sentiment:83,shares:5600},
                  {day:'9 Mar',reach:142000,engagement:21300,sentiment:86,shares:8200},
                  {day:'10 Mar',reach:198000,engagement:29700,sentiment:88,shares:11400},
                  {day:'11 Mar',reach:265000,engagement:39750,sentiment:87,shares:15200},
                  {day:'12 Mar',reach:320000,engagement:48000,sentiment:89,shares:18600},
                  {day:'13 Mar',reach:380000,engagement:57000,sentiment:90,shares:21800},
                  {day:'14 Mar',reach:425000,engagement:63750,sentiment:91,shares:24500},
                ];
                const maxR=Math.max(...timelineData.map(d=>d.reach));
                const maxE=Math.max(...timelineData.map(d=>d.engagement));
                const toPath=(data,key,max,h)=>data.map((d,i)=>`${i===0?'M':'L'}${i*(460/(data.length-1))} ${h-((d[key]/max)*h)}`).join(' ');
                const toArea=(data,key,max,h)=>toPath(data,key,max,h)+` L${(data.length-1)*(460/(data.length-1))} ${h} L0 ${h} Z`;
                const latestReach=timelineData[timelineData.length-1].reach;
                const latestSentiment=timelineData[timelineData.length-1].sentiment;
                const totalEngagement=timelineData.reduce((s,d)=>s+d.engagement,0);
                const totalShares=timelineData.reduce((s,d)=>s+d.shares,0);
                const avgEngRate=((totalEngagement/timelineData.reduce((s,d)=>s+d.reach,0))*100).toFixed(1);

                // Platform breakdown for this mission
                const platBreakdown=[
                  {name:'TikTok',reach:'186K',engagement:'14.2%',posts:missionPosts.filter(p=>p.platform==='tiktok').length,sentiment:92,color:'#1A1A1A',trend:'+42%'},
                  {name:'Instagram',reach:'128K',engagement:'11.8%',posts:missionPosts.filter(p=>p.platform==='instagram').length,sentiment:88,color:'#E1306C',trend:'+28%'},
                  {name:'X (Twitter)',reach:'68K',engagement:'8.4%',posts:missionPosts.filter(p=>p.platform==='x').length,sentiment:85,color:'#1DA1F2',trend:'+15%'},
                  {name:'YouTube',reach:'43K',engagement:'6.2%',posts:0,sentiment:90,color:'#FF0000',trend:'+8%'},
                ];

                return(<>
                {/* Timeline Virality Chart */}
                <DCard title="Timeline Virality Kampanye" subtitle="Perkembangan reach & engagement 14 hari terakhir" accent={C.primary}>
                  <div style={{position:'relative',padding:'10px 0'}}>
                    {/* Legend */}
                    <div className="flex items-center gap-5 mb-4">
                      <div className="flex items-center gap-2"><div style={{width:14,height:3,borderRadius:2,background:C.primary}}/><span style={{fontSize:12,fontWeight:600,color:C.textMuted}}>Reach</span></div>
                      <div className="flex items-center gap-2"><div style={{width:14,height:3,borderRadius:2,background:C.green}}/><span style={{fontSize:12,fontWeight:600,color:C.textMuted}}>Engagement</span></div>
                      <div className="flex items-center gap-2"><div style={{width:14,height:3,borderRadius:2,background:C.purple}}/><span style={{fontSize:12,fontWeight:600,color:C.textMuted}}>Sentimen Positif</span></div>
                    </div>
                    <svg viewBox="0 0 480 180" style={{width:'100%',height:200}}>
                      {[0,45,90,135,180].map(y=><line key={y} x1="0" y1={y} x2="480" y2={y} stroke={C.border} strokeWidth="0.5" strokeDasharray="4 4"/>)}
                      <defs>
                        <linearGradient id="reachGradMD" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.primary} stopOpacity="0.25"/><stop offset="100%" stopColor={C.primary} stopOpacity="0.02"/></linearGradient>
                        <linearGradient id="engGradMD" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.green} stopOpacity="0.2"/><stop offset="100%" stopColor={C.green} stopOpacity="0.02"/></linearGradient>
                      </defs>
                      <path d={toArea(timelineData,'reach',maxR,168)} fill="url(#reachGradMD)"/>
                      <path d={toPath(timelineData,'reach',maxR,168)} fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d={toArea(timelineData,'engagement',maxR,168)} fill="url(#engGradMD)"/>
                      <path d={toPath(timelineData,'engagement',maxR,168)} fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d={timelineData.map((d,i)=>`${i===0?'M':'L'}${i*(460/(timelineData.length-1))} ${168-((d.sentiment/100)*168)}`).join(' ')} fill="none" stroke={C.purple} strokeWidth="1.5" strokeDasharray="5 3" strokeLinecap="round"/>
                      {timelineData.map((d,i)=><circle key={i} cx={i*(460/(timelineData.length-1))} cy={168-((d.reach/maxR)*168)} r="4" fill={C.primary} stroke={C.surface} strokeWidth="2"/>)}
                      {timelineData.filter((_,i)=>i%2===0).map((d,i)=><text key={i} x={i*2*(460/(timelineData.length-1))} y="178" style={{fontSize:10,fill:C.textMuted,fontFamily:"'JetBrains Mono'"}}>{d.day.split(' ')[0]}</text>)}
                    </svg>
                    <div style={{position:'absolute',top:10,right:0,display:'flex',flexDirection:'column',justifyContent:'space-between',height:150}}>
                      {['425K','320K','210K','100K','0'].map((l,i)=><span key={i} style={{fontSize:11,color:C.textMuted,fontFamily:"'JetBrains Mono'",textAlign:'right'}}>{l}</span>)}
                    </div>
                  </div>
                </DCard>

                {/* Key Campaign Metrics */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
                  {[
                    {label:'Total Reach',value:`${(latestReach/1000).toFixed(0)}K`,icon:'public',color:C.primary,sub:'kumulatif 14 hari',trend:'+256%'},
                    {label:'Sentimen Positif',value:`${latestSentiment}%`,icon:'sentiment_satisfied',color:C.green,sub:'rata-rata publik',trend:'+29pt'},
                    {label:'Engagement Rate',value:`${avgEngRate}%`,icon:'trending_up',color:C.orange,sub:'avg across platforms',trend:'+4.2pt'},
                    {label:'Total Shares',value:`${(totalShares/1000).toFixed(1)}K`,icon:'share',color:C.purple,sub:'organic spread',trend:'+180%'},
                  ].map((s,i)=>(
                    <DCard key={i} style={{padding:0}} accent={s.color}>
                      <div style={{padding:18,position:'relative'}}>
                        <div style={{position:'absolute',top:14,right:14,fontSize:11,fontWeight:700,color:C.green,background:C.greenLight,padding:'3px 8px',borderRadius:5}}>{s.trend}</div>
                        <MI name={s.icon} size={20} fill style={{color:s.color,display:'block',marginBottom:8}}/>
                        <p style={{fontSize:28,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono'",letterSpacing:-1}}>{s.value}</p>
                        <p style={{fontSize:13,color:C.textMuted,marginTop:4,fontWeight:500}}>{s.label}</p>
                        <p style={{fontSize:11,color:s.color,fontWeight:600,marginTop:4}}>{s.sub}</p>
                      </div>
                    </DCard>
                  ))}
                </div>

                {/* Platform Performance & Sentiment */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                  <DCard title="Performa per Platform" subtitle="Reach, engagement & sentimen positif" accent={C.primary}>
                    <div className="flex flex-col gap-3">
                      {platBreakdown.map((p,i)=>(
                        <div key={i} style={{padding:14,borderRadius:12,background:C.surfaceLight,border:`1px solid ${C.border}`,transition:'border-color 200ms'}} onMouseEnter={e=>e.currentTarget.style.borderColor=p.color+'55'} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                          <div className="flex items-center gap-3">
                            <div style={{width:36,height:36,borderRadius:10,background:`${p.color}12`,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${p.color}20`}}>
                              <SocialIcon platform={p.name==='X (Twitter)'?'x':p.name.toLowerCase()} size={16} color={p.color}/>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <p style={{fontSize:15,fontWeight:700,color:C.text}}>{p.name}</p>
                                <span style={{fontSize:11,fontWeight:700,color:C.green,background:C.greenLight,padding:'3px 8px',borderRadius:5}}>{p.trend}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span style={{fontSize:13,color:C.textSec}}>Reach: <b style={{color:C.text,fontFamily:"'JetBrains Mono'"}}>{p.reach}</b></span>
                                <span style={{fontSize:13,color:C.textSec}}>Eng: <b style={{color:C.green}}>{p.engagement}</b></span>
                                <span style={{fontSize:13,color:C.textSec}}>Posts: <b>{p.posts}</b></span>
                              </div>
                            </div>
                          </div>
                          {/* Sentiment bar */}
                          <div className="flex items-center gap-2 mt-2">
                            <span style={{fontSize:10,color:C.textMuted,width:55}}>Sentimen</span>
                            <div className="flex-1"><ProgressBar progress={p.sentiment/100} color={p.sentiment>=80?C.green:p.sentiment>=60?C.orange:C.red} height={5}/></div>
                            <span style={{fontSize:11,fontWeight:700,color:p.sentiment>=80?C.green:C.orange,fontFamily:"'JetBrains Mono'",width:32,textAlign:'right'}}>{p.sentiment}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </DCard>

                  {/* DISPENAD Insights & Recommendations */}
                  <DCard title="Insight & Rekomendasi DISPENAD" subtitle="Analisis AI dari data kampanye" accent={C.gold}>
                    <div className="flex flex-col gap-3">
                      {/* Sentiment Gauge */}
                      <div style={{textAlign:'center',padding:16,background:C.surfaceLight,borderRadius:12,border:`1px solid ${C.border}`}}>
                        <svg viewBox="0 0 120 70" style={{width:120,height:70,margin:'0 auto'}}>
                          <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke={C.overlay06} strokeWidth="10" strokeLinecap="round"/>
                          <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke={`url(#sentGrad)`} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${latestSentiment*1.57} 157`}/>
                          <defs><linearGradient id="sentGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={C.orange}/><stop offset="50%" stopColor={C.green}/><stop offset="100%" stopColor={C.teal}/></linearGradient></defs>
                          <text x="60" y="55" textAnchor="middle" style={{fontSize:22,fontWeight:800,fill:C.green,fontFamily:"'JetBrains Mono'"}}>{latestSentiment}%</text>
                          <text x="60" y="67" textAnchor="middle" style={{fontSize:8,fill:C.textMuted,fontWeight:600}}>SENTIMEN POSITIF</text>
                        </svg>
                      </div>

                      {/* Key Insights */}
                      {[
                        {icon:'trending_up',color:C.green,title:'Konten Viral Teridentifikasi',desc:'Video "POV Prajurit Nolong Nenek" mencapai 456K views — format storytelling emosional paling efektif untuk sentimen positif TNI AD.'},
                        {icon:'schedule',color:C.orange,title:'Peak Engagement: 18:00-21:00 WIB',desc:'Posting konten TNI AD di jam prime time menghasilkan 3.2x lebih banyak engagement. Rekomendasi: jadwalkan misi KONTEN di slot ini.'},
                        {icon:'group',color:C.purple,title:'Demografi Terjangkau: 18-34 Tahun',desc:'72% audience yang engage adalah usia 18-34. Segmen ini paling responsif terhadap konten behind-the-scenes dan challenge.'},
                        {icon:'lightbulb',color:C.gold,title:'Rekomendasi Misi Berikutnya',desc:'Buat misi KONTEN bertema "Prajurit & Keluarga" — konten humanis terbukti 4x lebih engaging dibanding konten alutsista formal.'},
                      ].map((insight,i)=>(
                        <div key={i} style={{padding:12,borderRadius:10,background:`${insight.color}08`,border:`1px solid ${insight.color}15`}}>
                          <div className="flex items-start gap-2">
                            <div style={{width:28,height:28,borderRadius:8,background:`${insight.color}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>
                              <MI name={insight.icon} size={14} fill style={{color:insight.color}}/>
                            </div>
                            <div>
                              <p style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:3}}>{insight.title}</p>
                              <p style={{fontSize:12,color:C.textSec,lineHeight:1.5}}>{insight.desc}</p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Share of Voice */}
                      <div style={{background:C.surfaceLight,borderRadius:12,padding:14,border:`1px solid ${C.border}`}}>
                        <p style={{fontSize:12,fontWeight:700,color:C.textMuted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:10}}>Share of Voice — TNI AD di Medsos</p>
                        <div className="flex items-center gap-3">
                          <div style={{flex:65,height:28,borderRadius:6,background:`linear-gradient(90deg,${C.green}88,${C.green})`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <span style={{fontSize:12,fontWeight:700,color:'white'}}>Positif 65%</span>
                          </div>
                          <div style={{flex:23,height:28,borderRadius:6,background:C.overlay15,display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <span style={{fontSize:11,fontWeight:600,color:C.textSec}}>Netral 23%</span>
                          </div>
                          <div style={{flex:12,height:28,borderRadius:6,background:`${C.red}30`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <span style={{fontSize:11,fontWeight:600,color:C.red}}>12%</span>
                          </div>
                        </div>
                        <p style={{fontSize:10,color:C.textMuted,marginTop:6}}>Sentimen positif naik <b style={{color:C.green}}>+12pt</b> sejak kampanye dimulai</p>
                      </div>
                    </div>
                  </DCard>
                </div>

                {/* Submissions Table (kept from original) */}
                <DCard title="Konten yang Disubmit" subtitle={`${missionPosts.length} submission untuk misi ini`}>
                  <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                      <thead>
                        <tr>{['Anggota','Platform','Konten','Views','Likes','Rate','Status','Aksi'].map(h=>(
                          <th key={h} style={{padding:'12px 14px',fontSize:12,fontWeight:700,color:C.textMuted,textAlign:'left',borderBottom:`1px solid ${C.border}`,textTransform:'uppercase',letterSpacing:0.5,whiteSpace:'nowrap'}}>{h}</th>
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
                                <AvatarImg initials={post.avatar} size={32} style={{borderRadius:8}}/>
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
                                <div className="flex gap-2">
                                  <button aria-label="Approve post" onClick={()=>showToast(`Postingan ${post.agent} disetujui!`)} className="tap-bounce" style={{minWidth:44,minHeight:44,borderRadius:10,border:'none',background:C.greenLight,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                    <MI name="check" size={18} style={{color:C.green}}/>
                                  </button>
                                  <button aria-label="Reject post" onClick={()=>showToast(`Postingan ${post.agent} ditolak`)} className="tap-bounce" style={{minWidth:44,minHeight:44,borderRadius:10,border:'none',background:C.redLight,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                    <MI name="close" size={18} style={{color:C.red}}/>
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

                {/* Registered Members */}
                <DCard title="Anggota Terdaftar" subtitle={`${registeredMembers.length} anggota belum upload konten`}>
                  <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                      <thead>
                        <tr>{['Anggota','Tier','Bergabung','Status','Aksi'].map(h=>(
                          <th key={h} style={{padding:'12px 14px',fontSize:12,fontWeight:700,color:C.textMuted,textAlign:'left',borderBottom:`1px solid ${C.border}`,textTransform:'uppercase',letterSpacing:0.5,whiteSpace:'nowrap'}}>{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody>
                        {registeredMembers.map((mem,i)=>(
                          <tr key={i} style={{borderBottom:`1px solid ${C.borderLight}`}}>
                            <td style={{padding:'12px'}}>
                              <div className="flex items-center gap-2">
                                <AvatarImg initials={mem.avatar} size={32} style={{borderRadius:8}}/>
                                <span style={{fontSize:13,fontWeight:600,color:C.text}}>{mem.agent}</span>
                              </div>
                            </td>
                            <td style={{padding:'12px'}}><span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:4,background:mem.tier==='Gold'?C.goldLight:mem.tier==='Silver'?C.surfaceLight:C.orangeLight,color:mem.tier==='Gold'?C.gold:mem.tier==='Silver'?C.textSec:C.orange}}>{mem.tier}</span></td>
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
                </>);
              })()}
            </div>);
          })()}

          {/* ═══ BROADCAST / NOTIFICATION ═══ */}
          {adSideTab==='broadcast'&&(<div className="flex flex-col gap-5">
            {/* ── Compose New Broadcast ── */}
            <DCard title="Kirim Broadcast Baru" subtitle="Buat dan kirim notifikasi ke personel" accent={C.primary}>
              {(()=>{
                const [bcTarget,setBcTarget]=React.useState({semua:true,prajurit:false,suami:false,istri:false,anak:false});
                const [bcKodam,setBcKodam]=React.useState('Semua Kodam');
                const [bcSubject,setBcSubject]=React.useState('');
                const [bcMessage,setBcMessage]=React.useState('');
                const [bcPriority,setBcPriority]=React.useState('normal');
                const [bcChannels,setBcChannels]=React.useState({push:true,inapp:true,whatsapp:false});
                const kodamOptions=['Semua Kodam','Kodam I/BB','Kodam II/SWJ','Kodam III/SLW','Kodam IV/DIP','Kodam V/BRW','Kodam VI/MLW','Kodam IX/UDY','Kodam XII/TPR','Kodam XIV/HSN','Kodam XVI/PTI','Kodam XVII/CEN','Kodam XVIII/KST'];
                const toggleTarget=(k)=>{
                  if(k==='semua'){setBcTarget({semua:true,prajurit:false,suami:false,istri:false,anak:false});}
                  else{setBcTarget(prev=>({...prev,semua:false,[k]:!prev[k]}));}
                };
                const toggleChannel=(k)=>setBcChannels(prev=>({...prev,[k]:!prev[k]}));
                const targetCount=bcTarget.semua?445200:(bcTarget.prajurit?400000:0)+(bcTarget.istri?25000:0)+(bcTarget.suami?12000:0)+(bcTarget.anak?8200:0);
                const activeChannels=[bcChannels.push&&'Push',bcChannels.inapp&&'In-App',bcChannels.whatsapp&&'WhatsApp'].filter(Boolean);
                return(
                <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:24}}>
                  <div className="flex flex-col gap-4">
                    {/* Target Audience */}
                    <div>
                      <label style={{fontSize:12,fontWeight:700,color:C.textSec,textTransform:'uppercase',letterSpacing:1,marginBottom:8,display:'block'}}>Target Audience</label>
                      <div className="flex flex-wrap gap-2">
                        {[{k:'semua',l:'Semua'},{k:'prajurit',l:'Prajurit'},{k:'suami',l:'Suami'},{k:'istri',l:'Istri'},{k:'anak',l:'Anak'}].map(t=>(
                          <button key={t.k} onClick={()=>toggleTarget(t.k)} style={{padding:'6px 14px',borderRadius:8,fontSize:12,fontWeight:700,border:`1.5px solid ${bcTarget[t.k]?C.primary:C.border}`,background:bcTarget[t.k]?`${C.primary}15`:'transparent',color:bcTarget[t.k]?C.primary:C.textMuted,cursor:'pointer',transition:'all 200ms',display:'flex',alignItems:'center',gap:4}}>
                            <MI name={bcTarget[t.k]?'check_box':'check_box_outline_blank'} size={14}/>{t.l}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Kodam Filter */}
                    <div>
                      <label style={{fontSize:12,fontWeight:700,color:C.textSec,textTransform:'uppercase',letterSpacing:1,marginBottom:8,display:'block'}}>Kodam</label>
                      <select value={bcKodam} onChange={e=>setBcKodam(e.target.value)} style={{width:'100%',padding:'10px 14px',borderRadius:10,border:`1.5px solid ${C.border}`,background:C.surfaceLight,color:C.text,fontSize:13,fontWeight:600,outline:'none',cursor:'pointer'}}>
                        {kodamOptions.map(k=><option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                    {/* Subject */}
                    <div>
                      <label style={{fontSize:12,fontWeight:700,color:C.textSec,textTransform:'uppercase',letterSpacing:1,marginBottom:8,display:'block'}}>Judul</label>
                      <input value={bcSubject} onChange={e=>setBcSubject(e.target.value)} placeholder="Masukkan judul broadcast..." style={{width:'100%',padding:'10px 14px',borderRadius:10,border:`1.5px solid ${C.border}`,background:C.surfaceLight,color:C.text,fontSize:13,fontWeight:600,outline:'none',boxSizing:'border-box'}}/>
                    </div>
                    {/* Message Body */}
                    <div>
                      <label style={{fontSize:12,fontWeight:700,color:C.textSec,textTransform:'uppercase',letterSpacing:1,marginBottom:8,display:'block'}}>Pesan</label>
                      <textarea value={bcMessage} onChange={e=>setBcMessage(e.target.value)} placeholder="Tulis pesan broadcast..." rows={5} style={{width:'100%',padding:'10px 14px',borderRadius:10,border:`1.5px solid ${C.border}`,background:C.surfaceLight,color:C.text,fontSize:13,fontWeight:600,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}/>
                    </div>
                    {/* Priority */}
                    <div>
                      <label style={{fontSize:12,fontWeight:700,color:C.textSec,textTransform:'uppercase',letterSpacing:1,marginBottom:8,display:'block'}}>Prioritas</label>
                      <div className="flex gap-2">
                        {[{k:'normal',l:'Normal',c:C.green},{k:'urgent',l:'Urgent',c:C.red}].map(p=>(
                          <button key={p.k} onClick={()=>setBcPriority(p.k)} style={{padding:'8px 20px',borderRadius:8,fontSize:12,fontWeight:700,border:`1.5px solid ${bcPriority===p.k?p.c:C.border}`,background:bcPriority===p.k?`${p.c}15`:'transparent',color:bcPriority===p.k?p.c:C.textMuted,cursor:'pointer',transition:'all 200ms'}}>
                            {p.l}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Channel */}
                    <div>
                      <label style={{fontSize:12,fontWeight:700,color:C.textSec,textTransform:'uppercase',letterSpacing:1,marginBottom:8,display:'block'}}>Channel</label>
                      <div className="flex flex-wrap gap-2">
                        {[{k:'push',l:'Push Notification',icon:'notifications'},{k:'inapp',l:'In-App',icon:'smartphone'},{k:'whatsapp',l:'WhatsApp',icon:'chat'}].map(ch=>(
                          <button key={ch.k} onClick={()=>toggleChannel(ch.k)} style={{padding:'6px 14px',borderRadius:8,fontSize:12,fontWeight:700,border:`1.5px solid ${bcChannels[ch.k]?C.primary:C.border}`,background:bcChannels[ch.k]?`${C.primary}15`:'transparent',color:bcChannels[ch.k]?C.primary:C.textMuted,cursor:'pointer',transition:'all 200ms',display:'flex',alignItems:'center',gap:4}}>
                            <MI name={ch.icon} size={14}/>{ch.l}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Send Button */}
                    <button onClick={()=>{if(!bcSubject.trim()||!bcMessage.trim()){showToast('Judul dan pesan wajib diisi');return;}showToast(`Broadcast berhasil dikirim ke ${targetCount.toLocaleString('id-ID')} personel`);setBcSubject('');setBcMessage('');}} style={{padding:'12px 24px',borderRadius:12,background:`linear-gradient(135deg,${C.primary},${C.primaryDark||C.primary})`,color:'#fff',fontSize:14,fontWeight:700,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginTop:4,transition:'all 200ms'}}>
                      <MI name="send" size={18}/>Kirim Broadcast
                    </button>
                  </div>
                  {/* Preview Card */}
                  <div>
                    <label style={{fontSize:12,fontWeight:700,color:C.textSec,textTransform:'uppercase',letterSpacing:1,marginBottom:8,display:'block'}}>Preview Notifikasi</label>
                    <div style={{background:C.surfaceLight,borderRadius:14,border:`1px solid ${C.border}`,padding:16,display:'flex',flexDirection:'column',gap:10}}>
                      <div style={{background:C.surface,borderRadius:12,padding:14,border:`1px solid ${C.borderLight}`,boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}>
                        <div className="flex items-center gap-2" style={{marginBottom:8}}>
                          <div style={{width:28,height:28,borderRadius:8,background:`${C.primary}20`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <MI name="campaign" size={16} style={{color:C.primary}}/>
                          </div>
                          <div style={{flex:1}}>
                            <p style={{fontSize:11,fontWeight:700,color:C.primary}}>GERAK SINAR</p>
                            <p style={{fontSize:10,color:C.textMuted}}>Sekarang</p>
                          </div>
                          {bcPriority==='urgent'&&<span style={{fontSize:9,fontWeight:800,color:C.red,background:`${C.red}15`,padding:'2px 6px',borderRadius:4}}>URGENT</span>}
                        </div>
                        <p style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:4}}>{bcSubject||'Judul Broadcast'}</p>
                        <p style={{fontSize:12,color:C.textSec,lineHeight:1.4}}>{bcMessage||'Isi pesan broadcast akan ditampilkan di sini...'}</p>
                      </div>
                      <div className="flex flex-wrap gap-1" style={{marginTop:4}}>
                        {activeChannels.map(ch=>(
                          <span key={ch} style={{fontSize:10,fontWeight:700,color:C.primary,background:`${C.primary}10`,padding:'2px 8px',borderRadius:4}}>{ch}</span>
                        ))}
                      </div>
                      <div style={{fontSize:11,color:C.textMuted,display:'flex',alignItems:'center',gap:4,marginTop:2}}>
                        <MI name="group" size={14}/>{targetCount.toLocaleString('id-ID')} penerima
                        {bcKodam!=='Semua Kodam'&&<span style={{marginLeft:4}}>• {bcKodam}</span>}
                      </div>
                    </div>
                  </div>
                </div>
                );
              })()}
            </DCard>

            {/* ── Riwayat Broadcast ── */}
            <DCard title="Riwayat Broadcast" subtitle="History pengiriman broadcast & notifikasi">
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                  <thead>
                    <tr style={{borderBottom:`2px solid ${C.border}`}}>
                      {['Tanggal','Judul','Target','Channel','Terkirim','Dibaca','Status'].map(h=>(
                        <th key={h} style={{textAlign:'left',padding:'10px 12px',fontSize:11,fontWeight:700,color:C.textMuted,textTransform:'uppercase',letterSpacing:0.5}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {date:'14 Mar 2026',title:'Misi Baru: HUT TNI AD ke-81',target:'Semua',channel:'Push + In-App',sent:'445K',read:'312K (70%)',status:'Terkirim'},
                      {date:'12 Mar 2026',title:'Reminder: Deadline Upload Konten',target:'Prajurit',channel:'Push',sent:'400K',read:'280K (70%)',status:'Terkirim'},
                      {date:'10 Mar 2026',title:'Update Fitur: Toko Poin Baru',target:'Semua',channel:'In-App + WhatsApp',sent:'445K',read:'356K (80%)',status:'Terkirim'},
                      {date:'7 Mar 2026',title:'Peringatan: Konten Hoax Terdeteksi',target:'Prajurit + Istri',channel:'Push + In-App',sent:'425K',read:'382K (90%)',status:'Terkirim'},
                      {date:'5 Mar 2026',title:'Promo XP Ganda Akhir Pekan',target:'Semua',channel:'Push + In-App + WA',sent:'445K',read:'267K (60%)',status:'Terkirim'},
                    ].map((r,i)=>(
                      <tr key={i} style={{borderBottom:`1px solid ${C.borderLight}`,transition:'background 200ms'}} onMouseEnter={e=>e.currentTarget.style.background=C.surfaceLight} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{padding:'12px',color:C.textMuted,fontSize:12,fontWeight:600}}>{r.date}</td>
                        <td style={{padding:'12px',color:C.text,fontWeight:700}}>{r.title}</td>
                        <td style={{padding:'12px'}}><span style={{fontSize:11,fontWeight:700,color:C.primary,background:`${C.primary}10`,padding:'2px 8px',borderRadius:4}}>{r.target}</span></td>
                        <td style={{padding:'12px',color:C.textSec,fontSize:12,fontWeight:600}}>{r.channel}</td>
                        <td style={{padding:'12px',color:C.text,fontWeight:700,fontFamily:"'JetBrains Mono'"}}>{r.sent}</td>
                        <td style={{padding:'12px',color:C.green,fontWeight:700,fontFamily:"'JetBrains Mono'"}}>{r.read}</td>
                        <td style={{padding:'12px'}}><span style={{fontSize:11,fontWeight:700,color:C.green,background:`${C.green}15`,padding:'3px 10px',borderRadius:6}}>{r.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DCard>
          </div>)}

          {/* ═══ SETTINGS PAGE ═══ */}
          {adSideTab==='settings'&&(<div className="flex flex-col gap-5">

            {/* A. Default XP per Tipe Misi */}
            <DCard title="Default XP per Tipe Misi" subtitle="Atur XP dasar dan bonus untuk setiap tipe misi" accent={C.primary}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(1,1fr)',gap:12}}>
                {Object.entries(settingsXP).map(([type,val])=>{
                  const colors={EVENT:'#E76F51',KONTEN:'#2A9D8F',ENGAGEMENT:'#E9C46A',EDUKASI:'#264653',AKSI:'#F4A261'};
                  const icons={EVENT:'event',KONTEN:'edit_note',ENGAGEMENT:'thumb_up',EDUKASI:'school',AKSI:'flash_on'};
                  return(
                    <div key={type} style={{display:'flex',alignItems:'center',gap:16,padding:'14px 16px',borderRadius:12,background:C.surfaceAlt||'rgba(255,255,255,0.02)',border:`1px solid ${C.borderLight}`}}>
                      <div style={{width:40,height:40,borderRadius:10,background:`${colors[type]}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <MI name={icons[type]} size={20} fill style={{color:colors[type]}}/>
                      </div>
                      <div style={{flex:1}}>
                        <span style={{fontSize:14,fontWeight:700,color:C.text}}>{type}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end" style={{gap:2}}>
                          <label style={{fontSize:10,color:C.textMuted,fontWeight:600}}>Base XP</label>
                          <input type="number" value={val.base} onChange={e=>setSettingsXP(p=>({...p,[type]:{...p[type],base:parseInt(e.target.value)||0}}))}
                            style={{width:80,padding:'6px 10px',borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontSize:14,fontWeight:700,fontFamily:"'JetBrains Mono'",textAlign:'right'}}/>
                        </div>
                        <div className="flex flex-col items-end" style={{gap:2}}>
                          <label style={{fontSize:10,color:C.textMuted,fontWeight:600}}>Bonus XP</label>
                          <input type="number" value={val.bonus} onChange={e=>setSettingsXP(p=>({...p,[type]:{...p[type],bonus:parseInt(e.target.value)||0}}))}
                            style={{width:80,padding:'6px 10px',borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontSize:14,fontWeight:700,fontFamily:"'JetBrains Mono'",textAlign:'right'}}/>
                        </div>
                        <span style={{fontSize:12,color:colors[type],fontWeight:700,minWidth:70,textAlign:'right'}}>{val.base+val.bonus} Total</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </DCard>

            {/* B. Platform Aktif */}
            <DCard title="Platform Aktif" subtitle="Aktifkan atau nonaktifkan platform yang tersedia untuk misi" accent="#2A9D8F">
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}}>
                {Object.entries(settingsPlatforms).map(([platform,active])=>{
                  const pIcons={Instagram:'photo_camera',TikTok:'music_note',YouTube:'play_circle',
                    'X (Twitter)':'tag',Facebook:'people',WhatsApp:'chat',Telegram:'send'};
                  const pColors={Instagram:'#E1306C',TikTok:'#00F2EA',YouTube:'#FF0000',
                    'X (Twitter)':'#1DA1F2',Facebook:'#1877F2',WhatsApp:'#25D366',Telegram:'#0088cc'};
                  return(
                    <div key={platform} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderRadius:12,background:active?`${pColors[platform]}08`:C.surfaceAlt||'rgba(255,255,255,0.02)',border:`1px solid ${active?`${pColors[platform]}22`:C.borderLight}`,transition:'all 200ms'}}>
                      <div style={{width:36,height:36,borderRadius:10,background:`${pColors[platform]}18`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <MI name={pIcons[platform]} size={18} style={{color:pColors[platform]}}/>
                      </div>
                      <div style={{flex:1}}>
                        <span style={{fontSize:13,fontWeight:700,color:C.text}}>{platform}</span>
                        <p style={{fontSize:11,color:active?pColors[platform]:C.textMuted,fontWeight:600,marginTop:2}}>{active?'Aktif':'Nonaktif'}</p>
                      </div>
                      <button onClick={()=>setSettingsPlatforms(p=>({...p,[platform]:!p[platform]}))}
                        style={{width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',position:'relative',transition:'all 200ms',
                          background:active?pColors[platform]:'rgba(255,255,255,0.1)'}}>
                        <div style={{width:18,height:18,borderRadius:9,background:'#fff',position:'absolute',top:3,
                          left:active?23:3,transition:'left 200ms',boxShadow:'0 1px 3px rgba(0,0,0,0.3)'}}/>
                      </button>
                    </div>
                  );
                })}
              </div>
            </DCard>

            {/* C. Pengaturan Notifikasi */}
            <DCard title="Pengaturan Notifikasi" subtitle="Kelola notifikasi sistem dan laporan otomatis" accent="#E9C46A">
              <div className="flex flex-col" style={{gap:12}}>
                {[
                  {key:'newMission',label:'Notifikasi misi baru',desc:'Terima notifikasi saat misi baru dibuat',icon:'notifications_active'},
                  {key:'deadline',label:'Reminder deadline misi',desc:'Pengingat otomatis sebelum deadline misi berakhir',icon:'alarm'},
                  {key:'submission',label:'Notifikasi submisi masuk',desc:'Terima notifikasi saat ada submisi baru untuk di-review',icon:'mark_email_unread'},
                  {key:'weeklyReport',label:'Laporan mingguan otomatis',desc:'Kirim ringkasan performa mingguan ke email admin',icon:'summarize'},
                ].map(n=>(
                  <div key={n.key} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderRadius:12,background:C.surfaceAlt||'rgba(255,255,255,0.02)',border:`1px solid ${C.borderLight}`}}>
                    <div style={{width:40,height:40,borderRadius:10,background:'rgba(233,196,74,0.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <MI name={n.icon} size={20} style={{color:'#E9C46A'}}/>
                    </div>
                    <div style={{flex:1}}>
                      <span style={{fontSize:13,fontWeight:700,color:C.text}}>{n.label}</span>
                      <p style={{fontSize:11,color:C.textMuted,marginTop:2}}>{n.desc}</p>
                    </div>
                    <button onClick={()=>setSettingsNotif(p=>({...p,[n.key]:!p[n.key]}))}
                      style={{width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',position:'relative',transition:'all 200ms',
                        background:settingsNotif[n.key]?C.primary:'rgba(255,255,255,0.1)'}}>
                      <div style={{width:18,height:18,borderRadius:9,background:'#fff',position:'absolute',top:3,
                        left:settingsNotif[n.key]?23:3,transition:'left 200ms',boxShadow:'0 1px 3px rgba(0,0,0,0.3)'}}/>
                    </button>
                  </div>
                ))}
              </div>
            </DCard>

            {/* D. Informasi Sistem */}
            <DCard title="Informasi Sistem" subtitle="Detail versi dan statistik platform SINAR" accent={C.gold||'#B8860B'}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}}>
                {[
                  {label:'Versi',value:'SINAR v1.0.0',icon:'verified',color:C.primary},
                  {label:'Total Kodam',value:'37',icon:'account_balance',color:'#E76F51'},
                  {label:'Total Personel Terdaftar',value:'445.067',icon:'groups',color:'#2A9D8F'},
                  {label:'Terakhir Diperbarui',value:'15 Maret 2026',icon:'update',color:'#E9C46A'},
                ].map((info,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'16px',borderRadius:12,background:C.surfaceAlt||'rgba(255,255,255,0.02)',border:`1px solid ${C.borderLight}`}}>
                    <div style={{width:42,height:42,borderRadius:12,background:`${info.color}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <MI name={info.icon} size={22} style={{color:info.color}}/>
                    </div>
                    <div>
                      <p style={{fontSize:11,color:C.textMuted,fontWeight:600,marginBottom:4}}>{info.label}</p>
                      <p style={{fontSize:16,fontWeight:800,color:C.text,fontFamily:i===2||i===1?"'JetBrains Mono'":'inherit'}}>{info.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </DCard>

            {/* Save Button */}
            <div className="flex justify-end" style={{gap:12}}>
              <button onClick={()=>showToast('Pengaturan berhasil disimpan!')} style={{
                padding:'12px 32px',borderRadius:12,border:'none',cursor:'pointer',fontSize:14,fontWeight:700,
                background:`linear-gradient(135deg,${C.primary},#1a5e30)`,color:'#fff',
                display:'flex',alignItems:'center',gap:8,boxShadow:`0 4px 16px ${C.primary}33`,
                transition:'all 200ms',
              }} onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'} onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}>
                <MI name="save" size={18}/> Simpan Pengaturan
              </button>
            </div>

          </div>)}

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

  /* ─── MODE: PRESENTATION ──────────────────────────────────────── */
  function PresentationMode(){

    const [phase,setPhase]=useState(0); // 0=black, 1=quote, 2=logo reveal, 3=tagline, 4=done
    const [slide,setSlide]=useState(-1); // -1=splash
    const [demoPhase,setDemoPhase]=useState(0); // for slide 6: 0=phone, 1=mission taken, 2=zoom out social, 3=admin dashboard
    const [adminPage,setAdminPage]=useState(0); // for slide 17: cycling admin pages
    const [ytLikes,setYtLikes]=useState(180000);
    const [ytComments,setYtComments]=useState(45000);
    const [postCount,setPostCount]=useState(89);

    useEffect(()=>{
      const timers=[];
      timers.push(setTimeout(()=>setPhase(1),600));   // quote fades in
      timers.push(setTimeout(()=>setPhase(2),4500));   // logo starts
      timers.push(setTimeout(()=>setPhase(3),6500));   // tagline
      timers.push(setTimeout(()=>setPhase(4),9000));   // ready
      return()=>timers.forEach(clearTimeout);
    },[]);

    const TOTAL_SLIDES=13; // slides 0-12
    const [subStep,setSubStep]=useState(0);
    // Slides with progressive reveal: slide index -> number of sub-steps
    // Slide 3: 5 workflow steps, Slide 6: 2 demo phases (send→mobilize→impact)
    const SLIDE_SUBSTEPS=useMemo(()=>({}),[]);  // no interactive substeps — all Remotion now

    const nextSlide=useCallback(()=>{
      const maxSub=SLIDE_SUBSTEPS[slide]||0;
      if(subStep<maxSub){setSubStep(s=>s+1);}
      else{setSlide(s=>Math.min(s+1,TOTAL_SLIDES-1));setSubStep(0);setDemoPhase(0);setAdminPage(0);}
    },[slide,subStep,SLIDE_SUBSTEPS]);
    const prevSlide=useCallback(()=>{
      if(subStep>0){setSubStep(s=>s-1);}
      else{
        const prev=Math.max(slide-1,0);
        setSlide(prev);setSubStep(SLIDE_SUBSTEPS[prev]||0);setDemoPhase(0);setAdminPage(0);
      }
    },[slide,subStep,SLIDE_SUBSTEPS]);
    const goFullscreen=useCallback(()=>{const d=document.documentElement;if(d.requestFullscreen)d.requestFullscreen();else if(d.webkitRequestFullscreen)d.webkitRequestFullscreen();},[]);

    // Auto-cycle admin dashboard pages on admin CC slide
    useEffect(()=>{
      if(slide!==9)return;
      const iv=setInterval(()=>setAdminPage(p=>(p+1)%4),3500);
      return()=>clearInterval(iv);
    },[slide]);

    // Touch/swipe support
    const touchRef=useRef({x:0,y:0,t:0});
    useEffect(()=>{
      const ts=e=>{touchRef.current={x:e.touches[0].clientX,y:e.touches[0].clientY,t:Date.now()};};
      const te=e=>{
        const dx=e.changedTouches[0].clientX-touchRef.current.x;
        const dy=e.changedTouches[0].clientY-touchRef.current.y;
        const dt=Date.now()-touchRef.current.t;
        if(dt>500||Math.abs(dx)<50||Math.abs(dy)>Math.abs(dx))return;
        if(slide===-1){if(dx<0&&phase>=4)setSlide(0);return;}
        if(dx<-50)nextSlide();
        if(dx>50)prevSlide();
      };
      window.addEventListener('touchstart',ts,{passive:true});
      window.addEventListener('touchend',te,{passive:true});
      return()=>{window.removeEventListener('touchstart',ts);window.removeEventListener('touchend',te);};
    },[slide,phase,nextSlide,prevSlide]);

    // Keyboard controls
    useEffect(()=>{
      const h=e=>{
        if(e.key==='Escape'){if(slide>=0)setSlide(-1);else setMode('member');return;}
        if(e.key==='f'||e.key==='F'){goFullscreen();return;}
        if(slide===-1){
          if(phase<4&&(e.key===' '||e.key==='Enter')){setPhase(4);e.preventDefault();return;}
          if(phase===4&&(e.key===' '||e.key==='Enter'||e.key==='ArrowRight')){setSlide(0);e.preventDefault();}
          return;
        }
        if(e.key==='ArrowRight'||e.key===' '||e.key==='Enter'||e.key==='PageDown'){nextSlide();e.preventDefault();}
        if(e.key==='ArrowLeft'||e.key==='Backspace'||e.key==='PageUp'){prevSlide();e.preventDefault();}
        if(e.key==='Home'){setSlide(0);setSubStep(0);e.preventDefault();}
        if(e.key==='End'){setSlide(TOTAL_SLIDES-1);setSubStep(0);e.preventDefault();}
      };
      window.addEventListener('keydown',h);
      return()=>window.removeEventListener('keydown',h);
    },[phase,slide,nextSlide,prevSlide,goFullscreen]);

    const fadeIn=(active,delay=0)=>useSpring({opacity:active?1:0,transform:active?'translateY(0px)':'translateY(20px)',config:{tension:80,friction:20},delay});
    const scaleIn=(active,delay=0)=>useSpring({opacity:active?1:0,transform:active?'scale(1)':'scale(0.7)',config:{tension:100,friction:18},delay});

    const quoteAnim=fadeIn(phase>=1,0);
    const quoteFade=useSpring({opacity:phase>=2?0:1,config:{duration:800}});
    const logoAnim=scaleIn(phase>=2,0);
    const titleAnim=fadeIn(phase>=2,400);
    const taglineAnim=fadeIn(phase>=3,0);
    const subAnim=fadeIn(phase>=3,300);
    const ctaAnim=fadeIn(phase>=4,200);

    // Particles
    const particles=useMemo(()=>Array.from({length:30},(_,i)=>({
      id:i,x:Math.random()*100,y:Math.random()*100,s:Math.random()*3+1,
      d:Math.random()*20+10,dx:Math.random()*40-20,
    })),[]);

    // Background image slideshow
    const splashImages=['/images/splash-hero-soldiers.png','/images/splash-hero-humanitarian.png','/images/splash-hero-portrait.png','/images/splash-hero-action.png'];
    const [bgIdx,setBgIdx]=useState(0);
    useEffect(()=>{if(slide!==-1)return;const iv=setInterval(()=>setBgIdx(i=>(i+1)%splashImages.length),4000);return()=>clearInterval(iv);},[slide]);

    const renderSplash=()=>{

    return(
    <div style={{position:'fixed',inset:0,zIndex:9999,background:'#030806',overflow:'hidden',cursor:'default',fontFamily:"'Inter',sans-serif"}}>

      {/* Cinematic background photo slideshow */}
      {splashImages.map((src,i)=>(
        <div key={i} style={{
          position:'absolute',inset:0,transition:'opacity 2s ease-in-out',
          opacity:bgIdx===i?1:0,
        }}>
          <img src={src} alt="" style={{width:'100%',height:'100%',objectFit:'cover',filter:'brightness(0.3) contrast(1.3) saturate(0.7)',transform:'scale(1.05)',transition:'transform 8s ease-out'}}/>
        </div>
      ))}

      {/* Heavy gradient overlays for cinematic depth */}
      <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(3,8,6,0.6) 0%,rgba(3,8,6,0.3) 35%,rgba(3,8,6,0.5) 65%,rgba(3,8,6,0.9) 100%)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 70% 50% at 50% 50%,transparent 30%,rgba(3,8,6,0.7) 100%)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 40% 30% at 50% 50%,rgba(184,134,11,0.04),transparent 70%)',pointerEvents:'none'}}/>

      {/* Luxury gold border frame */}
      <div style={{position:'absolute',inset:20,border:'1px solid rgba(184,134,11,0.12)',borderRadius:4,pointerEvents:'none',zIndex:5}}/>
      {/* Top/bottom accent lines */}
      <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent 5%,rgba(184,134,11,0.4) 30%,rgba(139,26,26,0.5) 50%,rgba(184,134,11,0.4) 70%,transparent 95%)',zIndex:6}}/>
      <div style={{position:'absolute',bottom:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent 5%,rgba(184,134,11,0.4) 30%,rgba(139,26,26,0.5) 50%,rgba(184,134,11,0.4) 70%,transparent 95%)',zIndex:6}}/>

      {/* Ambient particles */}
      {particles.map(p=>(
        <div key={p.id} style={{
          position:'absolute',left:`${p.x}%`,top:`${p.y}%`,width:p.s,height:p.s,
          borderRadius:'50%',background:'rgba(184,134,11,0.25)',
          animation:`float-particle ${p.d}s ease-in-out infinite`,
          animationDelay:`${-p.d*Math.random()}s`,zIndex:3,
        }}/>
      ))}

      {/* Content */}
      <div style={{position:'relative',zIndex:10,width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>

        {/* Phase 1: Emotional Quote */}
        <animated.div style={{...quoteAnim,...quoteFade,position:'absolute',textAlign:'center',maxWidth:750,padding:'0 48px'}}>
          <div style={{fontSize:10,fontWeight:700,color:'rgba(184,134,11,0.5)',letterSpacing:6,textTransform:'uppercase',marginBottom:24}}>TENTARA NASIONAL INDONESIA — ANGKATAN DARAT</div>
          <p style={{fontSize:32,fontWeight:300,color:'rgba(255,255,255,0.92)',lineHeight:1.7,fontStyle:'italic',letterSpacing:0.5}}>
            "Di setiap bencana, kami hadir pertama.<br/>
            Di setiap ancaman, kami berdiri terdepan.<br/>
            <span style={{color:'#D4A843',fontWeight:600}}>Kami adalah prajurit rakyat.</span>"
          </p>
          <div style={{width:80,height:1,background:'linear-gradient(90deg,transparent,#B8860B,transparent)',margin:'28px auto 20px'}}/>
          <p style={{fontSize:14,color:'rgba(255,255,255,0.35)',letterSpacing:4,fontWeight:600}}>400.000 PRAJURIT &nbsp;·&nbsp; SATU TEKAD</p>
        </animated.div>

        {/* Phase 2+: Luxury Logo Reveal */}
        <animated.div style={{...logoAnim,marginBottom:20}}>
          <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'center'}}>
            {/* Outer decorative rings */}
            <div style={{position:'absolute',width:180,height:180,borderRadius:'50%',border:'1px solid rgba(184,134,11,0.1)',animation:'pulse-glow 5s ease-in-out infinite'}}/>
            <div style={{position:'absolute',width:150,height:150,borderRadius:'50%',border:'1px solid rgba(184,134,11,0.06)'}}/>
            {/* Golden glow */}
            <div style={{position:'absolute',width:200,height:200,borderRadius:'50%',background:'radial-gradient(circle,rgba(184,134,11,0.1),transparent 70%)',filter:'blur(20px)'}}/>
            <SinarMark size={phase>=2?110:0}/>
          </div>
        </animated.div>

        <animated.div style={titleAnim}>
          <div style={{textAlign:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:16,justifyContent:'center',marginBottom:8}}>
              <div style={{width:50,height:1,background:'linear-gradient(90deg,transparent,rgba(184,134,11,0.5))'}}/>
              <span style={{fontSize:9,fontWeight:700,color:'rgba(184,134,11,0.45)',letterSpacing:5}}>TNI AD MEMPERSEMBAHKAN</span>
              <div style={{width:50,height:1,background:'linear-gradient(90deg,rgba(184,134,11,0.5),transparent)'}}/>
            </div>
            <h1 style={{fontSize:72,fontWeight:900,color:'#FFFFFF',letterSpacing:18,lineHeight:1,textShadow:'0 4px 60px rgba(184,134,11,0.25), 0 0 120px rgba(184,134,11,0.1)'}}>SINAR</h1>
          </div>
        </animated.div>

        <animated.div style={taglineAnim}>
          <p style={{fontSize:16,fontWeight:600,color:'#D4A843',letterSpacing:6,textTransform:'uppercase',marginTop:14,textAlign:'center'}}>
            Sistem Informasi Narasi Aktif Rakyat
          </p>
        </animated.div>

        <animated.div style={subAnim}>
          <div style={{display:'flex',alignItems:'center',gap:14,marginTop:24}}>
            <div style={{width:50,height:1,background:'linear-gradient(90deg,transparent,rgba(139,26,26,0.4))'}}/>
            <p style={{fontSize:11,color:'rgba(255,255,255,0.3)',letterSpacing:4,fontWeight:500}}>TNI AD</p>
            <div style={{width:50,height:1,background:'linear-gradient(90deg,rgba(139,26,26,0.4),transparent)'}}/>
          </div>
        </animated.div>

        <animated.div style={ctaAnim}>
          <button onClick={()=>setSlide(0)} style={{
            marginTop:56,padding:'16px 48px',borderRadius:4,
            border:'1px solid rgba(184,134,11,0.35)',
            background:'linear-gradient(135deg,rgba(184,134,11,0.12),rgba(139,26,26,0.08))',
            color:'#D4A843',fontSize:12,fontWeight:700,letterSpacing:4,cursor:'pointer',
            textTransform:'uppercase',backdropFilter:'blur(12px)',
            transition:'all 400ms ease',
          }} onMouseEnter={e=>{e.target.style.background='linear-gradient(135deg,rgba(184,134,11,0.25),rgba(139,26,26,0.15))';e.target.style.borderColor='rgba(184,134,11,0.5)';e.target.style.transform='scale(1.03)';e.target.style.boxShadow='0 0 40px rgba(184,134,11,0.15)'}}
             onMouseLeave={e=>{e.target.style.background='linear-gradient(135deg,rgba(184,134,11,0.12),rgba(139,26,26,0.08))';e.target.style.borderColor='rgba(184,134,11,0.35)';e.target.style.transform='scale(1)';e.target.style.boxShadow='none'}}>
            MULAI PRESENTASI &nbsp;→
          </button>
          <p style={{fontSize:9,color:'rgba(255,255,255,0.18)',marginTop:20,textAlign:'center',letterSpacing:2}}>TEKAN SPACE ATAU ENTER UNTUK MELANJUTKAN</p>
        </animated.div>
      </div>

      {/* Corner markers */}
      <div style={{position:'absolute',top:32,left:40,zIndex:10}}>
        <p style={{fontSize:8,fontWeight:700,color:'rgba(184,134,11,0.2)',letterSpacing:3}}>RAHASIA</p>
      </div>
      <div style={{position:'absolute',top:32,right:40,zIndex:10}}>
        <p style={{fontSize:8,fontWeight:700,color:'rgba(255,255,255,0.12)',letterSpacing:3}}>DISPENAD</p>
      </div>
      <div style={{position:'absolute',bottom:32,left:40,zIndex:10}}>
        <p style={{fontSize:8,fontWeight:700,color:'rgba(255,255,255,0.12)',letterSpacing:3}}>TNI AD</p>
      </div>
      <div style={{position:'absolute',bottom:32,right:40,zIndex:10}}>
        <p style={{fontSize:8,fontWeight:700,color:'rgba(184,134,11,0.2)',letterSpacing:3}}>2026</p>
      </div>
    </div>)};

    /* ═══ SLIDES ═══ */
    const PF="'Outfit','Inter',sans-serif"; // Presentation font — luxury geometric sans
    const SlideBase=({children,bg})=>(
      <div style={{position:'fixed',inset:0,background:bg||'#050E09',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:PF,overflow:'hidden'}}>
        {children}
      </div>
    );
    const GoldLine=({w=60})=><div style={{width:w,height:1,background:'linear-gradient(90deg,transparent,rgba(184,134,11,0.5),transparent)',margin:'16px auto'}}/>;
    const SectionLabel=({children})=><div style={{fontSize:16,fontWeight:800,color:'rgba(184,134,11,0.8)',letterSpacing:6,textTransform:'uppercase',marginBottom:10}}>{children}</div>;
    const SlideTitle=({children,size=50})=><h2 style={{fontSize:size,fontWeight:800,color:'#FFFFFF',lineHeight:1.15,textAlign:'inherit',maxWidth:1000,textShadow:'0 2px 30px rgba(0,0,0,0.5)'}}>{children}</h2>;
    const SlideText=({children})=><p style={{fontSize:24,color:'rgba(255,255,255,0.7)',lineHeight:1.7,textAlign:'inherit',maxWidth:750,marginTop:16}}>{children}</p>;

    /* Feature callout label */
    const Callout=({children,color='#D4A843',top,left,right,bottom,arrow})=>(
      <div style={{position:'absolute',top,left,right,bottom,zIndex:20,display:'flex',alignItems:arrow==='down'?'flex-end':arrow==='up'?'flex-start':'center',gap:6,flexDirection:arrow==='down'?'column':arrow==='up'?'column-reverse':'row'}}>
        {(arrow==='left'||arrow==='right')&&<div style={{width:24,height:2,background:`linear-gradient(90deg,${arrow==='left'?color:'transparent'},${arrow==='right'?color:'transparent'})`,flexShrink:0}}/>}
        {arrow==='down'&&<div style={{width:2,height:16,background:`linear-gradient(180deg,${color},transparent)`,alignSelf:'center'}}/>}
        {arrow==='up'&&<div style={{width:2,height:16,background:`linear-gradient(0deg,${color},transparent)`,alignSelf:'center'}}/>}
        <div style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(8px)',border:`1px solid ${color}40`,borderRadius:8,padding:'6px 12px',maxWidth:200}}>
          <p style={{fontSize:14,fontWeight:700,color,lineHeight:1.3}}>{children}</p>
        </div>
      </div>
    );

    /* Phone frame wrapper for presentation — realistic iPhone proportions */
    const PhoneFrame=({children,width=300,height})=>{
      const h=height||(width*2.16); // ~9:19.5 iPhone aspect ratio
      return(
      <div style={{width,height:h,borderRadius:width*0.1,overflow:'hidden',border:'3px solid rgba(255,255,255,0.15)',boxShadow:'0 20px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.03)',background:C.bg,display:'flex',flexDirection:'column',position:'relative'}}>
        {/* Side buttons */}
        <div style={{position:'absolute',right:-3,top:h*0.18,width:3,height:28,borderRadius:'0 2px 2px 0',background:'rgba(255,255,255,0.12)'}}/>
        <div style={{position:'absolute',left:-3,top:h*0.15,width:3,height:20,borderRadius:'2px 0 0 2px',background:'rgba(255,255,255,0.1)'}}/>
        <div style={{position:'absolute',left:-3,top:h*0.23,width:3,height:36,borderRadius:'2px 0 0 2px',background:'rgba(255,255,255,0.1)'}}/>
        <div style={{position:'absolute',left:-3,top:h*0.3,width:3,height:36,borderRadius:'2px 0 0 2px',background:'rgba(255,255,255,0.1)'}}/>
        {/* Status bar */}
        <div className="flex justify-between items-center" style={{padding:`${width*0.035}px ${width*0.06}px ${width*0.015}px`,flexShrink:0}}>
          <span style={{fontFamily:"'JetBrains Mono'",fontSize:width*0.04,fontWeight:600,color:C.text}}>09:41</span>
          <div style={{width:width*0.28,height:width*0.065,background:C.text,borderRadius:width*0.035}}/>
          <div className="flex gap-0.5 items-center">
            <MI name="signal_cellular_alt" size={width*0.038} style={{color:C.text}}/>
            <MI name="wifi" size={width*0.038} style={{color:C.text}}/>
            <MI name="battery_full" size={width*0.038} style={{color:C.text}}/>
          </div>
        </div>
        {/* Content */}
        <div style={{flex:1,overflow:'auto',padding:`0 ${width*0.03}px ${width*0.015}px`}}>{children}</div>
        {/* Home indicator */}
        <div style={{flexShrink:0,display:'flex',justifyContent:'center',padding:`${width*0.02}px 0 ${width*0.025}px`}}>
          <div style={{width:width*0.35,height:4,borderRadius:2,background:C.overlay15}}/>
        </div>
      </div>);
    };

    /* Desktop frame wrapper */
    const DesktopFrame=({children,width=600})=>(
      <div style={{width,borderRadius:12,overflow:'hidden',border:'2px solid rgba(255,255,255,0.1)',boxShadow:'0 16px 60px rgba(0,0,0,0.5)',background:'#0B2619',display:'flex',flexDirection:'column'}}>
        {/* Title bar */}
        <div style={{padding:'8px 12px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',gap:6}}>
          <div style={{display:'flex',gap:4}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'#EF4444'}}/>
            <div style={{width:8,height:8,borderRadius:'50%',background:'#F59E0B'}}/>
            <div style={{width:8,height:8,borderRadius:'50%',background:'#22C55E'}}/>
          </div>
          <div style={{flex:1,textAlign:'center'}}><span style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontWeight:500}}>SINAR Command Center — TNI AD</span></div>
        </div>
        {/* Content */}
        <div style={{flex:1,overflow:'hidden'}}>{children}</div>
      </div>
    );

    /* Big stat infographic */
    const BigStat=({value,label,color='#D4A843',size=48})=>(
      <div style={{textAlign:'center'}}>
        <p style={{fontSize:size,fontWeight:900,color,fontFamily:"'JetBrains Mono'",lineHeight:1}}>{value}</p>
        <p style={{fontSize:14,color:'rgba(255,255,255,0.5)',marginTop:6,fontWeight:600,letterSpacing:1}}>{label}</p>
      </div>
    );

    /* Counter animation hook */
    const AnimCount=({to,active,suffix='',prefix='',dur=2000})=>{
      const sp=useSpring({val:active?to:0,from:{val:0},config:{duration:dur}});
      return <animated.span>{sp.val.to(v=>`${prefix}${Math.floor(v).toLocaleString()}${suffix}`)}</animated.span>;
    };

    /* Full-bleed image slide helper — images are VISIBLE */
    const CineSlide=({img,children,overlay,kb='kb-slow',align='center',split})=>(
      <SlideBase>
        <div className={kb} style={{position:'absolute',inset:0,zIndex:0}}>
          <img src={img} alt="" style={{width:'100%',height:'100%',objectFit:'cover',filter:'brightness(0.65) contrast(1.1) saturate(0.85)'}}/>
        </div>
        {/* Gradient: heavier on text side, lighter on image side */}
        <div style={{position:'absolute',inset:0,background:split==='left'
          ?'linear-gradient(90deg,rgba(5,14,9,0.92) 0%,rgba(5,14,9,0.75) 45%,rgba(5,14,9,0.3) 100%)'
          :split==='right'?'linear-gradient(90deg,rgba(5,14,9,0.3) 0%,rgba(5,14,9,0.75) 55%,rgba(5,14,9,0.92) 100%)'
          :overlay||'linear-gradient(180deg,rgba(5,14,9,0.5) 0%,rgba(5,14,9,0.65) 50%,rgba(5,14,9,0.85) 100%)',zIndex:1}}/>
        <div style={{position:'relative',zIndex:2,width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:align==='left'?'flex-start':align==='right'?'flex-end':'center',justifyContent:'center',padding:align==='center'?'0 48px':'0 6%'}}>{children}</div>
      </SlideBase>
    );

    const slides=[
      /* ── 0: Title ── */
      ()=>(
        <CineSlide img="/images/pres-hero-digital-soldiers.jpg" overlay="rgba(5,14,9,0.5)">
          <SinarMark size={80}/>
          <GoldLine w={80}/>
          <SlideTitle size={48}>Membangun Citra Positif<br/>TNI AD <span style={{color:'#D4A843'}}>di Era Digital</span></SlideTitle>
          <p style={{fontSize:20,color:'rgba(255,255,255,0.55)',marginTop:16,lineHeight:1.7,textAlign:'center',maxWidth:700}}>
            Platform digital untuk mengkoordinasikan <strong style={{color:'#fff'}}>400.000 prajurit</strong> dan <strong style={{color:'#D4A843'}}>1,6 juta keluarga</strong><br/>dalam menyebarkan narasi positif TNI AD secara nasional
          </p>
          <div style={{marginTop:28,display:'flex',alignItems:'center',gap:14,justifyContent:'center'}}>
            <div style={{width:40,height:1,background:'linear-gradient(90deg,transparent,rgba(139,26,26,0.5))'}}/>
            <p style={{fontSize:12,color:'rgba(255,255,255,0.35)',letterSpacing:3,fontWeight:600}}>DISPENAD TNI AD &nbsp;·&nbsp; 2026</p>
            <div style={{width:40,height:1,background:'linear-gradient(90deg,rgba(139,26,26,0.5),transparent)'}}/>
          </div>
        </CineSlide>
      ),

      /* ── 1: Intro Video (15s promo) ── */
      ()=>(<SlideBase><div style={{position:'absolute',inset:0,background:'#030806'}}/></SlideBase>),

      /* ── 2: PROLOGUE — Problem Statement ── */
      ()=>(
        <SlideBase>
          <div style={{position:'absolute',inset:0}}>
            <img src="/images/pres-negative-vs-positive.jpg" alt="" style={{width:'100%',height:'100%',objectFit:'cover',filter:'brightness(0.2) contrast(1.1)',opacity:0.5}}/>
            <div style={{position:'absolute',inset:0,background:'linear-gradient(160deg,rgba(5,14,9,0.85),rgba(5,14,9,0.75),rgba(5,14,9,0.85))'}}/>
          </div>
          <div style={{position:'relative',zIndex:1,textAlign:'center',padding:'0 48px',maxWidth:900}}>
            <div style={{fontSize:14,fontWeight:700,color:'rgba(139,26,26,0.7)',letterSpacing:5,marginBottom:16}}>MENGAPA PLATFORM INI DIBUTUHKAN?</div>
            <SlideTitle size={46}>Di era digital, <span style={{color:'#EF4444'}}>citra positif</span><br/>kalah cepat dari <span style={{color:'#D4A843'}}>sentimen negatif</span></SlideTitle>
            <p style={{fontSize:20,color:'rgba(255,255,255,0.5)',marginTop:14,lineHeight:1.7,maxWidth:700,margin:'14px auto 0'}}>
              TNI AD sudah melakukan banyak hal positif — tapi tanpa koordinasi digital, cerita baik ini tenggelam oleh konten negatif.
            </p>
            <GoldLine w={80}/>
            <div style={{display:'flex',gap:20,marginTop:28,justifyContent:'center',flexWrap:'wrap'}}>
              {[
                {icon:'warning',v:'6×',desc:'Hoaks menyebar lebih cepat dari fakta',c:'#EF4444',src:'MIT/Science, 2018',href:'https://science.sciencemag.org/content/359/6380/1146'},
                {icon:'public',v:'60%+',desc:'Warga Indonesia akses berita via media sosial',c:'#FB923C',src:'Reuters Digital News Report',href:'https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2024'},
                {icon:'trending_up',v:'12K+',desc:'Hoaks teridentifikasi Kominfo sejak 2018',c:'#F59E0B',src:'Kominfo RI',href:'https://kominfo.go.id'},
              ].map((s,i)=>(
                <div key={i} style={{flex:'1 1 200px',maxWidth:260,padding:'22px',borderRadius:14,background:'rgba(255,255,255,0.04)',border:`1px solid ${s.c}20`,textAlign:'center'}}>
                  <MI name={s.icon} size={28} style={{color:s.c,marginBottom:8}}/>
                  <p style={{fontSize:40,fontWeight:900,color:s.c,fontFamily:"'JetBrains Mono'",lineHeight:1}}>{s.v}</p>
                  <p style={{fontSize:16,color:'rgba(255,255,255,0.55)',marginTop:10,lineHeight:1.5}}>{s.desc}</p>
                  <a href={s.href} target="_blank" rel="noopener" style={{fontSize:11,color:'rgba(255,255,255,0.25)',marginTop:8,display:'block',textDecoration:'none',fontStyle:'italic'}}>{s.src} ↗</a>
                </div>
              ))}
            </div>
            <div style={{marginTop:36,padding:'16px 28px',borderRadius:12,background:'rgba(184,134,11,0.08)',border:'1px solid rgba(184,134,11,0.15)',display:'inline-block'}}>
              <p style={{fontSize:18,color:'#D4A843',fontWeight:700}}>Bagaimana jika <span style={{color:'#fff'}}>400.000+ prajurit & keluarga</span> bisa bergerak bersama<br/>menyebarkan <span style={{color:'#fff'}}>cerita positif TNI AD</span> ke seluruh Indonesia?</p>
            </div>
            {/* Arrow down hint */}
            <div style={{marginTop:24,animation:'pulse 2.5s ease-in-out infinite'}}>
              <MI name="expand_more" size={28} style={{color:'rgba(184,134,11,0.35)'}}/>
            </div>
          </div>
        </SlideBase>
      ),

      /* ── 2: Apa Itu SINAR? — Clear Explanation + 4 Pillars ── */
      ()=>(
        <SlideBase>
          <div style={{position:'absolute',inset:0}}>
            <img src="/images/pres-soldiers-phones-mobilize.jpg" alt="" style={{width:'100%',height:'100%',objectFit:'cover',filter:'brightness(0.15) contrast(1.1)',opacity:0.6}}/>
            <div style={{position:'absolute',inset:0,background:'linear-gradient(160deg,rgba(5,14,9,0.9),rgba(10,26,16,0.85),rgba(5,14,9,0.9))'}}/>
          </div>
          <div style={{position:'relative',zIndex:1,textAlign:'center',padding:'0 48px',maxWidth:1100}}>
            <SinarMark size={64}/>
            <h1 style={{fontSize:48,fontWeight:900,color:'#FFFFFF',letterSpacing:8,marginTop:12}}>SINAR</h1>
            <p style={{fontSize:16,color:'#D4A843',letterSpacing:5,marginTop:6,fontWeight:600}}>SISTEM INFORMASI NARASI AKTIF RAKYAT</p>
            <GoldLine w={100}/>
            <p style={{fontSize:22,color:'rgba(255,255,255,0.8)',lineHeight:1.7,marginTop:16,maxWidth:800,margin:'16px auto 0'}}>
              Aplikasi mobile yang <strong style={{color:'#fff'}}>menggerakkan 400.000 prajurit dan keluarga</strong> secara serentak untuk menyebarkan <strong style={{color:'#D4A843'}}>narasi positif TNI AD</strong> melalui misi terstruktur dan insentif nyata.
            </p>
            <div style={{display:'flex',gap:14,marginTop:32,justifyContent:'center'}}>
              {[
                {icon:'campaign',title:'Misi dari Komando',desc:'DISPENAD kirim instruksi langsung ke perangkat 400K prajurit',color:'#14532D'},
                {icon:'phone_iphone',title:'Aplikasi Mobile',desc:'Satu platform untuk prajurit & keluarga — terima, eksekusi, upload',color:'#4ADE80'},
                {icon:'military_tech',title:'Insentif & Gamifikasi',desc:'Poin XP, pangkat digital, lencana, dan reward merchandise nyata',color:'#D4A843'},
                {icon:'dashboard',title:'Pusat Kendali',desc:'Dashboard admin untuk monitoring seluruh aktivitas nasional',color:'#8B1A1A'},
              ].map((c,i)=>(
                <div key={i} style={{flex:'1 1 0',maxWidth:240,padding:'22px 16px',borderRadius:14,background:`${c.color}08`,border:`1px solid ${c.color}20`,textAlign:'center'}}>
                  <div style={{width:52,height:52,borderRadius:14,background:`${c.color}15`,border:`1px solid ${c.color}30`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto'}}>
                    <MI name={c.icon} size={26} style={{color:typeof c.color==='string'&&c.color.startsWith('#1')?'#fff':c.color}}/>
                  </div>
                  <p style={{fontSize:20,fontWeight:800,color:'#FFFFFF',marginTop:12}}>{c.title}</p>
                  <p style={{fontSize:15,color:'rgba(255,255,255,0.5)',marginTop:6,lineHeight:1.5}}>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </SlideBase>
      ),

      /* (old Cara Kerja + Real Scenario + Video Viral removed — covered by Remotion compositions) */

      /* ── Multiplier — Jangkauan Nasional (Remotion) ── */
      ()=>(<SlideBase><div style={{position:'absolute',inset:0,background:'#050E09'}}/></SlideBase>),

      /* ── Demographics — Siapa Pengguna SINAR (Remotion) ── */
      ()=>(<SlideBase><div style={{position:'absolute',inset:0,background:'#050E09'}}/></SlideBase>),

      /* ── Operational Flow (Remotion) — Cara Kerja ── */
      ()=>(<SlideBase><div style={{position:'absolute',inset:0,background:'#050E09'}}/></SlideBase>),

      /* ── MissionTypes (Remotion) — replaces old Misi 1+2 ── */
      ()=>(<SlideBase><div style={{position:'absolute',inset:0,background:'#050E09'}}/></SlideBase>),

      /* ── GamifikasiReward (Remotion) — replaces old Gamifikasi+Toko ── */
      ()=>(<SlideBase><div style={{position:'absolute',inset:0,background:'#050E09'}}/></SlideBase>),

      /* ── REMOVED: old Tipe Misi 1+2, Gamifikasi, Multiplier, Toko — replaced by Remotion compositions above ── */
      /* ── 12: Admin Command Center — Auto-cycling pages ── */
      ()=>{
        const a=slide===9; /* admin CC */
        const fD=useSpring({opacity:a?1:0,transform:a?'translateY(0) scale(1)':'translateY(30px) scale(0.96)',delay:200,config:{tension:80,friction:20}});
        const fCards=useSpring({opacity:a?1:0,transform:a?'translateY(0)':'translateY(30px)',delay:600,config:{tension:70,friction:18}});
        return(
        <SlideBase>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(160deg,#030806,#081510,#030806)'}}/>
          <div style={{position:'relative',zIndex:1,width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',padding:'2% 3%',maxWidth:1300,margin:'0 auto'}}>
            <SectionLabel>PUSAT KOMANDO</SectionLabel>
            <SlideTitle size={42}>Pusat Kendali <span style={{color:'#D4A843'}}>SINAR</span></SlideTitle>

            <div style={{display:'flex',gap:20,marginTop:16,width:'100%',flex:1,minHeight:0}}>
              {/* Left: Desktop dashboard with auto-cycling pages */}
              <animated.div style={{...fD,flex:'1 1 55%'}}>
                <DesktopFrame width="100%">
                  <div style={{height:420,overflow:'hidden'}}>
                    <video autoPlay muted playsInline loop={false} style={{width:'100%',height:'100%',objectFit:'cover'}} src="/videos/demo-3.mov">
                      <source src="/videos/demo-3.mov" type="video/mp4"/>
                      <source src="/videos/demo-3.mov" type="video/quicktime"/>
                    </video>
                  </div>
                </DesktopFrame>
              </animated.div>

              {/* Right: Feature cards — bigger text */}
              <animated.div style={{...fCards,flex:'0 0 38%',display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,alignContent:'start',paddingTop:8}}>
                {[
                  {icon:'assignment',t:'Buat Misi',d:'Wizard 4 langkah, 5 tipe misi: Event, Konten, Engagement, Edukasi, Aksi',c:'#4ADE80'},
                  {icon:'smart_toy',t:'AI Review',d:'Skor otomatis kualitas konten, verifikasi hashtag & caption',c:'#A78BFA'},
                  {icon:'analytics',t:'Analitik',d:'Monitor reach, engagement, sentiment per misi & per Kodam',c:'#D4A843'},
                  {icon:'send',t:'Broadcast',d:'Kirim notifikasi & briefing ke segmen spesifik',c:'#FB923C'},
                  {icon:'map',t:'Peta 37 Kodam',d:'Visualisasi sebaran agen & aktivitas misi nasional',c:'#22C55E'},
                  {icon:'download',t:'Export',d:'Download laporan CSV, PDF, XLSX',c:'#60A5FA'},
                ].map((c,i)=>(
                  <div key={i} style={{padding:'16px 18px',borderRadius:14,background:'rgba(0,0,0,0.5)',border:`1px solid ${c.c}20`,backdropFilter:'blur(8px)',display:'flex',flexDirection:'column',gap:8}}>
                    <div style={{width:44,height:44,borderRadius:12,background:`${c.c}12`,border:`1px solid ${c.c}25`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <MI name={c.icon} size={22} style={{color:c.c}}/>
                    </div>
                    <p style={{fontSize:18,fontWeight:800,color:'#FFFFFF'}}>{c.t}</p>
                    <p style={{fontSize:14,color:'rgba(255,255,255,0.5)',lineHeight:1.5}}>{c.d}</p>
                  </div>
                ))}
              </animated.div>
            </div>
          </div>
        </SlideBase>);
      },

      /* ── Video Demo — 2 phones side by side ── */
      ()=>{
        const a=slide===10;
        const f1=useSpring({opacity:a?1:0,transform:a?'translateY(0)':'translateY(30px)',delay:200,config:{tension:80,friction:20}});
        const f2=useSpring({opacity:a?1:0,transform:a?'translateY(0)':'translateY(30px)',delay:400,config:{tension:80,friction:20}});
        const DemoPhone=({src,label,desc,anim})=>(
          <animated.div style={{...anim,display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
            <div style={{width:260,height:563,borderRadius:26,overflow:'hidden',border:'3px solid rgba(255,255,255,0.12)',boxShadow:'0 20px 80px rgba(0,0,0,0.6)',background:'#0B1A12',position:'relative'}}>
              {/* Side buttons */}
              <div style={{position:'absolute',right:-3,top:100,width:3,height:26,borderRadius:'0 2px 2px 0',background:'rgba(255,255,255,0.1)'}}/>
              <div style={{position:'absolute',left:-3,top:80,width:3,height:18,borderRadius:'2px 0 0 2px',background:'rgba(255,255,255,0.08)'}}/>
              <div style={{position:'absolute',left:-3,top:120,width:3,height:32,borderRadius:'2px 0 0 2px',background:'rgba(255,255,255,0.08)'}}/>
              {/* No status bar — video recording already has one */}
              <video autoPlay muted playsInline style={{width:'100%',height:'100%',objectFit:'contain',background:'#0B1A12'}} src={src} loop={false}/>
              {/* Home indicator */}
              <div style={{position:'absolute',bottom:6,left:'50%',transform:'translateX(-50%)',width:90,height:4,borderRadius:2,background:'rgba(255,255,255,0.25)'}}/>
            </div>
            <p style={{fontSize:18,fontWeight:700,color:'#D4A843'}}>{label}</p>
            <p style={{fontSize:14,color:'rgba(255,255,255,0.4)',textAlign:'center',maxWidth:240,lineHeight:1.5}}>{desc}</p>
          </animated.div>
        );
        return(
        <SlideBase>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(160deg,#030806,#081510,#030806)'}}/>
          <div style={{position:'relative',zIndex:1,width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',padding:'2% 4%',maxWidth:1200,margin:'0 auto'}}>
            <SectionLabel>DEMO APLIKASI</SectionLabel>
            <SlideTitle size={44}>Lihat <span style={{color:'#D4A843'}}>SINAR</span> Langsung Beraksi</SlideTitle>

            <div style={{display:'flex',gap:48,marginTop:20,flex:1,minHeight:0,alignItems:'flex-start',justifyContent:'center'}}>
              <DemoPhone
                src="/videos/demo-1.mov"
                label="Beranda & Misi"
                desc="Prajurit melihat daftar misi, ambil misi, dan lihat instruksi detail"
                anim={f1}
              />
              <DemoPhone
                src="/videos/demo-2.mov"
                label="Upload & AI Review"
                desc="Upload bukti pelaksanaan dan review otomatis oleh sistem AI"
                anim={f2}
              />
            </div>
          </div>
        </SlideBase>);
      },

      /* ── CTA ── */
      ()=>(
        <CineSlide img="/images/pres-massa-penggerak-v2.png" overlay="radial-gradient(ellipse 60% 50% at 50% 50%,rgba(5,14,9,0.35),rgba(5,14,9,0.92) 80%)">
          <div style={{position:'absolute',inset:20,border:'1px solid rgba(184,134,11,0.12)',borderRadius:4,pointerEvents:'none'}}/>
          <SinarMark size={80}/>
          <GoldLine w={100}/>
          <h1 style={{fontSize:52,fontWeight:900,color:'#FFFFFF',letterSpacing:6,lineHeight:1.2,textAlign:'center',textShadow:'0 4px 40px rgba(184,134,11,0.2)'}}>
            Siap Meluncurkan<br/><span style={{color:'#D4A843'}}>SINAR Nasional</span>
          </h1>
          <p style={{fontSize:20,color:'rgba(255,255,255,0.55)',marginTop:20,lineHeight:1.6,textAlign:'center',maxWidth:600}}>
            Mobilisasi <strong style={{color:'#FFFFFF'}}>400.000+ prajurit</strong> dan <strong style={{color:'#D4A843'}}>1.6 juta keluarga</strong><br/>
            untuk citra positif TNI AD di era digital.
          </p>
          <div style={{display:'flex',gap:12,marginTop:28,justifyContent:'center'}}>
            <a href="/app" target="_blank" rel="noopener" style={{padding:'12px 28px',borderRadius:12,fontSize:15,fontWeight:700,textDecoration:'none',display:'flex',alignItems:'center',gap:8,background:'linear-gradient(135deg,#14532D,#1B4332)',color:'#86EFAC',border:'1px solid rgba(134,239,172,0.2)',cursor:'pointer'}}>
              <MI name="phone_iphone" size={18} style={{color:'#86EFAC'}}/>Coba Mobile App
            </a>
            <a href="/admin" target="_blank" rel="noopener" style={{padding:'12px 28px',borderRadius:12,fontSize:15,fontWeight:700,textDecoration:'none',display:'flex',alignItems:'center',gap:8,background:'rgba(184,134,11,0.15)',color:'#D4A843',border:'1px solid rgba(184,134,11,0.25)',cursor:'pointer'}}>
              <MI name="dashboard" size={18} style={{color:'#D4A843'}}/>Admin Dashboard
            </a>
          </div>
          <GoldLine w={60}/>
          <p style={{fontSize:14,color:'rgba(255,255,255,0.3)',letterSpacing:4,fontWeight:600}}>TNI AD &nbsp;·&nbsp; SIAP GERAK</p>
        </CineSlide>
      ),

      /* ── Closing — Emotional quote + SINAR reveal (Remotion) ── */
      ()=>(<SlideBase><div style={{position:'absolute',inset:0,background:'#030806'}}/></SlideBase>),
    ];

    /* ═══ RENDER ═══ */

    /* Remotion splash overlay — rendered outside slides array for stability */
    if(slide===-1) return(
      <div style={{position:'fixed',inset:0,zIndex:9999,background:'#030806',overflow:'hidden',cursor:'default'}} onClick={()=>{if(phase>=4)setSlide(0)}}>
        <Player
          component={SplashIntro}
          durationInFrames={360}
          compositionWidth={1920}
          compositionHeight={1080}
          fps={30}
          autoPlay
          numberOfSharedAudioTags={0}
          style={{width:'100vw',height:'100vh'}}
          acknowledgeRemotionLicense
        />
        {phase>=4&&<div style={{position:'absolute',bottom:40,left:0,right:0,textAlign:'center',zIndex:20,animation:'pulse 2.5s ease-in-out infinite'}}>
          <p style={{fontSize:12,color:'rgba(255,255,255,0.3)',letterSpacing:3}}>CLICK ATAU TEKAN SPACE UNTUK MELANJUTKAN</p>
        </div>}
      </div>
    );


    const SlideComponent=slides[slide];

    /* Map of slides that have Remotion cinematic versions */
    const LONG=3600; // 2 minutes — holds final frame while presenter talks
    const REMOTION_SLIDES={
      1:{component:IntroVideo,frames:LONG},
      4:{component:IndonesiaNetwork,frames:LONG},
      5:{component:Demographics,frames:LONG},
      6:{component:OperationalFlow,frames:LONG},
      7:{component:MissionTypes,frames:LONG},
      8:{component:GamifikasiReward,frames:LONG},
      12:{component:ClosingQuote,frames:LONG},
    };
    const remotionSlide=REMOTION_SLIDES[slide];

    return(
      <div style={{position:'fixed',inset:0,zIndex:9999}}>
        {/* Remotion video overlay — rendered at top level, not inside slides array */}
        {remotionSlide&&(
          <div key={`remotion-${slide}`} style={{position:'fixed',inset:0,zIndex:9998,background:'#050E09'}}>
            <Player
              component={remotionSlide.component}
              durationInFrames={remotionSlide.frames}
              compositionWidth={1920}
              compositionHeight={1080}
              fps={30}
              autoPlay
              numberOfSharedAudioTags={0}
              style={{width:'100vw',height:'100vh'}}
              acknowledgeRemotionLicense
            />
          </div>
        )}
        {/* Normal slide (hidden behind Remotion overlay when active) */}
        {!remotionSlide&&SlideComponent&&<SlideComponent/>}

        {/* Progress bar at top */}
        <div style={{position:'fixed',top:0,left:0,right:0,height:2,background:'rgba(255,255,255,0.04)',zIndex:10001}}>
          <div className="pres-progress-bar" style={{width:`${((slide+1)/slides.length)*100}%`}}/>
        </div>

        {/* Navigation HUD */}
        <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',display:'flex',gap:6,zIndex:10000,background:'rgba(0,0,0,0.3)',backdropFilter:'blur(8px)',borderRadius:12,padding:'6px 10px'}}>
          {slides.map((_,i)=>(
            <div key={i} onClick={()=>{setSlide(i);setSubStep(0);setDemoPhase(0);setAdminPage(0);}} className={i===slide?'nav-dot-active':''} style={{
              width:i===slide?24:8,height:8,borderRadius:4,cursor:'pointer',transition:'all 400ms cubic-bezier(0.25,0.46,0.45,0.94)',
              background:i===slide?'rgba(184,134,11,0.85)':i<slide?'rgba(184,134,11,0.3)':'rgba(255,255,255,0.15)',
            }}/>
          ))}
        </div>
        <div key={`num-${slide}`} className="slide-num-pop" style={{position:'fixed',top:24,right:32,fontSize:16,color:'rgba(255,255,255,0.3)',fontFamily:"'JetBrains Mono'",zIndex:10000,letterSpacing:2,fontWeight:600}}>
          {slide+1} / {slides.length}
        </div>
        <div style={{position:'fixed',top:24,left:32,display:'flex',alignItems:'center',gap:8,zIndex:10000}}>
          <SinarMark size={22}/>
          <span style={{fontSize:12,color:'rgba(255,255,255,0.25)',letterSpacing:3,fontWeight:700}}>SINAR</span>
        </div>
        {/* Click zones — z-index below interactive slide content */}
        <div onClick={prevSlide} style={{position:'fixed',left:0,top:0,bottom:0,width:'15%',cursor:'w-resize',zIndex:4}}/>
        <div onClick={nextSlide} style={{position:'fixed',right:0,top:0,bottom:0,width:'15%',cursor:'e-resize',zIndex:4}}/>
      </div>
    );
  }

  if(mode==='presentation') return <PresentationMode/>;

  /* ─── MODE: ADMIN vs MEMBER ─────────────────────────────────────── */
  if(mode==='admin') return(<>
    <DesktopAdmin/>
    {toast&&<div role="alert" className={toastExiting?'toast-exit':'toast-enter'} style={{position:'fixed',bottom:40,left:'50%',transform:'translateX(-50%)',background:`linear-gradient(135deg,${C.primary},${C.primaryAccent})`,padding:'10px 20px',borderRadius:12,fontSize:13,fontWeight:600,color:'#FFFFFF',zIndex:100,boxShadow:`0 8px 24px ${C.primaryGlow}`,border:`1px solid ${C.overlay10}`}}>{toast}</div>}
  </>);

  return(
    <div className="flex items-center justify-center noise-bg mesh-bg" style={{minHeight:'100vh',background:C.bg,paddingTop:20,paddingBottom:20,position:'relative',overflow:'hidden'}}>
      {/* Decorative Orbs */}
      <div className="orb orb-1" style={{width:300,height:300,background:'radial-gradient(circle,rgba(20,83,45,0.12),transparent 70%)',top:-50,left:-80}}/>
      <div className="orb orb-2" style={{width:250,height:250,background:'radial-gradient(circle,rgba(20,83,45,0.06),transparent 70%)',bottom:100,right:-60}}/>

      {/* Admin Login (demo only — PIN protected) */}
      <div style={{position:'fixed',top:12,right:12,zIndex:200}}>
        <button onClick={()=>setAdminLoginVisible(v=>!v)} className="tap-bounce" style={{padding:'7px 14px',borderRadius:12,border:`1px solid ${C.border}`,background:C.surfaceGlass,backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',color:C.textSec,fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:5,boxShadow:'0 2px 12px rgba(0,0,0,0.08)'}}>
          <MI name="lock" size={14} style={{color:C.primary}}/> Admin
        </button>
        {adminLoginVisible&&<div style={{position:'absolute',top:'calc(100% + 8px)',right:0,background:C.bgCard,borderRadius:16,padding:20,border:`1px solid ${C.border}`,boxShadow:'0 12px 40px rgba(0,0,0,0.15)',width:240,zIndex:201}}>
          <h4 style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:4}}>Admin Login</h4>
          <p style={{fontSize:10,color:C.textMuted,marginBottom:12}}>Masukkan PIN administrator</p>
          <input type="password" maxLength={6} value={adminPin} onChange={e=>setAdminPin(e.target.value)} onKeyDown={e=>e.key==='Enter'&&tryAdminLogin()} placeholder="PIN" style={{width:'100%',padding:'10px 12px',borderRadius:10,border:`1px solid ${C.border}`,background:C.surfaceLight,color:C.text,fontSize:14,fontFamily:"'JetBrains Mono'",letterSpacing:8,textAlign:'center',outline:'none',boxSizing:'border-box'}}/>
          <button onClick={tryAdminLogin} className="tap-bounce" style={{width:'100%',marginTop:10,padding:'10px 0',borderRadius:10,border:'none',background:`linear-gradient(135deg,${C.primary},${C.primaryAccent})`,color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
            <MI name="login" size={14} style={{color:'#fff'}}/> Masuk Admin
          </button>
          <p style={{fontSize:9,color:C.textMuted,textAlign:'center',marginTop:8}}>Demo PIN: 1234</p>
        </div>}
      </div>

      <div style={{width:390,maxWidth:'100vw',height:844,maxHeight:'calc(100vh - 40px)',background:C.bg,borderRadius:44,overflow:'hidden',position:'relative',border:`1px solid ${C.border}`,boxShadow:'0 20px 60px rgba(0,0,0,0.1)',display:'flex',flexDirection:'column'}}>
        {/* Mobile Splash Screen — Luxury Edition */}
        {showSplash&&(
          <div style={{position:'absolute',inset:0,zIndex:50,background:'#030806',overflow:'hidden',animation:'splashFadeOut 0.8s ease-in 2.6s forwards'}}>
            {/* Background hero image with crossfade */}
            <div style={{position:'absolute',inset:0}}>
              <img src="/images/splash-hero-soldiers.png" alt="" style={{width:'100%',height:'100%',objectFit:'cover',opacity:0.35,filter:'brightness(0.6) contrast(1.2)'}}/>
            </div>
            {/* Gradient overlays for depth */}
            <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(3,8,6,0.4) 0%,rgba(3,8,6,0.2) 30%,rgba(3,8,6,0.6) 60%,rgba(3,8,6,0.95) 85%)',pointerEvents:'none'}}/>
            <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 60% 40% at 50% 55%,rgba(184,134,11,0.06),transparent 70%)',pointerEvents:'none'}}/>

            {/* Top gold accent line */}
            <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent 10%,rgba(184,134,11,0.4) 50%,transparent 90%)'}}/>

            {/* Center content */}
            <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:2}}>
              {/* Luxury logo emblem */}
              <div style={{position:'relative',animation:'emblemReveal 1s ease-out 300ms both'}}>
                {/* Outer gold ring */}
                <div style={{position:'absolute',inset:-20,borderRadius:'50%',border:'1px solid rgba(184,134,11,0.2)',animation:'pulse-glow 4s ease-in-out infinite'}}/>
                <div style={{position:'absolute',inset:-12,borderRadius:'50%',border:'1px solid rgba(184,134,11,0.08)'}}/>
                {/* Glow */}
                <div style={{position:'absolute',inset:-30,borderRadius:'50%',background:'radial-gradient(circle,rgba(184,134,11,0.15),transparent 70%)'}}/>
                <SinarMark size={56}/>
              </div>

              {/* Brand name with luxury treatment */}
              <div style={{marginTop:20,animation:'fadeInUp 700ms ease-out 700ms both',textAlign:'center'}}>
                <div style={{display:'flex',alignItems:'center',gap:12,justifyContent:'center',marginBottom:6}}>
                  <div style={{width:28,height:1,background:'linear-gradient(90deg,transparent,rgba(184,134,11,0.5))'}}/>
                  <span style={{fontSize:8,fontWeight:700,color:'rgba(184,134,11,0.5)',letterSpacing:4}}>TNI AD</span>
                  <div style={{width:28,height:1,background:'linear-gradient(90deg,rgba(184,134,11,0.5),transparent)'}}/>
                </div>
                <h1 style={{fontSize:36,fontWeight:900,color:'#FFFFFF',letterSpacing:14,lineHeight:1,textShadow:'0 2px 30px rgba(184,134,11,0.2)'}}>SINAR</h1>
              </div>

              {/* Tagline */}
              <p style={{fontSize:9,fontWeight:600,color:'rgba(184,134,11,0.7)',letterSpacing:3,textTransform:'uppercase',marginTop:10,animation:'fadeInUp 600ms ease-out 1000ms both'}}>
                Sistem Informasi Narasi Aktif Rakyat
              </p>
            </div>

            {/* Bottom loading area */}
            <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'0 60px 70px',zIndex:3,display:'flex',flexDirection:'column',alignItems:'center'}}>
              <div style={{width:'100%',height:1,background:'rgba(255,255,255,0.06)',borderRadius:1,overflow:'hidden',marginBottom:12}}>
                <div style={{height:'100%',background:'linear-gradient(90deg,rgba(184,134,11,0.8),rgba(139,26,26,0.6))',borderRadius:1,animation:'splashProgress 2.4s ease-in-out forwards'}}/>
              </div>
              <p style={{fontSize:8,color:'rgba(255,255,255,0.2)',letterSpacing:2,fontWeight:500}}>MEMUAT SISTEM</p>
            </div>
          </div>
        )}
        {/* Status Bar */}
        <div className="flex justify-between items-center" style={{padding:'14px 28px 6px',fontSize:12,color:C.text,fontWeight:600,flexShrink:0}}>
          <span style={{fontFamily:"'JetBrains Mono'",fontSize:13,fontWeight:600,color:C.text}}>09:41</span>
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
          <nav className="flex" role="tablist" aria-label="Main navigation" style={{padding:'6px 4px 28px',flexShrink:0,background:C.bgCard,borderTop:`1px solid ${C.border}`,boxShadow:'0 -4px 10px rgba(0,0,0,0.03)'}}>
            {tabs.map(tab=>{const active=screen===tab.id;return(
              <button key={tab.id} role="tab" aria-selected={active} aria-label={tab.label} onClick={()=>nav(tab.id)} className="flex flex-1 flex-col items-center justify-center gap-1 tap-bounce" style={{background:'none',border:'none',cursor:'pointer',padding:'10px 0',minHeight:48,position:'relative'}}>
                <MI name={tab.icon} size={22} fill={active} style={{color:active?C.primary:C.textMuted,transition:'color 200ms',filter:active?'drop-shadow(0 1px 2px rgba(20,83,45,0.2))':'none'}}/>
                <span style={{fontSize:11,fontWeight:active?700:500,color:active?C.primary:C.textMuted,letterSpacing:0.3,transition:'all 200ms'}}>{tab.label}</span>
              </button>
            );})}
          </nav>
        )}
      </div>

      {/* Toast */}
      {toast&&<div role="alert" className={toastExiting?'toast-exit':'toast-enter'} style={{position:'fixed',bottom:120,left:'50%',transform:'translateX(-50%)',background:`linear-gradient(135deg,${C.primary},${C.primaryAccent})`,padding:'10px 20px',borderRadius:12,fontSize:13,fontWeight:600,color:'#FFFFFF',zIndex:100,boxShadow:`0 8px 24px ${C.primaryGlow}`,border:`1px solid ${C.overlay10}`}}>
        {toast}
      </div>}
    </div>
  );
}

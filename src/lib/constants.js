// SINAR Constants — extracted from App.jsx
// Color palette, account types, utility functions

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

const ACCOUNT_TYPES={
  prajurit:{label:'Prajurit',desc:'Anggota TNI AD aktif',color:C.primary,icon:'military_tech',xpMultiplier:1,missionTypes:['EVENT','KONTEN','ENGAGEMENT','EDUKASI','AKSI']},
  suami:{label:'Suami',desc:'Suami prajurit TNI AD',color:C.accent,icon:'favorite',xpMultiplier:0.7,missionTypes:['EVENT','KONTEN','ENGAGEMENT']},
  istri:{label:'Istri',desc:'Istri prajurit TNI AD',color:C.teal,icon:'favorite',xpMultiplier:0.7,missionTypes:['EVENT','KONTEN','ENGAGEMENT']},
  anak:{label:'Anak',desc:'Anak prajurit TNI AD',color:C.purple,icon:'school',xpMultiplier:0.5,missionTypes:['KONTEN','ENGAGEMENT']},
};

const typeColor=t=>({EVENT:C.purple,KONTEN:C.primary,ENGAGEMENT:C.orange,EDUKASI:C.secondary,AKSI:C.accent}[t]||C.primary);

const typeBonuses=t=>({
  EVENT:[{label:'Paling Tepat Waktu',icon:'timer',xp:100,color:C.teal},{label:'Dokumentasi Terbaik',icon:'photo_camera',xp:150,color:C.primary},{label:'Koordinator Lapangan',icon:'handshake',xp:settingsXP?.EVENT?.base||200,color:C.purple}],
  KONTEN:[{label:'Konten Terbaik',icon:'emoji_events',xp:250,color:C.gold},{label:'Paling Engaging',icon:'trending_up',xp:200,color:C.green},{label:'Paling Cepat Submit',icon:'speed',xp:100,color:C.teal},{label:'Paling Kreatif',icon:'auto_awesome',xp:150,color:C.purple}],
  ENGAGEMENT:[{label:'Top Engager',icon:'favorite',xp:150,color:C.red},{label:'Komentar Terbaik',icon:'chat_bubble',xp:100,color:C.primary},{label:'Paling Konsisten',icon:'repeat',xp:100,color:C.teal}],
  EDUKASI:[{label:'Jangkauan Terluas',icon:'public',xp:200,color:C.purple},{label:'Distribusi Tercepat',icon:'speed',xp:100,color:C.teal},{label:'Feedback Terbaik',icon:'thumb_up',xp:150,color:C.green}],
  AKSI:[{label:'Target Tercapai Duluan',icon:'flag',xp:200,color:C.gold},{label:'Relawan Terbanyak',icon:'group_add',xp:150,color:C.primary},{label:'Area Terluas',icon:'map',xp:100,color:C.teal}],
}[t]||[]);

const RARITY_COLORS={common:{label:'Prajurit',gradient:'linear-gradient(135deg,#546E7A,#78909C)',border:'#546E7A',glow:'rgba(84,110,122,0.25)'},rare:{label:'Bintara',gradient:'linear-gradient(135deg,#14532D,#2E7D32)',border:'#14532D',glow:'rgba(20,83,45,0.3)'},epic:{label:'Perwira',gradient:'linear-gradient(135deg,#6D28D9,#A78BFA)',border:'#6D28D9',glow:'rgba(109,40,217,0.3)'},legendary:{label:'Kehormatan',gradient:'linear-gradient(135deg,#92400E,#D97706)',border:'#92400E',glow:'rgba(146,64,14,0.35)'}};

const ACTIVITY=[
  {mission:'Wawasan Kebangsaan TNI AD',type:'EDUKASI',date:'8 Mar',xp:250,status:'SELESAI'},
  {mission:'Dukung Konten DISPENAD',type:'ENGAGEMENT',date:'7 Mar',xp:200,status:'PROSES'},
  {mission:'Reels Prajurit TNI AD',type:'KONTEN',date:'6 Mar',xp:350,status:'PROSES'},
  {mission:'#BanggaTNIAD Challenge',type:'KONTEN',date:'5 Mar',xp:300,status:'SELESAI'},
  {mission:'Baksos TNI AD Cianjur',type:'EVENT',date:'4 Mar',xp:500,status:'SELESAI'},
];

const INDONESIA_GEO_URL='https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const mapStatusColor=s=>({hot:C.patriot,warm:C.accent,cool:C.primary}[s]||C.primary);
const mapStatusPulse=s=>s==='hot';
            const col=mapStatusColor(zone.status);

export { C, ACCOUNT_TYPES, typeColor, typeBonuses, RARITY_COLORS, INDONESIA_GEO_URL };
// Also export mapStatusColor, mapStatusPulse if they exist as named exports

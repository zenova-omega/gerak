import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { C, ACCOUNT_TYPES, typeColor, typeBonuses } from '../../lib/constants';
import { MISSIONS } from '../../data/missions';
import { RANKS, BADGES } from '../../data/ranks';
import { RARITY_COLORS } from '../../lib/constants';
// Note: These components are still imported from parent context during migration.
// They will be properly imported once all components are extracted.
// MI, AvatarImg, Card, Badge, Chip, ProgressBar, SinarMark, RankInsignia, etc.
// are passed via props or context during the transition period.

// Extracted from App.jsx — will be wired with proper imports in Phase 1.6
// Lines 1658-1868 of original App.jsx

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

export default Profil;

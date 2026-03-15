import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { C, ACCOUNT_TYPES, typeColor, typeBonuses, INDONESIA_GEO_URL } from '../../lib/constants';
import { MISSIONS } from '../../data/missions';
import { RANKS, BADGES } from '../../data/ranks';
import { KODAM_ZONES } from '../../data/kodam';
import { ADMIN_STATS } from '../../data/admin';
// Note: Shared components (MI, AvatarImg, SinarMark, etc.) still imported from parent.
// Will be properly wired in Phase 1.6.

// Full admin dashboard — extracted from App.jsx
// Original lines 3907-5767

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

export default DesktopAdmin;

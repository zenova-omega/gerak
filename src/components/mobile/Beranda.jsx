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
// Lines 1001-1388 of original App.jsx

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

export default Beranda;

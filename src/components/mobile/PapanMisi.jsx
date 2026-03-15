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
// Lines 1390-1490 of original App.jsx

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

export default PapanMisi;

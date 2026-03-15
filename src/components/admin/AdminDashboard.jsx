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

// Mobile admin dashboard — extracted from App.jsx
// Original lines 1870-2577

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

export default AdminDashboard;

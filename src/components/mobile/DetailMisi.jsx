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
// Lines 2899-3499 of original App.jsx

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

export default DetailMisi;

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
// Lines 2578-2771 of original App.jsx

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

export default KontenSaya;

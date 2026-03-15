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
// Lines 1492-1656 of original App.jsx

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

export default PangkatLencana;

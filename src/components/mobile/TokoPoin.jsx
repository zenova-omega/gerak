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
// Lines 2773-2897 of original App.jsx

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

export default TokoPoin;

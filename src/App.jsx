import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useBookText } from "./hooks/useBookText.js";
import { useCatalog, searchCatalog } from "./hooks/useCatalog.js";

const MAX_SHELF = 9;
const MAX_BM    = 3;
// 茶系3色
const BM_COLORS = ["#7a4a20","#a07040","#5a3818"];

/* ─── 色生成 ─── */
function titleToBeige(title) {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = title.charCodeAt(i) + ((h << 5) - h);
  const hue = 32 + (Math.abs(h) % 16);
  const sat  = 12 + (Math.abs(h >> 3) % 15);
  const lig  = 84 + (Math.abs(h >> 6) % 10);
  const age  = Math.abs(h >> 10) % 4;
  return {
    bg:     `hsl(${hue},${sat+age}%,${lig-age*2}%)`,
    ink:    `hsl(${hue},${sat+28}%,${lig-57}%)`,
    accent: `hsl(${hue},${sat+32}%,${lig-44}%)`,
    aged: age,
  };
}

/* ─── 社章 ─── */
function Shacho({ size=16, color="#8a7050", opacity=0.6 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{opacity,display:"block",flexShrink:0}}>
      <polygon points="12,1 23,12 12,23 1,12" fill="none" stroke={color} strokeWidth="1.3"/>
      <polygon points="12,5 19,12 12,19 5,12"  fill="none" stroke={color} strokeWidth="0.7" opacity="0.55"/>
      <line x1="12" y1="3" x2="12" y2="21" stroke={color} strokeWidth="0.4" opacity="0.35"/>
      <line x1="3"  y1="12" x2="21" y2="12" stroke={color} strokeWidth="0.4" opacity="0.35"/>
      <circle cx="12" cy="12" r="2" fill={color}/>
    </svg>
  );
}

/* ─── 飾り罫 ─── */
function OrnamentFrame({ accent, w, h }) {
  const m=7, m2=12;
  return (
    <svg style={{position:"absolute",inset:0,pointerEvents:"none"}} width={w} height={h}>
      <rect x={m}  y={m}  width={w-m*2}  height={h-m*2}  fill="none" stroke={accent} strokeWidth="0.75" opacity="0.65"/>
      <rect x={m2} y={m2} width={w-m2*2} height={h-m2*2} fill="none" stroke={accent} strokeWidth="0.38" opacity="0.35"/>
      {[[m,m],[w-m,m],[m,h-m],[w-m,h-m]].map(([cx,cy],i)=>(
        <g key={i} transform={`translate(${cx},${cy})`}>
          <line x1="-7" y1="0" x2="7" y2="0" stroke={accent} strokeWidth="0.6" opacity="0.52"/>
          <line x1="0" y1="-7" x2="0" y2="7" stroke={accent} strokeWidth="0.6" opacity="0.52"/>
          <circle cx="0" cy="0" r="2" fill={accent} opacity="0.45"/>
        </g>
      ))}
      {[[w/2,m],[w/2,h-m]].map(([cx,cy],i)=>(
        <g key={`d${i}`} transform={`translate(${cx},${cy})`}>
          <polygon points="0,-3.5 3.5,0 0,3.5 -3.5,0" fill={accent} opacity="0.4"/>
          <line x1="-10" y1="0" x2="-5" y2="0" stroke={accent} strokeWidth="0.5" opacity="0.28"/>
          <line x1="5"   y1="0" x2="10" y2="0" stroke={accent} strokeWidth="0.5" opacity="0.28"/>
        </g>
      ))}
    </svg>
  );
}

/* ─── 文庫表紙 ─── */
function BunkoCover({ book, size="normal", onClick, badge, width:wOvr }) {
  const [hov,setHov] = useState(false);
  const c  = titleToBeige(book.title);
  const w  = wOvr ?? (size==="small"?70:size==="large"?128:94);
  const h  = Math.round(w*1.52);
  const fs = w<80?9.5:w>110?16:12.5;
  const fa = w<80?6.5:w>110?9:8;
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        width:w,height:h,background:c.bg,borderRadius:2,
        position:"relative",cursor:"pointer",flexShrink:0,overflow:"hidden",
        boxShadow:hov?"4px 10px 22px rgba(0,0,0,0.3)":"2px 4px 11px rgba(0,0,0,0.18),inset -1px 0 2px rgba(0,0,0,0.06)",
        transform:hov?"translateY(-5px) rotate(-0.5deg)":"none",
        transition:"all 0.18s ease",
        fontFamily:"'Noto Serif JP','Yu Mincho',serif",
      }}>
      <div style={{position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.012) 3px,rgba(0,0,0,0.013) 4px)"}}/>
      {c.aged>1&&<div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at ${c.aged*25}% ${c.aged*18}%,rgba(140,100,50,0.07) 0%,transparent 68%)`}}/>}
      <OrnamentFrame accent={c.accent} w={w} h={h}/>
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:c.accent,opacity:0.22}}/>
      <div style={{
        position:"absolute",inset:0,
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        padding:size==="small"?"18px 8px 36px":"20px 12px 40px",
        gap:size==="small"?3:5,textAlign:"center",
      }}>
        <div style={{fontSize:fs,fontWeight:700,color:c.ink,letterSpacing:"0.08em",lineHeight:1.4,wordBreak:"break-all"}}>{book.title}</div>
        <div style={{width:size==="small"?22:32,height:"0.5px",background:c.accent,opacity:0.38}}/>
        <div style={{fontSize:fa,color:c.ink,opacity:0.68,letterSpacing:"0.06em"}}>{book.author}</div>
      </div>
      {/* 社章＋青空文庫：飾り罫より十分上に */}
      <div style={{position:"absolute",bottom:size==="small"?17:20,left:0,right:0,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
        <Shacho size={size==="small"?8:10} color={c.accent} opacity={0.48}/>
        <div style={{fontSize:size==="small"?4.5:6,color:c.ink,opacity:0.28,letterSpacing:"0.2em"}}>青空文庫</div>
      </div>
      {badge&&<div style={{position:"absolute",top:9,right:9,fontSize:5.5,color:c.bg,background:c.ink,opacity:0.7,padding:"1px 4px",letterSpacing:"0.1em"}}>{badge}</div>}
    </div>
  );
}

/* ─── ドラッグ可能シークバー（右端=1ページ目） ─── */
function Seekbar({ page, totalPages, bookmarks, onSeek }) {
  const trackRef  = useRef(null);
  const dragging  = useRef(false);

  // 右端=page0、左端=page(totalPages-1)
  // page p の left位置：((totalPages-1-p)/(totalPages-1))*100%
  const pctLeft = p => totalPages<=1 ? 100 : ((totalPages-1-p)/(totalPages-1))*100;

  function pageFromClientX(clientX) {
    if(!trackRef.current) return page;
    const rect = trackRef.current.getBoundingClientRect();
    // 右端=0ページ、左端=最終ページ（x座標は左端が小さい）
    const r = 1 - Math.max(0,Math.min(1,(clientX-rect.left)/rect.width));
    return Math.round(r*(totalPages-1));
  }

  // マウスイベント
  function onMouseDown(e) { e.preventDefault(); dragging.current=true; onSeek(pageFromClientX(e.clientX)); }
  function onMouseMove(e) { if(dragging.current) onSeek(pageFromClientX(e.clientX)); }
  function onMouseUp()    { dragging.current=false; }
  useEffect(()=>{
    window.addEventListener("mousemove",onMouseMove);
    window.addEventListener("mouseup",onMouseUp);
    return()=>{window.removeEventListener("mousemove",onMouseMove);window.removeEventListener("mouseup",onMouseUp);};
  });

  // タッチイベント
  function onTouchStart(e) { e.stopPropagation(); dragging.current=true; onSeek(pageFromClientX(e.touches[0].clientX)); }
  function onTouchMove(e)  { e.stopPropagation(); if(dragging.current) onSeek(pageFromClientX(e.touches[0].clientX)); }
  function onTouchEnd()    { dragging.current=false; }

  return (
    <div
      ref={trackRef}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{height:20,display:"flex",alignItems:"center",cursor:"pointer",userSelect:"none"}}
    >
      <div style={{position:"relative",width:"100%",height:5,background:"rgba(160,130,90,0.18)",borderRadius:2}}>
        {/* 既読バー：右端から現在位置まで */}
        <div style={{
          position:"absolute",right:0,top:0,bottom:0,
          width:`${pctLeft(page)}%`,
          background:"rgba(90,60,20,0.22)",borderRadius:2,
        }}/>
        {/* 栞マーカー */}
        {bookmarks.map((bm,i)=>(
          <div key={i}
            style={{
              position:"absolute",left:`${pctLeft(bm.page)}%`,top:"50%",
              transform:"translate(-50%,-50%)",
              width:11,height:11,borderRadius:"50%",
              background:BM_COLORS[i],border:"1.5px solid rgba(255,255,255,0.75)",
              zIndex:2,pointerEvents:"none",
            }}/>
        ))}
        {/* 現在位置サム */}
        <div style={{
          position:"absolute",left:`${pctLeft(page)}%`,top:"50%",
          transform:"translate(-50%,-50%)",
          width:15,height:15,borderRadius:"50%",
          background:"#3a2010",boxShadow:"0 1px 4px rgba(0,0,0,0.32)",
          zIndex:3,pointerEvents:"none",
        }}/>
      </div>
    </div>
  );
}

/* ─── 上部栞タブ（右上にまとめ、右=最初のページの栞） ─── */
function TopBookmarkTabs({ bookmarks, lastRead, onJump, onReturn }) {
  // 全タブ（栞 + 戻る）をページ番号降順で並べる → 左:大ページ、右:小ページ
  const tabs = [
    ...bookmarks.map((bm, origIdx) => ({ kind:'bm', page:bm.page, origIdx })),
    ...(lastRead!==null ? [{ kind:'return', page:lastRead }] : []),
  ].sort((a,b) => b.page - a.page); // 降順：左が大、右が小
  if(tabs.length===0) return null;
  return (
    <div style={{
      position:"absolute",top:0,right:12,zIndex:8,
      display:"flex",flexDirection:"row",gap:6,
      pointerEvents:"none",
    }}>
      {tabs.map((tab,i)=>{
        if(tab.kind==='return') return (
          <div key="return"
            onClick={e=>{e.stopPropagation();onReturn();}}
            style={{
              width:52,height:36,background:"rgba(80,60,35,0.72)",
              borderRadius:"0 0 5px 5px",cursor:"pointer",pointerEvents:"all",
              boxShadow:"0 2px 6px rgba(0,0,0,0.28)",
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,
            }}>
            <div style={{fontSize:8,color:"rgba(255,255,255,0.65)",letterSpacing:"0.06em"}}>← 戻る</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.88)",fontWeight:600}}>{tab.page+1}p</div>
          </div>
        );
        const color = BM_COLORS[tab.origIdx] ?? BM_COLORS[0];
        return (
          <div key={tab.origIdx}
            onClick={e=>{e.stopPropagation();onJump(tab.page);}}
            style={{
              width:52,height:36,background:color,
              borderRadius:"0 0 5px 5px",cursor:"pointer",pointerEvents:"all",
              boxShadow:"0 2px 6px rgba(0,0,0,0.28)",
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,
            }}>
            <div style={{fontSize:8,color:"rgba(255,255,255,0.68)",letterSpacing:"0.06em"}}>栞{tab.origIdx+1}</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.92)",fontWeight:600}}>{tab.page+1}p</div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Amazonダイアログ ─── */
function AmazonModal({ book, onClose }) {
  const url = `https://www.amazon.co.jp/s?k=${encodeURIComponent(book.author+" "+book.title)}`;
  return (
    <div onClick={onClose}
      style={{position:"fixed",inset:0,zIndex:300,background:"rgba(20,10,0,0.48)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:"#f7f2e8",border:"1px solid #c0a880",padding:"22px 22px 18px",maxWidth:320,width:"88%",boxShadow:"0 8px 32px rgba(0,0,0,0.18)",fontFamily:"'Noto Serif JP','Yu Mincho',serif"}}>
        <div style={{fontSize:14,fontWeight:700,color:"#1a0800",marginBottom:4}}>{book.title}</div>
        <div style={{fontSize:11,color:"#7a6040",marginBottom:16}}>{book.author}</div>
        <a href={url} target="_blank" rel="noopener noreferrer"
          style={{display:"block",background:"#2a1800",color:"#f7f2e8",textDecoration:"none",padding:"10px 16px",textAlign:"center",fontSize:13,letterSpacing:"0.08em",marginBottom:14}}>
          Amazonで紙の本を探す
        </a>
        <div style={{fontSize:9,color:"#9a8060",lineHeight:1.75,letterSpacing:"0.04em",borderTop:"1px solid #d8c8a8",paddingTop:10}}>
          Amazonのアソシエイトとして、当サイトは適格販売により収入を得ています。
        </div>
        <button onClick={onClose}
          style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:"#9a8060",marginTop:10,width:"100%",textAlign:"center",letterSpacing:"0.1em"}}>
          閉じる
        </button>
      </div>
    </div>
  );
}

/* ─── 本ごとの栞・読書位置を localStorage に保存 ─── */
function loadBookProgress(bookId) {
  try { return JSON.parse(localStorage.getItem(`bunko_bm_${bookId}`) || '{}'); } catch { return {}; }
}
function saveBookProgress(bookId, data) {
  try {
    localStorage.setItem(`bunko_bm_${bookId}`, JSON.stringify({ ...loadBookProgress(bookId), ...data }));
  } catch {}
}

/* ─── リーダー ─── */
function PageReader({ book, onClose, fontSize, setFontSize }) {
  const { html, loading: textLoading, error: textError } = useBookText(book);
  const saved     = loadBookProgress(book.id);
  const [page,setPage]             = useState(saved.page ?? 0);
  const [totalPages,setTotalPages] = useState(1);
  const [bookmarks,setBookmarks]   = useState(saved.bookmarks ?? []);
  const [lastRead,setLastRead]     = useState(null);
  const [overlay,setOverlay]       = useState(false);
  const [miniSeek,setMiniSeek]     = useState(false);
  const [amazonModal,setAmazonModal] = useState(false);
  const [copied,setCopied]         = useState(false);
  const [animating,setAnimating]   = useState(false);

  const contentRef = useRef(null);
  const touchStart = useRef(null);
  const pageRef    = useRef(page);

  // HTML・フォントサイズ変更後にカラム数（総ページ数）を測定
  useLayoutEffect(()=>{
    if(!contentRef.current || !html) return;
    const raf = requestAnimationFrame(()=>{
      const el = contentRef.current;
      if(!el) return;
      const total = Math.max(1, Math.round(el.offsetWidth / window.innerWidth));
      setTotalPages(total);
      setPage(p => Math.min(p, total - 1));
    });
    return ()=> cancelAnimationFrame(raf);
  }, [html, fontSize]);

  useEffect(()=>{ pageRef.current = page; }, [page]);
  useEffect(()=>{ saveBookProgress(book.id, { bookmarks }); }, [bookmarks]);
  useEffect(()=>{ return ()=>{ saveBookProgress(book.id, { page: pageRef.current }); }; }, [book.id]);

  if(textLoading) return (
    <div style={{position:"fixed",inset:0,background:"linear-gradient(150deg,#f7f2e8 0%,#ece6d4 100%)",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      fontFamily:"'Noto Serif JP','Yu Mincho',serif",gap:20}}>
      <div style={{fontSize:13,color:"#5a3a18",letterSpacing:"0.2em"}}>{book.title}</div>
      <div style={{fontSize:10,color:"#9a7050",letterSpacing:"0.1em"}}>{book.author}</div>
      <div style={{marginTop:8,width:36,height:36,border:"2px solid #c0a060",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.9s linear infinite"}}/>
      <div style={{fontSize:9,color:"#b09070",letterSpacing:"0.15em",marginTop:4}}>読み込み中…</div>
      <button onClick={onClose} style={{marginTop:20,background:"none",border:"1px solid #c0a880",color:"#7a5a30",padding:"6px 18px",cursor:"pointer",fontSize:10,letterSpacing:"0.1em"}}>キャンセル</button>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );

  if(textError) return (
    <div style={{position:"fixed",inset:0,background:"linear-gradient(150deg,#f7f2e8 0%,#ece6d4 100%)",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      fontFamily:"'Noto Serif JP','Yu Mincho',serif",gap:14,padding:24,textAlign:"center"}}>
      <div style={{fontSize:13,color:"#5a3a18",letterSpacing:"0.1em"}}>{book.title}</div>
      <div style={{fontSize:11,color:"#c05030",letterSpacing:"0.08em",marginTop:4}}>
        {textError==="network"?"通信エラー：テキストを取得できませんでした":"テキストが見つかりません"}
      </div>
      <div style={{fontSize:9,color:"#9a7050",marginTop:2}}>オンライン接続を確認してください</div>
      <button onClick={onClose} style={{marginTop:16,background:"#2a1800",color:"#f7f2e8",border:"none",padding:"8px 24px",cursor:"pointer",fontSize:11,letterSpacing:"0.1em"}}>戻る</button>
    </div>
  );

  const FS=[16,19,22];

  function goNext(){ if(page>=totalPages-1) return; setAnimating(true); setPage(p=>p+1); setTimeout(()=>setAnimating(false),280); }
  function goPrev(){ if(page<=0) return; setAnimating(true); setPage(p=>p-1); setTimeout(()=>setAnimating(false),280); }

  function onTS(e){ touchStart.current={x:e.touches[0].clientX,y:e.touches[0].clientY,locked:null}; }
  function onTM(e){
    const s=touchStart.current; if(!s) return;
    const dx=e.touches[0].clientX-s.x, dy=e.touches[0].clientY-s.y;
    if(s.locked===null){ if(Math.abs(dx)<6&&Math.abs(dy)<6) return; s.locked=Math.abs(dx)>Math.abs(dy)?'h':'v'; }
  }
  function onTE(e){
    e.preventDefault();
    const s=touchStart.current; touchStart.current=null; if(!s) return;
    const dx=e.changedTouches[0].clientX-s.x;
    const dy=e.changedTouches[0].clientY-s.y;
    if(s.locked==='h'&&Math.abs(dx)>40){
      if(dx>0) goNext(); else goPrev();
    } else if(Math.abs(dx)<12&&Math.abs(dy)<12){
      const y=s.y, h=window.innerHeight;
      if(y<60||y>h-50) return;
      const x=s.x, vw=window.innerWidth;
      if(x<60){ goNext(); return; }
      if(x>vw-60){ goPrev(); return; }
      setOverlay(v=>!v); setMiniSeek(false);
    }
  }

  const hasBmHere=!!bookmarks.find(b=>b.page===page);
  function addBm(){ if(bookmarks.length>=MAX_BM||hasBmHere) return; setBookmarks(prev=>[...prev,{page}].sort((a,b)=>a.page-b.page)); }
  function removeBm(p){ setBookmarks(prev=>prev.filter(b=>b.page!==p)); }
  function jumpBm(p){ setLastRead(page); setPage(p); setOverlay(false); }
  function returnLast(){ if(lastRead!==null){setPage(lastRead);setLastRead(null);} }

  const PB="rgba(248,243,234,0.97)";
  const BC="rgba(192,168,136,0.35)";
  const VW=window.innerWidth;

  return (
    <div style={{position:"fixed",inset:0,background:"linear-gradient(150deg,#f7f2e8 0%,#ece6d4 100%)",fontFamily:"'Noto Serif JP','Yu Mincho',serif",userSelect:"none"}}>

      {/* 上部栞タブ */}
      <TopBookmarkTabs bookmarks={bookmarks} lastRead={lastRead} onJump={jumpBm} onReturn={returnLast}/>

      {/* 書名 — 読書中は左上に薄く表示 */}
      {!overlay&&(
        <div style={{position:"absolute",top:0,left:0,right:0,zIndex:5,padding:"10px 14px",pointerEvents:"none"}}>
          <div style={{fontSize:11,color:"rgba(60,35,10,0.38)",letterSpacing:"0.08em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{book.title}</div>
        </div>
      )}

      {/* 本文エリア（タッチ・クリック） */}
      <div
        onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}
        onClick={e=>{
          const y=e.clientY, h=window.innerHeight;
          if(y<60||y>h-50) return;
          const x=e.clientX;
          if(x<60){ goNext(); return; }
          if(x>VW-60){ goPrev(); return; }
          setOverlay(v=>!v); setMiniSeek(false);
        }}
        style={{position:"absolute",inset:0,overflow:"hidden",cursor:"pointer",
          opacity:overlay?0.16:1,transition:"opacity 0.22s"}}
      >
        {/* CSSカラム縦書きコンテナ
            position:absolute; right:0 → 右端基準で content が左に伸びる
            translateX(page * VW) → 右方向にずらして後のページを表示 */}
        <div
          ref={contentRef}
          style={{
            position:"absolute",
            right:0,
            top:0,
            height:"calc(100vh - 80px)",
            marginTop:40,
            writingMode:"vertical-rl",
            textOrientation:"mixed",
            columnWidth:`${VW}px`,
            columnGap:0,
            fontSize,
            lineHeight:1.8,
            letterSpacing:"0.06em",
            color:"#140800",
            padding:"0 20px",
            boxSizing:"border-box",
            transform:`translateX(${page * VW}px)`,
            transition:animating?"transform 0.28s ease":"none",
            willChange:"transform",
          }}
          dangerouslySetInnerHTML={{__html: html || ""}}
        />
      </div>

      {/* ノンブル */}
      {!overlay&&(
        <div onClick={e=>{e.stopPropagation();setMiniSeek(v=>!v);}}
          style={{position:"absolute",bottom:10,left:0,right:0,textAlign:"center",
            fontSize:10,color:"rgba(90,60,20,0.35)",letterSpacing:"0.15em",cursor:"pointer",zIndex:5}}>
          {page+1} / {totalPages}
        </div>
      )}

      {/* ミニシークバー */}
      {miniSeek&&!overlay&&(
        <div onClick={e=>e.stopPropagation()}
          style={{position:"absolute",bottom:30,left:16,right:16,zIndex:12,
            background:PB,border:`1px solid ${BC}`,padding:"12px 14px 10px",boxShadow:"0 2px 16px rgba(0,0,0,0.1)"}}>
          <Seekbar page={page} totalPages={totalPages} bookmarks={bookmarks} onSeek={p=>setPage(p)}/>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:8.5,color:"rgba(80,50,20,0.38)"}}>
            <span>{totalPages}p（末）</span>
            {[...bookmarks].sort((a,b)=>b.page-a.page).map((bm,i)=>{
              const oi=bookmarks.indexOf(bm);
              return <span key={i} style={{color:BM_COLORS[oi]}}>栞{oi+1}:{bm.page+1}p</span>;
            })}
            {lastRead!==null&&<span style={{color:"#aaa"}}>読:{lastRead+1}p</span>}
            <span>1p（頭）</span>
          </div>
        </div>
      )}

      {/* オーバーレイ */}
      {overlay&&(
        <div style={{position:"absolute",inset:0,zIndex:20,display:"flex",flexDirection:"column"}} onClick={()=>setOverlay(false)}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:PB,borderBottom:`1px solid ${BC}`,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
            <button onClick={onClose}
              style={{background:"none",border:`1px solid #c0a880`,cursor:"pointer",padding:"5px 12px",color:"#5a3a18",fontSize:11,letterSpacing:"0.08em",whiteSpace:"nowrap"}}>本を閉じる</button>
            <div style={{flex:1,minWidth:0,padding:"0 4px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1a0800",letterSpacing:"0.06em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{book.title}</div>
              <div style={{fontSize:11,color:"#7a6040",letterSpacing:"0.04em",marginTop:2}}>{book.author}</div>
            </div>
            <button onClick={()=>setAmazonModal(true)}
              style={{background:"none",border:`1px solid #c0a880`,cursor:"pointer",padding:"7px 14px",color:"#5a4030",fontSize:12,letterSpacing:"0.08em",whiteSpace:"nowrap"}}>紙の本を探す</button>
          </div>
          <div style={{flex:1}}/>
          <div onClick={e=>e.stopPropagation()}
            style={{background:PB,borderTop:`1px solid ${BC}`,padding:"16px 16px 32px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
              <span style={{fontSize:10,color:"#9a8060",letterSpacing:"0.1em",minWidth:58}}>文字サイズ</span>
              <div style={{display:"flex",gap:4}}>
                {FS.map(s=>(
                  <button key={s} onClick={()=>setFontSize(s)}
                    style={{width:38,height:34,background:fontSize===s?"#2a1800":"transparent",
                      color:fontSize===s?"#f7f2e8":"#5a4030",border:`1px solid #c0a880`,cursor:"pointer",
                      fontSize:s*0.68,fontFamily:"'Noto Serif JP','Yu Mincho',serif",transition:"all 0.12s"}}>あ</button>
                ))}
              </div>
              <div style={{flex:1}}/>
              <button onClick={async()=>{try{
                const txt=`「${book.title}」${book.author} ${window.location.href}`;
                await navigator.clipboard.writeText(txt);
                setCopied(true);setTimeout(()=>setCopied(false),2000);
              }catch{}}}
                style={{background:"none",border:`1px solid #c0a880`,cursor:"pointer",padding:"5px 12px",
                  color:copied?"#5a9040":"#7a6040",fontSize:10,letterSpacing:"0.05em",whiteSpace:"nowrap"}}>
                {copied?"コピー済！":"URLをコピー"}</button>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:14,flexWrap:"wrap"}}>
              <span style={{fontSize:10,color:"#9a8060",letterSpacing:"0.1em",minWidth:58}}>栞</span>
              {bookmarks.map((bm,i)=>(
                <button key={i} onClick={()=>jumpBm(bm.page)}
                  style={{background:BM_COLORS[i],color:"#f7f2e8",border:"none",padding:"5px 11px",cursor:"pointer",fontSize:10,letterSpacing:"0.06em",borderRadius:2}}>
                  {i+1}: {bm.page+1}p
                </button>
              ))}
              {bookmarks.length<MAX_BM&&!hasBmHere&&(
                <button onClick={addBm}
                  style={{background:"none",border:`1px solid #c0a880`,color:"#5a4030",padding:"5px 11px",cursor:"pointer",fontSize:10,letterSpacing:"0.06em"}}>
                  ＋ 挟む
                </button>
              )}
              {hasBmHere&&(
                <button onClick={()=>removeBm(page)}
                  style={{background:"none",border:`1px solid #c0a880`,color:"#8a5040",padding:"5px 11px",cursor:"pointer",fontSize:10,letterSpacing:"0.06em"}}>
                  ✕ 外す
                </button>
              )}
              {lastRead!==null&&(
                <button onClick={returnLast}
                  style={{background:"none",border:"1px dashed #b0906a",color:"#7a6050",padding:"5px 11px",cursor:"pointer",fontSize:10,letterSpacing:"0.06em"}}>
                  ← 読んでいたページへ
                </button>
              )}
            </div>
            <div>
              <div style={{fontSize:10,color:"#9a8060",marginBottom:4,letterSpacing:"0.1em"}}>{page+1} / {totalPages} ページ</div>
              <Seekbar page={page} totalPages={totalPages} bookmarks={bookmarks} onSeek={p=>setPage(p)}/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:8,color:"rgba(80,50,20,0.35)"}}>
                <span>{totalPages}p（末）</span>
                {[...bookmarks].sort((a,b)=>b.page-a.page).map((bm,i)=>{
                  const oi=bookmarks.indexOf(bm);
                  return <span key={i} style={{color:BM_COLORS[oi]}}>栞{oi+1}:{bm.page+1}p</span>;
                })}
                {lastRead!==null&&<span style={{color:"#bbb"}}>読:{lastRead+1}p</span>}
                <span>1p（頭）</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {amazonModal&&<AmazonModal book={book} onClose={()=>setAmazonModal(false)}/>}
    </div>
  );
}


/* ─── 読みたいボタン ─── */
function WantBtn({ id, wantList, toggle }) {
  const on = wantList.includes(id);
  return (
    <button onClick={e=>{e.stopPropagation();toggle(id);}}
      style={{background:"none",border:"none",cursor:"pointer",padding:"2px 4px",
        fontSize:16,lineHeight:1,color:on?"#8a5a20":"rgba(130,100,60,0.25)",transition:"color 0.15s"}}>
      {on?"★":"☆"}
    </button>
  );
}

/* ─── タブ定義 ─── */
const TABS = ['shelf','search','wantlist'];

/* ─── データ ─── */
const POPULAR = [
  {id:"k773",   title:"こころ",         author:"夏目漱石",   url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000148/files/773_14560.html"},
  {id:"k752",   title:"坊っちゃん",     author:"夏目漱石",   url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000148/files/752_14964.html"},
  {id:"k128",   title:"羅生門",         author:"芥川龍之介", url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000879/files/128_15261.html"},
  {id:"k1567",  title:"走れメロス",     author:"太宰治",     url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000035/files/1567_14913.html"},
  {id:"k46322", title:"銀河鉄道の夜",   author:"宮沢賢治",   url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000081/files/46322_24347.html"},
  {id:"k623",   title:"山月記",         author:"中島敦",     url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000119/files/623_18353.html"},
  {id:"k301",   title:"人間失格",       author:"太宰治",     url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000035/files/301_14912.html"},
  {id:"k538",   title:"舞姫",           author:"森鴎外",     url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000129/files/682_15414.html"},
  {id:"k56041", title:"たけくらべ",     author:"樋口一葉",   url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000064/files/56041_54765.html"},
  {id:"k46349", title:"檸檬",           author:"梶井基次郎", url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000074/files/46349_23843.html"},
  {id:"k789",   title:"吾輩は猫である", author:"夏目漱石",   url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000148/files/789_14547.html"},
  {id:"k92",    title:"蜘蛛の糸",       author:"芥川龍之介", url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000879/files/92_14545.html"},
  {id:"k179",   title:"藪の中",         author:"芥川龍之介", url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000879/files/179_15255.html"},
  {id:"k691",   title:"高瀬舟",         author:"森鴎外",     url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000129/files/691_15352.html"},
];

export default function App() {
  useEffect(()=>{
    if(document.getElementById("nsjp")) return;
    const l=document.createElement("link");
    l.id="nsjp";l.rel="stylesheet";
    l.href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;600;700&display=swap";
    document.head.appendChild(l);
  },[]);

  const [fontSize,setFontSize] = useState(16);
  const [tab,setTab]           = useState("shelf");
  const [shelf,setShelf]       = useState([POPULAR[0],POPULAR[2],POPULAR[3]]);
  const [wantList,setWantList] = useState([]);
  const [reading,setReading]   = useState(null);
  const [query,setQuery]       = useState("");
  const [results,setResults]   = useState(null);
  const [loading,setLoading]   = useState(null);
  const [catEnabled,setCatEnabled]     = useState(false);
  const [dragX,setDragX]               = useState(0);
  const swipeRef                       = useRef(null);
  const [sortOrder,setSortOrder]       = useState('default');
  const [pendingBookId,setPendingBookId] = useState(null);
  const { catalog, loading: catLoading } = useCatalog(catEnabled);

  // ─── ハッシュルーティング ───
  // 本を開いたらURLハッシュを更新
  useEffect(()=>{
    const hash = reading ? '#'+reading.id : '';
    if(window.location.hash !== hash)
      window.history.pushState(null,'', window.location.pathname + hash);
  }, [reading]);

  // ブラウザ戻る/進むでreading状態を同期
  useEffect(()=>{
    function onPop(){
      const id = window.location.hash.slice(1);
      if(!id){ setReading(null); return; }
      const pop = POPULAR.find(b=>b.id===id);
      if(pop){ setReading(pop); return; }
      setPendingBookId(id); setCatEnabled(true);
    }
    window.addEventListener('popstate', onPop);
    return ()=>window.removeEventListener('popstate', onPop);
  }, []);

  // 初回ロード時にハッシュから本を開く
  useEffect(()=>{
    const id = window.location.hash.slice(1);
    if(!id) return;
    window.history.replaceState(null,'', window.location.pathname); // homeエントリ確保
    const pop = POPULAR.find(b=>b.id===id);
    if(pop){ setReading(pop); return; }
    setPendingBookId(id); setCatEnabled(true);
  }, []); // eslint-disable-line

  // カタログロード後にpendingの本を開く
  useEffect(()=>{
    if(!pendingBookId || !catalog) return;
    const book = catalog.find(b=>b.id===pendingBookId);
    if(book) setReading(book);
    setPendingBookId(null);
  }, [catalog, pendingBookId]);

  function switchTab(s){ setTab(s); if(s==="search") setCatEnabled(true); }

  // ホーム画面の横スワイプ（タブ切替）
  function onHomeSwipeStart(e){
    swipeRef.current={x:e.touches[0].clientX,y:e.touches[0].clientY,locked:null};
  }
  function onHomeSwipeMove(e){
    const s=swipeRef.current; if(!s) return;
    const dx=e.touches[0].clientX-s.x, dy=e.touches[0].clientY-s.y;
    if(s.locked===null){
      if(Math.abs(dx)<6&&Math.abs(dy)<6) return;
      s.locked=Math.abs(dx)>Math.abs(dy)?'h':'v';
    }
    if(s.locked==='h') setDragX(dx);
  }
  function onHomeSwipeEnd(e){
    const s=swipeRef.current; swipeRef.current=null; setDragX(0);
    if(!s||s.locked!=='h') return;
    const dx=e.changedTouches[0].clientX-s.x;
    const idx=TABS.indexOf(tab);
    if(dx< -60&&idx<TABS.length-1) switchTab(TABS[idx+1]);
    else if(dx>  60&&idx>0)         switchTab(TABS[idx-1]);
  }

  function toggleWant(id){ setWantList(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]); }
  function save(book){
    if(shelf.length>=MAX_SHELF||shelf.find(b=>b.id===book.id)) return;
    setLoading(book.id);
    setTimeout(()=>{setShelf(p=>[...p,book]);setLoading(null);},650);
  }
  function removeFromShelf(id){ setShelf(prev=>prev.filter(b=>b.id!==id)); }
  function doSearch(e){
    e.preventDefault();
    const q=query.trim();
    if(!q) return setResults(null);
    if(catLoading||!catalog) { setResults(POPULAR.filter(b=>b.title.includes(q)||b.author.includes(q))); return; }
    const found = searchCatalog(q, catalog, 100);
    setResults(found);
  }

  if(reading) return (
    <PageReader book={reading}
      onClose={()=>setReading(null)}
      fontSize={fontSize} setFontSize={setFontSize}/>
  );

  const base={minHeight:"100vh",background:"linear-gradient(150deg,#f7f2e8 0%,#ece6d8 100%)",fontFamily:"'Noto Serif JP','Yu Mincho','Hiragino Mincho Pro',serif"};
  const wantedBooks = POPULAR.filter(b=>wantList.includes(b.id));

  function SaveBtn({ book }) {
    const saved=!!shelf.find(b=>b.id===book.id);
    const full=shelf.length>=MAX_SHELF;
    const isL=loading===book.id;
    return (
      <button onClick={()=>!saved&&!full&&save(book)} disabled={saved||full||isL}
        style={{background:saved?"transparent":"#2a1800",color:saved?"#9a8060":"#f7f2e8",
          border:"1px solid #c0a880",padding:"5px 12px",fontSize:12,
          cursor:saved||full?"default":"pointer",letterSpacing:"0.08em",
          whiteSpace:"nowrap",opacity:isL?0.5:1}}>
        {isL?"…":saved?"保存済":full?`上限${MAX_SHELF}冊`:"書庫へ"}
      </button>
    );
  }

  return (
    <div style={base}>
      {/* ヘッダー */}
      <div style={{padding:"20px 20px 0",display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:9,letterSpacing:"0.4em",color:"#9a8060",marginBottom:3}}>BUNKO BIYORI</div>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <Shacho size={19} color="#8a6a40" opacity={0.62}/>
            <div style={{fontSize:21,fontWeight:700,color:"#1a0800",letterSpacing:"0.05em"}}>文庫びより</div>
          </div>
        </div>
        <div style={{display:"flex"}}>
          {[["shelf","書庫"],["search","検索"],["wantlist","読みたい"]].map(([s,label])=>(
            <button key={s} onClick={()=>switchTab(s)}
              style={{background:tab===s?"#2a1800":"transparent",color:tab===s?"#f7f2e8":"#5a4030",
                border:"1px solid #c0a880",marginLeft:-1,padding:"6px 11px",cursor:"pointer",
                fontSize:13,letterSpacing:"0.1em",transition:"all 0.15s"}}>
              {label}
              {s==="shelf"&&<span style={{fontSize:10,marginLeft:3,opacity:0.5}}>{shelf.length}/{MAX_SHELF}</span>}
              {s==="wantlist"&&wantList.length>0&&<span style={{fontSize:10,marginLeft:3,opacity:0.5}}>{wantList.length}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ─── 横スワイプスライダー ─── */}
      <div style={{overflow:"hidden"}}>
        <div
          onTouchStart={onHomeSwipeStart}
          onTouchMove={onHomeSwipeMove}
          onTouchEnd={onHomeSwipeEnd}
          style={{
            display:"flex",
            touchAction:"pan-y",
            transform:`translateX(calc(-${TABS.indexOf(tab)*100}% + ${dragX}px))`,
            transition:dragX===0?"transform 0.28s ease":"none",
            willChange:"transform",
          }}
        >

          {/* ════ 書庫パネル ════ */}
          <div style={{minWidth:"100%",boxSizing:"border-box",padding:"18px 20px 56px"}}>
            <div style={{fontSize:13,letterSpacing:"0.2em",color:"#9a8060",borderBottom:"1px solid #d0b898",paddingBottom:7,marginBottom:18}}>
              書庫　{shelf.length} 冊 ／ 最大 {MAX_SHELF} 冊
            </div>
            {shelf.length===0?(
              <div style={{textAlign:"center",color:"#9a8060",fontSize:12,letterSpacing:"0.15em",marginTop:48,lineHeight:3}}>
                書庫は空です<br/><span style={{fontSize:10,opacity:0.6}}>検索タブから本を保存できます</span>
              </div>
            ):(
              <>
                <div style={{background:"linear-gradient(180deg,#ddd0b2 0%,#c8b898 100%)",borderRadius:4,padding:"20px 16px 12px",border:"1px solid #b89870",boxShadow:"inset 0 2px 10px rgba(0,0,0,0.1)"}}>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                    {shelf.map((book,i)=>(
                      <div key={book.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                        <BunkoCover book={book} size="normal" onClick={()=>setReading(book)}
                          badge={i===shelf.length-1&&shelf.length>1?"NEW":null}/>
                        <div style={{display:"flex",alignItems:"center",gap:2}}>
                          <WantBtn id={book.id} wantList={wantList} toggle={toggleWant}/>
                          <button
                            onClick={e=>{e.stopPropagation();removeFromShelf(book.id);}}
                            title="書庫から返す"
                            style={{background:"none",border:"1px solid rgba(140,110,70,0.35)",
                              color:"rgba(100,70,40,0.5)",cursor:"pointer",
                              fontSize:11,padding:"2px 6px",letterSpacing:"0.05em",
                              transition:"all 0.12s"}}
                            onMouseEnter={e=>{e.currentTarget.style.color="#8a5030";e.currentTarget.style.borderColor="#c0a060";}}
                            onMouseLeave={e=>{e.currentTarget.style.color="rgba(100,70,40,0.5)";e.currentTarget.style.borderColor="rgba(140,110,70,0.35)";}}>
                            返す
                          </button>
                        </div>
                      </div>
                    ))}
                    {Array.from({length:Math.max(0,Math.min(3,MAX_SHELF-shelf.length))}).map((_,i)=>(
                      <div key={`e${i}`} style={{width:94,height:143,border:"1px dashed rgba(140,110,70,0.25)",opacity:0.4}}/>
                    ))}
                  </div>
                  <div style={{height:5,marginTop:10,background:"linear-gradient(180deg,#b09060 0%,#9a7848 100%)",borderRadius:2,boxShadow:"0 2px 4px rgba(0,0,0,0.16)"}}/>
                </div>
                <div style={{marginTop:10,fontSize:11,color:"#9a8060",textAlign:"center",letterSpacing:"0.14em"}}>
                  表紙をタップして読む　★で読みたい一覧へ
                </div>
              </>
            )}
          </div>

          {/* ════ 検索パネル ════ */}
          <div style={{minWidth:"100%",boxSizing:"border-box",padding:"18px 20px 56px"}}>
            <form onSubmit={doSearch} style={{display:"flex",marginBottom:18}}>
              <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="作品名・著者名で検索"
                style={{flex:1,padding:"10px 14px",border:"1px solid #c0a880",borderRight:"none",
                  background:"rgba(255,255,255,0.6)",fontSize:16,fontFamily:"inherit",outline:"none",color:"#1a0800"}}/>
              <button type="submit" style={{background:"#2a1800",color:"#f7f2e8",border:"none",padding:"10px 16px",cursor:"pointer",fontSize:13,letterSpacing:"0.1em"}}>検索</button>
            </form>

            {catLoading&&<div style={{fontSize:11,color:"#9a7050",letterSpacing:"0.15em",textAlign:"center",padding:"8px 0",marginBottom:8}}>カタログ読み込み中…</div>}
            {results===null&&(
              <>
                <div style={{fontSize:13,letterSpacing:"0.28em",color:"#9a8060",borderBottom:"1px solid #d0b898",paddingBottom:6,marginBottom:16}}>人気ランキング</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                  {POPULAR.map((book,i)=>{
                    const saved=!!shelf.find(b=>b.id===book.id);
                    const full=shelf.length>=MAX_SHELF;
                    const isL=loading===book.id;
                    return (
                      <div key={book.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                        <div style={{position:"relative"}}>
                          <BunkoCover book={book} size="normal" onClick={()=>setReading(book)}/>
                          <div style={{position:"absolute",top:-5,left:-5,width:19,height:19,
                            background:i<3?"#8a5a30":"#6a5040",color:"#f7f2e8",borderRadius:"50%",
                            display:"flex",alignItems:"center",justifyContent:"center",
                            fontSize:10,fontWeight:700,boxShadow:"0 1px 4px rgba(0,0,0,0.22)"}}>{i+1}</div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:3}}>
                          <WantBtn id={book.id} wantList={wantList} toggle={toggleWant}/>
                          <button onClick={()=>!saved&&!full&&save(book)}
                            style={{background:"none",border:"1px solid #c0a880",
                              color:saved?"#9a8060":"#5a4030",padding:"3px 9px",
                              cursor:saved||full?"default":"pointer",fontSize:12,letterSpacing:"0.05em"}}>
                            {isL?"…":saved?"保存済":full?"満杯":"書庫へ"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {results!==null&&(()=>{
              const sorted = sortOrder==='default' ? results
                : [...results].sort((a,b)=>{
                    if(sortOrder==='title')  return (a.yomi||a.title).localeCompare(b.yomi||b.title,'ja');
                    if(sortOrder==='author') return (a.authorYomi||a.author).localeCompare(b.authorYomi||b.author,'ja');
                    if(sortOrder==='popular'){
                      const pi=b=>POPULAR.findIndex(p=>p.title===b.title&&p.author===b.author);
                      const ia=pi(a), ib=pi(b);
                      if(ia>=0&&ib<0) return -1; if(ia<0&&ib>=0) return 1;
                      if(ia>=0&&ib>=0) return ia-ib;
                      return 0;
                    }
                    return 0;
                  });
              return (
              <>
                {/* ソートボタン */}
                <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>
                  {[['default','デフォルト'],['title','作品名順'],['author','著者名順'],['popular','人気順']].map(([s,label])=>(
                    <button key={s} onClick={()=>setSortOrder(s)}
                      style={{background:sortOrder===s?"#2a1800":"transparent",color:sortOrder===s?"#f7f2e8":"#5a4030",
                        border:"1px solid #c0a880",padding:"3px 10px",fontSize:11,cursor:"pointer",letterSpacing:"0.05em"}}>
                      {label}
                    </button>
                  ))}
                </div>
                <div style={{fontSize:13,letterSpacing:"0.2em",color:"#9a8060",borderBottom:"1px solid #d0b898",paddingBottom:6,marginBottom:14}}>
                  {results.length>0?`${results.length} 件（全${catalog?catalog.length.toLocaleString():"？"}作品から）`:"見つかりませんでした"}
                  <button onClick={()=>{setResults(null);setQuery("");}}
                    style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:"#9a8060",marginLeft:10,textDecoration:"underline"}}>
                    ランキングへ戻る
                  </button>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:9}}>
                  {sorted.map(book=>(
                    <div key={book.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:"rgba(255,255,255,0.4)",border:"1px solid rgba(192,168,136,0.28)"}}>
                      <BunkoCover book={book} size="small" onClick={()=>setReading(book)}/>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
                          <div style={{fontSize:14,fontWeight:700,color:"#1a0800"}}>{book.title}</div>
                          <WantBtn id={book.id} wantList={wantList} toggle={toggleWant}/>
                        </div>
                        <div style={{fontSize:11,color:"#7a6040"}}>{book.author}</div>
                        {book.variant&&<div style={{fontSize:10,color:"#b09060",letterSpacing:"0.04em",marginBottom:6}}>{book.variant}</div>}
                        {!book.variant&&<div style={{marginBottom:8}}/>}
                        <button onClick={()=>setReading(book)}
                          style={{background:"none",border:"1px solid #8a6a40",color:"#5a3a18",padding:"4px 12px",cursor:"pointer",fontSize:11,letterSpacing:"0.08em"}}>今すぐ読む</button>
                      </div>
                      <SaveBtn book={book}/>
                    </div>
                  ))}
                </div>
              </>
              );})()}
          </div>

          {/* ════ 読みたいパネル ════ */}
          <div style={{minWidth:"100%",boxSizing:"border-box",padding:"18px 20px 56px"}}>
            <div style={{fontSize:13,letterSpacing:"0.2em",color:"#9a8060",borderBottom:"1px solid #d0b898",paddingBottom:7,marginBottom:18}}>
              読みたい本　{wantedBooks.length} 冊
            </div>
            {wantedBooks.length===0?(
              <div style={{textAlign:"center",color:"#9a8060",fontSize:12,letterSpacing:"0.15em",marginTop:48,lineHeight:3}}>
                まだ登録されていません<br/>
                <span style={{fontSize:10,opacity:0.6}}>ランキングや検索結果の ☆ をタップして追加できます</span>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:9}}>
                {wantedBooks.map(book=>(
                  <div key={book.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:"rgba(255,255,255,0.4)",border:"1px solid rgba(192,168,136,0.28)"}}>
                    <BunkoCover book={book} size="small" onClick={()=>setReading(book)}/>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
                        <div style={{fontSize:14,fontWeight:700,color:"#1a0800"}}>{book.title}</div>
                        <WantBtn id={book.id} wantList={wantList} toggle={toggleWant}/>
                      </div>
                      <div style={{fontSize:11,color:"#7a6040"}}>{book.author}</div>
                      {book.variant&&<div style={{fontSize:10,color:"#b09060",letterSpacing:"0.04em",marginBottom:6}}>{book.variant}</div>}
                      {!book.variant&&<div style={{marginBottom:8}}/>}
                      <button onClick={()=>setReading(book)}
                        style={{background:"none",border:"1px solid #8a6a40",color:"#5a3a18",padding:"4px 12px",cursor:"pointer",fontSize:11,letterSpacing:"0.08em"}}>今すぐ読む</button>
                    </div>
                    <SaveBtn book={book}/>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}


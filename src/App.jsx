import { useState, useRef, useLayoutEffect, useEffect } from "react";

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
function BunkoCover({ book, size="normal", onClick, badge }) {
  const [hov,setHov] = useState(false);
  const c  = titleToBeige(book.title);
  const w  = size==="small"?70:size==="large"?128:94;
  const h  = Math.round(w*1.52);
  const fs = size==="small"?9.5:size==="large"?16:12.5;
  const fa = size==="small"?6.5:size==="large"?9:8;
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
function TopBookmarkTabs({ bookmarks, onJump }) {
  if(bookmarks.length===0) return null;
  // page小さい順＝右から並べる（reverseして左から描画）
  const sorted = [...bookmarks].sort((a,b)=>a.page-b.page); // 小→大
  return (
    <div style={{
      position:"absolute",top:0,right:16,zIndex:8,
      display:"flex",flexDirection:"row",gap:4,
      pointerEvents:"none",
    }}>
      {/* 右が最初のページ → sorted[0]が右端 → flex-direction:row-reverseで右から小ページ順 */}
      {[...sorted].reverse().map((bm,i)=>{
        const origIdx = bookmarks.indexOf(bm);
        const color = BM_COLORS[origIdx] ?? BM_COLORS[0];
        return (
          <div key={i}
            onClick={e=>{e.stopPropagation();onJump(bm.page);}}
            title={`栞${origIdx+1}：${bm.page+1}ページ`}
            style={{
              width:16,height:20,
              background:color,
              borderRadius:"0 0 3px 3px",
              cursor:"pointer",pointerEvents:"all",
              boxShadow:"0 1px 4px rgba(0,0,0,0.22)",
              display:"flex",alignItems:"center",justifyContent:"center",
            }}>
            <div style={{width:4,height:4,background:"rgba(255,255,255,0.55)",borderRadius:"50%"}}/>
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

/* ─── リーダー ─── */
function PageReader({ book, text, onClose, fontSize, setFontSize }) {
  const [page,setPage]               = useState(0);
  const [totalPages,setTotalPages]   = useState(1);
  const [bookmarks,setBookmarks]     = useState([]);
  const [lastRead,setLastRead]       = useState(null);
  const [overlay,setOverlay]         = useState(false);
  const [miniSeek,setMiniSeek]       = useState(false);
  const [amazonModal,setAmazonModal] = useState(false);

  const containerRef = useRef(null);
  const innerRef     = useRef(null);
  const cwRef        = useRef(0);
  const touchStart   = useRef(null);
  const didSwipe     = useRef(false);

  // ページ数を計算する
  useLayoutEffect(()=>{
    if(!containerRef.current||!innerRef.current) return;
    const cw = containerRef.current.clientWidth;
    cwRef.current = cw;
    // scrollWidth がコンテンツ全幅（vertical-rl の場合は横方向に広がる）
    const sw = innerRef.current.scrollWidth;
    const tp = Math.max(1,Math.round(sw/cw));
    setTotalPages(tp);
    setPage(p=>Math.min(p,tp-1));
  });

  /*
   * writing-mode: vertical-rl では：
   *   - 要素の右端（x=totalWidth）が1ページ目（冒頭）、左端（x=0）が末尾
   *   - translateX=0 のとき、コンテナは innerRef の左端（末尾）を表示してしまう
   *   - 冒頭を表示するには innerRef を左にずらす（負のtx）必要がある
   *
   * tx = -(totalPages - 1 - page) * cw
   *   page=0           → tx=-(totalPages-1)*cw → 右端（1ページ目）を表示 ✓
   *   page=totalPages-1 → tx=0                 → 左端（最終ページ）を表示 ✓
   */
  const tx = -(totalPages - 1 - page) * cwRef.current;

  const nextP = ()=>setPage(p=>Math.min(p+1,totalPages-1));
  const prevP = ()=>setPage(p=>Math.max(p-1,0));
  const FS = [13,16,19,22];

  // タッチ判定
  function onTS(e){ touchStart.current={x:e.touches[0].clientX,y:e.touches[0].clientY}; didSwipe.current=false; }
  function onTM(e){ if(touchStart.current&&Math.abs(e.touches[0].clientX-touchStart.current.x)>10) didSwipe.current=true; }
  function onTE(e){
    if(!touchStart.current) return;
    const dx=e.changedTouches[0].clientX-touchStart.current.x;
    const dy=e.changedTouches[0].clientY-touchStart.current.y;
    if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)){
      // 縦書き：左スワイプ=次ページ（左へ進む）、右スワイプ=前ページ
      dx<0 ? nextP() : prevP();
    } else if(!didSwipe.current&&Math.abs(dx)<12&&Math.abs(dy)<12){
      setOverlay(v=>!v); setMiniSeek(false);
    }
    touchStart.current=null;
  }

  const hasBmHere = !!bookmarks.find(b=>b.page===page);
  function addBm(){ if(bookmarks.length>=MAX_BM||hasBmHere) return; setBookmarks(prev=>[...prev,{page}].sort((a,b)=>a.page-b.page)); }
  function removeBm(p){ setBookmarks(prev=>prev.filter(b=>b.page!==p)); }
  function jumpBm(p){ setLastRead(page); setPage(p); setOverlay(false); }
  function returnLast(){ if(lastRead!==null){setPage(lastRead);setLastRead(null);} }

  const PB="rgba(248,243,234,0.97)";
  const BC="rgba(192,168,136,0.35)";

  return (
    <div style={{position:"fixed",inset:0,background:"linear-gradient(150deg,#f7f2e8 0%,#ece6d4 100%)",fontFamily:"'Noto Serif JP','Yu Mincho',serif",userSelect:"none"}}>

      {/* 上部栞タブ（右上にまとめ） */}
      <TopBookmarkTabs bookmarks={bookmarks} onJump={jumpBm}/>

      {/* 書名（左上・薄め、オーバーレイ時は非表示） */}
      {!overlay&&!miniSeek&&(
        <div style={{position:"absolute",top:26,left:14,zIndex:5,fontSize:10,color:"rgba(90,60,20,0.28)",letterSpacing:"0.1em",pointerEvents:"none"}}>
          {book.title}
        </div>
      )}

      {/* 本文 */}
      <div
        ref={containerRef}
        onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}
        onClick={()=>{setOverlay(v=>!v);setMiniSeek(false);}}
        style={{position:"absolute",inset:0,overflow:"hidden",cursor:"pointer",
          opacity:overlay?0.16:1,transition:"opacity 0.22s"}}
      >
        <div ref={innerRef} style={{
          writingMode:"vertical-rl",textOrientation:"mixed",
          height:"100%",
          fontSize,lineHeight:2.25,letterSpacing:"0.08em",color:"#140800",
          whiteSpace:"pre-wrap",
          columnWidth:`${fontSize*2.25*13}px`,columnGap:"44px",columnFill:"auto",
          padding:"40px 24px",
          // 正のtxで右にずらし、1ページ目（右端コンテンツ）を表示
          transform:`translateX(${tx}px)`,
          transition:"transform 0.28s ease",
        }}>{text}</div>
      </div>

      {/* ノンブル（タップでミニシークバー） */}
      {!overlay&&(
        <div
          onClick={e=>{e.stopPropagation();setMiniSeek(v=>!v);}}
          style={{position:"absolute",bottom:10,left:0,right:0,textAlign:"center",
            fontSize:10,color:"rgba(90,60,20,0.35)",letterSpacing:"0.15em",cursor:"pointer",zIndex:5}}
        >
          {page+1} / {totalPages}
        </div>
      )}

      {/* ミニシークバー */}
      {miniSeek&&!overlay&&(
        <div onClick={e=>e.stopPropagation()}
          style={{position:"absolute",bottom:30,left:16,right:16,zIndex:12,
            background:PB,border:`1px solid ${BC}`,padding:"12px 14px 10px",
            boxShadow:"0 2px 16px rgba(0,0,0,0.1)"}}>
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

      {/* オーバーレイ（設定パネル） */}
      {overlay&&(
        <div style={{position:"absolute",inset:0,zIndex:20,display:"flex",flexDirection:"column"}}
          onClick={()=>setOverlay(false)}>
          {/* 上部バー */}
          <div onClick={e=>e.stopPropagation()}
            style={{background:PB,borderBottom:`1px solid ${BC}`,padding:"10px 14px",
              display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <button onClick={onClose}
              style={{background:"none",border:`1px solid #c0a880`,cursor:"pointer",padding:"5px 12px",
                color:"#5a3a18",fontSize:11,letterSpacing:"0.08em",whiteSpace:"nowrap"}}>本を閉じる</button>
            <span style={{fontSize:13,fontWeight:700,color:"#1a0800",letterSpacing:"0.06em",flex:1}}>{book.title}</span>
            <button onClick={()=>setAmazonModal(true)}
              style={{background:"none",border:`1px solid #c0a880`,cursor:"pointer",padding:"5px 12px",
                color:"#7a6040",fontSize:10,letterSpacing:"0.05em",whiteSpace:"nowrap"}}>紙の本を探す</button>
          </div>
          {/* 中央透過（タップで閉じる） */}
          <div style={{flex:1}}/>
          {/* 下部設定 */}
          <div onClick={e=>e.stopPropagation()}
            style={{background:PB,borderTop:`1px solid ${BC}`,padding:"16px 16px 32px"}}>
            {/* 文字サイズ */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
              <span style={{fontSize:10,color:"#9a8060",letterSpacing:"0.1em",minWidth:58}}>文字サイズ</span>
              <div style={{display:"flex",gap:4}}>
                {FS.map(s=>(
                  <button key={s} onClick={()=>setFontSize(s)}
                    style={{width:38,height:34,
                      background:fontSize===s?"#2a1800":"transparent",
                      color:fontSize===s?"#f7f2e8":"#5a4030",
                      border:`1px solid #c0a880`,cursor:"pointer",
                      fontSize:s*0.68,fontFamily:"'Noto Serif JP','Yu Mincho',serif",
                      transition:"all 0.12s"}}>あ</button>
                ))}
              </div>
            </div>
            {/* 栞操作 */}
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:14,flexWrap:"wrap"}}>
              <span style={{fontSize:10,color:"#9a8060",letterSpacing:"0.1em",minWidth:58}}>栞</span>
              {bookmarks.map((bm,i)=>(
                <button key={i} onClick={()=>jumpBm(bm.page)}
                  style={{background:BM_COLORS[i],color:"#f7f2e8",border:"none",
                    padding:"5px 11px",cursor:"pointer",fontSize:10,letterSpacing:"0.06em",borderRadius:2}}>
                  {i+1}: {bm.page+1}p
                </button>
              ))}
              {bookmarks.length<MAX_BM&&!hasBmHere&&(
                <button onClick={addBm}
                  style={{background:"none",border:`1px solid #c0a880`,color:"#5a4030",
                    padding:"5px 11px",cursor:"pointer",fontSize:10,letterSpacing:"0.06em"}}>
                  ＋ 挟む
                </button>
              )}
              {hasBmHere&&(
                <button onClick={()=>removeBm(page)}
                  style={{background:"none",border:`1px solid #c0a880`,color:"#8a5040",
                    padding:"5px 11px",cursor:"pointer",fontSize:10,letterSpacing:"0.06em"}}>
                  ✕ 外す
                </button>
              )}
              {lastRead!==null&&(
                <button onClick={returnLast}
                  style={{background:"none",border:"1px dashed #b0906a",color:"#7a6050",
                    padding:"5px 11px",cursor:"pointer",fontSize:10,letterSpacing:"0.06em"}}>
                  ← 読んでいたページへ
                </button>
              )}
            </div>
            {/* シークバー */}
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

/* ─── データ ─── */
const POPULAR = [
  {id:1,title:"こころ",author:"夏目漱石"},
  {id:2,title:"坊っちゃん",author:"夏目漱石"},
  {id:3,title:"羅生門",author:"芥川龍之介"},
  {id:4,title:"走れメロス",author:"太宰治"},
  {id:5,title:"銀河鉄道の夜",author:"宮沢賢治"},
  {id:6,title:"山月記",author:"中島敦"},
  {id:7,title:"人間失格",author:"太宰治"},
  {id:8,title:"伊豆の踊子",author:"川端康成"},
  {id:9,title:"雪国",author:"川端康成"},
  {id:10,title:"舞姫",author:"森鴎外"},
  {id:11,title:"たけくらべ",author:"樋口一葉"},
  {id:12,title:"檸檬",author:"梶井基次郎"},
];
const SEARCH_POOL = [
  ...POPULAR,
  {id:13,title:"藪の中",author:"芥川龍之介"},
  {id:14,title:"高瀬舟",author:"森鴎外"},
  {id:15,title:"風立ちぬ",author:"堀辰雄"},
  {id:16,title:"蜘蛛の糸",author:"芥川龍之介"},
  {id:17,title:"城の崎にて",author:"志賀直哉"},
];
const DEMO_TEXT = `　隴西の李徴は博学才穎、天宝の末年、若くして名を虎榜に連ね、ついで江南尉に補せられたが、性、狷介、自ら恃むところ頗る厚く、賤吏に甘んずるを潔しとしなかった。いくばくもなく官を辞し、故山に帰臥し、声名の自ら来るを待った。しかし、文名は容易に揚らず、生活は日を逐うて苦しくなる。李徴は漸く焦躁に駆られて来た。

　この頃から、我が臆病な自尊心と、尊大な羞恥心とは、とうとう李徴をして発狂せしめた。ある秋の夜半、うなされて目を覚した李徴は、突然叫声を挙げながら暗夜の中に飛び出した。そのまま行方不明になった。

　翌年、旧友の袁傪が勅命をおびて嶺南に赴く途中、清晨、汝水のほとりを過ぎたとき、叢の中から声あって告げた。
「今は亡き李徴である。このままでは済まぬと思っていたが、やはりこうなった」
　袁傪は驚いて馬を止めた。声は続けた。自分は今や異類の身となり果てているが、かつての友人に最後の言葉を残したい。詩稿を世に残してほしいと懇願した。

　虎となった李徴が語った詩は、確かに一流の作品であった。しかしどこか微妙なところで、第一流の作品とは言い難かった。なぜ、もっと修業しなかったのか——袁傪はそう思った。

　李徴は言った。自分は詩人として名を成すことよりも、臆病な自尊心のために、師に就いて学ぶことを恥と感じていた。そして尊大な羞恥心のために、真の交わりをすることも恐れていた。

　人間は誰でも猛獣使いであり、その猛獣に当たるのが各人の性情だという。己の場合、この猛獣が、ついに自分を食い破った。

　夜が白み始める頃、虎は再び叢の中に消えた。袁傪は暫く佇んで、友人の面影を偲んだ。

　これが山月記の、李徴という男の物語である。彼の詩は後世に伝わることなく、ただその悲劇だけが語り継がれた。人は誰も孤独な生き物である。その孤独を誰かに打ち明けることができれば、あるいは別の道があったかもしれない。

　月が高く昇り、山の稜線を照らしていた。どこかで虎の咆哮が聞こえたような気がした。

　なぜ彼は、ついに人間でいられなかったのか——。`;

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

/* ─── メインアプリ ─── */
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
    setResults(!q?SEARCH_POOL:SEARCH_POOL.filter(b=>b.title.includes(q)||b.author.includes(q)));
  }

  if(reading) return (
    <PageReader book={reading} text={DEMO_TEXT}
      onClose={()=>setReading(null)}
      fontSize={fontSize} setFontSize={setFontSize}/>
  );

  const base={minHeight:"100vh",background:"linear-gradient(150deg,#f7f2e8 0%,#ece6d8 100%)",fontFamily:"'Noto Serif JP','Yu Mincho','Hiragino Mincho Pro',serif"};
  const wantedBooks = SEARCH_POOL.filter(b=>wantList.includes(b.id));

  function SaveBtn({ book }) {
    const saved=!!shelf.find(b=>b.id===book.id);
    const full=shelf.length>=MAX_SHELF;
    const isL=loading===book.id;
    return (
      <button onClick={()=>!saved&&!full&&save(book)} disabled={saved||full||isL}
        style={{background:saved?"transparent":"#2a1800",color:saved?"#9a8060":"#f7f2e8",
          border:"1px solid #c0a880",padding:"5px 12px",fontSize:10,
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
            <button key={s} onClick={()=>setTab(s)}
              style={{background:tab===s?"#2a1800":"transparent",color:tab===s?"#f7f2e8":"#5a4030",
                border:"1px solid #c0a880",marginLeft:-1,padding:"6px 11px",cursor:"pointer",
                fontSize:10,letterSpacing:"0.1em",transition:"all 0.15s"}}>
              {label}
              {s==="shelf"&&<span style={{fontSize:8,marginLeft:3,opacity:0.5}}>{shelf.length}/{MAX_SHELF}</span>}
              {s==="wantlist"&&wantList.length>0&&<span style={{fontSize:8,marginLeft:3,opacity:0.5}}>{wantList.length}</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"18px 20px 56px"}}>

        {/* ════ 書庫 ════ */}
        {tab==="shelf"&&(
          <>
            <div style={{fontSize:10,letterSpacing:"0.2em",color:"#9a8060",borderBottom:"1px solid #d0b898",paddingBottom:7,marginBottom:18}}>
              オフライン書庫　{shelf.length} 冊 ／ 最大 {MAX_SHELF} 冊
            </div>
            {shelf.length===0?(
              <div style={{textAlign:"center",color:"#9a8060",fontSize:12,letterSpacing:"0.15em",marginTop:48,lineHeight:3}}>
                書庫は空です<br/><span style={{fontSize:10,opacity:0.6}}>検索タブから本を保存できます</span>
              </div>
            ):(
              <>
                <div style={{background:"linear-gradient(180deg,#ddd0b2 0%,#c8b898 100%)",borderRadius:4,padding:"20px 16px 12px",border:"1px solid #b89870",boxShadow:"inset 0 2px 10px rgba(0,0,0,0.1)"}}>
                  <div style={{display:"flex",flexWrap:"wrap",gap:12,alignItems:"flex-end",minHeight:80}}>
                    {shelf.map((book,i)=>(
                      <div key={book.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                        <BunkoCover book={book} size="normal" onClick={()=>setReading(book)}
                          badge={i===shelf.length-1&&shelf.length>1?"NEW":null}/>
                        <div style={{display:"flex",alignItems:"center",gap:2}}>
                          <WantBtn id={book.id} wantList={wantList} toggle={toggleWant}/>
                          {/* 本を返すボタン */}
                          <button
                            onClick={e=>{e.stopPropagation();removeFromShelf(book.id);}}
                            title="書庫から返す"
                            style={{background:"none",border:"1px solid rgba(140,110,70,0.35)",
                              color:"rgba(100,70,40,0.5)",cursor:"pointer",
                              fontSize:8,padding:"2px 6px",letterSpacing:"0.05em",
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
                <div style={{marginTop:10,fontSize:10,color:"#9a8060",textAlign:"center",letterSpacing:"0.14em"}}>
                  表紙をタップして読む　★で読みたい一覧へ
                </div>
              </>
            )}
          </>
        )}

        {/* ════ 検索 ════ */}
        {tab==="search"&&(
          <>
            <form onSubmit={doSearch} style={{display:"flex",marginBottom:18}}>
              <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="作品名・著者名で検索"
                style={{flex:1,padding:"10px 14px",border:"1px solid #c0a880",borderRight:"none",
                  background:"rgba(255,255,255,0.6)",fontSize:14,fontFamily:"inherit",outline:"none",color:"#1a0800"}}/>
              <button type="submit" style={{background:"#2a1800",color:"#f7f2e8",border:"none",padding:"10px 16px",cursor:"pointer",fontSize:12,letterSpacing:"0.1em"}}>検索</button>
            </form>

            {results===null&&(
              <>
                <div style={{fontSize:10,letterSpacing:"0.28em",color:"#9a8060",borderBottom:"1px solid #d0b898",paddingBottom:6,marginBottom:16}}>人気ランキング</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:14}}>
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
                            fontSize:8,fontWeight:700,boxShadow:"0 1px 4px rgba(0,0,0,0.22)"}}>{i+1}</div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:3}}>
                          <WantBtn id={book.id} wantList={wantList} toggle={toggleWant}/>
                          <button onClick={()=>!saved&&!full&&save(book)}
                            style={{background:"none",border:"1px solid #c0a880",
                              color:saved?"#9a8060":"#5a4030",padding:"3px 9px",
                              cursor:saved||full?"default":"pointer",fontSize:9,letterSpacing:"0.05em"}}>
                            {isL?"…":saved?"保存済":full?"満杯":"書庫へ"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {results!==null&&(
              <>
                <div style={{fontSize:10,letterSpacing:"0.2em",color:"#9a8060",borderBottom:"1px solid #d0b898",paddingBottom:6,marginBottom:14}}>
                  {results.length>0?`${results.length} 件`:"見つかりませんでした"}
                  <button onClick={()=>{setResults(null);setQuery("");}}
                    style={{background:"none",border:"none",cursor:"pointer",fontSize:9,color:"#9a8060",marginLeft:10,textDecoration:"underline"}}>
                    ランキングへ戻る
                  </button>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:9}}>
                  {results.map(book=>(
                    <div key={book.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:"rgba(255,255,255,0.4)",border:"1px solid rgba(192,168,136,0.28)"}}>
                      <BunkoCover book={book} size="small" onClick={()=>setReading(book)}/>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
                          <div style={{fontSize:14,fontWeight:700,color:"#1a0800"}}>{book.title}</div>
                          <WantBtn id={book.id} wantList={wantList} toggle={toggleWant}/>
                        </div>
                        <div style={{fontSize:11,color:"#7a6040",marginBottom:8}}>{book.author}</div>
                        <button onClick={()=>setReading(book)}
                          style={{background:"none",border:"1px solid #8a6a40",color:"#5a3a18",padding:"4px 12px",cursor:"pointer",fontSize:10,letterSpacing:"0.08em"}}>今すぐ読む</button>
                      </div>
                      <SaveBtn book={book}/>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ════ 読みたい ════ */}
        {tab==="wantlist"&&(
          <>
            <div style={{fontSize:10,letterSpacing:"0.2em",color:"#9a8060",borderBottom:"1px solid #d0b898",paddingBottom:7,marginBottom:18}}>
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
                      <div style={{fontSize:11,color:"#7a6040",marginBottom:8}}>{book.author}</div>
                      <button onClick={()=>setReading(book)}
                        style={{background:"none",border:"1px solid #8a6a40",color:"#5a3a18",padding:"4px 12px",cursor:"pointer",fontSize:10,letterSpacing:"0.08em"}}>今すぐ読む</button>
                    </div>
                    <SaveBtn book={book}/>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

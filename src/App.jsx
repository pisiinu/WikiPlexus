import { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react"; // useLayoutEffect: scroll restore
import { useBookText, precacheBook, deleteBookCache } from "./hooks/useBookText.js";
import { useCatalog, searchCatalog } from "./hooks/useCatalog.js";

const MAX_BM = 3;
// 茶系3色
const BM_COLORS = ["#7a4a20","#a07040","#5a3818"];
// PWA（ホーム画面から起動）かブラウザ内かを判定
const IS_STANDALONE = window.navigator.standalone === true
  || window.matchMedia('(display-mode: standalone)').matches;

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

/* ─── ドラッグ可能シークバー（右端=冒頭、左端=末尾） ─── */
function Seekbar({ ratio, bookmarks, onSeek, onJumpBm, lastReadRatio, onReturn }) {
  const trackRef = useRef(null);
  const drag     = useRef(null); // { startX, moved }

  // ratio 0=冒頭(右端)、1=末尾(左端)
  const pctLeft = r => (1 - r) * 100;

  function ratioFromClientX(clientX) {
    if(!trackRef.current) return ratio;
    const rect = trackRef.current.getBoundingClientRect();
    return Math.min(1, Math.max(0, 1 - (clientX - rect.left) / rect.width));
  }

  // マウス：移動があったときだけseek（タップは無視）
  function onMouseDown(e) { e.preventDefault(); drag.current={ startX:e.clientX, moved:false }; }
  function onMouseMove(e) {
    const d=drag.current; if(!d) return;
    if(!d.moved && Math.abs(e.clientX-d.startX)>4) d.moved=true;
    if(d.moved) onSeek(ratioFromClientX(e.clientX));
  }
  function onMouseUp() { drag.current=null; }
  useEffect(()=>{
    window.addEventListener("mousemove",onMouseMove);
    window.addEventListener("mouseup",onMouseUp);
    return()=>{window.removeEventListener("mousemove",onMouseMove);window.removeEventListener("mouseup",onMouseUp);};
  });

  // タッチ：移動があったときだけseek（タップは無視）
  function onTouchStart(e) { e.stopPropagation(); drag.current={ startX:e.touches[0].clientX, moved:false }; }
  function onTouchMove(e)  {
    e.stopPropagation();
    const d=drag.current; if(!d) return;
    if(!d.moved && Math.abs(e.touches[0].clientX-d.startX)>4) d.moved=true;
    if(d.moved) onSeek(ratioFromClientX(e.touches[0].clientX));
  }
  function onTouchEnd() { drag.current=null; }

  return (
    <div
      ref={trackRef}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      style={{height:20,display:"flex",alignItems:"center",cursor:"pointer",userSelect:"none"}}
    >
      <div style={{position:"relative",width:"100%",height:5,background:"rgba(160,130,90,0.18)",borderRadius:2}}>
        {/* 既読バー */}
        <div style={{
          position:"absolute",right:0,top:0,bottom:0,
          width:`${ratio*100}%`,
          background:"rgba(90,60,20,0.22)",borderRadius:2,
        }}/>
        {/* 「読んでいた場所」マーカー（タップでジャンプ） */}
        {lastReadRatio!=null&&(
          <div onClick={e=>{e.stopPropagation();onReturn&&onReturn();}}
            style={{
              position:"absolute",left:`${pctLeft(lastReadRatio)}%`,top:"50%",
              transform:"translate(-50%,-50%) rotate(45deg)",
              width:9,height:9,
              background:"rgba(100,100,110,0.55)",border:"1.5px solid rgba(255,255,255,0.75)",
              zIndex:2,cursor:"pointer",pointerEvents:"all",
            }}/>
        )}
        {/* 栞マーカー（タップでジャンプ） */}
        {bookmarks.map((bm,i)=>(
          <div key={i}
            onClick={e=>{e.stopPropagation();onJumpBm&&onJumpBm(bm);}}
            style={{
              position:"absolute",left:`${pctLeft(bm.ratio)}%`,top:"50%",
              transform:"translate(-50%,-50%)",
              width:11,height:11,borderRadius:"50%",
              background:BM_COLORS[i],border:"1.5px solid rgba(255,255,255,0.75)",
              zIndex:2,cursor:"pointer",pointerEvents:"all",
            }}/>
        ))}
        {/* 現在位置サム */}
        <div style={{
          position:"absolute",left:`${pctLeft(ratio)}%`,top:"50%",
          transform:"translate(-50%,-50%)",
          width:15,height:15,borderRadius:"50%",
          background:"#3a2010",boxShadow:"0 1px 4px rgba(0,0,0,0.32)",
          zIndex:3,pointerEvents:"none",
        }}/>
      </div>
    </div>
  );
}

/* ─── 上部栞タブ（右上にまとめ、右=冒頭寄りの栞） ─── */
function TopBookmarkTabs({ bookmarks, lastReadRatio, onJump, onReturn }) {
  const tabs = [
    ...bookmarks.map((bm, origIdx) => ({ kind:'bm', ratio:bm.ratio, pct:bm.pct, charOffset:bm.charOffset, origIdx })),
    ...(lastReadRatio!==null ? [{ kind:'return', ratio:lastReadRatio, pct:Math.round(lastReadRatio*100) }] : []),
  ].sort((a,b) => b.ratio - a.ratio); // 降順：左が末尾寄り、右が冒頭寄り
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
            <div style={{fontSize:9,color:"rgba(255,255,255,0.88)",fontWeight:600}}>{tab.pct}%</div>
          </div>
        );
        const color = BM_COLORS[tab.origIdx] ?? BM_COLORS[0];
        return (
          <div key={tab.origIdx}
            onClick={e=>{e.stopPropagation();onJump({ratio:tab.ratio,charOffset:tab.charOffset});}}
            style={{
              width:52,height:36,background:color,
              borderRadius:"0 0 5px 5px",cursor:"pointer",pointerEvents:"all",
              boxShadow:"0 2px 6px rgba(0,0,0,0.28)",
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,
            }}>
            <div style={{fontSize:8,color:"rgba(255,255,255,0.68)",letterSpacing:"0.06em"}}>栞{tab.origIdx+1}</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.92)",fontWeight:600}}>{tab.pct}%</div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Amazonダイアログ ─── */
function AmazonModal({ book, onClose }) {
  const url = `https://www.amazon.co.jp/s?k=${encodeURIComponent(book.author+" "+book.title)}&tag=hana0f-22`;
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


/* ─── HTML を <br> 区切りで分割（長編のレイジーレンダリング用） ─── */
const CHUNK_SIZE     = 20000; // chars
const INIT_CHUNKS    = 2;     // 初回描画チャンク数（レイジーロードで増加）

function splitChunks(html) {
  const chunks = [];
  let start = 0;
  while (start < html.length) {
    const end0 = start + CHUNK_SIZE;
    if (end0 >= html.length) { chunks.push(html.slice(start)); break; }
    // CHUNK_SIZE 以降の最初の <br> で区切る（タグの途中を避ける）
    const br = html.indexOf('<br>', end0);
    const end = (br !== -1 && br < end0 + 20000) ? br + 4 : end0;
    chunks.push(html.slice(start, end));
    start = end;
  }
  return chunks;
}

/* ─── リーダー ─── */
function PageReader({ book, onClose, fontSize, setFontSize }) {
  const { html, loading: textLoading, error: textError } = useBookText(book);
  const saved = loadBookProgress(book.id);

  const [currentPage, setCurrentPage] = useState(saved.currentPage ?? 0);
  const [totalPages, setTotalPages]   = useState(1);
  const [bookmarks, setBookmarks]     = useState(saved.bookmarks ?? []);
  const [lastReadPage, setLastReadPage] = useState(null);
  const [overlay, setOverlay]         = useState(false);
  const [amazonModal, setAmazonModal] = useState(false);
  const [copied, setCopied]           = useState(false);

  const [lineHeight, setLineHeight] = useState(1.8); // 端末幅に合わせて動的計算

  const containerRef        = useRef(null);
  const contentRef          = useRef(null); // 本文 div（直接 DOM 操作）
  const currentPageRef      = useRef(saved.currentPage ?? 0);
  const pageAnchorRef       = useRef(null); // フォントサイズ変更時の文字オフセットアンカー
  const savedPageAnchorRef  = useRef(null); // 通常読書中に最後に記録したアンカー（オーバーレイ外で更新）
  const chunksRef           = useRef([]);
  const renderedCountRef    = useRef(0);
  const touchRef            = useRef(null); // { startX, startY }
  const suppressScrollRef   = useRef(false);
  const suppressAutoClearRef = useRef(false); // 大ジャンプ中は lastReadPage 自動消去を抑制
  const autoClearTimerRef   = useRef(null);

  function getPageWidth() {
    return containerRef.current?.clientWidth ?? window.innerWidth;
  }

  function computeTotalPages() {
    const el = containerRef.current;
    if (!el) return 1;
    return Math.max(1, Math.round(el.scrollWidth / getPageWidth()));
  }

  // 現在ページの最初の文字のオフセットを取得（右上コーナーから）
  function capturePageAnchor() {
    const content = contentRef.current;
    if (!content) return null;
    const x = window.innerWidth - 8;
    const y = 60;
    try {
      let range = null;
      if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(x, y);
      } else if (document.caretPositionFromPoint) {
        const pos = document.caretPositionFromPoint(x, y);
        if (pos) { range = document.createRange(); range.setStart(pos.offsetNode, pos.offset); }
      }
      if (!range || !content.contains(range.startContainer)) return null;
      const pre = document.createRange();
      pre.selectNodeContents(content);
      pre.setEnd(range.startContainer, range.startOffset);
      return pre.toString().length;
    } catch { return null; }
  }

  // 文字オフセットがどのページにあるかを求める（scrollLeft=0 基準で計算）
  function findPageForCharOffset(charOffset) {
    if (charOffset == null) return 0;
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return 0;

    suppressScrollRef.current = true;
    const savedScrollLeft = container.scrollLeft;
    container.scrollLeft = 0; // RTL: scrollLeft=0 → 右端（冒頭）を表示

    let page = 0;
    try {
      const pageWidth = getPageWidth();
      let accumulated = 0;
      const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const len = node.textContent.length;
        if (accumulated + len > charOffset) {
          const charIdx = charOffset - accumulated;
          const r = document.createRange();
          r.setStart(node, charIdx);
          r.setEnd(node, Math.min(charIdx + 1, len));
          const rect = r.getBoundingClientRect();
          const containerRight = container.getBoundingClientRect().right;
          // scrollLeft=0 のとき、ページnの要素は右端から n*pageWidth 分左にある
          page = Math.max(0, Math.floor((containerRight - rect.right) / pageWidth));
          break;
        }
        accumulated += len;
      }
    } catch {}

    container.scrollLeft = savedScrollLeft;
    suppressScrollRef.current = false;
    return page;
  }

  // レイジーロード：ページnが描画済み範囲の末尾3ページ以内なら追加描画
  function checkLazyLoad(page) {
    const chunks = chunksRef.current;
    const rc = renderedCountRef.current;
    if (!contentRef.current || rc >= chunks.length) return false;
    const container = containerRef.current;
    if (!container) return false;
    const renderedPages = Math.round(container.scrollWidth / getPageWidth());
    if (page >= renderedPages - 3) {
      const next = Math.min(rc + 2, chunks.length);
      for (let i = rc; i < next; i++)
        contentRef.current.insertAdjacentHTML('beforeend', chunks[i]);
      renderedCountRef.current = next;
      setTotalPages(computeTotalPages());
      return true;
    }
    return false;
  }

  // 全チャンクを即時描画（seekbar ジャンプ・bookmark 復元時に呼ぶ）
  function ensureAllChunks() {
    const chunks = chunksRef.current;
    if (!contentRef.current || renderedCountRef.current >= chunks.length) return false;
    contentRef.current.innerHTML = chunks.join('');
    renderedCountRef.current = chunks.length;
    return true;
  }

  // 指定ページへ移動
  function goToPage(n, animate = false) {
    const el = containerRef.current;
    if (!el) return;
    checkLazyLoad(n);
    const tp = computeTotalPages();
    setTotalPages(tp);
    const page = Math.max(0, Math.min(n, tp - 1));
    const isLargeJump = Math.abs(page - currentPageRef.current) > 2;
    const targetLeft = -(page * getPageWidth());
    if (animate) {
      el.scrollTo({ left: targetLeft, behavior: 'smooth' });
    } else {
      el.scrollLeft = targetLeft;
    }
    currentPageRef.current = page;
    setCurrentPage(page);
    // 大ジャンプ（栞・seekbar）中は lastReadPage 自動消去を抑制
    if (isLargeJump) {
      suppressAutoClearRef.current = true;
      if (autoClearTimerRef.current) clearTimeout(autoClearTimerRef.current);
      autoClearTimerRef.current = setTimeout(() => {
        suppressAutoClearRef.current = false;
      }, 600);
    }
  }

  // html 読み込み後：行高確定 → チャンク分割 → 初回描画 → ページ位置復元
  useEffect(() => {
    if (!html || !contentRef.current) return;
    // 初回ロード時に lineHeight を確定（useLayoutEffect は html 変化では動かないため）
    if (containerRef.current) {
      const colWidth = containerRef.current.clientWidth || window.innerWidth;
      const linesPerPage = Math.max(6, Math.floor(colWidth / (fontSize * 3.3)));
      setLineHeight(colWidth / (linesPerPage * fontSize));
    }
    const chunks = splitChunks(html);
    chunksRef.current = chunks;
    renderedCountRef.current = Math.min(INIT_CHUNKS, chunks.length);
    contentRef.current.innerHTML = chunks.slice(0, renderedCountRef.current).join('');
    // lineHeight state 更新後のレイアウトで計算するため 2フレーム待つ
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const tp = computeTotalPages();
      setTotalPages(tp);
      const savedPage = Math.min(saved.currentPage ?? 0, tp - 1);
      goToPage(savedPage);
    }));
  }, [html]); // eslint-disable-line

  // フォントサイズ変更後：行高を端末幅で割り切れる値に調整 + charOffset アンカーでページ復元
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    // 端末幅 / (fontSize × 行高) が整数になるよう lineHeight を計算
    // → ページ境界が必ず行間に来るので文字の泣き別れを防ぐ
    const colWidth = containerRef.current.clientWidth || window.innerWidth;
    const linesPerPage = Math.max(6, Math.floor(colWidth / (fontSize * 3.3)));
    setLineHeight(colWidth / (linesPerPage * fontSize));

    if (!html) return;
    const anchor = pageAnchorRef.current;
    if (anchor == null) return;
    const raf = requestAnimationFrame(() => {
      pageAnchorRef.current = null;
      ensureAllChunks();
      const tp = computeTotalPages();
      setTotalPages(tp);
      const page = findPageForCharOffset(anchor);
      goToPage(page);
    });
    return () => cancelAnimationFrame(raf);
  }, [fontSize]); // eslint-disable-line

  // オーバーレイを閉じた後 / ページが変わった後に読書位置アンカーを更新
  // （オーバーレイ表示中は caretRangeFromPoint がオーバーレイに当たるため更新しない）
  useEffect(() => {
    if (overlay) return;
    const raf = requestAnimationFrame(() => {
      const anchor = capturePageAnchor();
      if (anchor != null) savedPageAnchorRef.current = anchor;
    });
    return () => cancelAnimationFrame(raf);
  }, [currentPage, overlay]); // eslint-disable-line

  useEffect(() => { saveBookProgress(book.id, { bookmarks }); }, [bookmarks]);
  useEffect(() => {
    return () => { saveBookProgress(book.id, { currentPage: currentPageRef.current }); };
  }, [book.id]);

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

  const FS = [13, 16, 19, 22];

  // スクロールイベント：アニメーション中のページ更新 + レイジーロード + 戻るマーカー自動消去
  function onScroll() {
    if (suppressScrollRef.current) return;
    const el = containerRef.current; if (!el) return;
    const pageWidth = getPageWidth();
    const page = Math.round(-el.scrollLeft / pageWidth);
    if (page !== currentPageRef.current) {
      currentPageRef.current = page;
      setCurrentPage(page);
      // 「読んでいた場所」に到達したらマーカーを自動消去
      // 大ジャンプ中（栞・seekbar）は suppressAutoClearRef で抑制
      if (!suppressAutoClearRef.current) {
        setLastReadPage(prev => (prev !== null && page >= prev) ? null : prev);
      }
    }
    checkLazyLoad(page);
  }

  // seekbar ドラッグ → ページジャンプ（戻るマーカーは設定しない）
  function onSeek(r) {
    const needsRender = ensureAllChunks();
    if (needsRender) setTotalPages(computeTotalPages());
    requestAnimationFrame(() => {
      const tp = computeTotalPages();
      setTotalPages(tp);
      goToPage(Math.round(r * Math.max(1, tp - 1)), true);
    });
  }

  function goForward() { goToPage(currentPageRef.current + 1, true); }
  function goBack()    { goToPage(currentPageRef.current - 1, true); }

  const ratio = currentPage / Math.max(1, totalPages - 1);
  const progress = Math.round(ratio * 100);
  const lastReadRatio = lastReadPage !== null ? lastReadPage / Math.max(1, totalPages - 1) : null;
  const hasBmHere = bookmarks.some(b => Math.abs(b.ratio - ratio) < 0.015);

  function addBm() {
    if (bookmarks.length >= MAX_BM || hasBmHere) return;
    const charOffset = capturePageAnchor();
    setBookmarks(prev => [...prev, { ratio, pct: Math.round(ratio * 100), charOffset }].sort((a, b) => a.ratio - b.ratio));
  }
  function removeBmAt(r) { setBookmarks(prev => prev.filter(b => Math.abs(b.ratio - r) > 0.015)); }
  function jumpBm(bm) {
    setLastReadPage(prev => prev ?? currentPageRef.current);
    if (bm.charOffset != null) {
      ensureAllChunks();
      requestAnimationFrame(() => {
        setTotalPages(computeTotalPages());
        goToPage(findPageForCharOffset(bm.charOffset), true);
      });
    } else {
      onSeek(bm.ratio);
    }
    setOverlay(false);
  }
  function returnLast() {
    if (lastReadPage !== null) { goToPage(lastReadPage, true); setLastReadPage(null); }
  }

  // タッチ：スワイプでページ送り
  function onTouchStart(e) {
    touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY };
  }
  function onTouchEnd(e) {
    const t = touchRef.current; if (!t) return; touchRef.current = null;
    const dx = e.changedTouches[0].clientX - t.startX;
    const dy = e.changedTouches[0].clientY - t.startY;
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
      // タップ判定
      const x = e.changedTouches[0].clientX, y = e.changedTouches[0].clientY;
      const h = window.innerHeight, vw = window.innerWidth;
      if (y < 60 || y > h - 50) return;
      if (x < 70) { goForward(); return; }
      if (x > vw - 70) { goBack(); return; }
      setOverlay(v => !v);
      return;
    }
    if (Math.abs(dx) > Math.abs(dy) * 0.6 && Math.abs(dx) > 30) {
      // 右スワイプ(dx>0)→先へ、左スワイプ(dx<0)→戻る（日本語縦書き右開き）
      if (dx > 0) goForward(); else goBack();
    }
  }

  // マウスクリック（デスクトップ）
  function onContainerClick(e) {
    // touchEnd で処理済みの場合はスキップ（touch + click の二重処理防止）
    if (touchRef.current !== null) return;
    const { clientX: x, clientY: y } = e;
    const h = window.innerHeight, vw = window.innerWidth;
    if (y < 60 || y > h - 50) return;
    if (x < 70) { goForward(); return; }
    if (x > vw - 70) { goBack(); return; }
    setOverlay(v => !v);
  }

  const PB = "rgba(248,243,234,0.97)";
  const BC = "rgba(192,168,136,0.35)";

  return (
    <div style={{position:"fixed",inset:0,background:"linear-gradient(150deg,#f7f2e8 0%,#ece6d4 100%)",fontFamily:"'Noto Serif JP','Yu Mincho',serif",userSelect:"none"}}>
      <style>{`
        .bunko-scroll::-webkit-scrollbar{display:none}
        .bunko-scroll{-ms-overflow-style:none;scrollbar-width:none}
        ruby{ruby-position:over;break-inside:avoid;-webkit-column-break-inside:avoid}
        rt{font-size:0.5em;line-height:1}
        .gaiji{font-family:'Noto Serif JP','HiraMinProN-W3','Hiragino Mincho ProN','Hiragino Mincho Pro',serif}
        .sd{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Ccircle cx='5' cy='5' r='4.5' fill='%23140800'/%3E%3C/svg%3E");background-size:0.3em 0.3em;background-repeat:no-repeat;background-position:right center}
        blockquote,pre{font-size:inherit;font-family:inherit}
        em.white_sesame_dot,em.白ゴマ傍点,strong.WHITE_SESAME_DOT{font-style:normal;font-weight:normal;-webkit-text-emphasis:open sesame;text-emphasis:open sesame}
        em.circle_dot,em.丸傍点,em.白丸傍点,strong.CIRCLE_DOT{font-style:normal;font-weight:normal;-webkit-text-emphasis:open circle;text-emphasis:open circle}
        em.black_circle_dot,em.黒丸傍点,strong.BLACK_CIRCLE_DOT{font-style:normal;font-weight:normal;-webkit-text-emphasis:filled circle;text-emphasis:filled circle}
        em.triangle_dot,em.三角傍点,strong.TRIANGLE_DOT{font-style:normal;font-weight:normal;-webkit-text-emphasis:filled triangle;text-emphasis:filled triangle}
      `}</style>

      {/* 上部栞タブ */}
      <TopBookmarkTabs bookmarks={bookmarks} lastReadRatio={lastReadRatio} onJump={jumpBm} onReturn={returnLast}/>

      {/* 書名 */}
      {!overlay && (
        <div style={{position:"absolute",top:0,left:0,right:0,zIndex:5,padding:"10px 14px",pointerEvents:"none"}}>
          <div style={{fontSize:11,color:"rgba(60,35,10,0.38)",letterSpacing:"0.08em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{book.title}</div>
        </div>
      )}

      {/* ─── 縦書きスクロールコンテナ（ページ単位で制御） ─── */}
      <div
        ref={containerRef}
        className="bunko-scroll"
        onScroll={onScroll}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={onContainerClick}
        style={{
          position:"absolute",top:0,left:0,right:0,bottom:IS_STANDALONE?104:40,
          overflowX:"scroll",overflowY:"hidden",
          direction:"rtl",
          touchAction:"none",
          opacity:overlay?0.16:1,transition:"opacity 0.22s",
          cursor:"pointer",
        }}
      >
        <div style={{direction:"ltr",writingMode:"vertical-rl",textOrientation:"mixed",height:"100%"}}>
          <div
            ref={contentRef}
            style={{
              height:"100%",
              paddingTop:"56px", paddingBottom:"20px",
              paddingLeft:0, paddingRight:0,
              boxSizing:"border-box",
              fontSize,
              lineHeight,
              letterSpacing:"0.06em",
              color:"#140800",
            }}
          />
        </div>
      </div>

      {/* 下端 シークバー＋進捗（常時表示）*/}
      {!overlay && (
        <div style={{
          position:"absolute",bottom:IS_STANDALONE?34:4,left:0,right:0,height:36,
          zIndex:6,display:"flex",alignItems:"center",
          paddingLeft:12,paddingRight:16,gap:10,
          pointerEvents:"none",
        }}>
          <div style={{fontSize:10,color:"rgba(90,60,20,0.5)",minWidth:52,letterSpacing:"0.02em",pointerEvents:"none",textAlign:"center"}}>
            <div>{currentPage + 1}/{totalPages}</div>
          </div>
          <div style={{flex:1,pointerEvents:"all"}}>
            <Seekbar ratio={ratio} bookmarks={bookmarks} onSeek={onSeek}
              onJumpBm={jumpBm} lastReadRatio={lastReadRatio} onReturn={returnLast}/>
          </div>
        </div>
      )}

      {/* オーバーレイ */}
      {overlay && (
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
              style={{background:"none",border:`1.5px solid #a08050`,cursor:"pointer",padding:"9px 18px",color:"#3a2010",fontSize:13,letterSpacing:"0.08em",whiteSpace:"nowrap",fontWeight:600}}>紙の本を探す</button>
          </div>
          <div style={{flex:1}}/>
          <div onClick={e=>e.stopPropagation()}
            style={{background:PB,borderTop:`1px solid ${BC}`,padding:"16px 16px 32px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
              <span style={{fontSize:10,color:"#9a8060",letterSpacing:"0.1em",minWidth:58}}>文字サイズ</span>
              <div style={{display:"flex",gap:4}}>
                {FS.map(s=>(
                  <button key={s} onClick={()=>{ pageAnchorRef.current=savedPageAnchorRef.current; setFontSize(s); }}
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
                <button key={i} onClick={()=>jumpBm(bm)}
                  style={{background:BM_COLORS[i],color:"#f7f2e8",border:"none",padding:"5px 11px",cursor:"pointer",fontSize:10,letterSpacing:"0.06em",borderRadius:2}}>
                  {i+1}: {bm.pct}%
                </button>
              ))}
              {bookmarks.length<MAX_BM&&!hasBmHere&&(
                <button onClick={addBm}
                  style={{background:"none",border:`1px solid #c0a880`,color:"#5a4030",padding:"5px 11px",cursor:"pointer",fontSize:10,letterSpacing:"0.06em"}}>
                  ＋ 挟む
                </button>
              )}
              {hasBmHere&&(
                <button onClick={()=>removeBmAt(ratio)}
                  style={{background:"none",border:`1px solid #c0a880`,color:"#8a5040",padding:"5px 11px",cursor:"pointer",fontSize:10,letterSpacing:"0.06em"}}>
                  ✕ 外す
                </button>
              )}
              {lastReadPage!==null&&(
                <button onClick={returnLast}
                  style={{background:"none",border:"1px dashed #b0906a",color:"#7a6050",padding:"5px 11px",cursor:"pointer",fontSize:10,letterSpacing:"0.06em"}}>
                  ← 読んでいた場所へ
                </button>
              )}
            </div>
            <div>
              <div style={{fontSize:10,color:"#9a8060",marginBottom:4,letterSpacing:"0.1em"}}>{progress}%（{currentPage+1}/{totalPages}ページ）</div>
              <Seekbar ratio={ratio} bookmarks={bookmarks} onSeek={onSeek}
                onJumpBm={jumpBm} lastReadRatio={lastReadRatio} onReturn={returnLast}/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:8,color:"rgba(80,50,20,0.35)"}}>
                <span>末尾</span>
                {[...bookmarks].sort((a,b)=>b.ratio-a.ratio).map((bm,i)=>{
                  const oi=bookmarks.indexOf(bm);
                  return <span key={i} style={{color:BM_COLORS[oi]}}>栞{oi+1}:{bm.pct}%</span>;
                })}
                {lastReadPage!==null&&<span style={{color:"#bbb"}}>読:{Math.round(lastReadRatio*100)}%</span>}
                <span>冒頭</span>
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

/* ─── 文字遣い優先度（新字新仮名が最良） ─── */
function variantPriority(v) {
  if (v === '新字新仮名') return 0;
  if (v === '新字旧仮名') return 1;
  if (v === '旧字旧仮名') return 2;
  if (v === '旧字新仮名') return 3;
  return 4;
}

/* ─── データ ─── */
// 青空文庫 2022年アクセスランキング準拠（上位50位・重複除去で47作品）。ランキング表示は上位30。
const POPULAR = [
  {id:"k773",   title:"こころ",                 author:"夏目漱石",         url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000148/files/773_14560.html"},
  {id:"k301",   title:"人間失格",               author:"太宰治",           url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000035/files/301_14912.html"},
  {id:"k789",   title:"吾輩は猫である",         author:"夏目漱石",         url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000148/files/789_14547.html"},
  {id:"k2093",  title:"ドグラ・マグラ",         author:"夢野久作",         url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000096/files/2093_28841.html"},
  {id:"k128",   title:"羅生門",                 author:"芥川龍之介",       url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000879/files/128_15261.html"},
  {id:"k46322", title:"銀河鉄道の夜",           author:"宮沢賢治",         url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000081/files/46322_24347.html"},
  {id:"k1567",  title:"走れメロス",             author:"太宰治",           url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000035/files/1567_14913.html"},
  {id:"k752",   title:"坊っちゃん",             author:"夏目漱石",         url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000148/files/752_14964.html"},
  {id:"k92",    title:"蜘蛛の糸",               author:"芥川龍之介",       url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000879/files/92_14545.html"},
  {id:"k1565",  title:"斜陽",                   author:"太宰治",           url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000035/files/1565_8559.html"},
  {id:"k46349", title:"檸檬",                   author:"梶井基次郎",       url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000074/files/46349_23843.html"},
  {id:"k56648", title:"人間椅子",               author:"江戸川乱歩",       url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/001779/files/56648_58207.html"},
  {id:"k45630", title:"〔雨ニモマケズ〕",       author:"宮沢賢治",         url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000081/files/45630_23908.html"},
  {id:"k43754", title:"注文の多い料理店",       author:"宮沢賢治",         url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000081/files/43754_17659.html"},
  {id:"k57228", title:"怪人二十面相",           author:"江戸川乱歩",       url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/001779/files/57228_58735.html"},
  {id:"k799",   title:"夢十夜",                 author:"夏目漱石",         url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000148/files/799_14972.html"},
  {id:"k623",   title:"山月記",                 author:"中島敦",           url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000119/files/623_18353.html"},
  {id:"k1465",  title:"蟹工船",                 author:"小林多喜二",       url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000156/files/1465_16805.html"},
  {id:"k49866", title:"変身",                   author:"カフカフランツ",   url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/001235/files/49866_41897.html"},
  {id:"k56650", title:"Ｄ坂の殺人事件",         author:"江戸川乱歩",       url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/001779/files/56650_58209.html"},
  {id:"k56656", title:"罪と罰",                 author:"ドストエフスキー", url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000363/files/56656_74440.html"},
  {id:"k794",   title:"三四郎",                 author:"夏目漱石",         url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000148/files/794_14946.html"},
  {id:"k5016",  title:"源氏物語 01 桐壺",       author:"紫式部",           url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000052/files/5016_9758.html"},
  {id:"k776",   title:"草枕",                   author:"夏目漱石",         url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000148/files/776_14941.html"},
  {id:"k275",   title:"女生徒",                 author:"太宰治",           url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000035/files/275_13903.html"},
  {id:"k58093", title:"痴人の愛",               author:"谷崎潤一郎",       url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/001383/files/58093_62049.html"},
  {id:"k52504", title:"遠野物語",               author:"柳田国男",         url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/001566/files/52504_49667.html"},
  {id:"k42",    title:"鼻",                     author:"芥川龍之介",       url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000879/files/42_15228.html"},
  {id:"k47061", title:"学問のすすめ",           author:"福沢諭吉",         url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000296/files/47061_29420.html"},
  {id:"k42620", title:"堕落論",                 author:"坂口安吾",         url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/001095/files/42620_21407.html"},
  {id:"k682",   title:"舞姫",                   author:"森鴎外",           url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000129/files/682_15414.html"},
  {id:"k52409", title:"三国志 01 序",           author:"吉川英治",         url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/001562/files/52409_51059.html"},
  {id:"k2253",  title:"ヴィヨンの妻",           author:"太宰治",           url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000035/files/2253_14908.html"},
  {id:"k935",   title:"少女地獄",               author:"夢野久作",         url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000096/files/935_23282.html"},
  {id:"k1502",  title:"破戒",                   author:"島崎藤村",         url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000158/files/1502_24633.html"},
  {id:"k56669", title:"少年探偵団",             author:"江戸川乱歩",       url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/001779/files/56669_58756.html"},
  {id:"k277",   title:"駈込み訴え",             author:"太宰治",           url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000035/files/277_33098.html"},
  {id:"k52410", title:"三国志 02 桃園の巻",     author:"吉川英治",         url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/001562/files/52410_51061.html"},
  {id:"k60756", title:"現代語訳　平家物語 01", author:"作者不詳",         url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/001529/files/60756_74787.html"},
  {id:"k56866", title:"春琴抄",                 author:"谷崎潤一郎",       url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/001383/files/56866_58169.html"},
  {id:"k42618", title:"桜の森の満開の下",       author:"坂口安吾",         url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/001095/files/42618_21410.html"},
  {id:"k19",    title:"或阿呆の一生",           author:"芥川龍之介",       url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000879/files/19_14618.html"},
  {id:"k69",    title:"河童",                   author:"芥川龍之介",       url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000879/files/69_14933.html"},
  {id:"k42286", title:"カラマゾフの兄弟 01 上", author:"ドストエフスキー", url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000363/files/42286_37300.html"},
  {id:"k691",   title:"高瀬舟",                 author:"森鴎外",           url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/000129/files/691_15352.html"},
  {id:"k56646", title:"心理試験",               author:"江戸川乱歩",       url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/001779/files/56646_58241.html"},
  {id:"k4803",  title:"風立ちぬ",               author:"堀辰雄",           url:"https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/cards/001030/files/4803_14204.html"},
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
  const [shelf,setShelf]       = useState([]);
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

  // ランキング表示用：上位30作品。カタログ読み込み済みなら新字新仮名優先でURLを解決
  const rankingBooks = useMemo(() => {
    return POPULAR.slice(0, 30).map(book => {
      if (!catalog) return book;
      const matches = catalog.filter(w => w.title === book.title && w.author === book.author);
      if (!matches.length) return book;
      const best = [...matches].sort((a, b) => variantPriority(a.variant) - variantPriority(b.variant))[0];
      return best.url !== book.url ? { ...book, url: best.url } : book;
    });
  }, [catalog]);

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
    if(shelf.find(b=>b.id===book.id)) return;
    setLoading(book.id);
    precacheBook(book.id, book.url); // バックグラウンドで本文をキャッシュ
    setTimeout(()=>{setShelf(p=>[...p,book]);setLoading(null);},650);
  }
  function removeFromShelf(id){
    setShelf(prev=>prev.filter(b=>b.id!==id));
    deleteBookCache(id); // キャッシュも削除
  }
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
    const isL=loading===book.id;
    return (
      <button onClick={()=>!saved&&save(book)} disabled={saved||isL}
        style={{background:saved?"transparent":"#2a1800",color:saved?"#9a8060":"#f7f2e8",
          border:"1px solid #c0a880",padding:"5px 12px",fontSize:12,
          cursor:saved?"default":"pointer",letterSpacing:"0.08em",
          whiteSpace:"nowrap",opacity:isL?0.5:1}}>
        {isL?"…":saved?"保存済":"書庫へ"}
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
              {s==="shelf"&&shelf.length>0&&<span style={{fontSize:10,marginLeft:3,opacity:0.5}}>{shelf.length}</span>}
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
            <div style={{borderBottom:"1px solid #d0b898",paddingBottom:7,marginBottom:18}}>
              <span style={{fontSize:13,letterSpacing:"0.2em",color:"#9a8060"}}>書庫　{shelf.length} 冊</span>
            </div>
            {shelf.length===0?(
              <div style={{color:"#9a8060",marginTop:36,padding:"0 4px"}}>
                <div style={{textAlign:"center",fontSize:13,letterSpacing:"0.2em",marginBottom:18,color:"#7a6040"}}>書庫は空です</div>
                <div style={{background:"rgba(200,180,140,0.18)",borderRadius:4,padding:"16px 18px",border:"1px solid rgba(180,150,100,0.25)",fontSize:11.5,lineHeight:2.1,letterSpacing:"0.08em"}}>
                  <div>右へスワイプするとランキングと</div>
                  <div>検索があります</div>
                  <div style={{marginTop:6}}>気に入った本の「書庫へ」を押すと</div>
                  <div>端末に保存して読めます</div>
                  <div style={{marginTop:6,opacity:0.65,fontSize:11}}>保存と同時に本文もダウンロードされ</div>
                  <div style={{opacity:0.65,fontSize:11}}>オフラインでも読めます</div>
                </div>
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
                  {rankingBooks.map((book,i)=>{
                    const saved=!!shelf.find(b=>b.id===book.id);
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
                          <button onClick={()=>!saved&&save(book)}
                            style={{background:"none",border:"1px solid #c0a880",
                              color:saved?"#9a8060":"#5a4030",padding:"3px 9px",
                              cursor:saved?"default":"pointer",fontSize:12,letterSpacing:"0.05em"}}>
                            {isL?"…":saved?"保存済":"書庫へ"}
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
                      if(ia>=0&&ib>=0){
                        if(ia!==ib) return ia-ib;
                        return variantPriority(a.variant)-variantPriority(b.variant);
                      }
                      return variantPriority(a.variant)-variantPriority(b.variant);
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


import { useState, useRef, useCallback, useEffect } from "react";
import { forceSimulation, forceCollide, forceX, forceY } from "d3-force";

// ── スタイル ────────────────────────────────────────────────────────────────
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=IM+Fell+English:ital@0;1&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { width: 100%; height: 100%; overflow: hidden; background: #0e0800; }

  .wp-shell {
    width: 100vw; height: 100vh;
    position: relative; overflow: hidden;
    cursor: grab; user-select: none;
  }
  .wp-shell:active { cursor: grabbing; }

  .wp-canvas {
    position: absolute; top: 0; left: 0;
    width: 4000px; height: 4000px;
    transform-origin: 0 0;
  }

  /* 羊皮紙背景 */
  .parchment-bg {
    position: absolute; inset: 0;
    background:
      radial-gradient(ellipse at 30% 30%, rgba(200,160,80,0.07) 0%, transparent 55%),
      radial-gradient(ellipse at 70% 70%, rgba(140,80,20,0.08) 0%, transparent 55%),
      linear-gradient(155deg, #f0ddb0 0%, #e4cfa0 35%, #d8c090 65%, #e0cc9e 100%);
  }
  .parchment-bg::before {
    content: ''; position: absolute; inset: 0;
    background:
      repeating-linear-gradient(0deg,  transparent, transparent 30px, rgba(100,60,10,0.03) 30px, rgba(100,60,10,0.03) 31px),
      repeating-linear-gradient(90deg, transparent, transparent 30px, rgba(100,60,10,0.02) 30px, rgba(100,60,10,0.02) 31px);
  }

  /* エッジ */
  .edge {
    stroke: #6b3a10; stroke-width: 1.6; fill: none;
    opacity: 0; stroke-dasharray: 2000; stroke-dashoffset: 2000;
  }
  .edge.drawn { opacity: 0.5; animation: drawEdge 0.7s ease forwards; }
  @keyframes drawEdge { to { stroke-dashoffset: 0; } }

  /* ノード */
  .node {
    position: absolute; transform: translate(-50%, -50%);
    display: flex; flex-direction: column; align-items: center;
    cursor: pointer; opacity: 0; transition: opacity 0.2s;
    -webkit-tap-highlight-color: transparent;
  }
  .node.visible { opacity: 1; animation: sealPop 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards; }
  @keyframes sealPop {
    from { opacity: 0; transform: translate(-50%,-50%) scale(0.2) rotate(-15deg); }
    to   { opacity: 1; transform: translate(-50%,-50%) scale(1)   rotate(0deg);  }
  }

  /* 蝋印 */
  .seal {
    border-radius: 50%; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
    position: relative; transition: transform 0.18s, filter 0.18s;
  }
  .seal::after {
    content: ''; position: absolute; inset: -3px; border-radius: 50%;
    background: repeating-conic-gradient(rgba(0,0,0,0.07) 0deg, transparent 5deg, transparent 10deg);
    pointer-events: none;
  }
  .node:hover        .seal { transform: scale(1.1);   filter: brightness(1.15); }
  .node.expanded     .seal { filter: brightness(0.75) saturate(0.7); }
  .node.expanded:hover .seal { transform: scale(1.04); }

  /* ローディング */
  .seal.loading { animation: sealPulse 1.2s ease infinite; }
  @keyframes sealPulse {
    0%,100% { filter: brightness(0.75) saturate(0.6); }
    50%     { filter: brightness(1.05) saturate(1.0); }
  }
  .loading-hint { animation: hintPulse 1s ease infinite; }
  @keyframes hintPulse {
    0%,100% { opacity: 0.3; }
    50%     { opacity: 0.9; }
  }

  /* サムネイル（蝋印内部） */
  .seal-thumb {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    object-fit: cover; border-radius: 50%;
    opacity: 0.28; pointer-events: none;
  }

  /* 蝋印サイズ・色 */
  .seal-root {
    width: 96px; height: 96px;
    background: radial-gradient(circle at 35% 35%, #9a3520, #501008);
    box-shadow: 0 0 0 3px #c87840, 0 0 0 5px #6a2808, 0 8px 24px rgba(80,20,5,0.65), inset 0 2px 5px rgba(255,180,80,0.3);
  }
  .seal-l1 {
    width: 78px; height: 78px;
    background: radial-gradient(circle at 35% 35%, #7a3a18, #3a1005);
    box-shadow: 0 0 0 2.5px #a86030, 0 0 0 4px #5a2008, 0 5px 16px rgba(60,15,3,0.55), inset 0 1px 4px rgba(220,160,60,0.25);
  }
  .seal-l2 {
    width: 62px; height: 62px;
    background: radial-gradient(circle at 35% 35%, #5a3010, #281005);
    box-shadow: 0 0 0 2px #906028, 0 0 0 3px #401808, 0 4px 12px rgba(40,10,2,0.5), inset 0 1px 3px rgba(200,140,50,0.2);
  }
  .seal-l3 {
    width: 50px; height: 50px;
    background: radial-gradient(circle at 35% 35%, #402810, #180a04);
    box-shadow: 0 0 0 1.5px #705020, 0 0 0 2.5px #301408, 0 3px 10px rgba(30,8,2,0.45);
  }

  /* 蝋印テキスト */
  .seal-text {
    font-family: 'IM Fell English', serif; color: #f5dda0;
    text-align: center; line-height: 1.25; padding: 6px;
    text-shadow: 0 1px 3px rgba(0,0,0,0.7);
    word-break: break-word; position: relative; z-index: 1;
  }
  .seal-text-root { font-family: 'Cinzel', serif; font-size: 0.7rem; font-weight: 600; max-width: 74px; letter-spacing: 0.04em; }
  .seal-text-l1   { font-size: 0.62rem; max-width: 60px; }
  .seal-text-l2   { font-size: 0.56rem; max-width: 50px; }
  .seal-text-l3   { font-size: 0.50rem; max-width: 40px; }

  .expand-hint {
    position: absolute; bottom: -18px;
    font-size: 0.5rem; color: #7a4a20; font-style: italic;
    white-space: nowrap; opacity: 0.7;
  }

  /* UI オーバーレイ */
  .ui-overlay { position: fixed; z-index: 100; pointer-events: none; }

  .top-bar { top: 0; left: 0; right: 0; display: flex; justify-content: center; padding: 16px 20px; }
  .top-bar-inner {
    pointer-events: all; display: flex; gap: 10px; align-items: center;
    background: rgba(30,15,5,0.82); border: 1px solid rgba(140,80,20,0.4);
    padding: 10px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  }
  .title { font-family: 'Cinzel', serif; font-size: 1.1rem; font-weight: 600; color: #f0d090; letter-spacing: 0.12em; white-space: nowrap; }
  .title span { color: #c06030; }
  .divider { width: 1px; height: 24px; background: rgba(140,80,20,0.4); }
  .search-input {
    background: rgba(255,245,210,0.1); border: none;
    border-bottom: 1px solid rgba(200,140,60,0.4);
    color: #f0d090; font-family: 'IM Fell English', serif;
    font-size: 0.9rem; padding: 4px 10px; outline: none; width: 160px;
  }
  .search-input::placeholder { color: rgba(200,160,80,0.45); font-style: italic; }
  .search-btn {
    background: none; border: 1px solid rgba(180,100,30,0.5);
    color: #d4a060; font-family: 'Cinzel', serif;
    font-size: 0.65rem; letter-spacing: 0.1em;
    padding: 5px 12px; cursor: pointer; transition: background 0.2s, color 0.2s;
  }
  .search-btn:hover { background: rgba(140,60,20,0.4); color: #f0d090; }

  .hint-bar { bottom: 16px; left: 0; right: 0; display: flex; justify-content: center; }
  .hint-text {
    font-family: 'IM Fell English', serif; font-style: italic;
    font-size: 0.72rem; color: rgba(200,160,80,0.6); letter-spacing: 0.06em;
    text-align: center; padding: 0 16px;
  }

  .reset-btn { top: 0; right: 0; padding: 16px 20px; pointer-events: all; }
  .reset-btn button {
    background: rgba(30,15,5,0.7); border: 1px solid rgba(140,80,20,0.35);
    color: rgba(200,150,60,0.7); font-family: 'IM Fell English', serif;
    font-size: 0.7rem; padding: 6px 12px; cursor: pointer; transition: all 0.2s;
  }
  .reset-btn button:hover { color: #f0d090; background: rgba(80,30,10,0.6); }
`;

// ── Wikipedia API ────────────────────────────────────────────────────────────
const WP = "https://ja.wikipedia.org/w/api.php";

function isValidTitle(t) {
  if (/[（(]/.test(t)) return false;          // 括弧付き（曖昧さ回避も含む）
  if (/\d{4}年|\d+年代/.test(t)) return false; // 年号・年代
  if (t.includes("一覧")) return false;
  if (t.includes("曖昧さ回避")) return false;
  return true;
}

function shufflePick(arr, n) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

async function fetchRelated(word) {
  const enc = encodeURIComponent(word);
  try {
    const [sr, lr] = await Promise.all([
      fetch(`${WP}?action=query&list=search&srsearch=morelike:${enc}&srnamespace=0&srlimit=20&format=json&origin=*`).then(r => r.json()),
      fetch(`${WP}?action=query&titles=${enc}&prop=links&pllimit=50&plnamespace=0&format=json&origin=*`).then(r => r.json()),
    ]);
    const fromSearch = (sr.query?.search ?? [])
      .map(s => s.title).filter(t => t !== word && isValidTitle(t));
    const fromLinks = Object.values(lr.query?.pages ?? {})
      .flatMap(p => (p.links ?? []).map(l => l.title))
      .filter(t => t !== word && isValidTitle(t) && !fromSearch.includes(t));
    return shufflePick([...new Set([...shufflePick(fromSearch, 5), ...shufflePick(fromLinks, 5)])], 5);
  } catch { return []; }
}

async function fetchThumbnails(titles) {
  if (!titles.length) return {};
  const enc = titles.map(encodeURIComponent).join("|");
  try {
    const r = await fetch(
      `${WP}?action=query&titles=${enc}&prop=pageimages&piprop=thumbnail&pithumbsize=120&format=json&origin=*`
    ).then(r => r.json());
    const map = {};
    for (const page of Object.values(r.query?.pages ?? {})) {
      if (page.thumbnail?.source) map[page.title] = page.thumbnail.source;
    }
    return map;
  } catch { return {}; }
}

// ── 定数 ────────────────────────────────────────────────────────────────────
const CANVAS_W = 4000;
const CANVAS_H = 4000;
// level 1 は中心から少し離す / level 2+ はコンパクトに
const RADII      = [0, 270, 150, 125, 105];
const SEAL_CLS   = ["seal-root", "seal-l1", "seal-l2", "seal-l3"];
const TEXT_CLS   = ["seal-text-root", "seal-text-l1", "seal-text-l2", "seal-text-l3"];
const NODE_RADII = [54, 45, 37, 31]; // D3 衝突判定半径

function childPositions(px, py, parentAngle, count, level) {
  const radius    = RADII[Math.min(level, RADII.length - 1)];
  // level 1: 全周配置、それ以降: 扇形を絞る（交差・重なりを減らす）
  const spread    = level === 1 ? Math.PI * 2 : Math.PI * 0.65;
  const baseAngle = level === 1 ? -Math.PI / 2 : parentAngle;
  return Array.from({ length: count }, (_, i) => {
    const angle = baseAngle + (i - (count - 1) / 2) * (spread / Math.max(count - 1, 1));
    return { x: px + Math.cos(angle) * radius, y: py + Math.sin(angle) * radius, angle };
  });
}

let _id = 0;
const uid = () => `n${++_id}`;

// ── コンポーネント ──────────────────────────────────────────────────────────
export default function WikiPlexus() {
  const [query, setQuery] = useState("");
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [drawn, setDrawn] = useState(new Set());
  const [pan,   setPan]   = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [, setTick]       = useState(0);

  const shellRef       = useRef(null);
  const dragging       = useRef(false);
  const lastPos        = useRef({ x: 0, y: 0 });
  const lastTouchDist  = useRef(null);  // ピンチズーム用
  const pinching       = useRef(false);
  const nodesRef       = useRef([]);
  const simRef         = useRef(null);
  const d3Nodes        = useRef([]);
  const clickTimer     = useRef(null);  // ダブルクリック判定
  const longPressMap   = useRef({});    // 長押し判定 (nodeId → state)

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  const d3Pos = (id, fb) => {
    const dn = d3Nodes.current.find(n => n.id === id);
    return dn ? { x: dn.x, y: dn.y } : fb;
  };

  // ── シミュレーション ────────────────────────────────────────────────────
  const initSim = useCallback(() => {
    simRef.current?.stop();
    simRef.current = forceSimulation([])
      .force("collide", forceCollide(d => d.r + 6).strength(0.75).iterations(3))
      .force("x", forceX(d => d.tx).strength(0.12))
      .force("y", forceY(d => d.ty).strength(0.12))
      .alphaDecay(0.025).alphaMin(0.001)
      .on("tick", () => setTick(t => t + 1));
    return simRef.current;
  }, []);

  const addToSim = useCallback((newNodes) => {
    if (!simRef.current) return;
    d3Nodes.current = [...d3Nodes.current, ...newNodes.map(n => ({
      id: n.id, x: n.x, y: n.y, tx: n.x, ty: n.y,
      r: NODE_RADII[Math.min(n.level, 3)],
    }))];
    simRef.current.nodes(d3Nodes.current).alpha(0.4).restart();
  }, []);

  // ── グラフ初期化 ──────────────────────────────────────────────────────
  const initGraph = useCallback((word) => {
    _id = 0;
    d3Nodes.current = [];
    const sim = initSim();

    const rootId = uid();
    const cx = CANVAS_W / 2, cy = CANVAS_H / 2;
    const rootNode = { id: rootId, word, x: cx, y: cy, level: 0, expanded: false, loading: false, parentAngle: 0, thumb: null };
    setNodes([rootNode]);
    setEdges([]);
    setDrawn(new Set());

    if (shellRef.current) {
      const { clientWidth: sw, clientHeight: sh } = shellRef.current;
      setPan({ x: sw / 2 - cx * scale, y: sh / 2 - cy * scale });
    }

    d3Nodes.current = [{ id: rootId, x: cx, y: cy, tx: cx, ty: cy, r: NODE_RADII[0], fx: cx, fy: cy }];
    sim.nodes(d3Nodes.current).alpha(0.1).restart();

    // ルートのサムネイルを非同期取得
    fetchThumbnails([word]).then(thumbs => {
      if (thumbs[word]) {
        setNodes(p => p.map(n => n.id === rootId ? { ...n, thumb: thumbs[word] } : n));
      }
    });
  }, [scale, initSim]);

  useEffect(() => {
    initGraph("宇宙");
    return () => simRef.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── ノード展開 ────────────────────────────────────────────────────────
  const expandNode = useCallback(async (nodeId) => {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (!node || node.expanded || node.loading) return;

    const dn = d3Nodes.current.find(n => n.id === nodeId);
    if (dn) { dn.fx = dn.x; dn.fy = dn.y; }

    setNodes(p => p.map(n => n.id === nodeId ? { ...n, expanded: true, loading: true } : n));

    try {
      const related = await fetchRelated(node.word);
      if (!related.length) {
        setNodes(p => p.map(n => n.id === nodeId ? { ...n, loading: false } : n));
        return;
      }

      // サムネイルを並行取得
      const thumbs = await fetchThumbnails(related);

      const px = dn?.x ?? node.x;
      const py = dn?.y ?? node.y;
      const nextLevel = Math.min(node.level + 1, 3);
      const positions = childPositions(px, py, node.parentAngle, related.length, node.level + 1);

      const newNodes = related.map((word, i) => ({
        id: uid(), word,
        x: positions[i].x, y: positions[i].y,
        level: nextLevel, expanded: false, loading: false,
        parentAngle: positions[i].angle, parentId: nodeId,
        thumb: thumbs[word] ?? null,
      }));
      const newEdges = newNodes.map(n => ({ id: `e${n.id}`, from: nodeId, to: n.id }));

      setEdges(e => [...e, ...newEdges]);
      setNodes(p => [...p.map(n => n.id === nodeId ? { ...n, loading: false } : n), ...newNodes]);
      setTimeout(() => {
        setDrawn(d => { const s = new Set(d); newEdges.forEach(e => s.add(e.id)); return s; });
      }, 10);
      addToSim(newNodes);
    } catch {
      setNodes(p => p.map(n => n.id === nodeId ? { ...n, expanded: false, loading: false } : n));
    }
  }, [addToSim]);

  // ── Wikipedia を開く ──────────────────────────────────────────────────
  const openWiki = useCallback((word) => {
    window.open(`https://ja.wikipedia.org/wiki/${encodeURIComponent(word)}`, "_blank", "noopener");
  }, []);

  // ── クリック（シングル：展開 / ダブル：Wikipedia） ─────────────────
  const handleNodeClick = useCallback((nodeId, word) => {
    if (clickTimer.current?.nodeId === nodeId) {
      // ダブルクリック
      clearTimeout(clickTimer.current.timer);
      clickTimer.current = null;
      openWiki(word);
    } else {
      const timer = setTimeout(() => {
        if (clickTimer.current?.nodeId === nodeId) {
          clickTimer.current = null;
          expandNode(nodeId);
        }
      }, 280);
      clickTimer.current = { nodeId, timer };
    }
  }, [expandNode, openWiki]);

  // ── タッチ：長押し→Wikipedia / タップ→展開 ──────────────────────
  const onNodeTouchStart = useCallback((nodeId, word, e) => {
    e.stopPropagation();
    const lp = {
      word, fired: false,
      startX: e.touches[0]?.clientX ?? 0,
      startY: e.touches[0]?.clientY ?? 0,
    };
    lp.timer = setTimeout(() => {
      lp.fired = true;
      openWiki(word);
    }, 600);
    longPressMap.current[nodeId] = lp;
  }, [openWiki]);

  const onNodeTouchMove = useCallback((nodeId, e) => {
    const lp = longPressMap.current[nodeId];
    if (!lp || lp.fired) return;
    const dx = (e.touches[0]?.clientX ?? 0) - lp.startX;
    const dy = (e.touches[0]?.clientY ?? 0) - lp.startY;
    if (Math.hypot(dx, dy) > 8) {
      clearTimeout(lp.timer);
      delete longPressMap.current[nodeId];
    }
  }, []);

  const onNodeTouchEnd = useCallback((nodeId, e) => {
    const lp = longPressMap.current[nodeId];
    if (!lp) return;
    clearTimeout(lp.timer);
    delete longPressMap.current[nodeId];
    if (!lp.fired) {
      e.preventDefault(); // 合成 click を抑制
      expandNode(nodeId);
    }
  }, [expandNode]);

  // ── マウス パン ───────────────────────────────────────────────────────
  const onMouseDown = e => {
    if (e.target.closest(".no-drag")) return;
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseMove = e => {
    if (!dragging.current) return;
    setPan(p => ({ x: p.x + e.clientX - lastPos.current.x, y: p.y + e.clientY - lastPos.current.y }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseUp = () => { dragging.current = false; };

  // ── タッチ：1本指パン + 2本指ピンチズーム ───────────────────────────
  const onShellTouchStart = e => {
    if (e.touches.length === 2) {
      pinching.current = true;
      lastTouchDist.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
    } else if (e.touches.length === 1 && !pinching.current) {
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };
  const onShellTouchMove = e => {
    if (e.touches.length === 2) {
      pinching.current = true;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      if (lastTouchDist.current) {
        const ratio = dist / lastTouchDist.current;
        setScale(s => Math.max(0.25, Math.min(3, s * ratio)));
      }
      lastTouchDist.current = dist;
    } else if (e.touches.length === 1 && !pinching.current) {
      setPan(p => ({
        x: p.x + e.touches[0].clientX - lastPos.current.x,
        y: p.y + e.touches[0].clientY - lastPos.current.y,
      }));
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };
  const onShellTouchEnd = e => {
    if (e.touches.length < 2) {
      pinching.current = false;
      lastTouchDist.current = null;
      if (e.touches.length === 1)
        lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  // ── ホイールズーム ────────────────────────────────────────────────────
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const onWheel = e => {
      e.preventDefault();
      setScale(s => Math.max(0.25, Math.min(3, s * (e.deltaY > 0 ? 0.92 : 1.09))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const handleSearch = e => {
    e.preventDefault();
    if (query.trim()) { initGraph(query.trim()); setQuery(""); }
  };

  // ── 描画 ──────────────────────────────────────────────────────────────
  return (
    <>
      <style>{STYLE}</style>
      <div
        className="wp-shell"
        ref={shellRef}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}    onMouseLeave={onMouseUp}
        onTouchStart={onShellTouchStart}
        onTouchMove={onShellTouchMove}
        onTouchEnd={onShellTouchEnd}
      >
        <div className="wp-canvas" style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${scale})` }}>
          <div className="parchment-bg" />

          {/* エッジ */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
            {edges.map(e => {
              const fn = nodes.find(n => n.id === e.from);
              const tn = nodes.find(n => n.id === e.to);
              const fp = d3Pos(e.from, { x: fn?.x ?? 0, y: fn?.y ?? 0 });
              const tp = d3Pos(e.to,   { x: tn?.x ?? 0, y: tn?.y ?? 0 });
              const mx = (fp.x + tp.x) / 2 + (tp.y - fp.y) * 0.1;
              const my = (fp.y + tp.y) / 2 - (tp.x - fp.x) * 0.1;
              return (
                <path
                  key={e.id}
                  className={`edge ${drawn.has(e.id) ? "drawn" : ""}`}
                  d={`M${fp.x},${fp.y} Q${mx},${my} ${tp.x},${tp.y}`}
                />
              );
            })}
          </svg>

          {/* ノード（蝋印） */}
          {nodes.map((node, idx) => {
            const lv  = Math.min(node.level, 3);
            const pos = d3Pos(node.id, { x: node.x, y: node.y });
            return (
              <div
                key={node.id}
                className={`node no-drag${node.expanded ? " expanded" : ""} visible`}
                style={{ left: pos.x, top: pos.y, animationDelay: `${Math.min(idx * 0.06, 0.5)}s`, zIndex: 10 - lv }}
                onClick={() => handleNodeClick(node.id, node.word)}
                onTouchStart={e => onNodeTouchStart(node.id, node.word, e)}
                onTouchMove={e => onNodeTouchMove(node.id, e)}
                onTouchEnd={e => onNodeTouchEnd(node.id, e)}
              >
                <div className={`seal ${SEAL_CLS[lv]}${node.loading ? " loading" : ""}`}>
                  {node.thumb && (
                    <img src={node.thumb} alt="" draggable={false} className="seal-thumb" />
                  )}
                  <span className={`seal-text ${TEXT_CLS[lv]}`}>
                    {node.loading ? "…" : node.word}
                  </span>
                </div>
                {!node.expanded && !node.loading && lv < 3 && (
                  <span className="expand-hint">✦ 開く</span>
                )}
                {node.loading && (
                  <span className="expand-hint loading-hint">読込中</span>
                )}
              </div>
            );
          })}
        </div>

        {/* トップバー */}
        <div className="ui-overlay top-bar">
          <div className="top-bar-inner no-drag">
            <span className="title">Wiki<span>Plexus</span></span>
            <div className="divider" />
            <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
              <input
                className="search-input"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="概念を入力…"
              />
              <button className="search-btn" type="submit">探索</button>
            </form>
          </div>
        </div>

        <div className="ui-overlay hint-bar">
          <span className="hint-text">
            ✦ クリック：展開　ダブルクリック / 長押し：Wikipediaで開く　ドラッグ：移動　ホイール / ピンチ：ズーム ✦
          </span>
        </div>

        <div className="ui-overlay reset-btn">
          <button className="no-drag" onClick={() => initGraph("宇宙")}>地図を初期化</button>
        </div>
      </div>
    </>
  );
}

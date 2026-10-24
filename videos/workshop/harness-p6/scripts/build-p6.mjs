// 產生 p.6〈一段工作，需要哪些部分一起合作〉的講解影片。
// 架構圖直接取自簡報 docs/workshop/agentic-sdlc-workshop.html 的 <section id="harness">，
// 只做機械改寫：每一格的 rect 與文字收進同一個 <g>、id 加前綴、0.72 的群組透明度改寫在 rect 上。
// 要改字幕、時間或音效，就改這個檔案，再執行 node scripts/build-p6.mjs。
// 執行前要先跑 scripts/capture-slide.mjs（產生截圖與 slide-measure.json）。
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(resolve(ROOT, "../../../package.json"));
const { JSDOM } = require("jsdom");

const DECK = resolve(ROOT, "../../../docs/workshop/agentic-sdlc-workshop.html");
const MEASURE = JSON.parse(readFileSync(resolve(ROOT, "scripts/slide-measure.json"), "utf8"));
const r = (n) => Math.round(n * 1000) / 1000;
const J = JSON.stringify;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ── 1. 讀出原始 SVG ─────────────────────────────────────────────
const deck = readFileSync(DECK, "utf8");
const section = deck.match(/<section class="slide" id="harness"[\s\S]*?<\/section>/)[0];
const svgSrc = section.match(/<svg[\s\S]*<\/svg>/)[0];
const doc = new JSDOM(svgSrc, { contentType: "image/svg+xml" }).window.document;
const svgEl = doc.documentElement;
const VB = svgEl.getAttribute("viewBox");
if (VB !== "0 0 1160 530") throw new Error(`viewBox 變了：${VB}`);

const inherit = (el, name) => {
  for (let n = el; n && n.nodeType === 1; n = n.parentNode) if (n.hasAttribute(name)) return n.getAttribute(name);
  return null;
};
const all = (sel) => [...doc.querySelectorAll(sel)];
const expect = (what, n, m) => {
  if (n !== m) throw new Error(`${what}：預期 ${m} 個，實際 ${n} 個（投影片改版了？）`);
};

const markers = all("defs > marker");
expect("marker", markers.length, 5);
const paths = all('g[fill="none"] > path');
expect("線", paths.length, 10);
const rects = all("svg > g > rect");
expect("格子", rects.length, 9);
const texts = all("text");
expect("文字", texts.length, 30);
texts.forEach((t, i) => {
  if (t.textContent !== MEASURE.texts[i].text) throw new Error(`第 ${i} 段文字和量測結果不同，請重跑 capture-slide.mjs`);
});

// 格子：用 (x,y) 對到名稱
const BOX = {
  "0,10": "skills", "425,10": "model", "850,10": "guard",
  "0,190": "human", "425,190": "runtime", "850,190": "tools",
  "0,400": "repo", "425,400": "sensors", "850,400": "env",
};
const BOXCOLOR = {
  skills: "grey", model: "blue", guard: "amber", human: "amber", runtime: "blue",
  tools: "blue", repo: "grey", sensors: "green", env: "blue",
};
const AUX = ["skills", "guard", "repo"];
const C = { blue: "#7DBCD1", green: "#94BEB6", amber: "#D4BA91", grey: "#9BADCD", red: "#E5787A", white: "#FFFFFF" };
const TRAIL = { blue: "#CBEAF3", green: "#D3EEE8", amber: "#F0DDBA", grey: "#D9E2EE", red: "#F4A9AA" };
// 每段文字屬於哪一格（索引是原檔 <text> 的順序）
const TEXT_BOX = [
  "skills", "model", "guard", "human", "runtime", "tools", "repo", "sensors", "env",
  "skills", "model", "guard", "human", "runtime", "runtime", "tools", "repo", "sensors", "sensors", "env",
];
// 線：用 d 對到名稱與路徑點
const LINE = {
  "M310 60H367V208H425": { id: "SK", pts: [[310, 60], [367, 60], [367, 208], [425, 208]] },
  "M310 460H367V302H425": { id: "RP", pts: [[310, 460], [367, 460], [367, 302], [425, 302]] },
  "M1005 110V190": { id: "GD", pts: [[1005, 110], [1005, 190]] },
  "M310 255H425": { id: "L1", pts: [[310, 255], [425, 255]] },
  "M580 188V112": { id: "L2", pts: [[580, 188], [580, 112]] },
  "M735 232H850": { id: "L3", pts: [[735, 232], [850, 232]] },
  "M850 280H735": { id: "LR", pts: [[850, 280], [735, 280]] },
  "M1005 320V400": { id: "L4", pts: [[1005, 320], [1005, 400]] },
  "M735 460H850": { id: "L5", pts: [[735, 460], [850, 460]] },
  "M580 400V320": { id: "L6", pts: [[580, 400], [580, 320]] },
};
const PTS = Object.fromEntries(Object.values(LINE).map((l) => [l.id, l.pts]));
PTS.L2d = [...PTS.L2].reverse();
const plen = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

// ── 2. 改寫成可以動的 SVG ────────────────────────────────────────
const P = "p6-";
const fixUrl = (v) => v && v.replace(/url\(#([^)]+)\)/g, `url(#${P}$1)`);
const attrs = (o) =>
  Object.entries(o)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");

const defs = markers
  .map((m) => m.outerHTML.replace(/ xmlns="[^"]*"/, "").replace(/id="([^"]+)"/, `id="${P}$1"`))
  .join("\n");

const lineSvg = paths
  .map((p) => {
    const info = LINE[p.getAttribute("d")];
    if (!info) throw new Error(`認不得的線 ${p.getAttribute("d")}`);
    return `<path id="ln-${info.id}" ${attrs({
      d: p.getAttribute("d"),
      fill: "none",
      stroke: p.getAttribute("stroke"),
      "stroke-width": p.getAttribute("stroke-width"),
      "stroke-dasharray": p.getAttribute("stroke-dasharray"),
      "stroke-linecap": inherit(p, "stroke-linecap"),
      "stroke-linejoin": inherit(p, "stroke-linejoin"),
      "marker-start": fixUrl(p.getAttribute("marker-start")),
      "marker-end": fixUrl(p.getAttribute("marker-end")),
    })}/>`;
  })
  .join("\n");

// 原檔文字的有效屬性（群組上的屬性寫回每個 <text>）
const textAttrs = (t) => ({
  x: t.getAttribute("x"),
  y: t.getAttribute("y"),
  "text-anchor": inherit(t, "text-anchor"),
  "font-size": inherit(t, "font-size"),
  "font-weight": inherit(t, "font-weight"),
});
const TEXTFILL = texts.map((t) => inherit(t, "fill"));
const TEXTOP = texts.map((t) => t.getAttribute("opacity"));

// 會在原位點亮的詞：[key, 文字索引, 詞（null = 整行）, 顏色]
const WORDS = [
  ["goal", 12, "目標", "amber"],
  ["judge", 12, "業務判斷", "amber"],
  ["review", 12, "Review", "amber"],
  ["ctx", 13, "整理 Context", "blue"],
  ["decide", 13, "依結果決定", "blue"],
  ["again", 14, "再修一輪", "blue"],
  ["ask", 14, "或向 Human 提問", "blue"],
  ["model", 10, null, "blue"],
  ["tools", 15, null, "blue"],
  ["env", 19, null, "blue"],
  ["lint", 17, "Lint", "green"],
  ["build", 17, "Build", "green"],
  ["test", 17, "Test", "red"],
  ["testg", 17, "Test", "green"],
  ["auto", 18, "改完自動跑", "green"],
  ["agent", 18, "或由 Agent 執行", "green"],
  ["skills", 9, null, "grey"],
  ["repo", 16, null, "grey"],
  ["perm", 11, "工具權限", "amber"],
  ["branch", 11, "Branch 保護", "amber"],
  ["approve", 11, "核准", "amber"],
];
const wordBox = (ti, w) => {
  const s = MEASURE.texts[ti].text;
  const i = w === null ? 0 : s.indexOf(w);
  if (i < 0) throw new Error(`「${s}」裡找不到「${w}」`);
  const ch = MEASURE.texts[ti].chars.slice(i, i + (w === null ? s.length : w.length));
  const x0 = Math.min(...ch.map((c) => c[0]));
  const x1 = Math.max(...ch.map((c) => c[0] + c[2]));
  return { x: x0, y: ch[0][1], w: x1 - x0, h: ch[0][3] };
};
const wordsByText = {};
const clipDefs = [];
for (const [key, ti, w, col] of WORDS) {
  const b = wordBox(ti, w);
  clipDefs.push(`<clipPath id="${P}cp-${key}"><rect x="${r(b.x - 0.5)}" y="${r(b.y - 2)}" width="${r(b.w + 1)}" height="${r(b.h + 4)}"/></clipPath>`);
  (wordsByText[ti] ||= []).push({ key, b, col });
}
// Test 的紅青錯位
clipDefs.push(`<clipPath id="${P}cp-testx"><rect x="${r(wordBox(17, "Test").x - 4)}" y="${r(wordBox(17, "Test").y - 3)}" width="${r(wordBox(17, "Test").w + 8)}" height="${r(wordBox(17, "Test").h + 6)}"/></clipPath>`);

const pill = (key, b, col) => {
  const h = b.h - 1;
  return `<rect id="pl-${key}" x="${r(b.x - 2.5)}" y="${r(b.y + 0.5)}" width="${r(b.w + 5)}" height="${r(h)}" rx="${r(h / 2)}" fill="${C[col]}" fill-opacity="0.3" stroke="${C[col]}" stroke-width="1" opacity="0"/>`;
};
const overlay = (id, t, ti, clip, fill) =>
  `<text id="${id}" ${attrs({ ...textAttrs(t), fill, "clip-path": `url(#${P}cp-${clip})`, opacity: "0" })}>${esc(t.textContent)}</text>`;

const boxSvg = rects
  .map((rc) => {
    const name = BOX[`${rc.getAttribute("x")},${rc.getAttribute("y")}`];
    if (!name) throw new Error("認不得的格子");
    const [x, y, w, h] = ["x", "y", "width", "height"].map((a) => +rc.getAttribute(a));
    const col = C[BOXCOLOR[name]];
    const parts = [];
    parts.push(`<rect id="gl-${name}" x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="none" stroke="${col}" stroke-width="6" filter="url(#${P}glow)" opacity="0"/>`);
    parts.push(`<rect id="rc-${name}" ${attrs({
      x, y, width: w, height: h, rx: rc.getAttribute("rx"),
      fill: rc.getAttribute("fill"), stroke: rc.getAttribute("stroke"),
      "stroke-width": inherit(rc, "stroke-width"), opacity: inherit(rc, "opacity"),
    })}/>`);
    const mine = texts.map((t, i) => [t, i]).filter(([, i]) => TEXT_BOX[i] === name);
    for (const [, i] of mine) for (const wd of wordsByText[i] || []) parts.push(pill(wd.key, wd.b, wd.col));
    for (const [t, i] of mine) {
      parts.push(`<text id="tx-${i}" ${attrs({ ...textAttrs(t), fill: TEXTFILL[i], opacity: TEXTOP[i] })}>${esc(t.textContent)}</text>`);
    }
    for (const [t, i] of mine) for (const wd of wordsByText[i] || []) parts.push(overlay(`wt-${wd.key}`, t, i, wd.key, "#FFFFFF"));
    if (name === "sensors") {
      parts.push(overlay("wt-testr", texts[17], 17, "testx", "#FF5A6E"));
      parts.push(overlay("wt-testc", texts[17], 17, "testx", "#52D8FF"));
    }
    // 閃框
    parts.push(`<rect id="fl-${name}" x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="none" stroke="#FFFFFF" stroke-width="2.5" opacity="0"/>`);
    return `<g id="bx-${name}">\n${parts.join("\n")}\n</g>`;
  })
  .join("\n");

const labelSvg = texts
  .slice(20)
  .map((t, k) => {
    const i = k + 20;
    return `<text id="tx-${i}" ${attrs({ ...textAttrs(t), fill: TEXTFILL[i], opacity: TEXTOP[i] })}>${esc(t.textContent)}</text>`;
  })
  .join("\n");

// ── 3. 時間軸工具（每個屬性都記住目前的值，fromTo 的起點一定接得上）──────
const js = [];
const state = new Map();
const busy = new Map();
const init = (sel, props, extra = {}) => {
  if (state.has(sel)) throw new Error(`${sel} 重複初始化`);
  state.set(sel, { ...props });
  js.push(`gsap.set(${J(sel)}, ${J({ ...props, ...extra })});`);
};
const claim = (sel, props, t, end) => {
  for (const k of Object.keys(props)) {
    const key = `${sel}|${k}`;
    const e = busy.get(key) ?? 0;
    if (t < e - 1e-6) throw new Error(`${key} 在 ${t} 秒重疊（${e} 秒才結束）`);
    busy.set(key, end);
  }
};
const cur = (sel) => {
  const s = state.get(sel);
  if (!s) throw new Error(`${sel} 沒有初始化`);
  return s;
};
const tw = (sel, to, t, dur, ease = "power2.out") => {
  const s = cur(sel);
  const from = {};
  for (const k of Object.keys(to)) {
    if (!(k in s)) throw new Error(`${sel} 沒有初始的 ${k}`);
    from[k] = s[k];
  }
  claim(sel, to, t, t + dur);
  js.push(`tl.fromTo(${J(sel)}, ${J(from)}, ${J({ ...to, duration: r(dur), ease, immediateRender: false })}, ${r(t)});`);
  Object.assign(s, to);
};
const set = (sel, props, t) => {
  const s = cur(sel);
  for (const k of Object.keys(props)) if (!(k in s)) throw new Error(`${sel} 沒有初始的 ${k}`);
  claim(sel, props, t, t);
  js.push(`tl.set(${J(sel)}, ${J(props)}, ${r(t)});`);
  Object.assign(s, props);
};

// ── 4. 特效元件 ──────────────────────────────────────────────
const fx = [];
const trails = [];
const BOXES = Object.values(BOX);
const BOXGEO = Object.fromEntries(
  rects.map((x) => [BOX[`${x.getAttribute("x")},${x.getAttribute("y")}`], ["x", "y", "width", "height"].map((a) => +x.getAttribute(a))]),
);
for (const b of BOXES) {
  const [x, y, w, h] = BOXGEO[b];
  init(`#bx-${b}`, { opacity: 1, x: 0, y: 0, scale: 1 }, { svgOrigin: `${x + w / 2} ${y + h / 2}` });
  init(`#gl-${b}`, { opacity: 0 });
  init(`#fl-${b}`, { opacity: 0, stroke: "#FFFFFF" });
}
for (const b of AUX) init(`#rc-${b}`, { opacity: 0.72 });
texts.forEach((t, i) => init(`#tx-${i}`, { fill: TEXTFILL[i], opacity: TEXTOP[i] === null ? 1 : +TEXTOP[i] }));
for (const [key] of WORDS) {
  init(`#pl-${key}`, { opacity: 0 });
  init(`#wt-${key}`, { opacity: 0 });
}
init("#wt-testr", { opacity: 0, x: 0 });
init("#wt-testc", { opacity: 0, x: 0 });
init("#lines", { opacity: 1 });
init("#labels", { opacity: 1 });

const TOKENS = ["blue", "green", "amber", "grey", "grey2", "red"];
for (const k of TOKENS) {
  const col = C[k.replace(/\d$/, "")];
  fx.push(`<g id="tk-${k}" opacity="0"><circle r="9" fill="${col}" opacity="0.6" filter="url(#${P}soft)"/><circle r="3.6" fill="#FFFFFF"/></g>`);
  init(`#tk-${k}`, { opacity: 0, x: 0, y: 0 });
}
// 擴散框（落地、Model 判斷、全部通過）
for (const b of BOXES) {
  const rc = rects.find((x) => BOX[`${x.getAttribute("x")},${x.getAttribute("y")}`] === b);
  const [x, y, w, h] = ["x", "y", "width", "height"].map((a) => +rc.getAttribute(a));
  fx.push(`<rect id="rg-${b}" x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="none" stroke="${C[BOXCOLOR[b]]}" stroke-width="2" opacity="0"/>`);
  init(`#rg-${b}`, { opacity: 0, scale: 1 }, { svgOrigin: `${x + w / 2} ${y + h / 2}` });
}
// 環境格裡的掃描線
fx.push(`<clipPath id="${P}cp-envbox"><rect x="850" y="400" width="310" height="120" rx="10"/></clipPath>`);
fx.push(`<g clip-path="url(#${P}cp-envbox)"><rect id="scan" x="850" y="398" width="310" height="3" fill="${C.green}" opacity="0" filter="url(#${P}soft)"/></g>`);
init("#scan", { opacity: 0, y: 0 });
// Guardrails 的擋桿
fx.push(`<pattern id="${P}stripe" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="10" fill="${C.amber}"/><rect x="5" width="5" height="10" fill="#3A3021"/></pattern>`);
fx.push(`<g id="bar" opacity="0"><rect x="965" y="327" width="80" height="9" rx="2" fill="url(#${P}stripe)" stroke="${C.amber}" stroke-width="1"/></g>`);
init("#bar", { opacity: 0, scale: 1 }, { svgOrigin: "1005 331.5" });
// 回頭問 Human 的小問號
fx.push(`<g id="askchip" opacity="0"><circle r="11" fill="#223B47" stroke="${C.blue}" stroke-width="2"/><text y="5.5" text-anchor="middle" font-size="15" font-weight="700" fill="${C.blue}">?</text></g>`);
init("#askchip", { opacity: 0, x: 425, y: 280, scale: 1 }, { transformOrigin: "50% 50%" });
// 3 · 工具呼叫 標籤的重跑提示
state.get("#tx-25").scale = 1;
js.push('gsap.set("#tx-25", { scale: 1, svgOrigin: "792 224" });');
init("#ln-L4", { opacity: 1 });

const trailEl = (line, col) => {
  const id = `tr-${line}-${col}`;
  if (!state.has(`#${id}`)) {
    const pts = PTS[line];
    const len = plen(pts);
    const d = "M" + pts.map((p) => p.join(" ")).join("L");
    const w = line === "SK" || line === "RP" || line === "GD" ? 2.5 : 4.5;
    trails.push(`<path id="${id}" d="${d}" fill="none" stroke="${TRAIL[col]}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${r(len)} ${r(len + 10)}" filter="url(#${P}trail)" opacity="0"/>`);
    init(`#${id}`, { opacity: 0, strokeDashoffset: r(len) });
  }
  return `#${id}`;
};
const travel = (tok, pts, t, dur) => {
  const sel = `#tk-${tok}`;
  set(sel, { opacity: 1, x: pts[0][0], y: pts[0][1] }, t);
  const total = plen(pts);
  let tt = t;
  for (let i = 1; i < pts.length; i++) {
    const d = (dur * Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])) / total;
    tw(sel, { x: pts[i][0], y: pts[i][1] }, tt, d, "none");
    tt += d;
  }
  set(sel, { opacity: 0 }, t + dur + 0.03);
};
// 光點沿原本的箭頭走，經過的線發光
const go = (line, t, dur, col, tok = col) => {
  const pts = PTS[line];
  const tr = trailEl(line, col);
  const len = plen(pts);
  travel(tok, pts, t, dur);
  set(tr, { opacity: 1, strokeDashoffset: r(len) }, t);
  tw(tr, { strokeDashoffset: 0 }, t, dur, "none");
  tw(tr, { opacity: 0 }, t + dur + 0.15, 0.5, "power1.out");
  set(tr, { strokeDashoffset: r(len) }, t + dur + 0.7);
};
const glow = (b, on, t, d = 0.3) => tw(`#gl-${b}`, { opacity: on ? 1 : 0 }, t, d, on ? "power2.out" : "power1.in");
const word = (key, on, t, d = 0.25) => {
  tw(`#pl-${key}`, { opacity: on ? 1 : 0 }, t, d);
  tw(`#wt-${key}`, { opacity: on ? 1 : 0 }, t, d);
};
const label = (i, on, t) => tw(`#tx-${i}`, { fill: on ? "#FFFFFF" : TEXTFILL[i] }, t, 0.2);
const brighten = (b, on, t) => {
  tw(`#rc-${b}`, { opacity: on ? 1 : 0.72 }, t, 0.3);
  texts.forEach((_, i) => {
    if (TEXT_BOX[i] === b) tw(`#tx-${i}`, { opacity: on ? 1 : 0.85 }, t, 0.3);
  });
};
const ring = (b, t, d = 0.55, to = 1.12) => {
  set(`#rg-${b}`, { opacity: 0.9, scale: 1 }, t);
  tw(`#rg-${b}`, { opacity: 0, scale: to }, t, d, "power2.out");
};
const flash = (b, t, color = "#FFFFFF", n = 2) => {
  set(`#fl-${b}`, { stroke: color }, t);
  for (let k = 0; k < n; k++) {
    set(`#fl-${b}`, { opacity: 1 }, t + k * 0.16);
    set(`#fl-${b}`, { opacity: 0 }, t + k * 0.16 + 0.08);
  }
};
// Model 判斷一次：Context 上去、Model 判斷、結果下來
const think = (t) => {
  go("L2", t, 0.4, "blue");
  label(24, true, t);
  glow("model", true, t + 0.4, 0.15);
  word("model", true, t + 0.4, 0.15);
  ring("model", t + 0.45, 0.5, 1.1);
  go("L2d", t + 0.75, 0.4, "blue");
  glow("model", false, t + 1.0, 0.2);
  word("model", false, t + 1.0, 0.2);
  label(24, false, t + 1.15);
  return t + 1.2;
};
// 有東西進到 Runtime 時，「整理 Context」短亮一下
const ctxPulse = (x) => {
  word("ctx", true, x, 0.15);
  word("ctx", false, x + 0.9);
};

// ── 5. 分鏡 ──────────────────────────────────────────────────
// 舞台：投影片上的架構圖位置 ↔ 全畫面（SVG 放大 1.45 倍，左上在 119,70）
const SLIDE = { x: MEASURE.svg.x - 119, y: MEASURE.svg.y - 70, scale: MEASURE.svg.w / 1682 };
init("#d-stage", { x: SLIDE.x, y: SLIDE.y, scale: SLIDE.scale }, { transformOrigin: "0 0" });
init("#d-bare-in-img", { opacity: 1, scale: 1, filter: "blur(0px)" }, { transformOrigin: "50% 50%" });
init("#d-bare-out-img", { opacity: 0, scale: 1.06, filter: "blur(6px)" }, { transformOrigin: "50% 50%" });
init("#d-cam", { x: 0 });
init("#d-mtext", { opacity: 0, filter: "blur(0px)" });
// 和投影片同姿勢時維持 hidden（與截圖逐像素一致）；全畫面時讓格子從螢幕邊緣出入、光暈不被切
init("#d-svg", { overflow: "hidden" });
init("#d-cursor", { opacity: 0 });

const CAPS = [];
const cap = (t0, t1, html, extra = "") => CAPS.push({ t0, t1, html, extra });
const SFX = [];
// sfx(檔名, 起點, 長度, 音量, 從檔案第幾秒開始)；起點已扣掉音效本身的起音時間
const sfx = (file, t, dur, vol, mediaStart = 0) => SFX.push({ file, t, dur, vol, mediaStart });
// 總增益：音效多是短促的點綴，乘上去讓整體響度接近另外兩集（約 -22 LUFS）
const MASTER = 1.6;

// S0 投影片 → 推近架構圖
const PUSH = 1.5;
tw("#d-stage", { x: 0, y: 0, scale: 1 }, PUSH + 0.1, 1.3, "power2.inOut");
// 外框必須在 SVG 上緣越過副標（推近約 1.99 秒、拉回約 57.38 秒）之前或之後才可見
tw("#d-bare-in-img", { opacity: 0, scale: 1.06, filter: "blur(6px)" }, PUSH + 0.1, 0.4, "power1.inOut");
sfx("whoosh-cinematic", PUSH - 0.6, 2.0, 0.35, 1.5);

// S1 只有 Model
let t = 3.2;
set("#d-svg", { overflow: "visible" }, t + 0.1);
tw("#lines", { opacity: 0 }, t, 0.3, "power1.in");
tw("#labels", { opacity: 0 }, t, 0.3, "power1.in");
const AWAY = {
  runtime: { scale: 0.5 },
  tools: { x: 480 },
  guard: { x: 380, y: -240 },
  skills: { x: -380, y: -240 },
  repo: { x: -380, y: 240 },
  sensors: { y: 340 },
};
Object.entries(AWAY).forEach(([b, move], k) => {
  tw(`#bx-${b}`, { ...move, opacity: 0 }, t + 0.1 + k * 0.06, 0.55, "power3.in");
});
tw("#bx-human", { opacity: 0 }, t + 0.2, 0.4, "power1.in");
tw("#bx-env", { opacity: 0 }, t + 0.2, 0.4, "power1.in");
sfx("whoosh-short", t + 0.38, 0.6, 0.45);
glow("model", true, 4.2, 0.4);
// Model 只回一行字
const MTEXT = "呼叫工具：執行測試";
const TYPE = 4.6;
set("#d-mtext", { opacity: 1 }, TYPE - 0.05);
[...MTEXT].forEach((_, i) => {
  init(`#d-mc${i}`, { display: "none" });
  set(`#d-mc${i}`, { display: "inline" }, TYPE + i * 0.065);
});
set("#d-cursor", { opacity: 1 }, TYPE);
for (let k = 0; k < 6; k++) {
  set("#d-cursor", { opacity: 0 }, TYPE + 0.9 + k * 0.5);
  set("#d-cursor", { opacity: 1 }, TYPE + 1.15 + k * 0.5);
}
sfx("typing", TYPE - 0.45, 1.0, 0.35);
cap(5.6, 8.4, '<span class="hl">Model</span> 只會回文字');
tw("#d-mtext", { opacity: 0, filter: "blur(8px)" }, 8.3, 0.3, "power2.in");
set("#d-cursor", { opacity: 0 }, 8.62);
glow("model", false, 8.3, 0.3);

// S2 其他部分接回來，公式
t = 8.7;
tw("#bx-human", { opacity: 1 }, t, 0.35);
tw("#bx-env", { opacity: 1 }, t, 0.35);
Object.keys(AWAY).forEach((b, k) => {
  const back = { opacity: 1, x: 0, y: 0, scale: 1 };
  const tb = t + 0.25 + k * 0.12;
  tw(`#bx-${b}`, back, tb, 0.6, "expo.out");
  ring(b, tb + 0.35, 0.6, 1.1);
  if (k % 2 === 0) sfx("whoosh-short", tb, 0.6, 0.26);
});
const ON = 10.3;
tw("#lines", { opacity: 1 }, ON - 0.25, 0.3);
tw("#labels", { opacity: 1 }, ON, 0.3);
for (const [k, line] of ["L1", "L2", "L3", "LR", "L4", "L5", "L6", "SK", "RP", "GD"].entries()) {
  const col = { L5: "green", L6: "green", SK: "grey", RP: "grey", GD: "amber", L1: "amber" }[line] || "blue";
  const tr = trailEl(line, col);
  const len = plen(PTS[line]);
  set(tr, { opacity: 1, strokeDashoffset: r(len) }, ON + k * 0.04);
  tw(tr, { strokeDashoffset: 0 }, ON + k * 0.04, 0.45, "power1.inOut");
  tw(tr, { opacity: 0 }, ON + 0.75, 0.5, "power1.out");
  set(tr, { strokeDashoffset: r(len) }, ON + 1.3);
}
const HARNESS = ["runtime", "tools", "guard", "skills", "repo", "sensors"];
const F = 11.4;
cap(F, 15.0, '<span class="f-w" id="f-agent">Agent</span> = <span class="f-w" id="f-model">Model</span> + <span class="f-w" id="f-harness">Harness</span>', "formula");
const FB = [F + 0.6, F + 1.4, F + 2.2];
const dimBx = (list, v, at, d = 0.25) => list.forEach((b) => tw(`#bx-${b}`, { opacity: v }, at, d));
dimBx(["human", "env"], 0.35, FB[0]); // Agent 拍：Human、環境退後
dimBx(HARNESS, 0.35, FB[1], 0.2); // Model 拍：只剩 Model
dimBx(HARNESS, 1, FB[2]); // Harness 拍：六格回來
dimBx(["model"], 0.35, FB[2]); //           Model 退後
dimBx(["model", "human", "env"], 1, 14.9, 0.35);
for (const b of ["model", ...HARNESS]) glow(b, true, FB[0], 0.25);
for (const b of HARNESS) glow(b, false, FB[1], 0.2);
glow("model", false, FB[2], 0.2);
for (const b of HARNESS) glow(b, true, FB[2], 0.25);
for (const b of HARNESS) glow(b, false, 14.9, 0.35);
FB.forEach((x) => sfx("click-soft", x - 0.05, 0.4, 0.5));

// S3 ① 委派任務
t = 15.3;
glow("human", true, t);
word("goal", true, t);
go("L1", t + 0.5, 0.45, "amber");
label(23, true, t + 0.5);
glow("runtime", true, t + 0.95);
word("ctx", true, t + 0.95);
cap(t + 0.2, t + 2.7, "1 · 委派任務");
glow("human", false, t + 2.4);
word("goal", false, t + 2.4);
label(23, false, t + 2.4);
glow("runtime", false, t + 2.4);
sfx("click-soft", t + 0.45, 0.4, 0.45);

// S4 輔助輸入：流程指引、業務依據
t = 18.2;
brighten("skills", true, t);
word("skills", true, t);
go("SK", t + 0.4, 0.7, "grey");
label(20, true, t + 0.4);
ring("runtime", t + 1.1, 0.45, 1.06);
cap(t + 0.2, t + 2.1, "流程指引");
brighten("skills", false, t + 1.9);
word("skills", false, t + 1.9);
label(20, false, t + 1.9);
t = 20.4;
brighten("repo", true, t);
word("repo", true, t);
go("RP", t + 0.4, 0.7, "grey");
label(21, true, t + 0.4);
ring("runtime", t + 1.1, 0.45, 1.06);
cap(t + 0.2, t + 2.1, "業務依據");
brighten("repo", false, t + 1.9);
word("repo", false, t + 1.9);
label(21, false, t + 1.9);
word("ctx", false, t + 1.9);
sfx("click-soft", 18.55, 0.4, 0.35);
sfx("click-soft", 20.75, 0.4, 0.35);

// S5 ② 推理與回應
t = 22.9;
go("L2", t, 0.45, "blue");
label(24, true, t);
glow("model", true, t + 0.45);
word("model", true, t + 0.45);
ring("model", t + 1.1, 0.55, 1.1);
go("L2d", t + 1.5, 0.45, "blue");
cap(t + 0.2, t + 2.9, '<span class="hl">Model</span> 負責推理');
glow("model", false, t + 2.7);
word("model", false, t + 2.7);
label(24, false, t + 2.7);
sfx("ping", t + 1.1 - 0.32, 0.9, 0.3);

// S6 ③④ Harness 執行工具、帶回結果
t = 26.4;
go("L3", t, 0.4, "blue");
label(25, true, t);
go("GD", t + 0.05, 0.3, "amber");
word("perm", true, t + 0.1);
glow("tools", true, t + 0.4);
word("tools", true, t + 0.4);
go("L4", t + 0.9, 0.4, "blue");
label(27, true, t + 0.9);
glow("env", true, t + 1.3);
word("env", true, t + 1.3);
flash("env", t + 1.3);
go("LR", t + 1.9, 0.45, "blue");
label(26, true, t + 1.9);
ring("runtime", t + 2.35, 0.45, 1.06);
ctxPulse(t + 2.35);
word("perm", false, t + 1.0);
cap(t + 0.2, t + 3.9, '<span class="hl">Harness</span> 負責執行工具、帶回結果');
for (const b of ["tools", "env"]) glow(b, false, t + 3.7);
word("tools", false, t + 3.7);
word("env", false, t + 3.7);
for (const i of [25, 27, 26]) label(i, false, t + 3.7);
sfx("click-soft", t - 0.05, 0.4, 0.4);
sfx("click-soft", t + 0.85, 0.4, 0.4);
sfx("click-soft", t + 1.85, 0.4, 0.4);

// S7 ⑤⑥ 驗證
t = 30.8;
glow("sensors", true, t);
word("auto", true, t);
word("agent", true, t + 0.15);
go("L5", t + 0.6, 0.45, "green");
label(28, true, t + 0.6);
set("#scan", { opacity: 1, y: 0 }, t + 1.05);
tw("#scan", { y: 122 }, t + 1.05, 0.55, "power1.inOut");
set("#scan", { opacity: 0 }, t + 1.62);
word("lint", true, t + 1.8, 0.15);
word("build", true, t + 2.1, 0.15);
word("test", true, t + 2.4, 0.15);
for (const [dt, x, o] of [[0, -2.5, 0.9], [0.07, 2, 0.9], [0.14, -1.5, 0.7], [0.22, 0, 0]]) {
  set("#wt-testr", { x, opacity: o }, t + 2.4 + dt);
  set("#wt-testc", { x: -x, opacity: o }, t + 2.4 + dt);
}
flash("sensors", t + 2.4, C.red);
for (const [dt, x] of [[0, 4], [0.05, -3], [0.1, 2], [0.15, 0]]) set("#d-cam", { x }, t + 2.4 + dt);
go("L6", t + 2.9, 0.45, "red");
label(29, true, t + 2.9);
flash("runtime", t + 3.35, C.red);
ctxPulse(t + 3.35);
cap(t + 0.4, t + 2.8, "5 · 跑檢查");
cap(t + 2.9, t + 5.0, "6 · 驗證回饋");
sfx("click-soft", t + 0.55, 0.4, 0.35);
sfx("pop", t + 1.8 - 0.12, 0.5, 0.25);
sfx("pop", t + 2.1 - 0.12, 0.5, 0.25);
sfx("error", t + 2.4 - 0.62, 1.1, 0.9, 0);
label(28, false, t + 4.8);
label(29, false, t + 4.8);
for (const k of ["lint", "build", "auto", "agent"]) word(k, false, t + 4.8);
glow("sensors", false, t + 4.8);

// S8 沒過：修正後再從工具呼叫跑一輪
t = 36.0;
let tt = think(t);
word("decide", true, tt);
word("again", true, tt + 0.1);
cap(t, t + 1.5, "未通過就修正後");
tw("#tx-25", { scale: 1.15, fill: "#FFFFFF" }, t + 1.6, 0.18, "power2.out");
tw("#tx-25", { scale: 1 }, t + 1.78, 0.3, "power2.inOut");
t = 38.0;
go("L3", t, 0.4, "blue");
go("GD", t + 0.05, 0.3, "amber");
flash("tools", t + 0.4, "#FFFFFF", 1);
go("L4", t + 0.6, 0.4, "blue");
label(27, true, t + 0.6);
flash("env", t + 1.0, "#FFFFFF", 1);
go("LR", t + 1.2, 0.45, "blue");
label(26, true, t + 1.2);
cap(t - 0.45, t + 2.9, "再從工具呼叫跑一輪");
go("L5", t + 1.95, 0.45, "green");
label(28, true, t + 1.95);
word("auto", true, t + 1.95);
set("#scan", { opacity: 1, y: 0 }, t + 2.4);
tw("#scan", { y: 122 }, t + 2.4, 0.5, "power1.inOut");
set("#scan", { opacity: 0 }, t + 2.92);
word("lint", true, t + 2.45, 0.15);
word("build", true, t + 2.7, 0.15);
word("test", false, t + 2.95, 0.15);
word("testg", true, t + 2.95, 0.2);
glow("sensors", true, t + 2.95, 0.2);
flash("sensors", t + 2.95, "#FFFFFF", 2);
ring("sensors", t + 3.0, 0.6, 1.1);
go("L6", t + 3.3, 0.45, "green");
label(29, true, t + 3.3);
word("again", false, t + 3.75);
word("ctx", true, t + 3.75, 0.15);
ring("runtime", t + 3.75, 0.45, 1.06);
sfx("click-soft", t - 0.05, 0.4, 0.35);
sfx("pop", t + 2.45 - 0.12, 0.5, 0.25);
sfx("pop", t + 2.7 - 0.12, 0.5, 0.25);
sfx("pop", t + 2.95 - 0.12, 0.6, 0.45);
sfx("chime", t + 3.0 - 0.42, 2.5, 0.18);
t = 42.2;
for (const k of ["decide", "again", "ctx", "lint", "build", "testg", "auto", "agent"]) word(k, false, t);
glow("sensors", false, t);
for (const i of [25, 26, 27, 28, 29]) label(i, false, t);

// S9 需要人判斷時回頭向 Human 提問
t = 42.8;
tt = think(t);
word("ask", true, tt);
set("#askchip", { opacity: 1, x: 425, y: 280, scale: 0.4 }, tt + 0.25);
tw("#askchip", { scale: 1 }, tt + 0.25, 0.2, "back.out(2)");
tw("#askchip", { x: 300 }, tt + 0.35, 0.55, "power2.inOut");
glow("human", true, tt + 0.9);
word("judge", true, tt + 0.9);
tw("#askchip", { opacity: 0, scale: 0.6 }, tt + 1.1, 0.2, "power1.in");
travel("amber", [[310, 280], [425, 280]], tt + 1.8, 0.5);
ring("runtime", tt + 2.3, 0.45, 1.06);
ctxPulse(tt + 2.3);
cap(t + 1.1, t + 4.3, "需要人判斷時回頭向 <span class=\"hl\">Human</span> 提問");
glow("human", false, t + 4.1);
word("judge", false, t + 4.1);
word("ask", false, t + 4.1);
sfx("notification", tt + 0.25 - 0.08, 1.1, 0.22);

// S10 Guardrails 限制操作
t = 47.4;
tt = think(t);
go("L3", tt, 0.4, "blue");
label(25, true, tt);
glow("tools", true, tt + 0.4);
const SLAM = tt + 0.45;
brighten("guard", true, SLAM - 0.1);
go("GD", SLAM, 0.3, "amber");
label(22, true, SLAM);
glow("guard", true, SLAM + 0.25);
word("perm", true, SLAM + 0.3);
word("branch", true, SLAM + 0.4);
word("approve", true, SLAM + 0.5);
// 工具呼叫才冒出來就被擋住
const STOP = SLAM + 0.3;
set("#tk-blue", { opacity: 1, x: 1005, y: 320 }, STOP);
tw("#tk-blue", { y: 326 }, STOP, 0.12, "power2.out");
set("#bar", { opacity: 0, scale: 1.8 }, STOP);
tw("#bar", { opacity: 1, scale: 1 }, STOP, 0.16, "power4.in");
flash("tools", STOP + 0.16, C.amber, 3);
tw("#ln-L4", { opacity: 0.35 }, STOP + 0.1, 0.2);
for (const [dt, x] of [[0.16, 4], [0.22, -3], [0.28, 2], [0.34, 0]]) set("#d-cam", { x }, STOP + dt);
cap(SLAM + 0.2, SLAM + 2.6, "限制操作");
tw("#tk-blue", { opacity: 0 }, SLAM + 1.9, 0.3, "power1.in");
tw("#bar", { opacity: 0 }, SLAM + 2.2, 0.3, "power1.in");
glow("tools", false, SLAM + 2.3);
tw("#ln-L4", { opacity: 1 }, SLAM + 2.3, 0.3);
glow("guard", false, SLAM + 2.3);
brighten("guard", false, SLAM + 2.3);
for (const k of ["perm", "branch", "approve"]) word(k, false, SLAM + 2.3);
label(22, false, SLAM + 2.3);
label(25, false, SLAM + 2.3);
sfx("whoosh-short", STOP, 0.45, 0.25);
sfx("impact-bass-1", STOP + 0.16 - 0.05, 0.45, 0.12);
sfx("click-soft", tt - 0.05, 0.4, 0.35);

// S11 完成一段工作，還要接上專案知識與驗證
t = 52.4;
const DIM = ["model", "guard", "human", "runtime", "tools", "env"];
for (const b of DIM) tw(`#bx-${b}`, { opacity: 0.35 }, t, 0.4);
tw("#lines", { opacity: 0.35 }, t, 0.4);
tw("#labels", { opacity: 0.35 }, t, 0.4);
cap(t + 0.2, t + 3.6, "完成一段工作，還要接上<span class=\"hl\">專案知識</span>與<span class=\"hl\">驗證</span>");
brighten("skills", true, t + 0.7);
brighten("repo", true, t + 0.7);
glow("skills", true, t + 0.7);
glow("repo", true, t + 0.7);
go("SK", t + 1.0, 0.7, "grey");
go("RP", t + 1.0, 0.7, "grey", "grey2");
glow("sensors", true, t + 1.5);
go("L5", t + 1.7, 0.4, "green");
go("L6", t + 2.2, 0.4, "green");
sfx("sparkle", t + 0.7, 1.2, 0.08);
const BACK = 55.8;
for (const b of DIM) tw(`#bx-${b}`, { opacity: 1 }, BACK, 0.4);
tw("#lines", { opacity: 1 }, BACK, 0.4);
tw("#labels", { opacity: 1 }, BACK, 0.4);
for (const b of ["skills", "repo", "sensors"]) glow(b, false, BACK, 0.4);
brighten("skills", false, BACK);
brighten("repo", false, BACK);

// S12 拉回投影片
const PULL = 56.4;
tw("#d-stage", { x: SLIDE.x, y: SLIDE.y, scale: SLIDE.scale }, PULL, 1.4, "power2.inOut");
set("#d-svg", { overflow: "hidden" }, PULL + 0.4);
tw("#d-bare-out-img", { opacity: 1, scale: 1, filter: "blur(0px)" }, PULL + 1.0, 0.4, "power2.out");
sfx("whoosh-cinematic", PULL - 0.6, 2.0, 0.3, 1.5);
const CUT = r(PULL + 1.6);
const END = r(CUT + 1.2);

// ── 6. 輸出 ─────────────────────────────────────────────────
const FONTFACE = [400, 500, 600, 700, 800]
  .map(
    (w) =>
      `@font-face{font-family:"Inter";src:url("assets/fonts/Inter-${w}.woff2") format("woff2");font-weight:${w};font-display:block}\n` +
      `@font-face{font-family:"Noto Sans TC";src:url("assets/fonts/NotoSansTC-${w}.woff2") format("woff2");font-weight:${w};font-display:block}`,
  )
  .join("\n");

const svgOut = `<svg id="d-svg" viewBox="0 0 1160 530" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Agentic Harness 架構圖（取自簡報 p.6）">
<defs>
${defs}
<filter id="${P}glow" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>
<filter id="${P}soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter>
<filter id="${P}trail" filterUnits="userSpaceOnUse" x="-20" y="-20" width="1200" height="570"><feGaussianBlur stdDeviation="2.2"/></filter>
${clipDefs.join("\n")}
</defs>
<rect x="0" y="0" width="1160" height="530" fill="#0b1626"/>
<g id="lines">
${lineSvg}
</g>
<g id="trails">
${trails.join("\n")}
</g>
${boxSvg}
<g id="labels">
${labelSvg}
</g>
<g id="fx">
${fx.join("\n")}
</g>
</svg>`;

const diagram = `<template>
<style>
${FONTFACE}
#diagram{position:absolute;inset:0;background:#0b1626;overflow:hidden}
#d-cam{position:absolute;inset:0}
.d-plate{position:absolute;left:0;top:0;width:1920px;height:1080px}
.d-plate>div{position:absolute;left:0;top:0;width:1920px;height:1080px;background-size:1920px 1080px}
.p-full{background-image:url("assets/plates/slide-full.png")}
.p-bare{background-image:url("assets/plates/slide-bare.png")}
#d-stagewrap{position:absolute;inset:0}
#d-stage{position:absolute;left:119px;top:70px;width:1682px;height:768.5px}
#d-svg{display:block;width:1682px;height:768.5px;font-family:Inter,"Noto Sans TC",sans-serif}
#d-mtext{position:absolute;left:0;top:226px;width:1682px;text-align:center;font:500 40px/56px Inter,"Noto Sans TC",sans-serif;color:${C.blue};letter-spacing:0.02em}
#d-cursor{display:inline-block;width:20px;height:42px;margin-left:6px;vertical-align:-6px;background:${C.blue}}
</style>
<div id="diagram" data-composition-id="diagram" data-width="1920" data-height="1080">
  <div id="d-cam">
    <div id="d-bare-in" class="clip d-plate" data-start="${PUSH}" data-duration="${r(1.2)}" data-layout-ignore><div id="d-bare-in-img" class="p-bare"></div></div>
    <div id="d-bare-out" class="clip d-plate" data-start="${r(PULL)}" data-duration="${r(CUT - PULL)}" data-layout-ignore><div id="d-bare-out-img" class="p-bare" style="opacity:0"></div></div>
    <div id="d-stagewrap" class="clip" data-start="${PUSH}" data-duration="${r(CUT - PUSH)}" data-layout-allow-overlap>
      <div id="d-stage">
${svgOut}
        <div id="d-mtext" style="opacity:0">${[...MTEXT].map((c, i) => `<span id="d-mc${i}" style="display:none">${c}</span>`).join("")}<span id="d-cursor" style="opacity:0"></span></div>
      </div>
    </div>
  </div>
  <div id="d-full-in" class="clip d-plate" data-start="0" data-duration="${PUSH}" data-layout-ignore><div class="p-full"></div></div>
  <div id="d-full-out" class="clip d-plate" data-start="${CUT}" data-duration="${r(END - CUT)}" data-layout-ignore><div class="p-full"></div></div>
</div>
<script>
const tl = gsap.timeline({ paused: true });
${js.join("\n")}
window.__timelines["diagram"] = tl;
</script>
</template>
`;

// 字幕：一次只出現一則；進場模糊淡入，出場模糊淡出
const capJs = [];
const capHtml = CAPS.map((c, i) => {
  const id = `cap-${i + 1}`;
  const dur = r(c.t1 - c.t0);
  capJs.push(`tl.fromTo("#${id}-in", { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.2, ease: "power2.out" }, ${r(c.t0)});`);
  capJs.push(`tl.fromTo("#${id}-in", { opacity: 1, filter: "blur(0px)" }, { opacity: 0, filter: "blur(6px)", duration: 0.16, ease: "power2.in", immediateRender: false }, ${r(c.t1 - 0.17)});`);
  return `  <div id="${id}" class="clip cap${c.extra ? " " + c.extra : ""}" data-start="${r(c.t0)}" data-duration="${dur}"><span id="${id}-in" class="cap-in">${c.html}</span></div>`;
});
// 公式三拍：Agent → Model → Harness
const fIdx = CAPS.findIndex((c) => c.extra === "formula");
const FON = { backgroundColor: "rgba(125,188,209,0.28)", boxShadow: "0 0 0 2px rgba(125,188,209,0.9)", color: "#FFFFFF" };
const FOFF = { backgroundColor: "rgba(125,188,209,0)", boxShadow: "0 0 0 2px rgba(125,188,209,0)", color: "#EDF3FD" };
const fState = { "f-agent": FOFF, "f-model": FOFF, "f-harness": FOFF };
const fSet = (id, on, at) => {
  const to = on ? FON : FOFF;
  capJs.push(`tl.fromTo("#${id}", ${J(fState[id])}, ${J({ ...to, duration: 0.2, ease: "power2.out", immediateRender: false })}, ${r(at)});`);
  fState[id] = to;
};
if (fIdx >= 0) {
  capJs.unshift(`gsap.set([".f-w"], ${J(FOFF)});`);
  fSet("f-agent", true, FB[0]);
  fSet("f-agent", false, FB[1]);
  fSet("f-model", true, FB[1]);
  fSet("f-model", false, FB[2]);
  fSet("f-harness", true, FB[2]);
}
const captions = `<template>
<style>
${FONTFACE}
#captions{position:absolute;inset:0}
.cap{position:absolute;left:0;top:876px;width:1920px;height:84px;text-align:center;font:700 44px/84px "Noto Sans TC",Inter,sans-serif;color:#EDF3FD;letter-spacing:0.02em}
.cap .hl{color:${C.blue}}
.cap.formula{font:800 60px/84px Inter,"Noto Sans TC",sans-serif;letter-spacing:0}
.cap-in{display:inline-block}
.f-w{display:inline-block;padding:0 14px;border-radius:999px;line-height:72px}
</style>
<div id="captions" data-composition-id="captions" data-width="1920" data-height="1080">
${capHtml.join("\n")}
</div>
<script>
const tl = gsap.timeline({ paused: true });
${capJs.join("\n")}
window.__timelines["captions"] = tl;
</script>
</template>
`;

const audio = SFX.map(
  (s, i) =>
    `    <audio id="sfx-${i + 1}" class="clip" src="assets/sfx/${s.file}.mp3" data-start="${r(Math.max(0, s.t))}" data-duration="${r(s.dur)}"${s.mediaStart ? ` data-media-start="${r(s.mediaStart)}"` : ""} data-volume="${r(s.vol * MASTER)}" data-fade-out="${r(Math.min(0.15, s.dur / 3))}" data-track-index="${10 + (i % 4)}"></audio>`,
).join("\n");

const index = `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <title>p.6 一段工作，需要哪些部分一起合作</title>
    <script src="assets/vendor/gsap.min.js"></script>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${END}" data-width="1920" data-height="1080">
      <div id="diagram" data-composition-id="diagram" data-composition-src="compositions/diagram.html" data-start="0" data-duration="${END}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>
      <div id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${END}" data-track-index="2" data-track-kind="captions" data-width="1920" data-height="1080" style="z-index:2"></div>
${audio}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;

writeFileSync(resolve(ROOT, "compositions/diagram.html"), diagram);
writeFileSync(resolve(ROOT, "compositions/captions.html"), captions);
writeFileSync(resolve(ROOT, "index.html"), index);
console.log(`片長 ${END} 秒；字幕 ${CAPS.length} 則；音效 ${SFX.length} 個；時間軸 ${js.length} 行`);

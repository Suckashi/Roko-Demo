// 由下方的劇情資料產生整支影片的場景（compositions/*.html）與 index.html。
// 用法：bash scripts/fetch-media.sh && node scripts/bake-backgrounds.mjs <playwright-core> && node scripts/build-league.mjs
// 所有座標都是原生 320×180 像素；舞台放大 6 倍輸出 1920×1080。
import { readFileSync, writeFileSync, mkdirSync, symlinkSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const P = "assets/pokemon";
const S = "assets/sprites";
const sheet = (name) => JSON.parse(readFileSync(join(root, P, `${name}-sheet.json`), "utf8"));

// ── 劇情資料 ───────────────────────────────────────────────
const TRAINERS = [
  {
    key: "b1",
    name: "花月",
    sprite: "trainer-sidney-gen3.png",
    step: 2,
    gag: "乾等",
    moves: ["TDD 自我驗證", "多開 Session", "grill-with-docs", "Git Worktree"],
    team: [
      { name: "引夢貘人", file: "hypno", problem: "盯著它，怕它做錯", move: "TDD 自我驗證" },
      { name: "呆呆獸", file: "slowpoke", problem: "等它跑完，順便泡咖啡", move: "多開 Session" },
      { name: "可達鴨", file: "psyduck", problem: "需求講不清楚，它會做歪", move: "grill-with-docs" },
      { name: "三地鼠", file: "dugtrio", problem: "同時改同一份 code，會打架", move: "Git Worktree" },
    ],
  },
  {
    key: "b2",
    name: "芙蓉",
    sprite: "trainer-phoebe-gen3.png",
    step: 3,
    gag: "直接全面開放",
    moves: ["低風險試行", "只放手測得到的", "打好測試環境", "grill-with-docs", "/retro"],
    team: [
      { name: "果然翁", file: "wobbuffet", problem: "公司願不願意讓 Agent 自動合併", move: "低風險試行" },
      { name: "百變怪", file: "ditto", problem: "敢不敢放手，要看測不測得到", move: "只放手測得到的" },
      { name: "樹才怪", file: "sudowoodo", problem: "測試環境不完整，上線前才測得出來", move: "打好測試環境" },
      { name: "天然鳥", file: "xatu", problem: "業務規則還有一部分沒寫下來", move: "grill-with-docs" },
      { name: "小拉達", file: "rattata", problem: "自動驗證抓不到 Reviewer 會挑的問題", move: "/retro" },
    ],
  },
];

// 每場 6 秒；每位天王第一場先選錯招，多 2.6 秒
const ROUND = 6;
const GAG = 2.6;
const battleLength = (t) => t.team.length * ROUND + GAG;

// 兩集的場景順序與長度（秒）；每集的時間從 0 開始
const PARTS = {
  ep1: [["oak", 6], ["lab", 6.5], ["hall", 5.5], ["vs1", 3.5], ["bat1", battleLength(TRAINERS[0])], ["win1", 6], ["tease1", 8]],
  ep2: [["recap2", 5], ["vs2", 3.5], ["bat2", battleLength(TRAINERS[1])], ["win2", 6], ["tbc", 10]],
};
const AT = {};
const PART_OF = {};
const TOTAL = {};
for (const [part, list] of Object.entries(PARTS)) {
  let clock = 0;
  for (const [id, dur] of list) {
    AT[id] = { start: clock, dur };
    PART_OF[id] = part;
    clock += dur;
  }
  TOTAL[part] = Math.round(clock * 1000) / 1000;
}

// ── 共用樣式與腳本 ─────────────────────────────────────────
const CSS = `
  @font-face { font-family: "Fusion Pixel 12px Proportional TC"; src: url("assets/fonts/fusion-pixel-12px-proportional-tc.woff2") format("woff2"); }
  #root { position: absolute; inset: 0; background: #000; overflow: hidden; }
  .stage { position: absolute; left: 0; top: 0; width: 320px; height: 180px; transform: scale(6); transform-origin: 0 0; overflow: hidden;
    font-family: "Fusion Pixel 12px Proportional TC", sans-serif; font-size: 12px; line-height: 14px; color: #404040; }
  .stage img, .stage .px { position: absolute; image-rendering: pixelated; }
  .bg { left: 0; top: 0; width: 320px; height: 180px; }
  .t { position: absolute; white-space: nowrap; }
  .gtx { color: #404040; text-shadow: 1px 0 #D0D0C0, 0 1px #D0D0C0, 1px 1px #D0D0C0; }
  .stuck { color: #9A5500; text-shadow: 1px 0 #E8D0A0, 0 1px #E8D0A0, 1px 1px #E8D0A0; }
  .hl { color: #2858B0; text-shadow: 1px 0 #B8C8E8, 0 1px #B8C8E8, 1px 1px #B8C8E8; }
  .outline { color: #F8F8F8; text-shadow: 1px 0 #383838, -1px 0 #383838, 0 1px #383838, 0 -1px #383838; }
  .msg { position: absolute; left: 10px; top: 137px; }
  .line { display: block; width: max-content; white-space: nowrap; margin-bottom: 4px; }
  .layer { position: absolute; inset: 0; }
`;
const JS = `
  const tl = gsap.timeline({ paused: true });
  const $ = (s) => document.querySelector(s);
  function playSheet(el, frames, fps, w, start, dur) {
    const p = { t: 0 };
    tl.fromTo(p, { t: 0 }, { t: dur, duration: dur, ease: "none", immediateRender: false,
      onUpdate: () => { el.style.backgroundPosition = (-(Math.floor(p.t * fps + 1e-6) % frames) * w) + "px 0px"; } }, start);
  }
  function type(line, start) {
    const n = [...line.textContent].length;
    const d = n * 0.035;
    tl.fromTo(line, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: d, ease: "steps(" + n + ")" }, start);
    return start + d;
  }
  function typeMsg(sel, start) {
    let t = start;
    document.querySelector(sel).querySelectorAll(".line").forEach((l) => { t = type(l, t) + 0.08; });
  }
`;

// 一則訊息（1–2 行），在 [start, start+dur) 顯示，打字機從 start 開始
const msgs = [];
function msg(id, start, dur, lines) {
  msgs.push([id, start]);
  return `<div id="${id}" class="msg clip" data-start="${r(start)}" data-duration="${r(dur)}">${lines
    .map((l) => `<div class="line gtx">${l}</div>`)
    .join("")}</div>`;
}
const r = (n) => Math.round(n * 1000) / 1000;

// overlay：放在像素舞台外、用 1920×1080 螢幕座標的圖層（例如 JoJo 箭頭）
function scene(id, body, overlayOrScript, maybeScript) {
  const overlay = maybeScript === undefined ? "" : overlayOrScript;
  const script = maybeScript === undefined ? overlayOrScript : maybeScript;
  const typing = msgs.map(([m, s]) => `typeMsg("#${m}", ${r(s)});`).join("\n  ");
  msgs.length = 0;
  const html = `<template>
<style>${CSS}</style>
<div id="root" data-composition-id="${id}" data-width="1920" data-height="1080">
<div class="stage">
${body}
</div>
${overlay}
</div>
<script>
(function () {
${JS}
  ${typing}
${script}
  window.__timelines["${id}"] = tl;
})();
</script>
</template>
`;
  writeFileSync(join(root, "compositions", `${id}.html`), html);
}

mkdirSync(join(root, "compositions"), { recursive: true });

// ── 序章：大木博士 ─────────────────────────────────────────
scene(
  "oak",
  `<img class="bg" src="${P}/bg-oak.png" alt="" />
${msg("oak-m1", 0.4, 5.6, ["歡迎來到 Agent 的世界！", '我是<span class="hl">大木博士</span>。你還沒有夥伴吧？'])}
<div id="oak-fade" class="layer" style="background:#fff"></div>`,
  `  tl.fromTo("#oak-fade", { opacity: 1 }, { opacity: 0, duration: 0.4, ease: "power1.out" }, 0);`,
);

// ── 研究所：拿到 Clawd ─────────────────────────────────────
const sparkles = [
  [136, 62],
  [182, 60],
  [132, 84],
  [186, 82],
]
  .map(
    ([x, y], i) =>
      `<div id="lab-s${i}" class="t outline" style="left:${x}px;top:${y}px">✦</div>`,
  )
  .join("");
scene(
  "lab",
  `<img class="bg" src="${P}/bg-lab.png" alt="" />
<img id="lab-ball" src="${P}/pokeball.svg" style="left:154px;top:82px;width:12px;height:12px" alt="" />
<div id="lab-flash" class="px" style="left:140px;top:68px;width:40px;height:40px;border-radius:50%;background:#fff;opacity:0"></div>
<div id="lab-clawd" class="px" style="left:143px;top:67px;width:35px;height:27px;background:url('${S}/clawd-battle-sheet.svg') 0 0 / 70px 27px;transform-origin:50% 100%"></div>
<div id="lab-sparkles" class="layer">${sparkles}</div>
${msg("lab-m1", 1.2, 4.8, ['<span class="hl">小智</span>得到了 <span class="hl">Clawd</span>！', "Step 1 開始：一個人＋一隻 Agent"])}`,
  `  tl.fromTo("#lab-ball", { rotation: 0 }, { rotation: 20, duration: 0.15, ease: "steps(2)", yoyo: true, repeat: 3 }, 0.3);
  tl.fromTo("#lab-ball", { opacity: 1 }, { opacity: 0, duration: 0.01 }, 1.0);
  tl.fromTo("#lab-flash", { scale: 0, opacity: 1 }, { scale: 1.6, opacity: 0, duration: 0.3, ease: "power2.out" }, 1.0);
  tl.fromTo("#lab-clawd", { scale: 0 }, { scale: 1, duration: 0.3, ease: "back.out(1.7)" }, 1.05);
  playSheet($("#lab-clawd"), 2, 2.5, 35, 1.4, 4.6);
  document.querySelectorAll("#lab-sparkles .t").forEach((s, i) => {
    tl.fromTo(s, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "steps(1)", yoyo: true, repeat: 7 }, 1.25 + i * 0.08);
  });`,
);

// ── 聯盟大廳 ───────────────────────────────────────────────
scene(
  "hall",
  `<img class="bg" src="${P}/bg-hall.png" alt="" />
<div id="hall-arrow" class="t" style="left:35px;top:2px;color:#F8D030;text-shadow:1px 1px #383838">▼</div>
<div id="hall-clawd" class="px" style="left:23px;top:100px;width:35px;height:27px;background:url('${S}/clawd-battle-sheet.svg') 0 0 / 70px 27px"></div>
${msg("hall-m1", 0.3, 4.7, ["四大天王：打贏一位，才能走到下一個 Step", '今天的目標：走到 <span class="hl">Step 2</span>'])}`,
  `  tl.fromTo("#hall-clawd", { y: 12 }, { y: 0, duration: 0.8, ease: "steps(6)" }, 0.2);
  playSheet($("#hall-clawd"), 2, 2.5, 35, 0, 5);
  tl.fromTo("#hall-arrow", { y: 0 }, { y: 2, duration: 0.25, ease: "steps(1)", yoyo: true, repeat: 17 }, 0.5);`,
);

// ── VS 畫面 ────────────────────────────────────────────────
TRAINERS.forEach((tr, i) => {
  const id = `vs${i + 1}`;
  scene(
    id,
    `<img class="bg" src="${P}/bg-vs.png" alt="" />
<img id="${id}-trainer" src="${P}/${tr.sprite}" style="left:220px;top:-8px;width:80px;height:80px" alt="" />
<img src="${S}/clawd-front.svg" style="left:72px;top:133px;width:35px;height:27px" alt="" />
<div id="${id}-plate" class="layer">
  <div class="t outline" style="left:206px;top:84px">四大天王</div>
  <div class="t gtx" style="left:206px;top:100px;font-size:24px;line-height:26px">${tr.name}</div>
  <div class="t gtx" style="left:256px;top:108px">守 Step ${tr.step}</div>
</div>
<div class="t outline" style="left:110px;top:165px">帶著 ${tr.team.length} 隻寶可夢</div>
<div id="${id}-flash" class="layer" style="background:#fff"></div>`,
    `  tl.fromTo("#${id}-flash", { opacity: 1 }, { opacity: 0, duration: 0.25, ease: "power1.out" }, 0);
  tl.fromTo("#${id}-trainer", { x: 80 }, { x: 0, duration: 0.3, ease: "power3.out", snap: "x" }, 0.05);
  tl.fromTo("#${id}-plate", { x: 130 }, { x: 0, duration: 0.3, ease: "power3.out", snap: "x" }, 0.2);`,
  );
});

// ── 對戰 ───────────────────────────────────────────────────
const FOE_X = 250; // 對手台座中心
const FOE_FEET = 67;
function menuFor(tr, correct, gagged) {
  const order = tr.moves;
  let pick = [correct];
  for (let k = 1; pick.length < 4; k++) pick.push(order[(order.indexOf(correct) + k) % order.length]);
  pick = [...new Set(pick)].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  if (gagged) pick[3] = tr.gag;
  return pick;
}
const MENU_POS = [
  [18, 136],
  [112, 136],
  [18, 154],
  [112, 154],
];
const audioCues = []; // [場景, id, src, 集內時間, 長度, 音量]
let CUR = "";

TRAINERS.forEach((tr, ti) => {
  const id = `bat${ti + 1}`;
  const base = AT[id].start;
  CUR = id;
  let body = `<img class="bg" src="${P}/bg-battle.png" alt="" />
<img src="${S}/base-foe.svg" style="left:194px;top:53px;width:112px;height:22px" alt="" />
<img src="${S}/base-player.svg" style="left:6px;top:108px;width:140px;height:26px" alt="" />
<div id="${id}-clawd" class="px" style="left:41px;top:66px;width:70px;height:54px;background:url('${S}/clawd-battle-sheet.svg') 0 0 / 140px 54px"></div>
<div id="${id}-php" class="hpbox" style="left:168px;top:77px;width:148px;height:51px">
  <div class="in"></div>
  <div class="t gtx" style="left:8px;top:2px">Clawd</div><div class="t gtx" style="right:9px;top:2px">Lv.1</div>
  <div class="cap" style="left:40px;top:17px;width:100px"><div class="lab">HP</div><div class="trk"><i style="width:77px"></i></div></div>
  <div class="t gtx" style="right:9px;top:28px">20/20</div>
</div>
<div id="${id}-fhp" class="hpbox" style="left:6px;top:5px;width:150px;height:33px">
  <div class="in"></div>
  <div class="t gtx" style="right:9px;top:2px">Lv.${tr.step}</div>
  <div class="cap" style="left:42px;top:17px;width:100px"><div class="lab">HP</div><div class="trk"><i id="${id}-bar" style="width:77px"></i></div></div>
`;
  let script = `  playSheet($("#${id}-clawd"), 2, 2.5, 70, 0, ${AT[id].dur});\n`;
  const names = [];
  let foes = "";
  let menus = "";
  let t0 = 0;
  tr.team.forEach((p, pi) => {
    const gag = pi === 0;
    const len = ROUND + (gag ? GAG : 0);
    const sh = sheet(p.file);
    const left = Math.round(FOE_X - sh.w / 2);
    const top = FOE_FEET - sh.h;
    const fid = `${id}-p${pi}`;
    names.push(`<div id="${fid}-name" class="t gtx clip" data-start="${r(t0)}" data-duration="${len}" style="left:8px;top:2px">${p.name}</div>`);
    foes += `<div id="${fid}" class="clip" data-start="${r(t0)}" data-duration="${len}" data-layout-allow-overflow style="position:absolute;left:${left}px;top:${top}px;width:${sh.w}px;height:${sh.h}px;overflow:hidden">
  <div id="${fid}-s" class="px" style="left:0;top:0;width:${sh.w}px;height:${sh.h}px;background:url('${P}/${p.file}-sheet.png') 0 0 / ${sh.w * sh.frames}px ${sh.h}px;transform-origin:50% 100%"></div>
</div>
<div id="${fid}-burst" class="clip" data-start="${r(t0)}" data-duration="0.4" style="position:absolute;left:${FOE_X - 20}px;top:${FOE_FEET - 40}px;width:40px;height:40px">
  <div class="px" style="left:0;top:0;width:40px;height:40px;border-radius:50%;background:#fff"></div>
</div>
`;
    // 登場
    body += ""; // (血條框內容在下方組合)
    let k = t0;
    const sent = msg(`${fid}-a`, k, 2.4, [`${tr.name}派出了<span class="hl">${p.name}</span>！`, `<span class="stuck">卡在：${p.problem}</span>`]);
    script += `  playSheet($("#${fid}-s"), ${sh.frames}, ${sh.fps}, ${sh.w}, ${r(t0)}, ${len});
  tl.fromTo("#${fid}-s", { scale: 0 }, { scale: 1, duration: 0.25, ease: "back.out(1.6)" }, ${r(t0 + 0.05)});
  tl.fromTo("#${fid}-burst .px", { scale: 0.2, opacity: 1 }, { scale: 1.5, opacity: 0, duration: 0.35, ease: "power2.out" }, ${r(t0)});
  tl.fromTo("#${id}-fhp", { x: -160 }, { x: 0, duration: 0.25, ease: "power2.out", snap: "x", immediateRender: ${pi === 0} }, ${r(t0 + 0.1)});
  tl.fromTo("#${id}-bar", { width: 77, backgroundColor: "#58D080" }, { width: 77, duration: 0.01, immediateRender: ${pi === 0} }, ${r(t0)});
`;
    audioCues.push([CUR, `cry-${fid}`, `${P}/${p.file}-cry.mp3`, base + t0 + 0.1, 1.8, 0.7]);
    let m = sent;
    k += 2.4;
    const choose = (cursorMove, at, menuId, list) => {
      const idx = list.indexOf(cursorMove);
      menus += `<div id="${menuId}" class="clip" data-start="${r(at)}" data-duration="0.8" style="position:absolute;inset:0">
  ${list.map((mv, mi) => `<div class="t gtx" style="left:${MENU_POS[mi][0]}px;top:${MENU_POS[mi][1]}px">${mv}</div>`).join("")}
  <div class="t gtx" style="left:${MENU_POS[idx][0] - 10}px;top:${MENU_POS[idx][1]}px">▶</div>
  <div style="position:absolute;left:214px;top:134px;width:2px;height:38px;background:#98B0C8"></div>
  <div class="t gtx" style="left:222px;top:136px">PP 10/10</div><div class="t gtx" style="left:222px;top:154px">屬性／Skill</div>
</div>
`;
      audioCues.push([CUR, `sel-${menuId}`, "assets/sfx/select.wav", base + at + 0.6, 0.1, 0.5]);
    };
    const attack = (move, at, good) => {
      m += msg(`${fid}-u${Math.round(at * 10)}`, at, good ? 1.0 : 0.9, [`<span class="hl">Clawd</span> 使出了 ${move}！`]);
      script += `  tl.fromTo("#${id}-clawd", { x: 0 }, { x: 10, duration: 0.1, ease: "power2.out", snap: "x", immediateRender: false }, ${r(at + 0.15)});
  tl.fromTo("#${id}-clawd", { x: 10 }, { x: 0, duration: 0.15, ease: "power2.in", snap: "x", immediateRender: false }, ${r(at + 0.25)});
`;
      if (good) {
        script += [0, 0.08, 0.16, 0.24].map((d, i) => `  tl.set("#${fid}-s", { opacity: ${i % 2} }, ${r(at + 0.35 + d)});`).join("\n") + "\n";
        audioCues.push([CUR, `hit-${fid}`, "assets/sfx/hit.wav", base + at + 0.35, 0.25, 0.6]);
      } else {
        audioCues.push([CUR, `bump-${fid}`, "assets/sfx/bump.wav", base + at + 0.3, 0.15, 0.5]);
      }
    };
    const menu = menuFor(tr, p.move, gag);
    if (gag) {
      choose(tr.gag, k, `${fid}-g1`, menu);
      k += 0.8;
      attack(tr.gag, k, false);
      k += 0.9;
      m += msg(`${fid}-bad`, k, 0.9, ["效果不太好…"]);
      script += `  tl.fromTo("#${id}-bar", { width: 77 }, { width: 70, duration: 0.3, ease: "none", immediateRender: false }, ${r(k + 0.1)});\n`;
      k += 0.9;
      choose(p.move, k, `${fid}-g2`, menu);
      k += 0.8;
    } else {
      choose(p.move, k, `${fid}-m`, menu);
      k += 0.8;
    }
    attack(p.move, k, true);
    k += 1.0;
    m += msg(`${fid}-good`, k, 0.9, ["效果絕佳！"]);
    script += `  tl.fromTo("#${id}-bar", { width: ${gag ? 70 : 77}, backgroundColor: "#58D080" }, { width: 0, backgroundColor: "#E85838", duration: 0.5, ease: "power1.in", immediateRender: false }, ${r(k + 0.05)});\n`;
    k += 0.9;
    m += msg(`${fid}-down`, k, t0 + len - k, [`<span class="hl">${p.name}</span>倒下了！`]);
    script += `  tl.fromTo("#${fid}-s", { y: 0 }, { y: ${sh.h}, duration: 0.3, ease: "power2.in", snap: "y" }, ${r(k + 0.05)});
  tl.fromTo("#${id}-fhp", { x: 0 }, { x: -160, duration: 0.2, ease: "power2.in", snap: "x", immediateRender: false }, ${r(t0 + len - 0.3)});
`;
    audioCues.push([CUR, `faint-${fid}`, "assets/sfx/faint.wav", base + k + 0.05, 0.6, 0.5]);
    menus += m;
    t0 += len;
  });
  body += names.join("\n") + "\n</div>\n" + foes + menus;
  scene(id, body, script);
});

// HP 框的樣式（取自 design/f5-battle.html）
const HPCSS = `
  .hpbox { position: absolute; background: #404848; clip-path: polygon(2px 0, calc(100% - 2px) 0, calc(100% - 2px) 1px, calc(100% - 1px) 1px, calc(100% - 1px) 2px, 100% 2px, 100% calc(100% - 2px), calc(100% - 1px) calc(100% - 2px), calc(100% - 1px) calc(100% - 1px), calc(100% - 2px) calc(100% - 1px), calc(100% - 2px) 100%, 2px 100%, 2px calc(100% - 1px), 1px calc(100% - 1px), 1px calc(100% - 2px), 0 calc(100% - 2px), 0 2px, 1px 2px, 1px 1px, 2px 1px); }
  .hpbox .in { position: absolute; left: 2px; top: 2px; right: 2px; bottom: 2px; background: #F8F8D8; box-shadow: inset 0 -2px 0 #E0E0B8; }
  .cap { position: absolute; height: 12px; background: #505858; }
  .cap .lab { position: absolute; left: 3px; top: 0; line-height: 12px; color: #F8E070; }
  .cap .trk { position: absolute; left: 19px; right: 2px; top: 3px; height: 6px; background: #F8F8F8; }
  .cap .trk i { position: absolute; left: 1px; top: 1px; bottom: 1px; display: block; background: #58D080; }
`;
for (const id of ["bat1", "bat2"]) {
  const f = join(root, "compositions", `${id}.html`);
  writeFileSync(f, readFileSync(f, "utf8").replace("</style>", HPCSS + "</style>"));
}

// ── 過關：門打開 ───────────────────────────────────────────
const DOOR = { 3: 96, 4: 168 }; // Step 3、Step 4 門板左緣
TRAINERS.forEach((tr, i) => {
  const id = `win${i + 1}`;
  CUR = id;
  const next = tr.step + 1;
  const flag = `<img id="${id}-flag" src="${S}/flag.svg" style="left:58px;top:78px;width:24px;height:28px" alt="" />
<div id="${id}-tag" class="t outline" style="left:58px;top:110px;padding:0 3px;line-height:14px;height:14px;background:#2C3458">今天走到這裡</div>`;
  scene(
    id,
    `<img class="bg" src="${P}/bg-hall.png" alt="" />
${i === 1 ? `<div class="px" style="left:${DOOR[3]}px;top:38px;width:32px;height:61px;border-radius:16px 16px 0 0;background:#1E1A2E"></div>` : ""}
${flag}
<div id="${id}-door" class="px" style="left:${DOOR[next]}px;top:38px;width:32px;height:61px;border-radius:16px 16px 0 0;background:#1E1A2E;transform-origin:50% 100%"></div>
${msg(`${id}-m1`, 0.2, 4.8, [`打贏了四大天王・<span class="hl">${tr.name}</span>！`, `走到 <span class="hl">Step ${tr.step}</span> 了！Step ${next} 的門打開了`])}`,
    `  ${i === 0 ? `tl.fromTo("#${id}-flag", { y: -40 }, { y: 0, duration: 0.3, ease: "bounce.out", snap: "y" }, 1.0);
  tl.fromTo("#${id}-tag", { opacity: 0 }, { opacity: 1, duration: 0.15, ease: "steps(2)" }, 1.3);` : ""}
  tl.fromTo("#${id}-door", { scaleY: 0 }, { scaleY: 1, duration: 0.4, ease: "steps(5)" }, 2.0);`,
  );
  audioCues.push([CUR, `open-${id}`, "assets/sfx/bump.wav", AT[id].start + 2.0, 0.15, 0.6]);
});

// ── 共用：夜空、月暈、自繪訊息框 ───────────────────────────
const NIGHT = `<div class="px" style="left:0;top:0;width:320px;height:45px;background:#0A1030"></div>
<div class="px" style="left:0;top:45px;width:320px;height:45px;background:#121A40"></div>
<div class="px" style="left:0;top:90px;width:320px;height:45px;background:#1A2450"></div>
<div class="px" style="left:0;top:135px;width:320px;height:45px;background:#222E60"></div>
<div class="px" style="left:100px;top:6px;width:120px;height:120px;border-radius:50%;background:#3A4A78"></div>
<div class="px" style="left:116px;top:22px;width:88px;height:88px;border-radius:50%;background:#4E5E90"></div>`;
const BOX = `<div class="px" style="left:0;top:130px;width:320px;height:50px;background:#F8F8F8;border:3px solid #485868;box-shadow:inset 0 0 0 2px #98B0C8"></div>`;
const TBC_TEXT = (id, top) =>
  `<div id="${id}" class="t" style="left:84px;top:${top}px;font-size:24px;line-height:26px;color:#F8D030;text-shadow:2px 0 #383838,-2px 0 #383838,0 2px #383838,0 -2px #383838">To be continued…</div>`;
// JoJo 式「To Be Continued」：畫面泛黃定格，箭頭從右邊滑進左下角（素材來自使用者提供的綠幕影片，去背後放在 assets/pokemon/jojo-arrow.png）
const JOJO = (id, start, dur) => `<div id="${id}" class="clip" data-start="${start}" data-duration="${dur}" style="position:absolute;inset:0">
  <div id="${id}-tint" style="position:absolute;inset:0;background:#B08850;mix-blend-mode:color;opacity:0.7"></div>
  <img id="${id}-arrow" src="${P}/jojo-arrow.png" style="position:absolute;left:60px;top:572px;width:838px;height:198px" alt="" />
</div>`;
const JOJO_JS = (id, start) => `  tl.fromTo("#${id}-tint", { opacity: 0 }, { opacity: 0.7, duration: 0.15, ease: "power1.out" }, ${start});
  tl.fromTo("#${id}-arrow", { x: 1900 }, { x: 0, duration: 0.2, ease: "power2.out" }, ${start});`;
const OPEN_DOOR = (x) =>
  `<div class="px" style="left:${x}px;top:38px;width:32px;height:61px;border-radius:16px 16px 0 0;background:#1E1A2E"></div>`;
const FLAG = (id) => `<img src="${S}/flag.svg" style="left:58px;top:78px;width:24px;height:28px" alt="" />
<div class="px" style="left:58px;top:110px;width:78px;height:14px;background:#2C3458"></div>
<div id="${id}-tag" class="t outline" style="left:61px;top:110px;line-height:14px">今天走到這裡</div>`;

// ── 第 1 集結尾：下一位天王預告 ─────────────────────────────
CUR = "tease1";
scene(
  "tease1",
  `${NIGHT}
<img id="tease1-sil" src="${P}/phoebe-silhouette.png" style="left:120px;top:14px;width:80px;height:80px" alt="" />
${BOX}
${msg("tease1-m1", 1.0, 7.0, ['下一位天王：<span class="hl">芙蓉</span>', `守著 Step 3，帶著 ${TRAINERS[1].team.length} 隻寶可夢`])}
<div id="tease1-fade" class="layer" style="background:#000"></div>`,
  JOJO("tease1-jojo", 3.6, 4.4),
  `  tl.fromTo("#tease1-fade", { opacity: 1 }, { opacity: 0, duration: 0.4, ease: "steps(4)" }, 0);
  tl.fromTo("#tease1-sil", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "steps(6)" }, 0.2);
${JOJO_JS("tease1-jojo", 3.6)}`,
);
audioCues.push([CUR, "tease-boom", "assets/sfx/boom.wav", AT.tease1.start + 0.2, 2.5, 0.8]);

// ── 第 2 集開頭：上集回顧 ───────────────────────────────────
CUR = "recap2";
scene(
  "recap2",
  `<img class="bg" src="${P}/bg-hall.png" alt="" />
${OPEN_DOOR(96)}
${FLAG("recap2")}
<div id="recap2-arrow" class="t" style="left:107px;top:2px;color:#F8D030;text-shadow:1px 1px #383838">▼</div>
<div id="recap2-clawd" class="px" style="left:23px;top:100px;width:35px;height:27px;background:url('${S}/clawd-battle-sheet.svg') 0 0 / 70px 27px"></div>
${msg("recap2-m1", 0.4, 4.6, ['上一集：打贏花月，走到了 <span class="hl">Step 2</span>', '這次的目標：走到 <span class="hl">Step 3</span>'])}
<div id="recap2-fade" class="layer" style="background:#000"></div>`,
  `  tl.fromTo("#recap2-fade", { opacity: 1 }, { opacity: 0, duration: 0.4, ease: "steps(4)" }, 0);
  playSheet($("#recap2-clawd"), 2, 2.5, 35, 0, 5);
  tl.fromTo("#recap2-arrow", { y: 0 }, { y: 2, duration: 0.25, ease: "steps(1)", yoyo: true, repeat: 17 }, 0.6);`,
);

// ── 第 2 集結尾：Step 4 的門打開 → 雷雨夜空裡的烈空坐 → To be continued ──
CUR = "tbc";
scene(
  "tbc",
  `<img class="bg" src="${P}/bg-hall.png" alt="" />
${OPEN_DOOR(96)}
${FLAG("tbc")}
<div class="px" style="left:168px;top:38px;width:32px;height:61px;border-radius:16px 16px 0 0;background:#FFF4C0"></div>
<div id="tbc-door-l" class="px" style="left:168px;top:38px;width:16px;height:61px;border-radius:16px 0 0 0;background:#8A4A22;box-shadow:inset -1px 0 0 #5A2A12;transform-origin:0 50%"></div>
<div id="tbc-door-r" class="px" style="left:184px;top:38px;width:16px;height:61px;border-radius:0 16px 0 0;background:#8A4A22;box-shadow:inset 1px 0 0 #5A2A12;transform-origin:100% 50%"></div>
${msg("tbc-m0", 0.2, 1.4, ['<span class="hl">Step 4</span> 的門……打開了？'])}
<div id="tbc-glow" class="layer" style="background:#FFF4C0"></div>
<div id="tbc-sky" class="clip" data-start="1.8" data-duration="8.2" style="position:absolute;inset:0">
  ${NIGHT}
  <img id="tbc-ray" src="${P}/rayquaza-silhouette.png" style="left:112px;top:20px;width:96px;height:96px" alt="" />
  <div id="tbc-flash" class="layer" style="background:#F0F4FF"></div>
  <div id="tbc-box" class="clip" data-start="3.2" data-duration="6.8" style="position:absolute;inset:0">${BOX}</div>
</div>
${msg("tbc-m1", 3.3, 6.7, ['<span class="hl">Step 4</span>・再往後', "人用意圖決定方向"])}`,
  JOJO("tbc-jojo", 5.8, 4.2),
  `  tl.fromTo("#tbc-door-l", { scaleX: 1 }, { scaleX: 0, duration: 0.8, ease: "steps(8)" }, 0.4);
  tl.fromTo("#tbc-door-r", { scaleX: 1 }, { scaleX: 0, duration: 0.8, ease: "steps(8)" }, 0.4);
  tl.fromTo("#tbc-glow", { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power2.in" }, 1.3);
  tl.fromTo("#tbc-ray", { y: -80 }, { y: 0, duration: 1.0, ease: "steps(10)" }, 1.9);
  tl.fromTo("#tbc-ray", { x: 0 }, { x: 1, duration: 0.4, ease: "steps(1)", yoyo: true, repeat: 5, immediateRender: false }, 3.0);
  tl.fromTo("#tbc-flash", { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power2.out" }, 1.8);
  tl.fromTo("#tbc-flash", { opacity: 0.8 }, { opacity: 0, duration: 0.25, ease: "power2.out", immediateRender: false }, 2.3);
  tl.fromTo("#tbc-flash", { opacity: 1 }, { opacity: 0, duration: 0.4, ease: "power2.out", immediateRender: false }, 4.4);
${JOJO_JS("tbc-jojo", 5.8)}`,
);
audioCues.push([CUR, "tbc-door", "assets/sfx/bump.wav", AT.tbc.start + 0.4, 0.15, 0.6]);
audioCues.push([CUR, "tbc-thunder1", "assets/sfx/thunder.wav", AT.tbc.start + 1.8, 2.2, 0.9]);
audioCues.push([CUR, "tbc-boom", "assets/sfx/boom.wav", AT.tbc.start + 1.9, 2.5, 0.9]);
audioCues.push([CUR, "tbc-cry", `${P}/rayquaza-cry.mp3`, AT.tbc.start + 2.9, 1.6, 0.8]);
audioCues.push([CUR, "tbc-thunder2", "assets/sfx/thunder.wav", AT.tbc.start + 4.4, 2.2, 0.45]);

// ── 配樂（每集各自的時間）──────────────────────────────────
const MUSIC = {
  ep1: [
    ["bgm-oak", `${P}/bgm-oak.mp3`, 0, AT.vs1.start, 0.55, 1.0],
    ["bgm-keyitem", `${P}/bgm-key-item.mp3`, AT.lab.start + 1.2, 3.4, 0.8, 0],
    ["bgm-battle", `${P}/bgm-battle.mp3`, AT.vs1.start, AT.win1.start - AT.vs1.start, 0.5, 0.4],
    ["bgm-victory", `${P}/bgm-victory.mp3`, AT.win1.start, AT.win1.dur, 0.55, 1.0],
    ["bgm-jojo", `${P}/jojo-roundabout.mp3`, AT.tease1.start + 3.6 - 3.6, AT.tease1.dur, 0.8, 0.8],
  ],
  ep2: [
    ["bgm-oak", `${P}/bgm-oak.mp3`, 0, AT.vs2.start, 0.45, 0.8],
    ["bgm-battle", `${P}/bgm-battle.mp3`, AT.vs2.start, AT.win2.start - AT.vs2.start, 0.5, 0.4],
    ["bgm-victory", `${P}/bgm-victory.mp3`, AT.win2.start, AT.win2.dur, 0.55, 1.0],
    ["bgm-jojo", `${P}/jojo-roundabout.mp3`, AT.tbc.start + 5.8 - 3.6, AT.tbc.dur - 2.2, 0.8, 0.8],
  ],
};

// ── 每集一個 HyperFrames 專案（parts/ep1、parts/ep2），共用 assets 與 compositions ──
for (const [part, list] of Object.entries(PARTS)) {
  const dir = join(root, "parts", part);
  mkdirSync(dir, { recursive: true });
  for (const link of ["assets", "compositions"]) {
    try {
      symlinkSync(join("..", "..", link), join(dir, link));
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
    }
  }
  for (const f of ["hyperframes.json", "package.json"]) copyFileSync(join(root, f), join(dir, f));
  writeFileSync(join(dir, "meta.json"), JSON.stringify({ id: `league-${part}`, name: `league-${part}` }, null, 2));
  const hosts = list
    .map(
      ([id]) =>
        `      <div id="${id}" data-composition-id="${id}" data-composition-src="compositions/${id}.html" data-start="${r(AT[id].start)}" data-duration="${r(AT[id].dur)}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>`,
    )
    .join("\n");
  const audio = [
    ...MUSIC[part].map(
      ([id, src, s, d, v, fo]) =>
        `<audio id="${id}" src="${src}" data-start="${r(s)}" data-duration="${r(d)}" data-volume="${v}"${fo ? ` data-fade-out="${fo}"` : ""}></audio>`,
    ),
    ...audioCues
      .filter(([sc]) => PART_OF[sc] === part)
      .map(([, id, src, s, d, v]) => `<audio id="${id}" src="${src}" data-start="${r(s)}" data-duration="${r(d)}" data-volume="${v}"></audio>`),
  ];
  writeFileSync(
    join(dir, "index.html"),
    `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="assets/vendor/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #000; }
    </style>
  </head>
  <body>
    <!-- 由 scripts/build-league.mjs 產生；要改劇情請改那支腳本裡的資料 -->
    <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL[part]}" data-width="1920" data-height="1080">
${hosts}
      ${audio.join("\n      ")}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`,
  );
  console.log(`${part}：${TOTAL[part]} 秒；${list.map(([id]) => `${id} ${r(AT[id].start)}s`).join("、")}`);
}

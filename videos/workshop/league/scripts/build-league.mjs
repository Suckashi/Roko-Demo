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
    intro: "一個人帶好幾個 Agent？先過我這關！",
    outro: "……好吧，Step 2 的門為你打開。",
    moves: ["多開 Session", "Git Worktree", "Lint", "dev-workflow-tdd"],
    learned: [["多開 Session", "效率翻倍"], ["Git Worktree", "各改各的"], ["dev-workflow-tdd", "整套流程走完"]],
    team: [
      { name: "呆呆獸", file: "slowpoke", tag: "等它跑完", problem: "每次都要等它跑完", tip: '平行處理，<span class="key">效率翻倍</span>', move: "多開 Session", gag: "泡咖啡等它", gagFx: "coffee", gagResult: '<span class="hl">Clawd</span> 的優雅度提升了！', noDamage: true },
      { name: "三地鼠", file: "dugtrio", tag: "改同一份 code", problem: "同時改同一份 code，會打架", tip: '每個 Agent 一份 <span class="key">worktree</span>，互不干擾', move: "Git Worktree" },
      {
        name: "達克萊伊", file: "darkrai", tag: "一直盯著", boss: true, problem: "盯著它，怕它做錯", scale: 0.8, // 圖比較高，縮小才不會超出畫面
        tip: '整套流程自動走完，人只看<span class="key">驗證證據</span>，徹底解放注意力', move: "dev-workflow-tdd",
        gag: "一直盯著看", gagFx: "stare", gagResult: "好像沒什麼效果…",
        counter: { move: "暗黑洞", fx: "dark", after: '<span class="hl">Clawd</span> 睡著了，還做起了惡夢…' },
        // 單項檢查各打一點，最後用整套流程收尾
        combo: ["Lint", "Build", "Test"],
      },
    ],
  },
  {
    key: "b2",
    name: "芙蓉",
    sprite: "trainer-phoebe-gen3.png",
    step: 3,
    // 幽靈系天王：昏暗偏紫的場地
    bg: "bg-battle-ghost.png",
    baseFilter: "hue-rotate(150deg) saturate(0.55) brightness(0.78)",
    intro: "Step 3 的門檻是信任。你準備好了嗎？",
    outro: "……好，我願意讓 Agent 自己合併了。",
    moves: ["低風險試行", "grill-with-docs", "/retro", "打好測試環境", "三層煞車"],
    learned: [["低風險試行", "先小範圍放手"], ["grill-with-docs", "規則寫下來"], ["/retro", "回顧後改環境"], ["打好測試環境", "測得到才放手"], ["三層煞車", "依風險審"]],
    team: [
      { name: "魔牆人偶", file: "mrmime", tag: "公司不放行", problem: "公司願不願意讓 Agent 自動合併 PR", tip: '先從<span class="key">影響比較小</span>的系統試行', move: "低風險試行" },
      { name: "可達鴨", file: "psyduck", tag: "AI 聽不懂", problem: "AI 不懂你在說什麼", tip: '問清楚，寫進 <span class="key">GLOSSARY.md 與 ADR</span>', move: "grill-with-docs" },
      { name: "喵喵", file: "meowth", tag: "問題一再出現", quip: "「我們又回來了！」", problem: "重複出現同樣的問題", tip: '回顧漏掉什麼，補 <span class="key">Skill、MCP 和 lint</span>', move: "/retro" },
      { name: "百變怪", file: "ditto", tag: "測不到", problem: "測試環境測不到，不敢放手", tip: '把測試環境補完整，<span class="key">測得到的才放手</span>', move: "打好測試環境" },
      {
        name: "卡比獸", file: "snorlax", tag: "PR 審不完", boss: true, scale: 0.85, problem: "好幾份 PR 同時要審，審不完",
        tip: '自動檢查、AI Review 先擋，人只細審<span class="key">高風險</span>的', move: "三層煞車",
        gag: "全部逐行看", gagFx: "papers",
        // 大魔王：用錯招反而讓牠變大
        grow: { text: "PR 越堆越多，卡比獸越長越大！", scale: 1.15 },
        combo: ["自動化檢查", "AI Review"],
      },
    ],
  },
];

// 每則訊息的長度（秒）。字要讓人讀得完：一行約 0.5 秒＋每字 0.1 秒
const T = { sent: 3.2, menu: 1.1, attack: 1.5, gagAttack: 1.4, bad: 1.1, good: 0.9, down: 3.2, hyp: 1.8, sleep: 1.3, grow: 2.2 };
const ROUND = T.sent + T.menu + T.attack + T.good + T.down;
// 有 gag 的回合先誤用一招、效果不太好，再換對的招式
const GAG = T.menu + T.gagAttack + T.bad;
const COUNTER = T.hyp + T.sleep - T.bad; // 對手反擊（例如催眠術）取代「效果不太好」
const COMBO = (n) => T.menu + n * (T.gagAttack + T.bad); // 連續單招：選一次招式，每招各打一點
const GROW = T.grow - T.bad; // 對手變大（取代「效果不太好」）
const roundLength = (p) =>
  ROUND + (p.gag ? GAG : 0) + (p.counter ? COUNTER + (p.gagResult ? T.bad : 0) : 0) + (p.grow ? GROW : 0) + (p.combo ? COMBO(p.combo.length) : 0);
// Clawd 的樣子：第 1 集是 Clawd，第 1 集結尾進化成 Clawd 小隊（第 2 集都用這個）
// SQUAD_MEMBERS：小隊 5 隻成員在小隊圖（68×26）裡的位置與擺動相位，要跟 build-sprites.mjs 的 SQUAD 一致
const SQUAD_MEMBERS = [[11, 0, 0], [33, 0, 1], [0, 7, 1], [22, 7, 0], [44, 7, 1]];
const FORMS = [
  { name: "Clawd", battle: "clawd-battle-sheet.svg", front: "clawd-front.svg", w: 35, h: 27 },
  { name: "Clawd 小隊", battle: "squad-battle-sheet.svg", front: "squad-front.svg", w: 68, h: 26, members: SQUAD_MEMBERS, member: { sheet: "clawd-small-sheet.svg", w: 24, h: 19 } },
];
const INTRO = 3.6; // 對戰開場：天王撂話，小智喊「去吧！Clawd！」丟出精靈球
const OUTRO = 2.8; // 對戰收場：天王認輸
const battleLength = (t) => INTRO + t.team.reduce((sum, p) => sum + roundLength(p), 0) + OUTRO;
const EVO = 5.5; // 第 1 集結尾：Clawd 進化成 Clawd 小隊

// 兩集的場景順序與長度（秒）；每集的時間從 0 開始
const PARTS = {
  ep1: [["oak", 4.5], ["lab", 5], ["hall", 4.5], ["vs1", 3.5], ["bat1", battleLength(TRAINERS[0])], ["win1", 5], ["evo1", EVO], ["learn1", 4.5], ["tease1", 8]],
  ep2: [["recap2", 5], ["vs2", 3.5], ["bat2", battleLength(TRAINERS[1])], ["win2", 5], ["learn2", 6], ["tbc", 10]],
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
  .boss { color: #C82020; text-shadow: 1px 0 #F0C0C0, 0 1px #F0C0C0, 1px 1px #F0C0C0; }
  .key { color: #A03A10; text-shadow: 1px 0 #F0D0B8, 0 1px #F0D0B8, 1px 1px #F0D0B8; }
  .tip { color: #1E6E3A; text-shadow: 1px 0 #B8E0C0, 0 1px #B8E0C0, 1px 1px #B8E0C0; }
  .hl { color: #2858B0; text-shadow: 1px 0 #B8C8E8, 0 1px #B8C8E8, 1px 1px #B8C8E8; }
  .outline { color: #F8F8F8; text-shadow: 1px 0 #383838, -1px 0 #383838, 0 1px #383838, 0 -1px #383838; }
  .msg { position: absolute; left: 10px; top: 137px; }
  .line { display: block; width: max-content; white-space: nowrap; margin-bottom: 4px; }
  .layer { position: absolute; inset: 0; }
`;
const JS = `
  const tl = gsap.timeline({ paused: true });
  const $ = (s) => document.querySelector(s);
  function playSheet(el, frames, fps, w, start, dur, off = 0) {
    const p = { t: 0 };
    tl.fromTo(p, { t: 0 }, { t: dur, duration: dur, ease: "none", immediateRender: false,
      onUpdate: () => { el.style.backgroundPosition = (-((Math.floor(p.t * fps + 1e-6) + off) % frames) * w) + "px 0px"; } }, start);
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
let CUR = ""; // 目前產生的場景（音效依它換算成集內時間）
const audioCues = []; // [場景, id, src, 集內時間, 長度, 音量]
const plain = (html) => html.replace(/<[^>]+>/g, "");
function msg(id, start, dur, lines) {
  msgs.push([id, start]);
  // 對應 JS 的 type()：每字 0.035 秒，行與行之間停 0.08 秒
  const typing = lines.reduce((sum, l) => sum + [...plain(l)].length * 0.035, 0) + (lines.length - 1) * 0.08;
  // 只在每則訊息開頭響一小段，不要整句一路嗶到底
  audioCues.push([CUR, `blip-${id}`, "assets/sfx/blip.wav", AT[CUR].start + start, r(Math.min(typing, dur, 0.5)), 0.2]);
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
CUR = "oak";
scene(
  "oak",
  `<img class="bg" src="${P}/bg-oak.png" alt="" />
<img id="oak-oak" src="${P}/trainer-oak.png" style="left:88px;top:39px;width:80px;height:80px" alt="" />
${msg("oak-m1", 0.3, 4.2, ["歡迎來到 Agent 的世界！", '我是<span class="hl">大木博士</span>。你還沒有夥伴吧？'])}
<div id="oak-fade" class="layer" style="background:#fff"></div>`,
  `  tl.fromTo("#oak-fade", { opacity: 1 }, { opacity: 0, duration: 0.4, ease: "power1.out" }, 0);
  tl.fromTo("#oak-oak", { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: "steps(4)", snap: "x" }, 0.1);
  [1.5, 2.7, 3.8].forEach((t) => tl.fromTo("#oak-oak", { y: 0 }, { y: 2, duration: 0.12, ease: "steps(1)", yoyo: true, repeat: 1, immediateRender: false }, t));`,
);

// ── 研究所：拿到 Clawd ─────────────────────────────────────
CUR = "lab";
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
<img id="lab-ash" src="${P}/trainer-ash.png" style="left:14px;top:50px;width:80px;height:80px" alt="" />
<img id="lab-oak" src="${P}/trainer-oak.png" style="left:234px;top:48px;width:80px;height:80px" alt="" />
<img id="lab-ball" src="${P}/pokeball.svg" style="left:154px;top:82px;width:12px;height:12px" alt="" />
<div id="lab-flash" class="px" style="left:140px;top:68px;width:40px;height:40px;border-radius:50%;background:#fff;opacity:0"></div>
<div id="lab-clawd" class="px" style="left:143px;top:67px;width:35px;height:27px;background:url('${S}/clawd-battle-sheet.svg') 0 0 / 70px 27px;transform-origin:50% 100%"></div>
<div id="lab-sparkles" class="layer">${sparkles}</div>
${msg("lab-m1", 1.1, 3.9, ['<span class="hl">小智</span>得到了 <span class="hl">Clawd</span>！', "Step 1 開始：一個人＋一隻 Agent"])}`,
  `  tl.fromTo("#lab-ball", { rotation: 0 }, { rotation: 20, duration: 0.15, ease: "steps(2)", yoyo: true, repeat: 3 }, 0.3);
  tl.fromTo("#lab-ball", { opacity: 1 }, { opacity: 0, duration: 0.01 }, 1.0);
  tl.fromTo("#lab-flash", { scale: 0, opacity: 1 }, { scale: 1.6, opacity: 0, duration: 0.3, ease: "power2.out" }, 1.0);
  tl.fromTo("#lab-clawd", { scale: 0 }, { scale: 1, duration: 0.3, ease: "back.out(1.7)" }, 1.05);
  playSheet($("#lab-clawd"), 2, 2.5, 35, 1.4, 3.6);
  tl.fromTo("#lab-ash", { y: 0 }, { y: -6, duration: 0.15, ease: "steps(3)", yoyo: true, repeat: 3, snap: "y" }, 1.5);
  tl.fromTo("#lab-oak", { y: 0 }, { y: 2, duration: 0.12, ease: "steps(1)", yoyo: true, repeat: 1 }, 0.3);
  tl.fromTo("#lab-oak", { y: 0 }, { y: 2, duration: 0.12, ease: "steps(1)", yoyo: true, repeat: 1, immediateRender: false }, 3.0);
  document.querySelectorAll("#lab-sparkles .t").forEach((s, i) => {
    tl.fromTo(s, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "steps(1)", yoyo: true, repeat: 7 }, 1.25 + i * 0.08);
  });`,
);

// 進入對戰的轉場（像遊戲遇到訓練家）：白光閃兩下，黑色條紋左右交錯蓋滿畫面
const BARS = 9;
const WIPE = (id, at, dur) => `<div id="${id}" class="clip" data-start="${r(at)}" data-duration="${r(dur)}" style="position:absolute;inset:0">
  <div id="${id}-flash" class="layer" style="background:#fff;opacity:0"></div>
${Array.from({ length: BARS }, (_, i) => `  <div id="${id}-b${i}" class="px" style="left:0;top:${i * 20}px;width:320px;height:20px;background:#000"></div>`).join("\n")}
</div>`;
const WIPE_JS = (id, at) =>
  `  tl.fromTo("#${id}-flash", { opacity: 0 }, { opacity: 0.9, duration: 0.07, ease: "steps(1)", yoyo: true, repeat: 3 }, ${r(at)});\n` +
  Array.from({ length: BARS }, (_, i) => `  tl.fromTo("#${id}-b${i}", { x: ${i % 2 ? 320 : -320} }, { x: 0, duration: 0.3, ease: "steps(6)", snap: "x" }, ${r(at + 0.3 + i * 0.02)});`).join("\n");

// 聯盟大廳：Clawd 站在各 Step 門口
const CLAWD_AT = { 2: 23, 3: 94, 4: 166 }; // Clawd 站在各 Step 門前的位置
const HALL_CLAWD = (id, step, f = FORMS[0]) =>
  `<div id="${id}" class="px" style="left:${CLAWD_AT[step] + 17 - Math.floor(f.w / 2)}px;top:${101 - f.h}px;width:${f.w}px;height:${f.h}px;background:url('${S}/${f.battle}') 0 0 / ${f.w * 2}px ${f.h}px"></div>`;

// ── 聯盟大廳 ───────────────────────────────────────────────
CUR = "hall";
scene(
  "hall",
  `<img class="bg" src="${P}/bg-hall.png" alt="" />
<div id="hall-arrow" class="t" style="left:35px;top:2px;color:#F8D030;text-shadow:1px 0 #383838, -1px 0 #383838, 0 1px #383838, 0 -1px #383838, 1px 1px #383838">▼</div>
${HALL_CLAWD("hall-clawd", 2)}
${msg("hall-m1", 0.3, 3.5, ["四大天王：打贏一位，才能走到下一個 Step", '今天的目標：走到 <span class="hl">Step 2</span>'])}
${WIPE("hall-wipe", 3.8, 0.7)}`,
  `  tl.fromTo("#hall-clawd", { y: 12 }, { y: 0, duration: 0.8, ease: "steps(6)" }, 0.2);
  playSheet($("#hall-clawd"), 2, 2.5, 35, 0, 4.5);
  tl.fromTo("#hall-arrow", { y: 0 }, { y: 2, duration: 0.25, ease: "steps(1)", yoyo: true, repeat: 13 }, 0.5);
${WIPE_JS("hall-wipe", 3.8)}`,
);

// ── VS 畫面 ────────────────────────────────────────────────
TRAINERS.forEach((tr, i) => {
  const id = `vs${i + 1}`;
  scene(
    id,
    `<img class="bg" src="${P}/bg-vs.png" alt="" />
<img id="${id}-trainer" src="${P}/${tr.sprite}" style="left:220px;top:-8px;width:80px;height:80px" alt="" />
<img src="${S}/${FORMS[i].front}" style="left:${Math.round(89 - FORMS[i].w / 2)}px;top:${160 - FORMS[i].h}px;width:${FORMS[i].w}px;height:${FORMS[i].h}px" alt="" />
<div id="${id}-plate" class="layer">
  <div class="t outline" style="left:206px;top:84px">四大天王</div>
  <div class="t gtx" style="left:206px;top:100px;font-size:24px;line-height:26px">${tr.name}</div>
  <div class="t gtx" style="left:256px;top:108px">守 Step ${tr.step}</div>
</div>
<div class="t outline" style="left:110px;top:165px">帶著 ${tr.team.length} 隻寶可夢</div>
${i === 1 ? `<div class="px" style="left:78px;top:58px;width:22px;height:18px;background:#F8F8F0"></div>
<div class="t gtx" style="left:78px;top:62px">小隊</div>` : ""}
<div id="${id}-flash" class="layer" style="background:#fff"></div>`,
    `  tl.fromTo("#${id}-flash", { opacity: 1 }, { opacity: 0, duration: 0.25, ease: "power1.out" }, 0);
  tl.fromTo("#${id}-trainer", { x: 80 }, { x: 0, duration: 0.3, ease: "power3.out", snap: "x" }, 0.05);
  tl.fromTo("#${id}-plate", { x: 130 }, { x: 0, duration: 0.3, ease: "power3.out", snap: "x" }, 0.2);`,
  );
});

// ── 對戰 ───────────────────────────────────────────────────
const FOE_X = 250; // 對手台座中心
const FOE_FEET = 67;
function menuFor(tr, correct, gag) {
  const order = tr.moves;
  let pick = [correct];
  for (let k = 1; pick.length < 4; k++) pick.push(order[(order.indexOf(correct) + k) % order.length]);
  pick = [...new Set(pick)].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  if (gag) pick[3] = gag;
  return pick;
}
const MENU_POS = [
  [18, 136],
  [128, 136],
  [18, 154],
  [128, 154],
];
// 精靈球：從 from 出發；pokeballJs 讓它飛到 to（0.3 秒、邊飛邊轉），到了就打開不見
const pokeball = (id, start, from) => `<div id="${id}" class="clip" data-start="${r(start)}" data-duration="0.4" style="position:absolute;inset:0">
  <img id="${id}-b" src="${P}/pokeball.svg" style="left:${from[0]}px;top:${from[1]}px;width:12px;height:12px" alt="" />
</div>`;
const pokeballJs = (id, at, from, to) => `  tl.fromTo("#${id}-b", { x: 0, rotation: 0 }, { x: ${to[0] - from[0]}, rotation: 360, duration: 0.3, ease: "none", snap: "x" }, ${r(at)});
  tl.fromTo("#${id}-b", { y: 0 }, { y: ${to[1] - from[1]}, duration: 0.3, ease: "power1.in", snap: "y" }, ${r(at)});\n`;

// 催眠術：粉紫色波紋一圈圈從對手飄向 Clawd，畫面跟著閃紫光
const FX_FROM = [FOE_X, 40];
const FX_TO = [76, 93];
const RINGS = 6;
// 暗黑洞（dark）：黑紫色的漩渦，畫面變暗
const FX_PALETTE = { hypnosis: ["#B058C8", "#F8A0E0", "#C060D8"], dark: ["#100818", "#583878", "#180C28"] };
const hypnosisFx = (id, start, dur, kind = "hypnosis") => {
  const [tint, a, b] = FX_PALETTE[kind];
  return `<div id="${id}" class="clip" data-start="${r(start)}" data-duration="${r(dur)}" style="position:absolute;inset:0">
  <div id="${id}-tint" class="layer" style="background:${tint};opacity:0"></div>
${Array.from({ length: RINGS }, (_, i) => `  <div id="${id}-r${i}" class="px" style="left:${FX_FROM[0] - 10}px;top:${FX_FROM[1] - 6}px;width:20px;height:12px;border-radius:50%;border:3px solid ${i % 2 ? a : b};opacity:0"></div>`).join("\n")}
</div>`;
};
const hypnosisJs = (id, clawd, at) => {
  let js = Array.from({ length: RINGS }, (_, i) => {
    const t = r(at + 0.15 + i * 0.15);
    return `  tl.fromTo("#${id}-r${i}", { x: 0, y: 0, scale: 0.6, opacity: 1 }, { x: ${FX_TO[0] - FX_FROM[0]}, y: ${FX_TO[1] - FX_FROM[1]}, scale: 2.6, opacity: 0.2, duration: 0.6, ease: "steps(6)", immediateRender: false }, ${t});`;
  }).join("\n");
  js += `\n  tl.fromTo("#${id}-tint", { opacity: 0 }, { opacity: 0.35, duration: 0.2, ease: "steps(2)", yoyo: true, repeat: 3, immediateRender: false }, ${r(at + 0.3)});`;
  js += `\n  tl.fromTo("${clawd}", { x: 0 }, { x: 2, duration: 0.12, ease: "steps(1)", yoyo: true, repeat: 5, immediateRender: false }, ${r(at + 0.7)});\n`;
  return js;
};
// ── 每個招式自己的特效：[html, js]，從 at 開始約 1 秒；fx 是對手中心 ──
const CLAWD_C = [76, 90]; // Clawd 中心
const fxClip = (id, at, inner) => `<div id="${id}" class="clip" data-start="${r(at)}" data-duration="1.3" style="position:absolute;inset:0">\n${inner}\n</div>`;
const LINT_ICON = `<svg width="18" height="6" viewBox="0 0 18 6"><polyline points="0,5 3,1 6,5 9,1 12,5 15,1 18,5" fill="none" stroke="#E03030" stroke-width="1.5"/></svg>`;
const BLOCK_ICON = `<div style="width:10px;height:10px;background:#F8B048;box-shadow:inset -2px -2px 0 #C87020, inset 2px 2px 0 #FFD890, 0 0 0 1px #784010"></div>`;
const CHECK = `<svg width="14" height="12" viewBox="0 0 14 12"><polyline points="2,6 5,9 12,2" fill="none" stroke="#204818" stroke-width="5" stroke-linecap="square"/><polyline points="2,6 5,9 12,2" fill="none" stroke="#68E060" stroke-width="2.5" stroke-linecap="square"/></svg>`;
// 從 Clawd 飛向對手（外層走直線、內層上下跳出弧線）
const fly = (id, el, from, to, at, dur, hop) =>
  [`<div id="${id}" class="px" style="left:${from[0]}px;top:${from[1]}px;opacity:0"><div id="${id}-i" class="px" style="left:0;top:0">${el}</div></div>`,
   `  tl.fromTo("#${id}", { x: 0, y: 0, opacity: 1 }, { x: ${to[0] - from[0]}, y: ${to[1] - from[1]}, opacity: 1, duration: ${dur}, ease: "none", snap: "x,y", immediateRender: false }, ${r(at)});
  tl.fromTo("#${id}-i", { y: 0 }, { y: ${-hop}, duration: ${r(dur / 2)}, ease: "power1.out", yoyo: true, repeat: 1, snap: "y", immediateRender: false }, ${r(at)});
  tl.set("#${id}", { opacity: 0 }, ${r(at + dur + 0.05)});`];
const MOVE_FX = {
  // 綠色勾勾一個個跳出來：測試通過
  // 整套流程收尾：Lint 波浪、Build 方塊、Test 勾勾先後出現，飛到中間合成一個大勾勾，綠光擴散、光芒四射、畫面閃白
  "dev-workflow-tdd": (id, at, [fx, fy]) => {
    const parts = [[-28, -14, LINT_ICON, 18, 6], [24, -16, BLOCK_ICON, 10, 10], [0, 16, CHECK, 14, 12]];
    const rays = 8;
    const html = `  <div id="${id}-flash" class="layer" style="background:#fff;opacity:0"></div>
  <div id="${id}-ring" class="px" style="left:${fx - 20}px;top:${fy - 20}px;width:40px;height:40px;border-radius:50%;border:3px solid #68E060;opacity:0"></div>
${Array.from({ length: rays }, (_, n) => `  <div id="${id}-ray${n}" class="px" style="left:${fx - 1}px;top:${fy - 30}px;width:3px;height:16px;background:#C8F8A0;transform-origin:50% 30px;transform:rotate(${n * 45}deg);opacity:0"></div>`).join("\n")}
${parts.map(([dx, dy, icon, w, h], n) => `  <div id="${id}-p${n}" class="px" style="left:${fx + dx - w / 2}px;top:${fy + dy - h / 2}px;width:${w}px;height:${h}px;opacity:0">${icon}</div>`).join("\n")}
  <div id="${id}-big" class="px" style="left:${fx - 14}px;top:${fy - 12}px;width:28px;height:24px;transform-origin:50% 50%;opacity:0"><svg width="28" height="24" viewBox="0 0 14 12">${CHECK.replace(/<\/?svg[^>]*>/g, "")}</svg></div>
${[[-30, -26], [30, -24], [-34, 14], [34, 16], [0, -34]].map(([dx, dy], n) => `  <div id="${id}-st${n}" class="t outline" style="left:${fx + dx - 6}px;top:${fy + dy - 7}px;color:#F8E070;opacity:0">✦</div>`).join("\n")}`;
    let js = parts.map(([dx, dy], n) => `  tl.fromTo("#${id}-p${n}", { scale: 0, opacity: 1 }, { scale: 1, opacity: 1, duration: 0.1, ease: "steps(2)", immediateRender: false }, ${r(at + n * 0.1)});
  tl.fromTo("#${id}-p${n}", { x: 0, y: 0 }, { x: ${-dx}, y: ${-dy}, opacity: 0, duration: 0.18, ease: "power2.in", snap: "x,y", immediateRender: false }, ${r(at + 0.4)});`).join("\n");
    js += `
  tl.fromTo("#${id}-flash", { opacity: 0 }, { opacity: 0.85, duration: 0.05, ease: "steps(1)", yoyo: true, repeat: 1, immediateRender: false }, ${r(at + 0.58)});
  tl.fromTo("#${id}-big", { scale: 0, opacity: 1 }, { scale: 1.6, opacity: 1, duration: 0.2, ease: "back.out(2)", immediateRender: false }, ${r(at + 0.6)});
  tl.fromTo("#${id}-ring", { scale: 0.4, opacity: 1 }, { scale: 2.2, opacity: 0, duration: 0.5, ease: "power1.out", immediateRender: false }, ${r(at + 0.6)});
${Array.from({ length: rays }, (_, n) => `  tl.fromTo("#${id}-ray${n}", { opacity: 0 }, { opacity: 1, duration: 0.06, ease: "steps(1)", yoyo: true, repeat: 3, immediateRender: false }, ${r(at + 0.62)});`).join("\n")}
${[0, 1, 2, 3, 4].map((n) => `  tl.fromTo("#${id}-st${n}", { opacity: 0 }, { opacity: 1, duration: 0.08, ease: "steps(1)", yoyo: true, repeat: 3, immediateRender: false }, ${r(at + 0.7 + n * 0.05)});`).join("\n")}`;
    return [fxClip(id, at, html), js];
  },
  // 單項檢查：各自只有一個小特效
  Lint: (id, at, [fx, fy]) => [
    fxClip(id, at, `  <div id="${id}-i" class="px" style="left:${fx - 18}px;top:${fy + 14}px;width:36px;height:6px;opacity:0"><svg width="36" height="6" viewBox="0 0 36 6"><polyline points="0,5 3,1 6,5 9,1 12,5 15,1 18,5 21,1 24,5 27,1 30,5 33,1 36,5" fill="none" stroke="#E03030" stroke-width="1.5"/></svg></div>`),
    `  tl.fromTo("#${id}-i", { opacity: 0, scaleX: 0 }, { opacity: 1, scaleX: 1, duration: 0.2, ease: "steps(4)", immediateRender: false }, ${r(at + 0.05)});`],
  Build: (id, at, [fx, fy]) => [
    fxClip(id, at, `  <div id="${id}-i" class="px" style="left:${fx - 5}px;top:${FOE_FEET - 10}px;width:10px;height:10px;opacity:0">${BLOCK_ICON}</div>`),
    `  tl.fromTo("#${id}-i", { y: -40, opacity: 1 }, { y: 0, opacity: 1, duration: 0.2, ease: "steps(4)", snap: "y", immediateRender: false }, ${r(at + 0.05)});`],
  Test: (id, at, [fx, fy]) => [
    fxClip(id, at, `  <div id="${id}-i" class="px" style="left:${fx - 7}px;top:${fy - 6}px;width:14px;height:12px;transform-origin:50% 50%;opacity:0">${CHECK}</div>`),
    `  tl.fromTo("#${id}-i", { scale: 0, opacity: 1 }, { scale: 1.2, opacity: 1, duration: 0.15, ease: "steps(3)", immediateRender: false }, ${r(at + 0.05)});`],
  // 卡比獸的單招：自動化檢查亮綠燈、AI Review 放大鏡掃過
  自動化檢查: (id, at, [fx, fy]) => [
    fxClip(id, at, `  <div id="${id}-i" class="px" style="left:${fx - 6}px;top:${fy - 30}px;width:12px;height:12px;border-radius:50%;background:#58E058;box-shadow:0 0 0 2px #205020;opacity:0"></div>`),
    `  tl.fromTo("#${id}-i", { opacity: 0 }, { opacity: 1, duration: 0.08, ease: "steps(1)", yoyo: true, repeat: 3, immediateRender: false }, ${r(at + 0.05)});`],
  "AI Review": (id, at, [fx, fy]) => [
    fxClip(id, at, `  <div id="${id}-i" class="px" style="left:${fx - 34}px;top:${fy - 14}px;width:28px;height:28px;opacity:0"><svg width="28" height="28" viewBox="0 0 20 20"><circle cx="8" cy="8" r="6" fill="#C8E8F8" fill-opacity="0.5" stroke="#304050" stroke-width="2"/><line x1="12" y1="12" x2="18" y2="18" stroke="#304050" stroke-width="3"/></svg></div>`),
    `  tl.fromTo("#${id}-i", { x: 0, opacity: 1 }, { x: 40, opacity: 1, duration: 0.5, ease: "steps(8)", snap: "x", immediateRender: false }, ${r(at + 0.05)});`],
  // 分出三隻 Clawd 一起衝過去：同時開好幾個 Session
  "多開 Session": (id, at, [fx, fy]) => {
    const parts = [-14, 0, 14].map((dy, i) => fly(`${id}-k${i}`, `<img src="${S}/clawd-front.svg" style="left:0;top:0;width:18px;height:14px" alt="" />`, [CLAWD_C[0] - 9, CLAWD_C[1] - 7 + dy], [fx - 9 + (i - 1) * 6, fy - 7 + dy / 2], at + i * 0.12, 0.45, 6));
    return [fxClip(id, at, parts.map((p) => p[0]).join("\n")), parts.map((p) => p[1]).join("\n")];
  },
  // 一連串問號飛向對手：連環追問
  // 三道關卡依序亮起：自動化檢查 → 自動化 Review → 人工 Review（依風險）
  "三層煞車": (id, at, [fx, fy]) => {
    const gates = [0, 1, 2].map((i) => Math.round(CLAWD_C[0] + 40 + i * ((fx - CLAWD_C[0] - 70) / 2)));
    const ys = gates.map((x) => Math.round(CLAWD_C[1] + ((x - CLAWD_C[0]) / (fx - CLAWD_C[0])) * (fy - CLAWD_C[1])));
    const colors = ["#58D058", "#58A8F8", "#F8C030"];
    return [fxClip(id, at, gates.map((x, i) => `  <div id="${id}-g${i}" class="px" style="left:${x - 3}px;top:${ys[i] - 16}px;width:6px;height:32px;background:${colors[i]};box-shadow:0 0 0 1px #303030;opacity:0;transform-origin:50% 100%"></div>`).join("\n")),
      gates.map((_, i) => `  tl.fromTo("#${id}-g${i}", { opacity: 1, scaleY: 0 }, { opacity: 1, scaleY: 1, duration: 0.15, ease: "steps(3)", immediateRender: false }, ${r(at + 0.05 + i * 0.2)});
  tl.fromTo("#${id}-g${i}", { opacity: 1 }, { opacity: 0.3, duration: 0.06, ease: "steps(1)", yoyo: true, repeat: 1, immediateRender: false }, ${r(at + 0.65)});`).join("\n")];
  },
  "grill-me": (...a) => MOVE_FX["grill-with-docs"](...a),
  "grill-with-docs": (id, at, [fx, fy]) => {
    const parts = [0, 1, 2, 3, 4].map((i) => fly(`${id}-q${i}`, `<div class="t outline" style="left:0;top:0;color:#F8D030;font-size:24px;line-height:26px">？</div>`, [CLAWD_C[0], CLAWD_C[1] - 14], [fx - 16 + i * 7, fy - 10 + (i % 2) * 10], at + i * 0.1, 0.4, 18));
    return [fxClip(id, at, parts.map((p) => p[0]).join("\n")), parts.map((p) => p[1]).join("\n")];
  },
  // 樹枝從 Clawd 長出來、分成三條：每個 Agent 一個 worktree
  "Git Worktree": (id, at, [fx, fy]) => {
    const mid = [Math.round((CLAWD_C[0] + fx) / 2), Math.round((CLAWD_C[1] + fy) / 2)];
    const ends = [[fx - 10, fy - 16], [fx + 4, fy], [fx - 14, fy + 16]];
    const lines = [[CLAWD_C, mid], ...ends.map((e) => [mid, e])];
    const svg = `<svg class="px" style="left:0;top:0" width="320" height="180" viewBox="0 0 320 180">${lines
      .map(([a, b], i) => `<polyline id="${id}-l${i}" points="${a[0]},${a[1]} ${b[0]},${a[1]} ${b[0]},${b[1]}" pathLength="1" fill="none" stroke="#58B048" stroke-width="3" stroke-dasharray="1" stroke-dashoffset="1"/>`)
      .join("")}${ends.map((e, i) => `<circle id="${id}-d${i}" cx="${e[0]}" cy="${e[1]}" r="3" fill="#F8F8F8" stroke="#305828" stroke-width="1.5" opacity="0"/>`).join("")}</svg>`;
    return [fxClip(id, at, svg),
      `  tl.fromTo("#${id}-l0", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.25, ease: "steps(5)", immediateRender: false }, ${r(at + 0.05)});\n` +
      ends.map((_, i) => `  tl.fromTo("#${id}-l${i + 1}", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.25, ease: "steps(5)", immediateRender: false }, ${r(at + 0.3 + i * 0.06)});
  tl.fromTo("#${id}-d${i}", { opacity: 0 }, { opacity: 1, duration: 0.05, immediateRender: false }, ${r(at + 0.55 + i * 0.06)});`).join("\n")];
  },
  // 小方塊一個一個跳過去：先從一小塊開始
  "低風險試行": (id, at, [fx, fy]) => {
    const parts = [0, 1, 2].map((i) => fly(`${id}-s${i}`, `<div class="px" style="left:0;top:0;width:14px;height:14px;background:#F8B048;box-shadow:inset -2px -2px 0 #C87020, inset 2px 2px 0 #FFD890, 0 0 0 1px #784010"></div>`, [CLAWD_C[0] - 7, CLAWD_C[1] - 7], [fx - 24 + i * 16, fy + 4], at + i * 0.22, 0.4, 24));
    return [fxClip(id, at, parts.map((p) => p[0]).join("\n")), parts.map((p) => p[1]).join("\n")];
  },
  // 磚塊一層層疊起來：把測試環境的基礎打好，測得到才放手
  "打好測試環境": (id, at, [fx]) => {
    const bricks = [];
    for (let row = 0; row < 3; row++) for (let c = 0; c < 4 - (row % 2); c++) bricks.push([fx - 30 + c * 15 + (row % 2) * 7, FOE_FEET + 2 - row * 7, row]);
    return [fxClip(id, at, bricks.map(([x, y], i) => `  <div id="${id}-b${i}" class="px" style="left:${x}px;top:${y}px;width:14px;height:6px;background:#C86848;box-shadow:inset -1px -1px 0 #883820, inset 1px 1px 0 #E89878;opacity:0"></div>`).join("\n")),
      bricks.map(([, , row], i) => `  tl.fromTo("#${id}-b${i}", { y: -40, opacity: 1 }, { y: 0, opacity: 1, duration: 0.18, ease: "steps(4)", snap: "y", immediateRender: false }, ${r(at + 0.05 + row * 0.22 + (i % 4) * 0.03)});`).join("\n")];
  },
  // 倒帶：畫面出現 ◀◀ 和錄影帶雜訊條
  "/retro": (id, at, [fx, fy]) => [
    fxClip(id, at, `  <div id="${id}-tint" class="layer" style="background:#3850A0;opacity:0"></div>
${[0, 1, 2].map((i) => `  <div id="${id}-v${i}" class="px" style="left:0;top:${30 + i * 40}px;width:320px;height:3px;background:#E8F0FF;opacity:0"></div>`).join("\n")}
  <div id="${id}-rw" class="t outline" style="left:${fx - 16}px;top:${fy - 8}px;font-size:24px;line-height:26px;opacity:0">◀◀</div>`),
    `  tl.fromTo("#${id}-tint", { opacity: 0 }, { opacity: 0.25, duration: 0.1, ease: "steps(1)", yoyo: true, repeat: 3, immediateRender: false }, ${r(at + 0.05)});
${[0, 1, 2].map((i) => `  tl.fromTo("#${id}-v${i}", { y: 0, opacity: 0.8 }, { y: 30, opacity: 0.8, duration: 0.5, ease: "steps(10)", snap: "y", immediateRender: false }, ${r(at + 0.05 + i * 0.05)});
  tl.set("#${id}-v${i}", { opacity: 0 }, ${r(at + 0.6)});`).join("\n")}
  tl.fromTo("#${id}-rw", { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "steps(1)", yoyo: true, repeat: 5, immediateRender: false }, ${r(at + 0.1)});`],
};

// ── 用錯招的動畫（2.4 秒內演完）──
const gagClip = (id, at, inner) => `<div id="${id}" class="clip" data-start="${r(at)}" data-duration="2.4" style="position:absolute;inset:0">\n${inner}\n</div>`;
const GAG_FX = {
  // Clawd 旁邊冒出一杯熱咖啡，呆呆獸頭上的沙漏慢慢轉、冒出「……」，完全沒反應
  coffee: (id, at, [fx, fy]) => [
    gagClip(id, at, `  <div id="${id}-cup" class="px" style="left:116px;top:96px;width:14px;height:14px;opacity:0">
    <div class="px" style="left:0;top:2px;width:10px;height:12px;background:#F8F8F8;box-shadow:0 0 0 1px #404040"></div>
    <div class="px" style="left:1px;top:3px;width:8px;height:2px;background:#6A3A18"></div>
    <div class="px" style="left:10px;top:5px;width:3px;height:5px;border:1px solid #404040;border-left:0"></div>
  </div>
${[0, 1, 2].map((n) => `  <div id="${id}-steam${n}" class="t outline" style="left:${115 + n * 4}px;top:84px;opacity:0">~</div>`).join("\n")}
  <div id="${id}-glass" class="t outline" style="left:${fx + 16}px;top:${fy - 30}px;opacity:0">⌛</div>
  <div id="${id}-dots" class="px" style="left:${fx - 26}px;top:${fy - 34}px;width:30px;height:14px;background:#F8F8F8;border-radius:6px;box-shadow:0 0 0 1px #404040;opacity:0"><div class="t gtx" style="left:4px;top:0">……</div></div>`),
    `  tl.fromTo("#${id}-cup", { y: 6, opacity: 0 }, { y: 0, opacity: 1, duration: 0.2, ease: "steps(3)", snap: "y", immediateRender: false }, ${r(at)});
${[0, 1, 2].map((n) => `  tl.fromTo("#${id}-steam${n}", { y: 0, opacity: 0 }, { y: -8, opacity: 1, duration: 0.6, ease: "steps(4)", snap: "y", repeat: 2, immediateRender: false }, ${r(at + 0.2 + n * 0.2)});`).join("\n")}
  tl.fromTo("#${id}-glass", { rotation: 0, opacity: 1 }, { rotation: 180, opacity: 1, duration: 0.5, ease: "steps(2)", repeat: 3, immediateRender: false }, ${r(at + 0.3)});
  tl.fromTo("#${id}-dots", { opacity: 0 }, { opacity: 1, duration: 0.1, ease: "steps(1)", immediateRender: false }, ${r(at + 0.9)});`],
  // Clawd 眼睛放大，兩道虛線一直盯著對手
  stare: (id, at, [fx, fy]) => {
    const eyes = [[64, 85], [100, 85]];
    return [gagClip(id, at, `${eyes.map(([x, y], n) => `  <div id="${id}-e${n}" class="px" style="left:${x - 6}px;top:${y - 6}px;width:12px;height:12px;background:#F8F8F8;box-shadow:0 0 0 1px #000;opacity:0"><div class="px" style="left:6px;top:3px;width:5px;height:6px;background:#000"></div></div>`).join("\n")}
  <svg id="${id}-lines" class="px" style="left:0;top:0;opacity:0" width="320" height="180" viewBox="0 0 320 180">${eyes.map(([x, y]) => `<line x1="${x + 6}" y1="${y}" x2="${fx}" y2="${fy}" stroke="#F8F8F8" stroke-width="1.5" stroke-dasharray="3 3"/>`).join("")}</svg>`),
      `${eyes.map((_, n) => `  tl.fromTo("#${id}-e${n}", { scale: 0.5, opacity: 1 }, { scale: 1, opacity: 1, duration: 0.15, ease: "steps(3)", immediateRender: false }, ${r(at)});`).join("\n")}
  tl.fromTo("#${id}-lines", { opacity: 0 }, { opacity: 1, duration: 0.1, ease: "steps(1)", yoyo: true, repeat: 7, immediateRender: false }, ${r(at + 0.2)});
  tl.set("#${id}-lines", { opacity: 0 }, ${r(at + 1.1)});
${eyes.map((_, n) => `  tl.set("#${id}-e${n}", { opacity: 0 }, ${r(at + 1.1)});`).join("\n")}`];
  },
  // 一張張 PR 單子飛向卡比獸、越疊越高
  papers: (id, at, [fx]) => {
    const sheet = `<div style="width:10px;height:12px;background:#F8F8F8;box-shadow:0 0 0 1px #606060"><div style="position:absolute;left:2px;top:3px;width:6px;height:1px;background:#A0A0A0;box-shadow:0 3px 0 #A0A0A0, 0 6px 0 #A0A0A0"></div></div>`;
    const parts = Array.from({ length: 8 }, (_, n) => fly(`${id}-s${n}`, sheet, [CLAWD_C[0] - 5, CLAWD_C[1] - 6], [fx - 34 + (n % 4) * 18, FOE_FEET - 12 - Math.floor(n / 4) * 10], at + n * 0.1, 0.35, 16));
    return [gagClip(id, at, parts.map((p) => p[0]).join("\n")), parts.map((p) => p[1].replace(/\n  tl\.set\("#[^"]+", \{ opacity: 0 \}, [0-9.]+\);/, "")).join("\n")];
  },
};

// 睡著：Clawd 閉上眼睛，頭上冒出 Z z z
const sleepFx = (id, start, dur) => `<div id="${id}" class="clip" data-start="${r(start)}" data-duration="${r(dur)}" style="position:absolute;inset:0">
  <img id="${id}-clawd" src="${S}/clawd-sleep.svg" style="left:41px;top:66px;width:70px;height:54px" alt="" />
${["Z", "z", "z"].map((c, i) => `  <div id="${id}-z${i}" class="t outline" style="left:${104 + i * 8}px;top:${62 - i * 8}px;opacity:0">${c}</div>`).join("\n")}
</div>`;
const sleepJs = (id, at, clawd, dur) =>
  `  tl.set("${clawd}", { opacity: 0 }, ${r(at)});\n  tl.set("${clawd}", { opacity: 1 }, ${r(at + dur)});\n` +
  [0, 1, 2].map((i) => `  tl.fromTo("#${id}-z${i}", { y: 4, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "steps(3)", immediateRender: false }, ${r(at + 0.1 + i * 0.25)});`).join("\n") + "\n";
// 像素字寬估算：全形 12px、半形 6px
const textWidth = (t) => [...plain(t)].reduce((w, c) => w + (c.charCodeAt(0) > 0xff ? 12 : 6), 0);
const BOSS_AT = {}; // 每集大魔王出場的集內時間（換配樂用）

TRAINERS.forEach((tr, ti) => {
  const id = `bat${ti + 1}`;
  const form = FORMS[ti];
  const base = AT[id].start;
  CUR = id;
  // 整個對戰畫面包在 cam 裡，效果絕佳時一起震動
  let body = `<div id="${id}-cam" class="layer">
<img class="bg" src="${P}/${tr.bg ?? "bg-battle.png"}" alt="" />
<img src="${S}/base-foe.svg" style="left:194px;top:53px;width:112px;height:22px${tr.baseFilter ? `;filter:${tr.baseFilter}` : ""}" alt="" />
<img src="${S}/base-player.svg" style="left:6px;top:108px;width:140px;height:26px${tr.baseFilter ? `;filter:${tr.baseFilter}` : ""}" alt="" />
<img id="${id}-foe-tr" src="${P}/${tr.sprite}" style="left:${FOE_X - 40}px;top:${FOE_FEET - 78}px;width:80px;height:80px" alt="" />
<img id="${id}-ash" src="${P}/trainer-ash.png" style="left:36px;top:52px;width:80px;height:80px;transform:scaleX(-1)" alt="" />
${form.members
  ? `<div id="${id}-clawd" class="px" style="left:${76 - form.w}px;top:${120 - form.h * 2}px;width:${form.w * 2}px;height:${form.h * 2}px;transform-origin:50% 100%">
${form.members.map(([x, y], n) => `  <div id="${id}-cm${n}" class="px" style="left:${x * 2}px;top:${y * 2}px;width:${form.member.w * 2}px;height:${form.member.h * 2}px;background:url('${S}/${form.member.sheet}') 0 0 / ${form.member.w * 4}px ${form.member.h * 2}px"></div>`).join("\n")}
</div>`
  : `<div id="${id}-clawd" class="px" style="left:${76 - form.w}px;top:${120 - form.h * 2}px;width:${form.w * 2}px;height:${form.h * 2}px;background:url('${S}/${form.battle}') 0 0 / ${form.w * 4}px ${form.h * 2}px;transform-origin:50% 100%"></div>`}
<div id="${id}-php" class="hpbox" style="left:168px;top:77px;width:148px;height:51px">
  <div class="in"></div>
  <div class="t gtx" style="left:8px;top:2px">${form.name}</div><div class="t gtx" style="right:9px;top:2px">Lv.${ti + 1}</div>
  <div class="cap" style="left:40px;top:17px;width:100px"><div class="lab">HP</div><div class="trk"><i id="${id}-pbar" style="width:77px"></i></div></div>
  <div id="${id}-hp-full" class="t gtx" style="right:9px;top:28px">20/20</div>
  <div id="${id}-hp-hurt" class="t gtx" style="right:9px;top:28px;opacity:0">15/20</div>
  <div class="px" style="left:40px;top:43px;width:100px;height:4px;background:#505858"></div>
  <div id="${id}-exp" class="px" style="left:41px;top:44px;width:0;height:2px;background:#48A8F8"></div>
</div>
<div id="${id}-fhp" class="hpbox" style="left:6px;top:5px;width:150px;height:33px">
  <div class="in"></div>
  <div class="t gtx" style="right:9px;top:2px">Lv.${tr.step}</div>
  <div class="cap" style="left:42px;top:17px;width:100px"><div class="lab">HP</div><div class="trk"><i id="${id}-bar" style="width:77px"></i></div></div>
`;
  let script = form.members
    ? form.members.map(([, , ph], n) => `  playSheet($("#${id}-cm${n}"), 2, 2.5, ${form.member.w * 2}, 0, ${AT[id].dur}, ${ph});\n`).join("")
    : `  playSheet($("#${id}-clawd"), 2, 2.5, ${form.w * 2}, 0, ${AT[id].dur});\n`;
  const names = [];
  let foes = "";
  let menus = "";
  // 開場：天王與小智出場、天王撂一句話；接著小智喊「去吧！Clawd！」丟出精靈球
  const GO = INTRO - 1.3;
  menus += msg(`${id}-hi`, 0.3, GO - 0.3, [`${tr.name}：「${tr.intro}」`]);
  menus += msg(`${id}-go`, GO, INTRO - GO, [`<span class="hl">小智</span>：「去吧！<span class="hl">${form.name}</span>！」`]);
  foes += pokeball(`${id}-ball`, GO + 0.2, [40, 80]);
  script += `  tl.fromTo("#${id}-foe-tr", { x: 120 }, { x: 0, duration: 0.3, ease: "power2.out", snap: "x" }, 0);
  tl.fromTo("#${id}-ash", { x: -120 }, { x: 0, duration: 0.3, ease: "power2.out", snap: "x" }, 0);
  tl.fromTo("#${id}-foe-tr", { x: 0 }, { x: 120, duration: 0.3, ease: "power2.in", snap: "x", immediateRender: false }, ${r(GO)});
  tl.fromTo("#${id}-ash", { y: 0 }, { y: -4, duration: 0.1, ease: "steps(2)", yoyo: true, repeat: 1, snap: "y" }, ${r(GO + 0.1)});
  tl.fromTo("#${id}-ash", { x: 0 }, { x: -130, duration: 0.3, ease: "power2.in", snap: "x", immediateRender: false }, ${r(GO + 0.35)});
  tl.fromTo("#${id}-clawd", { scale: 0 }, { scale: 1, duration: 0.25, ease: "back.out(1.6)" }, ${r(GO + 0.6)});
  tl.fromTo("#${id}-php", { x: 160 }, { x: 0, duration: 0.25, ease: "power2.out", snap: "x" }, ${r(GO + 0.8)});\n`;
  script += pokeballJs(`${id}-ball`, GO + 0.2, [40, 80], [CLAWD_C[0] - 6, CLAWD_C[1] - 6]);
  audioCues.push([CUR, `throw-${id}`, "assets/sfx/throw.wav", base + GO + 0.2, 0.3, 0.6]);
  let t0 = INTRO;
  tr.team.forEach((p, pi) => {
    const gag = p.gag;
    const len = roundLength(p);
    const sh = sheet(p.file);
    const left = Math.round(FOE_X - sh.w / 2);
    const top = FOE_FEET - sh.h;
    const fid = `${id}-p${pi}`;
    names.push(`<div id="${fid}-name" class="t gtx clip" data-start="${r(t0)}" data-duration="${len}" style="left:8px;top:2px">${p.name}</div>`);
    foes += `<div id="${fid}" class="clip" data-start="${r(t0)}" data-duration="${len}" data-layout-allow-overflow style="position:absolute;left:${left}px;top:${top}px;width:${sh.w}px;height:${sh.h}px;overflow:hidden;transform-origin:50% 100%${p.scale ? `;transform:scale(${p.scale})` : ""}">
  <div id="${fid}-s" class="px" style="left:0;top:0;width:${sh.w}px;height:${sh.h}px;background:url('${P}/${p.file}-sheet.png') 0 0 / ${sh.w * sh.frames}px ${sh.h}px;transform-origin:50% 100%"></div>
</div>
${pokeball(`${fid}-ball`, t0, [330, -10])}
<div id="${fid}-burst" class="clip" data-start="${r(t0 + 0.3)}" data-duration="0.4" style="position:absolute;left:${FOE_X - 20}px;top:${FOE_FEET - 40}px;width:40px;height:40px">
  <div class="px" style="left:0;top:0;width:40px;height:40px;border-radius:50%;background:#fff"></div>
</div>
`;
    // 天王剩幾隻：派出時在訊息框右邊排一列精靈球，打倒的變灰
    foes += `<div id="${fid}-party" class="clip" data-start="${r(t0)}" data-duration="${T.sent}" style="position:absolute;inset:0">
${tr.team.map((_, bi) => `  <img src="${P}/pokeball.svg" style="left:${304 - (tr.team.length - bi) * 12}px;top:140px;width:10px;height:10px${bi < pi ? ";filter:grayscale(1);opacity:0.45" : ""}" alt="" />`).join("\n")}
</div>
`;
    if (p.boss) {
      // 大魔王出場：畫面閃紅光，配樂換成最終戰
      BOSS_AT[id] = base + t0;
      foes += `<div id="${fid}-boss" class="clip" data-start="${r(t0)}" data-duration="0.6" style="position:absolute;inset:0">
  <div id="${fid}-red" class="layer" style="background:#E02828;opacity:0"></div>
</div>
`;
      script += `  tl.fromTo("#${fid}-red", { opacity: 0 }, { opacity: 0.45, duration: 0.08, ease: "steps(1)", yoyo: true, repeat: 3, immediateRender: false }, ${r(t0)});\n`;
    }
    let k = t0;
    let m = msg(`${fid}-a`, k, T.sent, [`${tr.name}派出了<span class="${p.boss ? "boss" : "hl"}">${p.name}</span>！${p.quip ?? ""}`, `<span class="stuck">卡在：${p.problem}</span>`]);
    script += `  playSheet($("#${fid}-s"), ${sh.frames}, ${sh.fps}, ${sh.w}, ${r(t0)}, ${len});
${pokeballJs(`${fid}-ball`, t0, [330, -10], [FOE_X - 6, FOE_FEET - 20])}
  tl.fromTo("#${fid}-s", { scale: 0 }, { scale: 1, duration: 0.25, ease: "back.out(1.6)" }, ${r(t0 + 0.35)});
  tl.fromTo("#${fid}-burst .px", { scale: 0.2, opacity: 1 }, { scale: 1.5, opacity: 0, duration: 0.35, ease: "power2.out" }, ${r(t0 + 0.3)});
  tl.fromTo("#${id}-fhp", { x: -160 }, { x: 0, duration: 0.25, ease: "power2.out", snap: "x", immediateRender: ${pi === 0} }, ${r(t0 + 0.1)});
  tl.fromTo("#${id}-bar", { width: 77, backgroundColor: "#58D080" }, { width: 77, duration: 0.01, immediateRender: ${pi === 0} }, ${r(t0)});
`;
    audioCues.push([CUR, `cry-${fid}`, `${P}/${p.file}-cry.mp3`, base + t0 + 0.4, 1.8, 0.7]);
    k += T.sent;
    const choose = (cursorMove, at, menuId, list) => {
      const idx = list.indexOf(cursorMove);
      menus += `<div id="${menuId}" class="clip" data-start="${r(at)}" data-duration="${T.menu}" style="position:absolute;inset:0">
  ${list.map((mv, mi) => `<div class="t gtx" style="left:${MENU_POS[mi][0]}px;top:${MENU_POS[mi][1]}px">${mv}</div>`).join("")}
  <div class="t gtx" style="left:${MENU_POS[idx][0] - 10}px;top:${MENU_POS[idx][1]}px">▶</div>
  <div style="position:absolute;left:234px;top:134px;width:2px;height:38px;background:#98B0C8"></div>
  <div class="t gtx" style="left:242px;top:136px">PP 10/10</div><div class="t gtx" style="left:242px;top:154px">屬性／Skill</div>
</div>
`;
      audioCues.push([CUR, `sel-${menuId}`, "assets/sfx/select.wav", base + at + T.menu - 0.2, 0.1, 0.5]);
    };
    const attack = (move, at, good, chip = false) => {
      m += msg(`${fid}-u${Math.round(at * 10)}`, at, good ? T.attack : T.gagAttack, [`<span class="hl">${form.name}</span> 使出了 ${move}！`]);
      // 往前衝；小隊是 5 隻依序衝
      const lungers = form.members ? form.members.map((_, n) => [`#${id}-cm${n}`, n * 0.05]) : [[`#${id}-clawd`, 0]];
      script += lungers.map(([sel, d]) => `  tl.fromTo("${sel}", { x: 0 }, { x: 10, duration: 0.1, ease: "power2.out", snap: "x", immediateRender: false }, ${r(at + 0.15 + d)});
  tl.fromTo("${sel}", { x: 10 }, { x: 0, duration: 0.15, ease: "power2.in", snap: "x", immediateRender: false }, ${r(at + 0.25 + d)});`).join("\n") + "\n";
      if (good) {
        const fx = MOVE_FX[move];
        if (!fx) throw new Error(`招式「${move}」沒有特效`);
        const [fxHtml, fxJs] = fx(`${fid}-mv`, at + 0.3, [FOE_X, Math.round(FOE_FEET - sh.h / 2)]);
        foes += fxHtml + "\n";
        script += fxJs + "\n";
        // 特效打到之後，對手閃爍
        script += [0, 0.08, 0.16, 0.24].map((d, i) => `  tl.set("#${fid}-s", { opacity: ${i % 2} }, ${r(at + 0.95 + d)});`).join("\n") + "\n";
        audioCues.push([CUR, `hit-${fid}`, "assets/sfx/hit.wav", base + at + 0.95, 0.25, 0.6]);
      } else if (chip) {
        if (MOVE_FX[move]) {
          const [h, j] = MOVE_FX[move](`${fid}-cf${Math.round(at * 10)}`, at + 0.25, [FOE_X, Math.round(FOE_FEET - sh.h / 2)]);
          foes += h + "\n";
          script += j + "\n";
        }
        script += [0, 0.08].map((d, i) => `  tl.set("#${fid}-s", { opacity: ${i % 2} }, ${r(at + 0.4 + d)});`).join("\n") + "\n";
        audioCues.push([CUR, `chip-${fid}-${Math.round(at * 10)}`, "assets/sfx/hit.wav", base + at + 0.4, 0.25, 0.4]);
      } else {
        audioCues.push([CUR, `bump-${fid}`, "assets/sfx/bump.wav", base + at + 0.3, 0.15, 0.5]);
      }
    };
    const menu = p.combo ? [...p.combo, p.move] : menuFor(tr, p.move, gag);
    let curW = 77; // 對手目前的血量條寬度
    if (gag) {
      choose(gag, k, `${fid}-g1`, p.combo ? [...p.combo, gag] : menu);
      k += T.menu;
      attack(gag, k, false);
      if (p.gagFx) {
        // 用錯招也有自己的動畫（泡咖啡、一直盯著看、全部逐行看）
        const [h, j] = GAG_FX[p.gagFx](`${fid}-gx`, k + 0.2, [FOE_X, Math.round(FOE_FEET - sh.h / 2)], `#${id}-clawd`);
        foes += h + "\n";
        script += j + "\n";
      }
      k += T.gagAttack;
      if (p.counter) {
        if (p.gagResult) {
          m += msg(`${fid}-res`, k, T.bad, [p.gagResult]);
          k += T.bad;
        }
        // 對手反擊：催眠術的波紋從對手飄向 Clawd，Clawd 扣血、睡著
        m += msg(`${fid}-cm`, k, T.hyp, [`<span class="hl">${p.name}</span>使出了${p.counter.move}！`]);
        foes += hypnosisFx(`${fid}-fx`, k, T.hyp, p.counter.fx);
        script += hypnosisJs(`${fid}-fx`, `#${id}-clawd`, k);
        script += [0, 0.08, 0.16, 0.24].map((d, i) => `  tl.set("#${id}-clawd", { opacity: ${i % 2} }, ${r(k + 0.9 + d)});`).join("\n") + "\n";
        script += `  tl.fromTo("#${id}-pbar", { width: 77 }, { width: 58, duration: 0.4, ease: "none", immediateRender: false }, ${r(k + 0.9)});
  tl.set("#${id}-hp-full", { opacity: 0 }, ${r(k + 1.1)});
  tl.set("#${id}-hp-hurt", { opacity: 1 }, ${r(k + 1.1)});\n`;
        audioCues.push([CUR, `fx-${fid}`, "assets/sfx/hypnosis.wav", base + k + 0.1, 1.4, 0.6]);
        k += T.hyp;
        m += msg(`${fid}-zz`, k, T.sleep, [p.counter.after]);
        foes += sleepFx(`${fid}-zz-fx`, k, T.sleep);
        script += sleepJs(`${fid}-zz-fx`, k, `#${id}-clawd`, T.sleep);
        k += T.sleep;
      } else if (p.grow) {
        // 用錯招，對手反而變大，畫面跟著震
        m += msg(`${fid}-grow`, k, T.grow, [p.grow.text]);
        script += `  tl.fromTo("#${fid}", { scale: ${p.scale ?? 1} }, { scale: ${p.grow.scale}, duration: 0.6, ease: "steps(6)", immediateRender: false }, ${r(k + 0.3)});
  tl.fromTo("#${id}-cam", { x: 0 }, { x: 3, duration: 0.05, ease: "steps(1)", yoyo: true, repeat: 7, immediateRender: false }, ${r(k + 0.3)});
  tl.set("#${id}-cam", { x: 0 }, ${r(k + 0.72)});\n`;
        audioCues.push([CUR, `grow-${fid}`, `${P}/${p.file}-cry.mp3`, base + k + 0.3, 1.8, 0.7]);
        k += T.grow;
      } else {
        m += msg(`${fid}-bad`, k, T.bad, [p.gagResult ?? "效果不太好…"]);
        if (p.noDamage) {
          // 對手不扣血；像遊戲裡能力提升的提示音
          audioCues.push([CUR, `up-${fid}`, "assets/sfx/levelup.wav", base + k + 0.1, 0.8, 0.3]);
        } else {
          script += `  tl.fromTo("#${id}-bar", { width: 77 }, { width: 70, duration: 0.3, ease: "none", immediateRender: false }, ${r(k + 0.1)});\n`;
          curW = 70;
        }
        k += T.bad;
      }
    }
    if (p.combo) {
      // 單項檢查一招一招打：每招只打掉一點血
      choose(p.combo[0], k, `${fid}-c`, menu);
      k += T.menu;
      p.combo.forEach((mv, ci) => {
        attack(mv, k, false, true);
        k += T.gagAttack;
        m += msg(`${fid}-chip${ci}`, k, T.bad, ["打中了，但還不夠…"]);
        script += `  tl.fromTo("#${id}-bar", { width: ${curW} }, { width: ${curW - 15}, duration: 0.3, ease: "none", immediateRender: false }, ${r(k + 0.05)});\n`;
        curW -= 15;
        k += T.bad;
      });
    }
    choose(p.move, k, `${fid}-m`, menu);
    k += T.menu;
    attack(p.move, k, true);
    k += T.attack;
    m += msg(`${fid}-good`, k, T.good, ["效果絕佳！"]);
    script += `  tl.fromTo("#${id}-cam", { x: 0 }, { x: 3, duration: 0.05, ease: "steps(1)", yoyo: true, repeat: 5, immediateRender: false }, ${r(k)});\n`;
    script += `  tl.set("#${id}-cam", { x: 0 }, ${r(k + 0.31)});\n`;
    audioCues.push([CUR, `crit-${fid}`, "assets/sfx/crit.wav", base + k, 0.35, 0.5]);
    script += `  tl.fromTo("#${id}-bar", { width: ${curW}, backgroundColor: "#58D080" }, { width: 0, backgroundColor: "#E85838", duration: 0.5, ease: "power1.in", immediateRender: false }, ${r(k + 0.05)});\n`;
    k += T.good;
    // 「卡在」小標籤：派出訊息結束後一直掛在血條框下方，到倒下為止
    const tagText = `卡在：${p.tag}`;
    foes += `<div id="${fid}-tag" class="clip" data-start="${r(t0 + T.sent)}" data-duration="${r(k - t0 - T.sent)}" style="position:absolute;inset:0">
  <div class="px" style="left:6px;top:40px;width:${textWidth(tagText) + 8}px;height:14px;background:#5A3A20;box-shadow:0 0 0 1px #2A1A10"></div>
  <div class="t" style="left:10px;top:40px;line-height:14px;color:#F8E0B0">${tagText}</div>
</div>
`;
    // 經驗值條：每打倒一隻漲一段
    script += `  tl.fromTo("#${id}-exp", { width: ${r((pi / tr.team.length) * 98)} }, { width: ${r(((pi + 1) / tr.team.length) * 98)}, duration: 0.6, ease: "none", immediateRender: ${pi === 0} }, ${r(k + 0.5)});\n`;
    // 倒下，並用一句白話說明這招為什麼有效
    m += msg(`${fid}-down`, k, t0 + len - k, [`<span class="hl">${p.name}</span>倒下了！`, `<span class="tip">${p.tip}</span>`]);
    script += `  tl.fromTo("#${fid}-s", { y: 0 }, { y: ${sh.h}, duration: 0.3, ease: "power2.in", snap: "y" }, ${r(k + 0.05)});
  tl.fromTo("#${id}-fhp", { x: 0 }, { x: -160, duration: 0.2, ease: "power2.in", snap: "x", immediateRender: false }, ${r(t0 + len - 0.3)});
`;
    audioCues.push([CUR, `faint-${fid}`, "assets/sfx/faint.wav", base + k + 0.05, 0.6, 0.5]);
    menus += m;
    t0 += len;
  });
  // 收場：天王回來認輸
  menus += msg(`${id}-bye`, t0 + 0.3, OUTRO - 0.3, [`${tr.name}：「${tr.outro}」`]);
  script += `  tl.fromTo("#${id}-foe-tr", { x: 120 }, { x: 0, duration: 0.3, ease: "power2.out", snap: "x", immediateRender: false }, ${r(t0)});\n`;
  body += names.join("\n") + "\n</div>\n" + foes + menus + "\n</div>";
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

// 已經打開的門（暗色門洞）
const OPEN_DOOR = (x) =>
  `<div class="px" style="left:${x}px;top:38px;width:32px;height:61px;border-radius:16px 16px 0 0;background:#1E1A2E"></div>`;

// ── 過關：門打開，Clawd 走過去 ─────────────────────────────
const DOOR = { 3: 96, 4: 168 }; // Step 3、Step 4 門板左緣
TRAINERS.forEach((tr, i) => {
  const id = `win${i + 1}`;
  CUR = id;
  const next = tr.step + 1;
  const last = i === TRAINERS.length - 1; // 最後一位：門留到 To be continued 再開
  const flag = `<img id="${id}-flag" src="${S}/flag.svg" style="left:58px;top:78px;width:24px;height:28px" alt="" />
<div id="${id}-tag" class="t outline" style="left:58px;top:110px;padding:0 3px;line-height:14px;height:14px;background:#2C3458">今天走到這裡</div>`;
  const walk = CLAWD_AT[next] - CLAWD_AT[tr.step];
  scene(
    id,
    `<img class="bg" src="${P}/bg-hall.png" alt="" />
${i === 1 ? OPEN_DOOR(DOOR[3]) : ""}
${flag}
${last ? "" : `<div id="${id}-door" class="px" style="left:${DOOR[next]}px;top:38px;width:32px;height:61px;border-radius:16px 16px 0 0;background:#1E1A2E;transform-origin:50% 100%"></div>`}
${HALL_CLAWD(`${id}-clawd`, tr.step, FORMS[i])}
${msg(`${id}-m1`, 0.2, 4.0, [`打贏了四大天王・<span class="hl">${tr.name}</span>！`, last ? `走到 <span class="hl">Step ${tr.step}</span> 了！前面就是 Step ${next}` : `走到 <span class="hl">Step ${tr.step}</span> 了！Step ${next} 的門打開了`])}`,
    `  ${i === 0 ? `tl.fromTo("#${id}-flag", { y: -40 }, { y: 0, duration: 0.3, ease: "bounce.out", snap: "y" }, 0.8);
  tl.fromTo("#${id}-tag", { opacity: 0 }, { opacity: 1, duration: 0.15, ease: "steps(2)" }, 1.1);` : ""}
  ${last ? "" : `tl.fromTo("#${id}-door", { scaleY: 0 }, { scaleY: 1, duration: 0.4, ease: "steps(5)" }, 1.6);`}
  playSheet($("#${id}-clawd"), 2, 5, ${FORMS[i].w}, 0, ${AT[id].dur});
  tl.fromTo("#${id}-clawd", { x: 0 }, { x: ${walk}, duration: 1.2, ease: "none", snap: "x" }, 2.0);
  ${last ? "" : `tl.fromTo("#${id}-clawd", { y: 0, scale: 1, opacity: 1 }, { y: -10, scale: 0.7, opacity: 0, duration: 0.6, ease: "steps(4)", immediateRender: false }, 3.4);`}`,
  );
  if (!last) audioCues.push([CUR, `open-${id}`, "assets/sfx/bump.wav", AT[id].start + 1.6, 0.15, 0.6]);
});

// ── 共用：夜空、月暈、自繪訊息框 ───────────────────────────
const NIGHT = `<div class="px" style="left:0;top:0;width:320px;height:45px;background:#0A1030"></div>
<div class="px" style="left:0;top:45px;width:320px;height:45px;background:#121A40"></div>
<div class="px" style="left:0;top:90px;width:320px;height:45px;background:#1A2450"></div>
<div class="px" style="left:0;top:135px;width:320px;height:45px;background:#222E60"></div>
<div class="px" style="left:100px;top:6px;width:120px;height:120px;border-radius:50%;background:#3A4A78"></div>
<div class="px" style="left:116px;top:22px;width:88px;height:88px;border-radius:50%;background:#4E5E90"></div>`;
const BOX = `<div class="px" style="left:0;top:130px;width:320px;height:50px;background:#F8F8F8;border:3px solid #485868;box-shadow:inset 0 0 0 2px #98B0C8"></div>`;
// JoJo 式「To Be Continued」：畫面泛黃定格，箭頭從右邊滑進左下角（素材來自使用者提供的綠幕影片，去背後放在 assets/pokemon/jojo-arrow.png）
const JOJO = (id, start, dur) => `<div id="${id}" class="clip" data-start="${start}" data-duration="${dur}" style="position:absolute;inset:0">
  <div id="${id}-tint" style="position:absolute;inset:0;background:#B08850;mix-blend-mode:color;opacity:0.7"></div>
  <img id="${id}-arrow" src="${P}/jojo-arrow.png" style="position:absolute;left:60px;top:572px;width:838px;height:198px" alt="" />
</div>`;
const JOJO_JS = (id, start) => `  tl.fromTo("#${id}-tint", { opacity: 0 }, { opacity: 0.7, duration: 0.15, ease: "power1.out" }, ${start});
  tl.fromTo("#${id}-arrow", { x: 1900 }, { x: 0, duration: 0.2, ease: "power2.out" }, ${start});`;
const FLAG = (id) => `<img src="${S}/flag.svg" style="left:58px;top:78px;width:24px;height:28px" alt="" />
<div class="px" style="left:58px;top:110px;width:78px;height:14px;background:#2C3458"></div>
<div id="${id}-tag" class="t outline" style="left:61px;top:110px;line-height:14px">今天走到這裡</div>`;

// ── 第 1 集結尾：Clawd 進化成 Clawd 小隊（像遊戲的進化畫面：白色剪影越閃越快）──
CUR = "evo1";
{
  const [a, b] = FORMS;
  const img = (id, f, sil) =>
    `<img id="${id}" src="${S}/${f.front}" style="left:${160 - f.w}px;top:${112 - f.h * 2}px;width:${f.w * 2}px;height:${f.h * 2}px${sil ? ";filter:brightness(0) invert(1)" : ""};opacity:${id === "evo1-a" ? 1 : 0}" alt="" />`;
  // 剪影切換的間隔越來越短
  const gaps = [0.36, 0.3, 0.26, 0.22, 0.18, 0.15, 0.12, 0.1, 0.08, 0.08, 0.06, 0.06];
  let t = 1.1;
  let js = `  tl.set("#evo1-a", { opacity: 0 }, 1.0);\n  tl.set("#evo1-as", { opacity: 1 }, 1.0);\n`;
  gaps.forEach((g, n) => {
    const big = n % 2 === 0;
    js += `  tl.set("#evo1-as", { opacity: ${big ? 0 : 1} }, ${r(t)});\n  tl.set("#evo1-bs", { opacity: ${big ? 1 : 0} }, ${r(t)});\n`;
    t += g;
  });
  js += `  tl.set("#evo1-as", { opacity: 0 }, ${r(t)});\n  tl.set("#evo1-bs", { opacity: 1 }, ${r(t)});
  tl.fromTo("#evo1-flash", { opacity: 1 }, { opacity: 0, duration: 0.5, ease: "power2.out", immediateRender: false }, ${r(t + 0.15)});
  tl.set("#evo1-bs", { opacity: 0 }, ${r(t + 0.15)});
  tl.set("#evo1-b", { opacity: 1 }, ${r(t + 0.15)});
  tl.fromTo("#evo1-glow", { opacity: 0 }, { opacity: 0.8, duration: 0.6, ease: "power1.in" }, 0.8);\n`;
  // 進化完成：一圈星星閃光
  const STARS = [[96, 30], [224, 30], [80, 72], [240, 72], [112, 104], [208, 104], [160, 18]];
  js += STARS.map((_, n) => `  tl.fromTo("#evo1-s${n}", { opacity: 0 }, { opacity: 1, duration: 0.1, ease: "steps(1)", yoyo: true, repeat: 5, immediateRender: false }, ${r(t + 0.2 + n * 0.05)});`).join("\n") + "\n";
  const evoStars = STARS.map(([x, y], n) => `<div id="evo1-s${n}" class="t outline" style="left:${x}px;top:${y}px;color:#F8E070;opacity:0">✦</div>`).join("\n");
  const evoDone = t + 0.15;
  scene(
    "evo1",
    `<div class="px" style="left:0;top:0;width:320px;height:180px;background:#141424"></div>
<div id="evo1-glow" class="px" style="left:90px;top:16px;width:140px;height:110px;border-radius:50%;background:#3A3A70;opacity:0"></div>
${img("evo1-a", a, false)}
${img("evo1-as", a, true)}
${img("evo1-bs", b, true)}
${img("evo1-b", b, false)}
${evoStars}
${BOX}
${msg("evo1-m1", 0.2, 3.2, ['咦？<span class="hl">Clawd</span> 的樣子……'])}
${msg("evo1-m2", 3.5, 2.0, ['恭喜！<span class="hl">Clawd</span> 進化成了', '<span class="hl">Clawd 小隊</span>！'])}
<div id="evo1-flash" class="layer" style="background:#fff;opacity:0"></div>
<div id="evo1-fade" class="layer" style="background:#000"></div>`,
    `  tl.fromTo("#evo1-fade", { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "steps(3)" }, 0);\n${js}`,
  );
  audioCues.push([CUR, "evo1-sfx", "assets/sfx/evolve.wav", AT.evo1.start + 1.0, 2.4, 0.5]);
  audioCues.push([CUR, "evo1-done", "assets/sfx/levelup.wav", AT.evo1.start + evoDone, 0.8, 0.4]);
}

// ── 每集結尾：Clawd 升級，列出這集學會的招式 ─────────────────
TRAINERS.forEach((tr, i) => {
  const id = `learn${i + 1}`;
  CUR = id;
  const ROW0 = 30;
  const f = FORMS[1]; // 第 1 集已在前一段進化，兩集的結尾都是 Clawd 小隊
  const evolved = i === 0; // 第 1 集：進化畫面已經升過級，這裡直接列招式
  const rowAt = (j) => (evolved ? 0.4 + j * 0.4 : 1.6 + j * 0.55);
  // 招式少時名稱與說明分兩行（長名稱如 dev-workflow-tdd 才放得下）；多時一行一招
  const twoLine = tr.learned.length <= 3;
  const rows = tr.learned
    .map(([mv, desc], j) => {
      const y = twoLine ? ROW0 + j * 31 : ROW0 + j * 19;
      return `<div id="${id}-r${j}" class="layer" style="opacity:0">
  <div class="t gtx" style="left:122px;top:${y}px">▸</div>
  <div class="t hl" style="left:132px;top:${y}px">${mv}</div>
  <div class="t gtx" style="left:${twoLine ? 144 : 238}px;top:${twoLine ? y + 14 : y}px">${desc}</div>
</div>`;
    })
    .join("\n");
  scene(
    id,
    `<div class="px" style="left:0;top:0;width:320px;height:180px;background:#A8D0F0"></div>
<div class="px" style="left:0;top:0;width:320px;height:20px;background:#3068B8"></div>
<div class="t outline" style="left:8px;top:3px">${f.name} 學會的招式</div>
<div class="px" style="left:8px;top:26px;width:100px;height:98px;background:#F8F8F8;box-shadow:0 0 0 2px #485868"></div>
<div class="px" style="left:116px;top:26px;width:198px;height:98px;background:#F8F8F8;box-shadow:0 0 0 2px #485868"></div>
<img id="${id}-clawd" src="${S}/${f.front}" style="left:${58 - f.w * 0.68}px;top:${92 - f.h * 1.36}px;width:${r(f.w * 1.36)}px;height:${r(f.h * 1.36)}px;transform-origin:50% 100%" alt="" />
<div id="${id}-flash" class="px" style="left:18px;top:30px;width:80px;height:64px;border-radius:50%;background:#FFF8C0;opacity:0"></div>
<div id="${id}-lv0" class="t gtx" style="left:42px;top:100px${evolved ? ";opacity:0" : ""}">Lv.${i + 1}</div>
<div id="${id}-lv1" class="t hl" style="left:42px;top:100px${evolved ? "" : ";opacity:0"}">Lv.${i + 2}</div>
${rows}
${BOX}
${msg(`${id}-m1`, 0.3, AT[id].dur - 0.3, evolved ? [`這集學會了 ${tr.learned.length} 個招式`] : [`<span class="hl">${f.name}</span> 升到 Lv.${i + 2} 了！`, `這集學會了 ${tr.learned.length} 個招式`])}
<div id="${id}-fade" class="layer" style="background:#fff"></div>`,
    `  tl.fromTo("#${id}-fade", { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "steps(3)" }, 0);
${evolved ? "" : `  tl.fromTo("#${id}-flash", { opacity: 0 }, { opacity: 0.9, duration: 0.08, ease: "steps(1)", yoyo: true, repeat: 3 }, 0.9);
  tl.fromTo("#${id}-clawd", { y: 0 }, { y: -6, duration: 0.12, ease: "steps(2)", yoyo: true, repeat: 3, snap: "y" }, 0.9);
  tl.set("#${id}-lv0", { opacity: 0 }, 1.1);
  tl.set("#${id}-lv1", { opacity: 1 }, 1.1);`}
${tr.learned.map((_, j) => `  tl.fromTo("#${id}-r${j}", { opacity: 0, x: 6 }, { opacity: 1, x: 0, duration: 0.15, ease: "steps(3)", snap: "x" }, ${r(rowAt(j))});`).join("\n")}`,
  );
  if (!evolved) audioCues.push([CUR, `lvup-${id}`, "assets/sfx/levelup.wav", AT[id].start + 0.9, 0.8, 0.6]);
  tr.learned.forEach((_, j) => audioCues.push([CUR, `row-${id}-${j}`, "assets/sfx/select.wav", AT[id].start + rowAt(j), 0.1, 0.5]));
});

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
<div id="recap2-arrow" class="t" style="left:107px;top:2px;color:#F8D030;text-shadow:1px 0 #383838, -1px 0 #383838, 0 1px #383838, 0 -1px #383838, 1px 1px #383838">▼</div>
${HALL_CLAWD("recap2-clawd", 3, FORMS[1])}
${msg("recap2-m1", 0.4, 3.9, ['上一集：打贏花月，走到了 <span class="hl">Step 2</span>', '這次的目標：走到 <span class="hl">Step 3</span>'])}
<div id="recap2-fade" class="layer" style="background:#000"></div>
${WIPE("recap2-wipe", 4.3, 0.7)}`,
  `  tl.fromTo("#recap2-fade", { opacity: 1 }, { opacity: 0, duration: 0.4, ease: "steps(4)" }, 0);
  playSheet($("#recap2-clawd"), 2, 2.5, ${FORMS[1].w}, 0, 5);
  tl.fromTo("#recap2-arrow", { y: 0 }, { y: 2, duration: 0.25, ease: "steps(1)", yoyo: true, repeat: 15 }, 0.6);
${WIPE_JS("recap2-wipe", 4.3)}`,
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
${HALL_CLAWD("tbc-clawd", 4, FORMS[1])}
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
  `  playSheet($("#tbc-clawd"), 2, 2.5, ${FORMS[1].w}, 0, 1.8);
  tl.fromTo("#tbc-door-l", { scaleX: 1 }, { scaleX: 0, duration: 0.8, ease: "steps(8)" }, 0.4);
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
audioCues.push([CUR, "tbc-rumble", "assets/sfx/rumble.wav", AT.tbc.start + 0.1, 2.2, 0.5]); // 門打開前墊一點低沉的聲音
audioCues.push([CUR, "tbc-thunder1", "assets/sfx/thunder.wav", AT.tbc.start + 1.8, 2.2, 0.9]);
audioCues.push([CUR, "tbc-boom", "assets/sfx/boom.wav", AT.tbc.start + 1.9, 2.5, 0.9]);
audioCues.push([CUR, "tbc-cry", `${P}/rayquaza-cry.mp3`, AT.tbc.start + 2.9, 1.6, 0.8]);
audioCues.push([CUR, "tbc-thunder2", "assets/sfx/thunder.wav", AT.tbc.start + 4.4, 2.2, 0.45]);

// ── 配樂（每集各自的時間）──────────────────────────────────
const MUSIC = {
  ep1: [
    ["bgm-oak", `${P}/bgm-oak.mp3`, 0, AT.vs1.start, 0.55, 1.0],
    ["bgm-keyitem", `${P}/bgm-key-item.mp3`, AT.lab.start + 1.2, 3.4, 0.8, 0],
    ["bgm-battle", `${P}/bgm-battle.mp3`, AT.vs1.start, BOSS_AT.bat1 - AT.vs1.start, 0.5, 0.3],
    ["bgm-boss", `${P}/bgm-boss.mp3`, BOSS_AT.bat1, AT.win1.start - BOSS_AT.bat1, 0.5, 0.4],
    ["bgm-victory", `${P}/bgm-victory.mp3`, AT.win1.start, AT.win1.dur, 0.55, 0.8],
    ["bgm-evolved", `${P}/bgm-key-item.mp3`, AT.evo1.start + 3.5, 3.4, 0.8, 0],
    // 進化的音樂結束後，接回勝利配樂到預告前，避免整段安靜
    ["bgm-victory2", `${P}/bgm-victory.mp3`, AT.evo1.start + 6.8, AT.tease1.start - AT.evo1.start - 6.8, 0.45, 1.0],
    ["bgm-jojo", `${P}/jojo-roundabout.mp3`, AT.tease1.start + 3.6 - 3.6, AT.tease1.dur, 0.55, 0.8],
  ],
  ep2: [
    ["bgm-oak", `${P}/bgm-oak.mp3`, 0, AT.vs2.start, 0.45, 0.8],
    ["bgm-battle", `${P}/bgm-battle.mp3`, AT.vs2.start, BOSS_AT.bat2 - AT.vs2.start, 0.5, 0.3],
    ["bgm-boss", `${P}/bgm-boss.mp3`, BOSS_AT.bat2, AT.win2.start - BOSS_AT.bat2, 0.5, 0.4],
    ["bgm-victory", `${P}/bgm-victory.mp3`, AT.win2.start, AT.win2.dur + AT.learn2.dur, 0.55, 1.0],
    ["bgm-jojo", `${P}/jojo-roundabout.mp3`, AT.tbc.start + 5.8 - 3.6, AT.tbc.dur - 2.2, 0.55, 0.8],
  ],
};

// ── 混音：依每個檔案實測的平均音量（ffmpeg volumedetect）換算，
// 讓配樂約 -24 dB、提示音效壓在配樂底下、打擊和叫聲略高一點 ──
const MIX = {
  "blip.wav": 0.12, "select.wav": 0.16, "bump.wav": 0.22, "faint.wav": 0.19, "throw.wav": 0.45,
  "hit.wav": 0.8, "crit.wav": 0.35, "hypnosis.wav": 0.5, "levelup.wav": 0.4,
  "thunder.wav": 0.3, "boom.wav": 0.35, "rayquaza-cry.mp3": 0.4, "rumble.wav": 0.5, "evolve.wav": 0.5,
};
const mixVolume = (src, v) => MIX[src.split("/").pop()] ?? (src.endsWith("-cry.mp3") ? 0.32 : v);

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
      .map(([, id, src, s, d, v]) => `<audio id="${id}" src="${src}" data-start="${r(s)}" data-duration="${r(d)}" data-volume="${mixVolume(src, v)}"></audio>`),
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

// 產生影片用的像素圖（SVG）。用法：node scripts/build-sprites.mjs
// Clawd 的造型取自 Claude Code 程式碼裡歡迎畫面的 11×8 定義（身體 rgb(215,119,87)、黑色眼睛），
// 動作與寶可夢圖風的外框、明暗是延伸繪製的。精靈球屬於寶可夢的設計，輸出到不進 git 的 assets/pokemon/。
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "assets/sprites");
const POKE = join(root, "assets/pokemon");
mkdirSync(OUT, { recursive: true });
mkdirSync(POKE, { recursive: true });

// 由像素格（字串陣列）與調色盤輸出 SVG；相鄰同色像素合併成一個 rect
function svg(rows, pal) {
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  let body = "";
  rows.forEach((r, y) => {
    let x = 0;
    while (x < r.length) {
      const c = r[x];
      let run = 1;
      while (x + run < r.length && r[x + run] === c) run++;
      if (pal[c]) body += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${pal[c]}"/>`;
      x += run;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${body}</svg>\n`;
}
function save(dir, name, rows, pal) {
  writeFileSync(join(dir, name), svg(rows, pal));
  console.log(`${name}: ${rows[0].length}×${rows.length}`);
}

// ── Clawd ───────────────────────────────────────────────
// Claude Code 歡迎畫面：" █████████ " / "██▄█████▄██" / " █████████ " / " █ █   █ █"
const CLAWD = [".XXXXXXXXX.", ".XXXXXXXXX.", "XXEXXXXXEXX", "XXXXXXXXXXX", ".XXXXXXXXX.", ".XXXXXXXXX.", ".X.X...X.X.", ".X.X...X.X."];
const lookRight = (rows) => rows.map((r, i) => (i === 2 ? "XXXEXXXXXEX" : r));

// 對戰用：放大 3 倍，削圓外角，加外框、明暗與眼睛反光；bob=1 時身體下沉 1 格（腳不動）；closed=true 時閉眼（一條橫線）
function clawdBattle(bob, closed = false) {
  const base = lookRight(CLAWD);
  const k = 3, W = 11 * k + 2, H = 8 * k + 3;
  const grid = Array.from({ length: H }, () => Array(W).fill("."));
  const legTop = 6 * k;
  base.forEach((r, y) => [...r].forEach((c, x) => {
    if (c === ".") return;
    for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) {
      const yy = y * k + dy;
      const shift = yy < legTop ? bob : 0;
      const eye = closed ? (dy === 1 ? "e" : "b") : dx === 0 && dy === 0 ? "s" : "e";
      const val = c === "E" ? eye : yy >= legTop ? "l" : "b";
      grid[2 + yy + shift][1 + x * k + dx] = val;
    }
  }));
  if (bob) for (let x = 0; x < W; x++) if (grid[2 + legTop][x] === "." && grid[1 + legTop][x] === "b" && grid[3 + legTop][x] === "l") grid[2 + legTop][x] = "l";
  const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && grid[y][x] !== "." && grid[y][x] !== "o";
  const cut = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!on(x, y)) continue;
    const n = !on(x, y - 1), s = !on(x, y + 1), w = !on(x - 1, y), e = !on(x + 1, y);
    if ((n && w) || (n && e) || (s && w) || (s && e)) cut.push([x, y]);
  }
  cut.forEach(([x, y]) => (grid[y][x] = "."));
  const out = grid.map((r) => r.slice());
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = grid[y][x];
    if (c === ".") {
      if (on(x, y - 1) || on(x, y + 1) || on(x - 1, y) || on(x + 1, y)) out[y][x] = "o";
      continue;
    }
    if (c !== "b" && c !== "l") continue;
    const top = !on(x, y - 1) || !on(x - 1, y);
    const bottom = !on(x, y + 1) || !on(x + 1, y);
    if (c === "b") out[y][x] = bottom ? "d" : top ? "h" : y >= 2 + bob + 4 * k ? "m" : "b";
    else out[y][x] = bottom ? "d" : top ? "L" : "l";
  }
  return out.map((r) => r.join(""));
}
const CLAWD_PAL = {
  b: "#D77757", h: "#EE9C80", m: "#C86548", d: "#A84E36", l: "#B4583D", L: "#C86A4E",
  e: "#000000", s: "#FFFFFF", o: "#5A2416",
};
// 多格動作橫向排成逐格圖（每格等寬）
const sheet = (frames) => frames[0].map((_, y) => frames.map((f) => f[y]).join(""));
save(OUT, "clawd-battle-sheet.svg", sheet([clawdBattle(0), clawdBattle(1)]), CLAWD_PAL);
save(OUT, "clawd-front.svg", clawdBattle(0), CLAWD_PAL);
save(OUT, "clawd-sleep.svg", clawdBattle(0, true), CLAWD_PAL);

// 地圖用：原尺寸加外框，兩格走路動作
function withOutline(rows) {
  const w = rows[0].length + 2;
  const g = [".".repeat(w), ...rows.map((r) => "." + r + "."), ".".repeat(w)].map((r) => [...r]);
  const on = (x, y) => g[y]?.[x] && !".o".includes(g[y][x]);
  const out = g.map((r) => r.slice());
  for (let y = 0; y < g.length; y++) for (let x = 0; x < w; x++)
    if (g[y][x] === "." && (on(x, y - 1) || on(x, y + 1) || on(x - 1, y) || on(x + 1, y))) out[y][x] = "o";
  return out.map((r) => r.join(""));
}
const walkA = lookRight(CLAWD);
const walkB = walkA.map((r, i) => (i === 7 ? "...X.....X." : r));
const WALK_PAL = { X: "#D77757", E: "#000000", o: "#5A2416" };
save(OUT, "clawd-walk-sheet.svg", sheet([withOutline(walkA), withOutline(walkB)]), WALK_PAL);

// ── 地圖 ────────────────────────────────────────────────
save(OUT, "tree.svg", [
  ".....KKKKKK.....",
  "...KKGGLLGGKK...",
  "..KGGLLLLGGGgK..",
  ".KGGLLLGGGGGggK.",
  ".KGLLGGGGGGGggK.",
  "KGGGGGGGLLGGgggK",
  "KGGGGGGLLLGGgggK",
  "KGgGGGGGGGGggggK",
  "KGggGGGGGGgggggK",
  ".KgggGGGGgggggK.",
  ".KggggggggggggK.",
  "..KKggggggggKK..",
  "....KKKKKKKK....",
  "......KTtK......",
  "......KTtK......",
  ".....KKTtKK.....",
], { K: "#1E3A1E", G: "#4CA64C", g: "#2F7A34", L: "#86D46E", T: "#8A6238", t: "#5E4024" });

save(OUT, "grass.svg", [
  "GGGGGGGG",
  "GGGGGlGG",
  "GGGGGGGG",
  "GGlGGGGG",
  "GGGGGGGG",
  "GGGGGGlG",
  "GlGGGGGG",
  "GGGGGGGG",
], { G: "#88C870", l: "#A0D888" });

save(OUT, "tallgrass.svg", [
  "...D.......D....",
  "..DMD.....DMD...",
  ".DMlMD...DMlMD..",
  ".DMlMD.D.DMlMD.D",
  "DMMlMMDMDMMlMMDM",
  "DMlMMlMMMMlMMlMM",
  "MMlMMlMlMMlMMlMl",
  "MMMMMMMMMMMMMMMM",
  "DMMMDMMMDMMMDMMM",
  "DDMDDDMDDDMDDDMD",
], { D: "#2E7D32", M: "#43A047", l: "#7CCB5B" });

save(OUT, "flag.svg", [
  "KK..........",
  "KKKKKKKK....",
  "KKYYYYYYKK..",
  "KKYYYYYYYYK.",
  "KKYYYYYYKK..",
  "KKKKKKKK....",
  "KK..........",
  "KK..........",
  "KK..........",
  "KK..........",
  "KK..........",
  "KK..........",
  "KK..........",
  "KK..........",
], { K: "#3A2A1A", Y: "#F8D030" });

// 對戰台座：像素橢圓，上面亮、邊緣暗
function base(w, h) {
  const rows = [];
  for (let y = 0; y < h; y++) {
    const dy = (y + 0.5 - h / 2) / (h / 2);
    const half = Math.round((w / 2) * Math.sqrt(Math.max(0, 1 - dy * dy)));
    const pad = w / 2 - half;
    const fill = y >= h - 3 ? "d" : y <= 2 ? "h" : "g";
    let r = ".".repeat(pad) + fill.repeat(half * 2) + ".".repeat(pad);
    if (half > 0) r = r.slice(0, pad) + "d" + r.slice(pad + 1, w - pad - 1) + "d" + r.slice(w - pad);
    rows.push(r);
  }
  return rows;
}
const BASE_PAL = { g: "#8CC86C", h: "#A8DC88", d: "#5E9A48" };
save(OUT, "base-foe.svg", base(112, 22), BASE_PAL);
save(OUT, "base-player.svg", base(140, 26), BASE_PAL);

// ── 精靈球（寶可夢的設計，不進 git）─────────────────────
save(POKE, "pokeball.svg", [
  "....KKKK....",
  "..KKRRRRKK..",
  ".KRHRRRRRrK.",
  ".KRRRRRRRrK.",
  "KRRRRKKRRRrK",
  "KKKKKWWKKKKK",
  "KWWWKWWKWWwK",
  "KWWWWKKWWWwK",
  ".KWWWWWWWwK.",
  ".KWWWWWWwwK.",
  "..KKwwwwKK..",
  "....KKKK....",
], { K: "#202020", R: "#E83030", r: "#B01818", H: "#F89090", W: "#F8F8F8", w: "#C8C8C8" });

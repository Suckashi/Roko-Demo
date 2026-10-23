// 把 design/ 的風格圖去掉角色與文字，輸出成原生 320×180 的背景圖（assets/pokemon/bg-*.png，不進 git）。
// 用法：node scripts/bake-backgrounds.mjs <playwright-core 所在資料夾>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { chromium } = createRequire(join(process.argv[2], "x.js"))("playwright-core");
const tmp = join(root, ".hyperframes/bake");
mkdirSync(tmp, { recursive: true });

const hideText = "color: transparent !important; text-shadow: none !important;";
const jobs = {
  // 人物（大木博士、小智）另外放成會動的角色，背景只留場景
  oak: { src: "f1-oak.html", css: 'img[src*="trainer-"], .msgbox .lines {display:none}' },
  lab: {
    src: "f2-starter.html",
    css: `img[src*="clawd-front"], div[style*="pokeball"], svg[style*="left:106px"], svg[style*="left:127px"],
          svg[style*="left:197px"], svg[style*="left:123px"], svg[style*="left:199px"], img[src*="trainer-"], .msgbox .lines {display:none}`,
  },
  hall: {
    src: "f3-league.html",
    css: 'img[src*="flag"], .tag, .clawd, .msgbox .lines {display:none} .stage {background:#CEC8E2}',
    replace: [[">Step 1<", ">Step 2<"], [">Step 2<", ">Step 3<"], [">Step 3<", ">Step 4<"]],
  },
  vs: {
    src: "f4-vs.html",
    css: `img[src*="bw-97"], img[src*="clawd-front"] {display:none}
          .plate[style*="left:198px"] .tag, .plate[style*="left:198px"] .big, .strip, .strip * {${hideText}}`,
  },
  battle: { src: "f5-battle.html", css: 'img[src*="bw-97"], img[src*="clawd-front"], .hpbox, .msgbox > * {display:none}' },
};

const browser = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
for (const [name, job] of Object.entries(jobs)) {
  let html = readFileSync(join(root, "design", job.src), "utf8");
  // 門牌由右往左換，避免連鎖替換（Step 1→2→3）
  for (const [a, b] of [...(job.replace || [])].reverse()) html = html.split(a).join(b);
  if (name === "hall") html = html.replace('left:245px;top:31px;width:46px">Step 4', 'left:245px;top:31px;width:46px">冠軍');
  // 暫存檔放在 .hyperframes/bake，用 <base> 讓 design/ 裡的相對路徑（common.css、../assets/）照樣找得到
  html = html.replace("<head>", `<head><base href="file://${join(root, "design")}/">`);
  html = html.replace("</head>", `<style>${job.css}</style></head>`);
  const file = join(tmp, `${name}.html`);
  writeFileSync(file, html);
  await page.goto("file://" + file);
  await page.evaluate(() => document.fonts.ready);
  // 大廳：拿掉原本「今天走到這裡」的深色底框（畫在 SVG 裡）
  if (name === "hall")
    await page.evaluate(() => {
      for (const r of document.querySelectorAll("rect")) {
        const x = +r.getAttribute("x"), y = +r.getAttribute("y"), f = (r.getAttribute("fill") || "").toUpperCase();
        if (x >= 100 && x <= 175 && y >= 110 && y <= 126 && ["#181C30", "#6870A8", "#2C3458"].includes(f)) r.remove();
      }
      // 從右邊同一排複製地磚，補上拿掉底框後的空洞
      const svg = document.querySelector("svg");
      for (const r of [...svg.querySelectorAll("rect")]) {
        const x = +r.getAttribute("x"), y = +r.getAttribute("y"), w = +r.getAttribute("width");
        if (y >= 108 && y <= 127 && x >= 180 && x + w <= 260) {
          const c = r.cloneNode();
          c.setAttribute("x", x - 80);
          svg.insertBefore(c, svg.firstChild.nextSibling);
        }
      }
    });
  await page.waitForTimeout(300);
  const big = join(tmp, `${name}-1920.png`);
  await page.screenshot({ path: big });
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", big, "-vf", "scale=320:180:flags=neighbor", join(root, "assets/pokemon", `bg-${name}.png`)]);
  console.log(`bg-${name}.png`);
}
await browser.close();

// 芙蓉（幽靈系）的對戰場地：同一張草地，上半部調暗、偏紫；下方訊息框不動
const battle = join(root, "assets/pokemon/bg-battle.png");
execFileSync("ffmpeg", [
  "-v", "error", "-y", "-i", battle, "-filter_complex",
  "[0]split[a][b];[a]crop=320:129:0:0,hue=h=150:s=0.55,eq=brightness=-0.22[t];[b][t]overlay=0:0",
  join(root, "assets/pokemon/bg-battle-ghost.png"),
]);
console.log("bg-battle-ghost.png");

// 拍簡報 p.6 的開場／結尾畫面，並量出架構圖的位置與每個字的範圍。
// 用法：node scripts/capture-slide.mjs <playwright-core 所在資料夾>
// 例如：node scripts/capture-slide.mjs /opt/node-tools/node_modules
// 會產生：
//   assets/plates/slide-full.png  投影片原樣（ocean 配色）
//   assets/plates/slide-bare.png  同一頁，但架構圖的 SVG 藏起來（外框還在）
//   scripts/slide-measure.json    SVG 位置、每段文字逐字的範圍（SVG 座標）
// 字型一律用 assets/fonts 的檔案，影片與截圖才會一模一樣。
import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DECK = resolve(ROOT, "../../../docs/workshop/agentic-sdlc-workshop.html");
const pwDir = process.argv[2];
if (!pwDir) throw new Error("請傳入 playwright-core 所在的 node_modules 資料夾");
const { chromium } = createRequire(resolve(pwDir, "x.js"))("playwright-core");
const executablePath = process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const face = (family, file, weight) =>
  `@font-face{font-family:"${family}";src:url("file://${ROOT}/assets/fonts/${file}") format("woff2");font-weight:${weight};font-display:block}`;
const FONTS = [400, 500, 600, 700, 800]
  .map((w) => face("Inter", `Inter-${w}.woff2`, w) + face("Noto Sans TC", `NotoSansTC-${w}.woff2`, w))
  .join("\n");

const browser = await chromium.launch({ executablePath, args: ["--allow-file-access-from-files"] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
// 不讓頁面去抓 Google Fonts，只用本機的同一份字型
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await page.addInitScript(() => localStorage.setItem("workshop-theme", "ocean"));
await page.goto(`file://${DECK}#harness`);
await page.addStyleTag({ content: FONTS });
await page.evaluate(async () => {
  await Promise.all([...document.fonts].map((f) => f.load().catch(() => null)));
  await document.fonts.ready;
});
await page.waitForTimeout(1500);

const measure = await page.evaluate(() => {
  const sec = document.querySelector("#harness");
  const svg = sec.querySelector("svg");
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  };
  const texts = [...svg.querySelectorAll("text")].map((t) => {
    const s = t.textContent;
    const chars = [];
    for (let i = 0; i < s.length; i++) {
      const e = t.getExtentOfChar(i);
      chars.push([+e.x.toFixed(2), +e.y.toFixed(2), +e.width.toFixed(2), +e.height.toFixed(2)]);
    }
    return { text: s, chars };
  });
  const fonts = [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family} ${f.weight}`);
  return {
    theme: localStorage.getItem("workshop-theme"),
    svg: box(svg),
    frame: box(sec.querySelector(".archify-slide-map")),
    fonts: [...new Set(fonts)],
    texts,
  };
});

mkdirSync(resolve(ROOT, "assets/plates"), { recursive: true });
await page.screenshot({ path: resolve(ROOT, "assets/plates/slide-full.png") });
await page.addStyleTag({ content: "#harness svg{visibility:hidden}" });
await page.waitForTimeout(200);
await page.screenshot({ path: resolve(ROOT, "assets/plates/slide-bare.png") });
writeFileSync(resolve(ROOT, "scripts/slide-measure.json"), JSON.stringify(measure, null, 1) + "\n");
console.log(JSON.stringify({ theme: measure.theme, svg: measure.svg, frame: measure.frame, fonts: measure.fonts }));
await browser.close();

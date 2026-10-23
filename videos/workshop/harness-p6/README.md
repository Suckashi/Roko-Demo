# 簡報 p.6 講解影片：一段工作，需要哪些部分一起合作

搭配工作坊簡報 p.6（`docs/workshop/agentic-sdlc-workshop.html` 的 `<section id="harness">`）。約 59 秒，無旁白、無配樂，只有輕音效，講者可以邊播邊講。

影片從 p.6 原頁開始，推近到架構圖，照圖講解，最後拉回投影片原畫面，所以可以在 p.6 直接全螢幕播放，播完切回投影片不會跳。

## 內容

| 時間 | 講什麼 | 字幕 |
| --- | --- | --- |
| 0–3 秒 | 從投影片推近架構圖 | |
| 3–8.5 秒 | 只剩 Model：它回了一行字，但什麼事都沒發生 | Model 只會回文字 |
| 8.5–15 秒 | 其他格接回來；公式分三拍閃：Agent（Model＋六格）→ Model → Harness（六格） | Agent = Model + Harness |
| 15–18 秒 | ① 委派任務 | 1 · 委派任務 |
| 18–22.5 秒 | Skills、Repo Knowledge 送進 Runtime | 流程指引／業務依據 |
| 23–26 秒 | ② Runtime ↔ Model | Model 負責推理 |
| 26–30 秒 | ③④ 工具呼叫、讀寫環境，沿虛線帶回結果 | Harness 負責執行工具、帶回結果 |
| 31–36 秒 | ⑤⑥ Sensors 跑檢查：Lint、Build 綠，Test 紅，回饋給 Runtime | 5 · 跑檢查／6 · 驗證回饋 |
| 36–42 秒 | Model 判斷後，從「3 · 工具呼叫」再跑一輪，Test 轉綠 | 未通過就修正後／再從工具呼叫跑一輪 |
| 43–47 秒 | 需要人判斷時回頭問 Human（不新增箭頭） | 需要人判斷時回頭向 Human 提問 |
| 47–51.5 秒 | Guardrails 擋下一次工具呼叫 | 限制操作 |
| 52–56 秒 | Skills、Repo Knowledge、Sensors 一起亮 | 完成一段工作，還要接上專案知識與驗證 |
| 56–59 秒 | 拉回投影片原畫面，停 1.2 秒 | |

字幕幾乎都是簡報副標或架構圖 desc 的原文；自己寫的只有「Model 只會回文字」。

## 重新產生影片

架構圖、文字與箭頭都在產生時從簡報讀出來，簡報改了 p.6 就重跑這三步：

```bash
bash scripts/fetch-fonts.sh                                   # Noto Sans TC、Inter 子集（OFL-1.1）；改了字幕也要重跑
node scripts/capture-slide.mjs /opt/node-tools/node_modules   # 傳入 playwright-core 所在資料夾；拍開場／結尾截圖、量每個字的位置
node scripts/build-p6.mjs                                     # 產生 index.html 與 compositions/
npx hyperframes check
npx hyperframes render --quality delivery --output renders/harness-p6.mp4
```

- 截圖用 ocean 配色、1920×1080。現場如果換了配色或解析度，開頭與結尾那一格會和投影片有落差。
- 要改字幕、時間或音效，改 `scripts/build-p6.mjs` 第 5 節「分鏡」；字幕的字也要加進 `scripts/captions.txt` 再重跑 `fetch-fonts.sh`。
- 時間軸工具會記住每個屬性目前的值，同一個屬性的動畫重疊時，產生就會失敗並說明是哪一個。
- 音效來自 Pixabay（見 `assets/sfx/CREDITS.md`）；字型授權見 `assets/fonts/OFL-*.txt`。

# Agentic SDLC Workshop：影片規劃

原則：**投影片完全不動**，影片是額外加的，用來試效果；每支都能單獨看懂，可以在講到對應頁面時另外播放。
以下事實多數來自二手整理文章，標 ⚠️ 的是來源之間說法不一致或沒有被獨立查證的，放進影片前要再對一次原始資料。

---

## V1「五個台階，卡點一直在移動」：搭配 p.4

**影片補上的內容**
- Boris Cherny（Claude Code 負責人）2026 年 7 月 16 日發表 Steps of AI Adoption，共五階；投影片略過的 **Step 0 · Gated（0 個 Agent）**：卡在組織，例如舊的審批流程、只盯每個 token 的成本而不看成果。
- 每一階「卡在哪」的具體樣子：
  - Step 1（約 1 個）：Agent 不會自己驗證，人只好每一行都讀、盯著它跑。
  - Step 2（約 10 個）：每個 Agent 拿到範圍明確的任務和獨立的工作目錄；卡點移到 Review，十個 Agent 做完的速度比一個人看懂的速度快。
  - Step 3（約 100 個）：Agent 分派給 Agent，人監督結果、成本、優先順序和例外；卡在對迴圈的信任與做決定的速度。
  - Step 4（1,000+ 個）：人用意圖定方向，大部分迴圈由 Agent 自己啟動，只處理例外。
- Cherny 的提醒：沒有唯一正確的路徑，每一階都要找出自己的卡點再拆掉。
- ⚠️ 據報導 Anthropic 自評在 Step 3、Cherny 個人在 Step 4；Agent 數量是約略的量級，不是門檻。

**怎麼拍**：一路往外拉遠。開場是一個人盯著一個 Agent，每拉遠一次 Agent 數量跳一級；畫面上的「瓶頸」是一個實體的窄口，每一階都移到新的位置（注意力 → Review → 信任 → 邊界）。最後停在 Step 2，標上「今天走到這裡」。
**長度**：約 60 秒

## V2「Agent = Model + Harness」：搭配 p.6

**影片補上的內容**
- 「Harness engineering」這套說法在 2026 年初成形；⚠️ 誰先提出有爭議（Mitchell Hashimoto 或 LangChain 的 Vivek Trivedy）。
- Harness 的兩種控制：**Guides** 在行動前引導（Skills、AGENTS.md、Repo 知識）；**Sensors** 在行動後觀察，讓 Agent 自我修正。兩者都可以是確定性的（Lint、Test、型別檢查）或推論式的（LLM 當評審）。
- 為什麼兩者都要：只有 Sensors，會一直重犯同樣的錯；只有 Guides，永遠不知道規則有沒有用。
- Guardrails：權限、政策、審批與監控，限制 Tools 能做什麼。

**怎麼拍**：機器本身就是解說。一個真實任務（Task A 的 TSMC Week 工具）在 Human → Runtime → Model → Tools → Sensors 之間繞圈：第一圈 Lint 亮紅燈、退回重跑，第二圈全綠；中途遇到需要人決定的規則，回頭問 Human。Guides 從上方注入、Sensors 從下方回饋，兩條路徑用不同顏色。
**長度**：60–75 秒

## V3「兩個 Agent，一個目錄」：搭配 p.10

**影片補上的內容**
- Worktree 共用同一份 `.git` 物件資料庫，各自有自己的檔案和 Branch，不用重新 clone。
- Worktree 是 Git 本身的功能，任何 Agent 都能用：`git worktree add -b feature/a ../project-a main`。
- ⚠️ Claude Code 已內建 `--worktree` 旗標，子代理可在 frontmatter 設 `isolation: worktree`（二手來源說是 2026 年 2 月、v2.1.49–2.1.50 加入，要對照官方文件）。

**怎麼拍**：先演沒有它的樣子。兩個 Agent 在同一個資料夾裡改同一個檔案，存檔互相蓋掉、測試一紅一綠交替閃；接著打出一行 `git worktree add`，畫面一分為二，project-a 和 project-b 各自變綠、各開一份 PR。
**長度**：約 45 秒

## V4「CI 全綠，不代表可以合併」：搭配附錄 p.22–24

**影片補上的內容**
- 出處：Matt Pocock〈Fixing the PR Bottleneck〉，AI Engineer Code 2025，約 22 分鐘（YouTube 有完整影片）。
- 三道煞車：自動化檢查（只花 CPU，盡量多加）→ 帶著團隊規範的自動化 Review → 依風險決定深度的人工 Review。
- AI 寫的測試常見三種騙法：套套邏輯、對結構過敏、不可能失敗；解法是用 Deep Module 把複雜實作藏在簡單介面後面，只從介面測。
- 規範不要塞給實作的 Agent（它已經滿載），交給 Review 環節；Reviewer 找到問題就直接 commit 修好，而不是留一串 comment。
- 延伸：他之後在 AI Engineer Paris 發表 `/pr` 與 `/retro` 兩個 Skill。

**怎麼拍**：三段小短劇，每段 8–10 秒，CI 都亮綠燈，但鏡頭推進後看到測試其實什麼都沒驗；最後三道煞車像濾網一樣疊起來，越往下要人看的 PR 越少。
**長度**：60–90 秒（三段短劇也可以各自剪成直式短片，會後分享）

## V5「睡醒，PR 已經合併了」：搭配 p.19、p.20

**影片補上的內容**
- Lauren Tan（poteto）用自己的 Skill 組合 pstack 讓 Agent 自己合併 PR，她在 X 上寫：「我現在的 Code Review，是看我不在或睡覺時它們合併進 main 的東西。」
- 合併的條件：Verifier Agent 實際跑過應用程式並給出判定，加上 CI 全綠。
- 她開了十幾個 Coordinator，像幕僚長一樣各管一塊（效能、使用者回報的 Bug），會把相關回報歸在一起再決定怎麼分工。
- 人改成抽樣：挑一部分合併的程式碼檢查有沒有偷工或壞模式，同樣的問題重複出現，就去改 Skill 和規則；有問題直接 revert。
- ⚠️ 數量是她自己說的：每月約 2,000–2,500 個 PR，沒有外部查證。⚠️ pstack 公開版的 babysit 流程預設**不會**自動合併，自動合併是她自己的設定。

**怎麼拍**：某人一天裡的一個時刻。晚上 11 點關燈離開，畫面切到夜裡的泳道：Coordinator 派工、Agent 實作、Verifier 實測、合併；早上 8 點回來，commit 歷史已經多了一排。她抽查其中一個，發現問題，改一行 Skill，下一輪就修好。
**長度**：約 60 秒

## V6（選做）「單向門、雙向門」：p.25

- 出處：Jeff Bezos 2015 年致股東信，Type 1（單向門，回不去，要慢、要多方討論）與 Type 2（雙向門，可退回，應該快速決定）。
- 他的警告：組織越大，越容易把 Type 1 的重流程套到 Type 2 的決定上，結果是變慢、過度保守、不敢實驗。剛好對應「不是每個 PR 都要逐行看」。

**怎麼拍**：兩扇門。雙向門推開走過去還能走回來；單向門關上之後，畫面出現「一行設定寄信給六萬人」。約 30 秒。

## V7（選做）「問一次，寫回 Repo」：p.9

- `grill-with-docs` 是 `grill-me` 對著 Codebase 的版本：每釐清一個詞就**立刻**寫進 GLOSSARY.md，不是最後一次寫；通過三道門檻的決策才寫成 ADR。
- ⚠️ 實務提醒（工作坊安裝時用得到）：它其實會呼叫 `grilling` 和 `domain-modeling` 兩個 Skill，只裝它一個會失敗，要整組安裝；舊文章寫的 CONTEXT.md 已改名為 GLOSSARY.md。

**怎麼拍**：一問一答，每答一題，右邊的 GLOSSARY.md 就長出一行。約 45 秒。

---

## 建議的製作順序

1. **V4**：一支影片講完附錄三頁的內容。
2. **V5**：故事性最強，收尾最有記憶點。
3. **V1**：開場，和 V5 首尾呼應（從 Step 1 走到 Step 3）。
4. **V2**、**V3**：概念段，現場講者可以邊播邊講。

## 參考資料

- Boris Cherny Steps of AI Adoption 整理：[shellypalmer.com](https://shellypalmer.com/2026/07/boris-chernys-steps-of-ai-adoption-a-roadmap/)、[thekb.eu](https://www.thekb.eu/en/fiches/cherny-steps-ai-adoption-2026-07-16/)、[smartscope.blog](https://smartscope.blog/en/blog/ai-adoption-stages-one-person-10x-organization/)、[blog.eimoon.com（中文）](https://blog.eimoon.com/p/steps-of-ai-adoption-framework/)、批評觀點 [outofowls.com](https://outofowls.com/blog/boris-chernys-ai-maturity-model-is-smart-its-also-incomplete)
- Agent harness：[Wikipedia](https://en.wikipedia.org/wiki/Agent_harness)、[Thoughtworks](https://www.thoughtworks.com/insights/blog/architecture/engineering-the-harness-a-practical-pattern-for-reliable-coding-agents)、[Databricks](https://www.databricks.com/blog/ai-harness)、[Cycode](https://cycode.com/blog/ai-agent-harness/)
- Git worktree × Agent：[noqta.tn](https://noqta.tn/en/blog/git-worktrees-parallel-ai-coding-agents-guide-2026)、[dev.to](https://dev.to/stacknotice/git-worktrees-claude-code-run-parallel-ai-agents-on-the-same-repo-2026-mga)、[pasqualepillitteri.it](https://pasqualepillitteri.it/en/news/7951/git-worktrees-ai-agents-claude-code-parallel)
- Matt Pocock〈Fixing the PR Bottleneck〉：[YouTube](https://www.youtube.com/watch?v=LlgiOCmFG_w)、[daily.dev](https://daily.dev/posts/fixing-the-pr-bottleneck-matt-pocock-aihero-jyn4aj6sm)、[BigGo 整理](https://finance.biggo.com/news/4884c941b185405c)、[Paris 演講（X）](https://x.com/mattpocockuk/status/2103501498361798983)
- Matt Pocock Skills：[grill-with-docs 文件](https://github.com/mattpocock/skills/blob/main/docs/engineering/grill-with-docs.md)、[README](https://github.com/mattpocock/skills/blob/main/README.md)、[Releases](https://github.com/mattpocock/skills/releases)
- poteto / pstack：[poteto 的 X 貼文](https://x.com/poteto/status/2087244771849089270)、[tenten 整理](https://developer.tenten.co/pstack-verification-agent-merge)、[atlasnote](https://atlasnote.ai/en/articles/poteto-pstack-ai-agent-verification)、[folkfox](https://folkfox.com/pstack-2500-ai-agent-prs-verification/)、[redreamality](https://redreamality.com/blog/lauren-tan-poteto-trust-before-parallel/)、[中文 Podcast（YouTube）](https://www.youtube.com/watch?v=SygfYGjR8A4)
- Bezos 單向門／雙向門：[Farnam Street](https://fs.blog/reversible-irreversible-decisions/)

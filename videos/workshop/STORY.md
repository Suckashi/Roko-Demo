# 劇情：小智的 Agent 聯盟挑戰

依據 Boris Cherny 的〈Steps of AI Adoption〉（數位時代整理：https://www.bnext.com.tw/article/91541/claude-code-ai-adoption-5-stages）與工作坊簡報 p.4。

你是訓練家小智。一開始身邊還沒有 Agent（Step 0），大木博士交給你第一隻夥伴 Clawd，你站上 Step 1。接著挑戰寶可夢聯盟的四大天王：每位天王守著下一個 Step 的門，他的寶可夢就是「要走到那一步會遇到的問題」，Clawd 用工作坊教的方法當招式打倒牠。

| Boris 的階 | 影片 |
|---|---|
| Step 0：身邊還沒有 Agent | 序章：大木博士 |
| Step 1 助理：卡在你的注意力 | 拿到 Clawd；第一位天王花月的寶可夢 |
| Step 2 指揮官：卡在驗收（Review 多份成果） | 第二位天王芙蓉的第一隻（卡比獸） |
| Step 2 → 3：脈絡、自主權、可重複的流程，Step 3 卡在信任 | 芙蓉的其他寶可夢 |
| Step 4 AI 原生：用意圖領導 | 烈空坐剪影，To be continued |

## 四大天王對戰表（定案）

拿到 Clawd 就是站上 Step 1。每一位天王守著下一個 Step 的門，天王的寶可夢就是「要走到那一步會遇到的問題」。實際要打兩位天王，Step 4 是 To be continued（對應 p.4：Step 1 現況、Step 2 今天走到這裡、Step 3 未來大家都要到這裡、Step 4 再往後）。

### 第一位天王・守 Step 2（3 隻）：從 Step 1 走到 Step 2

Step 1 卡在人的注意力：Agent 還不會自己驗證，所以人每一步都得盯著。依序解決：多開 Agent → 各自獨立的工作區 → 讓它自己驗證，人就不用再盯。

開場：「一個人帶好幾個 Agent？先過我這關！」認輸：「……好吧，Step 2 的門為你打開。」

| 寶可夢 | 問題 | 過程 | 倒下時的說明 |
|---|---|---|---|
| 呆呆獸 | 每次都要等它跑完 | 泡咖啡等它 → 效果不太好 → 多開 Session | 平行處理，效率翻倍 |
| 三地鼠 | 同時改同一份 code，會打架 | Git Worktree | 每個 Agent 一份 worktree，互不干擾 |
| 達克萊伊 | 盯著它，怕它做錯 | 一直盯著看 → 反被暗黑洞弄睡、做惡夢 → Lint、Build、Test 各打一點（打中了，但還不夠…）→ dev-workflow-tdd | 整套流程自動走完，人只看驗證證據，徹底解放注意力 |

打贏後 Step 2 插旗，Clawd 走進 Step 3 的門，升到 Lv.2，學會多開 Session、Git Worktree、dev-workflow-tdd。

### 第二位天王・守 Step 3（5 隻）：Step 2 的瓶頸，加上簡報 p.20「我們離 Step 3 還差什麼」

開場：「Step 3 的門檻是信任。你準備好了嗎？」認輸：「……好，我願意讓 Agent 自己合併了。」

| 寶可夢 | 對應 | 問題 | Clawd 的招式 | 倒下時的說明 |
|---|---|---|---|---|
| 卡比獸 | Step 2 的瓶頸：驗收（p.4、p.22） | 好幾份 PR 同時要審，審不完 | 三層煞車 | 自動檢查、AI Review 先擋，人只細審高風險的 |
| 果然翁 | 公司的態度 | 公司願不願意讓 Agent 自動合併 PR | 低風險試行 | 先從測試、文件這類小地方開始放手 |
| 百變怪 | 工程師的把握＋測試環境 | 測試環境測不到，不敢放手 | 打好測試環境 | 把測試環境補完整，測得到的才放手 |
| 天然鳥 | Domain 知識 | AI 不懂你在說什麼 | grill-with-docs | 問清楚，寫進 GLOSSARY.md 與 ADR |
| 小拉達 | Agent 的環境 | 重複出現同樣的問題 | /retro | 回顧漏掉什麼，補 Skill、MCP 和 lint |

### Step 4：To be continued

第三扇門打開一條縫，露出烈空坐的剪影，接著跳出「To be continued」。

## 流程

分兩集，配寶可夢遊戲的配樂。

- **第 1 集（約 97 秒）**：序章（大木博士）→ 研究所拿到 Clawd，站上 Step 1 → 聯盟大廳 → 條紋轉場進入對戰 → 第一位天王 3 場 → Step 2 插旗，Clawd 走進 Step 3 的門 → Clawd 升到 Lv.2，列出學會的招式 → 預告芙蓉（JoJo 式 To be continued）
- **第 2 集（約 88 秒）**：上集回顧 → 條紋轉場 → 第二位天王 5 場 → Clawd 走到 Step 4 門前 → Clawd 升到 Lv.3，列出學會的招式 → Step 4 的門打開，烈空坐剪影（To be continued）

對戰細節：開場天王撂一句話、小智喊「去吧！Clawd！」丟精靈球；打完天王回來認輸，對手也從精靈球出場；每個招式有自己的特效（dev-workflow-tdd 綠勾勾、多開 Session 分身、grill-with-docs 問號、Git Worktree 分支、低風險試行小方塊、打好測試環境疊磚、/retro 倒帶）；效果絕佳時畫面震動；對話框打字有嗶聲。每隻寶可夢倒下時，用綠字補一句白話說明這招為什麼有效。

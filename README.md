# 🤖 Roko — Deep Agents 聊天機器人 Demo

一個極簡、全 TypeScript 的聊天 Bot，給 Agentic Workshop 當示範素材：

- **底層**：[Deep Agents](https://github.com/langchain-ai/deepagentsjs)（`deepagents`）— 內建規劃（`write_todos`）、虛擬檔案系統、子代理（`task`）
- **模型**：任何 **OpenAI 相容 API**（OpenAI、OpenRouter、Groq、DeepSeek、Together、vLLM、Ollama…）
- **後端**：Express，`/api/chat` 以 SSE 串流 Agent 的每一步
- **前端**：React + Vite + Tailwind + [shadcn/ui](https://ui.shadcn.com)，串流顯示回覆，並可即時看到 Agent 的工具呼叫與待辦清單

## 快速開始

需要 Node.js 20 以上。

```bash
npm install
cp .env.example .env   # 填入 API Key / Base URL / 模型名稱
npm run dev            # 同時啟動 Express(:3000) 與 Vite(:5173)，打開 http://localhost:5173
```

正式／展示模式（只開一個 port）：

```bash
npm run build          # 打包 React 到 web/dist
npm start              # Express 同時提供 API 與前端：http://localhost:3000
```

`.env` 範例：

| 服務 | `OPENAI_BASE_URL` | `MODEL_NAME` 範例 |
| --- | --- | --- |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| OpenRouter | `https://openrouter.ai/api/v1` | `openai/gpt-4o-mini` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| Ollama（本機） | `http://localhost:11434/v1` | `qwen2.5:7b`（Key 隨便填） |

> ⚠️ 模型必須支援 **tool calling**（function calling），Deep Agents 靠工具來規劃與行動。

## 專案結構

```
src/                         後端（Express）
  config.ts                  讀取 .env
  tools.ts                   自訂工具（取得時間、計算機）← Workshop 可以從這裡加工具
  agent.ts                   建立 Deep Agent：模型 + 工具 + system prompt + 記憶
  server.ts                  Express：/api/chat 以 SSE 串流 Agent 的每一步
web/                         前端（React + shadcn/ui，npm workspace）
  src/hooks/use-agent-chat.ts  呼叫 /api/chat、解析 SSE → 訊息列表
  src/components/chat/       MessageBubble（對話泡泡）、AgentStep（工具／待辦卡片）
  src/components/ui/         shadcn/ui 元件（button、card、badge、switch…）
  src/roko/                  Roko 吉祥物：sprite sheet、動畫 manifest、<RokoSprite> 元件
  src/App.tsx                聊天頁面
```

要加更多 shadcn 元件：`cd web && npx shadcn@latest add dialog`。

## Workshop 可以示範的點

1. **換模型**：只改 `.env`，同一份程式接不同供應商。
2. **加工具**：在 `src/tools.ts` 用 `tool()` + zod schema 新增，加進 `tools` 陣列即可。
3. **觀察 Agent loop**：打開「顯示 Agent 步驟」開關，可看到 🔧 工具呼叫、📦 工具結果、📝 待辦清單。
   試試：「幫我規劃三天台南旅遊，並把行程寫進 trip.md」→ 會看到 `write_todos`、`write_file`。
4. **記憶**：同一個對話（thread）會記得上下文；按「新對話」換一個 `threadId` 就重新開始。
5. **子代理**：在 `agent.ts` 的 `createDeepAgent` 加上 `subagents: [...]`，示範任務委派。

## Roko 吉祥物

Roko 的素材來自 [Suckashi/Rocky](https://github.com/Suckashi/Rocky) 的 `assets/roko/`（原檔照搬，SHA-256 與 manifest 相同）。
畫面左上角的 Roko 會跟著 Agent 狀態換動畫：

| Agent 狀態 | 動畫 |
| --- | --- |
| 待命 | `idle` |
| 等模型回應 | `waiting` |
| 呼叫工具中 | `running` |
| 正在輸出回覆 | `review` |
| 完成一輪 | `jumping`（播一次） |
| 出錯 | `failed` |

對應邏輯在 `web/src/roko/use-roko-state.ts`。系統設定「減少動態效果」時只顯示靜態畫格。

> 🎨 **素材授權**：Roko 美術素材不適用本專案程式碼的授權，作者已授權用於本專案，但未另行授權他人再利用；詳見 [`web/src/roko/README.md`](web/src/roko/README.md)。

## API

`POST /api/chat`，body：`{ "threadId": "abc", "message": "你好" }`，回傳 Server-Sent Events：

| event | data |
| --- | --- |
| `token` | 模型輸出的文字片段 |
| `tool` | `{ name, args }` 工具呼叫 |
| `result` | `{ name, content }` 工具結果 |
| `todos` | `[{ content, status }]` 待辦清單 |
| `done` / `error` | 結束 / 錯誤訊息 |

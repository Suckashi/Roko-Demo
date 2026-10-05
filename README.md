# 🤖 Roko — Deep Agents 聊天機器人 Demo

一個極簡、全 TypeScript 的聊天 Bot，給 Agentic Workshop 當示範素材：

- **底層**：[Deep Agents](https://github.com/langchain-ai/deepagentsjs)（`deepagents`）— 內建規劃（`write_todos`）、虛擬檔案系統、子代理（`task`）
- **模型**：任何 **OpenAI 相容 API**（OpenAI、OpenRouter、Groq、DeepSeek、Together、vLLM、Ollama…）
- **介面**：單頁 Web 聊天室，串流顯示回覆，並可即時看到 Agent 的工具呼叫與待辦清單

## 快速開始

需要 Node.js 20 以上。

```bash
npm install
cp .env.example .env   # 填入 API Key / Base URL / 模型名稱
npm run dev            # 開啟 http://localhost:3000
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
src/
  config.ts   讀取 .env
  tools.ts    自訂工具（取得時間、計算機）← Workshop 可以從這裡加工具
  agent.ts    建立 Deep Agent：模型 + 工具 + system prompt + 記憶
  server.ts   Hono 伺服器，/api/chat 以 SSE 串流 Agent 的每一步
public/
  index.html  聊天頁面（純 HTML + JS，無建置步驟）
```

## Workshop 可以示範的點

1. **換模型**：只改 `.env`，同一份程式接不同供應商。
2. **加工具**：在 `src/tools.ts` 用 `tool()` + zod schema 新增，加進 `tools` 陣列即可。
3. **觀察 Agent loop**：勾選「顯示 Agent 步驟」，可看到 🔧 工具呼叫、📦 工具結果、📝 待辦清單。
   試試：「幫我規劃三天台南旅遊，並把行程寫進 trip.md」→ 會看到 `write_todos`、`write_file`。
4. **記憶**：同一個對話（thread）會記得上下文；按「新對話」換一個 `threadId` 就重新開始。
5. **子代理**：在 `agent.ts` 的 `createDeepAgent` 加上 `subagents: [...]`，示範任務委派。

## API

`POST /api/chat`，body：`{ "threadId": "abc", "message": "你好" }`，回傳 Server-Sent Events：

| event | data |
| --- | --- |
| `token` | 模型輸出的文字片段 |
| `tool` | `{ name, args }` 工具呼叫 |
| `result` | `{ name, content }` 工具結果 |
| `todos` | `[{ content, status }]` 待辦清單 |
| `done` / `error` | 結束 / 錯誤訊息 |

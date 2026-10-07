# Roko

以 Deep Agents 打造的聊天 Agent：Express 後端（`src/`）＋ React／shadcn/ui 前端（`web/`），可串接任何 OpenAI 相容 API。完整說明見 [README](README.md)。

## 常用指令

| 指令 | 用途 |
| --- | --- |
| `npm install` | 安裝依賴（含 `web/` workspace） |
| `npm run dev` | 啟動 Express（:3000）與 Vite（:5173） |
| `npm test` | 執行後端與前端測試 |
| `npm run check` | lint、型別檢查、測試與建置；**開 PR 前必須通過** |

## 測試指令

| 指令 | 用途 |
| --- | --- |
| `npm test` | 後端與前端測試全部跑一次 |
| `npx vitest run` | 只跑後端測試（`src/`） |
| `npm test -w web` | 只跑前端測試（`web/`） |
| `npx vitest run src/tools.test.ts` | 只跑一個後端測試檔 |
| `npm test -w web -- src/App.test.tsx` | 只跑一個前端測試檔（路徑相對於 `web/`） |
| `npx vitest run -t "calculator"` | 只跑名稱符合的測試（前端改用 `npm test -w web -- -t "…"`） |
| `npx vitest` ／ `npm run test:watch -w web` | 監看模式，存檔就重跑 |
| `npm run lint` ／ `npm run typecheck` | 只跑 lint ／ 只跑型別檢查 |

TDD 時先用單檔指令看到測試失敗（Red）再實作；完成後跑 `npm run check` 確認全部通過。

## 開發慣例

- **先寫測試再實作。** 後端測試放在 `src/**/*.test.ts`（Node）；前端測試放在 `web/src/**/*.test.{ts,tsx}`（jsdom + Testing Library）。
  - 後端：用 `src/test-utils.ts` 的 `freshImport` 載入模組，測試不會讀到本機的 `.env` 或 `.roko/`。
  - 前端：用 `web/src/test/fake-api.ts` 模擬 `/api/settings` 與 `/api/chat` 的 SSE 串流，不需要啟動伺服器或模型。
- **新增自訂工具**：在 `src/tools.ts` 用 `tool()` 與 zod schema 定義，加進 `tools` 陣列，並在 `src/tools.test.ts` 補測試。
- **不要改動 `/api/chat` 的串流事件格式**：前後端沒有共用型別，`useAgentChat` 與 `fake-api` 都直接依賴這個格式。
- **介面元件**用 shadcn/ui（`web/src/components/ui/`），新增元件用 `cd web && npx shadcn@latest add <name>`。
- **介面文字**使用繁體中文。
- **不要 commit** `.env` 與 `.roko/`（含 API Key）。

# Roko

以 Deep Agents 打造的聊天 Agent：Express 後端（`src/`）＋ React／shadcn/ui 前端（`web/`），可串接任何 OpenAI 相容 API。完整說明見 [README](README.md)。

## 常用指令

| 指令 | 用途 |
| --- | --- |
| `npm install` | 安裝依賴（含 `web/` workspace） |
| `npm run dev` | 啟動 Express（:3000）與 Vite（:5173） |
| `npm test` | 執行後端與前端測試 |
| `npm run check` | lint、型別檢查、測試與建置；**開 PR 前必須通過** |

## 開發慣例

- **先寫測試再實作。** 後端測試放在 `src/**/*.test.ts`（Node）；前端測試放在 `web/src/**/*.test.{ts,tsx}`（jsdom + Testing Library）。
  - 後端：用 `src/test-utils.ts` 的 `freshImport` 載入模組，測試不會讀到本機的 `.env` 或 `.roko/`。
  - 前端：用 `web/src/test/fake-api.ts` 模擬 `/api/settings` 與 `/api/chat` 的 SSE 串流，不需要啟動伺服器或模型。
- **新增自訂工具**：在 `src/tools.ts` 用 `tool()` 與 zod schema 定義，加進 `tools` 陣列，並在 `src/tools.test.ts` 補測試。
- **不要改動 `/api/chat` 的串流事件格式**，見 [ADR-0001](docs/adr/0001-chat-stream-contract.md)。
- **介面元件**用 shadcn/ui（`web/src/components/ui/`），新增元件用 `cd web && npx shadcn@latest add <name>`。
- **介面文字**使用繁體中文。
- **不要 commit** `.env` 與 `.roko/`（含 API Key）。

## Agent skills

### Issue tracker

Issues 與 PR 使用 GitHub（`Suckashi/Roko-Demo`）。See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context：根目錄 `GLOSSARY.md` ＋ `docs/adr/`。See `docs/agents/domain.md`.

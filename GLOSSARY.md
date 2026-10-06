# Roko

Roko 是以 Deep Agents 打造的聊天 Agent：使用者在網頁上和 Roko 對話，Roko 依需要呼叫工具完成工作，處理過程即時顯示在畫面上。

## Language

### 對話

**對話串**（Thread）:
一段共用記憶的對話，以 `threadId` 識別；按「新對話」會開始新的對話串。
_Avoid_: Session、聊天室

**使用者訊息**（`user`）:
使用者送出的一則文字。
_Avoid_: Prompt、提問

**Roko 回覆**（`assistant`）:
Roko 給使用者的文字回答，以 Markdown 呈現；同一輪中若被 Agent 步驟隔開，會分成多則。
_Avoid_: AI 訊息、Bot 訊息

**可見對話**:
對話串中的使用者訊息與 Roko 回覆，依發生順序排列；不含 Agent 步驟、錯誤訊息與思考中提示。
_Avoid_: 聊天紀錄、完整紀錄

### Agent 步驟

**Agent 步驟**:
Roko 處理一則訊息時的中間過程，包括工具呼叫、工具結果與待辦清單；畫面上以卡片呈現，可用「顯示 Agent 步驟」開關隱藏。
_Avoid_: 內部訊息、Log、思考過程

**工具**（Tool）:
Roko 可以呼叫的一項能力，有名稱、說明與輸入 schema；分為 Deep Agents 的內建工具，以及定義在 `src/tools.ts` 的自訂工具。
_Avoid_: Function、Plugin、Skill

**工具呼叫**（`tool`）:
Roko 決定使用某個工具，連同傳給它的參數。
_Avoid_: Action

**工具結果**（`result`）:
工具執行後回傳給 Roko 的內容；畫面上最多顯示 500 字元。
_Avoid_: Output、Response

**待辦清單**（`todos`）:
Roko 用 `write_todos` 規劃多步驟任務時產生的項目與狀態（待辦、進行中、完成）。
_Avoid_: Plan、Task list

**虛擬檔案**:
Roko 用內建檔案工具讀寫的檔案；只存在對話串的狀態中，不會寫入主機硬碟，伺服器重啟後消失。
_Avoid_: 檔案、附件

### 狀態與設定

**思考中提示**:
Roko 處理中、且畫面最後一項不是 Roko 回覆時顯示的提示（例如剛送出訊息，或兩個 Agent 步驟之間）；不是訊息，不屬於對話。
_Avoid_: Loading 訊息

**錯誤訊息**（`error`）:
一次執行失敗時顯示的提示；不是 Roko 回覆。
_Avoid_: 錯誤回覆

**串流事件**:
`/api/chat` 以 SSE 傳給前端的事件：`token`、`tool`、`result`、`todos`、`done`、`error`。
_Avoid_: Message、Webhook

**模型設定**:
Roko 連線模型所需的 Base URL、API Key 與模型名稱；在介面上儲存後寫入伺服器的 `.roko/settings.json`，優先於 `.env`。
_Avoid_: 設定檔、Config

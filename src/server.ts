import { existsSync } from "node:fs";
import path from "node:path";
import express from "express";
import { AIMessage, AIMessageChunk, ToolMessage } from "@langchain/core/messages";
import { createModel, getAgent, resetAgent } from "./agent.js";
import { config } from "./config.js";
import { getSettings, isConfigured, mergeSettings, publicSettings, saveSettings } from "./settings.js";

const app = express();
app.use(express.json());

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

// ── 模型設定 ────────────────────────────────────────────────

// 取得目前設定（API Key 只回傳末四碼）
app.get("/api/settings", (_req, res) => {
  res.json(publicSettings());
});

// 儲存設定；apiKey 留空代表沿用原本的 Key
app.put("/api/settings", (req, res) => {
  const next = mergeSettings(req.body ?? {});
  if (!isConfigured(next)) {
    res.status(400).json({ error: "Base URL、API Key 與模型名稱都必須填寫。" });
    return;
  }
  saveSettings(next);
  resetAgent();
  res.json(publicSettings());
});

// 用表單上的設定（尚未儲存）實際呼叫一次模型
app.post("/api/settings/test", async (req, res) => {
  const candidate = mergeSettings(req.body ?? {});
  if (!isConfigured(candidate)) {
    res.json({ ok: false, error: "Base URL、API Key 與模型名稱都必須填寫。" });
    return;
  }
  const started = Date.now();
  try {
    const reply = await createModel(candidate).invoke("Reply with OK.", { signal: AbortSignal.timeout(20_000) });
    res.json({ ok: true, latencyMs: Date.now() - started, reply: String(reply.content).slice(0, 100) });
  } catch (err) {
    res.json({ ok: false, error: errorMessage(err) });
  }
});

// 取得供應商的模型清單（GET {baseURL}/models），不支援的服務就回傳錯誤，前端改手動輸入
app.post("/api/settings/models", async (req, res) => {
  const candidate = mergeSettings(req.body ?? {});
  try {
    const response = await fetch(`${candidate.baseURL}/models`, {
      headers: candidate.apiKey ? { Authorization: `Bearer ${candidate.apiKey}` } : {},
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = (await response.json()) as { data?: { id: string }[] };
    const models = (body.data ?? []).map((m) => m.id).sort();
    res.json({ models });
  } catch (err) {
    res.json({ models: [], error: errorMessage(err) });
  }
});

// ── 對話 ────────────────────────────────────────────────────

// POST /api/chat  { threadId, message }  →  Server-Sent Events
//   event: token  — 模型逐字輸出
//   event: tool   — Agent 呼叫了某個工具（名稱 + 參數）
//   event: result — 工具回傳結果
//   event: todos  — Agent 的待辦清單（write_todos）
//   event: done / error
app.post("/api/chat", async (req, res) => {
  const { threadId, message } = req.body as { threadId: string; message: string };

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  const send = (event: string, data: unknown) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  // 使用者關掉頁面或按停止 → 中斷 Agent
  const abort = new AbortController();
  res.on("close", () => abort.abort());

  try {
    const stream = await getAgent().stream(
      { messages: [{ role: "user", content: message }] },
      {
        configurable: { thread_id: threadId },
        streamMode: ["messages", "updates"],
        recursionLimit: 100,
        signal: abort.signal,
      },
    );

    for await (const [mode, payload] of stream) {
      if (mode === "messages") {
        // 逐 token 串流（只取主 Agent 模型節點的輸出）
        const [chunk, meta] = payload as [AIMessageChunk, { langgraph_node?: string }];
        if (meta.langgraph_node !== "model_request") continue;
        if (AIMessageChunk.isInstance(chunk) && typeof chunk.content === "string" && chunk.content) {
          send("token", chunk.content);
        }
      } else {
        // 每個節點執行完的狀態更新：拿來顯示工具呼叫、工具結果、todos
        for (const update of Object.values(payload as Record<string, any>)) {
          if (!update) continue;
          for (const msg of update.messages ?? []) {
            if (AIMessage.isInstance(msg)) {
              for (const call of msg.tool_calls ?? []) send("tool", { name: call.name, args: call.args });
            } else if (ToolMessage.isInstance(msg)) {
              send("result", { name: msg.name, content: String(msg.content).slice(0, 500) });
            }
          }
          if (update.todos) send("todos", update.todos);
        }
      }
    }
    send("done", {});
  } catch (err) {
    if (!abort.signal.aborted) {
      console.error(err);
      send("error", { message: errorMessage(err) });
    }
  } finally {
    res.end();
  }
});

// 正式模式：提供 React 打包好的前端（npm run build 之後）
const webDist = path.resolve("web/dist");
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get("/{*path}", (_req, res) => res.sendFile(path.join(webDist, "index.html")));
}

app.listen(config.port, config.host, () => {
  const s = getSettings();
  console.log(`🤖 Roko 已啟動：http://localhost:${config.port}`);
  console.log(isConfigured(s) ? `   模型 ${s.model} @ ${s.baseURL}` : "   尚未設定模型，請在網頁右上角的「模型設定」填入 API 資訊");
});

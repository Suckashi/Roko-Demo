import { existsSync } from "node:fs";
import path from "node:path";
import express from "express";
import { AIMessage, AIMessageChunk, ToolMessage } from "@langchain/core/messages";
import { agent } from "./agent.js";
import { config } from "./config.js";

const app = express();
app.use(express.json());

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
    const stream = await agent.stream(
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
      send("error", { message: err instanceof Error ? err.message : String(err) });
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

app.listen(config.port, () => {
  console.log(`🤖 Roko API 已啟動：http://localhost:${config.port}`);
  console.log(`   模型 ${config.model} @ ${config.baseURL}`);
});

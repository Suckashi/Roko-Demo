import { readFile } from "node:fs/promises";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { AIMessageChunk, AIMessage, ToolMessage } from "@langchain/core/messages";
import { agent } from "./agent.js";
import { config } from "./config.js";

const app = new Hono();

app.get("/", async (c) => c.html(await readFile("public/index.html", "utf8")));

// POST /api/chat  { threadId, message }  →  Server-Sent Events
//   event: token  — 模型逐字輸出
//   event: tool   — Agent 呼叫了某個工具（名稱 + 參數）
//   event: result — 工具回傳結果
//   event: todos  — Agent 的待辦清單（write_todos）
//   event: done / error
app.post("/api/chat", async (c) => {
  const { threadId, message } = await c.req.json<{ threadId: string; message: string }>();

  return streamSSE(c, async (sse) => {
    const send = (event: string, data: unknown) =>
      sse.writeSSE({ event, data: JSON.stringify(data) });

    try {
      const stream = await agent.stream(
        { messages: [{ role: "user", content: message }] },
        {
          configurable: { thread_id: threadId },
          streamMode: ["messages", "updates"],
          recursionLimit: 100,
        },
      );

      for await (const [mode, payload] of stream) {
        if (mode === "messages") {
          // 逐 token 串流（只取主 Agent 模型節點的輸出）
          const [chunk, meta] = payload as [AIMessageChunk, { langgraph_node?: string }];
          if (meta.langgraph_node !== "model_request") continue;
          if (AIMessageChunk.isInstance(chunk) && typeof chunk.content === "string" && chunk.content) {
            await send("token", chunk.content);
          }
        } else {
          // 每個節點執行完的狀態更新：拿來顯示工具呼叫、工具結果、todos
          for (const update of Object.values(payload as Record<string, any>)) {
            if (!update) continue;
            for (const msg of update.messages ?? []) {
              if (AIMessage.isInstance(msg)) {
                for (const call of msg.tool_calls ?? []) await send("tool", { name: call.name, args: call.args });
              } else if (ToolMessage.isInstance(msg)) {
                await send("result", { name: msg.name, content: String(msg.content).slice(0, 500) });
              }
            }
            if (update.todos) await send("todos", update.todos);
          }
        }
      }
      await send("done", {});
    } catch (err) {
      console.error(err);
      await send("error", { message: err instanceof Error ? err.message : String(err) });
    }
  });
});

serve({ fetch: app.fetch, port: config.port }, () => {
  console.log(`🤖 Roko 已啟動：http://localhost:${config.port}`);
  console.log(`   模型 ${config.model} @ ${config.baseURL}`);
});

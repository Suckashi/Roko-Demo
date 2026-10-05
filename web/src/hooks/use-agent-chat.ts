import { useCallback, useRef, useState } from "react";
import type { ChatItem } from "@/lib/types";

/**
 * 呼叫後端 /api/chat，解析 SSE 事件，轉成畫面上的 ChatItem 列表。
 * 事件：token / tool / result / todos / done / error（見 src/server.ts）
 */
export function useAgentChat() {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(false);
  const threadId = useRef(crypto.randomUUID());
  const abortRef = useRef<AbortController | null>(null);

  const push = (item: ChatItem) => setItems((prev) => [...prev, item]);

  // token 接在最後一則 AI 回覆後面；如果最後一則不是 AI 回覆，就新開一則
  const appendToken = (token: string) =>
    setItems((prev) => {
      const last = prev.at(-1);
      if (last?.kind === "assistant") return [...prev.slice(0, -1), { ...last, text: last.text + token }];
      return [...prev, { kind: "assistant", text: token }];
    });

  const send = useCallback(async (message: string) => {
    push({ kind: "user", text: message });
    setLoading(true);
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: threadId.current, message }),
        signal: abort.signal,
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const raw of events) {
          const event = raw.match(/^event: (.*)$/m)?.[1];
          const data = raw.match(/^data: (.*)$/m)?.[1];
          if (!event || !data) continue;
          const payload = JSON.parse(data);
          switch (event) {
            case "token": appendToken(payload); break;
            case "tool": push({ kind: "tool", name: payload.name, args: payload.args }); break;
            case "result": push({ kind: "result", name: payload.name, content: payload.content }); break;
            case "todos": push({ kind: "todos", todos: payload }); break;
            case "error": push({ kind: "error", message: payload.message }); break;
          }
        }
      }
    } catch (err) {
      if (!abort.signal.aborted) push({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, []);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    threadId.current = crypto.randomUUID(); // 換一個 thread = Agent 忘掉之前的對話
    setItems([]);
  }, []);

  return { items, loading, send, stop, reset };
}

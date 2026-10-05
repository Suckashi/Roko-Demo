import { vi } from "vitest";
import type { PublicSettings } from "@/lib/settings";

export type SseEvent = { event: string; data: unknown };

/** 把事件編成後端 /api/chat 的 SSE 格式；chunkSize 可模擬封包被切成好幾段 */
export function sseResponse(events: SseEvent[], chunkSize = Infinity) {
  const text = events.map((e) => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`).join("");
  const bytes = new TextEncoder().encode(text);
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < bytes.length; i += Math.min(chunkSize, bytes.length)) {
        controller.enqueue(bytes.slice(i, i + chunkSize));
      }
      controller.close();
    },
  });
  return new Response(body, { headers: { "Content-Type": "text/event-stream" } });
}

export const configuredSettings: PublicSettings = {
  baseURL: "https://api.example.com/v1",
  model: "test-model",
  hasApiKey: true,
  apiKeyHint: "••••1234",
  configured: true,
};

/**
 * 假的後端：/api/settings 回傳指定設定，/api/chat 依序回傳 chatReplies 中的 SSE 事件。
 * 回傳的 fetch mock 可用來檢查前端送出的請求。
 */
export function mockBackend({
  settings = configuredSettings,
  chatReplies = [],
}: { settings?: PublicSettings; chatReplies?: SseEvent[][] } = {}) {
  const replies = [...chatReplies];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/settings" && (!init?.method || init.method === "GET")) return Response.json(settings);
    if (url === "/api/chat") return sseResponse(replies.shift() ?? [{ event: "done", data: {} }]);
    return Response.json({ error: `unexpected request ${url}` }, { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

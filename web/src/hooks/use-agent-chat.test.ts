import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockBackend, sseResponse } from "@/test/fake-api";
import { useAgentChat } from "./use-agent-chat";

const toolRun = [
  { event: "tool", data: { name: "get_current_time", args: { timeZone: "Asia/Taipei" } } },
  { event: "result", data: { name: "get_current_time", content: "2026/10/5 下午3:00:00" } },
  { event: "token", data: "現在" },
  { event: "token", data: "是下午三點" },
  { event: "done", data: {} },
];

describe("useAgentChat", () => {
  it("把 SSE 事件轉成訊息與 Agent 步驟，token 會接成同一則回覆", async () => {
    mockBackend({ chatReplies: [toolRun] });
    const { result } = renderHook(() => useAgentChat());

    await act(() => result.current.send("現在幾點？"));

    expect(result.current.items).toEqual([
      { kind: "user", text: "現在幾點？" },
      { kind: "tool", name: "get_current_time", args: { timeZone: "Asia/Taipei" } },
      { kind: "result", name: "get_current_time", content: "2026/10/5 下午3:00:00" },
      { kind: "assistant", text: "現在是下午三點" },
    ]);
    expect(result.current.loading).toBe(false);
  });

  it("事件被切成很多小段傳來時仍能正確解析", async () => {
    // 每 7 bytes 一段，事件與中文字都會被切開
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse(toolRun, 7)));
    const { result } = renderHook(() => useAgentChat());

    await act(() => result.current.send("hi"));

    expect(result.current.items.at(-1)).toEqual({ kind: "assistant", text: "現在是下午三點" });
  });

  it("同一個 threadId 會沿用到下一則訊息，reset 後換新的", async () => {
    const fetchMock = mockBackend();
    const { result } = renderHook(() => useAgentChat());
    const threadOf = (call: number) => JSON.parse(fetchMock.mock.calls[call][1]!.body as string).threadId;

    await act(() => result.current.send("一"));
    await act(() => result.current.send("二"));
    expect(threadOf(0)).toBe(threadOf(1));

    act(() => result.current.reset());
    expect(result.current.items).toEqual([]);
    await act(() => result.current.send("三"));
    expect(threadOf(2)).not.toBe(threadOf(1));
  });

  it("後端回傳 error 事件時顯示錯誤", async () => {
    mockBackend({ chatReplies: [[{ event: "error", data: { message: "模型逾時" } }]] });
    const { result } = renderHook(() => useAgentChat());

    await act(() => result.current.send("hi"));

    await waitFor(() => expect(result.current.items.at(-1)).toEqual({ kind: "error", message: "模型逾時" }));
  });
});

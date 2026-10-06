import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";
import { configuredSettings, mockBackend } from "@/test/fake-api";

const reply = [
  { event: "tool", data: { name: "calculator", args: { expression: "1+1" } } },
  { event: "result", data: { name: "calculator", content: "2" } },
  { event: "token", data: "答案是 2" },
  { event: "done", data: {} },
];

describe("App", () => {
  it("尚未設定模型時自動打開模型設定", async () => {
    mockBackend({ settings: { ...configuredSettings, configured: false, hasApiKey: false, apiKeyHint: "", model: "" } });
    render(<App />);
    expect(await screen.findByRole("dialog", { name: "模型設定" })).toBeInTheDocument();
  });

  it("已設定時在標題列顯示模型名稱", async () => {
    mockBackend();
    render(<App />);
    expect(await screen.findByTitle("模型設定")).toHaveTextContent("test-model");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("送出訊息後顯示使用者訊息、Agent 步驟與回覆", async () => {
    const user = userEvent.setup();
    mockBackend({ chatReplies: [reply] });
    render(<App />);
    await screen.findByTitle("模型設定");

    await user.type(screen.getByPlaceholderText(/輸入訊息/), "1+1？{Enter}");

    expect(await screen.findByText("答案是 2")).toBeInTheDocument();
    expect(screen.getByText("1+1？")).toBeInTheDocument();
    expect(screen.getByText("呼叫工具")).toBeInTheDocument();
    expect(screen.getByText("工具結果")).toBeInTheDocument();
  });

  it("關閉「顯示 Agent 步驟」後只留下對話", async () => {
    const user = userEvent.setup();
    mockBackend({ chatReplies: [reply] });
    render(<App />);
    await screen.findByTitle("模型設定");
    await user.type(screen.getByPlaceholderText(/輸入訊息/), "1+1？{Enter}");
    await screen.findByText("答案是 2");

    await user.click(screen.getByRole("switch", { name: "顯示 Agent 步驟" }));

    expect(screen.queryByText("呼叫工具")).not.toBeInTheDocument();
    expect(screen.getByText("答案是 2")).toBeInTheDocument();
  });

  it("新對話會清空畫面", async () => {
    const user = userEvent.setup();
    mockBackend({ chatReplies: [reply] });
    render(<App />);
    await screen.findByTitle("模型設定");
    await user.type(screen.getByPlaceholderText(/輸入訊息/), "1+1？{Enter}");
    await screen.findByText("答案是 2");

    await user.click(screen.getByTitle("新對話"));

    expect(screen.queryByText("答案是 2")).not.toBeInTheDocument();
    expect(screen.getByText(/嗨，我是 Roko/)).toBeInTheDocument();
  });

  it("輸入法組字中按 Enter 不會送出，組字結束後按 Enter 才送出", async () => {
    const fetchMock = mockBackend();
    render(<App />);
    await screen.findByTitle("模型設定");
    const input = screen.getByPlaceholderText(/輸入訊息/);
    const chatRequests = () => fetchMock.mock.calls.filter(([url]) => url === "/api/chat").length;

    fireEvent.change(input, { target: { value: "你好" } });
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(input).toHaveValue("你好");
    expect(chatRequests()).toBe(0);

    fireEvent.keyDown(input, { key: "Enter" });
    expect(await screen.findByText("你好")).toBeInTheDocument();
    expect(input).toHaveValue("");
    expect(chatRequests()).toBe(1);
  });
});

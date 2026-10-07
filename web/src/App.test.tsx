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

  it("模型設定只有 OpenAI 相容 API 的欄位，不列出個別供應商", async () => {
    mockBackend({ settings: { ...configuredSettings, configured: false, hasApiKey: false, apiKeyHint: "", model: "" } });
    render(<App />);
    const dialog = await screen.findByRole("dialog", { name: "模型設定" });
    expect(screen.getByLabelText("Base URL")).toBeInTheDocument();
    expect(screen.getByLabelText("API Key")).toBeInTheDocument();
    expect(screen.getByLabelText("模型")).toBeInTheDocument();
    expect(dialog).not.toHaveTextContent("OpenRouter");
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

  it("工具卡片預設收合，點標題可展開與收回內容", async () => {
    const user = userEvent.setup();
    mockBackend({ chatReplies: [reply] });
    render(<App />);
    await screen.findByTitle("模型設定");
    await user.type(screen.getByPlaceholderText(/輸入訊息/), "1+1？{Enter}");
    await screen.findByText("答案是 2");

    const toolHeader = screen.getByRole("button", { name: /呼叫工具/ });
    expect(toolHeader).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/"expression": "1\+1"/)).not.toBeInTheDocument();

    await user.click(toolHeader);
    expect(toolHeader).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/"expression": "1\+1"/)).toBeInTheDocument();

    await user.click(toolHeader);
    expect(screen.queryByText(/"expression": "1\+1"/)).not.toBeInTheDocument();

    const resultHeader = screen.getByRole("button", { name: /工具結果/ });
    expect(screen.queryByText("2", { selector: "pre" })).not.toBeInTheDocument();
    await user.click(resultHeader);
    expect(screen.getByText("2", { selector: "pre" })).toBeInTheDocument();
  });

  it("待辦清單維持展開", async () => {
    const user = userEvent.setup();
    const todos = [{ content: "算出 1+1", status: "in_progress" }];
    mockBackend({ chatReplies: [[{ event: "todos", data: todos }, ...reply]] });
    render(<App />);
    await screen.findByTitle("模型設定");
    await user.type(screen.getByPlaceholderText(/輸入訊息/), "1+1？{Enter}");
    await screen.findByText("答案是 2");

    expect(screen.getByText("算出 1+1")).toBeInTheDocument();
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

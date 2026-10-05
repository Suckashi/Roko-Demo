import { tool } from "langchain";
import { z } from "zod";

// 自訂工具範例：Workshop 時可以照這個模式加更多工具。
// Deep Agents 本身已內建 write_todos、ls/read_file/write_file/edit_file、task（子代理）等工具。

export const getCurrentTime = tool(
  async ({ timeZone }) =>
    new Date().toLocaleString("zh-TW", { timeZone: timeZone || "Asia/Taipei" }),
  {
    name: "get_current_time",
    description: "取得目前的日期與時間。",
    schema: z.object({
      timeZone: z.string().optional().describe("IANA 時區，例如 Asia/Taipei"),
    }),
  },
);

export const calculator = tool(
  async ({ expression }) => {
    if (!/^[\d+\-*/().%\s]+$/.test(expression)) return "只支援數字與 + - * / % ( )";
    try {
      return String(Function(`"use strict"; return (${expression})`)());
    } catch {
      return "算式無法計算";
    }
  },
  {
    name: "calculator",
    description: "計算四則運算算式，例如 (12 + 3) * 4。",
    schema: z.object({ expression: z.string() }),
  },
);

export const tools = [getCurrentTime, calculator];

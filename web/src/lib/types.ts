export type Todo = { content: string; status: "pending" | "in_progress" | "completed" };

// 聊天室裡的每一個項目：使用者訊息、AI 回覆，或 Agent 的一個步驟
export type ChatItem =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "tool"; name: string; args: unknown }
  | { kind: "result"; name: string; content: string }
  | { kind: "todos"; todos: Todo[] }
  | { kind: "error"; message: string };

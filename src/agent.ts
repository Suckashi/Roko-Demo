import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { createDeepAgent } from "deepagents";
import { config } from "./config.js";
import { tools } from "./tools.js";

// 1. 模型：任何 OpenAI 相容 API，只要換 baseURL / apiKey / model
const model = new ChatOpenAI({
  model: config.model,
  apiKey: config.apiKey,
  temperature: config.temperature,
  useResponsesApi: false, // 第三方服務多半只支援 /chat/completions
  configuration: { baseURL: config.baseURL },
});

// 2. Agent：Deep Agents 提供規劃（todos）、虛擬檔案系統、子代理等能力
export const agent = createDeepAgent({
  model,
  tools,
  systemPrompt: [
    "你是 Roko，一個友善的 AI 助理。請用繁體中文回答。",
    "遇到需要多個步驟的任務時，先用 write_todos 規劃，再逐步完成。",
  ].join("\n"),
  // 3. 記憶：用 thread_id 區分對話，MemorySaver 存在記憶體中（重啟就會清空）
  checkpointer: new MemorySaver(),
});

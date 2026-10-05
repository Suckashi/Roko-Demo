import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { createDeepAgent } from "deepagents";
import { getSettings, isConfigured, type ModelSettings } from "./settings.js";
import { tools } from "./tools.js";

// 1. 模型：任何 OpenAI 相容 API，只要換 baseURL / apiKey / model
export function createModel(s: ModelSettings) {
  return new ChatOpenAI({
    model: s.model,
    apiKey: s.apiKey,
    temperature: s.temperature,
    useResponsesApi: false, // 第三方服務多半只支援 /chat/completions
    configuration: { baseURL: s.baseURL },
  });
}

// 3. 記憶：用 thread_id 區分對話，存在記憶體中（重啟就會清空）
//    換模型時沿用同一個 checkpointer，對話不會中斷
const checkpointer = new MemorySaver();

// 2. Agent：Deep Agents 提供規劃（todos）、虛擬檔案系統、子代理等能力
function buildAgent(s: ModelSettings) {
  return createDeepAgent({
    model: createModel(s),
    tools,
    systemPrompt: [
      "你是 Roko，一個友善的 AI 助理。請用繁體中文回答。",
      "遇到需要多個步驟的任務時，先用 write_todos 規劃，再逐步完成。",
    ].join("\n"),
    checkpointer,
  });
}

let agent: ReturnType<typeof buildAgent> | undefined;

/** 取得目前設定對應的 Agent；設定變更後呼叫 resetAgent() 讓下次重新建立 */
export function getAgent() {
  const settings = getSettings();
  if (!isConfigured(settings)) throw new Error("尚未設定模型，請先在「模型設定」中填入 API 資訊。");
  return (agent ??= buildAgent(settings));
}

export function resetAgent() {
  agent = undefined;
}

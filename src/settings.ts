import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { config } from "./config.js";

export type ModelSettings = {
  baseURL: string;
  apiKey: string;
  model: string;
  temperature: number;
};

const file = path.join(config.dataDir, "settings.json");

// 優先順序：介面上儲存的設定（.roko/settings.json） > 環境變數 / .env > 預設值
function load(): ModelSettings {
  const fromEnv: ModelSettings = {
    baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.MODEL_NAME || "",
    temperature: Number(process.env.TEMPERATURE ?? 0.3),
  };
  if (!existsSync(file)) return fromEnv;
  try {
    return { ...fromEnv, ...JSON.parse(readFileSync(file, "utf8")) };
  } catch {
    console.warn(`⚠️ 無法讀取 ${file}，改用環境變數設定`);
    return fromEnv;
  }
}

let current = load();

export const getSettings = () => current;

export const isConfigured = (s: ModelSettings = current) => Boolean(s.baseURL && s.apiKey && s.model);

/** 合併部分設定；apiKey 留空代表沿用目前的 Key */
export function mergeSettings(patch: Partial<ModelSettings>): ModelSettings {
  return {
    baseURL: (patch.baseURL ?? current.baseURL).trim().replace(/\/+$/, ""),
    apiKey: patch.apiKey?.trim() || current.apiKey,
    model: (patch.model ?? current.model).trim(),
    temperature: Number.isFinite(Number(patch.temperature)) ? Number(patch.temperature) : current.temperature,
  };
}

export function saveSettings(next: ModelSettings) {
  current = next;
  mkdirSync(config.dataDir, { recursive: true });
  // 檔案含 API Key：權限 0600，且 .roko/ 已列入 .gitignore
  writeFileSync(file, JSON.stringify(next, null, 2), { mode: 0o600 });
}

/** 回傳給前端的版本：不含完整 API Key */
export function publicSettings(s: ModelSettings = current) {
  return {
    baseURL: s.baseURL,
    model: s.model,
    temperature: s.temperature,
    hasApiKey: Boolean(s.apiKey),
    apiKeyHint: s.apiKey ? `••••${s.apiKey.slice(-4)}` : "",
    configured: isConfigured(s),
  };
}

// 與後端 /api/settings 溝通（後端見 src/settings.ts）

export type PublicSettings = {
  baseURL: string;
  model: string;
  temperature: number;
  hasApiKey: boolean;
  apiKeyHint: string;
  configured: boolean;
};

/** 表單內容；apiKey 留空代表沿用已儲存的 Key */
export type SettingsInput = {
  baseURL: string;
  apiKey: string;
  model: string;
  temperature: number;
};

export const providerPresets = [
  { name: "OpenAI", baseURL: "https://api.openai.com/v1" },
  { name: "OpenRouter", baseURL: "https://openrouter.ai/api/v1" },
  { name: "Groq", baseURL: "https://api.groq.com/openai/v1" },
  { name: "DeepSeek", baseURL: "https://api.deepseek.com/v1" },
  { name: "Ollama", baseURL: "http://localhost:11434/v1" },
];

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

export const fetchSettings = () => request<PublicSettings>("GET", "/api/settings");

export const saveSettings = (input: SettingsInput) => request<PublicSettings>("PUT", "/api/settings", input);

export const testSettings = (input: SettingsInput) =>
  request<{ ok: boolean; latencyMs?: number; error?: string }>("POST", "/api/settings/test", input);

export const listModels = (input: SettingsInput) =>
  request<{ models: string[]; error?: string }>("POST", "/api/settings/models", input);

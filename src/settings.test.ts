import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { freshImport } from "./test-utils.js";

type SettingsModule = typeof import("./settings.js");
const load = (env?: Record<string, string>) => freshImport<SettingsModule>("./settings.js", env);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("settings", () => {
  it("沒有任何設定時視為未設定", async () => {
    const { getSettings, isConfigured } = await load();
    expect(isConfigured()).toBe(false);
    expect(getSettings().baseURL).toBe("https://api.openai.com/v1");
  });

  it("從環境變數讀取初始值", async () => {
    const { getSettings, isConfigured } = await load({
      OPENAI_API_KEY: "sk-env",
      OPENAI_BASE_URL: "https://example.com/v1",
      MODEL_NAME: "model-a",
    });
    expect(isConfigured()).toBe(true);
    expect(getSettings()).toEqual({ baseURL: "https://example.com/v1", apiKey: "sk-env", model: "model-a" });
  });

  it("mergeSettings：API Key 留空時沿用目前的 Key", async () => {
    const { mergeSettings } = await load({ OPENAI_API_KEY: "sk-old", MODEL_NAME: "m" });
    expect(mergeSettings({ apiKey: "  " }).apiKey).toBe("sk-old");
    expect(mergeSettings({ apiKey: "sk-new" }).apiKey).toBe("sk-new");
  });

  it("mergeSettings：去除前後空白與 Base URL 結尾的斜線", async () => {
    const { mergeSettings } = await load();
    const merged = mergeSettings({ baseURL: " https://example.com/v1/ ", model: " m ", apiKey: "k" });
    expect(merged).toEqual({ baseURL: "https://example.com/v1", apiKey: "k", model: "m" });
  });

  it("publicSettings 只提供 API Key 的末四碼", async () => {
    const { publicSettings } = await load({ OPENAI_API_KEY: "sk-secret-abcd", MODEL_NAME: "m" });
    const view = publicSettings();
    expect(view).toMatchObject({ hasApiKey: true, apiKeyHint: "••••abcd", configured: true });
    expect(JSON.stringify(view)).not.toContain("sk-secret");
  });

  it("saveSettings 寫入設定檔，權限為 0600，重新載入後仍保留", async () => {
    const { saveSettings } = await load();
    const dataDir = process.env.ROKO_DATA_DIR!;
    saveSettings({ baseURL: "https://example.com/v1", apiKey: "sk-saved", model: "m" });

    const file = path.join(dataDir, "settings.json");
    expect(existsSync(file)).toBe(true);
    expect(JSON.parse(readFileSync(file, "utf8")).apiKey).toBe("sk-saved");
    if (process.platform !== "win32") expect(statSync(file).mode & 0o777).toBe(0o600);

    // 用同一個設定目錄重新載入，設定檔優先於環境變數
    const reloaded = await load({ ROKO_DATA_DIR: dataDir, OPENAI_API_KEY: "sk-env" });
    expect(reloaded.getSettings().apiKey).toBe("sk-saved");
  });
});

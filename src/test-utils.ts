import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { vi } from "vitest";

/**
 * 以乾淨的環境重新載入模組：清空模型相關環境變數、使用暫存的設定目錄。
 * settings.ts 在載入時就會讀取環境變數與設定檔，所以每個測試都要重新 import。
 */
export async function freshImport<T>(modulePath: string, env: Record<string, string> = {}): Promise<T> {
  vi.resetModules();
  vi.stubEnv("ROKO_DATA_DIR", mkdtempSync(path.join(tmpdir(), "roko-test-")));
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("OPENAI_BASE_URL", "");
  vi.stubEnv("MODEL_NAME", "");
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return import(modulePath) as Promise<T>;
}

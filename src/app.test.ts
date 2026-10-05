import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { freshImport } from "./test-utils.js";

type AppModule = typeof import("./app.js");
const loadApp = async (env?: Record<string, string>) => (await freshImport<AppModule>("./app.js", env)).app;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/settings", () => {
  it("回傳目前設定，不含完整 API Key", async () => {
    const app = await loadApp({ OPENAI_API_KEY: "sk-secret-1234", MODEL_NAME: "m" });
    const res = await request(app).get("/api/settings").expect(200);
    expect(res.body).toMatchObject({ model: "m", hasApiKey: true, apiKeyHint: "••••1234", configured: true });
    expect(JSON.stringify(res.body)).not.toContain("sk-secret");
  });
});

describe("PUT /api/settings", () => {
  it("缺少必要欄位時回傳 400", async () => {
    const app = await loadApp();
    const res = await request(app).put("/api/settings").send({ baseURL: "https://example.com/v1", model: "" }).expect(400);
    expect(res.body.error).toBeTruthy();
  });

  it("儲存成功後回傳已設定狀態", async () => {
    const app = await loadApp();
    const res = await request(app)
      .put("/api/settings")
      .send({ baseURL: "https://example.com/v1", apiKey: "sk-new-5678", model: "m" })
      .expect(200);
    expect(res.body).toMatchObject({ configured: true, apiKeyHint: "••••5678" });
  });
});

describe("POST /api/chat", () => {
  it("尚未設定模型時，以 SSE error 事件回應", async () => {
    const app = await loadApp();
    const res = await request(app).post("/api/chat").send({ threadId: "t1", message: "hi" }).expect(200);
    expect(res.headers["content-type"]).toContain("text/event-stream");
    expect(res.text).toContain("event: error");
    expect(res.text).toContain("尚未設定模型");
  });
});

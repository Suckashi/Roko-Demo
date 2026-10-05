import "dotenv/config";

// 伺服器本身的設定（模型相關設定見 settings.ts，可在介面上修改）
export const config = {
  port: Number(process.env.PORT ?? 3000),
  // 預設只聽本機：設定 API 會改寫 API Key，不應暴露在區網上
  host: process.env.HOST || "127.0.0.1",
  dataDir: process.env.ROKO_DATA_DIR || ".roko",
};

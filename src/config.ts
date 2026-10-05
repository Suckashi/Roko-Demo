import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`❌ 缺少環境變數 ${name}，請先複製 .env.example 為 .env 並填好。`);
    process.exit(1);
  }
  return value;
}

export const config = {
  apiKey: required("OPENAI_API_KEY"),
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  model: required("MODEL_NAME"),
  temperature: Number(process.env.TEMPERATURE ?? 0.3),
  port: Number(process.env.PORT ?? 3000),
};

import { app } from "./app.js";
import { config } from "./config.js";
import { getSettings, isConfigured } from "./settings.js";

app.listen(config.port, config.host, () => {
  const s = getSettings();
  console.log(`🤖 Roko 已啟動：http://localhost:${config.port}`);
  console.log(isConfigured(s) ? `   模型 ${s.model} @ ${s.baseURL}` : "   尚未設定模型，請在網頁右上角的「模型設定」填入 API 資訊");
});

import { defineConfig } from "vitest/config";

// 後端測試（src/**/*.test.ts）；前端測試設定在 web/vite.config.ts
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});

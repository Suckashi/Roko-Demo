import { describe, expect, it } from "vitest";
import { calculator, getCurrentTime } from "./tools.js";

describe("calculator", () => {
  it("計算四則運算", async () => {
    expect(await calculator.invoke({ expression: "(1234 + 5678) * 9" })).toBe("62208");
  });

  it("拒絕數字與運算子以外的內容", async () => {
    expect(await calculator.invoke({ expression: "process.exit()" })).toBe("只支援數字與 + - * / % ( )");
  });

  it("算式錯誤時回傳提示而不是丟出例外", async () => {
    expect(await calculator.invoke({ expression: "(1 +" })).toBe("算式無法計算");
  });
});

describe("get_current_time", () => {
  it("回傳指定時區的時間字串", async () => {
    const result = await getCurrentTime.invoke({ timeZone: "Asia/Taipei" });
    expect(result).toMatch(/\d{4}\/\d{1,2}\/\d{1,2}/);
  });
});

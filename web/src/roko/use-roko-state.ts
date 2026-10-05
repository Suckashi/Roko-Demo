import { useEffect, useRef, useState } from "react";
import type { ChatItem } from "@/lib/types";
import type { RokoClip, RokoMode } from "./roko-sprite";

// 把 Agent 目前在做什麼，對應到 Roko 的動畫
export function useRokoState(items: ChatItem[], loading: boolean) {
  const [celebrating, setCelebrating] = useState(false);
  const wasLoading = useRef(false);
  const last = items.at(-1);

  // 一輪對話成功結束 → 跳一下慶祝
  useEffect(() => {
    const finished = wasLoading.current && !loading;
    wasLoading.current = loading;
    if (!finished || last?.kind !== "assistant") return;
    setCelebrating(true);
    const timer = setTimeout(() => setCelebrating(false), 1500);
    return () => {
      clearTimeout(timer);
      setCelebrating(false);
    };
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  let clip: RokoClip = "idle";
  let mode: RokoMode = "loop";
  let label = "待命中";

  if (last?.kind === "error") [clip, mode, label] = ["failed", "static", "出錯了"];
  else if (loading && (last?.kind === "tool" || last?.kind === "result" || last?.kind === "todos"))
    [clip, label] = ["running", "使用工具中…"];
  else if (loading && last?.kind === "assistant") [clip, label] = ["review", "回覆中…"];
  else if (loading) [clip, label] = ["waiting", "思考中…"];
  else if (celebrating) [clip, mode, label] = ["jumping", "once", "完成！"];

  return { clip, mode, label };
}

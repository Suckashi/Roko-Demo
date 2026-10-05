import { cn } from "@/lib/utils";
import { RokoSprite } from "@/roko/roko-sprite";

export function MessageBubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  const bubble = (
    <div
      className={cn(
        "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
        role === "user" ? "self-end bg-primary text-primary-foreground" : "bg-muted",
      )}
    >
      {text}
    </div>
  );
  if (role === "user") return bubble;

  // AI 回覆：左邊放 Roko 頭像
  return (
    <div className="flex items-end gap-2 self-start">
      <RokoSprite mode="static" width={32} />
      {bubble}
    </div>
  );
}

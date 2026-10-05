import { cn } from "@/lib/utils";

export function MessageBubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  return (
    <div
      className={cn(
        "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
        role === "user" ? "self-end bg-primary text-primary-foreground" : "self-start bg-muted",
      )}
    >
      {text}
    </div>
  );
}

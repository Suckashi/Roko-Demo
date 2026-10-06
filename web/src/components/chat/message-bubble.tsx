import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { rehypeCodeHighlight } from "@/lib/rehype-code-highlight";
import { cn } from "@/lib/utils";
import { RokoSprite } from "@/roko/roko-sprite";

export function MessageBubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  const bubble = (
    <div
      className={cn(
        "max-w-[85%] min-w-0 rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words",
        role === "user" ? "self-end bg-primary text-primary-foreground whitespace-pre-wrap" : "bg-muted markdown",
      )}
    >
      {/* 使用者輸入照原樣顯示；AI 回覆以 Markdown 渲染（不渲染原始 HTML） */}
      {role === "user" ? (
        text
      ) : (
        <Markdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeCodeHighlight]}
          components={{ a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noreferrer" /> }}
        >
          {text}
        </Markdown>
      )}
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

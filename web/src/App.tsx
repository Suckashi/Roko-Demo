import { useEffect, useRef, useState } from "react";
import { Bot, RotateCcw, Send, Square } from "lucide-react";
import { AgentStep } from "@/components/chat/agent-step";
import { MessageBubble } from "@/components/chat/message-bubble";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAgentChat } from "@/hooks/use-agent-chat";

const examples = ["現在台北幾點？", "(1234 + 5678) * 9 等於多少？", "幫我規劃三天台南旅遊，並把行程寫進 trip.md"];

export default function App() {
  const { items, loading, send, stop, reset } = useAgentChat();
  const [input, setInput] = useState("");
  const [showSteps, setShowSteps] = useState(true);
  const viewportRef = useRef<HTMLDivElement>(null);

  // 有新內容就捲到底
  useEffect(() => {
    viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight });
  }, [items]);

  const submit = (text = input) => {
    const message = text.trim();
    if (!message || loading) return;
    setInput("");
    send(message);
  };

  const visible = showSteps ? items : items.filter((i) => i.kind === "user" || i.kind === "assistant" || i.kind === "error");
  const waiting = loading && items.at(-1)?.kind !== "assistant";

  return (
    <div className="mx-auto flex h-dvh max-w-3xl flex-col px-4">
      <header className="flex items-center justify-between border-b py-3">
        <div className="flex items-center gap-2">
          <Bot className="size-6" />
          <div>
            <h1 className="font-semibold leading-tight">Roko</h1>
            <p className="text-xs text-muted-foreground">Deep Agents × OpenAI 相容 API</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Label className="text-xs text-muted-foreground">
            <Switch checked={showSteps} onCheckedChange={setShowSteps} />
            顯示 Agent 步驟
          </Label>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw /> 新對話
          </Button>
        </div>
      </header>

      <ScrollArea className="min-h-0 flex-1" viewportRef={viewportRef}>
        <div className="flex flex-col gap-3 py-4">
          {items.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
              <Bot className="size-10" />
              <p>嗨，我是 Roko！試試看：</p>
              <div className="flex flex-wrap justify-center gap-2">
                {examples.map((ex) => (
                  <Button key={ex} variant="secondary" size="sm" onClick={() => submit(ex)}>
                    {ex}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {visible.map((item, i) => {
            switch (item.kind) {
              case "user":
              case "assistant":
                return <MessageBubble key={i} role={item.kind} text={item.text} />;
              case "error":
                return <p key={i} className="self-center text-sm text-destructive">⚠️ {item.message}</p>;
              default:
                return <AgentStep key={i} step={item} />;
            }
          })}
          {waiting && <p className="self-start text-sm text-muted-foreground animate-pulse">思考中…</p>}
        </div>
      </ScrollArea>

      <form
        className="flex items-end gap-2 border-t py-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="輸入訊息，Enter 送出，Shift+Enter 換行"
          className="max-h-40 min-h-11 resize-none"
          rows={1}
        />
        {loading ? (
          <Button type="button" variant="outline" size="icon" onClick={stop} aria-label="停止">
            <Square />
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={!input.trim()} aria-label="送出">
            <Send />
          </Button>
        )}
      </form>
    </div>
  );
}

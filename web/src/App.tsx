import { useEffect, useRef, useState } from "react";
import { RotateCcw, Send, Settings2, Square } from "lucide-react";
import { AgentStep } from "@/components/chat/agent-step";
import { MessageBubble } from "@/components/chat/message-bubble";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAgentChat } from "@/hooks/use-agent-chat";
import { fetchSettings, type PublicSettings } from "@/lib/settings";
import { RokoSprite } from "@/roko/roko-sprite";
import { useRokoState } from "@/roko/use-roko-state";

const examples = ["現在台北幾點？", "(1234 + 5678) * 9 等於多少？", "幫我規劃三天台南旅遊，並把行程寫進 trip.md"];

export default function App() {
  const { items, loading, send, stop, reset } = useAgentChat();
  const [input, setInput] = useState("");
  const [showSteps, setShowSteps] = useState(true);
  const viewportRef = useRef<HTMLDivElement>(null);
  const roko = useRokoState(items, loading);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 載入模型設定；尚未設定就直接打開設定視窗
  useEffect(() => {
    fetchSettings()
      .then((s) => {
        setSettings(s);
        if (!s.configured) setSettingsOpen(true);
      })
      .catch(() => {});
  }, []);

  // 有新內容就捲到底
  useEffect(() => {
    viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight });
  }, [items]);

  const submit = (text = input) => {
    const message = text.trim();
    if (!message || loading) return;
    if (!settings?.configured) {
      setSettingsOpen(true);
      return;
    }
    setInput("");
    send(message);
  };

  const visible = showSteps ? items : items.filter((i) => i.kind === "user" || i.kind === "assistant" || i.kind === "error");
  const waiting = loading && items.at(-1)?.kind !== "assistant";

  return (
    <div className="mx-auto flex h-dvh max-w-3xl flex-col px-4">
      <header className="flex items-center justify-between border-b py-3">
        <div className="flex items-center gap-2">
          <RokoSprite clip={roko.clip} mode={roko.mode} width={44} />
          <div>
            <h1 className="font-semibold leading-tight">Roko</h1>
            <p className="text-xs text-muted-foreground">{roko.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Label className="text-xs text-muted-foreground" title="顯示 Agent 步驟">
            <Switch checked={showSteps} onCheckedChange={setShowSteps} aria-label="顯示 Agent 步驟" />
            <span className="hidden sm:inline">顯示 Agent 步驟</span>
          </Label>
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)} title="模型設定">
            <Settings2 />
            <span className="max-w-24 truncate sm:max-w-40">{settings?.configured ? settings.model : "設定模型"}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={reset} title="新對話">
            <RotateCcw /> <span className="hidden sm:inline">新對話</span>
          </Button>
        </div>
      </header>

      <ScrollArea className="min-h-0 flex-1" viewportRef={viewportRef}>
        <div className="flex flex-col gap-3 py-4">
          {items.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
              <RokoSprite clip="waving" width={140} />
              <p>嗨，我是 Roko！試試看：</p>
              <p className="-mt-2 text-xs">Deep Agents × OpenAI 相容 API</p>
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
          {waiting && (
            <div className="flex items-center gap-2 self-start text-sm text-muted-foreground">
              <RokoSprite clip="waiting" width={32} />
              <span className="animate-pulse">{roko.label}</span>
            </div>
          )}
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

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} settings={settings} onSaved={setSettings} />
    </div>
  );
}

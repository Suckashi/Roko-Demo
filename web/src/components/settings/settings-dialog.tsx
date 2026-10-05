import { useState } from "react";
import { CheckCircle2, List, Loader2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  listModels,
  providerPresets,
  saveSettings,
  testSettings,
  type PublicSettings,
  type SettingsInput,
} from "@/lib/settings";
import { cn } from "@/lib/utils";

type Status = { kind: "idle" } | { kind: "busy"; text: string } | { kind: "ok" | "error"; text: string };

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: PublicSettings | null;
  onSaved: (settings: PublicSettings) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>模型設定</DialogTitle>
          <DialogDescription>連接任何 OpenAI 相容的 API。設定會儲存在伺服器的 .roko/settings.json。</DialogDescription>
        </DialogHeader>
        {/* DialogContent 關閉時會卸載，所以每次打開都會用目前設定重新建立表單 */}
        <SettingsForm
          settings={settings}
          onSaved={(saved) => {
            onSaved(saved);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function SettingsForm({
  settings,
  onSaved,
}: {
  settings: PublicSettings | null;
  onSaved: (settings: PublicSettings) => void;
}) {
  // API Key 不回填，留空代表沿用
  const [form, setForm] = useState<SettingsInput>({
    baseURL: settings?.baseURL ?? "",
    apiKey: "",
    model: settings?.model ?? "",
  });
  const [models, setModels] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const update = (patch: Partial<SettingsInput>) => {
    setForm((f) => ({ ...f, ...patch }));
    setStatus({ kind: "idle" });
  };

  const run = async (busyText: string, task: () => Promise<Status>) => {
    setStatus({ kind: "busy", text: busyText });
    try {
      setStatus(await task());
    } catch (err) {
      setStatus({ kind: "error", text: err instanceof Error ? err.message : String(err) });
    }
  };

  const fetchModels = () =>
    run("正在取得模型清單…", async () => {
      const result = await listModels(form);
      setModels(result.models);
      if (result.error) return { kind: "error", text: `無法取得模型清單（${result.error}），請直接輸入模型名稱。` };
      return { kind: "ok", text: `找到 ${result.models.length} 個模型，可在「模型」欄位選擇。` };
    });

  const test = () =>
    run("正在測試連線…", async () => {
      const result = await testSettings(form);
      return result.ok
        ? { kind: "ok", text: `連線成功，回應時間 ${result.latencyMs} ms。` }
        : { kind: "error", text: `連線失敗：${result.error}` };
    });

  const save = () =>
    run("儲存中…", async () => {
      onSaved(await saveSettings(form));
      return { kind: "idle" };
    });

  const busy = status.kind === "busy";
  const keyRequired = !settings?.hasApiKey;
  const canSubmit = Boolean(form.baseURL && form.model && (form.apiKey || !keyRequired)) && !busy;

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) save();
      }}
    >
      <div className="grid gap-2">
        <Label>供應商</Label>
        <div className="flex flex-wrap gap-1.5">
          {providerPresets.map((p) => (
            <Badge
              key={p.name}
              asChild
              variant={form.baseURL === p.baseURL ? "default" : "outline"}
              className="cursor-pointer px-2.5 py-1"
            >
              <button type="button" onClick={() => update({ baseURL: p.baseURL })}>
                {p.name}
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="baseURL">Base URL</Label>
        <Input
          id="baseURL"
          value={form.baseURL}
          onChange={(e) => update({ baseURL: e.target.value })}
          placeholder="https://api.openai.com/v1"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="apiKey">API Key</Label>
        <Input
          id="apiKey"
          type="password"
          autoComplete="off"
          value={form.apiKey}
          onChange={(e) => update({ apiKey: e.target.value })}
          placeholder={settings?.hasApiKey ? `已設定（${settings.apiKeyHint}），留空則沿用` : "sk-…（Ollama 可填任意文字）"}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="model">模型</Label>
        <div className="flex gap-2">
          <Input
            id="model"
            list="model-options"
            value={form.model}
            onChange={(e) => update({ model: e.target.value })}
            placeholder="gpt-4o-mini"
          />
          <Button type="button" variant="outline" onClick={fetchModels} disabled={busy || !form.baseURL}>
            <List /> 取得清單
          </Button>
        </div>
        <datalist id="model-options">
          {models.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <p className="text-xs text-muted-foreground">模型必須支援 tool calling（function calling）。</p>
      </div>

      {status.kind !== "idle" && (
        <p
          role="status"
          className={cn(
            "flex items-start gap-2 text-sm",
            status.kind === "ok" && "text-emerald-600 dark:text-emerald-400",
            status.kind === "error" && "text-destructive",
            status.kind === "busy" && "text-muted-foreground",
          )}
        >
          {status.kind === "busy" && <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />}
          {status.kind === "ok" && <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
          {status.kind === "error" && <XCircle className="mt-0.5 size-4 shrink-0" />}
          <span className="break-all">{status.text}</span>
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={test} disabled={!canSubmit}>
          測試連線
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          儲存
        </Button>
      </DialogFooter>
    </form>
  );
}

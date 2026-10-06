import { CheckCircle2, ChevronRight, Circle, Loader2, PackageOpen, Wrench, ListTodo } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { ChatItem, Todo } from "@/lib/types";

type Step = Extract<ChatItem, { kind: "tool" | "result" | "todos" }>;

const todoIcon: Record<Todo["status"], React.ReactNode> = {
  pending: <Circle className="size-4 text-muted-foreground" />,
  in_progress: <Loader2 className="size-4 animate-spin text-amber-500" />,
  completed: <CheckCircle2 className="size-4 text-emerald-500" />,
};

// 顯示 Agent 的一個步驟：呼叫工具、工具結果、待辦清單
export function AgentStep({ step }: { step: Step }) {
  if (step.kind === "todos") {
    return (
      <Card className="max-w-[85%] gap-2 self-start border-dashed py-3 shadow-none">
        <CardHeader className="px-4">
          <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ListTodo className="size-4" />
            待辦清單
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <ul className="space-y-1 text-sm">
            {step.todos.map((todo, i) => (
              <li key={i} className="flex items-center gap-2">
                {todoIcon[todo.status]}
                <span className={todo.status === "completed" ? "text-muted-foreground line-through" : ""}>
                  {todo.content}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  // 工具呼叫與結果預設收合，點標題展開參數或結果內容
  const header =
    step.kind === "tool"
      ? { icon: <Wrench className="size-4" />, label: "呼叫工具" }
      : { icon: <PackageOpen className="size-4" />, label: "工具結果" };

  return (
    <Card className="max-w-[85%] gap-0 self-start border-dashed py-0 shadow-none">
      <Collapsible>
        <CollapsibleTrigger className="group flex w-full cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
          <ChevronRight className="size-3.5 transition-transform group-data-[state=open]:rotate-90" />
          {header.icon}
          {header.label}
          <Badge variant="secondary" className="font-mono">{step.name}</Badge>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-3">
          <pre className="font-mono text-xs whitespace-pre-wrap break-words text-muted-foreground">
            {step.kind === "tool" ? JSON.stringify(step.args, null, 2) : step.content}
          </pre>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

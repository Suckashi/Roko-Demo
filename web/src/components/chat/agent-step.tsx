import { CheckCircle2, Circle, Loader2, PackageOpen, Wrench, ListTodo } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChatItem, Todo } from "@/lib/types";

type Step = Extract<ChatItem, { kind: "tool" | "result" | "todos" }>;

const todoIcon: Record<Todo["status"], React.ReactNode> = {
  pending: <Circle className="size-4 text-muted-foreground" />,
  in_progress: <Loader2 className="size-4 animate-spin text-amber-500" />,
  completed: <CheckCircle2 className="size-4 text-emerald-500" />,
};

// 顯示 Agent 的一個步驟：呼叫工具、工具結果、待辦清單
export function AgentStep({ step }: { step: Step }) {
  const header = {
    tool: { icon: <Wrench className="size-4" />, label: "呼叫工具" },
    result: { icon: <PackageOpen className="size-4" />, label: "工具結果" },
    todos: { icon: <ListTodo className="size-4" />, label: "待辦清單" },
  }[step.kind];

  return (
    <Card className="max-w-[85%] gap-2 self-start border-dashed py-3 shadow-none">
      <CardHeader className="px-4">
        <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {header.icon}
          {header.label}
          {step.kind !== "todos" && <Badge variant="secondary" className="font-mono">{step.name}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        {step.kind === "todos" ? (
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
        ) : (
          <pre className="font-mono text-xs whitespace-pre-wrap break-words text-muted-foreground">
            {step.kind === "tool" ? JSON.stringify(step.args, null, 2) : step.content}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}

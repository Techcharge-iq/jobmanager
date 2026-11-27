import { AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { stageStates, type StageState } from "@/lib/jobStages";
import type { Job } from "@/pages/Index";

const dot: Record<StageState, string> = {
  done: "border-primary bg-primary text-primary-foreground",
  current: "border-primary bg-background text-primary ring-4 ring-primary/15",
  attention: "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200",
  upcoming: "border-border bg-background text-muted-foreground",
  untracked: "border-dashed border-border bg-background text-muted-foreground",
};
const caption: Partial<Record<StageState, string>> = { current: "In progress", attention: "Needs approval", untracked: "Not tracked" };

/** Workflow timeline derived from the job's status and approval status. */
export function JobWorkflowTimeline({ job }: { job: Pick<Job, "status" | "approval_status" | "deliveredAt"> }) {
  const stages = stageStates(job);
  return (
    <ol aria-label="Workflow progress" tabIndex={0} className="flex gap-1 overflow-x-auto pb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {stages.map((s, i) => (
        <li key={s.label} aria-current={s.state === "current" ? "step" : undefined} className="relative flex min-w-[4.5rem] flex-1 flex-col items-center gap-1 text-center">
          {i > 0 && <span aria-hidden className={cn("absolute end-1/2 top-3 h-px w-full", stages[i - 1].state === "done" && s.state !== "upcoming" ? "bg-primary" : "bg-border")} />}
          <span className={cn("relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 text-[11px] font-semibold transition-colors duration-200", dot[s.state])}>
            {s.state === "done" ? <Check className="h-3.5 w-3.5" aria-hidden /> : s.state === "attention" ? <AlertCircle className="h-3.5 w-3.5" aria-hidden /> : i + 1}
          </span>
          <span className={cn("text-[11px] font-medium leading-tight", s.state === "upcoming" || s.state === "untracked" ? "text-muted-foreground" : "text-foreground")}>{s.label}</span>
          <span className="min-h-3 text-[10px] leading-none text-muted-foreground">{caption[s.state] ?? (s.state === "done" ? "Done" : "")}</span>
        </li>
      ))}
    </ol>
  );
}

import { useMemo } from "react";
import { format, formatDistanceToNow, isBefore, startOfDay } from "date-fns";
import type { Job } from "@/pages/Index";
import { DashPanel } from "@/components/dashboard/DashPanel";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { useActivities } from "@/hooks/useActivities";
import { cn } from "@/lib/utils";

const CLOSED = ["completed", "finished", "invoiced", "cancelled"];
const row = "flex w-full items-center gap-2 border-b px-3 py-2 text-start text-[13px] transition-colors duration-150 last:border-0 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none";
const Empty = ({ children }: { children: string }) => <p className="px-3 py-6 text-center text-xs text-muted-foreground">{children}</p>;

interface ListProps { jobs: Job[]; onOpenJob: (job: Job) => void; onViewAll?: () => void; className?: string }
const viewAll = (onViewAll?: () => void) => onViewAll ? <button type="button" onClick={onViewAll} className="text-xs font-medium text-primary hover:underline">View all</button> : undefined;

export function PriorityJobs({ jobs, onOpenJob, onViewAll, className }: ListProps) {
  const list = useMemo(() => jobs
    .filter((j) => j.priority === "high" && !CLOSED.includes(j.status))
    .sort((a, b) => (a.dueDate || "9").localeCompare(b.dueDate || "9"))
    .slice(0, 8), [jobs]);
  const today = startOfDay(new Date());
  return (
    <DashPanel title="Priority jobs" className={className} action={viewAll(onViewAll)} bodyClassName="flex-none overflow-visible">
      {list.length === 0 ? <Empty>No high priority jobs are open.</Empty> : list.map((j) => {
        const due = j.dueDate ? new Date(j.dueDate) : null;
        const overdue = due && !Number.isNaN(due.getTime()) && isBefore(due, today);
        return (
          <button key={j.id} type="button" onClick={() => onOpenJob(j)} className={row}>
            <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{j.jobOrderNumber}</span>
            <span className="min-w-0 flex-1 truncate">{j.title}<span className="text-muted-foreground"> · {j.customer}</span></span>
            {due && !Number.isNaN(due.getTime()) && <span className={cn("shrink-0 text-xs tabular-nums", overdue ? "font-semibold text-rose-600 dark:text-rose-300" : "text-muted-foreground")}>{overdue ? "Overdue " : ""}{format(due, "d MMM")}</span>}
          </button>
        );
      })}
    </DashPanel>
  );
}

export function RecentJobs({ jobs, recentJobs, onOpenJob, onViewAll, className }: ListProps & { recentJobs?: Job[] }) {
  const list = useMemo(
    () => recentJobs ?? [...jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
    [jobs, recentJobs],
  );
  return (
    <DashPanel title="Recent jobs" className={className} action={viewAll(onViewAll)} bodyClassName="flex-none overflow-visible">
      {list.length === 0 ? <Empty>No jobs yet.</Empty> : list.map((j) => (
        <button key={j.id} type="button" onClick={() => onOpenJob(j)} className={row}>
          <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{j.jobOrderNumber}</span>
          <span className="min-w-0 flex-1 truncate">{j.title}<span className="text-muted-foreground"> · {j.customer}</span></span>
          <span className="hidden shrink-0 sm:block"><StatusBadge status={j.status} /></span>
        </button>
      ))}
    </DashPanel>
  );
}

export function ActivityFeed({ className, active = true, limit = 10 }: { className?: string; active?: boolean; limit?: number }) {
  const { activities, isLoading, isError, refetch } = useActivities(active);
  return (
    <DashPanel title="Activity" className={className} bodyClassName="flex-none overflow-visible">
      {isLoading ? <Empty>Loading activity…</Empty> : isError ? (
        <div className="space-y-2 px-3 py-4 text-center">
          <p role="alert" className="text-xs text-destructive">Could not load recent activity.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>Retry</Button>
        </div>
      ) : activities.length === 0 ? <Empty>No recent activity.</Empty> : (
        <ul>
          {activities.slice(0, limit).map((a) => (
            <li key={a.id} className="flex flex-col gap-0.5 border-b px-3 py-2 text-[13px] last:border-0">
              <span className="leading-snug"><span className="font-medium">{a.user_name}</span> <span className="text-muted-foreground">{a.description}</span></span>
              <time dateTime={a.created_at} className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</time>
            </li>
          ))}
        </ul>
      )}
    </DashPanel>
  );
}

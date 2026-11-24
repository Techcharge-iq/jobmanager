import { useState } from "react";
import { AlertTriangle, X, ChevronRight } from "lucide-react";
import { Job } from "@/pages/Index";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HighPriorityReminderProps {
  jobs: Job[];
  onViewJob?: (job: Job) => void;
}

export function HighPriorityReminder({ jobs, onViewJob }: HighPriorityReminderProps) {
  const [dismissed, setDismissed] = useState(false);

  const highPriorityJobs = jobs.filter(
    job => job.priority === "high" &&
      job.status !== "completed" &&
      job.status !== "invoiced" &&
      job.status !== "cancelled"
  );

  const overdueJobs = highPriorityJobs.filter(job => new Date(job.dueDate) < new Date());

  if (dismissed || highPriorityJobs.length === 0) return null;

  const hasOverdue = overdueJobs.length > 0;

  return (
    <div
      className={cn(
        "rounded-md border p-4",
        hasOverdue
          ? "border-destructive/40 bg-destructive/5"
          : "border-amber-500/40 bg-amber-50 dark:bg-amber-950/20"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className={cn("w-5 h-5 mt-0.5", hasOverdue ? "text-destructive" : "text-amber-600 dark:text-amber-300")} />
          <div className="flex-1">
            <h3 className={cn("font-semibold", hasOverdue ? "text-destructive" : "text-amber-900 dark:text-amber-200")}>
              {hasOverdue
                ? `${overdueJobs.length} overdue high priority job${overdueJobs.length > 1 ? "s" : ""}`
                : `${highPriorityJobs.length} high priority job${highPriorityJobs.length > 1 ? "s" : ""} pending`}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {hasOverdue
                ? "These jobs are past their due date and need immediate action."
                : "Review and prioritize these jobs to ensure timely delivery."}
            </p>

            <div className="mt-3 space-y-1">
              {highPriorityJobs.slice(0, 3).map((job) => (
                <button
                  key={job.id}
                  onClick={() => onViewJob?.(job)}
                  className="flex items-center gap-2 text-sm w-full text-start p-2 rounded-md hover:bg-muted"
                >
                  <ChevronRight className="w-4 h-4 text-muted-foreground rtl:-scale-x-100" />
                  <span className="font-medium">{job.jobOrderNumber}</span>
                  <span className="text-xs text-muted-foreground">— {job.customer}</span>
                  {new Date(job.dueDate) < new Date() && (
                    <span className="ms-auto text-xs px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground">
                      OVERDUE
                    </span>
                  )}
                </button>
              ))}
              {highPriorityJobs.length > 3 && (
                <p className="text-xs text-muted-foreground ps-6">
                  +{highPriorityJobs.length - 3} more...
                </p>
              )}
            </div>
          </div>
        </div>

        <Button variant="ghost" size="icon" onClick={() => setDismissed(true)} className="shrink-0">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

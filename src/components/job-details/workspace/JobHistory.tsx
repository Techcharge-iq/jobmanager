import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { History } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { JobEditLog } from "@/components/job-details/JobEditLog";
import { listJobOrderLogs } from "@/data/jobAudit";

/** Recent edit history. The full log (filters, restore, export) stays in the existing dialog. */
export function JobHistory({ jobId, jobOrderNumber }: { jobId: string; jobOrderNumber: string }) {
  const [open, setOpen] = useState(false);
  const { data: logs = [], isLoading, isError } = useQuery({ queryKey: ["job-order-logs", jobId], queryFn: () => listJobOrderLogs(jobId), staleTime: 60_000 });
  return (
    <div className="space-y-3">
      {isLoading ? <p className="text-sm text-muted-foreground">Loading history…</p> : isError ? <p role="alert" className="text-sm text-destructive">Couldn’t load the history.</p> : logs.length === 0 ? <p className="text-sm text-muted-foreground">No edits recorded for this job.</p> : (
        <ol className="space-y-2 border-s ps-4">
          {logs.slice(0, 12).map((l) => {
            const fields = l.changed_fields && typeof l.changed_fields === "object" ? Object.keys(l.changed_fields as Record<string, unknown>) : [];
            return (
              <li key={l.id} className="relative text-sm">
                <span aria-hidden className="absolute -start-[1.3rem] top-1.5 h-2 w-2 rounded-full bg-primary" />
                <span className="font-medium">{l.user_name}</span> <span className="text-muted-foreground">{l.action}</span>
                {fields.length > 0 && <span className="text-muted-foreground"> · {fields.slice(0, 4).join(", ")}{fields.length > 4 ? ` +${fields.length - 4}` : ""}</span>}
                <time dateTime={l.changed_at} className="block text-xs text-muted-foreground">{formatDistanceToNow(new Date(l.changed_at), { addSuffix: true })}</time>
              </li>
            );
          })}
        </ol>
      )}
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}><History className="h-4 w-4" />Open full log</Button>
      <JobEditLog jobOrderId={jobId} jobOrderNumber={jobOrderNumber} isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
}

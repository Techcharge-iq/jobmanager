import { cn } from "@/lib/utils";
import { STATUS_META } from "@/lib/status";
import type { JobStatus } from "@/types/jobOrder";

/** Restrained status indicator: neutral pill, coloured dot, plain label. */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = STATUS_META[status as JobStatus];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium text-foreground", className)}>
      <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta?.dot ?? "bg-slate-400")} />
      {meta?.label ?? status}
    </span>
  );
}

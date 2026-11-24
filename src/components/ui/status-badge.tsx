import { cn } from "@/lib/utils";
import { STATUS_META } from "@/lib/status";
import type { JobStatus } from "@/types/jobOrder";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = STATUS_META[status as JobStatus];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", meta?.chip ?? "bg-secondary text-secondary-foreground", className)}>
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", meta?.dot ?? "bg-slate-400")} />
      {meta?.label ?? status}
    </span>
  );
}

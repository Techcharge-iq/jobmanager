import { useMemo } from "react";
import type { Job } from "@/pages/Index";
import { DashPanel } from "@/components/dashboard/DashPanel";
import { formatOmaniRial } from "@/utils/currency";

const STAGES = [
  { label: "Pending", statuses: ["pending"], bar: "bg-amber-500" },
  { label: "Design", statuses: ["designing"], bar: "bg-violet-500" },
  { label: "Production", statuses: ["in-progress", "out", "foc_sample"], bar: "bg-sky-500" },
  { label: "Ready to bill", statuses: ["completed", "finished"], bar: "bg-teal-500" },
];

/** Where open work is sitting, with the value waiting at each stage. */
export function ProductionPipeline({ jobs, className }: { jobs: Job[]; className?: string }) {
  const rows = useMemo(() => STAGES.map((s) => {
    const list = jobs.filter((j) => s.statuses.includes(j.status));
    return { ...s, count: list.length, value: list.reduce((a, j) => a + (Number(j.totalValue) || 0), 0) };
  }), [jobs]);
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <DashPanel title="Production pipeline" className={className} action={<span className="text-xs text-muted-foreground">jobs · value</span>} bodyClassName="flex flex-col justify-around gap-2 overflow-visible p-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
            <span className="font-medium">{r.label}</span>
            <span className="tabular-nums text-muted-foreground"><span className="font-semibold text-foreground">{r.count}</span> · {formatOmaniRial(r.value)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="presentation">
            <div className={`h-full rounded-full ${r.bar} transition-[width] duration-500 ease-out`} style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </DashPanel>
  );
}

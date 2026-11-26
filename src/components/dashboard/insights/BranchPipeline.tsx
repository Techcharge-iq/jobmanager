import { useMemo } from "react";
import { Layers } from "lucide-react";
import type { Job } from "@/pages/Index";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STAGES = [
  { label: "Pending", statuses: ["pending"], soft: "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200", hot: "bg-amber-400 text-amber-950" },
  { label: "Designing", statuses: ["designing"], soft: "bg-violet-100 text-violet-900 dark:bg-violet-400/15 dark:text-violet-200", hot: "bg-violet-600 text-white" },
  { label: "In production", statuses: ["in-progress", "out", "foc_sample"], soft: "bg-sky-100 text-sky-900 dark:bg-sky-400/15 dark:text-sky-200", hot: "bg-sky-500 text-sky-950" },
  { label: "Ready to bill", statuses: ["completed", "finished"], soft: "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200", hot: "bg-emerald-500 text-emerald-950" },
];

/** Open jobs per branch and stage. The busiest stage of each branch is highlighted. */
export function BranchPipeline({ jobs, className }: { jobs: Job[]; className?: string }) {
  const rows = useMemo(() => {
    const byBranch = new Map<string, number[]>();
    for (const job of jobs) {
      const stage = STAGES.findIndex((s) => s.statuses.includes(job.status));
      if (stage < 0) continue;
      const key = job.branch || "No branch";
      const counts = byBranch.get(key) ?? STAGES.map(() => 0);
      counts[stage]++;
      byBranch.set(key, counts);
    }
    return [...byBranch.entries()]
      .map(([branch, counts]) => ({ branch, counts, open: counts.reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.open - a.open)
      .slice(0, 5);
  }, [jobs]);

  return (
    <Card className={cn("min-w-0 p-5", className)}>
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white"><Layers className="h-4 w-4" aria-hidden /></span>
        Pipeline by branch
      </div>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No open jobs right now.</p>
      ) : (
        <div className="overflow-x-auto" role="region" aria-label="Pipeline by branch, scrollable" tabIndex={0}>
          <table className="w-full min-w-[34rem] border-separate border-spacing-1.5 text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th scope="col" className="w-40 px-1 text-start font-medium">Branch</th>
                {STAGES.map((s) => <th key={s.label} scope="col" className="px-1 text-start font-medium">{s.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const peak = Math.max(...row.counts);
                return (
                  <tr key={row.branch}>
                    <th scope="row" className="px-1 text-start font-medium">
                      <div className="truncate">{row.branch}</div>
                      <div className="text-xs font-normal text-muted-foreground">{row.open} open</div>
                    </th>
                    {row.counts.map((count, i) => (
                      <td
                        key={STAGES[i].label}
                        className={cn("h-12 rounded-2xl px-3 text-start font-semibold tabular-nums", count === 0 ? "bg-muted/60 text-muted-foreground" : count === peak ? STAGES[i].hot : STAGES[i].soft)}
                      >
                        {count === 0 ? "–" : <>{count}<span className="ms-1 text-xs font-normal opacity-80">jobs</span></>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

import { DashPanel } from "@/components/dashboard/DashPanel";
import { formatOmaniRial } from "@/utils/currency";

export interface PipelineRow {
  label: string;
  bar: string;
  count: number;
  value: number;
}

/** Where open work is sitting, with the value waiting at each stage. */
export function ProductionPipeline({ rows, className }: { rows: PipelineRow[]; className?: string }) {
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

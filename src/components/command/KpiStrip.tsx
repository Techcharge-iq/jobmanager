import { useMemo } from "react";
import type { Job } from "@/pages/Index";
import { formatOmaniRial } from "@/utils/currency";
import { Activity, AlertTriangle, Receipt, Wallet } from "lucide-react";
import { KpiCard } from "@/components/kpi/KpiCard";

const ACTIVE = new Set(["pending", "in-progress", "designing", "out", "foc_sample"]);
const DAY = 86_400_000;
const WINDOW = 14;

const sum = (list: Job[]) => list.reduce((t, j) => t + (Number(j.totalValue) || 0), 0);

/** Buckets items into the last `WINDOW` days (oldest first) plus the total for the 14 days before that. */
function windows<T>(items: T[], dateOf: (item: T) => string | undefined, valueOf: (item: T) => number, now: number) {
  const series = new Array<number>(WINDOW).fill(0);
  let previous = 0;
  for (const item of items) {
    const raw = dateOf(item);
    const time = raw ? new Date(raw).getTime() : NaN;
    if (!Number.isFinite(time)) continue;
    const age = Math.floor((now - time) / DAY);
    if (age >= 0 && age < WINDOW) series[WINDOW - 1 - age] += valueOf(item);
    else if (age >= WINDOW && age < WINDOW * 2) previous += valueOf(item);
  }
  const current = series.reduce((a, b) => a + b, 0);
  const delta = previous > 0 ? ((current - previous) / previous) * 100 : null;
  return { series, delta };
}

export function KpiStrip({ jobs }: { jobs: Job[] }) {
  const data = useMemo(() => {
    const now = Date.now();
    const d = new Date(now);
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    const invoiced = jobs.filter((j) => j.status === "invoiced");
    const invoicedMonth = invoiced.filter((j) => new Date(j.invoicedAt ?? j.createdAt).getTime() >= monthStart);
    const toBill = jobs.filter((j) => j.status === "completed" || j.status === "finished");
    const active = jobs.filter((j) => ACTIVE.has(j.status));
    const urgent = active.filter((j) => j.priority === "high");
    const billedValue = sum(invoicedMonth);
    const waitingValue = sum(toBill);
    return {
      invoicedMonth, toBill, active, urgent, billedValue, waitingValue,
      money: windows(invoiced, (j) => j.invoicedAt ?? j.createdAt, (j) => Number(j.totalValue) || 0, now),
      intake: windows(active, (j) => j.createdAt, () => 1, now),
    };
  }, [jobs]);

  const share = data.billedValue + data.waitingValue;

  return (
    <div className="grid min-w-0 grid-cols-2 gap-2 lg:grid-cols-4">
      <KpiCard tone="mint" icon={Wallet} label="Invoiced this month" value={data.billedValue} format={formatOmaniRial}
        hint={`${data.invoicedMonth.length} jobs`} delta={data.money.delta} series={data.money.series} />
      <KpiCard tone="lavender" icon={Receipt} label="Waiting for invoice" value={data.waitingValue} format={formatOmaniRial}
        hint={`${data.toBill.length} jobs ready to bill`} ring={{ value: share ? data.billedValue / share : 0, label: "Share of this month already invoiced" }} />
      <KpiCard tone="sky" icon={Activity} label="Active on the floor" value={data.active.length} format={(n) => String(Math.round(n))}
        hint="new, last 14 days" delta={data.intake.delta} series={data.intake.series} />
      <KpiCard tone={data.urgent.length ? "rose" : "peach"} icon={AlertTriangle} label="High priority" value={data.urgent.length} format={(n) => String(Math.round(n))}
        hint={data.urgent.length ? "need attention" : "nothing urgent"} ring={{ value: data.active.length ? data.urgent.length / data.active.length : 0, label: "Share of active jobs that are high priority" }} />
    </div>
  );
}

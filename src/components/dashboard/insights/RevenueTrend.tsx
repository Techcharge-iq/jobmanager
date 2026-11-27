import { useMemo, useRef } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Job } from "@/pages/Index";
import { DashPanel } from "@/components/dashboard/DashPanel";
import { cn } from "@/lib/utils";
import { formatOmaniRial } from "@/utils/currency";
import { gsap, useCountUp, useGSAP, useMotionOK } from "@/lib/motion";

const DAY = 86_400_000;
const DAYS = 30;
const fmtDay = (t: number) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Invoiced value per day for the last 30 days, with the change against the 30 days before. */
export function RevenueTrend({ jobs, className }: { jobs: Job[]; className?: string }) {
  const { data, total, delta } = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date(new Date(now).setHours(0, 0, 0, 0)).getTime();
    const days = Array.from({ length: DAYS }, (_, i) => ({ t: startOfToday - (DAYS - 1 - i) * DAY, value: 0 }));
    let previous = 0;
    for (const job of jobs) {
      if (job.status !== "invoiced") continue;
      const time = new Date(job.invoicedAt ?? job.createdAt).getTime();
      if (!Number.isFinite(time)) continue;
      const value = Number(job.totalValue) || 0;
      const index = Math.floor((time - days[0].t) / DAY);
      if (index >= 0 && index < DAYS) days[index].value += value;
      else if (index < 0 && index >= -DAYS) previous += value;
    }
    const sum = days.reduce((a, d) => a + d.value, 0);
    return { data: days.map((d) => ({ label: fmtDay(d.t), value: d.value })), total: sum, delta: previous > 0 ? ((sum - previous) / previous) * 100 : null };
  }, [jobs]);

  const num = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const ok = useMotionOK();
  useCountUp(num, total, formatOmaniRial);
  useGSAP(() => {
    if (!ok.current || !box.current) return;
    const rtl = getComputedStyle(box.current).direction === "rtl";
    gsap.from(box.current, { clipPath: rtl ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)", duration: 0.7, ease: "power2.out", clearProps: "clipPath" });
  }, { scope: box });

  const up = (delta ?? 0) >= 0;
  return (
    <DashPanel
      title="Revenue overview"
      className={className}
      action={delta != null && Number.isFinite(delta) ? (
        <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", up ? "text-teal-700 dark:text-teal-300" : "text-rose-700 dark:text-rose-300")}>
          {up ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />}
          {Math.abs(Math.round(delta))}%<span className="sr-only"> {up ? "up" : "down"} on the previous 30 days</span>
          <span aria-hidden className="ms-1 font-normal text-muted-foreground">vs prev. 30 days</span>
        </span>
      ) : <span className="text-xs text-muted-foreground">Last 30 days</span>}
      bodyClassName="flex flex-col overflow-hidden p-3"
    >
      <div className="flex items-baseline gap-2">
        <div ref={num} className="text-2xl font-semibold tabular-nums tracking-tight">{formatOmaniRial(total)}</div>
        <span className="text-xs text-muted-foreground">invoiced</span>
      </div>
      <div ref={box} role="img" aria-label={`Invoiced value per day for the last 30 days, total ${formatOmaniRial(total)}`} className="mt-1 min-h-[7rem] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" interval={4} padding={{ left: 14, right: 14 }} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip
              cursor={{ stroke: "#7c3aed", strokeOpacity: 0.35 }}
              content={({ active, payload, label }) => active && payload?.length ? (
                <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md">
                  <div className="text-muted-foreground">{label}</div>
                  <div className="font-semibold">{formatOmaniRial(Number(payload[0].value))}</div>
                </div>
              ) : null}
            />
            <Area type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2} fill="url(#rev-fill)" dot={false} activeDot={{ r: 4, fill: "#fff", stroke: "#7c3aed", strokeWidth: 2 }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </DashPanel>
  );
}

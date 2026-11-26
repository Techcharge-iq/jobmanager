import { useMemo, useRef } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, TrendingUp } from "lucide-react";
import type { Job } from "@/pages/Index";
import { Card } from "@/components/ui/card";
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
    gsap.from(box.current, { clipPath: rtl ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)", duration: 1.1, ease: "power2.out", clearProps: "clipPath" });
  }, { scope: box });

  const up = (delta ?? 0) >= 0;
  return (
    <Card className={cn("flex min-w-0 flex-col gap-3 p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"><TrendingUp className="h-4 w-4" aria-hidden /></span>
            Invoiced, last 30 days
          </div>
          <div ref={num} className="mt-2 text-3xl font-bold tabular-nums tracking-tight">{formatOmaniRial(total)}</div>
        </div>
        {delta != null && Number.isFinite(delta) && (
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", up ? "bg-mint text-mint-foreground" : "bg-rose text-rose-foreground")}>
            {up ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />}
            {Math.abs(Math.round(delta))}% <span className="sr-only">{up ? "up" : "down"} on the previous 30 days</span><span aria-hidden className="font-normal opacity-80">vs previous 30 days</span>
          </span>
        )}
      </div>
      <div ref={box} role="img" aria-label={`Invoiced value per day for the last 30 days, total ${formatOmaniRial(total)}`} className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#f472b6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="rev-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" interval={4} padding={{ left: 14, right: 14 }} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip
              cursor={{ stroke: "#a855f7", strokeOpacity: 0.4 }}
              content={({ active, payload, label }) => active && payload?.length ? (
                <div className="rounded-xl border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
                  <div className="text-muted-foreground">{label}</div>
                  <div className="font-semibold">{formatOmaniRial(Number(payload[0].value))}</div>
                </div>
              ) : null}
            />
            <Area type="monotone" dataKey="value" stroke="url(#rev-line)" strokeWidth={3} fill="url(#rev-fill)" dot={false} activeDot={{ r: 5, fill: "#fff", stroke: "#a855f7", strokeWidth: 2 }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

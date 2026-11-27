import { useRef, type ComponentType } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/lib/motion";
import type { Tone } from "@/components/ui/tones";
import { Sparkline } from "./Sparkline";
import { Ring } from "./Ring";

const toneText: Record<Tone, string> = {
  lavender: "text-violet-600 dark:text-violet-300",
  mint: "text-teal-600 dark:text-teal-300",
  sky: "text-sky-600 dark:text-sky-300",
  peach: "text-amber-600 dark:text-amber-300",
  rose: "text-rose-600 dark:text-rose-300",
};

interface Props {
  label: string;
  value: number;
  format: (n: number) => string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  tone: Tone;
  /** Percent change against the previous period. null hides it. */
  delta?: number | null;
  /** Sparkline series (oldest to newest). */
  series?: number[];
  /** Progress ring from 0 to 1, with a short label for screen readers. */
  ring?: { value: number; label: string };
}

/** Dense, neutral KPI card. Colour is limited to the icon and the small chart. */
export function KpiCard({ label, value, format, hint, icon: Icon, tone, delta, series, ring }: Props) {
  const num = useRef<HTMLDivElement>(null);
  useCountUp(num, value, format);
  const up = (delta ?? 0) >= 0;

  return (
    <div data-kpi className="flex min-w-0 items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-card transition-shadow duration-200 hover:shadow-md">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><Icon className={cn("h-3.5 w-3.5 shrink-0", toneText[tone])} aria-hidden /><span className="truncate">{label}</span></div>
        <div ref={num} className="mt-0.5 whitespace-nowrap text-xl font-semibold tabular-nums tracking-tight sm:text-2xl">{format(value)}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {delta != null && Number.isFinite(delta) && (
            <span className={cn("inline-flex items-center font-semibold", up ? "text-teal-700 dark:text-teal-300" : "text-rose-700 dark:text-rose-300")}>
              {up ? <ArrowUpRight className="h-3 w-3" aria-hidden /> : <ArrowDownRight className="h-3 w-3" aria-hidden />}
              {Math.abs(Math.round(delta))}%<span className="sr-only"> {up ? "up" : "down"} on the previous 14 days</span>
            </span>
          )}
          <span className="truncate">{hint}</span>
        </div>
      </div>
      <div className={cn("shrink-0", toneText[tone])}>
        {series && series.length > 1 ? <div className="hidden w-24 sm:block"><Sparkline data={series} label={`${label}, last ${series.length} days`} /></div>
          : ring ? <Ring value={ring.value} size={40} stroke={4} label={ring.label} /> : null}
      </div>
    </div>
  );
}

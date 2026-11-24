import { useRef, type ComponentType } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/lib/motion";
import { toneSurface, type Tone } from "@/components/ui/tones";
import { Sparkline } from "./Sparkline";
import { Ring } from "./Ring";

interface Props {
  label: string;
  value: number;
  format: (n: number) => string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  tone: Tone;
  /** Percent change against the previous period. null hides the chip. */
  delta?: number | null;
  /** Sparkline series (oldest to newest). */
  series?: number[];
  /** Progress ring from 0 to 1, with a short label for screen readers. */
  ring?: { value: number; label: string };
}

export function KpiCard({ label, value, format, hint, icon: Icon, tone, delta, series, ring }: Props) {
  const num = useRef<HTMLDivElement>(null);
  useCountUp(num, value, format);
  const up = (delta ?? 0) >= 0;

  return (
    <div data-kpi className={cn("flex min-w-0 flex-col justify-between gap-2 rounded-2xl p-3.5 shadow-card", toneSurface[tone])}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium opacity-90"><Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /><span className="truncate">{label}</span></div>
          <div ref={num} className="mt-1.5 whitespace-nowrap text-lg font-semibold tabular-nums tracking-tight sm:text-2xl">{format(value)}</div>
        </div>
        {ring && <div className="hidden min-[440px]:block"><Ring value={ring.value} label={ring.label} /></div>}
      </div>
      <div className="flex items-center gap-2 text-xs">
        {delta != null && Number.isFinite(delta) && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-background/60 px-1.5 py-0.5 font-semibold">
            {up ? <ArrowUpRight className="h-3 w-3" aria-hidden /> : <ArrowDownRight className="h-3 w-3" aria-hidden />}
            {Math.abs(Math.round(delta))}%<span className="sr-only"> {up ? "up" : "down"} on the previous 14 days</span>
          </span>
        )}
        <span className="truncate opacity-90">{hint}</span>
      </div>
      {series && series.length > 1 && <Sparkline data={series} label={`${label}, last ${series.length} days`} />}
    </div>
  );
}

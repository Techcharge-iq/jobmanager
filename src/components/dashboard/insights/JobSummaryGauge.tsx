import { useMemo, useRef } from "react";
import type { Job } from "@/pages/Index";
import { DashPanel } from "@/components/dashboard/DashPanel";
import { cn } from "@/lib/utils";
import { gsap, useCountUp, useGSAP, useMotionOK } from "@/lib/motion";

const GROUPS = [
  { label: "Pending", color: "#f59e0b", statuses: ["pending"] },
  { label: "Designing", color: "#8b5cf6", statuses: ["designing"] },
  { label: "In progress", color: "#0ea5e9", statuses: ["in-progress"] },
  { label: "Out / FOC", color: "#f97316", statuses: ["out", "foc_sample"] },
  { label: "Ready to bill", color: "#10b981", statuses: ["completed", "finished"] },
];

const CX = 100, CY = 100, R = 82;
const point = (a: number) => [CX + R * Math.cos(a), CY + R * Math.sin(a)];
const arc = (from: number, to: number) => {
  const [x0, y0] = point(from);
  const [x1, y1] = point(to);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${to - from > Math.PI ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

/** Semicircle gauge of open jobs by status. Hand-built SVG, drawn in by GSAP. */
export function JobSummaryGauge({ jobs, className }: { jobs: Job[]; className?: string }) {
  const rows = useMemo(() => GROUPS.map((g) => ({ ...g, count: jobs.filter((j) => g.statuses.includes(j.status)).length })), [jobs]);
  const total = rows.reduce((a, r) => a + r.count, 0);

  const segments = useMemo(() => {
    let cursor = Math.PI;
    return rows.filter((r) => r.count > 0).map((r) => {
      const span = (r.count / total) * Math.PI;
      const gap = Math.min(0.05, span / 3);
      const seg = { color: r.color, d: arc(cursor + gap / 2, cursor + span - gap / 2) };
      cursor += span;
      return seg;
    });
  }, [rows, total]);

  const svg = useRef<SVGSVGElement>(null);
  const num = useRef<HTMLDivElement>(null);
  const ok = useMotionOK();
  useCountUp(num, total, (n) => String(Math.round(n)));
  useGSAP(() => {
    if (!ok.current || !svg.current) return;
    gsap.fromTo(svg.current.querySelectorAll("path[data-seg]"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.6, ease: "power2.out", stagger: 0.06 });
  }, { scope: svg, dependencies: [total] });

  return (
    <DashPanel title="Jobs by status" className={className} action={<span className="text-xs text-muted-foreground">open jobs</span>} bodyClassName="flex flex-col gap-2 overflow-hidden p-3">
      <div className="relative mx-auto w-full max-w-[11rem] shrink-0">
        <svg ref={svg} viewBox="0 0 200 108" role="img" aria-label={`${total} open jobs: ${rows.map((r) => `${r.count} ${r.label}`).join(", ")}`} className="w-full overflow-visible">
          <path d={arc(Math.PI, 2 * Math.PI)} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={16} strokeLinecap="round" />
          {segments.map((s) => (
            <path key={s.color} data-seg d={s.d} pathLength={1} strokeDasharray={1} strokeDashoffset={0} fill="none" stroke={s.color} strokeWidth={16} strokeLinecap="round" />
          ))}
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <div ref={num} className="text-2xl font-semibold tabular-nums leading-none tracking-tight">{total}</div>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
            <span className="truncate text-muted-foreground">{r.label}</span>
            <span className="ms-auto font-semibold tabular-nums">{r.count}</span>
          </li>
        ))}
      </ul>
    </DashPanel>
  );
}

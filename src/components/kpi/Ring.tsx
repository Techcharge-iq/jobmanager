import { useRef } from "react";
import { gsap, useGSAP, useMotionOK } from "@/lib/motion";

interface Props { value: number; size?: number; stroke?: number; label: string }

/** Hand-built SVG progress ring (0 to 1). Lighter than a chart library. */
export function Ring({ value, size = 44, stroke = 5, label }: Props) {
  const arc = useRef<SVGCircleElement>(null);
  const ok = useMotionOK();
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  useGSAP(() => {
    if (!arc.current) return;
    if (!ok.current) { arc.current.style.strokeDashoffset = String(c * (1 - v)); return; }
    gsap.fromTo(arc.current, { strokeDashoffset: c }, { strokeDashoffset: c * (1 - v), duration: 1, ease: "power3.out" });
  }, { dependencies: [v] });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${Math.round(v * 100)}%`} className="shrink-0 -rotate-90 rtl:rotate-90 rtl:-scale-x-100">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.18} strokeWidth={stroke} />
      <circle ref={arc} cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c} />
    </svg>
  );
}

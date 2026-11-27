import { useRef } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { gsap, useGSAP, useMotionOK } from "@/lib/motion";

/** Tiny time series. Recharts draws it; GSAP reveals it. Color comes from the parent's text color. */
export function Sparkline({ data, label }: { data: number[]; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const ok = useMotionOK();
  useGSAP(() => {
    if (!ok.current || !box.current) return;
    const rtl = getComputedStyle(box.current).direction === "rtl";
    gsap.from(box.current, { clipPath: rtl ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)", duration: 0.9, ease: "power2.out", clearProps: "clipPath" });
  }, { scope: box });

  const points = data.map((v, i) => ({ i, v }));
  return (
    <div ref={box} role="img" aria-label={label} className="h-10 w-full text-current">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <Area type="monotone" dataKey="v" stroke="currentColor" strokeWidth={2} fill="currentColor" fillOpacity={0.14} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

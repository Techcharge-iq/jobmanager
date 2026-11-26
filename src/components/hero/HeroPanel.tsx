import { useRef } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { HeroAmbient } from "./HeroAmbient";
import { gsap, useGSAP, useMotionOK } from "@/lib/motion";

interface Props { title: string; subtitle: string; actionLabel: string; onAction: () => void }

/** One clear insight and one primary action. Vivid gradient, optional ambient WebGL layer behind. */
export function HeroPanel({ title, subtitle, actionLabel, onAction }: Props) {
  const root = useRef<HTMLElement>(null);
  const ok = useMotionOK();
  useGSAP(() => {
    if (!ok.current) return;
    gsap.from("[data-hero-in]", { opacity: 0, y: 12, duration: 0.5, ease: "power3.out", stagger: 0.08, clearProps: "opacity,transform" });
  }, { scope: root, dependencies: [title] });

  return (
    <section ref={root} aria-label="Today" className="relative isolate shrink-0 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-purple-600 to-fuchsia-600 p-5 text-white shadow-glass sm:p-7">
      <HeroAmbient className="absolute inset-0 -z-10" />
      <span aria-hidden className="pointer-events-none absolute -end-10 -top-16 -z-10 h-56 w-56 rounded-full bg-orange-400/50 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-20 start-1/3 -z-10 h-48 w-48 rounded-full bg-sky-400/40 blur-3xl" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p data-hero-in className="mb-1 hidden items-center gap-1.5 text-xs font-semibold text-white/90 sm:flex"><Sparkles className="h-3.5 w-3.5" aria-hidden />Today</p>
          <h2 data-hero-in className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
          <p data-hero-in className="mt-1 hidden text-sm text-white/90 sm:block">{subtitle}</p>
        </div>
        <button data-hero-in type="button" onClick={onAction} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-violet-800 shadow-lg transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-violet-700 active:scale-[0.98]">
          {actionLabel}<ArrowRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
        </button>
      </div>
    </section>
  );
}

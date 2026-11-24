import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroAmbient } from "./HeroAmbient";
import { gsap, useGSAP, useMotionOK } from "@/lib/motion";

interface Props { title: string; subtitle: string; actionLabel: string; onAction: () => void }

/** One clear insight and one primary action. Pastel base, optional ambient WebGL layer behind. */
export function HeroPanel({ title, subtitle, actionLabel, onAction }: Props) {
  const root = useRef<HTMLElement>(null);
  const ok = useMotionOK();
  useGSAP(() => {
    if (!ok.current) return;
    gsap.from("[data-hero-in]", { opacity: 0, y: 12, duration: 0.5, ease: "power3.out", stagger: 0.08, clearProps: "opacity,transform" });
  }, { scope: root, dependencies: [title] });

  return (
    <section ref={root} aria-label="Today" className="relative isolate shrink-0 overflow-hidden rounded-3xl bg-gradient-to-br from-lavender via-sky to-mint p-3 shadow-card sm:p-5">
      <HeroAmbient className="absolute inset-0 -z-10" />
      <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
        <div className="min-w-0">
          <p data-hero-in className="hidden text-xs font-medium text-muted-foreground sm:block">Today</p>
          <h2 data-hero-in className="text-h2 text-foreground">{title}</h2>
          <p data-hero-in className="hidden text-sm text-muted-foreground sm:block">{subtitle}</p>
        </div>
        <Button data-hero-in type="button" onClick={onAction} className="h-11 rounded-xl px-5">
          {actionLabel}<ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
        </Button>
      </div>
    </section>
  );
}

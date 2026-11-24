import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

// Register plugins once for the whole app.
gsap.registerPlugin(useGSAP);

export { gsap, useGSAP };

/**
 * Returns a ref that is true while the user allows motion.
 * Detection goes through gsap.matchMedia so every animation can simply check `ok.current`.
 */
export function useMotionOK() {
  const ok = useRef(typeof window === "undefined" || !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add({ ok: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
      ok.current = Boolean(ctx.conditions?.ok);
      return () => { ok.current = false; };
    });
    return () => mm.revert();
  }, []);
  return ok;
}

/** Counts a number up inside `ref` on mount and whenever `value` changes. Static under reduced motion. */
export function useCountUp(ref: RefObject<HTMLElement>, value: number, format: (n: number) => string) {
  const ok = useMotionOK();
  useGSAP(() => {
    const el = ref.current;
    if (!el) return;
    if (!ok.current) { el.textContent = format(value); return; }
    const state = { v: 0 };
    gsap.to(state, { v: value, duration: 0.9, ease: "power2.out", onUpdate: () => { el.textContent = format(state.v); } });
  }, { dependencies: [value] });
}

/** Staggered fade + rise for the direct children of a container. Re-runs when `key` changes (tab switch). */
export function useEnterStagger(scope: RefObject<HTMLElement>, selector: string, key: unknown) {
  const ok = useMotionOK();
  useGSAP(() => {
    if (!ok.current) return;
    gsap.from(selector, { opacity: 0, y: 14, duration: 0.42, ease: "power3.out", stagger: 0.06, clearProps: "opacity,transform" });
  }, { scope, dependencies: [key] });
}

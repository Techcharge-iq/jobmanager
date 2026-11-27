import { useEffect, type RefObject } from "react";

/** Scroll-linked depth effect: cards leaving the top of the container shrink and fade. */
export function useScrollDepth(ref: RefObject<HTMLElement>, active = true) {
  useEffect(() => {
    const root = ref.current;
    if (!root || !active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const box = root.getBoundingClientRect();
      const center = box.top + box.height * 0.52;
      const sway = window.innerWidth >= 640;
      root.querySelectorAll<HTMLElement>("[data-scroll-card]").forEach((card, i) => {
        const r = card.getBoundingClientRect();
        const n = Math.max(-1, Math.min(1, (r.top + r.height / 2 - center) / (box.height * 0.55 || 1)));
        const above = root.scrollTop > 4 && n < -0.25;
        const scale = above ? Math.max(0.92, 1 + n * 0.1) : 1 - Math.abs(n) * 0.02;
        const opacity = above ? Math.max(0.7, 1 + n * 0.6) : 1;
        const x = sway ? Math.sin((n + i * 0.4) * Math.PI) * 6 : 0;
        card.style.transform = `translate3d(${x.toFixed(1)}px,0,0) scale(${scale.toFixed(3)})`;
        card.style.opacity = opacity.toFixed(2);
      });
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    root.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      root.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref, active]);
}

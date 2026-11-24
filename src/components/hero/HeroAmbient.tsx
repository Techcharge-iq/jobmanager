import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const AmbientScene = lazy(() => import("./AmbientScene"));

class Quiet extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.info("Ambient scene disabled:", error.message); }
  render() { return this.state.failed ? null : this.props.children; }
}

function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Decorative 3D layer. Renders nothing (the CSS gradient behind it remains) when WebGL is
 * missing, motion is reduced, or the scene fails. Pauses when hidden or scrolled offscreen.
 */
export function HeroAmbient({ className }: { className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEnabled(!reduced.matches && webglAvailable());
    update();
    reduced.addEventListener("change", update);
    return () => reduced.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    io.observe(el);
    const onVis = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  return (
    <div ref={box} aria-hidden className={cn("pointer-events-none", className)}>
      {enabled && (
        <Quiet>
          <Suspense fallback={null}><AmbientScene active={visible && tabVisible} /></Suspense>
        </Quiet>
      )}
    </div>
  );
}

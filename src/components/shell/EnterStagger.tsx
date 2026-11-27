import { useRef, type ReactNode } from "react";
import { useEnterStagger } from "@/lib/motion";

/** Staggered fade + rise for the top-level sections of whatever page or tab it wraps. Remount (change key) to replay. */
export function EnterStagger({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEnterStagger(ref, ":scope > * > *", "mount");
  return <div ref={ref} className={className}>{children}</div>;
}

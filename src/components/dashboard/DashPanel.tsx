import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Dense card with a slim header. The body scrolls inside when the panel has a fixed height. */
export function DashPanel({ title, action, children, className, bodyClassName }: { title: string; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section aria-label={title} className={cn("flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-card", className)}>
      <header className="flex h-9 shrink-0 items-center justify-between gap-2 border-b px-3">
        <h2 className="text-[13px] font-semibold tracking-tight">{title}</h2>
        {action}
      </header>
      <div className={cn("min-h-0 flex-1 overflow-y-auto", bodyClassName)}>{children}</div>
    </section>
  );
}

import { useRef } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { gsap, useMotionOK } from "@/lib/motion";
import { visibleNav } from "@/components/shell/navItems";

interface Props {
  currentView: string;
  onNavigate: (view: string) => void;
  userRole: string;
  /** Views that currently have a tab open: shown as a small dot. */
  openViews?: Set<string>;
}

/** Compact primary-navigation dock. Neutral glass, tooltips for labels, a bar under the current page. */
export function FloatingDock({ currentView, onNavigate, userRole, openViews }: Props) {
  const navRef = useRef<HTMLElement>(null);
  const motionOK = useMotionOK();
  const items = visibleNav(userRole);

  const dockItems = () => Array.from(navRef.current?.querySelectorAll<HTMLElement>("[data-dock-item]") ?? []);
  const onPointerMove = (e: React.PointerEvent) => {
    if (!motionOK.current || e.pointerType !== "mouse") return;
    dockItems().forEach((el) => {
      const r = el.getBoundingClientRect();
      const d = Math.abs(e.clientX - (r.left + r.width / 2));
      const scale = 1 + 0.16 * Math.exp(-(d * d) / (2 * 40 * 40));
      gsap.to(el, { scale, duration: 0.15, ease: "power2.out", overwrite: "auto" });
    });
  };
  const onPointerLeave = () => dockItems().forEach((el) => gsap.to(el, { scale: 1, duration: 0.2, ease: "power2.out", overwrite: "auto" }));

  return (
    <TooltipProvider delayDuration={120}>
      <nav
        ref={navRef}
        aria-label="Main menu"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className="floating-dock glass fixed inset-x-0 z-40 mx-auto flex w-fit max-w-[calc(100vw-0.5rem)] items-center gap-0.5 rounded-2xl p-1"
      >
        {items.map(({ id, label, icon: Icon }) => {
          const current = currentView === id;
          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  data-dock-item
                  aria-label={label}
                  aria-current={current ? "page" : undefined}
                  onClick={() => onNavigate(id)}
                  className={cn(
                    "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground outline-none transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring max-[380px]:h-8 max-[380px]:w-8",
                    current && "bg-primary/10 text-primary hover:bg-primary/15",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                  {current && <span aria-hidden className="absolute inset-x-2.5 bottom-0.5 h-0.5 rounded-full bg-primary" />}
                  {!current && openViews?.has(id) && <span aria-hidden className="absolute bottom-0.5 h-1 w-1 rounded-full bg-muted-foreground/70" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={10}>{label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}

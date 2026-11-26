import { useEffect, useRef } from "react";
import { Plus, Receipt, Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { gsap, useMotionOK } from "@/lib/motion";
import { visibleNav } from "@/components/shell/navItems";

interface Props {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenPalette: () => void;
  onQuickInvoice: () => void;
  userRole: string;
  /** Views that currently have a tab open: shown as running-indicator dots. */
  openViews?: Set<string>;
  /** Changes every time a view is opened, to play the bounce on that icon. */
  bounce?: { view: string; n: number } | null;
}

const tileBase = "relative flex h-9 w-9 shrink-0 origin-bottom items-center justify-center rounded-xl max-[380px]:h-8 max-[380px]:w-8 text-white shadow-md outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:h-12 sm:w-12 sm:rounded-[15px]";

/** macOS-style dock: icons only, magnification on hover, dots for open tabs, bounce on open. */
export function FloatingDock({ currentView, onNavigate, onOpenPalette, onQuickInvoice, userRole, openViews, bounce }: Props) {
  const navRef = useRef<HTMLElement>(null);
  const motionOK = useMotionOK();
  const items = visibleNav(userRole);

  const dockItems = () => Array.from(navRef.current?.querySelectorAll<HTMLElement>("[data-dock-item]") ?? []);

  const onPointerMove = (e: React.PointerEvent) => {
    if (!motionOK.current || e.pointerType !== "mouse") return;
    dockItems().forEach((el) => {
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      const d = Math.abs(e.clientX - (r.left + r.width / 2));
      const scale = 1 + 0.65 * Math.exp(-(d * d) / (2 * 58 * 58));
      gsap.to(el, { scale, y: -(scale - 1) * 14, duration: 0.18, ease: "power3.out", overwrite: "auto" });
    });
  };
  const onPointerLeave = () => {
    dockItems().forEach((el) => gsap.to(el, { scale: 1, y: 0, duration: 0.6, ease: "elastic.out(1, 0.55)", overwrite: "auto" }));
  };

  useEffect(() => {
    if (!bounce || !motionOK.current) return;
    const el = navRef.current?.querySelector<HTMLElement>(`[data-dock-id="${bounce.view}"]`);
    if (!el) return;
    gsap.timeline().to(el, { y: -20, duration: 0.2, ease: "power2.out" }).to(el, { y: 0, duration: 0.75, ease: "bounce.out" });
  }, [bounce, motionOK]);

  const action = (label: string, onClick: () => void, tile: string, icon: React.ReactNode, extra?: string) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" data-dock-item aria-label={label} onClick={onClick} className={cn(tileBase, tile, extra)}>{icon}</button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={14}>{label}</TooltipContent>
    </Tooltip>
  );

  return (
    <TooltipProvider delayDuration={100}>
      <nav
        ref={navRef}
        aria-label="Main menu"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className="floating-dock glass fixed inset-x-0 z-40 mx-auto flex w-fit max-w-[calc(100vw-0.75rem)] items-end gap-0.5 rounded-[26px] px-1.5 pb-2 pt-1.5 sm:gap-2 sm:px-3"
      >
        {items.map(({ id, label, icon: Icon, tile }) => {
          const current = currentView === id;
          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  data-dock-item
                  data-dock-id={id}
                  aria-label={label}
                  aria-current={current ? "page" : undefined}
                  onClick={() => onNavigate(id)}
                  className={cn(tileBase, "bg-gradient-to-br", tile, current && "ring-2 ring-white/80 shadow-glow")}
                >
                  <Icon className="h-[18px] w-[18px] sm:h-[22px] sm:w-[22px]" aria-hidden />
                  {openViews?.has(id) && <span aria-hidden className="absolute inset-x-0 -bottom-2 mx-auto h-1 w-1 rounded-full bg-foreground/70" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={14}>{label}</TooltipContent>
            </Tooltip>
          );
        })}
        <div aria-hidden className="mx-0.5 mb-1 h-8 w-px shrink-0 self-end bg-border sm:mx-1 sm:h-10" />
        {action("Search or command (Ctrl K)", onOpenPalette, "bg-card text-foreground ring-1 ring-border", <Search className="h-5 w-5" aria-hidden />, "hidden sm:flex")}
        {action("Update invoice no. & value", onQuickInvoice, "bg-gradient-to-br from-cyan-400 to-emerald-600", <Receipt className="h-5 w-5" aria-hidden />)}
        {action("New job order", () => onNavigate("create"), "bg-gradient-to-br from-red-500 to-rose-600", <Plus className="h-6 w-6" aria-hidden />)}
      </nav>
    </TooltipProvider>
  );
}

import { useEffect, useRef } from "react";
import { Menu, Plus, Receipt, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

const item = "relative h-11 w-11 shrink-0 origin-bottom rounded-full p-0 text-muted-foreground hover:bg-muted hover:text-foreground";

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
      const scale = 1 + 0.5 * Math.exp(-(d * d) / (2 * 56 * 56));
      gsap.to(el, { scale, y: -(scale - 1) * 16, duration: 0.18, ease: "power3.out", overwrite: "auto" });
    });
  };
  const onPointerLeave = () => {
    dockItems().forEach((el) => gsap.to(el, { scale: 1, y: 0, duration: 0.55, ease: "elastic.out(1, 0.55)", overwrite: "auto" }));
  };

  useEffect(() => {
    if (!bounce || !motionOK.current) return;
    const el = navRef.current?.querySelector<HTMLElement>(`[data-dock-id="${bounce.view}"]`);
    if (!el || !el.getBoundingClientRect().width) return;
    gsap.timeline().to(el, { y: -18, duration: 0.2, ease: "power2.out" }).to(el, { y: 0, duration: 0.7, ease: "bounce.out" });
  }, [bounce, motionOK]);

  return (
    <TooltipProvider delayDuration={150}>
      <nav
        ref={navRef}
        aria-label="Main menu"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className="floating-dock glass fixed inset-x-0 z-40 mx-auto flex w-fit max-w-[calc(100vw-1rem)] items-center gap-0 rounded-full px-1 py-1.5 sm:gap-1 sm:px-2"
      >
        <div className="sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="All menu items" className={cn(item, "text-primary")}><Menu className="h-5 w-5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" sideOffset={12} className="max-h-[60dvh] w-60 overflow-y-auto">
              {items.map(({ id, label, icon: Icon }) => (
                <DropdownMenuItem key={id} onSelect={() => onNavigate(id)} className={cn("min-h-11 gap-3", currentView === id && "bg-primary/10 text-primary")}>
                  <Icon className="h-4 w-4" />{label}
                  {openViews?.has(id) && <span aria-label="Open in a tab" className="ms-auto h-1.5 w-1.5 rounded-full bg-muted-foreground" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="hidden items-center gap-1 sm:max-lg:flex">
          {items.map(({ id, label, icon: Icon }) => (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="icon" type="button" data-dock-item data-dock-id={id}
                  aria-label={label} aria-current={currentView === id ? "page" : undefined}
                  onClick={() => onNavigate(id)}
                  className={cn(item, currentView === id && "bg-primary/10 text-primary")}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {openViews?.has(id) && <span aria-hidden className="absolute inset-x-0 -bottom-1 mx-auto h-1 w-1 rounded-full bg-foreground/60" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
          <div className="mx-1 h-6 w-px shrink-0 bg-border" />
        </div>
        <Button variant="ghost" type="button" data-dock-item onClick={onOpenPalette} aria-label="Search or command" className={cn(item, "lg:hidden")}>
          <Search className="h-[18px] w-[18px]" />
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" type="button" data-dock-item aria-label="Update invoice" onClick={onQuickInvoice} className={item}><Receipt className="h-[18px] w-[18px]" /></Button>
          </TooltipTrigger>
          <TooltipContent>Update invoice no. & value</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" type="button" data-dock-item aria-label="New job order" onClick={() => onNavigate("create")} className="h-11 w-11 shrink-0 origin-bottom rounded-full"><Plus className="h-5 w-5" /></Button>
          </TooltipTrigger>
          <TooltipContent>New job order</TooltipContent>
        </Tooltip>
      </nav>
    </TooltipProvider>
  );
}

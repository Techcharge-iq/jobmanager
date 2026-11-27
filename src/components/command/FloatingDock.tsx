import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
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
  const items = visibleNav(userRole);

  return (
    <TooltipProvider delayDuration={120}>
      <nav
        aria-label="Main menu"
        className="floating-dock glass fixed inset-x-0 z-40 mx-auto flex w-fit max-w-[calc(100vw-1rem)] items-center gap-0.5 overflow-x-auto rounded-xl p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                    "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-[background-color,color,transform] duration-150 hover:-translate-y-0.5 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                    current && "bg-muted text-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
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

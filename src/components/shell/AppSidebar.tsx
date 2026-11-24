import { JobFlowLogo } from "@/components/brand/JobFlowMark";
import { cn } from "@/lib/utils";
import { visibleNav, type ViewId } from "./navItems";

interface Props {
  currentView: ViewId;
  openViews: Set<string>;
  userRole: string;
  onNavigate: (view: ViewId) => void;
}

/** Dark glass navigation rail for large screens. Smaller screens use the dock. */
export function AppSidebar({ currentView, openViews, userRole, onNavigate }: Props) {
  return (
    <aside aria-label="Primary" className="glass glass-dark hidden w-60 shrink-0 flex-col border-y-0 border-s-0 px-3 py-4 lg:flex">
      <div className="px-2 pb-5 text-white"><JobFlowLogo /></div>
      <nav className="flex flex-1 flex-col gap-1">
        {visibleNav(userRole).map(({ id, label, icon: Icon }) => {
          const active = currentView === id;
          return (
            <button
              key={id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onNavigate(id)}
              className={cn(
                "relative flex h-11 items-center gap-3 rounded-xl px-3 text-start text-sm font-medium outline-none transition-[background-color,color,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-ring",
                active ? "nav-glow bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
              <span className="truncate">{label}</span>
              {openViews.has(id) && !active && <span aria-label="Open in a tab" className="ms-auto h-1.5 w-1.5 rounded-full bg-sidebar-foreground/70" />}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

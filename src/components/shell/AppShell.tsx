import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { FloatingDock } from "@/components/command/FloatingDock";
import type { AppTab } from "@/hooks/useTabs";
import type { ViewId } from "./navItems";

interface Props {
  children: ReactNode;
  currentView: ViewId;
  userRole: string;
  tabs: AppTab[];
  activeId: string;
  onNavigate: (view: string) => void;
  onOpenPalette: () => void;
  onQuickInvoice: () => void;
  onActivateTab: (tab: AppTab) => void;
  onCloseTab: (id: string) => void;
  onCloseOthers: (id: string) => void;
  onTogglePin: (id: string) => void;
  onReorder: (fromId: string, toId: string) => void;
}

/** One compact top bar (tabs, search, actions), content, and a small primary-navigation dock. */
export function AppShell({ children, currentView, userRole, tabs, activeId, onNavigate, onOpenPalette, onQuickInvoice, onActivateTab, onCloseTab, onCloseOthers, onTogglePin, onReorder }: Props) {
  const openViews = new Set(tabs.filter((t) => t.kind === "view" && t.view).map((t) => t.view as string));
  return (
    <div className="app-wallpaper flex h-dvh flex-col overflow-hidden">
      <TopBar
        tabs={tabs} activeId={activeId}
        onActivateTab={onActivateTab} onCloseTab={onCloseTab} onCloseOthers={onCloseOthers} onTogglePin={onTogglePin} onReorder={onReorder}
        onOpenPalette={onOpenPalette} onCreateJob={() => onNavigate("create")} onQuickInvoice={onQuickInvoice}
      />
      <main id="main" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
      <FloatingDock currentView={currentView} onNavigate={onNavigate} userRole={userRole} openViews={openViews} />
    </div>
  );
}

import type { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { TabStrip } from "./TabStrip";
import { FloatingDock } from "@/components/command/FloatingDock";
import type { AppTab } from "@/hooks/useTabs";
import type { ViewId } from "./navItems";

interface Props {
  children: ReactNode;
  currentView: ViewId;
  userRole: string;
  tabs: AppTab[];
  activeId: string;
  bounce: { view: string; n: number } | null;
  onNavigate: (view: string) => void;
  onOpenPalette: () => void;
  onQuickInvoice: () => void;
  onActivateTab: (tab: AppTab) => void;
  onCloseTab: (id: string) => void;
  onCloseOthers: (id: string) => void;
  onTogglePin: (id: string) => void;
  onReorder: (fromId: string, toId: string) => void;
}

export function AppShell({ children, currentView, userRole, tabs, activeId, bounce, onNavigate, onOpenPalette, onQuickInvoice, onActivateTab, onCloseTab, onCloseOthers, onTogglePin, onReorder }: Props) {
  const openViews = new Set(tabs.filter((t) => t.kind === "view" && t.view).map((t) => t.view as string));
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <AppSidebar currentView={currentView} openViews={openViews} userRole={userRole} onNavigate={onNavigate} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenPalette={onOpenPalette} onCreateJob={() => onNavigate("create")} />
        <TabStrip tabs={tabs} activeId={activeId} onActivate={onActivateTab} onClose={onCloseTab} onCloseOthers={onCloseOthers} onTogglePin={onTogglePin} onReorder={onReorder} onNew={onOpenPalette} />
        <main id="main" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
      <FloatingDock currentView={currentView} onNavigate={onNavigate} onOpenPalette={onOpenPalette} onQuickInvoice={onQuickInvoice} userRole={userRole} openViews={openViews} bounce={bounce} />
    </div>
  );
}

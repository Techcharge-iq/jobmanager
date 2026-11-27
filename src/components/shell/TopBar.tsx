import { Plus, Receipt, Search, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { JobFlowMark } from "@/components/brand/JobFlowMark";
import { SyncStatusIndicator } from "@/components/ui/SyncStatusIndicator";
import { NotificationTray } from "@/components/NotificationTray";
import { UserProfileDropdown } from "@/components/user-profile/UserProfileDropdown";
import { TabStrip } from "./TabStrip";
import { useProfileHeader } from "./useProfileHeader";
import type { AppTab } from "@/hooks/useTabs";

interface Props {
  tabs: AppTab[];
  activeId: string;
  onActivateTab: (tab: AppTab) => void;
  onCloseTab: (id: string) => void;
  onCloseOthers: (id: string) => void;
  onTogglePin: (id: string) => void;
  onReorder: (fromId: string, toId: string) => void;
  onOpenPalette: () => void;
  onCreateJob: () => void;
  onQuickInvoice: () => void;
}

/** One compact row: brand, workspace tabs, search, quick actions, notifications, profile. */
export function TopBar({ tabs, activeId, onActivateTab, onCloseTab, onCloseOthers, onTogglePin, onReorder, onOpenPalette, onCreateJob, onQuickInvoice }: Props) {
  const profile = useProfileHeader();
  return (
    <header className="glass relative z-30 flex h-11 shrink-0 items-center gap-1 rounded-none border-x-0 border-t-0 px-2 md:gap-2 md:px-3">
      <div className="flex shrink-0 items-center" title="JobFlow" aria-label="JobFlow"><JobFlowMark className="h-6 w-6" /></div>
      <div aria-hidden className="hidden h-5 w-px shrink-0 bg-border md:block" />
      <TabStrip tabs={tabs} activeId={activeId} onActivate={onActivateTab} onClose={onCloseTab} onCloseOthers={onCloseOthers} onTogglePin={onTogglePin} onReorder={onReorder} onNew={onOpenPalette} />

      <div className="ms-auto flex shrink-0 items-center gap-0.5 md:gap-1">
        <Button type="button" variant="ghost" onClick={onOpenPalette} aria-label="Search or run a command" className="h-8 w-8 shrink-0 rounded-md p-0 text-muted-foreground hover:text-foreground lg:w-52 lg:justify-start lg:gap-2 lg:border lg:bg-muted/50 lg:px-2.5 lg:font-normal">
          <Search className="mx-auto h-4 w-4 shrink-0 lg:mx-0" />
          <span className="hidden truncate text-[13px] lg:inline">Search</span>
          <kbd className="ms-auto hidden rounded border bg-background px-1 text-[10px] font-medium lg:inline">Ctrl K</kbd>
        </Button>
        <SyncStatusIndicator showLabel={false} className="px-2 py-1" />
        <Button type="button" onClick={onCreateJob} className="hidden h-8 gap-1 rounded-md px-3 text-[13px] sm:inline-flex"><Plus className="h-4 w-4" />New job</Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" aria-label="Quick actions" className="h-8 w-8 rounded-md p-0 text-muted-foreground hover:text-foreground"><Zap className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onSelect={onQuickInvoice} className="gap-2"><Receipt className="h-4 w-4" />Update invoice no. & value</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <NotificationTray className="h-8 w-8 rounded-md" />
        <UserProfileDropdown userProfile={profile} />
      </div>
    </header>
  );
}

import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobFlowLogo } from "@/components/brand/JobFlowMark";
import { SyncStatusIndicator } from "@/components/ui/SyncStatusIndicator";
import { NotificationTray } from "@/components/NotificationTray";
import { UserProfileDropdown } from "@/components/user-profile/UserProfileDropdown";
import { useProfileHeader } from "./useProfileHeader";

interface Props { onOpenPalette: () => void; onCreateJob: () => void }

export function TopBar({ onOpenPalette, onCreateJob }: Props) {
  const profile = useProfileHeader();
  return (
    <header className="glass relative z-30 m-2 mb-0 flex h-14 shrink-0 items-center gap-2 rounded-2xl px-3 md:mx-4 md:mt-3 md:px-4">
      <div className="hidden shrink-0 sm:block"><JobFlowLogo /></div>
      <Button
        type="button"
        variant="ghost"
        onClick={onOpenPalette}
        aria-label="Search or run a command"
        className="h-10 min-w-0 flex-1 justify-start gap-2 rounded-xl bg-muted/70 px-3 text-sm font-normal text-muted-foreground hover:bg-muted sm:max-w-md sm:flex-none sm:basis-96 md:ms-3"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">Search jobs, pages, actions</span>
        <kbd className="ms-auto hidden rounded-md border bg-background px-1.5 py-0.5 text-[11px] font-medium sm:inline">Ctrl K</kbd>
      </Button>
      <div className="ms-auto flex items-center gap-1">
        <div className="hidden xl:block"><SyncStatusIndicator showLabel /></div>
        <Button type="button" onClick={onCreateJob} className="hidden h-10 rounded-xl sm:inline-flex"><Plus className="h-4 w-4" />New job</Button>
        <NotificationTray className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground" />
        <UserProfileDropdown userProfile={profile} />
      </div>
    </header>
  );
}

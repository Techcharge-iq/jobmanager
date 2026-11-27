import { useEffect } from "react";
import { useTheme } from "next-themes";
import type { Job } from "@/pages/Index";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { statusLabel } from "@/lib/status";
import { FileText, Moon, Plus, Receipt, X } from "lucide-react";
import type { AppTab } from "@/hooks/useTabs";
import { visibleNav } from "@/components/shell/navItems";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobs: Job[];
  tabs: AppTab[];
  activeId: string;
  userRole: string;
  onNavigate: (view: string) => void;
  onOpenJob: (job: Job) => void;
  onQuickInvoice: (job?: Job) => void;
  onActivateTab: (tab: AppTab) => void;
  onCloseActiveTab: () => void;
}

export function CommandPalette({ open, onOpenChange, jobs, tabs, activeId, userRole, onNavigate, onOpenJob, onQuickInvoice, onActivateTab, onCloseActiveTab }: Props) {
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const run = (fn: () => void) => { onOpenChange(false); fn(); };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search job numbers, customers, pages, or type a command…" />
      <CommandList>
        <CommandEmpty>Nothing found. Try a job number or customer name.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(() => onNavigate("create"))}><Plus className="me-2 h-4 w-4" />New job order</CommandItem>
          <CommandItem onSelect={() => run(() => onQuickInvoice())}><Receipt className="me-2 h-4 w-4" />Update invoice no. & value</CommandItem>
          <CommandItem value="toggle dark light theme mode" onSelect={() => run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}><Moon className="me-2 h-4 w-4" />{resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</CommandItem>
          {tabs.length > 0 && <CommandItem value="close current tab" onSelect={() => run(onCloseActiveTab)}><X className="me-2 h-4 w-4" />Close current tab</CommandItem>}
        </CommandGroup>
        {tabs.length > 1 && (
          <CommandGroup heading="Open tabs">
            {tabs.filter((t) => t.id !== activeId).map((t) => (
              <CommandItem key={t.id} value={`tab ${t.title}`} onSelect={() => run(() => onActivateTab(t))}><FileText className="me-2 h-4 w-4" />{t.title}</CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Go to">
          {visibleNav(userRole).map(({ id, label, icon: Icon }) => (
            <CommandItem key={id} value={`go ${label}`} onSelect={() => run(() => onNavigate(id))}><Icon className="me-2 h-4 w-4" />{label}</CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Job orders">
          {jobs.slice(0, 200).map((j) => (
            <CommandItem key={j.id} value={`${j.jobOrderNumber} ${j.customer} ${j.title}`} onSelect={() => run(() => onOpenJob(j))}>
              <span className="font-mono">{j.jobOrderNumber}</span>
              <span className="ms-2 truncate text-muted-foreground">{j.customer} · {j.title}</span>
              <button
                type="button"
                className="ms-auto rounded border px-1.5 text-xs text-muted-foreground hover:bg-muted"
                onClick={(e) => { e.stopPropagation(); run(() => onQuickInvoice(j)); }}
              >Invoice</button>
              <span className="ms-2 text-xs text-muted-foreground">{statusLabel(j.status)}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

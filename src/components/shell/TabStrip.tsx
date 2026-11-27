import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FileText, LayoutGrid, Pin, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { gsap, useMotionOK } from "@/lib/motion";
import type { AppTab } from "@/hooks/useTabs";
import { NAV_ITEMS } from "./navItems";

interface Props {
  tabs: AppTab[];
  activeId: string;
  onActivate: (tab: AppTab) => void;
  onClose: (id: string) => void;
  onCloseOthers: (id: string) => void;
  onTogglePin: (id: string) => void;
  onReorder: (fromId: string, toId: string) => void;
  onNew: () => void;
}

const tabIcon = (tab: AppTab) => (tab.kind === "job" ? FileText : NAV_ITEMS.find((n) => n.id === tab.view)?.icon ?? FileText);

interface SortableTabProps {
  tab: AppTab;
  active: boolean;
  tabIndex: number;
  register: (id: string, el: HTMLElement | null) => void;
  onActivate: (tab: AppTab) => void;
  onClose: (id: string) => void;
  onCloseOthers: (id: string) => void;
  onTogglePin: (id: string) => void;
  onlyTab: boolean;
}

function SortableTab({ tab, active, tabIndex, register, onActivate, onClose, onCloseOthers, onTogglePin, onlyTab }: SortableTabProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tab.id });
  const Icon = tabIcon(tab);
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={(el) => { setNodeRef(el); register(tab.id, el); }}
          role="presentation"
          style={{ transform: CSS.Transform.toString(transform ? { ...transform, y: 0, scaleX: 1, scaleY: 1 } : null), transition }}
          className={cn(
            "group relative flex shrink-0 animate-tab-in items-center rounded-md text-[13px] transition-colors duration-150",
            active
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            isDragging && "z-10 opacity-90 shadow-md",
          )}
        >
          <button
            type="button"
            {...attributes}
            {...listeners}
            role="tab"
            aria-selected={active}
            tabIndex={tabIndex}
            data-tab-id={tab.id}
            title={tab.title}
            onClick={() => onActivate(tab)}
            aria-keyshortcuts="Delete"
            onKeyDown={(e) => { if (e.key === "Delete") { e.preventDefault(); onClose(tab.id); } }}
            onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); onClose(tab.id); } }}
            className={cn("flex h-8 min-w-0 items-center gap-1.5 rounded-md ps-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring", tab.pinned ? "pe-3" : "pe-1", tab.pinned ? "w-9 justify-center ps-0 pe-0" : "max-w-[10rem]")}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {!tab.pinned && <span className="truncate font-medium">{tab.title}</span>}
            {tab.pinned && <Pin className="absolute end-1 top-1 h-2.5 w-2.5 text-brand" aria-hidden />}
          </button>
          {!tab.pinned && (
            <button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              onClick={() => onClose(tab.id)}
              className="me-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-70 hover:bg-muted hover:text-foreground hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => onTogglePin(tab.id)}>{tab.pinned ? "Unpin tab" : "Pin tab"}</ContextMenuItem>
        <ContextMenuItem onSelect={() => onClose(tab.id)}>Close tab</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled={onlyTab} onSelect={() => onCloseOthers(tab.id)}>Close other tabs</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function TabStrip({ tabs, activeId, onActivate, onClose, onCloseOthers, onTogglePin, onReorder, onNew }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<string, HTMLElement>());
  const motionOK = useMotionOK();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const activeTab = tabs.find((x) => x.id === activeId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const register = (id: string, el: HTMLElement | null) => { if (el) els.current.set(id, el); else els.current.delete(id); };

  // Sliding indicator under the active tab.
  useLayoutEffect(() => {
    const el = els.current.get(activeId);
    const bar = barRef.current;
    if (!el || !bar) return;
    const vars = { x: el.offsetLeft, width: el.offsetWidth };
    if (motionOK.current) gsap.to(bar, { ...vars, duration: 0.38, ease: "back.out(1.5)", overwrite: true });
    else gsap.set(bar, vars);
    el.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [activeId, tabs, motionOK]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const el = els.current.get(activeId);
      if (el && barRef.current) gsap.set(barRef.current, { x: el.offsetLeft, width: el.offsetWidth });
    });
    ro.observe(list);
    return () => ro.disconnect();
  }, [activeId]);

  const onDragEnd = ({ active, over }: DragEndEvent) => { if (over && active.id !== over.id) onReorder(String(active.id), String(over.id)); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const index = tabs.findIndex((t) => t.id === activeId);
    let next = -1;
    if (e.key === "ArrowRight") next = index + (rtl ? -1 : 1);
    else if (e.key === "ArrowLeft") next = index + (rtl ? 1 : -1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next < 0 || next >= tabs.length) return;
    e.preventDefault();
    onActivate(tabs[next]);
    requestAnimationFrame(() => els.current.get(tabs[next].id)?.querySelector<HTMLElement>('[role="tab"]')?.focus());
  };

  return (
    <div className="flex h-full min-w-0 flex-1 items-center gap-1">
      <div className="relative hidden h-full min-w-0 flex-1 md:block">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={tabs.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
            <div
              ref={listRef}
              role="tablist"
              aria-label="Open tabs"
              onKeyDown={onKeyDown}
              className="relative flex h-full items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {tabs.map((tab) => (
                <SortableTab
                  key={tab.id}
                  tab={tab}
                  active={tab.id === activeId}
                  tabIndex={tab.id === activeId ? 0 : -1}
                  register={register}
                  onActivate={onActivate}
                  onClose={onClose}
                  onCloseOthers={onCloseOthers}
                  onTogglePin={onTogglePin}
                  onlyTab={tabs.length < 2}
                />
              ))}
              <div ref={barRef} aria-hidden className="pointer-events-none absolute bottom-0 start-0 h-0.5 rounded-full bg-primary" style={{ width: 0 }} />
            </div>
          </SortableContext>
        </DndContext>
      </div>
      <Button type="button" variant="ghost" size="icon" className="hidden h-8 w-8 shrink-0 rounded-md md:inline-flex" aria-label="New tab (Ctrl+T or Alt+T)" onClick={onNew}>
        <Plus className="h-4 w-4" />
      </Button>
      <button
        type="button"
        aria-label={`${activeTab?.title ?? "Tabs"}, ${tabs.length} open. Switch tabs`}
        onClick={() => setSwitcherOpen(true)}
        className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-start text-sm font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring md:hidden"
      >
        <LayoutGrid className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate">{activeTab?.title}</span>
        <span className="ms-auto rounded bg-muted px-1.5 text-xs text-muted-foreground">{tabs.length}</span>
      </button>

      <Sheet open={switcherOpen} onOpenChange={setSwitcherOpen}>
        <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto rounded-t-xl">
          <SheetHeader><SheetTitle>Open tabs</SheetTitle></SheetHeader>
          <ul className="mt-4 space-y-2">
            {tabs.map((tab) => {
              const Icon = tabIcon(tab);
              return (
                <li key={tab.id} className={cn("flex items-center gap-2 rounded-2xl border p-1", tab.id === activeId ? "border-primary/40 bg-primary/5" : "border-border")}>
                  <button type="button" className="flex min-h-11 flex-1 items-center gap-3 rounded-xl px-3 text-start" onClick={() => { onActivate(tab); setSwitcherOpen(false); }}>
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate font-medium">{tab.title}</span>
                    {tab.pinned && <Pin className="h-3 w-3 text-brand" aria-label="Pinned" />}
                  </button>
                  <Button type="button" variant="ghost" size="icon" className="h-11 w-11" aria-label={`Close ${tab.title}`} onClick={() => onClose(tab.id)}><X className="h-4 w-4" /></Button>
                </li>
              );
            })}
          </ul>
          {tabs.length > 1 && (
            <Button type="button" variant="outline" className="mt-4 w-full" onClick={() => { onCloseOthers(activeId); setSwitcherOpen(false); }}>Close other tabs</Button>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

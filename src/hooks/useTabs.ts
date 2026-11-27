import { useCallback, useEffect, useRef, useState } from "react";
import { VIEW_META, type ViewId } from "@/components/shell/navItems";

export interface AppTab {
  id: string;
  kind: "view" | "job";
  view?: ViewId;
  jobId?: string;
  title: string;
  pinned?: boolean;
}

interface TabState { tabs: AppTab[]; activeId: string }

const MAX_TABS = 12;
const viewTab = (view: ViewId): AppTab => ({ id: `view:${view}`, kind: "view", view, title: VIEW_META[view].title });
const jobTab = (jobId: string, title = "Job order"): AppTab => ({ id: `job:${jobId}`, kind: "job", jobId, title });
const normalize = (tabs: AppTab[]) => [...tabs.filter((t) => t.pinned), ...tabs.filter((t) => !t.pinned)];
const initial = (): TabState => ({ tabs: [viewTab("dashboard")], activeId: "view:dashboard" });

const isValid = (value: unknown): value is AppTab => {
  if (!value || typeof value !== "object") return false;
  const tab = value as Partial<AppTab>;
  if (
    typeof tab.id !== "string" ||
    typeof tab.title !== "string" ||
    (tab.pinned !== undefined && typeof tab.pinned !== "boolean")
  ) return false;
  if (tab.kind === "view") {
    return typeof tab.view === "string" &&
      Object.prototype.hasOwnProperty.call(VIEW_META, tab.view) &&
      tab.id === `view:${tab.view}`;
  }
  return tab.kind === "job" &&
    typeof tab.jobId === "string" &&
    tab.jobId.length > 0 &&
    tab.id === `job:${tab.jobId}`;
};

interface LoadedTabs {
  state: TabState;
  persist: boolean;
}

function load(key: string): LoadedTabs {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { state: initial(), persist: true };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { state: initial(), persist: false };

    const data = parsed as { tabs?: unknown; activeId?: unknown };
    if (!Array.isArray(data.tabs)) return { state: initial(), persist: false };
    const seen = new Set<string>();
    const tabs = data.tabs.filter((tab): tab is AppTab => {
      if (!isValid(tab) || seen.has(tab.id)) return false;
      seen.add(tab.id);
      return true;
    });
    if (!tabs.length) return { state: initial(), persist: false };
    return {
      state: {
        tabs: normalize(tabs),
        activeId: typeof data.activeId === "string" && tabs.some((t) => t.id === data.activeId)
          ? data.activeId
          : tabs[0].id,
      },
      persist: true,
    };
  } catch {
    return { state: initial(), persist: false };
  }
}

export const tabUrl = (tab: AppTab) =>
  tab.kind === "job" ? `${VIEW_META.dashboard.path}?job=${encodeURIComponent(tab.jobId ?? "")}` : VIEW_META[tab.view ?? "dashboard"].path;

/** Open tabs live in localStorage only (per signed-in user). Nothing is sent to the server. */
export function useTabs(userId?: string) {
  const key = `jobflow:tabs:v1:${userId ?? "anon"}`;
  const initialLoad = useRef<LoadedTabs | null>(null);
  if (!initialLoad.current) initialLoad.current = load(key);
  const [state, setState] = useState<TabState>(initialLoad.current.state);
  const ref = useRef(state);
  const loadedKey = useRef(key);
  const canPersist = useRef(initialLoad.current.persist);

  const commit = useCallback((next: TabState, persist = true) => {
    ref.current = next;
    canPersist.current = persist;
    setState(next);
  }, []);

  useEffect(() => {
    if (loadedKey.current === key) return;
    loadedKey.current = key;
    const loaded = load(key);
    commit(loaded.state, loaded.persist);
  }, [key, commit]);

  useEffect(() => {
    if (loadedKey.current !== key || !canPersist.current || ref.current !== state) return;
    try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* storage unavailable */ }
  }, [key, state]);

  const add = useCallback((tab: AppTab) => {
    const s = ref.current;
    if (s.tabs.some((t) => t.id === tab.id)) { if (s.activeId !== tab.id) commit({ ...s, activeId: tab.id }); return; }
    const tabs = [...s.tabs, tab];
    while (tabs.length > MAX_TABS) {
      const i = tabs.findIndex((t) => !t.pinned && t.id !== tab.id && t.id !== s.activeId);
      if (i < 0) break;
      tabs.splice(i, 1);
    }
    commit({ tabs: normalize(tabs), activeId: tab.id });
  }, [commit]);

  const openView = useCallback((view: ViewId) => add(viewTab(view)), [add]);
  const openJob = useCallback((jobId: string, title?: string) => add(jobTab(jobId, title)), [add]);
  const activate = useCallback((id: string) => {
    const s = ref.current;
    if (s.tabs.some((t) => t.id === id) && s.activeId !== id) commit({ ...s, activeId: id });
  }, [commit]);

  /** Closes a tab and returns the tab that becomes active, so the caller can sync the URL. */
  const close = useCallback((id: string): AppTab => {
    const s = ref.current;
    const index = s.tabs.findIndex((t) => t.id === id);
    if (index < 0) return s.tabs.find((t) => t.id === s.activeId) ?? s.tabs[0];
    let tabs = s.tabs.filter((t) => t.id !== id);
    if (!tabs.length) tabs = [viewTab("dashboard")];
    const activeId = s.activeId === id ? (tabs[index] ?? tabs[index - 1] ?? tabs[0]).id : s.activeId;
    commit({ tabs, activeId });
    return tabs.find((t) => t.id === activeId) ?? tabs[0];
  }, [commit]);

  const closeOthers = useCallback((id: string): AppTab => {
    const s = ref.current;
    const tabs = s.tabs.filter((t) => t.pinned || t.id === id);
    commit({ tabs, activeId: id });
    return tabs.find((t) => t.id === id) ?? tabs[0];
  }, [commit]);

  const togglePin = useCallback((id: string) => {
    const s = ref.current;
    commit({ ...s, tabs: normalize(s.tabs.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t))) });
  }, [commit]);

  const reorder = useCallback((fromId: string, toId: string) => {
    const s = ref.current;
    const from = s.tabs.findIndex((t) => t.id === fromId);
    const to = s.tabs.findIndex((t) => t.id === toId);
    if (from < 0 || to < 0 || from === to) return;
    const tabs = [...s.tabs];
    const [moved] = tabs.splice(from, 1);
    tabs.splice(to, 0, moved);
    commit({ ...s, tabs: normalize(tabs) });
  }, [commit]);

  const syncJobTitles = useCallback((jobs: { id: string; jobOrderNumber: string }[]) => {
    const s = ref.current;
    const byId = new Map(jobs.map((j) => [j.id, j.jobOrderNumber]));
    let changed = false;
    const tabs = s.tabs.map((t) => {
      const title = t.kind === "job" && t.jobId ? byId.get(t.jobId) : undefined;
      if (title && title !== t.title) { changed = true; return { ...t, title }; }
      return t;
    });
    if (changed) commit({ ...s, tabs });
  }, [commit]);

  const activeTab = state.tabs.find((t) => t.id === state.activeId) ?? state.tabs[0];
  return { tabs: state.tabs, activeId: state.activeId, activeTab, openView, openJob, activate, close, closeOthers, togglePin, reorder, syncJobTitles };
}

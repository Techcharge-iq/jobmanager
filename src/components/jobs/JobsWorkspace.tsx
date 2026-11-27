import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { endOfWeek, format, isBefore, startOfDay } from "date-fns";
import { Columns3, ListFilter, Search, Table2, X } from "lucide-react";
import type { Job } from "@/pages/Index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { jobProgress } from "@/lib/jobStages";
import { STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";
import { formatOmaniRial } from "@/utils/currency";

type View = "board" | "table";
interface Filters { q: string; status: string; priority: string; staff: string; customer: string; deadline: string; sort: string }
const EMPTY: Filters = { q: "", status: "all", priority: "all", staff: "all", customer: "all", deadline: "all", sort: "newest" };
const VIEW_KEY = "jobflow:jobs-view";
const STEP = 25;

const COLUMNS = [
  { key: "pending", label: "Pending", statuses: ["pending"], dot: "bg-amber-500" },
  { key: "design", label: "Design", statuses: ["designing"], dot: "bg-violet-500" },
  { key: "production", label: "Production", statuses: ["in-progress", "out", "foc_sample"], dot: "bg-sky-500" },
  { key: "bill", label: "Ready to bill", statuses: ["completed", "finished"], dot: "bg-teal-500" },
  { key: "invoiced", label: "Invoiced", statuses: ["invoiced"], dot: "bg-slate-500" },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled"], dot: "bg-rose-500" },
];

const staffOf = (j: Job) => [j.designer, j.assignee, j.salesman].filter((n): n is string => !!n && n !== "Unassigned");
const initials = (name: string) => name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
const dueDate = (j: Job) => { const d = j.dueDate ? new Date(j.dueDate) : null; return d && !Number.isNaN(d.getTime()) ? d : null; };
const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

function Staff({ job }: { job: Job }) {
  const names = staffOf(job);
  if (!names.length) return <span className="text-xs text-muted-foreground">Unassigned</span>;
  return (
    <span className="flex items-center gap-1.5" title={names.join(", ")}>
      <span aria-hidden className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">{initials(names[0])}</span>
      <span className="truncate text-xs text-muted-foreground">{names[0]}{names.length > 1 ? ` +${names.length - 1}` : ""}</span>
    </span>
  );
}

function Progress({ status }: { status: string }) {
  const value = jobProgress(status);
  return (
    <span className="flex items-center gap-2" title={`${value}% through the workflow`}>
      <span className="h-1 w-14 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${value}%` }} /></span>
      <span className="text-[11px] tabular-nums text-muted-foreground">{value}%</span>
    </span>
  );
}

function Deadline({ job }: { job: Job }) {
  const d = dueDate(job);
  if (!d) return <span className="text-xs text-muted-foreground">No date</span>;
  const overdue = isBefore(d, startOfDay(new Date())) && !["completed", "finished", "invoiced", "cancelled"].includes(job.status);
  return <span className={cn("text-xs tabular-nums", overdue ? "font-semibold text-rose-600 dark:text-rose-300" : "text-muted-foreground")}>{overdue ? "Overdue " : ""}{format(d, "d MMM")}</span>;
}

function FilterFields({ f, set, staff, customers }: { f: Filters; set: (p: Partial<Filters>) => void; staff: string[]; customers: string[] }) {
  const trigger = "h-8 w-full min-w-[8.5rem] text-[13px]";
  const field = (label: string, value: string, key: keyof Filters, options: [string, string][]) => (
    <div className="min-w-0">
      <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={(v) => set({ [key]: v })}>
        <SelectTrigger className={trigger} aria-label={label}><SelectValue /></SelectTrigger>
        <SelectContent className="max-h-72">{options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
  return (
    <>
      {field("Status", f.status, "status", [["all", "All statuses"], ...Object.entries(STATUS_META).map(([k, m]) => [k, m.label] as [string, string])])}
      {field("Priority", f.priority, "priority", [["all", "Any priority"], ["high", "High"], ["medium", "Medium"], ["low", "Low"]])}
      {field("Assigned staff", f.staff, "staff", [["all", "Anyone"], ...staff.map((n) => [n, n] as [string, string])])}
      {field("Customer", f.customer, "customer", [["all", "All customers"], ...customers.map((n) => [n, n] as [string, string])])}
      {field("Deadline", f.deadline, "deadline", [["all", "Any deadline"], ["overdue", "Overdue"], ["week", "Due this week"], ["none", "No deadline"]])}
      {field("Sort by", f.sort, "sort", [["newest", "Newest first"], ["deadline", "Deadline, soonest"], ["priority", "Priority"]])}
    </>
  );
}

export function JobsWorkspace({ jobs, loading, onOpenJob }: { jobs: Job[]; loading: boolean; onOpenJob: (job: Job) => void }) {
  const [view, setView] = useState<View>(() => { try { return localStorage.getItem(VIEW_KEY) === "table" ? "table" : "board"; } catch { return "board"; } });
  const [f, setF] = useState<Filters>(EMPTY);
  const [sheet, setSheet] = useState(false);
  const [limits, setLimits] = useState<Record<string, number>>({});
  const q = useDeferredValue(f.q);
  const set = (p: Partial<Filters>) => { setF((s) => ({ ...s, ...p })); setLimits({}); };
  useEffect(() => { try { localStorage.setItem(VIEW_KEY, view); } catch { /* storage unavailable */ } }, [view]);

  const { staff, customers } = useMemo(() => ({
    staff: [...new Set(jobs.flatMap(staffOf))].sort((a, b) => a.localeCompare(b)),
    customers: [...new Set(jobs.map((j) => j.customer).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
  }), [jobs]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const today = startOfDay(new Date());
    const weekEnd = endOfWeek(today, { weekStartsOn: 6 });
    const list = jobs.filter((j) => {
      if (f.status !== "all" && j.status !== f.status) return false;
      if (f.priority !== "all" && j.priority !== f.priority) return false;
      if (f.staff !== "all" && !staffOf(j).includes(f.staff)) return false;
      if (f.customer !== "all" && j.customer !== f.customer) return false;
      if (f.deadline !== "all") {
        const d = dueDate(j);
        if (f.deadline === "none") return !d;
        if (!d) return false;
        const open = !["completed", "finished", "invoiced", "cancelled"].includes(j.status);
        if (f.deadline === "overdue" && !(open && isBefore(d, today))) return false;
        if (f.deadline === "week" && !(d >= today && d <= weekEnd)) return false;
      }
      return !needle || `${j.jobOrderNumber} ${j.title} ${j.customer}`.toLowerCase().includes(needle);
    });
    const sorters: Record<string, (a: Job, b: Job) => number> = {
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
      deadline: (a, b) => (a.dueDate || "9").localeCompare(b.dueDate || "9"),
      priority: (a, b) => (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3) || b.createdAt.localeCompare(a.createdAt),
    };
    return list.sort(sorters[f.sort] ?? sorters.newest);
  }, [jobs, f, q]);

  const active = (Object.keys(EMPTY) as (keyof Filters)[]).filter((k) => k !== "sort" && f[k] !== EMPTY[k]).length;
  const columns = COLUMNS.map((c) => ({ ...c, list: filtered.filter((j) => c.statuses.includes(j.status)) })).filter((c) => c.key !== "cancelled" || c.list.length > 0);
  const tableLimit = limits.table ?? 50;

  const card = (j: Job) => (
    <button key={j.id} type="button" onClick={() => onOpenJob(j)} className="block w-full rounded-lg border bg-card p-2.5 text-start shadow-card transition-[box-shadow,border-color] duration-150 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-muted-foreground">{j.jobOrderNumber}</span>
        {j.priority === "high" && <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-300">High</span>}
      </div>
      <p className="mt-0.5 line-clamp-2 text-[13px] font-medium leading-snug">{j.title}</p>
      <p className="truncate text-xs text-muted-foreground">{j.customer}</p>
      <div className="mt-2 flex items-center justify-between gap-2"><Staff job={j} /><Deadline job={j} /></div>
      <div className="mt-2"><Progress status={j.status} /></div>
    </button>
  );

  if (loading && jobs.length === 0) {
    return <div role="status" aria-label="Loading jobs" className="space-y-3 p-4"><Skeleton className="h-9 w-full" /><div className="grid gap-3 md:grid-cols-4"><Skeleton className="h-72" /><Skeleton className="h-72" /><Skeleton className="h-72" /><Skeleton className="h-72" /></div></div>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-2 pt-2 md:px-4">
      <div className="flex shrink-0 flex-wrap items-end gap-2">
        <div role="group" aria-label="View" className="inline-flex rounded-lg bg-muted p-0.5">
          {([["board", "Board", Columns3], ["table", "Table", Table2]] as const).map(([v, label, Icon]) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={cn("inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <Icon className="h-3.5 w-3.5" aria-hidden />{label}
            </button>
          ))}
        </div>
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search job no., title, customer" aria-label="Search jobs" className="h-8 ps-8 text-[13px]" />
        </div>
        <Button type="button" variant="outline" className="h-8 gap-1.5 px-2.5 text-[13px] lg:hidden" onClick={() => setSheet(true)}><ListFilter className="h-3.5 w-3.5" />Filters{active > 0 && <span className="rounded bg-primary px-1 text-[10px] text-primary-foreground">{active}</span>}</Button>
        <div className="hidden min-w-0 flex-1 grid-cols-6 items-end gap-2 lg:grid"><FilterFields f={f} set={set} staff={staff} customers={customers} /></div>
        {(active > 0 || f.sort !== "newest") && <Button type="button" variant="ghost" className="h-8 gap-1 px-2 text-xs" onClick={() => { setF(EMPTY); setLimits({}); }}><X className="h-3.5 w-3.5" />Clear</Button>}
      </div>
      <p className="shrink-0 text-xs text-muted-foreground" role="status">{filtered.length.toLocaleString()} of {jobs.length.toLocaleString()} jobs</p>

      {filtered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">No jobs match these filters.</div>
      ) : view === "board" ? (
        <div className="-mx-3 flex min-h-0 flex-1 snap-x gap-2 overflow-x-auto px-3 pb-1 md:mx-0 md:px-0">
          {columns.map((c) => {
            const shown = limits[c.key] ?? STEP;
            return (
              <section key={c.key} aria-label={`${c.label}, ${c.list.length} jobs`} className="flex min-h-0 w-[80vw] shrink-0 snap-start flex-col rounded-xl bg-muted/50 p-1.5 sm:w-72 xl:min-w-0 xl:flex-1">
                <h2 className="flex items-center gap-2 px-1.5 py-1 text-[13px] font-semibold"><span aria-hidden className={cn("h-2 w-2 rounded-full", c.dot)} />{c.label}<span className="ms-auto text-xs font-normal tabular-nums text-muted-foreground">{c.list.length.toLocaleString()}</span></h2>
                <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-0.5">
                  {c.list.slice(0, shown).map(card)}
                  {c.list.length > shown && <Button type="button" variant="ghost" className="h-8 w-full text-xs" onClick={() => setLimits((l) => ({ ...l, [c.key]: shown + STEP }))}>Show {Math.min(STEP, c.list.length - shown)} more</Button>}
                  {c.list.length === 0 && <p className="px-2 py-6 text-center text-xs text-muted-foreground">Nothing here.</p>}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border bg-card shadow-card">
          <table className="hidden w-full min-w-[56rem] border-collapse text-[13px] md:table">
            <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground shadow-[0_1px_0_hsl(var(--border))]">
              <tr>{["Job", "Title", "Customer", "Status", "Priority", "Deadline", "Staff", "Progress", "Value"].map((h) => <th key={h} scope="col" className="h-9 px-3 text-start font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.slice(0, tableLimit).map((j) => (
                <tr key={j.id} onClick={() => onOpenJob(j)} className="cursor-pointer border-t transition-colors duration-150 hover:bg-muted/50">
                  <td className="px-3 py-2"><button type="button" onClick={(e) => { e.stopPropagation(); onOpenJob(j); }} className="font-mono text-xs underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none">{j.jobOrderNumber}</button></td>
                  <td className="max-w-[16rem] truncate px-3 py-2 font-medium">{j.title}</td>
                  <td className="max-w-[12rem] truncate px-3 py-2 text-muted-foreground">{j.customer}</td>
                  <td className="px-3 py-2"><StatusBadge status={j.status} /></td>
                  <td className={cn("px-3 py-2 text-xs capitalize", j.priority === "high" ? "font-semibold text-rose-600 dark:text-rose-300" : "text-muted-foreground")}>{j.priority}</td>
                  <td className="px-3 py-2"><Deadline job={j} /></td>
                  <td className="max-w-[10rem] px-3 py-2"><Staff job={j} /></td>
                  <td className="px-3 py-2"><Progress status={j.status} /></td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">{formatOmaniRial(Number(j.totalValue) || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="space-y-1.5 p-2 md:hidden">{filtered.slice(0, tableLimit).map(card)}</div>
          {filtered.length > tableLimit && <div className="border-t p-2 text-center"><Button type="button" variant="ghost" className="h-8 text-xs" onClick={() => setLimits((l) => ({ ...l, table: tableLimit + 50 }))}>Show 50 more ({(filtered.length - tableLimit).toLocaleString()} left)</Button></div>}
        </div>
      )}

      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-xl">
          <SheetHeader><SheetTitle>Filter jobs</SheetTitle></SheetHeader>
          <div className="mt-4 grid grid-cols-2 gap-3"><FilterFields f={f} set={set} staff={staff} customers={customers} /></div>
          <Button type="button" className="mt-4 w-full" onClick={() => setSheet(false)}>Show {filtered.length.toLocaleString()} jobs</Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}

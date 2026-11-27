import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { DashboardJob as Job } from "@/types/jobOrder";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Building,
  Calendar,
  Clock,
  Edit,
  Eye,
  FileText,
  RefreshCw,
  Search,
  User,
} from "lucide-react";
import { JobDetails } from "@/components/JobDetails";
import { JobImageGallery } from "@/components/image-upload/JobImageGallery";
import { JobOrderItemsForm } from "@/components/JobOrderItemsForm";
import { JobHistory } from "@/components/job-details/workspace/JobHistory";
import { JobNotes } from "@/components/job-details/workspace/JobNotes";
import { JobWorkflowTimeline } from "@/components/job-details/workspace/JobWorkflowTimeline";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatOmaniRial } from "@/utils/currency";
import { cn } from "@/lib/utils";

export interface ApprovedJobsSliderProps {
  jobs: Job[];
  onStatusUpdate?: (jobId: string, status: string) => void;
  isSyncing?: boolean;
  isLoading?: boolean;
  onRefresh?: () => void | Promise<void>;
  isActive?: boolean;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
  { value: "designing", label: "Designing" },
  { value: "completed", label: "Completed" },
  { value: "finished", label: "Finished" },
  { value: "invoiced", label: "Invoiced" },
  { value: "cancelled", label: "Cancelled" },
];

const ROW_HEIGHT = 88;
const OVERSCAN = 8;

function DetailItem({ icon: Icon, label, value, sub }: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border bg-card px-3 py-2.5">
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="truncate text-sm font-medium">{value}</p>
          {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function VirtualJobList({ jobs, selectedId, resetKey, onSelect }: {
  jobs: Job[];
  selectedId: string | null;
  resetKey: string;
  onSelect: (job: Job) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(480);
  const selectedIndex = jobs.findIndex((job) => job.id === selectedId);
  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(jobs.length, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN);
  const visibleJobs = jobs.slice(start, end);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => setViewportHeight(viewport.clientHeight));
    observer.observe(viewport);
    setViewportHeight(viewport.clientHeight);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    viewportRef.current?.scrollTo({ top: 0, behavior: "auto" });
    setScrollTop(0);
  }, [resetKey]);

  const selectAt = (index: number) => {
    const job = jobs[index];
    if (!job) return;
    onSelect(job);
    viewportRef.current?.scrollTo({ top: index * ROW_HEIGHT, behavior: "auto" });
  };

  return (
    <div
      ref={viewportRef}
      role="listbox"
      tabIndex={0}
      aria-label="Approved jobs"
      aria-activedescendant={selectedId ? `approved-job-${encodeURIComponent(selectedId)}` : undefined}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      onKeyDown={(event) => {
        let next = selectedIndex;
        if (event.key === "ArrowDown") next = Math.min(jobs.length - 1, selectedIndex + 1);
        else if (event.key === "ArrowUp") next = Math.max(0, selectedIndex - 1);
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = jobs.length - 1;
        else return;
        event.preventDefault();
        selectAt(next);
      }}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {jobs.length === 0 ? (
        <div className="flex h-full min-h-32 items-center justify-center px-4 text-center text-sm text-muted-foreground">
          No jobs match the selected filters.
        </div>
      ) : (
        <div className="relative" style={{ height: jobs.length * ROW_HEIGHT }}>
          {visibleJobs.map((job, offset) => {
            const index = start + offset;
            const selected = job.id === selectedId;
            return (
              <div
                key={job.id}
                className="absolute inset-x-0 px-1 py-1"
                style={{ height: ROW_HEIGHT, top: index * ROW_HEIGHT }}
              >
                <button
                  id={`approved-job-${encodeURIComponent(job.id)}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  aria-posinset={index + 1}
                  aria-setsize={jobs.length}
                  tabIndex={-1}
                  onClick={() => onSelect(job)}
                  className={cn(
                    "flex h-full w-full flex-col justify-center gap-1 rounded-lg border px-3 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "border-primary/40 bg-primary/5 shadow-sm"
                      : "border-transparent hover:border-border hover:bg-muted/60",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 font-mono text-xs font-semibold">{job.jobOrderNumber}</span>
                    <span className="truncate text-xs text-muted-foreground">{job.title}</span>
                    <StatusBadge status={job.status} className="ms-auto shrink-0" />
                  </div>
                  <div className="flex min-w-0 items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{job.customer}</span>
                    <span className="shrink-0">{job.dueDate ? new Date(job.dueDate).toLocaleDateString() : "No deadline"}</span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ApprovedJobsSlider({
  jobs, onStatusUpdate, isSyncing = false, isLoading = false, onRefresh, isActive = true,
}: ApprovedJobsSliderProps) {
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedSalesman, setSelectedSalesman] = useState("all");
  const [selectedDesigner, setSelectedDesigner] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("approved");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(jobs[0]?.id ?? null);
  const [isJobDetailsOpen, setIsJobDetailsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const branches = useMemo(() => ["all", ...new Set(jobs.map((job) => job.branch).filter((value): value is string => Boolean(value)))], [jobs]);
  const salesmen = useMemo(() => ["all", ...new Set(jobs.map((job) => job.salesman).filter((value): value is string => Boolean(value)))].sort((a, b) => a === "all" ? -1 : b === "all" ? 1 : a.localeCompare(b)), [jobs]);
  const designers = useMemo(() => ["all", ...new Set(jobs.map((job) => job.designer).filter((value): value is string => Boolean(value)))].sort((a, b) => a === "all" ? -1 : b === "all" ? 1 : a.localeCompare(b)), [jobs]);
  const customers = useMemo(() => ["all", ...new Set(jobs.map((job) => job.customer).filter((value): value is string => Boolean(value)))].sort((a, b) => a === "all" ? -1 : b === "all" ? 1 : a.localeCompare(b)), [jobs]);
  const statuses = useMemo(() => ["all", ...new Set(["approved", ...jobs.map((job) => job.status).filter(Boolean)])], [jobs]);

  const filteredJobs = useMemo(() => {
    const terms = deferredSearchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return jobs.filter((job) => {
      const branchMatch = selectedBranch === "all" || job.branch === selectedBranch;
      const salesmanMatch = selectedSalesman === "all" || job.salesman === selectedSalesman;
      const designerMatch = selectedDesigner === "all" || job.designer === selectedDesigner;
      const customerMatch = selectedCustomer === "all" || job.customer === selectedCustomer;
      const statusMatch = selectedStatus === "all" ||
        (selectedStatus === "approved" ? job.approval_status === "approved" : job.status === selectedStatus);
      const searchable = [
        job.jobOrderNumber, job.title, job.customer, job.clientName,
        job.jobOrderDetails, job.assignee, job.salesman, job.designer,
      ].filter(Boolean).join(" ").toLowerCase();
      return branchMatch && salesmanMatch && designerMatch && customerMatch && statusMatch &&
        terms.every((term) => searchable.includes(term));
    });
  }, [jobs, selectedBranch, selectedSalesman, selectedDesigner, selectedCustomer, selectedStatus, deferredSearchQuery]);

  useEffect(() => {
    if (!filteredJobs.some((job) => job.id === selectedJobId)) {
      setSelectedJobId(filteredJobs[0]?.id ?? null);
      setMobileDetailOpen(false);
    }
  }, [filteredJobs, selectedJobId]);

  useEffect(() => {
    if (!isActive) {
      setIsJobDetailsOpen(false);
      setMobileDetailOpen(false);
    }
  }, [isActive]);

  const currentJob = filteredJobs.find((job) => job.id === selectedJobId) ?? null;
  const selectedIndex = filteredJobs.findIndex((job) => job.id === selectedJobId);
  const selectJob = useCallback((job: Job) => setSelectedJobId(job.id), []);
  const selectAt = (index: number) => {
    const job = filteredJobs[index];
    if (job) setSelectedJobId(job.id);
  };

  const filterSelect = (label: string, value: string, setValue: (value: string) => void, options: string[]) => (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger aria-label={label} className="h-8 min-w-0 flex-1 text-xs">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option === "all" ? (label === "Status" ? "All statuses" : `All ${label.toLowerCase()}s`) : option === "approved" ? "Approved" : option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const listPanel = (
    <Card className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="space-y-2 border-b p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Job orders</h2>
          <span className="text-xs tabular-nums text-muted-foreground">{filteredJobs.length.toLocaleString()}</span>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search number, title, customer…"
            aria-label="Search approved jobs"
            className="h-8 ps-8 text-xs"
          />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {filterSelect("Branch", selectedBranch, setSelectedBranch, branches)}
          {filterSelect("Salesman", selectedSalesman, setSelectedSalesman, salesmen)}
          {filterSelect("Designer", selectedDesigner, setSelectedDesigner, designers)}
          {filterSelect("Customer", selectedCustomer, setSelectedCustomer, customers)}
          <div className="col-span-2">{filterSelect("Status", selectedStatus, setSelectedStatus, statuses)}</div>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{selectedIndex >= 0 ? `Selected ${selectedIndex + 1} of ${filteredJobs.length}` : "No selection"}</span>
          {onRefresh && (
            <Button type="button" variant="ghost" size="sm" onClick={onRefresh} disabled={isSyncing || isLoading} className="h-7 px-2 text-xs">
              <RefreshCw className={cn("me-1 h-3.5 w-3.5", isSyncing && "animate-spin")} />
              Refresh
            </Button>
          )}
        </div>
      </div>
      <VirtualJobList
        jobs={filteredJobs}
        selectedId={selectedJobId}
        resetKey={`${selectedBranch}:${selectedSalesman}:${selectedDesigner}:${selectedCustomer}:${selectedStatus}:${deferredSearchQuery}`}
        onSelect={(job) => { selectJob(job); setMobileDetailOpen(true); }}
      />
      {filteredJobs.length > 1 && (
        <div className="flex shrink-0 items-center justify-between border-t px-3 py-1.5">
          <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => selectAt((selectedIndex - 1 + filteredJobs.length) % filteredJobs.length)}>
            <ArrowLeft className="me-1 h-3.5 w-3.5" />Previous
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">{selectedIndex + 1} / {filteredJobs.length}</span>
          <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => selectAt((selectedIndex + 1) % filteredJobs.length)}>
            Next<ArrowLeft className="ms-1 h-3.5 w-3.5 rotate-180 rtl:rotate-0" />
          </Button>
        </div>
      )}
    </Card>
  );

  const detailPanel = currentJob ? (
    <Card className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b p-3 md:p-4">
        <div className="flex min-w-0 items-start gap-2">
          <Button type="button" variant="ghost" size="icon" aria-label="Back to job list" className="h-8 w-8 shrink-0 lg:hidden" onClick={() => setMobileDetailOpen(false)}>
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-mono text-base font-semibold">{currentJob.jobOrderNumber}</h2>
              <StatusBadge status={currentJob.status} />
              {currentJob.approval_status && (
                <span className="rounded-full border px-2 py-0.5 text-[10px] capitalize text-muted-foreground">
                  {currentJob.approval_status.replace(/_/g, " ")}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-sm font-medium">{currentJob.title}</p>
            <p className="truncate text-xs text-muted-foreground">{currentJob.customer}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Select value={currentJob.status} onValueChange={(status) => onStatusUpdate?.(currentJob.id, status)}>
            <SelectTrigger aria-label="Update job status" className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" className="h-8 px-2.5" onClick={() => { setIsEditMode(false); setIsJobDetailsOpen(true); }}>
            <Eye className="me-1.5 h-3.5 w-3.5" />View
          </Button>
          <Button type="button" size="sm" className="h-8 px-2.5" onClick={() => { setIsEditMode(true); setIsJobDetailsOpen(true); }}>
            <Edit className="me-1.5 h-3.5 w-3.5" />Edit
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
        <section aria-label="Job workflow" className="mb-3 rounded-lg border bg-muted/20 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workflow</h3>
          <JobWorkflowTimeline job={currentJob} />
        </section>

        <Tabs defaultValue="overview" className="min-w-0">
          <TabsList aria-label="Job information" className="mb-3 h-9 max-w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview" className="px-2.5 text-xs">Overview</TabsTrigger>
            <TabsTrigger value="documents" className="px-2.5 text-xs">Documents</TabsTrigger>
            <TabsTrigger value="items" className="px-2.5 text-xs">Items</TabsTrigger>
            <TabsTrigger value="activity" className="px-2.5 text-xs">Activity</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-0 space-y-3">
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
              <DetailItem icon={Building} label="Customer" value={currentJob.customer || "—"} sub={currentJob.clientName || undefined} />
              <DetailItem icon={Building} label="Branch" value={currentJob.branch || "—"} />
              <DetailItem icon={User} label="Salesman" value={currentJob.salesman || "Unassigned"} />
              <DetailItem icon={User} label="Designer" value={currentJob.designer || "Unassigned"} />
              <DetailItem icon={Calendar} label="Deadline" value={currentJob.dueDate ? new Date(currentJob.dueDate).toLocaleDateString() : "—"} />
              <DetailItem icon={Clock} label="Estimated hours" value={String(currentJob.estimatedHours || 0)} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <section className="rounded-lg border bg-card p-3">
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Job details</h3>
                <p className="whitespace-pre-wrap text-sm">{currentJob.jobOrderDetails || <span className="text-muted-foreground">No job details recorded.</span>}</p>
              </section>
              <section className="rounded-lg border bg-card p-3">
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Financial</h3>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-xs text-muted-foreground">Total value</dt><dd className="font-medium">{formatOmaniRial(Number(currentJob.totalValue) || 0)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Invoice number</dt><dd className="truncate font-medium">{currentJob.invoiceNumber || "Not invoiced"}</dd></div>
                </dl>
              </section>
            </div>
            {(currentJob.approval_status || currentJob.approval_notes || currentJob.approved_at) && (
              <section className="rounded-lg border bg-card p-3">
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Approval</h3>
                <dl className="grid gap-2 text-sm sm:grid-cols-3">
                  <div><dt className="text-xs text-muted-foreground">Approval status</dt><dd className="font-medium capitalize">{currentJob.approval_status?.replace(/_/g, " ") || "Not recorded"}</dd></div>
                  {currentJob.approved_at && <div><dt className="text-xs text-muted-foreground">Approved at</dt><dd className="font-medium">{new Date(currentJob.approved_at).toLocaleString()}</dd></div>}
                  {currentJob.approved_by && <div><dt className="text-xs text-muted-foreground">Approver ID</dt><dd className="truncate font-medium">{currentJob.approved_by}</dd></div>}
                </dl>
                {currentJob.approval_notes && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{currentJob.approval_notes}</p>}
              </section>
            )}
          </TabsContent>
          <TabsContent value="documents" className="mt-0">
            <section className="rounded-lg border bg-card p-3">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4 text-muted-foreground" />Documents and artwork</h3>
              <JobImageGallery jobOrderId={currentJob.id} canEdit={false} />
            </section>
          </TabsContent>
          <TabsContent value="items" className="mt-0">
            <section className="rounded-lg border bg-card p-3">
              <JobOrderItemsForm jobOrderId={currentJob.id} readOnly />
            </section>
          </TabsContent>
          <TabsContent value="activity" className="mt-0 space-y-3">
            <section className="rounded-lg border bg-card p-3">
              <h3 className="mb-3 text-sm font-semibold">Notes</h3>
              <JobNotes jobId={currentJob.id} />
            </section>
            <section className="rounded-lg border bg-card p-3">
              <h3 className="mb-3 text-sm font-semibold">Edit history</h3>
              <JobHistory jobId={currentJob.id} jobOrderNumber={currentJob.jobOrderNumber} />
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  ) : (
    <Card className="hidden min-h-0 items-center justify-center lg:flex">
      <CardContent className="max-w-sm text-center">
        <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Select a job to inspect</p>
        <p className="mt-1 text-sm text-muted-foreground">Choose a job from the list to view its workflow and details.</p>
      </CardContent>
    </Card>
  );

  if (!filteredJobs.length && isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3 p-3 md:p-4">
        <PageHeader title="Approved Jobs" description="Loading locally available jobs…" />
        <div role="status" className="flex min-h-0 flex-1 items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground">
          <RefreshCw className="me-2 h-4 w-4 animate-spin" />Loading jobs
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3 md:p-4">
      <PageHeader title="Approved Jobs" description={`${filteredJobs.length.toLocaleString()} matching · ${jobs.length.toLocaleString()} available`} className="shrink-0" />
      {(isSyncing || isLoading) && (
        <div role="status" className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />{isLoading ? "Loading cached jobs…" : "Syncing latest jobs…"}
        </div>
      )}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(340px,390px)_minmax(0,1fr)]">
        <div className={cn("flex h-full min-h-0 flex-col", mobileDetailOpen && "hidden lg:flex")}>{listPanel}</div>
        <div className={cn("h-full min-h-0", !mobileDetailOpen && "hidden lg:block")}>{detailPanel}</div>
      </div>
      {currentJob && (
        <JobDetails
          isOpen={isActive && isJobDetailsOpen}
          onClose={() => setIsJobDetailsOpen(false)}
          job={currentJob}
          isEditMode={isEditMode}
        />
      )}
    </div>
  );
}

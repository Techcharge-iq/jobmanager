import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Job } from "@/pages/Index";
import { JobDetails } from "@/components/JobDetails";
import { JobStatusModal } from "@/components/JobStatusModal";
import { JobStatusOverview } from "@/components/dashboard/JobStatusOverview";
import { ApprovalBox } from "@/components/dashboard/ApprovalBox";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiStrip } from "@/components/command/KpiStrip";
import { RevenueTrend } from "@/components/dashboard/insights/RevenueTrend";
import { JobSummaryGauge } from "@/components/dashboard/insights/JobSummaryGauge";
import { ProductionPipeline, type PipelineRow } from "@/components/dashboard/insights/ProductionPipeline";
import { ActivityFeed, RecentJobs } from "@/components/dashboard/insights/JobLists";
import { useProfileHeader } from "@/components/shell/useProfileHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/shell/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { listPendingApprovalJobs } from "@/data/jobs";
import { AlertCircle, ArrowRight, CalendarClock, Receipt } from "lucide-react";

interface ModernDashboardProps {
  jobs: Job[];
  isActive?: boolean;
  onViewChange?: (view: string) => void;
  onOpenJob?: (job: Job) => void;
  onStatusUpdate?: (jobId: string, status: string) => void;
  quickWidget?: ReactNode;
}

type DashboardTab = "work" | "status" | "invoice";
type WorkQueue = "approvals" | "unapproved" | "urgent" | "production" | "invoice";

interface DashboardSummary {
  stats: {
    total: number;
    pending: number;
    inProgress: number;
    designing: number;
    completed: number;
    invoiced: number;
    cancelled: number;
  };
  statusCounts: Record<string, number>;
  pipeline: PipelineRow[];
  waitingInvoiceJobs: Job[];
  waitingInvoiceCount: number;
  waitingInvoiceValue: number;
  activeJobs: number;
  urgentJobs: Job[];
  urgentCount: number;
  highPriorityCount: number;
  overdueCount: number;
  unapprovedJobs: Job[];
  unapprovedCount: number;
  productionJobs: Job[];
  productionCount: number;
  recentJobs: Job[];
}

const CLOSED_STATUSES = new Set(["completed", "finished", "invoiced", "cancelled"]);
const ACTIVE_STATUSES = new Set(["pending", "in-progress", "designing", "out", "foc_sample"]);
const QUEUE_LIMIT = 8;
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const PIPELINE_STAGES: Array<{ label: string; statuses: string[]; bar: string }> = [
  { label: "Pending", statuses: ["pending"], bar: "bg-amber-500" },
  { label: "Design", statuses: ["designing"], bar: "bg-violet-500" },
  { label: "Production", statuses: ["in-progress", "out", "foc_sample"], bar: "bg-sky-500" },
  { label: "Ready to bill", statuses: ["completed", "finished"], bar: "bg-teal-500" },
];

function insertSortedLimit(list: Job[], job: Job, compare: (left: Job, right: Job) => number) {
  const index = list.findIndex((current) => compare(job, current) < 0);
  list.splice(index < 0 ? list.length : index, 0, job);
  if (list.length > QUEUE_LIMIT) list.pop();
}

function isPastDue(value: string, today: string, todayTime: number) {
  const dateOnly = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly < today;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return false;
  parsed.setHours(0, 0, 0, 0);
  return parsed.getTime() < todayTime;
}

function deriveDashboardSummary(jobs: Job[], now: number): DashboardSummary {
  const statusCounts: Record<string, number> = {};
  const pipelineValues = PIPELINE_STAGES.map((stage) => ({ ...stage, count: 0, value: 0 }));
  const stats: DashboardSummary["stats"] = {
    total: jobs.length,
    pending: 0,
    inProgress: 0,
    designing: 0,
    completed: 0,
    invoiced: 0,
    cancelled: 0,
  };
  const waitingInvoiceJobs: Job[] = [];
  const urgentJobs: Job[] = [];
  const unapprovedJobs: Job[] = [];
  const productionJobs: Job[] = [];
  const recentJobs: Job[] = [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const todayKey = dateKey(today);
  let activeJobs = 0;
  let waitingInvoiceCount = 0;
  let waitingInvoiceValue = 0;
  let urgentCount = 0;
  let highPriorityCount = 0;
  let overdueCount = 0;
  let unapprovedCount = 0;
  let productionCount = 0;

  const dueDateOrder = (left: Job, right: Job) =>
    (left.dueDate || "9999-12-31").localeCompare(right.dueDate || "9999-12-31");

  for (const job of jobs) {
    statusCounts[job.status] = (statusCounts[job.status] ?? 0) + 1;
    if (job.status === "pending") stats.pending += 1;
    if (job.status === "in-progress") stats.inProgress += 1;
    if (job.status === "designing") stats.designing += 1;
    if (job.status === "completed") stats.completed += 1;
    if (job.status === "invoiced") stats.invoiced += 1;
    if (job.status === "cancelled") stats.cancelled += 1;
    if (ACTIVE_STATUSES.has(job.status)) activeJobs += 1;

    const pipelineStage = pipelineValues.find((stage) => stage.statuses.includes(job.status));
    if (pipelineStage) {
      pipelineStage.count += 1;
      pipelineStage.value += Number(job.totalValue) || 0;
    }

    if (job.status === "completed" || job.status === "finished") {
      waitingInvoiceCount += 1;
      waitingInvoiceValue += Number(job.totalValue) || 0;
      insertSortedLimit(waitingInvoiceJobs, job, dueDateOrder);
    }

    const isOpen = !CLOSED_STATUSES.has(job.status);
    const isOverdue = isOpen && Boolean(job.dueDate) && isPastDue(job.dueDate, todayKey, today.getTime());
    if (isOverdue) {
      overdueCount += 1;
    }

    if (job.priority === "high" && isOpen) {
      highPriorityCount += 1;
    }
    if (isOpen && (job.priority === "high" || isOverdue)) {
      urgentCount += 1;
      insertSortedLimit(urgentJobs, job, dueDateOrder);
    }

    if (job.approval_status === "pending_approval") {
      unapprovedCount += 1;
      insertSortedLimit(unapprovedJobs, job, (left, right) => right.createdAt.localeCompare(left.createdAt));
    }

    const needsDesignAttention =
      job.approval_status !== "pending_approval" &&
      (job.status === "pending" || job.status === "designing");
    const needsExecutionAttention =
      job.status === "in-progress" || job.status === "out" || job.status === "foc_sample";
    if (needsDesignAttention || needsExecutionAttention) {
      productionCount += 1;
      insertSortedLimit(productionJobs, job, dueDateOrder);
    }

    insertSortedLimit(recentJobs, job, (left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  return {
    stats,
    statusCounts,
    pipeline: pipelineValues,
    waitingInvoiceJobs,
    waitingInvoiceCount,
    waitingInvoiceValue,
    activeJobs,
    urgentJobs,
    urgentCount,
    highPriorityCount,
    overdueCount,
    unapprovedJobs,
    unapprovedCount,
    productionJobs,
    productionCount,
    recentJobs,
  };
}

function QueueList({
  jobs,
  total,
  emptyMessage,
  onSelect,
}: {
  jobs: Job[];
  total: number;
  emptyMessage: string;
  onSelect: (job: Job) => void;
}) {
  if (total === 0) {
    return <p className="px-3 py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div>
      <ul className="divide-y">
        {jobs.map((job) => (
          <li key={job.id}>
            <button
              type="button"
              onClick={() => onSelect(job)}
              className="flex min-h-12 w-full min-w-0 items-center gap-2 px-3 py-2 text-start text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{job.jobOrderNumber}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{job.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {job.customer}{job.assignee && job.assignee !== "Unassigned" ? ` · ${job.assignee}` : ""}
                </span>
              </span>
              <StatusBadge status={job.status} className="hidden shrink-0 sm:inline-flex" />
              {job.dueDate && (
                <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground md:inline">
                  {new Date(`${job.dueDate.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {total > jobs.length && (
        <p className="border-t px-3 py-2 text-center text-xs text-muted-foreground">
          Showing {jobs.length} of {total} jobs
        </p>
      )}
    </div>
  );
}

function PriorityWorkCenter({
  active,
  queue,
  onQueueChange,
  summary,
  onOpenJob,
  onViewAll,
}: {
  active: boolean;
  queue: WorkQueue;
  onQueueChange: (queue: WorkQueue) => void;
  summary: DashboardSummary;
  onOpenJob: (job: Job) => void;
  onViewAll: () => void;
}) {
  return (
    <section id="priority-work-center" aria-label="Priority work center" className="scroll-mt-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Priority work center</h2>
          <p className="text-xs text-muted-foreground">Review queues and open a job to take action.</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onViewAll} className="h-8">
          All jobs <ArrowRight className="ms-1 h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden />
        </Button>
      </div>

      <Tabs value={queue} onValueChange={(value) => onQueueChange(value as WorkQueue)}>
        <TabsList aria-label="Work queues" className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-5">
          <TabsTrigger value="approvals" className="min-w-0 px-2 py-1.5 text-xs">Approvals</TabsTrigger>
          <TabsTrigger value="unapproved" className="min-w-0 px-2 py-1.5 text-xs">Unapproved</TabsTrigger>
          <TabsTrigger value="urgent" className="min-w-0 px-2 py-1.5 text-xs">Urgent</TabsTrigger>
          <TabsTrigger value="production" className="min-w-0 px-2 py-1.5 text-xs">Production</TabsTrigger>
          <TabsTrigger value="invoice" className="min-w-0 px-2 py-1.5 text-xs">Ready to invoice</TabsTrigger>
        </TabsList>
        <Card className="mt-2">
          <TabsContent value="approvals" className="m-0">
            <ApprovalBox isActive={active} />
          </TabsContent>
          <TabsContent value="unapproved" className="m-0">
            <CardContent className="p-0">
              <QueueList
                jobs={summary.unapprovedJobs}
                total={summary.unapprovedCount}
                emptyMessage="No jobs are waiting for approval."
                onSelect={onOpenJob}
              />
            </CardContent>
          </TabsContent>
          <TabsContent value="urgent" className="m-0">
            <CardContent className="p-0">
              <QueueList
                jobs={summary.urgentJobs}
                total={summary.urgentCount}
                emptyMessage="No open high-priority jobs."
                onSelect={onOpenJob}
              />
            </CardContent>
          </TabsContent>
          <TabsContent value="production" className="m-0">
            <CardContent className="p-0">
              <QueueList
                jobs={summary.productionJobs}
                total={summary.productionCount}
                emptyMessage="No production jobs need attention."
                onSelect={onOpenJob}
              />
            </CardContent>
          </TabsContent>
          <TabsContent value="invoice" className="m-0">
            <CardContent className="p-0">
              <QueueList
                jobs={summary.waitingInvoiceJobs}
                total={summary.waitingInvoiceCount}
                emptyMessage="No jobs are ready to invoice."
                onSelect={onOpenJob}
              />
            </CardContent>
          </TabsContent>
        </Card>
      </Tabs>
    </section>
  );
}

const alertButton =
  "inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ModernDashboard({ jobs, quickWidget, onOpenJob, onViewChange, isActive = true }: ModernDashboardProps) {
  const [tab, setTab] = useState<DashboardTab>("work");
  const [queue, setQueue] = useState<WorkQueue>("approvals");
  const profile = useProfileHeader();
  const { user } = useAuth();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isJobDetailsOpen, setIsJobDetailsOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<{
    status: "pending" | "in-progress" | "designing" | "completed" | "invoiced" | "total" | "active" | "cancelled";
    title: string;
  } | null>(null);

  const dashboard = useMemo(() => deriveDashboardSummary(jobs, Date.now()), [jobs]);
  const {
    data: pendingApprovalRecords,
    isError: approvalCountError,
    isLoading: approvalCountLoading,
    refetch: refetchApprovalCount,
  } = useQuery({
    queryKey: ["pending-approvals", user?.id],
    queryFn: listPendingApprovalJobs,
    enabled: Boolean(user) && isActive,
    staleTime: 30_000,
  });
  const pendingApprovals = pendingApprovalRecords?.length ?? dashboard.unapprovedCount;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = profile?.full_name?.split(" ")[0];

  useEffect(() => {
    if (!isActive) {
      setIsJobDetailsOpen(false);
      setStatusModalOpen(false);
    }
  }, [isActive]);

  const handleViewDetails = (job: Job) => {
    if (onOpenJob) {
      onOpenJob(job);
      return;
    }
    setSelectedJob(job);
    setIsJobDetailsOpen(true);
  };

  const handleStatusClick = (
    status: "pending" | "in-progress" | "designing" | "completed" | "invoiced" | "total" | "active" | "cancelled",
    title: string,
  ) => {
    setSelectedStatus({ status, title });
    setStatusModalOpen(true);
  };

  const goToWorkQueue = (nextQueue: WorkQueue) => {
    setTab("work");
    setQueue(nextQueue);
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    requestAnimationFrame(() => {
      document.getElementById("priority-work-center")?.scrollIntoView({ behavior, block: "start" });
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3 pt-2 text-sm md:px-4">
      <PageHeader
        title="Dashboard"
        description={`${greeting}${firstName ? `, ${firstName}` : ""} · ${new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}`}
        className="shrink-0"
      />

      <section aria-label="Operational alerts" className="flex shrink-0 flex-wrap items-center gap-1.5">
        {approvalCountError ? (
          <button
            type="button"
            onClick={() => void refetchApprovalCount()}
            className={`${alertButton} border-destructive/30 bg-destructive/5 text-destructive`}
          >
            <AlertCircle className="h-3.5 w-3.5" aria-hidden />
            Approval queue unavailable · Retry
          </button>
        ) : approvalCountLoading && pendingApprovalRecords === undefined ? (
          <span role="status" className="text-xs text-muted-foreground">Checking approval queue…</span>
        ) : pendingApprovals > 0 ? (
          <button
            type="button"
            onClick={() => goToWorkQueue("approvals")}
            className={`${alertButton} border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100 dark:hover:bg-amber-400/20`}
          >
            <AlertCircle className="h-3.5 w-3.5" aria-hidden />
            {pendingApprovals} awaiting approval
            <span className="font-semibold">Review</span>
          </button>
        ) : null}
        {dashboard.overdueCount > 0 && (
          <button
            type="button"
            onClick={() => goToWorkQueue("urgent")}
            className={`${alertButton} border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10`}
          >
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            {dashboard.overdueCount} overdue jobs
          </button>
        )}
        {dashboard.highPriorityCount > 0 && (
          <button
            type="button"
            onClick={() => goToWorkQueue("urgent")}
            className={`${alertButton} border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100 dark:hover:bg-amber-400/20`}
          >
            {dashboard.highPriorityCount} high-priority jobs
          </button>
        )}
        {dashboard.waitingInvoiceCount > 0 && (
          <button
            type="button"
            onClick={() => goToWorkQueue("invoice")}
            className={`${alertButton} bg-card hover:bg-muted`}
          >
            <Receipt className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            {dashboard.waitingInvoiceCount} ready to invoice
          </button>
        )}
      </section>

      <div className="shrink-0">
        <KpiStrip
          summary={{
            totalJobs: dashboard.stats.total,
            waitingInvoiceCount: dashboard.waitingInvoiceCount,
            waitingInvoiceValue: dashboard.waitingInvoiceValue,
            activeJobs: dashboard.activeJobs,
            urgentJobs: dashboard.highPriorityCount,
          }}
        />
      </div>

      <section id="dashboard-workspace" aria-label="Dashboard workspace" className="shrink-0 scroll-mt-2">
        <Tabs value={tab} onValueChange={(value) => setTab(value as DashboardTab)} className="flex flex-col">
          <TabsList aria-label="Dashboard panels" className="mb-2 grid h-9 w-full max-w-sm grid-cols-3 gap-0 p-1">
            <TabsTrigger value="work" className="h-full px-1 text-xs">Work</TabsTrigger>
            <TabsTrigger value="status" className="h-full px-1 text-xs">Status</TabsTrigger>
            <TabsTrigger value="invoice" className="h-full px-1 text-xs">Invoice</TabsTrigger>
          </TabsList>
          <TabsContent value="work" className="dashboard-workspace mt-0 space-y-3">
            <PriorityWorkCenter
              active={isActive}
              queue={queue}
              onQueueChange={setQueue}
              summary={dashboard}
              onOpenJob={handleViewDetails}
              onViewAll={() => onViewChange?.("jobs")}
            />
            <div className="grid min-w-0 gap-2 lg:h-[clamp(14rem,28vh,20rem)] lg:grid-cols-12">
              <RevenueTrend jobs={jobs} className="h-56 lg:col-span-5 lg:h-auto" />
              <JobSummaryGauge counts={dashboard.statusCounts} className="h-auto lg:col-span-3 lg:h-auto" />
              <ProductionPipeline rows={dashboard.pipeline} className="h-auto lg:col-span-4 lg:h-auto" />
            </div>
            <div className="grid min-w-0 gap-2 lg:grid-cols-12">
              <RecentJobs
                jobs={jobs}
                recentJobs={dashboard.recentJobs}
                onOpenJob={handleViewDetails}
                onViewAll={() => onViewChange?.("jobs")}
                className="lg:col-span-8"
              />
              <ActivityFeed active={isActive} limit={4} className="lg:col-span-4" />
            </div>
          </TabsContent>
          <TabsContent value="status" className="dashboard-workspace mt-0">
            <JobStatusOverview stats={dashboard.stats} onStatusClick={handleStatusClick} />
          </TabsContent>
          <TabsContent value="invoice" className="dashboard-workspace mt-0">{quickWidget}</TabsContent>
        </Tabs>
      </section>

      <JobDetails
        isOpen={isActive && isJobDetailsOpen}
        onClose={() => setIsJobDetailsOpen(false)}
        job={selectedJob}
      />

      <JobStatusModal
        isOpen={isActive && statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        jobs={jobs}
        status={selectedStatus?.status || "total"}
        title={selectedStatus?.title || "All"}
      />
    </div>
  );
}

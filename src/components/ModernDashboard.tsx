import { useEffect, useRef, useState, type ComponentType, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { Job } from "@/pages/Index";
import { JobDetails } from "@/components/JobDetails";
import { JobStatusModal } from "@/components/JobStatusModal";
import { JobStatusOverview } from "@/components/dashboard/JobStatusOverview";
import { ApprovalBox } from "@/components/dashboard/ApprovalBox";
import { HighPriorityReminder } from "@/components/dashboard/HighPriorityReminder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiStrip } from "@/components/command/KpiStrip";
import { RevenueTrend } from "@/components/dashboard/insights/RevenueTrend";
import { JobSummaryGauge } from "@/components/dashboard/insights/JobSummaryGauge";
import { ProductionPipeline } from "@/components/dashboard/insights/ProductionPipeline";
import { PriorityJobs, RecentJobs, ActivityFeed } from "@/components/dashboard/insights/JobLists";
import { useProfileHeader } from "@/components/shell/useProfileHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ReactNode } from "react";
import { useSlideDirection } from "@/hooks/useSlideDirection";
import { AlertCircle, ArrowRight, Palette, Cog, Receipt, UserRound, ChevronLeft, ChevronRight } from "lucide-react";

interface ModernDashboardProps {
  jobs: Job[];
  isActive?: boolean;
  onViewChange?: (view: string) => void;
  /** When provided, jobs open in their own tab instead of the dialog. */
  onOpenJob?: (job: Job) => void;
  onStatusUpdate?: (jobId: string, status: string) => void;
  quickWidget?: ReactNode;
}

interface WorkflowBucketProps {
  title: string;
  jobs: Job[];
  icon: ComponentType<{ className?: string }>;
  assigneeFor: (job: Job) => string;
  onSelect: (job: Job) => void;
}

function WorkflowBucket({
  title,
  jobs: bucketJobs,
  icon: Icon,
  assigneeFor,
  onSelect,
  animationDelay,
}: WorkflowBucketProps & { animationDelay: number }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const activePointerId = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const wheelDeltaX = useRef(0);
  const wheelTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(0, bucketJobs.length - 1)));
  }, [bucketJobs.length]);

  useEffect(() => () => {
    if (wheelTimeout.current) clearTimeout(wheelTimeout.current);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId.current || dragStartX.current === null) return;
      setDragOffset(event.clientX - dragStartX.current);
    };

    const finishDrag = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId.current || dragStartX.current === null) return;
      const distance = event.clientX - dragStartX.current;
      if (Math.abs(distance) > 60) {
        setActiveIndex((index) => {
          const nextIndex = Math.max(0, Math.min(bucketJobs.length - 1, index + (distance < 0 ? 1 : -1)));
          if (nextIndex !== index) suppressClick.current = true;
          return nextIndex;
        });
      }
      dragStartX.current = null;
      activePointerId.current = null;
      setDragOffset(0);
      setIsDragging(false);
    };

    const cancelDrag = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId.current) return;
      dragStartX.current = null;
      activePointerId.current = null;
      setDragOffset(0);
      setIsDragging(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", cancelDrag);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", cancelDrag);
    };
  }, [bucketJobs.length, isDragging]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary) return;
    dragStartX.current = event.clientX;
    activePointerId.current = event.pointerId;
    setIsDragging(true);
  };

  const handleWheel = (event: ReactWheelEvent<HTMLButtonElement>) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) || Math.abs(event.deltaX) < 5) return;
    event.preventDefault();
    wheelDeltaX.current += event.deltaX;
    if (wheelTimeout.current) clearTimeout(wheelTimeout.current);
    wheelTimeout.current = setTimeout(() => {
      if (Math.abs(wheelDeltaX.current) >= 30) {
        const direction = wheelDeltaX.current < 0 ? 1 : -1;
        setActiveIndex((index) => Math.max(0, Math.min(bucketJobs.length - 1, index + direction)));
      }
      wheelDeltaX.current = 0;
      wheelTimeout.current = null;
    }, 80);
  };

  const activeJob = bucketJobs[activeIndex];
  const slideDir = useSlideDirection(activeIndex);

  return (
    <Card className="dashboard-card-enter min-w-0" style={{ animationDelay: `${animationDelay}ms` }}>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 p-3 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{bucketJobs.length}</span>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {bucketJobs.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">Nothing waiting here.</p>
        ) : (
          <div className="mx-auto w-full max-w-2xl">
            <div className="relative h-36">
              {Array.from({ length: Math.min(3, bucketJobs.length) }, (_, index) => {
                const depth = Math.min(3, bucketJobs.length) - index - 1;
                return (
                  <div
                    key={`workflow-card-layer-${depth}`}
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-full rounded-lg border bg-card shadow-md transition-[transform,opacity] duration-300 ease-out motion-reduce:duration-0"
                    style={{
                      zIndex: index,
                      opacity: 1 - depth * 0.18,
                      transform: `translateY(${depth * 9}px) scale(${1 - depth * 0.025})`,
                    }}
                  />
                );
              })}
              <Button
                variant="ghost"
                key={activeJob?.id}
                type="button"
                onClick={(event) => {
                  if (suppressClick.current) {
                    suppressClick.current = false;
                    event.preventDefault();
                    return;
                  }
                  if (activeJob) onSelect(activeJob);
                }}
                onPointerDown={handlePointerDown}
                onWheel={handleWheel}
                className={`job-slide-${slideDir} absolute inset-x-0 top-0 z-10 flex h-full w-full flex-col items-start justify-between gap-2 whitespace-normal rounded-lg border bg-card p-3 text-start shadow-sm transition-[transform,opacity] duration-300 hover:bg-muted/30 motion-reduce:duration-0`}
                style={{
                  transform: `translateX(${dragOffset}px) rotate(${dragOffset / 35}deg)`,
                  transition: isDragging ? "none" : undefined,
                  touchAction: "pan-y",
                }}
              >
                {activeJob && (
                  <>
                    <span className="min-h-0 w-full min-w-0 space-y-1 overflow-y-auto break-words">
                      <span className="block font-mono text-sm font-semibold">{activeJob.jobOrderNumber}</span>
                      <span className="block text-sm">{activeJob.title}</span>
                      <span className="block text-xs text-muted-foreground">{activeJob.customer}</span>
                    </span>
                    <span className="flex w-full shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <UserRound className="h-3.5 w-3.5 shrink-0" />
                      <span className="break-words">{assigneeFor(activeJob)}</span>
                    </span>
                  </>
                )}
              </Button>
            </div>
            <div className="mt-3 flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Previous ${title.toLowerCase()} job`}
                onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
                disabled={activeIndex === 0}
                className="h-11 w-11"
              >
                <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" />
              </Button>
              <span className="min-w-12 text-center text-xs tabular-nums text-muted-foreground" aria-live="polite">
                {activeIndex + 1} / {bucketJobs.length}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Next ${title.toLowerCase()} job`}
                onClick={() => setActiveIndex((index) => Math.min(bucketJobs.length - 1, index + 1))}
                disabled={activeIndex >= bucketJobs.length - 1}
                className="h-11 w-11"
              >
                <ChevronRight className="h-4 w-4 rtl:-scale-x-100" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const pillBase = "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ModernDashboard({ jobs, quickWidget, onOpenJob, onViewChange, isActive = true }: ModernDashboardProps) {
  const [tab, setTab] = useState("work");
  const profile = useProfileHeader();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isJobDetailsOpen, setIsJobDetailsOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<{
    status: 'pending' | 'in-progress' | 'designing' | 'completed' | 'invoiced' | 'total' | 'active' | 'cancelled';
    title: string;
  } | null>(null);

  useEffect(() => {
    if (!isActive) {
      setIsJobDetailsOpen(false);
      setStatusModalOpen(false);
    }
  }, [isActive]);

  const stats = {
    total: jobs.length,
    pending: jobs.filter(job => job.status === "pending").length,
    inProgress: jobs.filter(job => job.status === "in-progress").length,
    designing: jobs.filter(job => job.status === "designing").length,
    completed: jobs.filter(job => job.status === "completed").length,
    invoiced: jobs.filter(job => job.status === "invoiced").length,
    cancelled: jobs.filter(job => job.status === "cancelled").length,
  };

  const pendingDesignJobs = jobs.filter(
    job => (job.status === "pending" || job.status === "designing") &&
      job.approval_status !== "pending_approval",
  );
  const executionJobs = jobs.filter(
    job => job.status === "in-progress" || job.status === "out" || job.status === "foc_sample",
  );
  const pendingInvoiceJobs = jobs.filter(job => job.status === "completed" || job.status === "finished");
  const assignedTo = (job: Job) =>
    [job.assignee, job.designer, job.salesman].find((name) => name && name !== "Unassigned") || "Unassigned";

  const pendingApprovals = jobs.filter(job => job.approval_status === "pending_approval").length;
  const toInvoice = pendingInvoiceJobs.length;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = profile?.full_name?.split(" ")[0];

  const handleViewDetails = (job: Job) => {
    if (onOpenJob) {
      onOpenJob(job);
      return;
    }
    setSelectedJob(job);
    setIsJobDetailsOpen(true);
  };

  const handleStatusClick = (
    status: 'pending' | 'in-progress' | 'designing' | 'completed' | 'invoiced' | 'total' | 'active' | 'cancelled',
    title: string
  ) => {
    setSelectedStatus({ status, title });
    setStatusModalOpen(true);
  };

  const goTo = (nextTab: string, anchor: string) => {
    setTab(nextTab);
    requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3 pt-2 text-sm md:px-4">
      <div className="flex min-h-8 shrink-0 flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-sm">
          <span className="font-semibold">{greeting}{firstName ? `, ${firstName}` : ""}</span>
          <span className="ms-2 hidden text-muted-foreground sm:inline">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</span>
        </p>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          {pendingApprovals > 0 ? (
            <button type="button" onClick={() => goTo("work", "approvals-section")} className={`${pillBase} border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100 dark:hover:bg-amber-400/20`}>
              <AlertCircle className="h-3.5 w-3.5" aria-hidden />
              {pendingApprovals} job{pendingApprovals === 1 ? "" : "s"} awaiting approval
              <span className="inline-flex items-center gap-0.5 font-semibold underline-offset-2 hover:underline">Review<ArrowRight className="h-3 w-3 rtl:-scale-x-100" aria-hidden /></span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-teal-500" />Nothing awaiting approval</span>
          )}
          {toInvoice > 0 && (
            <button type="button" onClick={() => goTo("invoice", "dashboard-workspace")} className={`${pillBase} bg-card hover:bg-muted`}>
              <Receipt className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />{toInvoice} ready to invoice
            </button>
          )}
        </div>
      </div>

      <div className="shrink-0"><KpiStrip jobs={jobs} /></div>

      <div className="grid shrink-0 gap-2 lg:h-[clamp(15rem,30vh,22rem)] lg:grid-cols-12 lg:grid-rows-1">
        <RevenueTrend jobs={jobs} className="h-64 lg:col-span-5 lg:h-auto" />
        <JobSummaryGauge jobs={jobs} className="h-auto lg:col-span-3 lg:h-auto" />
        <ProductionPipeline jobs={jobs} className="h-auto lg:col-span-4 lg:h-auto" />
      </div>
      <div className="grid shrink-0 gap-2 lg:h-[clamp(15rem,30vh,22rem)] lg:grid-cols-12 lg:grid-rows-1">
        <PriorityJobs jobs={jobs} onOpenJob={handleViewDetails} onViewAll={() => onViewChange?.("jobs")} className="max-h-72 lg:col-span-4 lg:max-h-none" />
        <RecentJobs jobs={jobs} onOpenJob={handleViewDetails} onViewAll={() => onViewChange?.("jobs")} className="max-h-72 lg:col-span-5 lg:max-h-none" />
        <ActivityFeed active={isActive} className="max-h-72 lg:col-span-3 lg:max-h-none" />
      </div>

      <section id="dashboard-workspace" aria-label="Workspace" className="shrink-0 scroll-mt-2">
        <Tabs value={tab} onValueChange={setTab} className="flex flex-col">
          <TabsList aria-label="Dashboard panels" className="mb-2 grid h-9 w-full max-w-md grid-cols-4 gap-0 p-1">
            <TabsTrigger value="work" className="h-full px-1 text-xs">Work</TabsTrigger>
            <TabsTrigger value="status" className="h-full px-1 text-xs">Status</TabsTrigger>
            <TabsTrigger value="invoice" className="h-full px-1 text-xs">Invoice</TabsTrigger>
            <TabsTrigger value="priority" className="h-full px-1 text-xs">Priority</TabsTrigger>
          </TabsList>
          <TabsContent value="work" className="dashboard-workspace mt-0 space-y-4">
            <section aria-label="Uncompleted work and bottlenecks" className="space-y-2">
              <div>
                <h2 className="text-xs font-semibold tracking-wider text-muted-foreground">Uncompleted work</h2>
                <p className="sr-only">Current workflow queues and the person or team responsible.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <WorkflowBucket title="Pending Design" jobs={pendingDesignJobs} icon={Palette} assigneeFor={(job) => job.designer && job.designer !== "Unassigned" ? job.designer : assignedTo(job)} onSelect={handleViewDetails} animationDelay={0} />
                <WorkflowBucket title="In Production / Execution" jobs={executionJobs} icon={Cog} assigneeFor={assignedTo} onSelect={handleViewDetails} animationDelay={0} />
                <WorkflowBucket title="Pending Invoicing" jobs={pendingInvoiceJobs} icon={Receipt} assigneeFor={(job) => job.assignee && job.assignee !== "Unassigned" ? job.assignee : "Admin"} onSelect={handleViewDetails} animationDelay={0} />
              </div>
            </section>
            <section id="approvals-section" aria-label="Approvals" className="scroll-mt-2 space-y-2">
              <h2 className="text-xs font-semibold tracking-wider text-muted-foreground">Approvals</h2>
              <ApprovalBox isActive={isActive} />
            </section>
          </TabsContent>
          <TabsContent value="status" className="dashboard-workspace mt-0">
            <JobStatusOverview stats={stats} onStatusClick={handleStatusClick} />
          </TabsContent>
          <TabsContent value="invoice" className="dashboard-workspace mt-0">{quickWidget}</TabsContent>
          <TabsContent value="priority" className="dashboard-workspace mt-0">
            <HighPriorityReminder jobs={jobs} onViewJob={handleViewDetails} />
            {!jobs.some(job => job.priority === "high" && !["completed", "invoiced", "cancelled"].includes(job.status)) && <p className="p-3 text-sm text-muted-foreground">No high priority jobs pending.</p>}
          </TabsContent>
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
        status={selectedStatus?.status || 'total'}
        title={selectedStatus?.title || 'All'}
      />
    </div>
  );
}

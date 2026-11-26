import { useEffect, useRef, useState, type ComponentType, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { Job } from "@/pages/Index";
import { JobDetails } from "@/components/JobDetails";
import { JobStatusModal } from "@/components/JobStatusModal";
import { DashboardNotifications } from "@/components/dashboard/DashboardNotifications";
import { JobStatusOverview } from "@/components/dashboard/JobStatusOverview";
import { ApprovalBox } from "@/components/dashboard/ApprovalBox";
import { HighPriorityReminder } from "@/components/dashboard/HighPriorityReminder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KpiStrip } from "@/components/command/KpiStrip";
import { HeroPanel } from "@/components/hero/HeroPanel";
import { RevenueTrend } from "@/components/dashboard/insights/RevenueTrend";
import { JobSummaryGauge } from "@/components/dashboard/insights/JobSummaryGauge";
import { BranchPipeline } from "@/components/dashboard/insights/BranchPipeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ReactNode } from "react";
import { useScrollDepth } from "@/hooks/useScrollDepth";
import { useSlideDirection } from "@/hooks/useSlideDirection";
import { Search, Eye, Palette, Cog, Receipt, UserRound, ChevronLeft, ChevronRight } from "lucide-react";

interface ModernDashboardProps {
  jobs: Job[];
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

export function ModernDashboard({ jobs, quickWidget, onOpenJob, onViewChange }: ModernDashboardProps) {
  const [tab, setTab] = useState("work");
  const workRef = useRef<HTMLDivElement>(null);
  useScrollDepth(workRef, tab === "work");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isJobDetailsOpen, setIsJobDetailsOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<{
    status: 'pending' | 'in-progress' | 'designing' | 'completed' | 'invoiced' | 'total' | 'active' | 'cancelled';
    title: string;
  } | null>(null);

  const searchFilteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.jobOrderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.customer.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
  const urgentCount = jobs.filter(job => job.priority === "high" && !["completed", "invoiced", "cancelled", "finished"].includes(job.status)).length;
  const toInvoice = pendingInvoiceJobs.length;
  const heroTitle = pendingApprovals > 0
    ? `${pendingApprovals} job${pendingApprovals === 1 ? "" : "s"} need${pendingApprovals === 1 ? "s" : ""} approval today`
    : urgentCount > 0
      ? `${urgentCount} high priority job${urgentCount === 1 ? " is" : "s are"} in progress`
      : "You’re all caught up";
  const heroSubtitle = toInvoice > 0
    ? `${toInvoice} completed job${toInvoice === 1 ? " is" : "s are"} waiting for an invoice.`
    : "Nothing is waiting on you right now.";

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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-3 text-sm md:px-5">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-base font-semibold text-foreground"><span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />Dashboard</h1>
        </div>
        <div className="flex min-w-0 items-center gap-1">
          <div className="relative min-w-0">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs..."
              aria-label="Search jobs"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(e.target.value.length > 0);
              }}
              onFocus={() => searchQuery && setShowSearchDropdown(true)}
              onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
              className="ps-9 h-10 w-36 text-sm bg-card sm:w-56"
            />
            {showSearchDropdown && searchFilteredJobs.length > 0 && (
              <div className="absolute top-full mt-2 w-full rounded-md border bg-popover text-popover-foreground shadow-lg z-50 max-h-80 overflow-y-auto">
                <div className="p-2">
                  <div className="text-xs text-muted-foreground mb-2 px-2">
                    Found {searchFilteredJobs.length} job{searchFilteredJobs.length !== 1 ? 's' : ''}
                  </div>
                  <div className="space-y-1">
                    {searchFilteredJobs.slice(0, 10).map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between p-3 rounded-md hover:bg-muted border border-transparent hover:border-border cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate text-foreground">{job.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{job.jobOrderNumber}</p>
                          <p className="text-xs text-muted-foreground truncate">{job.customer}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            handleViewDetails(job);
                            setShowSearchDropdown(false);
                            setSearchQuery("");
                          }}
                          className="ms-2 h-8 w-8 p-0"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  {searchFilteredJobs.length > 10 && (
                    <div className="text-xs text-center text-muted-foreground mt-2 pb-1">
                      And {searchFilteredJobs.length - 10} more...
                    </div>
                  )}
                </div>
              </div>
            )}
            {showSearchDropdown && searchQuery && searchFilteredJobs.length === 0 && (
              <div className="absolute top-full mt-2 w-full rounded-md border bg-popover text-popover-foreground shadow-lg z-50 p-4">
                <div className="text-center text-sm text-muted-foreground">
                  <Search className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  No jobs found matching "{searchQuery}"
                </div>
              </div>
            )}
          </div>
          <DashboardNotifications />
        </div>
      </div>

      <HeroPanel
        title={heroTitle}
        subtitle={heroSubtitle}
        actionLabel={pendingApprovals > 0 ? "Review approvals" : "Create job order"}
        onAction={() => {
          if (pendingApprovals > 0) {
            setTab("work");
            requestAnimationFrame(() => document.getElementById("approvals-section")?.scrollIntoView({ behavior: "smooth", block: "start" }));
          } else {
            onViewChange?.("create");
          }
        }}
      />

      <div className="dashboard-kpis shrink-0">
        <KpiStrip jobs={jobs} />
      </div>

      <div className="grid shrink-0 gap-3 lg:grid-cols-3">
        <RevenueTrend jobs={jobs} className="lg:col-span-2" />
        <JobSummaryGauge jobs={jobs} />
      </div>
      <BranchPipeline jobs={jobs} className="shrink-0" />

      <Tabs defaultValue="work" value={tab} onValueChange={setTab} className="flex shrink-0 flex-col">
        <TabsList aria-label="Dashboard panels" className="grid h-12 shrink-0 grid-cols-4 gap-0 rounded-2xl bg-card/70 p-1.5 shadow-card">
          <TabsTrigger value="work" className="h-full px-1 text-xs">Work</TabsTrigger>
          <TabsTrigger value="status" className="h-full px-1 text-xs">Status</TabsTrigger>
          <TabsTrigger value="invoice" className="h-full px-1 text-xs">Invoice</TabsTrigger>
          <TabsTrigger value="priority" className="h-full px-1 text-xs">Priority</TabsTrigger>
        </TabsList>
        <TabsContent value="work" ref={workRef} className="dashboard-workspace space-y-4">
      <section
        aria-label="Uncompleted work and bottlenecks"
        className="dashboard-card-enter space-y-2"
        style={{ animationDelay: "140ms" }}
      >
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Uncompleted Work</h2>
          <p className="sr-only">Current workflow queues and the person or team responsible.</p>
        </div>
        <div data-scroll-card className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <WorkflowBucket
            title="Pending Design"
            jobs={pendingDesignJobs}
            icon={Palette}
            assigneeFor={(job) => job.designer && job.designer !== "Unassigned" ? job.designer : assignedTo(job)}
            onSelect={handleViewDetails}
            animationDelay={180}
          />
          <WorkflowBucket
            title="In Production / Execution"
            jobs={executionJobs}
            icon={Cog}
            assigneeFor={assignedTo}
            onSelect={handleViewDetails}
            animationDelay={240}
          />
          <WorkflowBucket
            title="Pending Invoicing"
            jobs={pendingInvoiceJobs}
            icon={Receipt}
            assigneeFor={(job) => job.assignee && job.assignee !== "Unassigned" ? job.assignee : "Admin"}
            onSelect={handleViewDetails}
            animationDelay={300}
          />
        </div>
      </section>
      <section id="approvals-section" aria-label="Approvals" data-scroll-card className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Approvals</h2>
        <ApprovalBox />
      </section>
        </TabsContent>
        <TabsContent value="status" className="dashboard-workspace">
          <JobStatusOverview stats={stats} onStatusClick={handleStatusClick} />
        </TabsContent>
        <TabsContent value="invoice" className="dashboard-workspace">{quickWidget}</TabsContent>
        <TabsContent value="priority" className="dashboard-workspace">
          <HighPriorityReminder jobs={jobs} onViewJob={handleViewDetails} />
          {!jobs.some(job => job.priority === "high" && !["completed", "invoiced", "cancelled"].includes(job.status)) && <p className="p-3 text-sm text-muted-foreground">No high priority jobs pending.</p>}
        </TabsContent>
      </Tabs>

      <JobDetails
        isOpen={isJobDetailsOpen}
        onClose={() => setIsJobDetailsOpen(false)}
        job={selectedJob}
      />

      <JobStatusModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        jobs={jobs}
        status={selectedStatus?.status || 'total'}
        title={selectedStatus?.title || 'All'}
      />
    </div>
  );
}

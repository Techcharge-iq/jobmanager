import { useState, useEffect, useMemo, useCallback } from "react";
import { Job } from "@/pages/Index";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { JobDetails } from "@/components/JobDetails";
import { cn } from "@/lib/utils";
import {
  Building,
  Calendar,
  User,
  Briefcase,
  ChevronUp,
  ChevronDown,
  Eye,
  Edit,
  Search,
  RefreshCw,
  Clock,
  FileText,
} from "lucide-react";

interface ApprovedJobsSliderProps {
  jobs: Job[];
  onStatusUpdate?: (jobId: string, status: string) => void;
  isSyncing?: boolean;
  isLoading?: boolean;
  onRefresh?: () => void;
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

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "completed":
    case "finished":
    case "invoiced":
      return "default";
    case "cancelled":
      return "destructive";
    case "pending":
    case "in-progress":
    case "designing":
      return "secondary";
    default:
      return "outline";
  }
};

function DetailItem({ icon: Icon, label, value, sub }: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-4">
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 text-muted-foreground mt-0.5" />
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="font-medium text-foreground truncate">{value}</p>
          {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export function ApprovedJobsSlider({ jobs, onStatusUpdate, isSyncing, isLoading, onRefresh }: ApprovedJobsSliderProps) {
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedSalesman, setSelectedSalesman] = useState<string>("all");
  const [selectedDesigner, setSelectedDesigner] = useState<string>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("approved");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedJobIndex, setSelectedJobIndex] = useState(0);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isJobDetailsOpen, setIsJobDetailsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const branches = ["all", ...Array.from(new Set(jobs.map(j => j.branch).filter(Boolean)))];
  const salesmen = ["all", ...Array.from(new Set(jobs.map(j => j.salesman).filter(Boolean))).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))];
  const designers = ["all", ...Array.from(new Set(jobs.map(j => j.designer).filter(Boolean))).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))];
  const customers = ["all", ...Array.from(new Set(jobs.map(j => j.customer).filter(Boolean))).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))];
  const uniqueStatuses = Array.from(new Set(jobs.map(j => j.status).filter(Boolean)));
  const statuses = ["all", "approved", ...uniqueStatuses];

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const branchMatch = selectedBranch === "all" || job.branch === selectedBranch;
      const salesmanMatch = selectedSalesman === "all" || job.salesman === selectedSalesman;
      const designerMatch = selectedDesigner === "all" || job.designer === selectedDesigner;
      const customerMatch = selectedCustomer === "all" || job.customer === selectedCustomer;
      const statusMatch = selectedStatus === "all" ||
        (selectedStatus === "approved" ? job.approval_status === "approved" : job.status === selectedStatus);

      const searchMatch = searchQuery === "" || (() => {
        const terms = searchQuery.toLowerCase().trim().split(/\s+/);
        const text = [
          job.jobOrderNumber, job.title, job.customer, job.clientName,
          job.jobOrderDetails, job.assignee, job.salesman, job.designer,
        ].filter(Boolean).join(" ").toLowerCase();
        return terms.some(t => text.includes(t));
      })();

      return branchMatch && salesmanMatch && designerMatch && customerMatch && statusMatch && searchMatch;
    });
  }, [jobs, selectedBranch, selectedSalesman, selectedDesigner, selectedCustomer, selectedStatus, searchQuery]);

  const currentJob = useMemo(() => filteredJobs[selectedJobIndex] ?? null, [filteredJobs, selectedJobIndex]);

  useEffect(() => {
    setSelectedJobIndex(0);
  }, [selectedBranch, selectedSalesman, selectedDesigner, selectedCustomer, selectedStatus, searchQuery]);

  const handleStatusChange = (newStatus: string) => {
    if (onStatusUpdate && currentJob) onStatusUpdate(currentJob.id, newStatus);
  };

  const handleViewDetails = (job: Job) => {
    setSelectedJob(job);
    setIsJobDetailsOpen(true);
    setIsEditMode(false);
  };

  const handleEditJob = (job: Job) => {
    setSelectedJob(job);
    setIsJobDetailsOpen(true);
    setIsEditMode(true);
  };

  const handlePrevious = useCallback(() => {
    setSelectedJobIndex(prev => (prev > 0 ? prev - 1 : filteredJobs.length - 1));
  }, [filteredJobs.length]);

  const handleNext = useCallback(() => {
    setSelectedJobIndex(prev => (prev < filteredJobs.length - 1 ? prev + 1 : 0));
  }, [filteredJobs.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") { e.preventDefault(); handlePrevious(); }
      if (e.key === "ArrowDown") { e.preventDefault(); handleNext(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleNext, handlePrevious]);

  const filterControls = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ps-10 w-52"
        />
      </div>
      {[
        { val: selectedBranch, set: setSelectedBranch, items: branches, label: "Branch" },
        { val: selectedSalesman, set: setSelectedSalesman, items: salesmen, label: "Salesman" },
        { val: selectedDesigner, set: setSelectedDesigner, items: designers, label: "Designer" },
        { val: selectedCustomer, set: setSelectedCustomer, items: customers, label: "Customer" },
        { val: selectedStatus, set: setSelectedStatus, items: statuses, label: "Status" },
      ].map(({ val, set, items, label }) => (
        <Select key={label} value={val} onValueChange={set}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder={label} />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item} value={item}>
                {item === "all" ? `All ${label}s` : item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      {onRefresh && (
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isSyncing || isLoading}>
          <RefreshCw className={cn("w-4 h-4 me-1", isSyncing && "animate-spin")} />
          Sync
        </Button>
      )}
    </div>
  );

  if (filteredJobs.length === 0) {
    return (
      <div className="p-6 min-h-screen">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Approved Jobs</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {jobs.length} total · 0 matching filters
            </p>
          </div>
          {filterControls}
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No approved jobs found for the selected filters.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen">
      {(isSyncing || isLoading) && (
        <div className="fixed inset-0 bg-background/70  z-50 flex items-center justify-center">
          <div className="flex items-center gap-3 bg-card border px-5 py-4 rounded-md shadow-lg">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm font-medium">{isLoading ? "Loading data..." : "Syncing..."}</span>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Approved Jobs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredJobs.length} of {jobs.length} jobs
          </p>
        </div>
        {filterControls}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Job list */}
        <Card className="lg:col-span-4 flex flex-col">
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Job Orders</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={handlePrevious} className="h-7 w-7">
                <ChevronUp className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                {selectedJobIndex + 1} / {filteredJobs.length}
              </span>
              <Button variant="ghost" size="icon" onClick={handleNext} className="h-7 w-7">
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto max-h-[70vh] p-2">
            <div className="space-y-1">
              {filteredJobs.map((job, idx) => {
                const isActive = idx === selectedJobIndex;
                return (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJobIndex(idx)}
                    className={cn(
                      "w-full text-start p-3 rounded-md border transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card hover:bg-muted border-border"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{job.jobOrderNumber}</span>
                      <Badge
                        variant={isActive ? "outline" : getStatusVariant(job.status)}
                        className={cn("text-[10px]", isActive && "border-primary-foreground/40 text-primary-foreground")}
                      >
                        {job.status}
                      </Badge>
                    </div>
                    <p className={cn("text-xs truncate", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {job.title}
                    </p>
                    <p className={cn("text-xs truncate mt-0.5", isActive ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {job.customer}
                    </p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Right: Job details */}
        <Card className="lg:col-span-8">
          <CardHeader className="border-b">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Job Order</p>
                <CardTitle className="text-2xl mt-1">{currentJob?.jobOrderNumber}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{currentJob?.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusVariant(currentJob?.status || "")}>
                  {currentJob?.status}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => currentJob && handleViewDetails(currentJob)}>
                  <Eye className="w-4 h-4 me-1" /> View
                </Button>
                <Button variant="outline" size="sm" onClick={() => currentJob && handleEditJob(currentJob)}>
                  <Edit className="w-4 h-4 me-1" /> Edit
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Status update */}
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                Update Status
              </label>
              <Select value={currentJob?.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Detail grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <DetailItem icon={Building} label="Customer" value={currentJob?.customer || "—"} sub={currentJob?.clientName || undefined} />
              <DetailItem icon={Briefcase} label="Branch" value={currentJob?.branch || "—"} />
              <DetailItem icon={User} label="Salesman" value={currentJob?.salesman || "Unassigned"} />
              <DetailItem icon={User} label="Designer" value={currentJob?.designer || "Unassigned"} />
              <DetailItem icon={Calendar} label="Due Date" value={currentJob?.dueDate ? new Date(currentJob.dueDate).toLocaleDateString() : "—"} />
              <DetailItem icon={Clock} label="Estimated Hours" value={String(currentJob?.estimatedHours || 0)} />
            </div>

            {currentJob?.jobOrderDetails && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Job Details</p>
                <div className="rounded-md border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
                  {currentJob.jobOrderDetails}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <JobDetails
        isOpen={isJobDetailsOpen}
        onClose={() => setIsJobDetailsOpen(false)}
        job={selectedJob}
        isEditMode={isEditMode}
      />
    </div>
  );
}

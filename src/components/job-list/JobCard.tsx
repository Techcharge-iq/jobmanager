import { Job } from "@/pages/Index";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Eye,
  MessageSquare,
  Calendar,
  User,
  Building,
  Briefcase,
  Lock,
} from "lucide-react";
import { HighPriorityBadge } from "@/components/ui/HighPriorityBadge";
import { cn } from "@/lib/utils";

interface JobCardProps {
  job: Job;
  onViewDetails: (job: Job) => void;
  onStatusChange: (jobId: string, status: string) => void;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
  { value: "out", label: "Out" },
  { value: "completed", label: "Completed" },
  { value: "finished", label: "Finished" },
  { value: "foc_sample", label: "FOC/Sample" },
  { value: "invoiced", label: "Invoiced" },
  { value: "cancelled", label: "Cancelled" },
];

const getStatusClasses = (status: string): string => {
  switch (status) {
    case "pending":
      return "bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30 hover:bg-amber-100";
    case "in-progress":
      return "bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-500/30 hover:bg-blue-100";
    case "designing":
      return "bg-violet-100 dark:bg-violet-500/15 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-500/30 hover:bg-violet-100";
    case "out":
      return "bg-orange-100 dark:bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-500/30 hover:bg-orange-100";
    case "completed":
      return "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100";
    case "finished":
      return "bg-teal-100 dark:bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-500/30 hover:bg-teal-100";
    case "foc_sample":
      return "bg-pink-100 dark:bg-pink-500/15 text-pink-800 dark:text-pink-300 border-pink-200 dark:border-pink-500/30 hover:bg-pink-100";
    case "invoiced":
      return "bg-slate-800 text-white border-slate-800 hover:bg-slate-800";
    case "cancelled":
      return "bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300 border-red-200 dark:border-red-500/30 hover:bg-red-100";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

const formatStatusLabel = (status: string) =>
  status === "foc_sample"
    ? "FOC/Sample"
    : status.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function JobCard({ job, onViewDetails, onStatusChange }: JobCardProps) {
  const isLocked = job.status === "invoiced";

  const handleStatusChange = (value: string) => {
    if (isLocked) return;
    onStatusChange(job.id, value);
  };

  const isOverdue =
    new Date(job.dueDate) < new Date() &&
    job.status !== "completed" &&
    job.status !== "invoiced" &&
    job.status !== "cancelled";

  return (
    <Card className={cn("transition-shadow hover:shadow-md", isOverdue && "border-destructive/40")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <CardTitle className="text-base font-semibold text-foreground">{job.title}</CardTitle>
              <HighPriorityBadge priority={job.priority} />
              {isLocked && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This job is invoiced and locked for editing</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {isOverdue && (
                <Badge variant="destructive" className="text-[10px]">OVERDUE</Badge>
              )}
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                <span className="font-medium text-foreground">{job.jobOrderNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                <span>{job.customer}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{job.salesman}</span>
              </div>
              <div className={cn("flex items-center gap-2", isOverdue && "text-destructive font-medium")}>
                <Calendar className="w-4 h-4" />
                <span>{new Date(job.dueDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div>
            {isLocked ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="default" className="cursor-not-allowed">
                      <Lock className="w-3 h-3 me-1" />
                      Invoiced
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Status locked - job has been invoiced</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Select value={job.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className={cn("border", getStatusClasses(job.status))}>
            {formatStatusLabel(job.status)}
          </Badge>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onViewDetails(job)}>
              <Eye className="w-4 h-4 me-1" />
              View
            </Button>
            <Button size="sm" variant="outline">
              <MessageSquare className="w-4 h-4 me-1" />
              Chat
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Job } from "@/pages/Index";
import { JobTitle } from "@/types/jobOrder";
import { FileText, Calendar, Clock, MapPin } from "lucide-react";

interface ProjectDetailsSectionProps {
  job: Job;
  isEditMode: boolean;
  editData: Partial<Job>;
  onEditDataChange: (data: Partial<Job>) => void;
  jobTitles: JobTitle[];
  dropdownLoading: boolean;
}

export function ProjectDetailsSection({ 
  job, 
  isEditMode, 
  editData, 
  onEditDataChange, 
  jobTitles, 
  dropdownLoading 
}: ProjectDetailsSectionProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300 border-red-200 dark:border-red-500/30";
      case "medium": return "bg-yellow-100 dark:bg-yellow-500/15 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-500/30";
      case "low": return "bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-300 border-green-200 dark:border-green-500/30";
      default: return "bg-muted text-foreground border-border";
    }
  };


  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-green-600 dark:text-green-300" />
          Project Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Job Title</Label>
          {isEditMode ? (
            <Select 
              value={editData.job_title_id || job.job_title_id || ''} 
              onValueChange={(value) => onEditDataChange({ ...editData, job_title_id: value })}
              disabled={dropdownLoading}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select job title" />
              </SelectTrigger>
              <SelectContent>
                {jobTitles.map((jobTitle) => (
                  <SelectItem key={jobTitle.id} value={jobTitle.id}>
                    {jobTitle.job_title_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="mt-1 text-sm font-semibold text-foreground">{job.title}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Branch</Label>
            {isEditMode ? (
              <Select 
                value={editData.branch || job.branch || ''} 
                onValueChange={(value) => onEditDataChange({ ...editData, branch: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Head Office">Head Office</SelectItem>
                  <SelectItem value="Wadi Kabeer">Wadi Kabeer</SelectItem>
                  <SelectItem value="Wajihat Ruwi">Wajihat Ruwi</SelectItem>
                  <SelectItem value="Ruwi Branch">Ruwi Branch</SelectItem>
                  <SelectItem value="Ghubra Branch">Ghubra Branch</SelectItem>
                  <SelectItem value="Nizwa Branch">Nizwa Branch</SelectItem>
                  <SelectItem value="Al Khoud Branch">Al Khoud Branch Branch</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="mt-1 text-sm text-foreground">{job.branch || 'Head Office'}</p>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              Delivered At
            </Label>
            {isEditMode ? (
              <Select 
                value={editData.deliveredAt || job.deliveredAt || ''} 
                onValueChange={(value) => onEditDataChange({ ...editData, deliveredAt: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select delivery location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Head Office">Head Office</SelectItem>
                  <SelectItem value="Faiyaz">Faiyaz</SelectItem>
                  <SelectItem value="Babu">Babu</SelectItem>
                  <SelectItem value="Asif">Asif</SelectItem>
                  <SelectItem value="Abbas">Abbas</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="mt-1 text-sm text-foreground">{job.deliveredAt || 'Not specified'}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Due Date
            </Label>
            {isEditMode ? (
              <Input
                type="date"
                value={editData.dueDate || ''}
                onChange={(e) => onEditDataChange({ ...editData, dueDate: e.target.value })}
                className="mt-1"
              />
            ) : (
              <p className="mt-1 text-sm text-foreground">{new Date(job.dueDate).toLocaleDateString()}</p>
            )}
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Estimated Hours
            </Label>
            {isEditMode ? (
              <Input
                type="number"
                value={editData.estimatedHours || ''}
                onChange={(e) => onEditDataChange({ ...editData, estimatedHours: parseInt(e.target.value) })}
                placeholder="Enter hours"
                className="mt-1"
              />
            ) : (
              <p className="mt-1 text-sm text-foreground">{job.estimatedHours} hours</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Priority</Label>
            {isEditMode ? (
              <Select 
                value={editData.priority || ''} 
                onValueChange={(value) => onEditDataChange({ ...editData, priority: value as any })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="mt-1">
                <Badge className={getPriorityColor(job.priority)}>
                  {job.priority} priority
                </Badge>
              </div>
            )}
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Status</Label>
            {isEditMode ? (
              <Select 
                value={editData.status || job.status || ''} 
                onValueChange={(value) => onEditDataChange({ ...editData, status: value as Job['status'] })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="designing">Designing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="finished">Finished</SelectItem>
                  <SelectItem value="invoiced">Invoiced</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="mt-1">
                <StatusBadge status={job.status} />
              </div>
            )}
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-muted-foreground">Created Date</Label>
          <p className="mt-1 text-sm text-foreground">{new Date(job.createdAt).toLocaleDateString()}</p>
        </div>
      </CardContent>
    </Card>
  );
}

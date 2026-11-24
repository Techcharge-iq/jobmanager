import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, MessageCircle, History } from "lucide-react";
import { Job } from "@/pages/Index";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { getProfileRole } from "@/data/profiles";
import { JobEditLog } from "./JobEditLog";

interface JobDetailsHeaderProps {
  job: Job;
  isEditMode: boolean;
  isExporting: boolean;
  isSharing: boolean;
  onExportPDF: () => void;
  onShareWhatsApp: () => void;
}

export function JobDetailsHeader({ 
  job, 
  isEditMode, 
  isExporting, 
  isSharing, 
  onExportPDF, 
  onShareWhatsApp 
}: JobDetailsHeaderProps) {
  const [showEditLog, setShowEditLog] = useState(false);
  const { user } = useAuth();

  const { data: userRole } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return getProfileRole(user.id);
    },
    enabled: !!user?.id
  });

  const isAdmin = userRole === "admin";
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300 border-red-200 dark:border-red-500/30";
      case "medium": return "bg-yellow-100 dark:bg-yellow-500/15 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-500/30";
      case "low": return "bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-300 border-green-200 dark:border-green-500/30";
      default: return "bg-muted text-foreground border-border";
    }
  };


  return (
    <>
      <div className="text-2xl font-bold text-foreground flex items-center gap-2">
        <FileText className="w-6 h-6 text-blue-600 dark:text-blue-300" />
        {isEditMode ? "Edit Job Order" : "Job Order Details"}
      </div>

      <div className="bg-accent p-6 rounded-lg border border-blue-100 dark:border-blue-500/30">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Job Order #{job.jobOrderNumber}</h3>
            <div className="flex gap-2 mt-2">
              <Badge className={getPriorityColor(job.priority)}>
                {job.priority} priority
              </Badge>
              <StatusBadge status={job.status} />
            </div>
          </div>
          <div className="flex gap-2">
            {isAdmin && !isEditMode && (
              <Button
                onClick={() => setShowEditLog(true)}
                variant="outline"
                size="sm"
                className="bg-card hover:bg-muted"
              >
                <History className="w-4 h-4 me-2" />
                Log
              </Button>
            )}
            <Button
              onClick={onShareWhatsApp}
              disabled={isSharing}
              variant="outline"
              className="bg-green-50 dark:bg-green-500/15 hover:bg-green-100 border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-300"
            >
              <MessageCircle className="w-4 h-4 me-2" />
              {isSharing ? 'Sharing...' : 'WhatsApp'}
            </Button>
            <Button
              onClick={onExportPDF}
              disabled={isExporting}
              variant="outline"
              className="bg-card hover:bg-muted"
            >
              <Download className="w-4 h-4 me-2" />
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          </div>
        </div>
      </div>

      <JobEditLog
        jobOrderId={job.id}
        jobOrderNumber={job.jobOrderNumber}
        isOpen={showEditLog}
        onClose={() => setShowEditLog(false)}
      />
    </>
  );
}

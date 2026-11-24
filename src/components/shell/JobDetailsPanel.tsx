import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { JobDetailsHeader } from "@/components/job-details/JobDetailsHeader";
import { JobDetailsForm } from "@/components/job-details/JobDetailsForm";
import { JobDetailsActions } from "@/components/job-details/JobDetailsActions";
import { InvoiceNumberSection } from "@/components/job-details/InvoiceNumberSection";
import { useJobDetails } from "@/hooks/useJobDetails";
import type { Job } from "@/pages/Index";

interface Props { job: Job | null; loading: boolean; isEditMode?: boolean; onClose: () => void }

/** Inline version of the job dialog, shown inside a job tab. Same hook, same sections, same writes. */
export function JobDetailsPanel({ job, loading, isEditMode = false, onClose }: Props) {
  const d = useJobDetails({ job, isEditMode, onClose });

  if (!job) {
    return (
      <div className="mx-auto w-full max-w-4xl p-3 md:p-6">
        <Card>
          <CardContent className="space-y-4 p-6">
            {loading ? (
              <><Skeleton className="h-8 w-2/3" /><Skeleton className="h-32 w-full" /><Skeleton className="h-24 w-full" /></>
            ) : (
              <>
                <h2 className="text-h2">This job isn’t available</h2>
                <p className="text-sm text-muted-foreground">It may have been deleted, or it hasn’t synced to this device yet. Close this tab and open the job again from the dashboard.</p>
                <Button onClick={onClose}>Close tab</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-3 p-3 md:p-6">
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onClose}><X className="h-4 w-4" />Close tab</Button>
      </div>
      <Card>
        <CardContent className="space-y-6 p-4 md:p-6">
          <JobDetailsHeader job={job} isEditMode={isEditMode} isExporting={d.isExporting} isSharing={d.isSharing} onExportPDF={d.handleExportPDF} onShareWhatsApp={d.handleShareWhatsApp} />
          <InvoiceNumberSection invoiceNumber={d.invoiceNumber} onInvoiceNumberChange={d.setInvoiceNumber} canEditInvoice={d.canEditInvoice} />
          <JobDetailsForm job={job} isEditMode={isEditMode} editData={d.editData} onEditDataChange={d.setEditData} />
          <JobDetailsActions isEditMode={isEditMode} isLoading={d.isLoading} onClose={onClose} onSave={d.handleSave} />
        </CardContent>
      </Card>
    </div>
  );
}

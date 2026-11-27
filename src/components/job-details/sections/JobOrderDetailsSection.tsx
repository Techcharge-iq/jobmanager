
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Job } from "@/pages/Index";
import { Building } from "lucide-react";

interface JobOrderDetailsSectionProps {
  job: Job;
  isEditMode: boolean;
  editData: Partial<Job>;
  onEditDataChange: (data: Partial<Job>) => void;
}

export function JobOrderDetailsSection({ 
  job, 
  isEditMode, 
  editData, 
  onEditDataChange 
}: JobOrderDetailsSectionProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Building className="w-5 h-5 text-purple-600 dark:text-purple-300" />
          Job Order Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEditMode ? (
          <Textarea
            value={editData.jobOrderDetails || ''}
            onChange={(e) => onEditDataChange({ ...editData, jobOrderDetails: e.target.value })}
            placeholder="Enter detailed job order information..."
            className="min-h-[120px] resize-none"
          />
        ) : (
          <div className="bg-muted p-4 rounded-lg border">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {job.jobOrderDetails || 'No additional details provided.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

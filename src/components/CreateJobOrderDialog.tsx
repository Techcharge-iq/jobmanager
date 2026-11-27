
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { JobFormWithImageUpload } from "@/components/job-form/JobFormWithImageUpload";

interface CreateJobOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateJobOrderDialog({ open, onOpenChange }: CreateJobOrderDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const handleClose = () => {
    onOpenChange(false);
  };
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isCreating) return;
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="fixed inset-0 left-0 top-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-[90dvh] sm:max-h-[90dvh] sm:w-[min(96vw,72rem)] sm:max-w-[72rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
        <DialogHeader className="shrink-0 border-b px-4 py-4 pe-12 text-start sm:px-6">
          <DialogTitle className="text-lg font-semibold">Create new job order</DialogTitle>
          <DialogDescription>
            Complete the guided steps, review the details, then create the job.
          </DialogDescription>
        </DialogHeader>
        <JobFormWithImageUpload onCancel={handleClose} onCreatingChange={setIsCreating} />
      </DialogContent>
    </Dialog>
  );
}

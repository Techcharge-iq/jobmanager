
import { Button } from "@/components/ui/button";
import { Save, X as XIcon } from "lucide-react";

interface JobDetailsActionsProps {
  isEditMode: boolean;
  isLoading: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function JobDetailsActions({ isEditMode, isLoading, onClose, onSave }: JobDetailsActionsProps) {
  if (!isEditMode) return null;

  return (
    <div className="flex gap-2 justify-end pt-4 border-t border-border">
      <Button
        variant="outline"
        onClick={onClose}
        disabled={isLoading}
      >
        <XIcon className="w-4 h-4 me-2" />
        Cancel
      </Button>
      <Button
        onClick={onSave}
        disabled={isLoading}
        className="bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        <Save className="w-4 h-4 me-2" />
        {isLoading ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
}

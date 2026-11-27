
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ScheduleSectionProps {
  dueDate: string;
  estimatedHours: number;
  onDueDateChange: (value: string) => void;
  onEstimatedHoursChange: (value: number) => void;
}

export function ScheduleSection({ 
  dueDate, 
  estimatedHours, 
  onDueDateChange, 
  onEstimatedHoursChange 
}: ScheduleSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="dueDate">Due Date *</Label>
        <Input
          id="dueDate"
          type="date"
          value={dueDate}
          onChange={(e) => onDueDateChange(e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="estimatedHours">Estimated Hours *</Label>
        <Input
          id="estimatedHours"
          type="number"
          value={Number.isFinite(estimatedHours) ? estimatedHours : ""}
          onChange={(e) => onEstimatedHoursChange(e.target.value === "" ? Number.NaN : parseInt(e.target.value))}
          required
        />
      </div>
    </div>
  );
}

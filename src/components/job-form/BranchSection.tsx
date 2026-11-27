
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BranchSectionProps {
  value: string;
  onChange: (value: string) => void;
}

export function BranchSection({ value, onChange }: BranchSectionProps) {
  return (
    <div>
      <Label htmlFor="branch">Branch *</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="branch">
          <SelectValue placeholder="Select branch" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Head Office">Head Office</SelectItem>
          <SelectItem value="Wadi Kabeer">Wadi Kabeer</SelectItem>
          <SelectItem value="Wajihat Ruwi">Wajihat ruwi</SelectItem>
          <SelectItem value="Ruwi Branch">Ruwi Branch</SelectItem>
          <SelectItem value="Ghubra Branch">Ghubra Branch</SelectItem>
          <SelectItem value="Nizwa Branch">Nizwa Branch</SelectItem>
          <SelectItem value="Al Khoud Branch">Al Khoud Branch Branch</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}


import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Designer, Salesman } from "@/hooks/useDropdownData";

interface TeamSectionProps {
  designer: string;
  salesman: string;
  onDesignerChange: (value: string) => void;
  onSalesmanChange: (value: string) => void;
  designers: Designer[];
  salesmen: Salesman[];
}

export function TeamSection({ 
  designer, 
  salesman, 
  onDesignerChange, 
  onSalesmanChange, 
  designers, 
  salesmen 
}: TeamSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="designer">Designer *</Label>
        <Select value={designer} onValueChange={onDesignerChange}>
          <SelectTrigger id="designer">
            <SelectValue placeholder="Select designer" />
          </SelectTrigger>
          <SelectContent>
            {designers.map((designer) => (
              <SelectItem key={designer.id} value={designer.id}>
                {designer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="salesman">Salesman *</Label>
        <Select value={salesman} onValueChange={onSalesmanChange}>
          <SelectTrigger id="salesman">
            <SelectValue placeholder="Select salesman" />
          </SelectTrigger>
          <SelectContent>
            {salesmen.map((salesman) => (
              <SelectItem key={salesman.id} value={salesman.id}>
                {salesman.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

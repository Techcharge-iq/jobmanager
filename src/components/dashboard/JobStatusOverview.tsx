import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Briefcase, Clock, CheckCircle, Activity, Palette, DollarSign, XCircle
} from "lucide-react";

interface JobStats {
  total: number;
  pending: number;
  inProgress: number;
  designing: number;
  completed: number;
  invoiced: number;
  cancelled: number;
}

interface JobStatusOverviewProps {
  stats: JobStats;
  onStatusClick: (
    status: 'pending' | 'in-progress' | 'designing' | 'completed' | 'invoiced' | 'total' | 'active' | 'cancelled',
    title: string
  ) => void;
}

const statusConfig = [
  { key: 'total' as const, label: 'Total', icon: Briefcase, getValue: (s: JobStats) => s.total },
  { key: 'active' as const, label: 'Active', icon: Activity, getValue: (s: JobStats) => s.inProgress + s.designing },
  { key: 'pending' as const, label: 'Pending', icon: Clock, getValue: (s: JobStats) => s.pending },
  { key: 'in-progress' as const, label: 'In Progress', icon: Activity, getValue: (s: JobStats) => s.inProgress },
  { key: 'designing' as const, label: 'Designing', icon: Palette, getValue: (s: JobStats) => s.designing },
  { key: 'completed' as const, label: 'Completed', icon: CheckCircle, getValue: (s: JobStats) => s.completed },
  { key: 'invoiced' as const, label: 'Invoiced', icon: DollarSign, getValue: (s: JobStats) => s.invoiced },
  { key: 'cancelled' as const, label: 'Cancelled', icon: XCircle, getValue: (s: JobStats) => s.cancelled },
];

export function JobStatusOverview({ stats, onStatusClick }: JobStatusOverviewProps) {
  return (
    <Card className="h-full">
      <CardContent className="p-3">
        <h3 className="text-sm font-semibold mb-3">Job Status Overview</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {statusConfig.map(({ key, label, icon: Icon, getValue }) => (
            <Button variant="ghost"
              key={key}
              onClick={() => onStatusClick(key, label)}
              className="flex h-24 flex-col items-center justify-center p-2 rounded-md border bg-muted/30 hover:bg-muted text-center"
            >
              <Icon className="w-5 h-5 mb-2 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
              <p className="text-xl font-bold text-foreground">{getValue(stats)}</p>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

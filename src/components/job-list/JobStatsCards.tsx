
import { Card, CardContent } from "@/components/ui/card";

interface JobStats {
  total: number;
  pending: number;
  inProgress: number;
  designing: number;
  completed: number;
  invoiced: number;
  cancelled: number;
}

interface JobStatsCardsProps {
  stats: JobStats;
}

export function JobStatsCards({ stats }: JobStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      {Object.entries(stats).map(([key, value]) => (
        <Card key={key} className="bg-card  border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{value}</div>
            <div className="text-sm text-muted-foreground capitalize">
              {key === 'inProgress' ? 'In Progress' : key}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

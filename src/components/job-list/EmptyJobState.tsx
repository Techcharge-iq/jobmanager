
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase } from "lucide-react";

export function EmptyJobState() {
  return (
    <Card className="bg-card  border-0 shadow-lg">
      <CardContent className="p-12 text-center">
        <div className="text-muted-foreground mb-4">
          <Briefcase className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">No jobs found</h3>
        <p className="text-muted-foreground">Try adjusting your search criteria or filters</p>
      </CardContent>
    </Card>
  );
}

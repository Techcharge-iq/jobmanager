import { AlertTriangle, Briefcase, Factory, Receipt } from "lucide-react";
import { formatOmaniRial } from "@/utils/currency";
import { KpiCard } from "@/components/kpi/KpiCard";

export interface DashboardKpiSummary {
  totalJobs: number;
  waitingInvoiceCount: number;
  waitingInvoiceValue: number;
  activeJobs: number;
  urgentJobs: number;
}

export function KpiStrip({ summary }: { summary: DashboardKpiSummary }) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-2 lg:grid-cols-4">
      <KpiCard
        tone="lavender"
        icon={Briefcase}
        label="Total jobs"
        value={summary.totalJobs}
        format={(value) => String(Math.round(value))}
        hint="all available jobs"
      />
      <KpiCard
        tone="peach"
        icon={Receipt}
        label="Waiting for invoice"
        value={summary.waitingInvoiceValue}
        format={formatOmaniRial}
        hint={`${summary.waitingInvoiceCount} jobs ready to bill`}
      />
      <KpiCard
        tone="sky"
        icon={Factory}
        label="Active work"
        value={summary.activeJobs}
        format={(value) => String(Math.round(value))}
        hint="pending, design, and production"
      />
      <KpiCard
        tone={summary.urgentJobs > 0 ? "rose" : "mint"}
        icon={AlertTriangle}
        label="High priority"
        value={summary.urgentJobs}
        format={(value) => String(Math.round(value))}
        hint={summary.urgentJobs > 0 ? "open jobs needing attention" : "nothing urgent"}
      />
    </div>
  );
}

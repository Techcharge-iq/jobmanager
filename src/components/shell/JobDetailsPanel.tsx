import { format } from "date-fns";
import { Download, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JobDetailsForm } from "@/components/job-details/JobDetailsForm";
import { JobDetailsActions } from "@/components/job-details/JobDetailsActions";
import { InvoiceNumberSection } from "@/components/job-details/InvoiceNumberSection";
import { JobOrderItemsForm } from "@/components/JobOrderItemsForm";
import { JobImageGallery } from "@/components/image-upload/JobImageGallery";
import { JobWorkflowTimeline } from "@/components/job-details/workspace/JobWorkflowTimeline";
import { JobNotes } from "@/components/job-details/workspace/JobNotes";
import { JobHistory } from "@/components/job-details/workspace/JobHistory";
import { useJobDetails } from "@/hooks/useJobDetails";
import { formatOmaniRial } from "@/utils/currency";
import { cn } from "@/lib/utils";
import type { Job } from "@/pages/Index";

interface Props { job: Job | null; loading: boolean; isEditMode?: boolean; onClose: () => void }

const SECTIONS = ["Overview", "Brief", "Design", "Approvals", "Production", "Quality check", "Delivery", "Invoice", "Notes", "History"] as const;
const slug = (s: string) => s.toLowerCase().replace(/\s+/g, "-");

function Facts({ rows }: { rows: [string, string | undefined | null][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="min-w-0"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="truncate font-medium">{v || "Not set"}</dd></div>
      ))}
    </dl>
  );
}

const Panel = ({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) => (
  <section className={cn("rounded-xl border bg-card p-4 shadow-card", className)}>{title && <h3 className="mb-3 text-[13px] font-semibold">{title}</h3>}{children}</section>
);

const fmtDate = (v?: string | null) => { const d = v ? new Date(v) : null; return d && !Number.isNaN(d.getTime()) ? format(d, "d MMM yyyy") : undefined; };

/** Job workspace shown inside a job tab. Same hook, same data calls, same writes as the dialog. */
export function JobDetailsPanel({ job, loading, isEditMode = false, onClose }: Props) {
  const d = useJobDetails({ job, isEditMode, onClose });

  if (!job) {
    return (
      <div className="mx-auto w-full max-w-3xl p-3 md:p-6">
        <Panel>
          {loading ? (
            <div className="space-y-4"><Skeleton className="h-7 w-2/3" /><Skeleton className="h-16 w-full" /><Skeleton className="h-40 w-full" /></div>
          ) : (
            <div className="space-y-3">
              <h2 className="text-h3">This job isn’t available</h2>
              <p className="text-sm text-muted-foreground">It may have been deleted, or it hasn’t synced to this device yet. Close this tab and open the job again.</p>
              <Button onClick={onClose}>Close tab</Button>
            </div>
          )}
        </Panel>
      </div>
    );
  }

  const staff = [job.designer, job.assignee, job.salesman].filter((n) => n && n !== "Unassigned");
  const actions = <JobDetailsActions isEditMode={isEditMode} isLoading={d.isLoading} onClose={onClose} onSave={d.handleSave} />;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-3 p-3 md:p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-mono text-lg font-semibold tracking-tight">{job.jobOrderNumber}</h2>
            <StatusBadge status={job.status} />
            {job.priority === "high" && <span className="rounded-md border border-rose-300 px-1.5 text-xs font-semibold text-rose-700 dark:border-rose-400/40 dark:text-rose-300">High priority</span>}
          </div>
          <p className="mt-0.5 truncate text-sm font-medium">{job.title}</p>
          <p className="truncate text-xs text-muted-foreground">{job.customer}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={d.handleShareWhatsApp} disabled={d.isSharing}><MessageCircle className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">{d.isSharing ? "Sharing…" : "WhatsApp"}</span><span className="sr-only sm:hidden">Share on WhatsApp</span></Button>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={d.handleExportPDF} disabled={d.isExporting}><Download className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">{d.isExporting ? "Exporting…" : "Export PDF"}</span><span className="sr-only sm:hidden">Export PDF</span></Button>
          <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5" onClick={onClose}><X className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Close tab</span><span className="sr-only sm:hidden">Close tab</span></Button>
        </div>
      </header>

      <Panel className="py-3"><JobWorkflowTimeline job={job} /></Panel>

      <div className="grid gap-3 lg:grid-cols-12">
        <Tabs defaultValue="overview" className="min-w-0 lg:col-span-8">
          <TabsList aria-label="Job sections" className="mb-3 flex h-9 w-full justify-start overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SECTIONS.map((s) => <TabsTrigger key={s} value={slug(s)} className="h-full shrink-0 px-2.5 text-xs">{s}</TabsTrigger>)}
          </TabsList>

          <TabsContent value="overview" className="mt-0 space-y-3">
            <JobDetailsForm job={job} isEditMode={isEditMode} editData={d.editData} onEditDataChange={d.setEditData} />
            {actions}
          </TabsContent>
          <TabsContent value="brief" className="mt-0 space-y-3">
            <Panel title="Job brief"><p className="whitespace-pre-wrap text-sm">{job.jobOrderDetails || <span className="text-muted-foreground">No brief was entered for this job.</span>}</p></Panel>
            <Panel title="Items"><JobOrderItemsForm jobOrderId={job.id} readOnly /></Panel>
          </TabsContent>
          <TabsContent value="design" className="mt-0 space-y-3">
            <Panel title="Design"><Facts rows={[["Designer", job.designer && job.designer !== "Unassigned" ? job.designer : null], ["Status", job.status]]} /></Panel>
            <Panel title="Artwork and images"><JobImageGallery jobOrderId={job.id} canEdit={false} /></Panel>
          </TabsContent>
          <TabsContent value="approvals" className="mt-0">
            <Panel title="Approval"><Facts rows={[["Approval status", job.approval_status?.replace(/_/g, " ")], ["Created by team", job.salesman && job.salesman !== "Unassigned" ? job.salesman : null]]} />
              <p className="mt-3 text-xs text-muted-foreground">Approvals are reviewed from the dashboard and your notifications.</p></Panel>
          </TabsContent>
          <TabsContent value="production" className="mt-0">
            <Panel title="Production"><Facts rows={[["Status", job.status], ["Assigned to", job.assignee && job.assignee !== "Unassigned" ? job.assignee : null], ["Estimated hours", job.estimatedHours ? `${job.estimatedHours} h` : null], ["Due", fmtDate(job.dueDate)]]} /></Panel>
          </TabsContent>
          <TabsContent value="quality-check" className="mt-0">
            <Panel title="Quality check"><p className="text-sm text-muted-foreground">JobFlow doesn’t record quality checks yet, so there is nothing to show here. Use <strong className="text-foreground">Notes</strong> to log the result for this job.</p></Panel>
          </TabsContent>
          <TabsContent value="delivery" className="mt-0">
            <Panel title="Delivery"><Facts rows={[["Delivered at", job.deliveredAt], ["Branch", job.branch], ["Due", fmtDate(job.dueDate)]]} /></Panel>
          </TabsContent>
          <TabsContent value="invoice" className="mt-0 space-y-3">
            <Panel title="Invoice">
              <Facts rows={[["Invoice number", job.invoiceNumber], ["Total value", job.totalValue ? formatOmaniRial(Number(job.totalValue)) : null]]} />
              <div className="mt-3"><InvoiceNumberSection invoiceNumber={d.invoiceNumber} onInvoiceNumberChange={d.setInvoiceNumber} canEditInvoice={d.canEditInvoice} /></div>
            </Panel>
            {actions}
          </TabsContent>
          <TabsContent value="notes" className="mt-0"><Panel title="Notes"><JobNotes jobId={job.id} /></Panel></TabsContent>
          <TabsContent value="history" className="mt-0"><Panel title="History"><JobHistory jobId={job.id} jobOrderNumber={job.jobOrderNumber} /></Panel></TabsContent>
        </Tabs>

        <aside aria-label="Key facts" className="space-y-3 lg:col-span-4">
          <Panel title="Key facts">
            <Facts rows={[["Customer", job.customer], ["Branch", job.branch], ["Due", fmtDate(job.dueDate)], ["Value", job.totalValue ? formatOmaniRial(Number(job.totalValue)) : null], ["Invoice", job.invoiceNumber], ["Created", fmtDate(job.createdAt)]]} />
          </Panel>
          <Panel title="Team">
            {staff.length ? <ul className="space-y-1.5 text-sm">{[["Designer", job.designer], ["Assignee", job.assignee], ["Salesman", job.salesman]].filter(([, n]) => n && n !== "Unassigned").map(([role, n]) => <li key={role} className="flex justify-between gap-2"><span className="text-muted-foreground">{role}</span><span className="truncate font-medium">{n}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">No one is assigned yet.</p>}
          </Panel>
        </aside>
      </div>
    </div>
  );
}

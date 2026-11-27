import { useEffect, useMemo, useState } from "react";
import type { Job } from "@/pages/Index";
import { updateJobOrder } from "@/data/jobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { statusLabel } from "@/lib/status";
import { formatOmaniRial } from "@/utils/currency";
import { useToast } from "@/hooks/use-toast";
import { ChevronsUpDown, Lock, Receipt } from "lucide-react";

interface Props {
  jobs: Job[];
  isAdmin: boolean;
  initialJobId?: string | null;
  onSaved?: () => void;
}

export function QuickInvoiceWidget({ jobs, isAdmin, initialJobId, onSaved }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState<string | null>(initialJobId ?? null);
  const job = useMemo(() => jobs.find((j) => j.id === jobId) ?? null, [jobs, jobId]);
  const [invoice, setInvoice] = useState("");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (initialJobId) setJobId(initialJobId); }, [initialJobId]);
  useEffect(() => {
    setInvoice(job?.invoiceNumber ?? "");
    setValue(job?.totalValue != null ? String(job.totalValue) : "");
  }, [job?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const locked = !!job && job.status === "invoiced" && !isAdmin;

  const save = async () => {
    if (!job) return;
    const amount = value.trim() === "" ? null : Number(value);
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await updateJobOrder(job.id, {
        invoice_number: invoice.trim() || null,
        total_value: amount,
        updated_at: new Date().toISOString(),
      });
      toast({ title: "Saved", description: `${job.jobOrderNumber} updated` });
      onSaved?.();
    } catch (e) {
      toast({ title: "Could not save", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0 rounded-lg border bg-card p-3 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Receipt className="h-4 w-4 text-primary" /> Quick invoice update
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-end">
        <div className="col-span-2 min-w-0 space-y-1 md:col-span-1">
          <Label>Job order</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-label="Job order" aria-expanded={open} className="w-full gap-2 justify-between font-mono">
                <span className="truncate">{job ? `${job.jobOrderNumber} · ${job.customer}` : "Pick a job number"}</span>
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(340px,calc(100vw-2rem))] p-0" align="start">
              <Command>
                <CommandInput placeholder="Type job number or customer" />
                <CommandList>
                  <CommandEmpty>No job found.</CommandEmpty>
                  <CommandGroup>
                    {jobs.slice(0, 300).map((j) => (
                      <CommandItem key={j.id} value={`${j.jobOrderNumber} ${j.customer} ${j.title}`} onSelect={() => { setJobId(j.id); setOpen(false); }}>
                        <span className="font-mono">{j.jobOrderNumber}</span>
                        <span className="ms-2 truncate text-muted-foreground">{j.customer}</span>
                        <span className="ms-auto text-xs text-muted-foreground">{statusLabel(j.status)}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1">
          <Label htmlFor="qi-invoice">Invoice no.</Label>
          <Input id="qi-invoice" value={invoice} onChange={(e) => setInvoice(e.target.value)} disabled={!job || locked} className="font-mono" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="qi-value">Value (OMR)</Label>
          <Input id="qi-value" type="number" step="0.001" min="0" value={value} onChange={(e) => setValue(e.target.value)} disabled={!job || locked} className="font-mono" />
        </div>
        <Button className="col-span-2 md:col-span-1" onClick={save} disabled={!job || locked || saving}>{saving ? "Saving…" : "Save"}</Button>
      </div>
      {job && (
        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          {locked && <Lock className="h-3 w-3" />}
          {locked ? "This job is invoiced and locked. Only admins can change it." : `${statusLabel(job.status)} · current value ${formatOmaniRial(job.totalValue)}`}
        </p>
      )}
    </div>
  );
}

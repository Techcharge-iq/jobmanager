
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InvoiceNumberSectionProps {
  invoiceNumber: string;
  onInvoiceNumberChange: (value: string) => void;
  canEditInvoice: boolean;
}

export function InvoiceNumberSection({ 
  invoiceNumber, 
  onInvoiceNumberChange, 
  canEditInvoice 
}: InvoiceNumberSectionProps) {
  return (
    <div className="bg-blue-50 dark:bg-blue-500/15 p-4 rounded-lg border border-blue-200 dark:border-blue-500/30">
      <div className="space-y-2">
        <Label htmlFor="invoiceNumber" className="text-sm font-medium text-blue-900 dark:text-blue-300">
          Invoice Number (Optional) {!canEditInvoice && '- View Only'}
        </Label>
        <Input
          id="invoiceNumber"
          value={invoiceNumber}
          onChange={(e) => onInvoiceNumberChange(e.target.value)}
          placeholder={canEditInvoice ? "Enter invoice number for PDF export" : "Not authorized to edit"}
          className="bg-card"
          disabled={!canEditInvoice}
        />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          {canEditInvoice 
            ? "This will appear at the top of the exported PDF and be saved to the job order." 
            : "Only authorized users (Admin) can edit invoice numbers."
          }
        </p>
      </div>
    </div>
  );
}

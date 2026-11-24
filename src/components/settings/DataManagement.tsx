import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Download, Upload, FileText, AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { forceFullResync } from "@/services/syncService";
import { createCustomer, listCustomers } from "@/data/customers";
import { createJobTitle, listJobTitlesWithCreatedAt } from "@/data/jobTitles";
import { listProfilesForExport, listProfilesWithDetails } from "@/data/profiles";
import { listJobOrdersForExport } from "@/data/jobs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DataType = 'job_orders' | 'customers' | 'job_titles' | 'profiles' | 'designers' | 'salesmen';

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export function DataManagement() {
  const [exportType, setExportType] = useState<DataType>('job_orders');
  const [importType, setImportType] = useState<DataType>('customers');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleForceResync = async () => {
    setIsResyncing(true);
    try {
      if (!user) throw new Error("Sign in before starting a full cache resync.");
      await forceFullResync(user.id);
      toast({
        title: "Sync Complete",
        description: "All jobs have been re-synced from the server.",
      });
    } catch (error) {
      console.error('Force resync error:', error);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to resync data",
        variant: "destructive",
      });
    } finally {
      setIsResyncing(false);
    }
  };

  const formatPriority = (priority: string): string => {
    const map: Record<string, string> = {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      urgent: 'Urgent'
    };
    return map[priority] || priority;
  };

  const formatStatus = (status: string): string => {
    const map: Record<string, string> = {
      pending: 'Pending',
      'in-progress': 'In Progress',
      designing: 'Designing',
      completed: 'Completed',
      finished: 'Finished',
      cancelled: 'Cancelled',
      invoiced: 'Invoiced'
    };
    return map[status] || status;
  };

  const formatApprovalStatus = (status: string): string => {
    const map: Record<string, string> = {
      pending_approval: 'Pending Approval',
      approved: 'Approved',
      rejected: 'Rejected'
    };
    return map[status] || status;
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const generateCSV = (data: Record<string, any>[], headers: string[]): string => {
    const headerRow = headers.join(',');
    const rows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        // Escape quotes and wrap in quotes if contains comma or quote
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    );
    return [headerRow, ...rows].join('\n');
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      let csvData: string;
      
      if (exportType === 'job_orders') {
        const jobOrders = await listJobOrdersForExport();

        // Fetch related data
        const [customers, jobTitles, profiles] = await Promise.all([
          listCustomers(),
          listJobTitlesWithCreatedAt(),
          listProfilesForExport()
        ]);

        const customersMap = new Map(customers.map(c => [c.id, c.name]));
        const jobTitlesMap = new Map(jobTitles.map(j => [j.id, j.job_title_id]));
        const profilesMap = new Map(profiles.map(p => [p.id, p.full_name]));

        // Transform data to human-readable format
        const transformedData = jobOrders.map(order => ({
          job_order_number: order.job_order_number,
          customer_name: customersMap.get(order.customer_id) || '',
          job_title: jobTitlesMap.get(order.job_title_id || '') || '',
          designer_name: profilesMap.get(order.designer_id || '') || '',
          salesman_name: profilesMap.get(order.salesman_id || '') || '',
          priority: formatPriority(order.priority),
          status: formatStatus(order.status),
          approval_status: formatApprovalStatus(order.approval_status),
          branch: order.branch || '',
          due_date: formatDate(order.due_date),
          estimated_hours: order.estimated_hours || '',
          actual_hours: order.actual_hours || '',
          job_order_details: order.job_order_details || '',
          invoice_number: order.invoice_number || '',
          delivered_at: order.delivered_at || '',
          client_name: order.client_name || '',
          created_at: formatDate(order.created_at),
          updated_at: formatDate(order.updated_at)
        })) || [];

        const headers = [
          'job_order_number', 'customer_name', 'job_title', 'designer_name', 'salesman_name',
          'priority', 'status', 'approval_status', 'branch', 'due_date', 'estimated_hours',
          'actual_hours', 'job_order_details', 'invoice_number', 'delivered_at', 'client_name',
          'created_at', 'updated_at'
        ];

        csvData = generateCSV(transformedData, headers);
      } else if (exportType === 'designers') {
        const data = await listProfilesWithDetails('designer');
        csvData = generateCSV(data, ['id', 'full_name', 'email', 'phone', 'branch', 'department', 'role', 'is_active', 'created_at']);
      } else if (exportType === 'salesmen') {
        const data = await listProfilesWithDetails('salesman');
        csvData = generateCSV(data, ['id', 'full_name', 'email', 'phone', 'branch', 'department', 'role', 'is_active', 'created_at']);
      } else if (exportType === 'customers') {
        const data = await listCustomers();
        csvData = generateCSV(data, ['id', 'name']);
      } else if (exportType === 'job_titles') {
        const data = await listJobTitlesWithCreatedAt();
        csvData = generateCSV(data, ['id', 'job_title_id', 'created_at']);
      } else {
        const data = await listProfilesForExport();
        csvData = generateCSV(data, ['id', 'full_name', 'email', 'phone', 'branch', 'department', 'role', 'is_active', 'created_at']);
      }

      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${exportType}_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: `${exportType} data exported successfully`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to export data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      return values;
    });
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      if (rows.length < 2) {
        throw new Error('CSV file must contain headers and at least one data row');
      }

      const headers = rows[0].map(h => h.toLowerCase().trim());
      const dataRows = rows.slice(1);

      const result: ImportResult = {
        success: 0,
        failed: 0,
        errors: []
      };

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        try {
          const record = headers.reduce((obj, header, index) => {
            obj[header] = row[index]?.replace(/^"|"$/g, '').trim() || null;
            return obj;
          }, {} as Record<string, any>);

          // Validate required fields based on import type
          if (importType === 'customers' && !record.name) {
            throw new Error('Missing required field: name');
          }
          if (importType === 'job_titles' && !record.job_title_id) {
            throw new Error('Missing required field: job_title_id');
          }

          // Insert data based on type
          if (importType === 'customers') {
            await createCustomer(record.name);
          } else if (importType === 'job_titles') {
            await createJobTitle(record.job_title_id);
          }

          result.success++;
        } catch (error) {
          result.failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Row ${i + 2}: ${errorMsg}`);
        }
      }

      setImportResult(result);

      if (result.success > 0) {
        toast({
          title: "Import completed",
          description: `Successfully imported ${result.success} record(s)${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
        });
      } else {
        toast({
          title: "Import failed",
          description: "No records were imported",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import data",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const getDataTypeLabel = (type: DataType): string => {
    const labels: Record<DataType, string> = {
      job_orders: 'Job Orders',
      customers: 'Customers',
      job_titles: 'Job Titles',
      profiles: 'User Profiles',
      designers: 'Designers',
      salesmen: 'Salesmen'
    };
    return labels[type];
  };

  return (
    <div className="space-y-6">
      {/* Force Resync Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Sync Data</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Force a full resync to reload all jobs from the server. Use this if you notice missing or outdated data.
        </p>
        <Button 
          onClick={handleForceResync} 
          disabled={isResyncing}
          variant="outline"
          className="w-full"
        >
          <RefreshCw className={`w-4 h-4 me-2 ${isResyncing ? 'animate-spin' : ''}`} />
          {isResyncing ? 'Syncing all jobs...' : 'Force Full Resync'}
        </Button>
      </div>

      <Separator />

      {/* Export Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Export Data</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Export your data to CSV format for backup or analysis
        </p>
        
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="export-type">Select data type</Label>
            <Select value={exportType} onValueChange={(value) => setExportType(value as DataType)}>
              <SelectTrigger id="export-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="job_orders">Job Orders</SelectItem>
                <SelectItem value="customers">Customers</SelectItem>
                <SelectItem value="job_titles">Job Titles</SelectItem>
                <SelectItem value="profiles">User Profiles</SelectItem>
                <SelectItem value="designers">Designers</SelectItem>
                <SelectItem value="salesmen">Salesmen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleExportData} 
            disabled={isExporting}
            className="w-full"
          >
            <Download className="w-4 h-4 me-2" />
            {isExporting ? 'Exporting...' : `Export ${getDataTypeLabel(exportType)}`}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Import Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Import Data</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Import data from CSV files. Make sure your CSV has the correct column headers.
        </p>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Required CSV format:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• <strong>Customers:</strong> name</li>
              <li>• <strong>Job Titles:</strong> job_title_id</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="import-type">Select data type</Label>
            <Select value={importType} onValueChange={(value) => setImportType(value as DataType)}>
              <SelectTrigger id="import-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customers">Customers</SelectItem>
                <SelectItem value="job_titles">Job Titles</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="import-file">Choose CSV file</Label>
            <input
              id="import-file"
              type="file"
              accept=".csv"
              onChange={handleImportData}
              disabled={isImporting}
              className="block w-full text-sm text-foreground file:me-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {isImporting && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4 animate-pulse" />
              Importing data...
            </div>
          )}

          {importResult && (
            <Alert variant={importResult.failed > 0 ? "destructive" : "default"}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">Import Results:</p>
                  <p>✓ Successfully imported: {importResult.success}</p>
                  {importResult.failed > 0 && (
                    <>
                      <p>✗ Failed: {importResult.failed}</p>
                      {importResult.errors.length > 0 && (
                        <div className="mt-2 space-y-1 text-xs max-h-40 overflow-y-auto">
                          <p className="font-semibold">Errors:</p>
                          {importResult.errors.slice(0, 10).map((error, i) => (
                            <p key={i}>• {error}</p>
                          ))}
                          {importResult.errors.length > 10 && (
                            <p>... and {importResult.errors.length - 10} more errors</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}

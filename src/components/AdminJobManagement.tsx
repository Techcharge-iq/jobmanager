import { useState, useEffect } from "react";
import { Job, JobStatus } from "@/pages/Index";
import { format } from "date-fns";
import { Filter, Calendar as CalendarIcon, X, Pencil, Eye, RotateCcw, RefreshCw, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { SyncStatusIndicator } from "@/components/ui/SyncStatusIndicator";

import { hasUserRole } from "@/data/profiles";
import { updateJobFields } from "@/data/jobs";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { JobDetails } from "@/components/JobDetails";
import { useDexieJobs, JobFilters } from "@/hooks/useDexieJobs";
import { updateJobInCache } from "@/services/syncService";
import { formatOmaniRial } from "@/utils/currency";

type JobDataUpdate = {
  id: string;
  [key: string]: unknown;
};

interface AdminJobManagementProps {
  onViewDetails?: (job: Job) => void;
  onStatusChange?: (jobId: string, status: string) => void;
  onStatusUpdate?: (jobId: string, status: JobStatus) => void;
  onJobDataUpdate?: (jobData: JobDataUpdate) => void;
}

const PAGE_SIZE = 50;

export function AdminJobManagement({ onStatusUpdate, onJobDataUpdate }: AdminJobManagementProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [page, setPage] = useState(1);

  const [salesmanFilter, setSalesmanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [dateFilter, setDateFilter] = useState<{ from: Date | undefined; to?: Date | undefined } | null>(null);

  const [selectedJob, setSelectedJob] = useState(null);
  const [isJobDetailsOpen, setIsJobDetailsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [editingTotalValue, setEditingTotalValue] = useState<{ [key: string]: string }>({});

  // Build filters object for Dexie hook
  const filters: JobFilters = {
    status: statusFilter,
    branch: branchFilter,
    salesman: salesmanFilter,
    customer: customerFilter,
    search: searchFilter,
    dateFrom: dateFilter?.from,
    dateTo: dateFilter?.to
  };

  // Use Dexie-based jobs hook
  const {
    jobs,
    totalCount,
    totalPages,
    currentPage,
    isLoading,
    isSyncing,
    syncError,
    filterOptions,
    refresh
  } = useDexieJobs(filters, page, PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [salesmanFilter, statusFilter, customerFilter, branchFilter, searchFilter, dateFilter]);

  // Ensure current page is valid
  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    const checkRole = async () => {
      if (!user) return;
      try {
        setIsAdmin(await hasUserRole(user.id, 'admin'));
      } catch (error) {
        console.error("Failed to check admin access:", error);
      }
    };
    checkRole();
  }, [user]);

  const clearAllFilters = () => {
    setSalesmanFilter("all");
    setCustomerFilter("all");
    setBranchFilter("all");
    setStatusFilter("all");
    setSearchFilter("");
    setDateFilter(null);
    setPage(1);
  };

  const hasActiveFilters = () => {
    return salesmanFilter !== "all" || 
           customerFilter !== "all" || 
           branchFilter !== "all" || 
           statusFilter !== "all" || 
           searchFilter !== "" || 
           dateFilter !== null;
  };

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    try {
      await updateJobFields(jobId, { status: newStatus as JobStatus });
      if (!user) {
        toast({ title: "Update failed", description: "A signed-in user is required to refresh the local cache.", variant: "destructive" });
        return;
      }
      await updateJobInCache(jobId, user.id);
      toast({ title: "Status updated" });
    } catch (error) {
      toast({ title: "Update failed", description: error instanceof Error ? error.message : "Unable to update status.", variant: "destructive" });
    }
  };

  const handleTotalValueUpdate = async (jobId: string, newValue: string) => {
    try {
      await updateJobFields(jobId, { total_value: parseFloat(newValue) });
      if (!user) {
        toast({ title: "Update failed", description: "A signed-in user is required to refresh the local cache.", variant: "destructive" });
        return;
      }
      await updateJobInCache(jobId, user.id);
      toast({ title: "Updated" });
      setEditingTotalValue(prev => {
        const newState = { ...prev };
        delete newState[jobId];
        return newState;
      });
    } catch (error) {
      toast({ title: "Update failed", description: error instanceof Error ? error.message : "Unable to update total value.", variant: "destructive" });
    }
  };

  // Transform Dexie jobs to match Job interface for JobDetails
  const transformedJobs = jobs.map(job => ({
    ...job,
    customer_name: job.customer_name || "Unknown Customer",
    salesman_name: job.salesman_name || "Unassigned", 
    designer_name: job.designer_name || "Unassigned",
    job_title: job.job_title || "No Title",
    id: job.id,
    jobOrderNumber: job.job_order_number,
    title: job.job_title || "No Title",
    customer: job.customer_name || "Unknown Customer",
    designer: job.designer_name || "Unassigned",
    salesman: job.salesman_name || "Unassigned",
    assignee: job.assignee,
    priority: job.priority,
    status: job.status,
    dueDate: job.due_date,
    estimatedHours: job.estimated_hours || 0,
    createdAt: job.created_at,
    branch: job.branch,
    jobOrderDetails: job.job_order_details,
    invoiceNumber: job.invoice_number,
    totalValue: job.total_value,
    customer_id: job.customer_id,
    job_title_id: job.job_title_id,
    created_by: job.created_by,
    approval_status: job.approval_status,
    deliveredAt: job.delivered_at,
    clientName: job.client_name
  }));

  if (!isAdmin) return <div className="p-6">Access Denied</div>;

  return (
    <div className="space-y-6 p-6 min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Admin Job Management</h1>
        <SyncStatusIndicator />
      </div>
      
      {/* Sync Status & Jobs Count */}
      <Card className="mb-4">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold text-foreground">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading from cache...
                </span>
              ) : (
                <>
                  Showing {transformedJobs.length} of {totalCount} jobs (Page {currentPage} of {totalPages})
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isSyncing && (
                <span className="text-sm text-blue-600 dark:text-blue-300 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Syncing...
                </span>
              )}
              {syncError && (
                <span className="text-sm text-red-600 dark:text-red-300">Sync error: {syncError}</span>
              )}
              <Button variant="outline" size="sm" onClick={refresh} disabled={isSyncing}>
                <RefreshCw className={cn("w-4 h-4 me-1", isSyncing && "animate-spin")} />
                Sync Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Panel */}
      <Card className="shadow-lg border-0 bg-card ">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-foreground">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600 dark:text-blue-300" />
              Job Orders Management
              {hasActiveFilters() && (
                <span className="text-sm bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                  Filters Active
                </span>
              )}
            </div>
            {hasActiveFilters() && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearAllFilters}
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Clear All Filters
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search Field */}
          <div className="mb-4">
            <Label>Search Job Orders</Label>
            <Input
              placeholder="Search by job number, details, client name, or assignee..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Salesman Filter */}
            <div className="space-y-2">
              <Label>Filter by Salesman</Label>
              <Select value={salesmanFilter} onValueChange={setSalesmanFilter}>
                <SelectTrigger><SelectValue placeholder="Select salesman" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {filterOptions.salesmen.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Customer Filter */}
            <div className="space-y-2">
              <Label>Filter by Customer</Label>
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {filterOptions.customers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Branch Filter */}
            <div className="space-y-2">
              <Label>Filter by Branch</Label>
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {filterOptions.branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Filter by Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="designing">Designing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="finished">Finished</SelectItem>
                  <SelectItem value="invoiced">Invoiced</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range Picker */}
          <div className="flex items-center gap-2 mt-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-auto justify-start text-start font-normal", !dateFilter && "text-muted-foreground")}
                >
                  <CalendarIcon className="me-2 h-4 w-4" />
                  {dateFilter?.from
                    ? `${format(dateFilter.from, "LLL dd, y")}${dateFilter?.to ? ` - ${format(dateFilter.to, "LLL dd, y")}` : ""}`
                    : "Filter by date range"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50" align="start">
                <Calendar
                  mode="range"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            {dateFilter && (
              <Button variant="ghost" size="sm" onClick={() => setDateFilter(null)}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Job Table */}
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Order #</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Salesman</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    <p className="mt-2 text-muted-foreground">Loading jobs...</p>
                  </TableCell>
                </TableRow>
              ) : transformedJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No jobs found matching filters
                  </TableCell>
                </TableRow>
              ) : (
                transformedJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-mono">{job.job_order_number || "N/A"}</TableCell>
                    <TableCell className="font-medium">{job.job_title || "N/A"}</TableCell>
                    <TableCell>{job.customer_name || "N/A"}</TableCell>
                    <TableCell>{job.branch || "N/A"}</TableCell>
                    <TableCell>{job.salesman_name || 'Unassigned'}</TableCell>
                    <TableCell>{job.created_at ? new Date(job.created_at).toLocaleDateString() : "N/A"}</TableCell>
                    <TableCell>
                      <Select value={job.status} onValueChange={(val) => handleStatusChange(job.id, val)}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="designing">Designing</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="finished">Finished</SelectItem>
                          <SelectItem value="invoiced">Invoiced</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {editingTotalValue[job.id] !== undefined ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.001"
                            value={editingTotalValue[job.id]}
                            onChange={(e) =>
                              setEditingTotalValue(prev => ({ ...prev, [job.id]: e.target.value }))
                            }
                            className="w-24"
                          />
                          <Button size="sm" onClick={() => handleTotalValueUpdate(job.id, editingTotalValue[job.id])}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => {
                            const updated = { ...editingTotalValue };
                            delete updated[job.id];
                            setEditingTotalValue(updated);
                          }}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>{formatOmaniRial(job.total_value)}</span>
                          <Button size="sm" variant="ghost" onClick={() =>
                            setEditingTotalValue(prev => ({
                              ...prev,
                              [job.id]: job.total_value?.toString() || "0"
                            }))
                          }>
                            Edit
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{job.invoice_number || "N/A"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => {
                          setSelectedJob(job);
                          setIsJobDetailsOpen(true);
                          setIsEditMode(false);
                        }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          setSelectedJob(job);
                          setIsJobDetailsOpen(true);
                          setIsEditMode(true);
                        }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <Button disabled={currentPage === 1 || isLoading} onClick={() => setPage((p) => p - 1)}>Previous</Button>
        <span>Page {currentPage} of {totalPages}</span>
        <Button disabled={currentPage === totalPages || isLoading} onClick={() => setPage((p) => p + 1)}>Next</Button>
      </div>

      {/* Job Details Modal */}
      <JobDetails
        isOpen={isJobDetailsOpen}
        onClose={() => setIsJobDetailsOpen(false)}
        job={selectedJob}
        isEditMode={isEditMode}
      />
    </div>
  );
}

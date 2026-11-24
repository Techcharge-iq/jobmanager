import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronRight, Download, History, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { listJobOrderLogs, restoreJobOrderFromSnapshot, type JobOrderLogEntry } from "@/data/jobAudit";

interface JobEditLogProps {
  jobOrderId: string;
  jobOrderNumber: string;
  isOpen: boolean;
  onClose: () => void;
}

type LogEntry = JobOrderLogEntry;

export function JobEditLog({ jobOrderId, jobOrderNumber, isOpen, onClose }: JobEditLogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [userFilter, setUserFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["job-order-logs", jobOrderId],
    queryFn: () => listJobOrderLogs(jobOrderId),
    enabled: isOpen,
    staleTime: 60_000,
  });

  const uniqueUsers = useMemo(() => {
    const users = new Set(logs.map((log) => log.user_name));
    return Array.from(users);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (userFilter !== "all" && log.user_name !== userFilter) return false;
      if (dateFrom && new Date(log.changed_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(log.changed_at) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [logs, userFilter, dateFrom, dateTo]);

  const toggleExpand = (id: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const exportToCSV = () => {
    const headers = ["Timestamp", "User", "Action", "Changes"];
    const rows = filteredLogs.map((log) => {
      const changes = log.changed_fields
        ? Object.entries(log.changed_fields)
            .map(([field, values]) => `${field}: ${values.old} → ${values.new}`)
            .join("; ")
        : "Initial creation";
      return [
        format(new Date(log.changed_at), "yyyy-MM-dd HH:mm:ss"),
        log.user_name,
        log.action,
        changes,
      ];
    });

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job-order-${jobOrderNumber}-log.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Log exported successfully",
    });
  };

  const formatFieldName = (field: string) => {
    return field
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleRevert = async (log: LogEntry) => {
    const confirmed = window.confirm(
      `Revert job order to state from ${format(new Date(log.changed_at), "MMM dd, yyyy HH:mm")}?\n\nThis will overwrite current data with the selected snapshot.`
    );

    if (!confirmed) return;

    try {
      await restoreJobOrderFromSnapshot(jobOrderId, log.id);

      toast({
        title: "Reverted Successfully",
        description: `Job order restored to state from ${format(new Date(log.changed_at), "MMM dd, yyyy HH:mm")}`,
      });

      queryClient.invalidateQueries({ queryKey: ["job-order-logs", jobOrderId] });
      queryClient.invalidateQueries({ queryKey: ["job-orders"] });

      onClose();
    } catch (error: any) {
      console.error("Revert error:", error);
      toast({
        title: "Revert Failed",
        description: error.message || "Failed to revert job order",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Edit Log - {jobOrderNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {uniqueUsers.map((user) => (
                  <SelectItem key={user} value={user}>
                    {user}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="From"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[150px]"
            />

            <Input
              type="date"
              placeholder="To"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[150px]"
            />

            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={filteredLogs.length === 0}>
              <Download className="w-4 h-4 me-2" />
              Export CSV
            </Button>
          </div>

          <ScrollArea className="h-[500px] pe-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No log entries found</div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedEntries.has(log.id);
                  const isCreation = log.action === "created";

                  return (
                    <div
                      key={log.id}
                      className="border border-border rounded-lg p-3 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start gap-2 cursor-pointer" onClick={() => toggleExpand(log.id)}>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0 rtl:-scale-x-100" />
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground font-mono">
                              {format(new Date(log.changed_at), "MMM dd, yyyy HH:mm")}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              {log.user_name}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                isCreation
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                                  : "bg-blue-500/10 text-blue-600 dark:text-blue-300"
                              }`}
                            >
                              {isCreation ? "Created" : "Updated"}
                            </span>
                          </div>

                          {!isExpanded && log.changed_fields && (
                            <div className="text-sm mt-1 text-muted-foreground">
                              {Object.keys(log.changed_fields).length} field(s) changed
                            </div>
                          )}

                          {isExpanded && (
                            <div className="mt-3 space-y-2">
                              {isCreation ? (
                                <div className="text-sm text-muted-foreground">Job order created</div>
                              ) : (
                                log.changed_fields && (
                                  <div className="space-y-2">
                                    {Object.entries(log.changed_fields).map(([field, values]) => (
                                      <div key={field} className="text-sm border-s-2 border-primary/30 ps-3">
                                        <div className="font-medium text-foreground">{formatFieldName(field)}</div>
                                        <div className="flex items-center gap-2 text-muted-foreground mt-1">
                                          <span className="line-through">{values.old || "(empty)"}</span>
                                          <span>→</span>
                                          <span className="text-foreground font-medium">
                                            {values.new || "(empty)"}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )
                              )}

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRevert(log);
                                }}
                                className="mt-2 text-orange-600 dark:text-orange-300 hover:text-orange-700 border-orange-300 dark:border-orange-500/30 hover:border-orange-400"
                              >
                                <RotateCcw className="w-4 h-4 me-2" />
                                Revert to this version
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

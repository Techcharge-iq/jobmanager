import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { updateJobOrder } from "@/services/jobOrdersApi";
import { cacheJobOrder, isSyncAvailable, patchJobOrderCache } from "@/services/syncService";
import { getProfileRole } from "@/data/profiles";
import { getJobOrderDetails, updatePendingJobApproval } from "@/data/jobs";
import { subscribeToJobOrderChanges } from "@/data/realtime";
import { useNotifications } from "@/contexts/NotificationContext";
import { useJobActions } from "@/hooks/useJobActions";
import type { DashboardJob, JobOrderRecord, JobStatus } from "@/types/jobOrder";

const JobDetails = lazy(() =>
  import("@/components/JobDetails").then((module) => ({ default: module.JobDetails })),
);

type WorkflowAlert = {
  id: string;
  type: "created" | "approved" | "completed";
  jobId: string;
  jobOrderNumber: string;
};

interface WorkflowAlertsUpdatedDetail {
  key: string;
  alerts: WorkflowAlert[];
}

interface WorkflowAlertOpenDetail {
  id: string;
}

declare global {
  interface WindowEventMap {
    "workflow-alerts-updated": CustomEvent<WorkflowAlertsUpdatedDetail>;
    "workflow-alert-open": CustomEvent<WorkflowAlertOpenDetail>;
  }
}

const WORKFLOW_ALERTS_UPDATED_EVENT = "workflow-alerts-updated";
const DESIGNER_STATUSES: JobStatus[] = ["pending", "completed", "out", "foc_sample", "finished"];

function canApproveJobs(role: string | null): boolean {
  return role === "admin" || role === "manager" || role === "job_order_manager";
}

function getStoredAlerts(key: string): WorkflowAlert[] {
  try {
    const value = localStorage.getItem(key);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error("Workflow alert data is not an array");
    return parsed as WorkflowAlert[];
  } catch (error) {
    console.error("Failed to read saved workflow alerts:", error);
    return [];
  }
}

function persistAlerts(key: string, alerts: WorkflowAlert[]) {
  try {
    localStorage.setItem(key, JSON.stringify(alerts));
    window.dispatchEvent(
      new CustomEvent(WORKFLOW_ALERTS_UPDATED_EVENT, {
        detail: { key, alerts },
      }),
    );
  } catch (error) {
    console.error("Failed to save workflow alerts:", error);
  }
}

function createChimeDataUrl(): string {
  const sampleRate = 8000;
  const sampleCount = 1600;
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index++) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, sampleCount * 2, true);

  for (let index = 0; index < sampleCount; index++) {
    const progress = index / sampleCount;
    const sample = Math.sin(2 * Math.PI * 880 * index / sampleRate) * (1 - progress);
    view.setInt16(44 + index * 2, Math.round(sample * 5000), true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `data:audio/wav;base64,${btoa(binary)}`;
}

const chimeDataUrl = createChimeDataUrl();

export function WorkflowAlertManager() {
  const { user } = useAuth();
  const { addNotification, notifications: localNotifications, markAsRead } = useNotifications();
  const userId = user?.id;
  const { setJobStatus } = useJobActions();
  const [role, setRole] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<WorkflowAlert[]>([]);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<JobStatus | "">("");
  const [viewJob, setViewJob] = useState<DashboardJob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const alertKey = useMemo(
    () => userId ? `jobmanager:workflow-alerts:${userId}` : null,
    [userId],
  );
  const legacySnapshotKey = useMemo(
    () => userId ? `jobmanager:workflow-snapshot:${userId}` : null,
    [userId],
  );
  
  const activeAlert = useMemo(() => alerts.find(
    (alert) =>
      alert.id === selectedAlertId &&
      (role === "admin" || alert.type !== "completed"),
  ) || null, [alerts, role, selectedAlertId]);

  const isCompletionAlert = activeAlert?.type === "completed";

  const publishWorkflowNotifications = useCallback((addedAlerts: WorkflowAlert[]) => {
    addedAlerts.forEach((alert) => {
      addNotification({
        type: alert.type === "completed"
          ? "invoice_completed"
          : alert.type === "created"
            ? "job_created"
            : "status_change",
        message: alert.type === "completed"
          ? `Job #${alert.jobOrderNumber} is completed and needs an invoice.`
          : alert.type === "approved"
            ? `Job #${alert.jobOrderNumber} has been approved.`
            : `Job #${alert.jobOrderNumber} was created.`,
        jobOrderNumber: alert.jobOrderNumber,
        actionId: alert.id,
        read: false,
      });
    });
  }, [addNotification]);

  useEffect(() => {
    if (!userId || !alertKey) {
      setRole(null);
      setAlerts([]);
      setSelectedAlertId(null);
      return;
    }

    setRole(null);
    setSelectedAlertId(null);
    const savedAlerts = getStoredAlerts(alertKey);
    setAlerts(savedAlerts);
    publishWorkflowNotifications(savedAlerts);
    try {
      if (legacySnapshotKey) localStorage.removeItem(legacySnapshotKey);
    } catch (error) {
      console.error("Failed to remove the legacy workflow snapshot:", error);
    }

    let active = true;
    let unsubscribe: (() => void) | null = null;
    let resolvedRole: string | null = null;

    const startRealtimeAlerts = async () => {
      if (!active || !isSyncAvailable() || unsubscribe) return;
      if (resolvedRole === null) {
        let profileRole: string | null;
        try {
          profileRole = await getProfileRole(userId);
        } catch (roleError) {
          console.error("Failed to load workflow alert role:", roleError);
          return;
        }
        if (!active || !isSyncAvailable()) return;
        resolvedRole = profileRole || "";
      }

      const currentRole = resolvedRole;
      setRole(currentRole);
      if (!["designer", "salesman", "admin", "manager", "job_order_manager"].includes(currentRole)) return;

      const addAlerts = (addedAlerts: WorkflowAlert[]) => {
        if (!active || addedAlerts.length === 0) return;
        const existingAlerts = getStoredAlerts(alertKey);
        const knownIds = new Set(existingAlerts.map((alert) => alert.id));
        const filteredAdded = addedAlerts.filter((alert) => !knownIds.has(alert.id));
        if (filteredAdded.length > 0) {
          const updatedAlerts = [...existingAlerts, ...filteredAdded];
          persistAlerts(alertKey, updatedAlerts);
          setAlerts(updatedAlerts);
          publishWorkflowNotifications(filteredAdded);
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            void audioRef.current.play().catch((error: unknown) => {
              console.info("Workflow notification sound could not play:", error);
            });
          }
        }
      };

      unsubscribe = subscribeToJobOrderChanges(
        userId,
        (payload: RealtimePostgresChangesPayload<JobOrderRecord>) => {
            if (!active || payload.eventType === "DELETE") return;
            const job = payload.new;
            const previousJob = payload.old as JobOrderRecord;
            const addedAlerts: WorkflowAlert[] = [];

            if (payload.eventType === "INSERT") {
              addedAlerts.push({
                id: `created:${job.id}:${job.created_at}`,
                type: "created",
                jobId: job.id,
                jobOrderNumber: job.job_order_number,
              });
            }
            if (
              currentRole === "designer" &&
              job.designer_id === userId &&
              job.approval_status === "approved" &&
              job.approved_at &&
              (previousJob?.approval_status !== "approved" || previousJob?.approved_at !== job.approved_at)
            ) {
              addedAlerts.push({
                id: `approved:${job.id}:${job.approved_at}`,
                type: "approved",
                jobId: job.id,
                jobOrderNumber: job.job_order_number,
              });
            }
            if (
              currentRole === "admin" &&
              job.status === "completed" &&
              previousJob?.status !== "completed"
            ) {
              addedAlerts.push({
                id: `completed:${job.id}`,
                type: "completed",
                jobId: job.id,
                jobOrderNumber: job.job_order_number,
              });
            }

            addAlerts(addedAlerts);
        },
        (status, error) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.error("Workflow alert realtime subscription failed:", error);
          }
        },
      );
    };

    void startRealtimeAlerts();
    const handleAvailabilityChange = () => {
      if (isSyncAvailable()) {
        void startRealtimeAlerts();
      } else if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    };
    const handleOpenWorkflowAlert = (event: WindowEventMap["workflow-alert-open"]) => {
      if (getStoredAlerts(alertKey).some((alert) => alert.id === event.detail.id)) {
        setSelectedAlertId(event.detail.id);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === alertKey) {
        const updatedAlerts = getStoredAlerts(alertKey);
        setAlerts(updatedAlerts);
        publishWorkflowNotifications(updatedAlerts);
      }
    };
    const handleSameTabUpdate = (
      event: WindowEventMap["workflow-alerts-updated"],
    ) => {
      if (event.detail?.key === alertKey && Array.isArray(event.detail.alerts)) {
        setAlerts(event.detail.alerts);
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener(WORKFLOW_ALERTS_UPDATED_EVENT, handleSameTabUpdate);
    window.addEventListener("workflow-alert-open", handleOpenWorkflowAlert);
    window.addEventListener("online", handleAvailabilityChange);
    window.addEventListener("offline", handleAvailabilityChange);
    document.addEventListener("visibilitychange", handleAvailabilityChange);

    return () => {
      active = false;
      unsubscribe?.();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(WORKFLOW_ALERTS_UPDATED_EVENT, handleSameTabUpdate);
      window.removeEventListener("workflow-alert-open", handleOpenWorkflowAlert);
      window.removeEventListener("online", handleAvailabilityChange);
      window.removeEventListener("offline", handleAvailabilityChange);
      document.removeEventListener("visibilitychange", handleAvailabilityChange);
    };
  }, [userId, alertKey, legacySnapshotKey, publishWorkflowNotifications]);

  useEffect(() => {
    setInvoiceNumber("");
    setSelectedStatus("");
    setSubmitError(null);
  }, [activeAlert?.id]);

  const dismissActiveAlert = () => {
    if (!activeAlert || !alertKey) return;
    let currentAlerts = alerts;
    try {
      if (localStorage.getItem(alertKey) !== null) {
        currentAlerts = getStoredAlerts(alertKey);
      }
    } catch (error) {
      console.error("Failed to read workflow alerts before dismissal:", error);
    }
    const updatedAlerts = currentAlerts.filter((alert) => alert.id !== activeAlert.id);
    persistAlerts(alertKey, updatedAlerts);
    setAlerts(updatedAlerts);
    setSelectedAlertId(null);
    const localNotification = localNotifications.find(
      (notification) => notification.actionId === activeAlert.id,
    );
    if (localNotification) markAsRead(localNotification.id);
  };

  const submitInvoice = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeAlert || activeAlert.type !== "completed") return;
    const normalizedInvoiceNumber = invoiceNumber.trim();
    if (!normalizedInvoiceNumber) {
      setSubmitError("Enter an invoice number to mark this job as invoiced.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const updatedJob = await updateJobOrder(activeAlert.jobId, {
        status: "invoiced",
        invoice_number: normalizedInvoiceNumber,
        updated_at: new Date().toISOString(),
      });
      if (!userId) throw new Error("A signed-in user is required to save the invoice.");
      await cacheJobOrder(updatedJob, userId);
      dismissActiveAlert();
    } catch (error) {
      console.error("Failed to save invoice and update job status:", error);
      setSubmitError(error instanceof Error ? error.message : "Failed to save the invoice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const approveNewJob = async () => {
    if (!userId || !activeAlert || activeAlert.type !== "created" || !canApproveJobs(role)) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (!navigator.onLine) throw new Error("Reconnect before approving this job.");
      const approvedAt = new Date().toISOString();
      await updatePendingJobApproval(activeAlert.jobId, userId, approvedAt);
      await patchJobOrderCache(activeAlert.jobId, {
        approval_status: "approved",
        approved_by: userId,
        approved_at: approvedAt,
        updated_at: approvedAt,
      }, userId);
      dismissActiveAlert();
    } catch (error) {
      console.error("Failed to approve new job order:", error);
      setSubmitError(error instanceof Error ? error.message : "Failed to approve the job order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openJobDetails = async () => {
    if (!activeAlert) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const jobOrder = await getJobOrderDetails(activeAlert.jobId);

      setViewJob({
        id: jobOrder.id,
        title: jobOrder.job_title_name || "Unknown Job Title",
        customer: jobOrder.customer_name || "Unknown Customer",
        designer: jobOrder.designer_name || "Unassigned",
        salesman: jobOrder.salesman_name || "Unassigned",
        assignee: jobOrder.assignee || undefined,
        jobOrderNumber: jobOrder.job_order_number,
        priority: jobOrder.priority,
        status: jobOrder.status,
        dueDate: jobOrder.due_date || "",
        estimatedHours: jobOrder.estimated_hours || 0,
        createdAt: jobOrder.created_at,
        branch: jobOrder.branch || undefined,
        jobOrderDetails: jobOrder.job_order_details || undefined,
        invoiceNumber: jobOrder.invoice_number || undefined,
        totalValue: jobOrder.total_value || undefined,
        customer_id: jobOrder.customer_id,
        job_title_id: jobOrder.job_title_id || undefined,
        created_by: jobOrder.created_by,
        approval_status: jobOrder.approval_status,
        deliveredAt: jobOrder.delivered_at || undefined,
        clientName: jobOrder.client_name || undefined,
      });
    } catch (error) {
      console.error("Failed to load job order details:", error);
      setSubmitError(error instanceof Error ? error.message : "Failed to load job details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveDesignerStatus = async () => {
    if (!activeAlert || activeAlert.type !== "approved" || !selectedStatus) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await setJobStatus(activeAlert.jobId, selectedStatus);
      if (!result.success) {
        throw new Error(result.error || "The job status was not updated.");
      }
      dismissActiveAlert();
    } catch (error) {
      console.error("Failed to update approved job status:", error);
      setSubmitError(error instanceof Error ? error.message : "Failed to update the job status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!userId) return <audio ref={audioRef} src={chimeDataUrl} preload="auto" className="hidden" />;

  return (
    <>
      <audio ref={audioRef} src={chimeDataUrl} preload="auto" className="hidden" />
      <Dialog
        open={!!activeAlert}
        onOpenChange={(open) => {
          if (!open) setSelectedAlertId(null);
        }}
      >
        <DialogContent
          className="sm:max-w-md"
        >
          <DialogHeader>
            <div className="mx-auto rounded-full bg-primary/10 p-3">
              {isCompletionAlert ? <FileText className="h-6 w-6 text-primary" /> : activeAlert?.type === "approved" ? <CheckCircle2 className="h-6 w-6 text-primary" /> : <AlertTriangle className="h-6 w-6 text-primary" />}
            </div>
            <DialogTitle className="text-center">
              {isCompletionAlert ? "Invoice required" : activeAlert?.type === "approved" ? "Job approved" : "New job order"}
            </DialogTitle>
            <DialogDescription className="text-center">
              Job order {activeAlert?.jobOrderNumber}
              {isCompletionAlert
                ? " is completed. Enter the invoice number to mark it as invoiced."
                : activeAlert?.type === "approved"
                  ? " has been approved."
                  : " has been created."}
            </DialogDescription>
          </DialogHeader>

          {isCompletionAlert ? (
            <form onSubmit={submitInvoice} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workflow-invoice-number">Invoice number</Label>
                <Input
                  id="workflow-invoice-number"
                  autoFocus
                  value={invoiceNumber}
                  onChange={(event) => setInvoiceNumber(event.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
              {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting || !invoiceNumber.trim()}>
                  {isSubmitting ? "Saving..." : "Save invoice and close"}
                </Button>
              </DialogFooter>
            </form>
          ) : activeAlert?.type === "created" ? (
            <>
              {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
              <DialogFooter>
                <Button variant="outline" onClick={openJobDetails} disabled={isSubmitting}>
                  <Eye className="me-2 h-4 w-4" />
                  View
                </Button>
                {canApproveJobs(role) && (
                  <Button onClick={approveNewJob} disabled={isSubmitting}>
                    {isSubmitting ? "Approving..." : "Approve"}
                  </Button>
                )}
              </DialogFooter>
            </>
          ) : activeAlert?.type === "approved" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workflow-job-status">Update job status</Label>
                <Select
                  value={selectedStatus}
                  onValueChange={(value) => {
                    if (DESIGNER_STATUSES.includes(value as JobStatus)) {
                      setSelectedStatus(value as JobStatus);
                    }
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="workflow-job-status">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    {DESIGNER_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status === "foc_sample" ? "FOC Sample" : status === "out" ? "Out" : status.replace("-", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
              <DialogFooter>
                <Button onClick={saveDesignerStatus} disabled={isSubmitting || !selectedStatus}>
                  {isSubmitting ? "Saving..." : "Save status"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <DialogFooter>
              <Button onClick={dismissActiveAlert}>Got it</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
      <Suspense fallback={null}>
        <JobDetails
          isOpen={!!viewJob}
          onClose={() => setViewJob(null)}
          job={viewJob}
        />
      </Suspense>
    </>
  );
}
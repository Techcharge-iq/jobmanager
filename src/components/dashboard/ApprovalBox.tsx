import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSlideDirection } from "@/hooks/useSlideDirection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, XCircle, AlertCircle, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { JobDetails } from "@/components/JobDetails";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { updateJobInCache } from "@/services/syncService";
import {
  getJobOrderDetails,
  listPendingApprovalJobs,
  updateJobApproval,
  type PendingApprovalJob,
} from "@/data/jobs";
import { subscribeToJobOrderChanges } from "@/data/realtime";

export function ApprovalBox({ isActive = true }: { isActive?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isJobDetailsOpen, setIsJobDetailsOpen] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const activePointerId = useRef<number | null>(null);
  const wheelDeltaX = useRef(0);
  const wheelTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user || !isActive) return;

    const unsubscribe = subscribeToJobOrderChanges(user.id, (payload) => {
          const affectsPendingApprovals = payload.eventType === 'INSERT'
            ? payload.new.approval_status === 'pending_approval'
            : payload.eventType === 'UPDATE'
              ? payload.new.approval_status === 'pending_approval' ||
                payload.old.approval_status === 'pending_approval'
              : payload.old.approval_status === 'pending_approval';
          if (affectsPendingApprovals) {
            void queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
          }
          void queryClient.invalidateQueries({ queryKey: ['job-orders'] });
        }, (status, error) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('Approval realtime subscription failed:', error);
          }
        });

    return () => {
      unsubscribe();
    };
  }, [isActive, queryClient, user]);

  const { data: pendingJobs = [], isLoading } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: (): Promise<PendingApprovalJob[]> => listPendingApprovalJobs(),
    enabled: !!user && isActive
  });

  useEffect(() => {
    if (!isActive) setIsJobDetailsOpen(false);
  }, [isActive]);

  const approvalMutation = useMutation({
    mutationFn: async ({ jobId, action }: { jobId: string; action: 'approve' | 'reject' }) => {
      await updateJobApproval(jobId, action === 'approve' ? 'approved' : 'rejected', user?.id ?? null);
      return { jobId, action };
    },
    onMutate: async ({ jobId }) => {
      await queryClient.cancelQueries({ queryKey: ['pending-approvals'] });
      await queryClient.cancelQueries({ queryKey: ['job-orders'] });
      const previousPendingJobs = queryClient.getQueryData(['pending-approvals']);
      queryClient.setQueryData(['pending-approvals'], (old: PendingApprovalJob[] | undefined) =>
        old ? old.filter(job => job.id !== jobId) : old
      );
      return { previousPendingJobs };
    },
    onSuccess: async ({ jobId }, { action }) => {
      try {
        if (!user) throw new Error('A signed-in user is required to update the local cache');
        await updateJobInCache(jobId, user.id);
      } catch (e) { console.error('Failed to update cache:', e); }
      toast({
        title: action === 'approve' ? "Job Approved" : "Job Rejected",
        description: `Job order has been ${action}d successfully.`,
      });
    },
    onError: (error, _, context) => {
      if (context?.previousPendingJobs) queryClient.setQueryData(['pending-approvals'], context.previousPendingJobs);
      console.error('Approval error:', error);
      toast({ title: "Error", description: "Failed to process approval. Please try again.", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['job-orders'] });
    }
  });

  const handleApproval = (jobId: string, action: 'approve' | 'reject') => {
    approvalMutation.mutate({ jobId, action });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId.current || dragStartX.current === null) return;
      setDragOffset(event.clientX - dragStartX.current);
    };

    const finishDrag = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId.current || dragStartX.current === null) return;
      const distance = event.clientX - dragStartX.current;
      if (Math.abs(distance) > 60) {
        setActiveCardIndex((index) => Math.max(0, Math.min(pendingJobs.length - 1, index + (distance < 0 ? 1 : -1))));
      }
      dragStartX.current = null;
      activePointerId.current = null;
      setDragOffset(0);
      setIsDragging(false);
    };

    const cancelDrag = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId.current) return;
      dragStartX.current = null;
      activePointerId.current = null;
      setDragOffset(0);
      setIsDragging(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", cancelDrag);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", cancelDrag);
    };
  }, [isDragging, pendingJobs.length]);

  useEffect(() => {
    setActiveCardIndex((index) => Math.min(index, Math.max(0, pendingJobs.length - 1)));
  }, [pendingJobs.length]);

  useEffect(() => () => {
    if (wheelTimeout.current) clearTimeout(wheelTimeout.current);
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (!event.isPrimary || (event.target instanceof Element && event.target.closest("button"))) return;
    dragStartX.current = event.clientX;
    activePointerId.current = event.pointerId;
    setIsDragging(true);
  };

  const handleWheel = (event: ReactWheelEvent<HTMLElement>) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) || Math.abs(event.deltaX) < 5) return;
    event.preventDefault();
    wheelDeltaX.current += event.deltaX;
    if (wheelTimeout.current) clearTimeout(wheelTimeout.current);
    wheelTimeout.current = setTimeout(() => {
      const direction = wheelDeltaX.current < 0 ? 1 : -1;
      if (Math.abs(wheelDeltaX.current) >= 30) {
        setActiveCardIndex((index) => Math.max(0, Math.min(pendingJobs.length - 1, index + direction)));
      }
      wheelDeltaX.current = 0;
      wheelTimeout.current = null;
    }, 80);
  };

  const activeJob = pendingJobs[activeCardIndex];
  const slideDir = useSlideDirection(activeCardIndex);

  const handleViewJob = async (jobId: string) => {
    try {
      const jobOrder = await getJobOrderDetails(jobId);
      setSelectedJob({
        id: jobOrder.id, title: jobOrder.job_title_name || 'Unknown Job Title',
        customer: jobOrder.customer_name || 'Unknown Customer', designer: jobOrder.designer_name || 'Unassigned',
        salesman: jobOrder.salesman_name || 'Unassigned', assignee: jobOrder.assignee,
        jobOrderNumber: jobOrder.job_order_number, priority: jobOrder.priority, status: jobOrder.status,
        dueDate: jobOrder.due_date, estimatedHours: jobOrder.estimated_hours || 0, createdAt: jobOrder.created_at,
        branch: jobOrder.branch, jobOrderDetails: jobOrder.job_order_details, invoiceNumber: jobOrder.invoice_number,
        totalValue: jobOrder.total_value, customer_id: jobOrder.customer_id, job_title_id: jobOrder.job_title_id,
        created_by: jobOrder.created_by, approval_status: jobOrder.approval_status, deliveredAt: jobOrder.delivered_at,
        clientName: jobOrder.client_name
      });
      setIsJobDetailsOpen(true);
    } catch (error) {
      console.error('Error fetching job details:', error);
      toast({ title: "Error", description: "Failed to load job details", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="p-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="w-5 h-5" />
            Pending Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-muted-foreground">Loading approvals...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="p-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertCircle className="w-5 h-5" />
          Pending Approvals ({pendingJobs.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {pendingJobs.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-primary/70" />
            <p className="text-sm">No pending approvals</p>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-2xl">
            <div className="relative h-[276px] sm:h-[250px]">
              {Array.from({ length: Math.min(3, pendingJobs.length) }, (_, index) => {
                const depth = Math.min(3, pendingJobs.length) - index - 1;
                return (
                  <div
                    key={`approval-card-layer-${depth}`}
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-full rounded-lg border bg-card shadow-md transition-[transform,opacity] duration-300 ease-out motion-reduce:duration-0"
                    style={{
                      zIndex: index,
                      opacity: 1 - depth * 0.18,
                      transform: `translateY(${depth * 10}px) scale(${1 - depth * 0.025})`,
                    }}
                  />
                );
              })}
              <article
                key={activeJob?.id}
                onPointerDown={handlePointerDown}
                onWheel={handleWheel}
                className={`job-slide-${slideDir} absolute inset-x-0 top-0 z-10 h-full select-none rounded-lg border bg-card p-4 shadow-xl transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-0`}
                style={{
                  transform: `translateX(${dragOffset}px) rotate(${dragOffset / 30}deg)`,
                  transition: isDragging ? "none" : undefined,
                  touchAction: "pan-y",
                }}
              >
                {activeJob && (
                  <div className="flex h-full flex-col justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="break-words font-semibold text-foreground">{activeJob.job_order_number}</h4>
                          <p className="mt-0.5 break-words text-sm text-muted-foreground">{activeJob.customer_name}</p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">Pending</Badge>
                      </div>
                      <p className="max-h-20 overflow-y-auto break-words text-sm text-muted-foreground">{activeJob.job_order_details || "No job details provided."}</p>
                    </div>
                    <div>
                      <div className="mb-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(activeJob.created_at).toLocaleDateString()}
                        </span>
                        <span className="truncate">Created by: {activeJob.created_by_name}</span>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleViewJob(activeJob.id)} className="h-8 px-2 text-xs">
                          <Eye className="me-1 h-3 w-3" />View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleApproval(activeJob.id, 'approve')} disabled={approvalMutation.isPending} className="h-8 px-2 text-xs">
                          <CheckCircle className="me-1 h-3 w-3" />Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleApproval(activeJob.id, 'reject')} disabled={approvalMutation.isPending} className="h-8 px-2 text-xs text-destructive">
                          <XCircle className="me-1 h-3 w-3" />Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            </div>
            <div className="mt-3 flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Previous pending approval"
                onClick={() => setActiveCardIndex((index) => Math.max(0, index - 1))}
                disabled={activeCardIndex === 0}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" />
              </Button>
              <span className="min-w-12 text-center text-xs tabular-nums text-muted-foreground" aria-live="polite">
                {activeCardIndex + 1} / {pendingJobs.length}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Next pending approval"
                onClick={() => setActiveCardIndex((index) => Math.min(pendingJobs.length - 1, index + 1))}
                disabled={activeCardIndex >= pendingJobs.length - 1}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4 rtl:-scale-x-100" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <JobDetails
        isOpen={isActive && isJobDetailsOpen}
        onClose={() => { setIsJobDetailsOpen(false); setSelectedJob(null); }}
        job={selectedJob}
        isEditMode={false}
        onJobUpdated={(updatedJob) => {
          if (updatedJob.approvalStatus === 'approved' || updatedJob.approvalStatus === 'rejected') {
            queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
            queryClient.invalidateQueries({ queryKey: ['job-orders'] });
            setIsJobDetailsOpen(false);
            setSelectedJob(null);
          }
        }}
      />
    </Card>
  );
}

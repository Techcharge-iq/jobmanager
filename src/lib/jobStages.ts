import type { DashboardJob } from "@/types/jobOrder";

/** Workflow stages shown on the job timeline. Derived from the job's existing status and approval status. */
export const STAGES = ["Brief", "Design", "Approval", "Production", "Quality check", "Delivery", "Invoice"] as const;
export type StageState = "done" | "current" | "upcoming" | "attention" | "untracked";

const PROGRESS: Record<string, number> = {
  pending: 10, designing: 30, "in-progress": 55, foc_sample: 55, out: 70, completed: 80, finished: 90, invoiced: 100, cancelled: 0,
};

/** Rough 0-100 progress through the workflow, from status alone. */
export const jobProgress = (status: string) => PROGRESS[status] ?? 0;

export function stageStates(job: Pick<DashboardJob, "status" | "approval_status" | "deliveredAt">): { label: (typeof STAGES)[number]; state: StageState }[] {
  const s = job.status;
  const approved = job.approval_status === "approved";
  const awaitingApproval = job.approval_status === "pending_approval";
  // index of the stage the job is currently in
  const at = s === "invoiced" ? 7 : s === "completed" || s === "finished" ? 5 : s === "in-progress" || s === "out" || s === "foc_sample" ? 3 : s === "designing" ? 1 : 0;
  return STAGES.map((label, i) => {
    if (s === "cancelled") return { label, state: i === 0 ? "done" : "upcoming" };
    if (label === "Quality check") return { label, state: "untracked" }; // no quality data is recorded in JobFlow
    if (label === "Approval") return { label, state: approved ? "done" : awaitingApproval ? "attention" : i < at ? "done" : "upcoming" };
    if (i < at) return { label, state: "done" };
    if (i === at) return { label, state: s === "invoiced" ? "done" : "current" };
    return { label, state: "upcoming" };
  });
}

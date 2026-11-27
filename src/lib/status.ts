import { Constants } from "@/integrations/supabase/types";
import type { JobStatus } from "@/types/jobOrder";

export const JOB_STATUSES = Constants.public.Enums.job_status;

export const STATUS_META: Record<JobStatus, { label: string; dot: string; chip: string; locked?: boolean }> = {
  pending:       { label: "Pending",      dot: "bg-amber-500",   chip: "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200" },
  "in-progress": { label: "In progress",  dot: "bg-sky-500",     chip: "bg-sky-100 text-sky-900 dark:bg-sky-400/15 dark:text-sky-200" },
  designing:     { label: "Designing",    dot: "bg-violet-500",  chip: "bg-violet-100 text-violet-900 dark:bg-violet-400/15 dark:text-violet-200" },
  out:           { label: "Out",          dot: "bg-orange-500",  chip: "bg-orange-100 text-orange-900 dark:bg-orange-400/15 dark:text-orange-200" },
  completed:     { label: "Completed",    dot: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200" },
  finished:      { label: "Finished",     dot: "bg-teal-500",    chip: "bg-teal-100 text-teal-900 dark:bg-teal-400/15 dark:text-teal-200" },
  foc_sample:    { label: "FOC / Sample", dot: "bg-pink-500",    chip: "bg-pink-100 text-pink-900 dark:bg-pink-400/15 dark:text-pink-200" },
  invoiced:      { label: "Invoiced",     dot: "bg-slate-700 dark:bg-slate-300", chip: "bg-slate-200 text-slate-800 dark:bg-slate-400/20 dark:text-slate-100", locked: true },
  cancelled:     { label: "Cancelled",    dot: "bg-slate-400",   chip: "bg-rose-100 text-rose-900 dark:bg-rose-400/15 dark:text-rose-200" },
};

export const statusLabel = (s: string) => STATUS_META[s as JobStatus]?.label ?? s;

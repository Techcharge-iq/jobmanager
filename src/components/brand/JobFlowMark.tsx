import { cn } from "@/lib/utils";

export function JobFlowMark({ className = "h-8 w-8", title = "JobFlow" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}>
      <rect width="32" height="32" rx="8" fill="hsl(0 84% 60%)" />
      <path
        d="M18.5 8.5v10a4.5 4.5 0 0 1-4.5 4.5h-2"
        fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

export function JobFlowLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <JobFlowMark title="" />
      <span className="text-lg font-semibold tracking-tight">JobFlow</span>
    </span>
  );
}

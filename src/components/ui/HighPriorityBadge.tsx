import { AlertTriangle } from "lucide-react";

interface HighPriorityBadgeProps {
  priority: string;
  showLabel?: boolean;
}

export function HighPriorityBadge({ priority, showLabel = true }: HighPriorityBadgeProps) {
  if (priority !== "high") {
    return null;
  }

  return (
    <span 
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 dark:bg-orange-500/15 text-orange-800 dark:text-orange-300 animate-pulse ring-2 ring-orange-300 ring-opacity-50"
    >
      <AlertTriangle className="w-3 h-3" />
      {showLabel && "HIGH"}
    </span>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";
import { toneSurface, type Tone } from "./tones";

export function Chip({ tone = "lavender", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", toneSurface[tone], className)} {...props} />;
}

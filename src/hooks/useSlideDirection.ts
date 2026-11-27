import { useRef } from "react";

/** Returns "next" | "prev" based on how the index changed since last render. */
export function useSlideDirection(index: number) {
  const prev = useRef(index);
  const dir = useRef<"next" | "prev">("next");
  if (index !== prev.current) {
    dir.current = index > prev.current ? "next" : "prev";
    prev.current = index;
  }
  return dir.current;
}

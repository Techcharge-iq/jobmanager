import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { DirectionProvider as RadixDirection } from "@radix-ui/react-direction";

import { DirectionCtx, type Layout } from "./directionContext";
const KEY = "jobflow:dir";

const read = (): Layout => {
  try { return localStorage.getItem(KEY) === "rtl" ? "rtl" : "ltr"; } catch { return "ltr"; }
};

/** Layout direction lives in localStorage. Sets <html dir> and tells Radix primitives. */
export function DirectionProvider({ children }: { children: ReactNode }) {
  const [dir, setDirState] = useState<Layout>(read);
  useEffect(() => { document.documentElement.dir = dir; }, [dir]);
  const setDir = useCallback((d: Layout) => {
    setDirState(d);
    try { localStorage.setItem(KEY, d); } catch { /* storage unavailable */ }
  }, []);
  const value = useMemo(() => ({ dir, setDir }), [dir, setDir]);
  return <DirectionCtx.Provider value={value}><RadixDirection dir={dir}>{children}</RadixDirection></DirectionCtx.Provider>;
}

import { createContext, useContext } from "react";

export type Layout = "ltr" | "rtl";
export const DirectionCtx = createContext<{ dir: Layout; setDir: (d: Layout) => void }>({ dir: "ltr", setDir: () => undefined });
export const useDirection = () => useContext(DirectionCtx);

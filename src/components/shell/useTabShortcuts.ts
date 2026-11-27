import { useEffect } from "react";

interface Options { onNew: () => void; onCloseActive: () => void; onJump: (index: number) => void }

/**
 * Cmd/Ctrl+T new, Cmd/Ctrl+W close, Cmd/Ctrl+1..9 jump.
 * Browsers reserve those combinations, so Alt+T, Alt+W and Alt+1..9 work everywhere.
 */
export function useTabShortcuts({ onNew, onCloseActive, onJump }: Options) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey || e.altKey;
      if (!mod || e.shiftKey) return;
      const editing = (e.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable="true"]');
      if (editing && !(e.metaKey || e.ctrlKey)) return; // keep Alt+key typing intact
      const key = e.key.toLowerCase();
      const code = e.code;
      if (key === "t" || code === "KeyT") { e.preventDefault(); onNew(); return; }
      if (key === "w" || code === "KeyW") { e.preventDefault(); onCloseActive(); return; }
      const digit = /^Digit([1-9])$/.exec(code)?.[1];
      if (digit) { e.preventDefault(); onJump(Number(digit) - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNew, onCloseActive, onJump]);
}

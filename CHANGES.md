# JobFlow redesign: frontend only

No database, API, route, prop or data-flow changes. `src/data`, `src/services`, `src/integrations` and `supabase/` are untouched.
New UI state lives in localStorage only: `jobflow:tabs:v1:<userId>` (open tabs), `jobflow:dir` (layout direction), `theme` (existing).

## Install
`npm install` (adds gsap, @gsap/react, three, @react-three/fiber@8, @react-three/drei@9, @dnd-kit/*, @fontsource-variable/inter, @radix-ui/react-direction pinned to 1.1.4).
Keep `@radix-ui/react-direction` at exactly 1.1.4: a different version creates a second context and Radix Tabs ignore RTL.
The committed package-lock.json was already out of sync with package.json before this work, so regenerate it with `npm install`.

## Phase 1: foundations
tailwind.config.ts, src/index.css (tokens, glass recipe with @supports and prefers-reduced-transparency fallbacks, reduced-motion), Inter font, card/button/tabs/dialog/table primitives, pastel `StatusBadge` + `STATUS_META.chip`, `ui/chip.tsx`, `ui/tones.ts`.
Primary stays the AA-safe red `0 72% 51%`; the brighter `--brand` red is used only for glow and accents.

## Phase 2: shell
`components/shell/*` (AppShell, AppSidebar, TopBar, TabStrip, JobDetailsPanel, EnterStagger, nav metadata, shortcuts), `hooks/useTabs.ts`, upgraded `FloatingDock` (magnification, running dots, bounce), `CommandPalette` (tabs, actions, theme toggle), `pages/Index.tsx` wraps the existing views.
Tabs: open, pin, drag to reorder, close, close others, middle-click close, Delete key, restore on reload. Shortcuts: Ctrl/Cmd+K palette, Ctrl/Cmd+T or Alt+T new tab (opens palette), Ctrl/Cmd+W or Alt+W close, Ctrl/Cmd+1..9 or Alt+1..9 jump. Browsers reserve the Ctrl/Cmd versions, hence the Alt aliases.
Job tabs use the URL `/dashboard?job=<id>`; the same sections and `useJobDetails` hook as the dialog.

## Phase 3: data pages
`components/kpi/*` (KpiCard, Sparkline via Recharts, hand-built SVG Ring), data-driven `KpiStrip` (14-day series and delta from real createdAt/invoicedAt). A scripted pass over every file reachable from main.tsx replaced gradients and hard-coded gray/white with theme tokens, added dark variants, and converted left/right spacing to start/end.

## Phase 4: hero and ambient
`components/hero/*`: pastel hero with one insight and one action; lazy Three.js ambient layer (dpr 1-1.5, paused when offscreen or tab hidden, no post-processing); static gradient fallback without WebGL or under reduced motion. Split login layout.

## Phase 5: polish
RTL (`lib/direction*.ts`, switch in Settings > Appearance), mobile dashboard scroll and tab switcher sheet, axe scan clean (WCAG 2.0/2.1 A+AA, light and dark), lint count equals the baseline (83).

## Behaviour changes to know about
- The floating round "+" button (`FloatingCreateButton`) is no longer rendered: "New job" is in the top bar and the dock. The component file is still there.
- The dashboard opens jobs in a tab instead of the dialog. Other screens still use the dialog.
- `useScrollDepth` no longer dims cards at rest (it dropped text contrast below AA); it only fades once the panel is scrolled, and no lower than 70%.
- Accessibility fixes: names for the account and dashboard bell buttons, sync indicator contrast, decorative logo.

## Flagged, needs a backend decision (left as is, not hidden)
- Communications tab still says "Database Setup Required".
- Permission switches (Access Control) only change local state.
- "Coming soon" buttons in Settings; notification switches are not persisted.

## Not done
- Arabic translation of the text (layout mirrors, strings are English).
- Files unreachable from main.tsx (CalendarView, BranchJobQueue, JobList, JobForm, UserProfile, MinimalistSidebar, AIChecklistPanel) were not restyled; consider deleting them.
- Other screens (approved jobs, admin tables) got the token conversion but not bespoke layouts.

## Verified (headless Chromium, stubbed backend, seeded cache)
Tabs open/jump/close/pin/restore, palette, dark, RTL, 390px phone, login, reduced motion, axe, `tsc` 0 errors, `vite build`.
Not verified: real Supabase data, real devices, Safari/Firefox, low-end hardware performance.

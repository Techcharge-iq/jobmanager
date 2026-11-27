# JobFlow redesign: frontend only

Round 3 (latest): Midnight Command Center

Spec: premium, dense ERP look. Violet primary, teal success, amber warning, sky info. Dark = deep navy with layered surfaces; light = cool neutral with white cards.
Frontend only: no schema, migration, API, auth, permission, route or business-rule changes. One route was **added** (`/jobs`); every existing route is unchanged.

Navigation

- One compact 44px top bar: brand, workspace tabs (pin, drag to reorder, close, close others, shortcuts, restore on reload), search, New job, Quick actions menu (New job, Update invoice, Command palette), notifications, profile. Below `md` the tab list becomes the active tab title plus a switcher sheet.
- The dock is now primary navigation only: 36px neutral glass icons, tooltips, a bar under the current page, a dot for pages open in a tab. Bottom clearance is about 60px (was 104).
- Quick actions moved to the top bar and the command palette. Duplicate search and bell removed from the dashboard body. The bell's "enable desktop alerts" and "clear" functions now live in the single notification tray.

**Dashboard**: greeting plus approval and invoice strip, four KPI cards, Revenue overview, Jobs by status, Production pipeline, Priority jobs, Recent jobs, Activity. At 1920x1080 and 1600x900 all of it fits above the dock without scrolling (measured). The previous Work / Status / Invoice / Priority workspace (workflow queues, approvals, quick invoice) is kept below.

**Jobs workspace** (`/jobs`, new dock item): Board and Table views (remembered per device), search, status, priority, assigned staff, customer, deadline filters, sorting, progress. Read-only: status changes still go through the existing flows. Filters become a bottom sheet on phones.

**Job workspace** (job tab): workflow timeline (Brief, Design, Approval, Production, Quality check, Delivery, Invoice) derived from status and approval status, and sections Overview, Brief, Design, Approvals, Production, Quality check, Delivery, Invoice, Notes, History with a key-facts side panel. Reuses the existing form, invoice, items, images, comments and audit-log code.

**Motion**: 150-220ms transitions, subtle hover, chart reveal 0.6-0.7s, skeleton loading. Three.js and the ambient scene were removed (dependencies `three`, `@react-three/*` dropped).

**Accessibility and layout checks** (headless Chromium, stubbed backend, seeded cache): axe WCAG 2 A/AA clean in light, dark, jobs board and table, job detail, mobile; no horizontal overflow at 390 and 820px; RTL mirrored for top bar, tabs, dock, dashboard, board and table; `tsc` 0 errors; `vite build` passes; lint equals baseline (83 problems).

Files
Deleted (delete these by hand if you use the zip): `src/components/dashboard/DashboardNotifications.tsx`, `src/components/dashboard/insights/BranchPipeline.tsx`, `src/components/hero/AmbientScene.tsx`, `src/components/hero/HeroAmbient.tsx`, `src/components/hero/HeroPanel.tsx`

Added: `src/components/dashboard/DashPanel.tsx`, `src/components/dashboard/insights/JobLists.tsx`, `src/components/dashboard/insights/ProductionPipeline.tsx`, `src/components/job-details/workspace/JobHistory.tsx`, `src/components/job-details/workspace/JobNotes.tsx`, `src/components/job-details/workspace/JobWorkflowTimeline.tsx`, `src/components/jobs/JobsWorkspace.tsx`, `src/lib/jobStages.ts`

Modified: `CHANGES.md`, `package.json`, `src/App.tsx`, `src/components/AdminManagement.tsx`, `src/components/LoginPage.tsx`, `src/components/ModernDashboard.tsx`, `src/components/NotificationTray.tsx`, `src/components/UserAccessManagement.tsx`, `src/components/admin/AdminPasswordReset.tsx`, `src/components/admin/AdvancedUserPermissions.tsx`, `src/components/admin/UserManagement.tsx`, `src/components/command/FloatingDock.tsx`, `src/components/command/KpiStrip.tsx`, `src/components/dashboard/insights/JobSummaryGauge.tsx`, `src/components/dashboard/insights/RevenueTrend.tsx`, `src/components/kpi/KpiCard.tsx`, `src/components/shell/AppShell.tsx`, `src/components/shell/JobDetailsPanel.tsx`, `src/components/shell/TabStrip.tsx`, `src/components/shell/TopBar.tsx`, `src/components/shell/navItems.ts`, `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/status-badge.tsx`, `src/components/ui/tabs.tsx`, `src/components/user-profile/UserProfileDropdown.tsx`, `src/index.css`, `src/pages/Index.tsx`

Limitations and things to decide
Quality check has no data in JobFlow, so its stage shows "Not tracked" and the section says so. Adding real quality checks needs a backend change.
**Approvals** section shows status only; approving still happens from the dashboard and alerts (no business rule was touched).
Job progress percentages are a fixed mapping from status (pending 10, designing 30, in production 55-70, ready to bill 80-90, invoiced 100), not tracked data.
Board columns show 25 cards and load 25 more on request; the table loads 50 at a time.
Activity feed depends on the existing activities data; it shows an empty state when there is none.
Older screens (admin tables, settings, approved jobs) got the new palette, radii and status styling but not new layouts.
ot verified: real Supabase data, real devices, Safari, Firefox, low-end hardware.

Earlier rounds
Round 2 (latest): no sidebar, macOS dock, more colour

- The left menu is gone. All navigation is the bottom dock: icons only, coloured app-icon tiles, magnification on hover, a dot under every page that is open in a tab, a ring on the current page, labels as tooltips. Search, invoice update and New job sit at the right end of the dock. Shrinks to fit 360px phones.
- Soft pastel wallpaper behind the app (neon-glow night version in dark mode). Top bar, tab strip, dock and hero are glass; cards stay solid, bigger radius.
- Tabs are pills with a lavender-to-peach active state.
- Dashboard: vivid gradient hero, larger gradient KPI cards, new **Invoiced, last 30 days** area chart (gradient, hover tooltip), semicircle **Open jobs by status** gauge, and a coloured **Pipeline by branch** grid. All computed from the jobs already in the local cache.
- Status chips on the approved-jobs screen now use the shared colourful badge; the selected job row is a soft gradient instead of solid red.
- Dashboard now scrolls as one page instead of nested scroll panels.

No database, API, route, prop or data-flow changes. `src/data`, `src/services`, `src/integrations` and `supabase/` are untouched.
New UI state lives in localStorage only: `jobflow:tabs:v1:<userId>` (open tabs), `jobflow:dir` (layout direction), `theme` (existing).

Install
`npm install` (adds gsap, @gsap/react, three, @react-three/fiber@8, @react-three/drei@9, @dnd-kit/*, @fontsource-variable/inter, @radix-ui/react-direction pinned to 1.1.4).
Keep `@radix-ui/react-direction` at exactly 1.1.4: a different version creates a second context and Radix Tabs ignore RTL.
The committed package-lock.json was already out of sync with package.json before this work, so regenerate it with `npm install`.

Phase 1: foundations
tailwind.config.ts, src/index.css (tokens, glass recipe with @supports and prefers-reduced-transparency fallbacks, reduced-motion), Inter font, card/button/tabs/dialog/table primitives, pastel `StatusBadge` + `STATUS_META.chip`, `ui/chip.tsx`, `ui/tones.ts`.
Primary stays the AA-safe red `0 72% 51%`; the brighter `--brand` red is used only for glow and accents.

Phase 2: shell
`components/shell/*` (AppShell, TopBar, TabStrip, JobDetailsPanel, EnterStagger, nav metadata, shortcuts), `hooks/useTabs.ts`, upgraded `FloatingDock` (magnification, running dots, bounce), `CommandPalette` (tabs, actions, theme toggle), `pages/Index.tsx` wraps the existing views.
Tabs: open, pin, drag to reorder, close, close others, middle-click close, Delete key, restore on reload. Shortcuts: Ctrl/Cmd+K palette, Ctrl/Cmd+T or Alt+T new tab (opens palette), Ctrl/Cmd+W or Alt+W close, Ctrl/Cmd+1..9 or Alt+1..9 jump. Browsers reserve the Ctrl/Cmd versions, hence the Alt aliases.
Job tabs use the URL `/dashboard?job=<id>`; the same sections and `useJobDetails` hook as the dialog.

Phase 3: data pages
`components/kpi/*` (KpiCard, Sparkline via Recharts, hand-built SVG Ring), data-driven `KpiStrip` (14-day series and delta from real createdAt/invoicedAt). A scripted pass over every file reachable from main.tsx replaced gradients and hard-coded gray/white with theme tokens, added dark variants, and converted left/right spacing to start/end.

Phase 4: hero and ambient
`components/hero/*`: pastel hero with one insight and one action; lazy Three.js ambient layer (dpr 1-1.5, paused when offscreen or tab hidden, no post-processing); static gradient fallback without WebGL or under reduced motion. Split login layout.

Phase 5: polish
RTL (`lib/direction*.ts`, switch in Settings > Appearance), mobile dashboard scroll and tab switcher sheet, axe scan clean (WCAG 2.0/2.1 A+AA, light and dark), lint count equals the baseline (83).

Behaviour changes to know about

- The floating round "+" button (`FloatingCreateButton`) is no longer rendered: "New job" is in the top bar and the dock. The component file is still there.
- The dashboard opens jobs in a tab instead of the dialog. Other screens still use the dialog.
- `useScrollDepth` no longer dims cards at rest (it dropped text contrast below AA); it only fades once the panel is scrolled, and no lower than 70%.
- Accessibility fixes: names for the account and dashboard bell buttons, sync indicator contrast, decorative logo.

Flagged, needs a backend decision (left as is, not hidden)

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

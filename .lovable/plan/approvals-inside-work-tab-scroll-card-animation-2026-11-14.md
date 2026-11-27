# Approvals inside Work tab + scroll card animation

## What changes
1. **Approvals move into the Work tab.** The separate "Approvals" tab is removed (tabs become Work, Status, Invoice, Priority). On the Work tab, the approval list sits below the three work columns (Pending Design, In Production, Pending Invoicing) in its own white card.
2. **Scroll animation like your sample.** As you scroll inside the Work area, job cards near the middle stay full size; cards scrolling out the top gently shrink and fade, with a slight side sway. Kept subtle so it stays readable and professional (your red/white look stays — no peach/yellow colors from the sample).
3. Turned off automatically for people who set "reduce motion" on their device, and on very small phones the sway is disabled so details never get cut off.

## Technical details
- `ModernDashboard.tsx`: drop the `approvals` TabsTrigger/TabsContent, grid-cols-5 -> 4; render `<ApprovalBox />` in the work TabsContent after the bucket grid.
- New hook `src/hooks/useScrollDepth.ts`: takes a scroll container ref, finds `[data-scroll-card]` children, on scroll (rAF, passive) computes distance from container center and applies `transform: translate3d(x,0,0) scale(s)` + opacity, using the sample's formula with clamped values (min scale 0.92, min opacity 0.5, sway 6px). Respects `prefers-reduced-motion`.
- Add `data-scroll-card` to WorkflowBucket job rows and ApprovalBox items; attach hook to the `.dashboard-workspace` container of the Work tab.
- CSS: `will-change: transform, opacity` + short transition on `[data-scroll-card]` in `index.css`.

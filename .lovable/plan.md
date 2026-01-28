
Goal
- Recenter the “Schedule New Class” modal (and any other dialogs) so it appears truly centered instead of shifted down/right (bottom-right look), while keeping the new scroll/sticky-footer behavior safe.

What’s actually causing the “bottom-right” positioning
- Our Radix DialogContent is centered using Tailwind’s `translate-x-[-50%] translate-y-[-50%]`.
- But we also wrapped DialogContent in a `framer-motion` `motion.div` to animate scale/y/opacity.
- Framer Motion writes an inline `transform:` style for animations. Inline `transform` overrides Tailwind’s `transform` (which is where translate-x/y live).
- Result: the `left: 50%` and `top: 50%` remain, but the `translate(-50%, -50%)` is effectively removed, so the dialog’s top-left ends up at the center of the screen → visually shifted down/right, often appearing “stuck” bottom-right on large modals.

Why the previous AddClassDialog change didn’t fix centering
- The AddClassDialog changes (max height + internal scroll + sticky footer) fixed the “content off-screen / can’t reach buttons” problem.
- But centering is broken at a lower layer: the shared `src/components/ui/dialog.tsx` component used everywhere.

Safe fix strategy (minimal, global, correct)
- Fix the shared `DialogContent` centering in `src/components/ui/dialog.tsx` so Framer Motion animations no longer erase the `translate(-50%, -50%)`.
- Keep the AddClassDialog scroll/sticky-footer improvements as-is.

Implementation details (what will be changed)
1) Update `src/components/ui/dialog.tsx` (DialogContent)
   - Keep `fixed left-1/2 top-1/2` positioning.
   - Remove Tailwind `translate-x-[-50%] translate-y-[-50%]` from the class list (since Framer Motion will override transform anyway).
   - Add a Framer Motion `transformTemplate` to permanently prepend `translate(-50%, -50%)` to the animation-generated transform string:
     - This ensures we always get centering translate + animated scale/y, rather than one overriding the other.
   - Result: The dialog is properly centered, and animations still work.

2) Verify no regressions
   - Check other dialogs that use `DialogContent` (ViewClassDialog, upload dialogs, admin dialogs).
   - Ensure the close button positioning remains correct (it’s absolutely positioned within the dialog).
   - Ensure the AddClassDialog still scrolls properly and the sticky footer remains visible.

Testing checklist (how we’ll confirm it’s fixed)
- Desktop:
  - Open “Schedule New Class” on tutor dashboard: modal appears centered (not bottom-right).
  - Resize window shorter height: modal remains centered; internal content scrolls; footer stays visible.
- Mobile/smaller view:
  - Open the same modal: still centered; content scroll works.
- Spot-check other dialogs:
  - Open ViewClassDialog or any other dialog: centered correctly.

Potential edge cases and mitigations
- If any dialog relied on custom transform classes passed via `className`, we’ll verify and (if needed) document that transforms should be avoided on DialogContent itself. In practice, dialogs usually customize width/padding, not transforms.
- If Radix presence/unmount affects exit animations: this change doesn’t alter mounting behavior; it only changes how transforms are composed.

Files involved
- Primary fix: `src/components/ui/dialog.tsx`
- No further changes required to `src/components/tutor/dialogs/AddClassDialog.tsx` beyond what’s already done (unless testing reveals a minor spacing tweak).

Outcome
- All Radix DialogContent modals will be centered correctly across the app.
- The “Schedule New Class” dialog will be centered and remain usable on smaller screens with scrolling + sticky actions preserved.

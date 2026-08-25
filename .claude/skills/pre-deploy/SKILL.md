---
name: pre-deploy
description: Run before shipping any batch of changes to Learn2Lead's live site — automated gate (typecheck/lint/tests/build) plus a golden-path manual verification checklist and edge-function deploy reminder. Use whenever the user says "ready to deploy", "let's ship this", "before we push", or similar.
---

# Pre-deploy checklist

Learn2Lead has real families using the site live. Per project convention (see
CLAUDE.md and prior session history), changes are batched into a single
reviewed release rather than pushed/deployed after each individual fix. This
skill is the gate that runs immediately before that release goes out —
never run it as a substitute for testing during development, only as the
final check before `git push` / `supabase functions deploy`.

Do not skip steps or mark this complete based on assumption. If any
automated step fails, stop and fix it before proceeding — do not present the
manual checklist until the automated gate is green.

## 1. Automated gate

Run these in order and report pass/fail for each. All must pass before
moving to step 2:

```bash
npm run type-check
npm run lint
npm run test -- --coverage
npm run build
```

If `lint` reports errors (not warnings — this repo has known pre-existing
warnings, see CLAUDE.md's linting notes), fix them. If coverage drops below
the 50% threshold because a new test mounts a large, previously-untested
component, prefer narrowing the test (mock the heavy child, test the
boundary that actually changed) over lowering the threshold — see the
`ClassDialogs`/`ClassDetailsDialog` tests for the pattern.

## 2. Identify what needs an explicit edge function deploy

```bash
git diff --stat main -- supabase/functions/
```

Editing an edge function's local file does **not** deploy it (see
`edge-function-deployment` project memory). For every changed function
directory, after pushing:

```bash
supabase functions deploy <function-name>
```

Then verify the change actually landed — bump a version/log line and check
`supabase functions logs <function-name>` or invoke it, don't assume the
deploy succeeded just because the CLI returned 0.

Also check whether any changed migration under `supabase/migrations/` still
needs `supabase db push` — a migration file existing in the repo does not
mean it's been applied to the live database.

## 3. Golden-path manual checklist

Run through these in a real test account (not production data) before
shipping. Skip only the flows genuinely untouched by this batch of changes —
say explicitly which ones you're skipping and why, don't skip silently.

**Student**

- [ ] Log in as a student, dashboard loads with correct credit balance
- [ ] Buy a credit pack (Stripe **test mode**), confirm credits land and a
      confirmation email/notification fires
- [ ] Book a class with a tutor
- [ ] Open a completed class, upload a file as a student if that flow is
      touched, or as a tutor and confirm the student can download/view it
- [ ] Toggle auto-renewal on in Settings, confirm it saves (full charge flow
      only needs re-testing if `process-auto-renewal` changed)

**Tutor**

- [ ] Log in as a tutor, scheduler loads
- [ ] Open a scheduled class, confirm the "Student Content" tab shows real
      uploaded files (not empty) and download/view buttons actually work
- [ ] Complete a class, confirm it moves to Class History and a class_logs
      row is created
- [ ] Delete a scheduled class, confirm it disappears immediately without a
      manual page refresh

**Admin**

- [ ] Log in as admin, Class Logs table loads
- [ ] Open a class's details, confirm the "Student" tab shows real uploaded
      files and download/view buttons work
- [ ] Open a student's user detail modal — confirm Profile/Billing tabs both
      render and Apply Adjustment still works (Class Rate/Payment Method are
      gone entirely — students no longer have a manual rate concept)
- [ ] Complete a real test class, confirm "Class Cost" on the resulting
      class_logs row reflects the student's actual credit-pack price
      (price_per_class), not $0 — this now derives from
      student_subscriptions/subscription_plans instead of a manual field
- [ ] Confirm "Student Credits" (low-balance list) shows on the Overview
      page and no longer appears on the Class Logs page
- [ ] Use Adjust Credits on a student who has never made a Stripe purchase
      (or a fresh test account) — confirm it succeeds instead of 404ing
- [ ] Use Adjust Credits on a student who already has a subscription row —
      confirm it adjusts the existing balance rather than creating a
      duplicate

## 4. Code review

Run `/code-review ultra` (or `/ultrareview`) on the branch before the final
push. This is a separate, user-triggered, billed multi-agent review — do not
attempt to invoke it programmatically; tell the user to run it and wait for
their go-ahead.

## 5. Ship

Only after steps 1–4 are green/confirmed: push, deploy edge functions per
step 2, and apply any pending migrations. Report exactly what was deployed
and what the user should spot-check on the live site afterward.

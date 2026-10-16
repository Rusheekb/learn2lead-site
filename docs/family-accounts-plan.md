# Family Accounts — Implementation Plan

Status: **shipped to production 2026-10-16** (PR #6). This covers family accounts plus the follow-on work: billing isolation, usernames and student logins, the notification foundation, and messaging (Phases A–D below). Runbook steps 1–5 are done: migrations dry-run then applied, functions deployed, types regenerated, front end live with both flags off. Next: the pilot (step 6), then the family sign-up flag (step 7); texting (step 8) waits on Twilio. The "As built" section is current; the plans that follow it are the design record, and "As built" wins where they differ.

## As built

### Where it differs from the plan

- **Invites have their own table.** `guardian_invites` (pending / accepted / cancelled, 14-day expiry) instead of a `status` column on `guardian_links`. The parent may not have an account yet when a student invites them, so an invite has to be keyed by email. A row in `guardian_links` always means an active link.
- **A child's real email is stored separately.** The child's sign-in address is always the placeholder. Their optional real email goes in `profiles.notification_email` and is used only for their own class emails. It is never a login, so a mistyped address can't give a stranger access to a child's account.
- **Children are added after sign-up**, from the family dashboard ("Add a student"), not during the sign-up form. Email confirmation means the parent has no session at sign-up time, and it keeps the sign-up form short.
- **Google sign-ups** carry the "My child" choice through the OAuth redirect in `sessionStorage` (30-minute expiry) and call `become_family_account()` on return. The database only allows that switch for a brand-new account with no student history.
- **The admin conversion runs as the signed-in admin**, not the service role. The existing class-log guard only lets admins re-point a class log, and this also records the admin in the role-change audit. The edge function creates the child's login with the service role, then runs the conversion with the admin's session.
- **Quarterly reports go to the parent** (`parent_only`), together with the weekly digest, low-hours, out-of-hours and blocked-log emails.
- **The balance-sync trigger was fixed.** `sync_subscription_credits` matched on both `subscription_id` and `student_id`, so a child's class charged to the parent's subscription would never have updated the balance. It now matches on the subscription id alone. Before the change, all 8 live subscriptions and their history were checked: no history entry belongs to a different account than its balance record, so nothing changes for current accounts.
- **Username sign-in uses no new email addresses.** The proposal below mentions `<username>@students.learn2lead.page`; that wasn't needed. The `username-login` function looks the username up on the server (`login_email_for_username`, service role only), signs in with the account's existing sign-in address (the placeholder, for a student a parent added) and returns the session. Unknown usernames and wrong passwords get the same error. Attempts are rate-limited per IP and per username.
- **A student's login is set up by the parent directly.** There is no emailed invite for students: the parent picks the username and a temporary password and hands them over, and the student chooses their own password at first sign-in. The status shown is Not set up / Active / Disabled, plus whether a new password is still due and the last sign-in.
- **`contact_methods` holds mobile numbers only.** Email stays on the profile (and in `notification_email` for students).
- **The old notification switches stay.** `notify_class_reminders` and `notify_low_credits` remain the email defaults and are kept in step from Settings; a saved preference overrides them. Nothing changes for anyone until they change a setting.
- **Texting ships dark.** The Text messages card and the Text column in Settings only appear with `VITE_ENABLE_SMS=true`. The server only texts someone whose number is verified and opted in, who turned that kind of text on, and only once the Twilio secrets are set.
- **Messaging (D13: yes).**
  - There's one conversation per student and tutor. The student, the tutor and the student's parent(s) are in it. Admins can read and join any conversation. Each conversation says who can see it.
  - Posting needs an active tutor match. Admins can always post. After a match ends, the history stays and the conversation becomes read-only.
  - Messages can't be edited or deleted. More than 20 a minute from one person is refused.
  - Updates arrive by polling, not Realtime: 10 s for an open conversation, 30 s for the list, 60 s for the unread badge.
  - Alerts follow each person's "Messages" setting (email and/or text). Each person gets at most one alert per burst: nothing more for 10 minutes unless they've read the conversation since.

### Also fixed along the way

- `generate-quarterly-report` accepted any caller holding the public anon key (`verify_jwt` alone), who could email any student's report, including tutor notes, to any address. It now requires an admin or the service role (the quarterly cron).
- `notify-assignment` accepted any Authorization header. It now requires an admin, the only role that can create assignments.
- `CreditHistory` labelled entries by type, so an adjustment that removed hours displayed as "+-8h Added". It now uses the sign of the amount.
- Pricing showed a generic "non-2xx" message when checkout failed. It now shows the function's own message.
- The "Messages" button in a tutor's student details did nothing. It now opens that student's conversation.

### What's where

- **Database** (apply in this order):
  - `supabase/migrations/20261015000001_parent_role.sql`: the role
  - `supabase/migrations/20261015000002_family_accounts.sql`: links, invites, billing and email routing, parent access
  - `supabase/migrations/20261016000001_student_billing_isolation.sql`: Phase A, students with a parent never see billing
  - `supabase/migrations/20261016000002_usernames_and_student_logins.sql`: Phase B; backfills a username for every existing account
  - `supabase/migrations/20261016000003_notification_foundation.sql`: Phase C, mobile numbers and per-channel preferences
  - `supabase/migrations/20261016000004_messaging.sql`: Phase D, conversations
- **New edge functions (9):**
  - `create-managed-student`, `invite-guardian`, `accept-guardian-invite`, `admin-convert-to-family`
  - `username-login`, `manage-student-login`
  - `sms-verification`, `sms-inbound` (`verify_jwt = false`; Twilio's signature is checked instead)
  - `send-message`
- **Changed edge functions (10):**
  - `deduct-class-credit`
  - `check-subscription`
  - `class-reminder`
  - `notify-assignment`
  - `send-weekly-digest`
  - `generate-quarterly-report`
  - `calendar-feed`
  - `create-checkout`
  - `admin-adjust-credits`
  - `stripe-webhooks`
- **Shared edge-function helpers:**
  - `_shared/recipients.ts`: who gets which email, and who pays
  - `_shared/notify.ts`: the one sender (who, by which channel, per each person's settings), used by `class-reminder`, `deduct-class-credit`, `notify-assignment`, `generate-quarterly-report` and `send-message`. `send-weekly-digest` reads the same summaries setting.
  - `_shared/senders.ts`, `_shared/sms.ts`, `_shared/smsTexts.ts`: email and text sending, Twilio signature checks, text wording
  - `_shared/familyEmails.ts`, `_shared/creditEmails.ts`, `_shared/messageEmails.ts`: email wording
- **Front end:**
  - `src/pages/FamilyDashboard.tsx`, `src/pages/AcceptInvite.tsx`, and `src/components/parent/*` (including `StudentLoginCard`)
  - `src/components/student/InviteParentCard.tsx`, and `src/components/admin/AdminFamilySection.tsx` (in the admin student modal, Settings tab)
  - **Sign-in:**
    - "Email or username" (`SignInForm`, `authActions.signInWithUsername`) and username at sign-up (`SignUpForm`)
    - first-login password (`ChooseOwnPassword`) and `profile/UsernameCard`
  - **Settings:** `profile/NotificationPreferences` and `profile/TextMessagesCard`
  - **Messages:**
    - the components in `src/components/shared/messages/*` and the services in `src/services/messages/*`
    - `src/hooks/queries/useMessagesQueries.ts`
    - a Messages tab and sidebar link, with an unread badge, for every role
  - **Flags** (`src/config/features.ts`): `VITE_ENABLE_FAMILY_SIGNUP`, `VITE_ENABLE_SMS`

### How it was verified

- **Database:**
  - A copy of the live schema (structure only, no live data) was rebuilt locally from the system catalog, and all six migrations were applied to fresh copies of it in order.
  - 205 behaviour checks ran in four suites:
    - family accounts (107): billing and email routing, parent access, invites, unlinking, conversion, admin dashboards;
    - logins (37): username backfill, uniqueness, reserved names, parent controls, audit log;
    - notifications (20): defaults, preferences, number privacy, STOP;
    - messaging (41): who can see, post and start conversations, edits and deletes refused, read-only after a match ends, alert throttling, flood limit.
  - A regression script of existing-account behaviour gave identical output before and after all six migrations. It covers sign-up, reminders, balance checks, class pricing (including the manual rate), debits and refunds, admin dashboards, what each role can see, and role changes.
- **End to end:**
  - The whole stack was run locally: Supabase in Docker, these edge functions and the site. Every email and text went to a local catcher, so nothing was sent.
  - 81 API checks passed across all phases.
  - Browser runs covered:
    - a new parent signing up and adding a child;
    - messaging between a parent, a tutor, an admin and a student on a phone-sized screen;
    - Settings with texting on and off.
- **Edge functions:** all type-check with `deno check`. The only errors are two in `check-subscription` that already exist in the committed version.
- **Front end:** lint (0 errors), type-check, Prettier, Jest (all passing, coverage above the threshold) and the production build all pass.
- **Not exercised:**
  - Real delivery through Twilio, Resend and Stripe. Local stand-ins received the same API calls, and the inbound check uses Twilio's signing algorithm.
  - Google sign-in.
  - Hosted Supabase Auth accepting the placeholder addresses. The local Auth server accepts them; see the checklist.

### Deploy runbook (when it's safe to ship)

1. **Dry-run the migrations on production.**
   - Run all six files inside `BEGIN … ROLLBACK` with `SET LOCAL lock_timeout = '2s'`, outside class hours (they hold brief table locks).
   - Before the rollback, read the generated usernames: `SELECT email, username FROM profiles ORDER BY created_at`.
2. **Apply the migrations** in order: `supabase db push --linked`.
   - Existing accounts behave the same.
   - Everyone gets a username, but email sign-in is unchanged.
   - Nobody gets texts until texting is set up (step 8).
3. **Deploy the functions:**

   - the 9 new ones;
   - then the 10 changed ones;
   - confirm each new version is live.

   `supabase/config.toml` already marks `sms-inbound` as `verify_jwt = false`.

   On 2026-10-16 a fresh local runtime couldn't load `https://esm.sh/@supabase/supabase-js@2.x`: its type definitions point at a missing `storage-js@2.99.1` file. If `supabase functions deploy` fails with that error, switch those imports to `npm:@supabase/supabase-js@<same version>`. The local test stack already runs that way.

4. **Regenerate the database types** from the live schema and confirm they match the hand-edited `src/integrations/supabase/types.ts`.
5. **Ship the front end with both flags off** (`VITE_ENABLE_FAMILY_SIGNUP` and `VITE_ENABLE_SMS` unset).
   - Family sign-up, "Invite a parent" and texting stay hidden.
   - "Email or username" sign-in, Messages, parent dashboards, invite acceptance and the admin family tools all work.
6. **Pilot:**
   - Convert one family with the admin tool (dry run first).
   - Watch one class get logged against the family balance, and the next reminder and digest go to the parent.
   - Send a message each way between that family and their tutor.
7. **Turn on family sign-up** (`VITE_ENABLE_FAMILY_SIGNUP=true` in Vercel) and redeploy.
8. **Texting, when ready:**
   1. Set up a Twilio account and a Messaging Service with a number. Complete A2P 10DLC registration, which US carriers require and which takes days to weeks.
   2. In the Messaging Service's opt-out settings, set the HELP reply, e.g. "Learn2Lead: class reminders and messages. Help: learn2leadtutoring@gmail.com. Reply STOP to opt out. Msg & data rates may apply."
   3. Point incoming messages at `https://<project-ref>.supabase.co/functions/v1/sms-inbound`.
   4. Set the function secrets: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` (or `TWILIO_FROM_NUMBER`), and `TWILIO_INBOUND_URL` (that exact URL).
   5. Set `VITE_ENABLE_SMS=true` and redeploy.

### Review checklist

- [ ] **Placeholder addresses.** Hosted Supabase Auth must accept `student-<uuid>@managed.learn2lead.page` when creating a child's login, and the subdomain must have no mail records. Every send path filters these addresses out regardless.
- [ ] **Generated usernames.** Skim the dry-run list (runbook step 1); anyone can change theirs in Settings.
- [ ] **Stripe receipt address.** After an invite handover, the moved Stripe customer's email is changed to the parent's (best-effort; the card and auto-renew work either way).
- [ ] **Wording.** Family-facing copy: sign-up choice, dashboard, invite email, family digest, message alerts.
- [ ] **Text consent wording** (`SMS_CONSENT_TEXT` in `sms-verification`) before texting goes live. It's stored with each opt-in.
- [ ] **Messaging expectations.** Tutors should know that parents and staff can read conversations; each conversation's header says so.
- [ ] **Admin conversion.** Read the dry-run output before converting; conversion is meant to be permanent.
- [ ] **Google sign-in screen** still says "to continue to lnhtlbatcufmsyoujuqh.supabase.co". Changing it to Learn2Lead is done in the Google Cloud consent screen (app name and logo, then verification), not in code.

## Next phase: student logins and account separation (proposed 2026-10-16)

Status: **A–D shipped 2026-10-16.** See "As built" above for where the build differs from this proposal. It replaces decision D2 ("no child logins in v1").

### Principle

**Every person has their own account; money belongs only to the parent.**

- A student under a parent gets their own login and their own portal: schedule, Zoom links, tutor notes, homework and their own settings.
- A student can never see or touch billing:
  - no prices;
  - no amounts paid;
  - no cards;
  - no auto-renew;
  - no receipts;
  - no buying.
- The parent's portal is the only place billing exists.
- The two logins are independent:
  - separate passwords;
  - no shared credentials;
  - no parent "sign in as student".

This is also the foundation for messaging: every person is a separate account with their own contact details and notification choices, and every message about a student can be routed to the right people with the right privacy rules.

### How everyone signs in (decided 2026-10-16)

**One login box for everyone: "Email or username", plus a password.**

- **Everyone has a unique username.**
  - New sign-ups choose one, with a live "already taken" check.
  - Existing accounts get one generated automatically (e.g. `kai.giorgio`), which they can change in Settings.
  - Email login keeps working, so current families notice nothing.
- **Adults keep their email** for receipts, password resets and Google sign-in.
- **Students a parent adds sign in with a username only:**
  - The parent sets the username and a temporary password; the student chooses their own password at first sign-in.
  - Only the parent (or an admin) can reset it.
  - No child email is needed. If the child has one, the parent can add it for reminders and self-service resets.
- **A login is optional for each student.** The parent can add one at any time; until then the calendar link and parent emails work as now.

**Under the hood:**

- The student is the same managed identity already built, so no data moves.
- A username-only student signs in with their username; the server finds their account and signs in with its existing sign-in address, which is never emailed (as built: no separate `students.` addresses).
- Usernames live in `profiles.username`: unique and case-insensitive, letters, numbers, dots and underscores.
- The "username → account" lookup runs on the server (an edge function signs in on the user's behalf), so typing a username never reveals anyone's email. Repeated failed attempts are rate-limited.

### Parent controls (Family dashboard → student page → "Login")

- **Status:** Not set up / Invite sent / Active / Disabled, plus when they last signed in.
- **Actions:**
  - set up a login (username, plus email if the student has one);
  - resend the invite;
  - reset the password (username logins);
  - disable or re-enable the login (Supabase's ban, which immediately signs them out everywhere);
  - change email or username.
- Every parent action on a student account is recorded in an audit log that admins can view.

### Billing isolation (enforced on the server, not just hidden in the UI)

- `check-subscription` returns only the hours remaining for a student with a parent. No plan name, no price, no dollar amounts. A setting on each student lets the parent hide even the hours.
- The student's hours history shows class usage only. No purchases, payment amounts or receipts.
- Pricing, the Buy Hours links, the auto-renew and payment-method controls, and checkout are hidden for students with a parent and refused by the server (`create-checkout` already refuses).
- Row-level security tests prove that a student can't read their parent's profile, subscription, auto-renew settings, Stripe customer or any dollar amount, and that a parent can't read another family's data.

### Foundation for messaging and texts

- **Contact methods per person** (new `contact_methods` table): email and, later, a mobile number. Each has its own verification, opt-in and consent timestamp. Text opt-in consent is a legal requirement, so it gets recorded from the start.
- **Notification preferences per person, per type, per channel** (new `notification_preferences` table). Example: "class reminders: email on, text off". This replaces the two on/off columns, and existing values carry over.
- **One sender** (`_shared/notify.ts`). Every email goes through it: it resolves recipients with `student_notification_recipients`, applies each person's preferences and picks the channel. Adding text messages later then means adding a channel there, not touching every function.
- **Safeguarding rule, decided now:** messages between a tutor and a minor always include, or are visible to, the parent and admins. Messaging threads will key on people's account IDs plus the family link, so this is built in from day one.

### Phases

| Phase                                      | What                                                                                                                                                                                                                                                               | Estimate |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| A. Billing isolation **(done)**            | Hours-only balance check (or nothing, if the parent hides it), usage-only history, billing controls, pricing, referrals and low-balance alerts hidden for students with a parent, billing tables blocked at the database, parent's "Show hours" switch, plus tests | done     |
| B. Usernames and student logins **(done)** | Usernames for everyone (pick at sign-up, auto-generated for existing accounts), the "Email or username" login, username logins for students a parent adds, first-login password change, parent controls, an optional "Set up a login" step in the parent setup     | done     |
| C. Notification foundation **(done)**      | Mobile numbers with verification and consent, per-channel preferences, one sender for student notifications, STOP/START handling                                                                                                                                   | done     |
| D. Messaging / texts **(done)**            | One conversation per student and tutor (parent and staff can see it), unread badges, alerts by email or text, built on C                                                                                                                                           | done     |

A and B should ship before family accounts go public. C and D can ship with them (texting stays off until Twilio is set up).

### Decisions

- **D10 (decided):** Students see their hours remaining (hours only, never money), with a per-student switch for the parent to hide it.
- **D11 (decided):** Usernames for everyone, with one "Email or username" login. Students a parent adds use a username only.
- **D12 (decided):** A login is optional for each student, with a recommendation in the setup steps.
- **D13 (decided):** Tutor–student messages are always visible to the student's parent, and to admins.

## Goal

Let a parent sign up once, add one or more children (child email optional), pay for all of them from one hours balance, and follow their progress — without making families manage two logins. Students who already have their own account can invite a parent, who then takes over their billing.

**Existing accounts are out of scope.** Every current account stays an adult-learner ("self") account and behaves exactly as today. Nothing changes for them unless they opt in, either by inviting a parent themselves (Phase 5b) or, as a fallback, through an admin conversion (Phase 6).

## Design in one paragraph

A new **parent** role is the login and the payer. **One rule: a linked parent always pays.** Each child is a **managed student**: a real student identity (auth user + profile + `students` row, role `student`) linked to the parent through a new `guardian_links` table. The child's auth email is their real email if the parent gives one, otherwise a never-emailed placeholder; either way there's no login in v1. A student who signed up themselves can also invite a parent; they keep their own login, and their billing moves to the parent. Because the child is a normal student in every table, tutor assignments, scheduling, class logs, completion, reminders, RLS and the calendar feed keep working with no changes to the existing student code paths. New code only answers two questions: _whose balance pays for this student?_ and _who gets emails about this student?_ For every existing account the answer to both is "the student themself", so nothing changes for them.

### Why a login-less identity instead of a separate "learner" table

Every student-related table keys students by their auth/profile id (`tutor_student_assigned.student_id`, `scheduled_classes.student_id`, `class_logs.student_user_id`, `student_subscriptions.student_id`, `class_credits_ledger.student_id`, `calendar_feed_tokens.user_id`), with roughly 180 RLS references to `auth.uid() = student_id`. A new learner table would mean re-keying all of that while live families are using it. A managed student identity slots into the existing keys, so the change is purely additive.

## Decisions (defaults chosen; change any before starting)

| #   | Decision                             | Default                                                                                                                                                                                                                                          |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Balance                              | **One balance per family**, held by the parent. Each class still records which child it was for.                                                                                                                                                 |
| D2  | Child logins                         | **None in v1** for children a parent adds. They get their schedule and Zoom links through a calendar feed and, if they have an email, by email. A login comes later (Phase 7).                                                                   |
| D3  | Guardians per family                 | **One parent in v1.** `guardian_links` allows many, so a second guardian can be added later without schema changes.                                                                                                                              |
| D4  | Adults                               | Signup asks "Who are the classes for?" — **Me** creates today's account type, unchanged.                                                                                                                                                         |
| D5  | Child email                          | **Optional.** If given, the child receives student emails (D7). If blank, the child gets `student-<uuid>@managed.learn2lead.page` (subdomain with no mail records), which is **never** emailed; a central guard refuses it.                      |
| D6  | Rollout                              | Behind a feature flag (`VITE_ENABLE_FAMILY_SIGNUP`), shipped dark, enabled when tested.                                                                                                                                                          |
| D7  | Who gets which email                 | **Student** (if they have a real email): class reminders, homework and tutor notes. **Parent:** everything. No weekly summary for students.                                                                                                      |
| D8  | Students who already have an account | They can **invite a parent** from Settings (Phase 5b). When the parent accepts, the parent takes over billing: hours balance, saved card and auto-renew move with it. Students who pay their own way and want a parent watching: admin, by hand. |
| D9  | Notification settings                | Per person. A student and their parent each control their own emails; neither overrides the other.                                                                                                                                               |

## Phases

Each phase ends in a verifiable state and can ship on its own (batched into releases per the usual process). Phases 1–3 change nothing visible.

### Phase 1 — Data model (migration; invisible)

- Add `parent` to the `app_role` enum.
- New table `guardian_links (guardian_id uuid → profiles, student_id uuid → profiles, status text ('pending' | 'active'), created_at)`, unique `(guardian_id, student_id)`, plus RLS: guardians read their own links, a student reads links to themself, admins read and write all, nobody else. `pending` covers invites not yet accepted. There is one kind of link: an active link means the parent pays and sees everything.
- `profiles.managed boolean not null default false` marks children a parent created (existing rows default to `false`, so no backfill).
- Helper functions (`SECURITY DEFINER`, `search_path` pinned):
  - `guardian_of(p_student uuid) → uuid`: the active parent, or null.
  - `is_guardian_of(p_student uuid) → boolean`.
  - `billing_account_for(p_student uuid) → uuid`: `coalesce(guardian_of(p_student), p_student)`. **For every existing account this returns the account itself.**
  - `recipients_for(p_student uuid, p_category text) → text[]`, with category `student` (reminders, homework, notes) or `parent_only` (billing, digest): the parent always, plus the student's own real email for `student` emails, filtered by each person's notification settings. **For every existing account this returns only the student's own email, exactly as today.**
- Additive SELECT policies (`OR is_guardian_of(student_id)`) on the tables a parent needs to read: `scheduled_classes`, `class_logs`, `tutor_student_assigned`, `profiles` (the child's), `students` (the child's). **Existing policies are left untouched.**
- Verify: dry-run inside `BEGIN … ROLLBACK`; confirm `billing_account_for` returns the input student, and `recipients_for` returns only their own email for both categories, for all 9 current students.

### Phase 2 — Billing routing (backend; invisible)

Everywhere a student's balance is looked up by `student_id`, look it up by `billing_account_for(student_id)` instead:

- `complete_class_atomic` (the `student_subscriptions` lookup, currently `WHERE ss.student_id = v_student_user_id`).
- `deduct-class-credit` and `restore-class-credit` edge functions.
- `check-subscription` when a tutor or admin checks a student's balance (the AddClassDialog "not enough hours" warning).
- Ledger rows keep `student_id` = the child (so history shows which child) while `subscription_id` is the parent's subscription. `apply_credit_ledger_entry` is unchanged; it already locks by `subscription_id`.

Purchases need no change: checkout and the Stripe webhook already credit the **logged-in user** (`metadata.user_id`), which for a family is the parent.

Verify: unit tests for the resolver; an end-to-end test with a test family proving a child's class debits the parent's balance, and a regression test that an adult account still debits itself.

### Phase 3 — Email routing (backend; invisible)

| Emails                                                  | Student (if they have a real email) | Parent |
| ------------------------------------------------------- | ----------------------------------- | ------ |
| Class reminder (time, Zoom link), tutor assigned        | Yes                                 | Yes    |
| Class logged, tutor notes, homework                     | Yes                                 | Yes    |
| Weekly summary, quarterly report                        | No                                  | Yes    |
| Hours balance, low and zero hours, receipts, auto-renew | No                                  | Yes    |

- Add `_shared/recipients.ts`: calls `recipients_for(student, category)`, plus an `assertSendable(email)` guard used by every send that drops any `@managed.learn2lead.page` address (logged, never sent).
- Route sends through it: `class-reminder`, `notify-assignment` and the class-logged email in `deduct-class-credit` (`student`); the low and zero balance emails in `deduct-class-credit`, `generate-quarterly-report` and `send-weekly-digest` (`parent_only`; one digest per family listing each child); `process-auto-renewal` and `stripe-webhooks` already go to the payer, so confirm only.
- Wording: parent copies say "Maya's class with …"; student copies keep "Your class with …".
- Students under 13: a child's email is collected only when the parent enters it, and students never receive promotional email.

Verify: function tests for both categories; deploy and confirm versions; send-path dry run for a test family (a child with an email, a child without one); confirm an adult account's emails are byte-for-byte unchanged.

### Phase 4 — Signup and onboarding (frontend; behind the flag)

- Signup step: **"Who are the classes for?"** → _Me_ (current flow, unchanged) or _My child / children_.
- Family path: parent's own first and last name (required), then one or more children (first name, last name and grade required; student email optional, labelled "so they get their own class reminders").
- Children are created by a new edge function `create-managed-student` (service role; caller must be a parent; creates the auth user with the student's email or the placeholder and no password, the profile with `managed = true`, the `students` row and the active guardian link in one go). If the email already belongs to an account, stop and explain that the student can invite the parent from their own Settings (Phase 5b), rather than creating a duplicate.
- Google sign-in: the existing post-signup name step gains the same question.
- `useRoleSync` must recognise `parent` and **never** create or delete `students`/`tutors` rows for a parent. This hook currently deletes the "other" role's row on sign-in, so it needs a test proving a parent sign-in touches nothing.
- Security: the parent role and guardian links are written only server-side. Today's role comes from `user_metadata`, which users can edit, so the new edge function must check the profile role in the database, not metadata.

### Phase 5 — Parent dashboard (frontend)

New `parent` route tree using the standard wrapper pattern (`ParentDashboardWrapper` = `DashboardShell` + `OptimizedSuspense` + `ErrorBoundary`), gated by `PrivateRoute allowedRoles={['parent']}`.

- **Home:** family hours balance, buy hours / auto-renew (existing components, which already act on the logged-in user), upcoming classes for all children.
- **Per child:** schedule, class history with tutor notes and homework, progress.
- **Children:** add a child, edit names and grades.
- **Calendar:** the parent's feed includes every child's classes; each child also gets a "share this child's calendar" link for their own device (`calendar-feed` resolves guardian access).
- **Settings:** the parent's own notification preferences (apply to all children), time zone. A child's student-email preferences are the child's, editable here by the parent only while the child has no login.

A linked student's own dashboard (Phase 5b) replaces the buy-hours and auto-renew controls with "Hours managed by <parent>" and shows the family balance.

Tutors and admins: a linked student looks like any other student. Admin student detail shows "Parent: <name>" with a link; the admin users list gains a Parents filter.

### Phase 5b — "Invite a parent" (for students who already have an account)

For students who signed up themselves, including every current account, if they opt in.

- **Student Settings:** "Invite a parent" → parent's email → a `pending` guardian link and an invite email (new edge function `invite-guardian`; caller must be the student).
- **The parent accepts:** they sign in, or sign up with the role set server-side to `parent`. The acceptance screen says plainly: _"You'll manage hours and payments for Maya."_ Accepting is the parent's consent.
- **On acceptance, one transaction (new RPC `accept_guardian_invite`):**
  1. The link becomes `active`.
  2. The student's subscription row is re-pointed to the parent (`student_subscriptions.student_id` → parent). Balance, Stripe customer and saved card, and auto-renew all move together: nothing is recharged, and no hours move between balances. Ledger history stays attached through `subscription_id`.
  3. The Stripe customer's email is updated to the parent's, so Stripe's own receipts go to them too.
  4. **Exception:** if the parent already has a balance (they're already a family parent), the student's remaining hours move into it with a matching pair of ledger entries through `apply_credit_ledger_entry`, and the student's auto-renew is switched off in favour of the parent's.
- **Unlinking:** done by an admin on request, since it decides who keeps the balance. Default: the hours stay with the parent who paid, and the student starts a fresh balance of their own.

The student keeps their login, classes and history. From then on their classes draw on the parent's balance (`billing_account_for`), and emails route as in Phase 3.

Verify: a test student with a balance, saved card and auto-renew invites a test parent; after acceptance the parent sees the same balance and card, a class debits it, the next auto-renew charges the same card, and the student sees "Hours managed by …". Repeat for the exception case.

### Phase 6 — Admin conversion tool (fallback for existing families)

For when the account's email is really the parent's, so "Invite a parent" doesn't fit (e.g. the Kai and Viaan cases). Admin-only RPC `convert_to_family(p_account uuid, p_parent_first, p_parent_last, p_child_first, p_child_last, p_grade)`, run per request in one transaction:

1. The existing login becomes the parent: role → `parent`, names → the parent's. Email, Stripe customer, subscription, balance and auto-renew stay exactly where they are.
2. A managed child is created with the given name.
3. The child takes over the student records: tutor assignments, scheduled classes and class logs move from the old id to the child's id. Ledger history stays on the account, since the balance stays there.
4. An active guardian link is created.

Always dry-run first; produce a before/after summary for the admin. Pre-check: no class in progress or unlogged for that student at conversion time.

### Phase 7 — Later, not in v1

- Optional child login, for older students who want their own view. A child with a real email gets a set-password invite; a child without one needs the parent to add an email first.
- Second guardian (the schema already supports it; needs an invite flow).
- Move remaining email-based lookups (`UserDetailModal`, `SuggestedMatches`, assignment services, name-sync triggers) to ids. Placeholder emails are unique, so these keep working for children in v1; this is cleanup, not a blocker.

## Risks and how they're handled

| Risk                                          | Mitigation                                                                                                                                                      |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A change reaches existing families            | Resolver functions return the student themself when there's no active parent; regression tests on adult accounts for billing and every email; feature flag.     |
| A placeholder address is emailed              | Central `assertSendable` guard on every send; the domain has no mail records; logged when it triggers.                                                          |
| `useRoleSync` deletes rows for a new role     | Explicit `parent` handling plus a test.                                                                                                                         |
| Role escalation via editable user metadata    | Parent role and guardian links set only server-side; access checks read the database.                                                                           |
| Guardian sees another family's data           | Policies key on active `guardian_links`; a test parent tries to read another student, and a pending invite must grant nothing.                                  |
| Someone takes over a student's paid hours     | Only the student can create an invite, it goes to the address they typed, it must be accepted by a login with that email, and billing moves only on acceptance. |
| Billing handover goes wrong                   | One transaction (`accept_guardian_invite`); the subscription row moves rather than balances being recomputed; tested end to end, including auto-renew.          |
| Students get billing emails meant for parents | Money emails are `parent_only` with recipients resolved server-side; tests for both categories.                                                                 |
| Free-tier limits                              | No new cron jobs or realtime channels required.                                                                                                                 |

## Effort

| Phase               | Estimate             |
| ------------------- | -------------------- |
| 1. Data model       | 1–2 days             |
| 2. Billing routing  | 2 days               |
| 3. Email routing    | 2 days               |
| 4. Signup           | 3 days               |
| 5. Parent dashboard | 4–5 days             |
| 5b. Invite a parent | 2 days               |
| 6. Conversion tool  | 1–2 days             |
| **Total**           | **about 3–3½ weeks** |

## Open items for the owner

- Confirm D1–D9.
- Pick the first family to pilot "Invite a parent" (or the conversion tool) once ready.

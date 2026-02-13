
## PostHog Analytics Integration

### Overview
Add PostHog analytics to Learn2Lead with automatic page view tracking, user identification on login/logout, and event tracking for class completions. Since the PostHog API key is a publishable client-side key, it will be stored directly in the codebase.

### What You'll Get
- **Automatic page view tracking** on every route change
- **User identification** so PostHog ties sessions to real users (by ID, email, and role)
- **Class completion event tracking** for monitoring key business metrics
- **Dev mode disabled** so local testing doesn't pollute your analytics

---

### Changes

**1. Install `posthog-js` package**

**2. Create `src/lib/posthog.ts`** (new file)
- Initialize PostHog with your API key (`phc_EmulYhmshfgWxynh5hICupiq4gHtaYIAEDSqpc4d69G`) and host (`https://us.i.posthog.com`)
- Disable automatic pageview capture (handled manually via React Router)
- Set `person_profiles: 'identified_only'` (matching your snippet config)
- Opt out of capturing in dev mode to keep data clean
- Export helper functions: `identifyUser`, `resetUser`, `captureEvent`

**3. Update `src/main.tsx`**
- Add `initPostHog()` call alongside the existing `initSentry()` call

**4. Create `src/components/shared/PostHogPageView.tsx`** (new file)
- Small component that listens to `useLocation()` changes and fires `posthog.capture('$pageview')` on each route change

**5. Update `src/App.tsx`**
- Add `PostHogPageView` component inside `BrowserRouter`, next to the existing `RoutePersistence` component

**6. Update `src/contexts/AuthContext/AuthProvider.tsx`**
- On `SIGNED_IN` (line ~41 area, after `setSentryUser`): call `posthog.identify(user.id, { email, role })`
- On `SIGNED_OUT` (line ~117 area, after Sentry clear): call `posthog.reset()`

**7. Update `src/services/classCompletion.ts`**
- After successful class completion (~line 200): capture `class_completed` event with subject, tutor, student, and credits remaining
- After credit deduction failures (~lines 64-84): capture `credit_deduction_failed` event with error code

### Files Summary

| File | Action |
|------|--------|
| `src/lib/posthog.ts` | Create |
| `src/components/shared/PostHogPageView.tsx` | Create |
| `src/main.tsx` | Add `initPostHog()` call |
| `src/App.tsx` | Add `PostHogPageView` component |
| `src/contexts/AuthContext/AuthProvider.tsx` | Add identify/reset calls |
| `src/services/classCompletion.ts` | Add event capture calls |

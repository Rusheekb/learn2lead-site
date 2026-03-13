

## Logging System Improvements

After reviewing the codebase, here are the key issues and recommended improvements:

### Current State

1. **560+ raw `console.log/error/warn` calls** scattered across 28 service files with no structured format
2. **ErrorHandler in `errorHandling.ts`** logs to console in production (line 101) instead of routing through Sentry
3. **AnalyticsService** logs to console only — PostHog is integrated separately but the analytics service doesn't use it
4. **No log levels or filtering** — everything goes to console with inconsistent prefixes (`[Analytics]`, `[PROD_ERROR]`, etc.)
5. **Sentry integration exists** but `ErrorHandler.logError()` doesn't call `captureException` — it still uses `console.error` in production

### Proposed Improvements

#### 1. Create a centralized logger utility
A single `src/lib/logger.ts` module with `debug`, `info`, `warn`, `error` methods that:
- In **development**: logs to console with colored prefixes and context
- In **production**: suppresses debug/info, routes errors through Sentry's `captureException` and warnings through `captureMessage`
- Accepts a `context` string (e.g., `'classService'`, `'auth'`) for filtering

#### 2. Connect ErrorHandler to Sentry
Update `errorHandling.ts` line 99-102 to call `captureException` instead of `console.error` in production. This is the most impactful single change — right now production errors from `ErrorHandler.handle()` are lost to the browser console.

#### 3. Route AnalyticsService through PostHog
Replace the `console.log` calls in `AnalyticsService.track()` and `.page()` with `captureEvent` from `src/lib/posthog.ts` so analytics events actually reach PostHog instead of just logging to console.

#### 4. Replace scattered console calls in services
Systematically replace raw `console.error/log` in the ~28 service files with the new logger. This gives consistent formatting and ensures production errors reach Sentry.

### Implementation Plan

| Step | Files | Effort |
|------|-------|--------|
| Create `src/lib/logger.ts` | 1 new file | Small |
| Connect ErrorHandler to Sentry | `errorHandling.ts` | Small |
| Route analytics to PostHog | `analyticsService.ts` | Small |
| Migrate service files to logger | ~15-20 files | Medium |

### What This Achieves
- Production errors reliably reach Sentry instead of being lost in browser console
- Analytics events reach PostHog instead of only logging locally
- Consistent log format across the entire app
- Easy to add log filtering or remote log levels later


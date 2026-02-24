

# Improve Error Handling UX

## Problem
The current `ErrorBoundary` wraps the entire app and shows a full-page "Something went wrong" screen for any rendering error -- including transient issues like lazy-load chunk failures or brief network hiccups. This creates a jarring experience.

## Solution

### 1. Add auto-retry to ErrorBoundary for transient errors
When an error is caught for the first time, automatically attempt a reset (re-render) after a short delay instead of immediately showing the error screen. This silently recovers from transient chunk-loading and race-condition errors. Only show the error UI if the retry also fails.

### 2. Add granular error boundaries around dashboard sections
Wrap each dashboard content area (student, tutor, admin) in its own ErrorBoundary with a compact inline fallback -- a small card saying "This section couldn't load" with a Retry button. This way, a failure in one part of the dashboard doesn't take down the entire page; the sidebar and header remain functional.

### 3. Redesign the full-page error fallback
Replace the current stark error card with a friendlier design:
- Softer icon and messaging ("We hit a snag" instead of "Something went wrong")
- A "Reload Page" button (does a full page reload to clear stale chunks) instead of the current "Try Again" which only resets React state
- Keep "Go Home" as secondary

### 4. Add a compact inline error fallback component
A new `InlineErrorFallback` component for section-level boundaries -- a small card with an icon, brief message, and Retry button that fits naturally within the page layout.

---

## Technical Details

### Files to create
| File | Purpose |
|------|---------|
| `src/components/shared/InlineErrorFallback.tsx` | Compact error card for section-level boundaries |

### Files to modify
| File | Change |
|------|--------|
| `src/components/ErrorBoundary.tsx` | Add auto-retry logic (retry once before showing error UI); update error UI text and add "Reload Page" button |
| `src/App.tsx` | Wrap each dashboard wrapper's children in a secondary ErrorBoundary with InlineErrorFallback |

### Auto-retry logic (ErrorBoundary)
- Track a `retryCount` in state
- On first error (`retryCount === 0`), increment count and call `setState({ hasError: false })` after 500ms to silently retry
- On second error (`retryCount >= 1`), show the error UI
- Reset `retryCount` when the user clicks "Try Again"

### InlineErrorFallback component
A centered card with:
- A subtle warning icon
- "This section couldn't load" message
- "Retry" button that resets the parent ErrorBoundary

### Dashboard wrapper changes
Each wrapper (Student, Tutor, Admin) will nest an ErrorBoundary with the inline fallback around its children, so errors in dashboard content don't break the shell/sidebar.


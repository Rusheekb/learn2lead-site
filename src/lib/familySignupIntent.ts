/**
 * Google sign-up can't carry our "Who are the classes for?" answer through
 * the OAuth redirect, so it's held in sessionStorage across the round trip
 * and applied once the new account signs in (become_family_account, which
 * only ever converts a brand-new account). Expires after 30 minutes.
 */
const KEY = 'learn2lead.familySignupIntent';
const MAX_AGE_MS = 30 * 60 * 1000;

export function setFamilySignupIntent(): void {
  try {
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // Storage unavailable (private mode) — the parent can still switch later.
  }
}

export function clearFamilySignupIntent(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** True once if a fresh family sign-up is pending; clears it either way. */
export function consumeFamilySignupIntent(now = Date.now()): boolean {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!raw) return false;
    const at = Number(raw);
    return Number.isFinite(at) && now - at >= 0 && now - at < MAX_AGE_MS;
  } catch {
    return false;
  }
}

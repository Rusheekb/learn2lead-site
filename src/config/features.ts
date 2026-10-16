/**
 * Family accounts ship dark: the "Who are the classes for?" sign-up choice
 * and the student "Invite a parent" card only appear when
 * VITE_ENABLE_FAMILY_SIGNUP=true. Everything else — parent dashboards,
 * accepting invites, the admin family tools, server-side routing — works
 * regardless, so an admin can set families up before it's switched on.
 * A function (not a constant) so tests can toggle it.
 */
export const isFamilySignupEnabled = (): boolean =>
  import.meta.env.VITE_ENABLE_FAMILY_SIGNUP === 'true';

/**
 * Text messages ship dark until Twilio is set up (account, A2P 10DLC
 * registration and the TWILIO_* function secrets): the "Text messages"
 * settings card and the Text column under Notifications only appear when
 * VITE_ENABLE_SMS=true. Without it, notifications are email-only, as before.
 */
export const isSmsEnabled = (): boolean =>
  import.meta.env.VITE_ENABLE_SMS === 'true';

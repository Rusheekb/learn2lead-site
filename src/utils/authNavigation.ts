import { AppRole } from '@/hooks/useProfile';

export const getDashboardPath = (role: AppRole | null): string => {
  if (!role) return '/login';

  switch (role) {
    case 'student':
      return '/dashboard';
    case 'tutor':
      return '/tutor-dashboard';
    case 'admin':
      return '/admin-dashboard';
    default:
      return '/login';
  }
};

/**
 * Whether a post-login `returnUrl` is safe to navigate to: it must be a
 * same-origin path. Checking only "starts with / but not //" (what Login did
 * before) isn't enough — browsers treat "\" as "/", so "/\evil.com" becomes
 * the protocol-relative "//evil.com" and sends a freshly signed-in user to
 * another site (the React Router open-redirect advisory). Control characters
 * are rejected too, since URL parsing strips tabs/newlines ("/\t/evil.com").
 */
export const isSafeReturnPath = (path: string | null): path is string => {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return false;
  if (path.includes('\\')) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(path)) return false;

  try {
    const base = 'https://learn2lead.invalid';
    return new URL(path, base).origin === base;
  } catch {
    return false;
  }
};

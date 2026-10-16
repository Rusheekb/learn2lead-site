import { isSafeReturnPath, getDashboardPath } from '../authNavigation';

describe('isSafeReturnPath', () => {
  it.each(['/pricing', '/dashboard?tab=credits', '/tutor-dashboard#x', '/'])(
    'accepts same-origin path %s',
    (p) => {
      expect(isSafeReturnPath(p)).toBe(true);
    }
  );

  it.each([
    ['missing', null],
    ['empty', ''],
    ['absolute URL', 'https://evil.com'],
    ['protocol-relative', '//evil.com'],
    ['backslash variant (React Router advisory)', '/\\evil.com'],
    ['leading backslash', '\\\\evil.com'],
    ['tab-smuggled', '/\t/evil.com'],
    ['newline-smuggled', '/\n/evil.com'],
    ['javascript scheme', 'javascript:alert(1)'],
    ['relative without slash', 'evil.com'],
  ])('rejects %s', (_label, p) => {
    expect(isSafeReturnPath(p as string | null)).toBe(false);
  });
});

describe('getDashboardPath', () => {
  it('routes each role to its dashboard and falls back to login', () => {
    expect(getDashboardPath('student')).toBe('/dashboard');
    expect(getDashboardPath('tutor')).toBe('/tutor-dashboard');
    expect(getDashboardPath('admin')).toBe('/admin-dashboard');
    expect(getDashboardPath('parent')).toBe('/family');
    expect(getDashboardPath(null)).toBe('/login');
  });
});

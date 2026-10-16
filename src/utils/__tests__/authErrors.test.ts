import { friendlyAuthError } from '../authErrors';

describe('friendlyAuthError', () => {
  it('rewrites Supabase’s password-policy message', () => {
    expect(
      friendlyAuthError(
        new Error(
          'Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789'
        )
      )
    ).toBe(
      'Password must be at least 6 characters and include a letter and a number.'
    );
    expect(
      friendlyAuthError({ code: 'weak_password', message: 'whatever' })
    ).toContain('include a letter and a number');
  });

  it('explains an existing account', () => {
    expect(friendlyAuthError(new Error('User already registered'))).toBe(
      'An account with this email already exists. Try signing in instead.'
    );
  });

  it('softens bad credentials', () => {
    expect(friendlyAuthError(new Error('Invalid login credentials'))).toMatch(
      /don’t match/
    );
  });

  it('passes anything else through', () => {
    expect(friendlyAuthError(new Error('Rate limit exceeded'))).toBe(
      'Rate limit exceeded'
    );
    expect(friendlyAuthError(null)).toBe(
      'Something went wrong. Please try again.'
    );
  });
});

import {
  clearFamilySignupIntent,
  consumeFamilySignupIntent,
  setFamilySignupIntent,
} from '../familySignupIntent';

describe('family sign-up intent (Google round trip)', () => {
  beforeEach(() => sessionStorage.clear());

  it('is consumed once', () => {
    setFamilySignupIntent();
    expect(consumeFamilySignupIntent()).toBe(true);
    expect(consumeFamilySignupIntent()).toBe(false);
  });

  it('is absent unless set', () => {
    expect(consumeFamilySignupIntent()).toBe(false);
  });

  it('expires after 30 minutes', () => {
    setFamilySignupIntent();
    expect(consumeFamilySignupIntent(Date.now() + 31 * 60 * 1000)).toBe(false);
  });

  it('can be cleared (signing up as "Me")', () => {
    setFamilySignupIntent();
    clearFamilySignupIntent();
    expect(consumeFamilySignupIntent()).toBe(false);
  });

  it('ignores junk', () => {
    sessionStorage.setItem('learn2lead.familySignupIntent', 'abc');
    expect(consumeFamilySignupIntent()).toBe(false);
  });
});

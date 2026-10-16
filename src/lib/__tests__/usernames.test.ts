import { signUpSchema, suggestUsername, usernameField } from '../validation';
import { generateTempPassword } from '../tempPassword';
import { passwordProblem } from '../validation';

describe('usernames (mirror the database rule)', () => {
  const valid = (v: string) => usernameField().safeParse(v).success;

  it.each(['maya.p', 'jordan_lee', 'abc', 'a1b2c3', 'Kai.Giorgio'])(
    'accepts %s',
    (v) => expect(valid(v)).toBe(true)
  );

  it.each([
    'ab',
    'a..b',
    'a__b',
    'name.',
    'name_',
    '.name',
    'has space',
    'émile',
    'x'.repeat(31),
  ])('rejects %s', (v) => expect(valid(v)).toBe(false));

  it('lowercases what it accepts', () => {
    expect(usernameField().parse('  Kai.Giorgio ')).toBe('kai.giorgio');
  });

  it('is required at sign-up', () => {
    const result = signUpSchema.safeParse({
      firstName: 'Nina',
      lastName: 'Patel',
      username: '',
      email: 'nina@example.com',
      password: 'Tutoring2026',
    });
    expect(result.success).toBe(false);
  });
});

describe('generateTempPassword', () => {
  it('always meets the password rule', () => {
    for (let i = 0; i < 50; i++) {
      expect(passwordProblem(generateTempPassword())).toBeNull();
    }
  });

  it('reads as Word-1234', () => {
    expect(generateTempPassword(() => 0)).toBe('Apple-1000');
  });
});

describe('suggestUsername', () => {
  it('builds first.last like the database does', () => {
    expect(suggestUsername('Maya', 'Lee')).toBe('maya.lee');
    expect(suggestUsername(' Sean ', "O'Brien")).toBe('sean.obrien');
    expect(suggestUsername('Maya', 'Lee', 3)).toBe('maya.lee3');
  });

  it('gives nothing for names too short to use', () => {
    expect(suggestUsername('', '')).toBe('');
    expect(suggestUsername('Al', '')).toBe('');
  });

  it('keeps suggestions within the allowed length', () => {
    const u = suggestUsername('Bartholomew', 'Montgomery-Smithson', 12);
    expect(u.length).toBeLessThanOrEqual(30);
    expect(u).toMatch(/^[a-z0-9][a-z0-9._]*[a-z0-9]$/);
  });
});

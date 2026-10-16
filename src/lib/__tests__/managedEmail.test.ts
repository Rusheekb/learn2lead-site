import {
  MANAGED_EMAIL_DOMAIN,
  displayEmail,
  isPlaceholderEmail,
} from '../managedEmail';
import { MANAGED_EMAIL_DOMAIN as EDGE_DOMAIN } from '../../../supabase/functions/_shared/recipients';

describe('managed student placeholder addresses', () => {
  it('uses the same domain as the edge functions', () => {
    expect(MANAGED_EMAIL_DOMAIN).toBe(EDGE_DOMAIN);
  });

  it('recognises placeholders', () => {
    expect(isPlaceholderEmail(`student-1@${MANAGED_EMAIL_DOMAIN}`)).toBe(true);
    expect(isPlaceholderEmail('kid@gmail.com')).toBe(false);
    expect(isPlaceholderEmail(null)).toBe(false);
  });

  it('shows a label instead of a placeholder', () => {
    expect(displayEmail(`student-1@${MANAGED_EMAIL_DOMAIN}`)).toBe(
      'No email (added by parent)'
    );
    expect(displayEmail('kid@gmail.com')).toBe('kid@gmail.com');
    expect(displayEmail(undefined)).toBe('');
  });
});

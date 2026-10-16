import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { signInWithGoogleIdToken } from '../authActions';

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const signInWithIdToken = jest.fn();
beforeAll(() => {
  (
    supabase.auth as unknown as { signInWithIdToken: jest.Mock }
  ).signInWithIdToken = signInWithIdToken;
});
beforeEach(() => jest.clearAllMocks());

describe('signInWithGoogleIdToken', () => {
  it('exchanges the Google token and raw nonce for a session', async () => {
    signInWithIdToken.mockResolvedValue({ data: {}, error: null });
    await signInWithGoogleIdToken({ token: 'jwt', nonce: 'raw-nonce' });
    expect(signInWithIdToken).toHaveBeenCalledWith({
      provider: 'google',
      token: 'jwt',
      nonce: 'raw-nonce',
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('reports a failure in plain words', async () => {
    signInWithIdToken.mockResolvedValue({
      data: {},
      error: new Error('Network request failed'),
    });
    await expect(
      signInWithGoogleIdToken({ token: 'jwt', nonce: 'n' })
    ).rejects.toThrow();
    expect(toast.error).toHaveBeenCalled();
  });
});

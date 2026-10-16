import { supabase } from '@/integrations/supabase/client';
import { mockFunctionsInvoke } from '@/setupTests';
import { signInWithUsername } from '../authActions';

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const setSession = jest.fn();
beforeAll(() => {
  (supabase.auth as unknown as { setSession: jest.Mock }).setSession =
    setSession;
});
beforeEach(() => {
  setSession.mockReset().mockResolvedValue({ error: null });
  mockFunctionsInvoke.mockReset();
});

describe('signInWithUsername', () => {
  it('signs in through the server and adopts the session', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: { access_token: 'a', refresh_token: 'r' },
      error: null,
    });
    await signInWithUsername('maya.p', 'Secret123');
    expect(mockFunctionsInvoke).toHaveBeenCalledWith('username-login', {
      body: { username: 'maya.p', password: 'Secret123' },
    });
    expect(setSession).toHaveBeenCalledWith({
      access_token: 'a',
      refresh_token: 'r',
    });
  });

  it("shows the server's message (e.g. sign-in turned off)", async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: null,
      error: {
        message: 'non-2xx',
        context: {
          json: () =>
            Promise.resolve({
              error:
                'This sign-in has been turned off. Ask your parent to turn it back on.',
            }),
        },
      },
    });
    await expect(signInWithUsername('maya.p', 'x')).rejects.toThrow(
      'turned off'
    );
    expect(setSession).not.toHaveBeenCalled();
  });

  it('falls back to a plain message', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: null,
      error: { message: 'x', context: { json: () => Promise.reject() } },
    });
    await expect(signInWithUsername('nobody', 'x')).rejects.toThrow(
      'don’t match'
    );
  });
});

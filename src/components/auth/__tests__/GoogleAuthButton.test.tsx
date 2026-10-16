import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { webcrypto, createHash } from 'crypto';
import GoogleAuthButton from '../GoogleAuthButton';
import { getGoogleClientId } from '@/config/features';

jest.mock('@/config/features', () => ({ getGoogleClientId: jest.fn() }));

beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
});

type GisConfig = {
  client_id: string;
  nonce: string;
  callback: (r: { credential?: string }) => void;
};

describe('GoogleAuthButton', () => {
  afterEach(() => {
    delete (window as { google?: unknown }).google;
    document.head
      .querySelectorAll('script[src*="accounts.google.com"]')
      .forEach((s) => s.remove());
  });

  it('uses the usual redirect button when no client ID is set', () => {
    (getGoogleClientId as jest.Mock).mockReturnValue('');
    const onSignIn = jest.fn().mockResolvedValue(undefined);
    render(<GoogleAuthButton isLoading={false} onSignIn={onSignIn} />);
    fireEvent.click(
      screen.getByRole('button', { name: /Continue with Google/ })
    );
    expect(onSignIn).toHaveBeenCalledWith();
  });

  it("renders Google's button and passes back the token with its nonce", async () => {
    (getGoogleClientId as jest.Mock).mockReturnValue('client-123');
    let config: GisConfig | undefined;
    const renderButton = jest.fn();
    window.google = {
      accounts: {
        id: {
          initialize: (c) => {
            config = c as GisConfig;
          },
          renderButton,
        },
      },
    };
    const onSignIn = jest.fn().mockResolvedValue(undefined);
    render(
      <GoogleAuthButton
        isLoading={false}
        onSignIn={onSignIn}
        text="signup_with"
      />
    );
    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    expect(renderButton.mock.calls[0][1]).toMatchObject({
      text: 'signup_with',
    });
    expect(config!.client_id).toBe('client-123');

    config!.callback({ credential: 'google-id-token' });
    const [{ token, nonce }] = onSignIn.mock.calls[0];
    expect(token).toBe('google-id-token');
    // Google got the SHA-256 of the nonce Supabase will check.
    expect(createHash('sha256').update(nonce).digest('hex')).toBe(
      config!.nonce
    );
  });

  it("falls back to the redirect if Google's script can't load", async () => {
    (getGoogleClientId as jest.Mock).mockReturnValue('client-123');
    render(<GoogleAuthButton isLoading={false} onSignIn={jest.fn()} />);
    const script = document.head.querySelector(
      'script[src*="accounts.google.com"]'
    ) as HTMLScriptElement;
    expect(script).toBeTruthy();
    script.onerror?.(new Event('error'));
    expect(
      await screen.findByRole('button', { name: /Continue with Google/ })
    ).toBeInTheDocument();
  });
});

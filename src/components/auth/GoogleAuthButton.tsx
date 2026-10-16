import React, { useEffect, useRef, useState } from 'react';
import { getGoogleClientId } from '@/config/features';
import {
  GoogleCredential,
  loadGoogleIdentity,
  makeNonce,
} from '@/lib/googleIdentity';
import SocialAuthButton from './SocialAuthButton';
import GoogleIcon from './GoogleIcon';

interface GoogleAuthButtonProps {
  isLoading: boolean;
  /**
   * With a credential: Google's own button was used (exchange it for a
   * session). Without: fall back to the Supabase redirect.
   */
  onSignIn: (credential?: GoogleCredential) => Promise<void>;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}

/**
 * "Continue with Google". Uses Google's own button when VITE_GOOGLE_CLIENT_ID
 * is set (Google then shows learn2lead.page), otherwise — or if Google's
 * script can't load — the usual redirect button.
 */
const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  isLoading,
  onSignIn,
  text = 'continue_with',
}) => {
  const clientId = getGoogleClientId();
  const holder = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'gis' | 'redirect'>(
    clientId ? 'gis' : 'redirect'
  );
  // The latest handler, without re-rendering Google's button on each render.
  const onSignInRef = useRef(onSignIn);
  onSignInRef.current = onSignIn;

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      try {
        const [gis, nonce] = await Promise.all([
          loadGoogleIdentity(),
          makeNonce(),
        ]);
        if (cancelled || !holder.current) return;
        gis.initialize({
          client_id: clientId,
          nonce: nonce.hashed,
          ux_mode: 'popup',
          use_fedcm_for_button: true,
          itp_support: true,
          callback: ({ credential }) => {
            if (credential) {
              onSignInRef.current({ token: credential, nonce: nonce.raw });
            }
          },
        });
        gis.renderButton(holder.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text,
          logo_alignment: 'center',
          width: Math.min(
            400,
            Math.max(200, holder.current.offsetWidth || 320)
          ),
        });
      } catch {
        if (!cancelled) setMode('redirect');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, text]);

  if (mode === 'redirect') {
    return (
      <SocialAuthButton
        provider="Google"
        isLoading={isLoading}
        onClick={() => onSignIn()}
        icon={<GoogleIcon />}
      />
    );
  }

  return (
    <div
      ref={holder}
      className={`flex min-h-[44px] w-full justify-center ${isLoading ? 'pointer-events-none opacity-60' : ''}`}
      data-testid="google-signin-button"
      aria-busy={isLoading}
    />
  );
};

export default GoogleAuthButton;

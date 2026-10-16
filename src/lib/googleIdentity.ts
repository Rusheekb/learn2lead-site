/**
 * Google Identity Services (the "Sign in with Google" button), loaded on
 * demand. The button hands back a Google ID token, which is exchanged for a
 * Supabase session with signInWithIdToken — no redirect through the Supabase
 * project's address, so Google's screens name learn2lead.page instead.
 */

const GIS_SRC = 'https://accounts.google.com/gsi/client';

export interface GoogleCredential {
  /** Google ID token (JWT) */
  token: string;
  /** The raw nonce; Google saw its SHA-256 hash */
  nonce: string;
}

interface GisButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill';
  logo_alignment?: 'left' | 'center';
  width?: number;
}

export interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    nonce?: string;
    ux_mode?: 'popup' | 'redirect';
    use_fedcm_for_button?: boolean;
    itp_support?: boolean;
  }) => void;
  renderButton: (parent: HTMLElement, options: GisButtonOptions) => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

let loading: Promise<GoogleAccountsId> | null = null;

/** Load the Google script once; rejects if it's blocked or times out. */
export function loadGoogleIdentity(
  timeoutMs = 8000
): Promise<GoogleAccountsId> {
  const ready = window.google?.accounts?.id;
  if (ready) return Promise.resolve(ready);
  if (loading) return loading;
  loading = new Promise<GoogleAccountsId>((resolve, reject) => {
    const fail = (why: string) => {
      loading = null;
      reject(new Error(why));
    };
    const timer = window.setTimeout(
      () => fail('Google sign-in timed out'),
      timeoutMs
    );
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.clearTimeout(timer);
      const id = window.google?.accounts?.id;
      if (id) resolve(id);
      else fail('Google sign-in unavailable');
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      fail('Google sign-in could not load');
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** A fresh nonce, and the SHA-256 (hex) Google puts in the ID token. */
export async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(
    ''
  );
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(raw)
  );
  const hashed = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');
  return { raw, hashed };
}

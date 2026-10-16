/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_STRIPE_MODE?: 'test' | 'live';
  /** 'true' shows family sign-up and "Invite a parent" (see src/config/features.ts) */
  readonly VITE_ENABLE_FAMILY_SIGNUP?: string;
  readonly VITE_ENABLE_SMS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

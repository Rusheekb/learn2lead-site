# Google sign-in: show "Learn2Lead", not the Supabase address

## Why Google shows `lnhtlbatcufmsyoujuqh.supabase.co`

With the usual redirect flow, Google sends the sign-in back to Supabase's address. Google then names that domain on its screen ("to continue to lnhtlbatcufmsyoujuqh.supabase.co"). That domain belongs to Supabase, so it can't be verified as ours.

There are two ways to fix it:

- **Supabase custom domain** (e.g. `auth.learn2lead.page`). This is a paid add-on, so it isn't used here.
- **Google's own sign-in button (used here, free).** The button hands Google's sign-in token straight to our page, and the app exchanges it with Supabase (`signInWithIdToken`). There's no redirect, so Google names `learn2lead.page`, a domain you can verify. Once Google approves the branding, it shows the app name and logo too.

## How it works in the code

- `src/components/auth/GoogleAuthButton.tsx` renders Google's button when `VITE_GOOGLE_CLIENT_ID` is set.
- If that variable is unset, or Google's script can't load, the button falls back to the old "Continue with Google" redirect. Nothing changes until the variable is set.
- `src/lib/googleIdentity.ts` loads Google's script and makes the nonce. Google receives its SHA-256 and Supabase checks the original.
- `signInWithGoogleIdToken` in `src/utils/authActions.ts` exchanges the token for a session. Parent sign-up through Google works the same as before.

## Owner steps, in order

The OAuth client is `632387561545-ok6a9ansmcorgpcrv45v027k4amp3k7t.apps.googleusercontent.com`. It's the one already configured in Supabase → Authentication → Providers → Google.

1. **Allow the site to use Google's button.**
   - Go to Google Cloud Console → Google Auth Platform → Clients and open that client.
   - Under **Authorized JavaScript origins**, add `https://www.learn2lead.page` and `https://learn2lead.page`. For local testing, also add `http://localhost:8080`.
   - Keep the existing redirect URI (the Supabase callback), because the fallback still uses it.
2. **Fill in the branding** (Google Auth Platform → Branding):
   - App name: **Learn2Lead**
   - User support email
   - Logo (optional, but it's what makes the screen look like Learn2Lead)
   - Home page: `https://www.learn2lead.page`
   - Privacy policy link (needs the privacy page; see below)
   - Authorized domains: `learn2lead.page`
   - Developer contact email
3. **Prove you own the domain.** In Google Search Console, add `learn2lead.page` as a domain property and add the DNS TXT record it gives you at the domain's DNS provider.
4. **Ask Google to verify the branding** (Google Auth Platform → Verification Center). The app only asks for name, email and profile picture (no sensitive scopes), so this is brand verification only. It usually takes a few business days.
5. **Turn it on:**
   - Set `VITE_GOOGLE_CLIENT_ID` to the client ID above in Vercel (Production and Preview) and redeploy.
   - Do this only after step 1. Otherwise Google refuses the button on the live site.
6. **Check:** sign in with Google on the live site. The Google screen should name `learn2lead.page`, and Learn2Lead with its logo once the branding is verified.

Supabase needs no change: the button uses the same client ID Supabase already accepts.



# Fix Remaining Old Domain References

## Code Changes

### 1. `supabase/functions/process-auto-renewal/index.ts` (line 358)
Update the "Buy Credits" link in the auto-renewal failure email from `https://learn2lead-site.lovable.app/pricing` to `https://learn2lead.page/pricing`.

### 2. `supabase/functions/_shared/cors.ts` (lines 10-11) — optional cleanup
Remove the two old Lovable origins (`learn2lead.lovable.app` and `learn2lead-site.lovable.app`) from `ALLOWED_ORIGINS` since the site is now served from `learn2lead.page`. Keep only `learn2lead.page`, `www.learn2lead.page`, and localhost for dev.

### 3. `supabase/config.toml` (line 39) — optional cleanup
Remove `https://learn2lead.lovable.app/login` and `https://learn2lead-site.lovable.app/login` from `additional_redirect_urls`. Note: this file is only used for local Supabase dev — the production redirect URLs are set in the Supabase Dashboard.

Only change #1 is critical. Changes #2 and #3 are cleanup.


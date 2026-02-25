

# Setting Up Your New Custom Domain

Here are all the steps to properly configure your new domain with your Learn2Lead project:

## 1. Connect the domain in Lovable

1. Go to your Lovable project **Settings → Domains**
2. Click **Connect Domain** and enter your domain (e.g., `learn2lead.com`)
3. Follow the setup flow — Lovable will provide the DNS records you need
4. **Add both** `yourdomain.com` and `www.yourdomain.com` as separate entries
5. Set one as **Primary** (the other will redirect to it)

## 2. Configure DNS at your registrar

Add these records at your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.):

| Type | Name | Value |
|------|------|-------|
| A | @ | 185.158.133.1 |
| A | www | 185.158.133.1 |
| TXT | _lovable | (value provided by Lovable during setup) |

DNS propagation can take up to 72 hours. Use [DNSChecker.org](https://dnschecker.org) to verify.

## 3. Update CORS in edge functions

Your `supabase/functions/_shared/cors.ts` has an `ALLOWED_ORIGINS` list. You'll need to add your new domain there so edge functions accept requests from it.

## 4. Update Supabase auth redirect URLs

In your Supabase dashboard (Authentication → URL Configuration):
- Add your new domain to **Redirect URLs** (e.g., `https://yourdomain.com/login`)
- Update **Site URL** if this becomes the primary domain

## 5. Update SEO assets

Several files reference the current domain and need updating:
- `index.html` — canonical URL, Open Graph URLs, meta tags
- `public/sitemap.xml` — all `<loc>` URLs currently point to `learn2lead.vercel.app`
- `public/robots.txt` — sitemap URL points to `learn2lead.vercel.app`

## 6. Update Stripe configuration

If you use Stripe webhooks or checkout:
- Update the webhook endpoint URL in the Stripe dashboard
- Verify the `origin` used in checkout return URLs (e.g., `customer-portal/index.ts` uses `origin` from the request, so this should work automatically)

## 7. Update Supabase config

In `supabase/config.toml`, update `site_url` and `additional_redirect_urls` to include the new domain.

## 8. Publish

Once DNS is verified and SSL is provisioned (Lovable handles SSL automatically), click **Publish → Update** to deploy.

---

## What I can help implement (steps 3–5)

Steps 1, 2, 6, and 8 require action in external dashboards. But I can update the codebase for steps 3, 4, 5, and 7 once you share your domain name.


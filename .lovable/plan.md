

# Update Referral Link to Production URL

## Summary

Update the hardcoded referral base URL from the Lovable published URL to your official production domain on Vercel.

## Current State

The referral URL is currently set to:
```
https://learn2lead-site.lovable.app/refer
```

This generates links like:
```
https://learn2lead-site.lovable.app/refer/BAR25
```

## Change Required

Update to your production domain:
```
https://learn2lead.vercel.app/refer
```

This will generate links like:
```
https://learn2lead.vercel.app/refer/BAR25
```

## File to Modify

**`src/components/shared/profile/ReferralCodeSection.tsx`**

Line 13 - Change:
```typescript
const REFERRAL_BASE_URL = 'https://learn2lead-site.lovable.app/refer';
```

To:
```typescript
const REFERRAL_BASE_URL = 'https://learn2lead.vercel.app/refer';
```

## Impact

This single change will automatically update:
- The referral link displayed in the input field
- All social share buttons (Twitter, Facebook, WhatsApp, Email, SMS)
- The QR code content
- The copied link when users click "Copy Link"

## Alternative Consideration

For better maintainability, you could also consider moving this URL to an environment variable in the future, allowing different URLs for development vs. production without code changes.


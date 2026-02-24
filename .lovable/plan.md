

# Reorganize the Settings Page

## Current State
The Settings tab is a flat vertical stack of cards with mixed concerns:
1. SubscriptionStatusCard (students only)
2. AutoRenewalSettings (students only)
3. CreditHistory (students only)
4. Account Security (password change + email display)
5. ReferralCodeSection

Additionally, the AppearanceSettings card on the Profile tab is a placeholder ("coming soon"). There is no notification preferences section, no danger zone, and no visual grouping.

## Proposed Changes

### 1. Add section headers to group related settings
Break the flat card list into labeled sections with headings and descriptions, so users can scan quickly:

- **Subscription & Hours** (students only) -- SubscriptionStatusCard, AutoRenewalSettings, CreditHistory
- **Account Security** -- email display, password change
- **Notifications** (new) -- toggle email notifications for class reminders, credit alerts
- **Referral Program** -- existing ReferralCodeSection
- **Danger Zone** (new) -- sign-out button, account deactivation note

### 2. Add a Notification Preferences section
A new card with switches for:
- Class reminder emails (on/off)
- Low-credit alerts (on/off)

These will save to the user's profile via `updateProfile()` using two new boolean fields (`notify_class_reminders`, `notify_low_credits`) that default to `true`. If the columns don't exist yet, we add them in a migration.

### 3. Add a Danger Zone section
A subtle card at the bottom with:
- A "Sign Out" button (calls `supabase.auth.signOut()`)
- A note: "To delete your account, please contact support."

This is standard in professional settings pages and gives users a clear way to sign out from the settings context.

### 4. Move Appearance Settings into the Settings tab
Remove the placeholder AppearanceSettings card from ProfileDisplay and add a real dark-mode toggle to Settings under an "Appearance" section heading. This uses the existing `document.documentElement.classList.toggle('dark')` pattern with localStorage persistence.

### 5. Update CreditHistory terminology
The CreditHistory component still says "class" / "classes" for ledger amounts (line 162). Update to "hour" / "hours" to match the new duration-based credit system.

---

## Technical Details

### Files to create
| File | Purpose |
|------|---------|
| `src/components/shared/profile/NotificationPreferences.tsx` | New card with notification toggle switches |
| `src/components/shared/profile/DangerZone.tsx` | Sign-out button and account note |
| `src/components/shared/profile/SettingsSection.tsx` | Reusable section wrapper (heading + description + children) |
| `src/components/shared/profile/AppearanceToggle.tsx` | Dark mode toggle card |

### Files to modify
| File | Change |
|------|--------|
| `src/components/shared/profile/SettingsTab.tsx` | Wrap cards in SettingsSection groups; add NotificationPreferences, DangerZone, and AppearanceToggle |
| `src/components/shared/profile/ProfileDisplay.tsx` | Remove AppearanceSettings import and usage |
| `src/components/shared/profile/AppearanceSettings.tsx` | Delete (replaced by AppearanceToggle) |
| `src/components/student/CreditHistory.tsx` | Change "class"/"classes" to "hour"/"hours" on line 162 |

### Database migration (if adding notification columns)
```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notify_class_reminders boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_low_credits boolean DEFAULT true;
```

### SettingsSection component (reusable wrapper)
```text
+--------------------------------------------------+
| Section Title                                     |
| Short description text                            |
+--------------------------------------------------+
|  [Card 1]                                         |
|  [Card 2]                                         |
+--------------------------------------------------+
```

### Final Settings tab layout
```text
Subscription & Hours (students only)
  - SubscriptionStatusCard
  - AutoRenewalSettings
  - CreditHistory

Account Security
  - Email display (read-only)
  - Change password form

Appearance
  - Dark mode toggle

Notifications
  - Class reminder toggle
  - Low-credit alert toggle

Referral Program
  - ReferralCodeSection

Danger Zone
  - Sign Out button
  - Account deletion note
```


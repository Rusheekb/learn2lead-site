ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notify_class_reminders boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_low_credits boolean DEFAULT true;
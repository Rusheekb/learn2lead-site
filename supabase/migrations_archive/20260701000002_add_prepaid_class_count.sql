-- Track how many future classes have been pre-paid via manual (Zelle) advance payments.
-- When StudentPaymentRecorder adds credits beyond existing unpaid classes, it increments
-- this counter. complete_class_atomic decrements it and auto-dates the class log so
-- completed classes don't appear as unpaid in the admin payment summary.
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS prepaid_class_count INTEGER NOT NULL DEFAULT 0;

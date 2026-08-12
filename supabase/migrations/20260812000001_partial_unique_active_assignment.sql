-- tutor_student_assigned.endAssignment soft-deletes (active = false), but the
-- UNIQUE (tutor_id, student_id) constraint wasn't scoped to active rows — so
-- re-creating a previously-ended pairing hits a unique violation and the admin
-- gets a generic "Failed to create assignment" toast with no explanation.
-- Confirmed live: create -> end -> recreate the same pair -> 409.
--
-- Same pattern as the credit-ledger idempotency fixes: a plain UNIQUE
-- constraint can't carry a WHERE clause, so drop it and replace with a
-- partial unique index that only enforces uniqueness among active rows —
-- multiple historical (ended) rows for the same pair can coexist, but only
-- one active assignment per tutor+student pair at a time, same as before.

ALTER TABLE public.tutor_student_assigned
  DROP CONSTRAINT IF EXISTS tutor_student_relationships_tutor_id_student_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tutor_student_assigned_active_pair
  ON public.tutor_student_assigned (tutor_id, student_id)
  WHERE active = true;

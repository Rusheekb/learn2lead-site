-- Family accounts, step 1 of 2: the 'parent' role.
--
-- In its own migration because Postgres can't use a newly added enum value
-- inside the transaction that added it; 20261015000002 depends on it.
-- A parent role grants nothing by itself: every bit of parent access comes
-- from guardian_links (added in the next migration). See
-- docs/family-accounts-plan.md.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'parent';

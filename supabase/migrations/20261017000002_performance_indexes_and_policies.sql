-- Performance housekeeping flagged by the Supabase advisors (no behaviour change).
--
-- 1. An index for every foreign key that lacked one (joins and cascading
--    deletes stop scanning whole tables).
-- 2. Access rules look up the signed-in user once per query instead of once
--    per row: auth.uid() / get_auth_user_role() are wrapped in (SELECT ...),
--    which Postgres evaluates once. Expressions are otherwise unchanged
--    (generated from the live definitions on 2026-10-17).
-- See https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ─── Foreign-key indexes ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_account_audit_log_actor_id ON public.account_audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_class_cancellations_cancelled_by ON public.class_cancellations (cancelled_by);
CREATE INDEX IF NOT EXISTS idx_class_uploads_class_id ON public.class_uploads (class_id);
CREATE INDEX IF NOT EXISTS idx_content_shares_receiver_id ON public.content_shares (receiver_id);
CREATE INDEX IF NOT EXISTS idx_content_shares_sender_id ON public.content_shares (sender_id);
CREATE INDEX IF NOT EXISTS idx_guardian_invites_accepted_by ON public.guardian_invites (accepted_by);
CREATE INDEX IF NOT EXISTS idx_message_reads_profile_id ON public.message_reads (profile_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_tutor_id ON public.message_threads (tutor_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_created_by ON public.referral_codes (created_by);
CREATE INDEX IF NOT EXISTS idx_referral_usage_referral_code_id ON public.referral_usage (referral_code_id);
CREATE INDEX IF NOT EXISTS idx_referral_usage_used_by_user_id ON public.referral_usage (used_by_user_id);
CREATE INDEX IF NOT EXISTS idx_role_change_audit_changed_by ON public.role_change_audit (changed_by);
CREATE INDEX IF NOT EXISTS idx_scheduled_classes_relationship_id ON public.scheduled_classes (relationship_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_classes_student_id ON public.scheduled_classes (student_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_classes_tutor_id ON public.scheduled_classes (tutor_id);
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_plan_id ON public.student_subscriptions (plan_id);
CREATE INDEX IF NOT EXISTS idx_tutor_payroll_runs_tutor_user_id ON public.tutor_payroll_runs (tutor_user_id);
CREATE INDEX IF NOT EXISTS idx_tutor_student_assigned_student_id ON public.tutor_student_assigned (student_id);

-- ─── Access rules: evaluate the caller once per query ───────────────────────
ALTER POLICY "Admins can view the account audit log" ON public."account_audit_log"
  USING (((SELECT get_auth_user_role()) = 'admin'::text));

ALTER POLICY "Admins can insert activity log" ON public."admin_activity_log"
  WITH CHECK (((admin_id = (SELECT auth.uid())) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = 'admin'::app_role))))));

ALTER POLICY "Admins can view activity log" ON public."admin_activity_log"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = 'admin'::app_role)))));

ALTER POLICY "Admins can manage all auto-renewal settings" ON public."auto_renewal_settings"
  USING (((SELECT get_auth_user_role()) = 'admin'::text));

ALTER POLICY "Students can insert their own auto-renewal settings" ON public."auto_renewal_settings"
  WITH CHECK (((student_id = (SELECT auth.uid())) AND (NOT has_guardian((SELECT auth.uid())))));

ALTER POLICY "Students can update their own auto-renewal settings" ON public."auto_renewal_settings"
  USING (((student_id = (SELECT auth.uid())) AND (NOT has_guardian((SELECT auth.uid())))));

ALTER POLICY "Students can view their own auto-renewal settings" ON public."auto_renewal_settings"
  USING (((student_id = (SELECT auth.uid())) AND (NOT has_guardian((SELECT auth.uid())))));

ALTER POLICY "Users can read their own calendar feed token" ON public."calendar_feed_tokens"
  USING (((SELECT auth.uid()) = user_id));

ALTER POLICY "Admins can view class cancellations" ON public."class_cancellations"
  USING (((SELECT get_auth_user_role()) = 'admin'::text));

ALTER POLICY "Admins can manage credit history" ON public."class_credits_ledger"
  USING (((SELECT get_auth_user_role()) = 'admin'::text));

ALTER POLICY "Parents can view their family hours history" ON public."class_credits_ledger"
  USING ((((SELECT get_auth_user_role()) = 'parent'::text) AND (subscription_id IN ( SELECT ss.id
   FROM student_subscriptions ss
  WHERE (ss.student_id = (SELECT auth.uid()))))));

ALTER POLICY "admin_or_own_credits_ledger" ON public."class_credits_ledger"
  USING ((((SELECT auth.role()) = 'authenticated'::text) AND (((SELECT get_auth_user_role()) = 'admin'::text) OR ((student_id = (SELECT auth.uid())) AND (NOT has_guardian((SELECT auth.uid())))))));

ALTER POLICY "Admins can do everything with class_logs" ON public."class_logs"
  USING (((SELECT get_auth_user_role()) = 'admin'::text));

ALTER POLICY "Parents can view their children's class logs" ON public."class_logs"
  USING ((((SELECT get_auth_user_role()) = 'parent'::text) AND (student_user_id IN ( SELECT my_child_ids() AS my_child_ids))));

ALTER POLICY "Students can rate their own class logs" ON public."class_logs"
  USING ((((SELECT get_auth_user_role()) = 'student'::text) AND (("Student Name" = get_auth_user_display_name()) OR ("Student Name" = get_auth_user_email()) OR (student_user_id = (SELECT auth.uid())))))
  WITH CHECK ((((SELECT get_auth_user_role()) = 'student'::text) AND (("Student Name" = get_auth_user_display_name()) OR ("Student Name" = get_auth_user_email()) OR (student_user_id = (SELECT auth.uid())))));

ALTER POLICY "Students can select their own class logs" ON public."class_logs"
  USING ((((SELECT get_auth_user_role()) = 'student'::text) AND (("Student Name" = get_auth_user_display_name()) OR ("Student Name" = get_auth_user_email()) OR (student_user_id = (SELECT auth.uid())))));

ALTER POLICY "Tutors can edit notes on their own class logs" ON public."class_logs"
  USING ((((SELECT get_auth_user_role()) = 'tutor'::text) AND (("Tutor Name" = get_auth_user_display_name()) OR ("Tutor Name" = get_auth_user_email()) OR (tutor_user_id = (SELECT auth.uid())))));

ALTER POLICY "Tutors can select their own class logs" ON public."class_logs"
  USING ((((SELECT get_auth_user_role()) = 'tutor'::text) AND (("Tutor Name" = get_auth_user_display_name()) OR ("Tutor Name" = get_auth_user_email()) OR (tutor_user_id = (SELECT auth.uid())))));

ALTER POLICY "Admins can access all class uploads" ON public."class_uploads"
  USING (((SELECT get_auth_user_role()) = 'admin'::text));

ALTER POLICY "Students can access their class uploads" ON public."class_uploads"
  USING ((((SELECT get_auth_user_role()) = 'student'::text) AND (EXISTS ( SELECT 1
   FROM scheduled_classes sc
  WHERE ((sc.id = class_uploads.class_id) AND (sc.student_id = (SELECT auth.uid())))))));

ALTER POLICY "Tutors can access their class uploads" ON public."class_uploads"
  USING ((((SELECT get_auth_user_role()) = 'tutor'::text) AND (EXISTS ( SELECT 1
   FROM scheduled_classes sc
  WHERE ((sc.id = class_uploads.class_id) AND (sc.tutor_id = (SELECT auth.uid())))))));

ALTER POLICY "Admins can view contact methods" ON public."contact_methods"
  USING (((SELECT get_auth_user_role()) = 'admin'::text));

ALTER POLICY "People can view their own contact methods" ON public."contact_methods"
  USING ((profile_id = (SELECT auth.uid())));

ALTER POLICY "Admins can do everything with content_shares" ON public."content_shares"
  USING (((SELECT get_auth_user_role()) = 'admin'::text));

ALTER POLICY "Students can delete their own content shares" ON public."content_shares"
  USING ((sender_id = (SELECT auth.uid())));

ALTER POLICY "Students can manage their own content shares" ON public."content_shares"
  USING ((sender_id = (SELECT auth.uid())));

ALTER POLICY "Tutors can manage content they share" ON public."content_shares"
  USING ((((SELECT get_auth_user_role()) = 'tutor'::text) AND (sender_id = (SELECT auth.uid()))));

ALTER POLICY "Users can share content" ON public."content_shares"
  WITH CHECK (((SELECT auth.uid()) = sender_id));

ALTER POLICY "Users can update viewed status" ON public."content_shares"
  USING (((SELECT auth.uid()) = receiver_id));

ALTER POLICY "Users can view content shared with them" ON public."content_shares"
  USING ((((SELECT auth.uid()) = receiver_id) OR ((SELECT auth.uid()) = sender_id)));

ALTER POLICY "Admins can manage guardian invites" ON public."guardian_invites"
  USING (((SELECT get_auth_user_role()) = 'admin'::text));

ALTER POLICY "Students can view their own invites" ON public."guardian_invites"
  USING ((student_id = (SELECT auth.uid())));

ALTER POLICY "Admins can manage guardian links" ON public."guardian_links"
  USING (((SELECT get_auth_user_role()) = 'admin'::text));

ALTER POLICY "Guardians can view their own links" ON public."guardian_links"
  USING ((guardian_id = (SELECT auth.uid())));

ALTER POLICY "Students can view links to themselves" ON public."guardian_links"
  USING ((student_id = (SELECT auth.uid())));

ALTER POLICY "People can see their own read markers" ON public."message_reads"
  USING ((profile_id = (SELECT auth.uid())));

ALTER POLICY "Admins can insert monthly reports" ON public."monthly_reports_sent"
  WITH CHECK (((SELECT get_auth_user_role()) = 'admin'::text));

ALTER POLICY "Admins can view all monthly reports" ON public."monthly_reports_sent"
  USING (((SELECT get_auth_user_role()) = 'admin'::text));

ALTER POLICY "Students can view their own monthly reports" ON public."monthly_reports_sent"
  USING ((student_id = (SELECT auth.uid())));

ALTER POLICY "Admins can view notification preferences" ON public."notification_preferences"
  USING (((SELECT get_auth_user_role()) = 'admin'::text));

ALTER POLICY "People manage their own notification preferences" ON public."notification_preferences"
  USING ((profile_id = (SELECT auth.uid())))
  WITH CHECK ((profile_id = (SELECT auth.uid())));

ALTER POLICY "Admins can do everything with notifications" ON public."notifications"
  USING (((SELECT get_auth_user_role()) = 'admin'::text));

ALTER POLICY "Users can update their own notifications" ON public."notifications"
  USING (((SELECT auth.uid()) = user_id));

ALTER POLICY "Users can view their own notifications" ON public."notifications"
  USING (((SELECT auth.uid()) = user_id));

ALTER POLICY "Admins can view all overdraw reminders" ON public."overdraw_reminders_sent"
  USING (((SELECT get_auth_user_role()) = 'admin'::text));

ALTER POLICY "Students can view their own overdraw reminders" ON public."overdraw_reminders_sent"
  USING ((student_id = (SELECT auth.uid())));

ALTER POLICY "Admins can do everything with profiles" ON public."profiles"
  USING (((SELECT get_auth_user_role()) = 'admin'::text));

ALTER POLICY "Parents can view their children's profiles and tutors" ON public."profiles"
  USING ((((SELECT get_auth_user_role()) = 'parent'::text) AND ((id IN ( SELECT my_child_ids() AS my_child_ids)) OR ((role = 'tutor'::app_role) AND (EXISTS ( SELECT 1
   FROM tutor_student_assigned tsa
  WHERE ((tsa.tutor_id = profiles.id) AND (tsa.active = true) AND (tsa.student_id IN ( SELECT my_child_ids() AS my_child_ids)))))))));

ALTER POLICY "Students can view limited tutor profile data" ON public."profiles"
  USING (((((SELECT get_auth_user_role()) = 'student'::text) AND ((SELECT auth.uid()) = id)) OR (((SELECT get_auth_user_role()) = 'student'::text) AND (role = 'tutor'::app_role) AND (EXISTS ( SELECT 1
   FROM tutor_student_assigned tsa
  WHERE ((tsa.student_id = (SELECT auth.uid())) AND (tsa.tutor_id = profiles.id) AND (tsa.active = true)))))));

ALTER POLICY "Students can view their own profile" ON public."profiles"
  USING ((((SELECT get_auth_user_role()) = 'student'::text) AND (id = (SELECT auth.uid()))));

ALTER POLICY "Tutors can view limited student profile data" ON public."profiles"
  USING (((((SELECT get_auth_user_role()) = 'tutor'::text) AND ((SELECT auth.uid()) = id)) OR (((SELECT get_auth_user_role()) = 'tutor'::text) AND (role = 'student'::app_role) AND (EXISTS ( SELECT 1
   FROM tutor_student_assigned tsa
  WHERE ((tsa.tutor_id = (SELECT auth.uid())) AND (tsa.student_id = profiles.id) AND (tsa.active = true)))))));

ALTER POLICY "Users can insert their own profile" ON public."profiles"
  WITH CHECK (((SELECT auth.uid()) = id));

ALTER POLICY "Users can update their own profile" ON public."profiles"
  USING (((SELECT auth.uid()) = id))
  WITH CHECK ((((SELECT auth.uid()) = id) AND ((role)::text = (SELECT get_auth_user_role()))));

ALTER POLICY "Users can view their own profile" ON public."profiles"
  USING (((SELECT auth.uid()) = id));

ALTER POLICY "Admins can manage referral codes" ON public."referral_codes"
  USING (((SELECT get_auth_user_role()) = 'admin'::text));

ALTER POLICY "Users can view their own referral codes" ON public."referral_codes"
  USING ((created_by = (SELECT auth.uid())));

ALTER POLICY "Admins can view all referral usage" ON public."referral_usage"
  USING (((SELECT get_auth_user_role()) = 'admin'::text));

ALTER POLICY "Referrers can view anonymized usage of their codes" ON public."referral_usage"
  USING ((EXISTS ( SELECT 1
   FROM referral_codes rc
  WHERE ((rc.id = referral_usage.referral_code_id) AND (rc.created_by = (SELECT auth.uid()))))));

ALTER POLICY "Users can view their own referral usage" ON public."referral_usage"
  USING ((used_by_user_id = (SELECT auth.uid())));

ALTER POLICY "Admins can view role change audit" ON public."role_change_audit"
  USING (((SELECT get_auth_user_role()) = 'admin'::text));

ALTER POLICY "Admins can do everything with scheduled_classes" ON public."scheduled_classes"
  USING (((SELECT get_auth_user_role()) = 'admin'::text));

ALTER POLICY "Allow tutors to insert classes" ON public."scheduled_classes"
  WITH CHECK ((((SELECT auth.role()) = 'authenticated'::text) AND (tutor_id = (SELECT auth.uid()))));

ALTER POLICY "Parents can view their children's classes" ON public."scheduled_classes"
  USING ((((SELECT get_auth_user_role()) = 'parent'::text) AND (student_id IN ( SELECT my_child_ids() AS my_child_ids))));

ALTER POLICY "Tutors can delete their classes" ON public."scheduled_classes"
  USING ((tutor_id = (SELECT auth.uid())));

ALTER POLICY "Tutors can update their classes" ON public."scheduled_classes"
  USING ((tutor_id = (SELECT auth.uid())));

ALTER POLICY "View access for student_classes view" ON public."scheduled_classes"
  USING (((((SELECT get_auth_user_role()) = 'student'::text) AND (student_id = (SELECT auth.uid()))) OR (((SELECT get_auth_user_role()) = 'tutor'::text) AND (tutor_id = (SELECT auth.uid()))) OR ((SELECT get_auth_user_role()) = 'admin'::text)));

ALTER POLICY "Admins can view webhook events" ON public."stripe_webhook_events"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = 'admin'::app_role)))));

ALTER POLICY "Admins can do everything with student_notes" ON public."student_notes"
  USING (((SELECT get_auth_user_role()) = 'admin'::text));

ALTER POLICY "Tutors can create their student notes" ON public."student_notes"
  WITH CHECK ((((SELECT get_auth_user_role()) = 'tutor'::text) AND (tutor_id = (SELECT auth.uid()))));

ALTER POLICY "Tutors can delete their student notes" ON public."student_notes"
  USING ((((SELECT get_auth_user_role()) = 'tutor'::text) AND (tutor_id = (SELECT auth.uid()))));

ALTER POLICY "Tutors can update their student notes" ON public."student_notes"
  USING ((((SELECT get_auth_user_role()) = 'tutor'::text) AND (tutor_id = (SELECT auth.uid()))));

ALTER POLICY "Tutors can view their student notes" ON public."student_notes"
  USING ((((SELECT get_auth_user_role()) = 'tutor'::text) AND (tutor_id = (SELECT auth.uid()))));

ALTER POLICY "Tutors can view their students' subscription status" ON public."student_subscriptions"
  USING ((((SELECT get_auth_user_role()) = 'tutor'::text) AND (EXISTS ( SELECT 1
   FROM tutor_student_assigned tsa
  WHERE ((tsa.tutor_id = (SELECT auth.uid())) AND (tsa.student_id = student_subscriptions.student_id) AND (tsa.active = true))))));

ALTER POLICY "admin_full_access_subscriptions" ON public."student_subscriptions"
  USING ((((SELECT auth.role()) = 'authenticated'::text) AND (((SELECT get_auth_user_role()) = 'admin'::text) OR ((student_id = (SELECT auth.uid())) AND (NOT has_guardian((SELECT auth.uid())))))));

ALTER POLICY "Admins can do everything with students" ON public."students"
  USING (((SELECT get_auth_user_role()) = 'admin'::text));

ALTER POLICY "Allow tutors to select students" ON public."students"
  USING ((EXISTS ( SELECT 1
   FROM ((tutor_student_assigned tsa
     JOIN profiles tutor_profile ON ((tsa.tutor_id = tutor_profile.id)))
     JOIN profiles student_profile ON ((tsa.student_id = student_profile.id)))
  WHERE ((tutor_profile.id = (SELECT auth.uid())) AND (student_profile.email = students.email) AND (tsa.active = true)))));

ALTER POLICY "Parents can view their children's student records" ON public."students"
  USING ((((SELECT get_auth_user_role()) = 'parent'::text) AND (lower(email) IN ( SELECT lower(p.email) AS lower
   FROM profiles p
  WHERE (p.id IN ( SELECT my_child_ids() AS my_child_ids))))));

ALTER POLICY "Students can view their own student record" ON public."students"
  USING ((((SELECT get_auth_user_role()) = 'student'::text) AND (email = ( SELECT profiles.email
   FROM profiles
  WHERE (profiles.id = (SELECT auth.uid()))))));

ALTER POLICY "Admins can manage subscription plans" ON public."subscription_plans"
  USING (((SELECT get_auth_user_role()) = 'admin'::text));

ALTER POLICY "authenticated_view_subscription_plans" ON public."subscription_plans"
  USING (((SELECT auth.role()) = 'authenticated'::text));

ALTER POLICY "Admins can manage payroll runs" ON public."tutor_payroll_runs"
  USING (((SELECT get_auth_user_role()) = 'admin'::text));

ALTER POLICY "Tutors can view their own payroll runs" ON public."tutor_payroll_runs"
  USING ((((SELECT get_auth_user_role()) = 'tutor'::text) AND (tutor_user_id = (SELECT auth.uid()))));

ALTER POLICY "Admins can do everything with tutor_student_relationships" ON public."tutor_student_assigned"
  USING (((SELECT get_auth_user_role()) = 'admin'::text));

ALTER POLICY "Parents can view their children's tutor assignments" ON public."tutor_student_assigned"
  USING ((((SELECT get_auth_user_role()) = 'parent'::text) AND (student_id IN ( SELECT my_child_ids() AS my_child_ids))));

ALTER POLICY "View access for tutor_students view" ON public."tutor_student_assigned"
  USING (((((SELECT get_auth_user_role()) = 'student'::text) AND (student_id = (SELECT auth.uid()))) OR (((SELECT get_auth_user_role()) = 'tutor'::text) AND (tutor_id = (SELECT auth.uid()))) OR ((SELECT get_auth_user_role()) = 'admin'::text)));

ALTER POLICY "Admins can do everything with tutors" ON public."tutors"
  USING (((SELECT get_auth_user_role()) = 'admin'::text));

ALTER POLICY "Students can only view their assigned tutors" ON public."tutors"
  USING (((((SELECT get_auth_user_role()) = 'student'::text) AND (EXISTS ( SELECT 1
   FROM tutor_student_assigned tsa
  WHERE ((tsa.tutor_id = tutors.id) AND (tsa.student_id = (SELECT auth.uid())) AND (tsa.active = true))))) OR (((SELECT get_auth_user_role()) = 'tutor'::text) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.email = tutors.email))))) OR ((SELECT get_auth_user_role()) = 'admin'::text)));

-- Private class files (found in a storage review, 2026-10-17).
--
-- The `materials` bucket holds students' class uploads and tutors' class
-- materials. It was public, and its read rule was "anyone", so a signed-out
-- visitor could list and download every file. `shared_content` and
-- `avatars` accepted uploads from signed-out visitors.
--
-- Now:
--   - materials and shared_content are private; the app opens files with
--     short-lived signed links;
--   - a class file can be read by the class's student, tutor, the
--     student's parent(s), whoever uploaded it, and admins;
--   - uploads go to your own folder or to a class you teach or attend;
--   - avatars stay public to view, but you can only upload your own.
--
-- Paths in use (all keep working):
--   materials/<uploader id>/<file>                class uploads (secure-file-upload)
--   materials/class_uploads/<class id>/<file>     class uploads (direct)
--   materials/<class id>/<file>                   tutor materials
--   shared_content/<sender id>/<file>
--   avatars/<user id>-<timestamp>.<ext>

-- The class a file belongs to, from its path (NULL if none).
CREATE OR REPLACE FUNCTION public.class_id_from_file_path(p_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN parts[1] = 'class_uploads' AND parts[2] ~* '^[0-9a-f-]{36}$' THEN parts[2]::uuid
    WHEN array_length(parts, 1) > 1 AND parts[1] ~* '^[0-9a-f-]{36}$' THEN parts[1]::uuid
  END
  FROM (SELECT string_to_array(p_name, '/') AS parts) p;
$function$;

-- Whether the caller is the class's student, tutor or the student's parent.
CREATE OR REPLACE FUNCTION public.is_class_participant(p_class_id uuid, p_include_parent boolean DEFAULT true)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.scheduled_classes sc
    WHERE sc.id = p_class_id
      AND (sc.student_id = auth.uid() OR sc.tutor_id = auth.uid()
           OR (p_include_parent AND public.is_guardian_of(sc.student_id)))
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_read_class_file(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL AND (
    get_auth_user_role() = 'admin'
    OR split_part(p_name, '/', 1) = auth.uid()::text
    OR public.is_class_participant(public.class_id_from_file_path(p_name))
    OR EXISTS (
      SELECT 1 FROM public.class_uploads cu
      WHERE cu.file_path = p_name AND public.is_class_participant(cu.class_id)
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_write_class_file(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL AND (
    get_auth_user_role() = 'admin'
    OR split_part(p_name, '/', 1) = auth.uid()::text
    OR public.is_class_participant(public.class_id_from_file_path(p_name), false)
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_read_shared_file(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL AND (
    get_auth_user_role() = 'admin'
    OR split_part(p_name, '/', 1) = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.content_shares cs
      WHERE cs.file_path = p_name AND auth.uid() IN (cs.sender_id, cs.receiver_id)
    )
  );
$function$;

REVOKE ALL ON FUNCTION public.class_id_from_file_path(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_class_participant(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_read_class_file(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_write_class_file(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_read_shared_file(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.class_id_from_file_path(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_class_participant(uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_read_class_file(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_write_class_file(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_read_shared_file(text) TO authenticated, service_role;

-- ─── Buckets ────────────────────────────────────────────────────────────────
UPDATE storage.buckets SET public = false WHERE id IN ('materials', 'shared_content');

-- ─── materials ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow anyone to download materials" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload materials" ON storage.objects;

CREATE POLICY "Class files: participants can read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'materials' AND public.can_read_class_file(name));
CREATE POLICY "Class files: own folder or own classes" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'materials' AND public.can_write_class_file(name));
CREATE POLICY "Class files: uploader, class tutor or admin can delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'materials'
         AND (owner_id = (SELECT auth.uid())::text OR public.can_write_class_file(name)));

-- ─── shared_content ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can access shared content" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can share content" ON storage.objects;

CREATE POLICY "Shared files: sender, receiver or admin can read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'shared_content' AND public.can_read_shared_file(name));
CREATE POLICY "Shared files: upload to your own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'shared_content' AND split_part(name, '/', 1) = (SELECT auth.uid())::text);

-- ─── avatars (still public to view) ─────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can upload an avatar" ON storage.objects;
CREATE POLICY "Avatars: upload your own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND name LIKE (SELECT auth.uid())::text || '-%');

-- ─── class-materials (unused by the app; any signed-in user could upload) ────
DROP POLICY IF EXISTS "Students can upload to their classes" ON storage.objects;

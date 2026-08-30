-- ReEntry consolidated migration
-- Run this ONCE after schema.sql, 00001_auth_role_profiles.sql, and
-- 00002_fast_build_persistent_foundation.sql have already been executed.
--
-- Replaces/supersedes old migrations 00003 through 00007.

BEGIN;

-- ============================================================
-- 1) USER PREFERENCES: allow authenticated users to create own row
-- ============================================================

DROP POLICY IF EXISTS "Users can insert own preferences"
ON public.user_preferences;

CREATE POLICY "Users can insert own preferences"
ON public.user_preferences
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());


-- ============================================================
-- 2) SCHOOL STAFF: linked-student read access
-- ============================================================

DROP POLICY IF EXISTS "School staff can select linked logs"
ON public.activity_logs;

CREATE POLICY "School staff can select linked logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (public.is_active_viewer(student_id, 'school_staff'::text));


DROP POLICY IF EXISTS "School staff can select linked challenge tags"
ON public.challenge_tags;

CREATE POLICY "School staff can select linked challenge tags"
ON public.challenge_tags
FOR SELECT
TO authenticated
USING (
  public.is_activity_log_visible_to_role(
    activity_log_id,
    'school_staff'::text
  )
);


DROP POLICY IF EXISTS "School staff can select linked checkins"
ON public.daily_checkins;

CREATE POLICY "School staff can select linked checkins"
ON public.daily_checkins
FOR SELECT
TO authenticated
USING (public.is_active_viewer(student_id, 'school_staff'::text));


-- ============================================================
-- 3) PROFILE FIELDS
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS return_to_learn_status text;

UPDATE public.profiles
SET display_name = split_part(email, '@', 1)
WHERE display_name IS NULL
  AND email IS NOT NULL;


-- ============================================================
-- 4) NEW USER TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    role,
    display_name
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      'student'::public.user_role
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_preferences (
    user_id,
    appearance,
    low_stimulation_enabled
  )
  VALUES (
    NEW.id,
    'light',
    false
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;


-- ============================================================
-- 5) SAFE STUDENT PROFILE VIEW
-- ============================================================

CREATE OR REPLACE VIEW public.student_profiles
WITH (security_invoker = off)
AS
SELECT
  p.id,
  p.display_name,
  p.return_to_learn_status
FROM public.profiles AS p
WHERE p.role = 'student'::public.user_role
  AND (
    EXISTS (
      SELECT 1
      FROM public.student_access AS sa
      WHERE sa.student_id = p.id
        AND sa.viewer_user_id = auth.uid()
        AND sa.viewer_role = 'school_staff'
        AND sa.status = 'active'
    )
    OR EXISTS (
      SELECT 1
      FROM public.student_access AS sa
      WHERE sa.student_id = p.id
        AND sa.viewer_user_id = auth.uid()
        AND sa.viewer_role = 'clinician'
        AND sa.status = 'active'
    )
    OR public.get_user_role(auth.uid()) = 'admin'::public.user_role
  );

GRANT SELECT ON public.student_profiles TO authenticated;


-- ============================================================
-- 6) CONNECT STUDENT BY ACCESS CODE
--
-- IMPORTANT:
-- Migration 00005 created a one-argument function.
-- Migrations 00006/00007 created a two-argument function whose second
-- argument has a default. Keeping both makes one-argument RPC calls
-- ambiguous. Drop BOTH signatures first, then create ONE canonical RPC.
-- ============================================================

DROP FUNCTION IF EXISTS public.connect_student_by_code(text);
DROP FUNCTION IF EXISTS public.connect_student_by_code(text, text);

CREATE FUNCTION public.connect_student_by_code(
  access_code text,
  requested_role text DEFAULT 'school_staff'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_student_id uuid;
  existing_link uuid;
  caller_role public.user_role;
BEGIN
  -- Only staff/clinician roles may use this RPC.
  IF requested_role NOT IN ('school_staff', 'clinician') THEN
    RAISE EXCEPTION 'Unsupported connection role';
  END IF;

  SELECT public.get_user_role(auth.uid())
  INTO caller_role;

  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Authenticated profile not found';
  END IF;

  IF caller_role IS DISTINCT FROM requested_role::public.user_role THEN
    RAISE EXCEPTION 'Unauthorized role for this connection';
  END IF;

  -- Lock the unclaimed access-code row so two viewers cannot claim
  -- the same code concurrently.
  SELECT sa.student_id
  INTO target_student_id
  FROM public.student_access AS sa
  WHERE sa.access_code = connect_student_by_code.access_code
    AND sa.status = 'active'
    AND sa.viewer_user_id IS NULL
  ORDER BY sa.created_at, sa.id
  LIMIT 1
  FOR UPDATE;

  IF target_student_id IS NULL THEN
    RAISE EXCEPTION 'Invalid, already claimed, or revoked access code';
  END IF;

  SELECT sa.id
  INTO existing_link
  FROM public.student_access AS sa
  WHERE sa.student_id = target_student_id
    AND sa.viewer_user_id = auth.uid()
    AND sa.viewer_role = connect_student_by_code.requested_role
    AND sa.status = 'active'
  LIMIT 1;

  IF existing_link IS NOT NULL THEN
    RAISE EXCEPTION 'You are already linked to this student';
  END IF;

  UPDATE public.student_access AS sa
  SET
    viewer_user_id = auth.uid(),
    viewer_role = connect_student_by_code.requested_role,
    status = 'active'
  WHERE sa.student_id = target_student_id
    AND sa.access_code = connect_student_by_code.access_code
    AND sa.status = 'active'
    AND sa.viewer_user_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Access code could not be claimed';
  END IF;

  RETURN target_student_id;
END;
$$;

REVOKE ALL
ON FUNCTION public.connect_student_by_code(text, text)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.connect_student_by_code(text, text)
TO authenticated;


-- ============================================================
-- 7) VIEWER ACCESS ROW VISIBILITY
-- Useful after a code has been claimed.
-- ============================================================

DROP POLICY IF EXISTS "Viewers can view their own access rows"
ON public.student_access;

CREATE POLICY "Viewers can view their own access rows"
ON public.student_access
FOR SELECT
TO authenticated
USING (viewer_user_id = auth.uid());


COMMIT;

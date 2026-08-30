BEGIN;

-- 1. Add display_name to profiles so viewers can see a safe name without exposing email.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS return_to_learn_status TEXT;

-- 2. Backfill display_name from the email prefix for existing users.
UPDATE public.profiles SET display_name = COALESCE(display_name, split_part(email, '@', 1)) WHERE display_name IS NULL;

-- 3. Update the new-user trigger to set display_name automatically.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student'::public.user_role),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  INSERT INTO public.user_preferences (user_id, appearance, low_stimulation_enabled)
  VALUES (NEW.id, 'light', false);
  RETURN NEW;
END;
$$;

-- 4. Create a restricted view that exposes only what viewers need.
-- security_invoker = off means the view runs as its owner (postgres) and is not gated by the
-- caller's RLS on the underlying profiles table. The WHERE filter enforces the active-viewer rule.
CREATE OR REPLACE VIEW public.student_profiles
WITH (security_invoker = off) AS
SELECT
  p.id,
  p.display_name,
  p.return_to_learn_status
FROM public.profiles p
WHERE p.role = 'student'
  AND (
    EXISTS (
      SELECT 1 FROM public.student_access sa
      WHERE sa.student_id = p.id
        AND sa.viewer_user_id = auth.uid()
        AND sa.viewer_role = 'school_staff'
        AND sa.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.student_access sa
      WHERE sa.student_id = p.id
        AND sa.viewer_user_id = auth.uid()
        AND sa.viewer_role = 'clinician'
        AND sa.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles admin_p
      WHERE admin_p.id = auth.uid() AND admin_p.role = 'admin'
    )
  );

GRANT SELECT ON public.student_profiles TO authenticated;

-- 5. Helper to connect a school staff viewer to a student via access code.
CREATE OR REPLACE FUNCTION public.connect_student_by_code(access_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_student_id UUID;
  existing_link UUID;
BEGIN
  -- Find the active code row that has not been claimed yet.
  SELECT sa.student_id INTO target_student_id
  FROM public.student_access sa
  WHERE sa.access_code = connect_student_by_code.access_code
    AND sa.status = 'active'
    AND sa.viewer_user_id IS NULL
  LIMIT 1;

  IF target_student_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or revoked access code';
  END IF;

  -- Prevent duplicate active school_staff links for the same student and viewer.
  SELECT id INTO existing_link
  FROM public.student_access
  WHERE student_id = target_student_id
    AND viewer_user_id = auth.uid()
    AND viewer_role = 'school_staff'
    AND status = 'active'
  LIMIT 1;

  IF existing_link IS NOT NULL THEN
    RAISE EXCEPTION 'You are already linked to this student';
  END IF;

  -- Claim the pending row.
  UPDATE public.student_access
  SET viewer_user_id = auth.uid(),
      viewer_role = 'school_staff',
      status = 'active'
  WHERE student_id = target_student_id
    AND access_code = connect_student_by_code.access_code
    AND status = 'active'
    AND viewer_user_id IS NULL;

  RETURN target_student_id;
END;
$$;

COMMIT;
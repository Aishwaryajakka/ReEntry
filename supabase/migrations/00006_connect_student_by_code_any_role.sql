BEGIN;

CREATE OR REPLACE FUNCTION public.connect_student_by_code(access_code TEXT, requested_role TEXT DEFAULT 'school_staff')
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_student_id UUID;
  existing_link UUID;
  caller_role public.user_role;
BEGIN
  -- Verify the caller's role matches the requested linkage role.
  SELECT get_user_role(auth.uid()) INTO caller_role;
  IF caller_role IS DISTINCT FROM requested_role::public.user_role THEN
    RAISE EXCEPTION 'Unauthorized role for this connection';
  END IF;

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

  -- Prevent duplicate active links for the same student and viewer.
  SELECT id INTO existing_link
  FROM public.student_access
  WHERE student_id = target_student_id
    AND viewer_user_id = auth.uid()
    AND viewer_role = connect_student_by_code.requested_role
    AND status = 'active'
  LIMIT 1;

  IF existing_link IS NOT NULL THEN
    RAISE EXCEPTION 'You are already linked to this student';
  END IF;

  -- Claim the pending row.
  UPDATE public.student_access
  SET viewer_user_id = auth.uid(),
      viewer_role = connect_student_by_code.requested_role,
      status = 'active'
  WHERE student_id = target_student_id
    AND access_code = connect_student_by_code.access_code
    AND status = 'active'
    AND viewer_user_id IS NULL;

  RETURN target_student_id;
END;
$$;

COMMIT;
-- Allow active school_staff viewers to read linked student activity logs
CREATE POLICY "School staff can select linked logs"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (public.is_active_viewer(student_id, 'school_staff'::text));

-- Allow active school_staff viewers to read linked challenge tags
CREATE POLICY "School staff can select linked challenge tags"
  ON public.challenge_tags
  FOR SELECT
  TO authenticated
  USING (public.is_activity_log_visible_to_role(activity_log_id, 'school_staff'::text));

-- Allow active school_staff viewers to read linked daily check-ins
CREATE POLICY "School staff can select linked checkins"
  ON public.daily_checkins
  FOR SELECT
  TO authenticated
  USING (public.is_active_viewer(student_id, 'school_staff'::text));
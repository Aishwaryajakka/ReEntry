-- Persistent backend foundation for ReEntry

-- 1. User preferences
CREATE TABLE public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appearance text NOT NULL DEFAULT 'light' CHECK (appearance IN ('light', 'dark')),
  low_stimulation_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- 2. Activity logs
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_category text NOT NULL,
  activity_name text NOT NULL,
  duration_minutes integer NOT NULL,
  manageability integer NOT NULL,
  note text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 3. Challenge tags (linked to activity logs)
CREATE TABLE public.challenge_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_log_id uuid NOT NULL REFERENCES public.activity_logs(id) ON DELETE CASCADE,
  tag text NOT NULL
);

ALTER TABLE public.challenge_tags ENABLE ROW LEVEL SECURITY;

-- 4. Daily check-ins
CREATE TABLE public.daily_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date date NOT NULL,
  overall_manageability integer NOT NULL,
  attendance_context text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

-- 5. Accommodation records
CREATE TABLE public.accommodation_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  source_type text NOT NULL,
  source_name text,
  issued_date date,
  valid_until date,
  status text NOT NULL DEFAULT 'active',
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accommodation_records ENABLE ROW LEVEL SECURITY;

-- 6. Student access (linking students to staff/clinicians)
CREATE TABLE public.student_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  viewer_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  viewer_role text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  access_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_access ENABLE ROW LEVEL SECURITY;

-- 7. Helper functions for RLS
CREATE OR REPLACE FUNCTION public.get_user_role(uid uuid)
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = uid;
$$;

CREATE OR REPLACE FUNCTION public.is_active_viewer(student_id uuid, viewer_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_access
    WHERE student_id = $1
      AND viewer_user_id = auth.uid()
      AND viewer_role = $2
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_owner_of_activity_log(uid uuid, log_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.activity_logs
    WHERE id = log_id AND student_id = uid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_activity_log_visible_to_role(log_id uuid, viewer_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.activity_logs al
    WHERE al.id = log_id
      AND public.is_active_viewer(al.student_id, viewer_role)
  );
$$;

-- 8. Update new-user trigger to also seed user_preferences
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student'::public.user_role)
  );
  INSERT INTO public.user_preferences (user_id, appearance, low_stimulation_enabled)
  VALUES (NEW.id, 'light', false);
  RETURN NEW;
END;
$$;

DROP TRIGGER on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 9. RLS policies

-- user_preferences
CREATE POLICY "Users can select own preferences" ON public.user_preferences
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage all preferences" ON public.user_preferences
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::public.user_role) WITH CHECK (get_user_role(auth.uid()) = 'admin'::public.user_role);
CREATE POLICY "Anon cannot access preferences" ON public.user_preferences
  FOR ALL TO anon USING (false) WITH CHECK (false);

-- activity_logs
CREATE POLICY "Students can select own logs" ON public.activity_logs
  FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Students can insert own logs" ON public.activity_logs
  FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can update own logs" ON public.activity_logs
  FOR UPDATE TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can delete own logs" ON public.activity_logs
  FOR DELETE TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Clinicians can select linked student logs" ON public.activity_logs
  FOR SELECT TO authenticated USING (is_active_viewer(student_id, 'clinician'));
CREATE POLICY "School staff cannot select logs" ON public.activity_logs
  FOR SELECT TO authenticated USING (false);
CREATE POLICY "Admins can manage all logs" ON public.activity_logs
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::public.user_role) WITH CHECK (get_user_role(auth.uid()) = 'admin'::public.user_role);
CREATE POLICY "Anon cannot access logs" ON public.activity_logs
  FOR ALL TO anon USING (false) WITH CHECK (false);

-- challenge_tags
CREATE POLICY "Students can select own tags" ON public.challenge_tags
  FOR SELECT TO authenticated USING (is_owner_of_activity_log(auth.uid(), activity_log_id));
CREATE POLICY "Students can insert own tags" ON public.challenge_tags
  FOR INSERT TO authenticated WITH CHECK (is_owner_of_activity_log(auth.uid(), activity_log_id));
CREATE POLICY "Students can update own tags" ON public.challenge_tags
  FOR UPDATE TO authenticated USING (is_owner_of_activity_log(auth.uid(), activity_log_id)) WITH CHECK (is_owner_of_activity_log(auth.uid(), activity_log_id));
CREATE POLICY "Students can delete own tags" ON public.challenge_tags
  FOR DELETE TO authenticated USING (is_owner_of_activity_log(auth.uid(), activity_log_id));
CREATE POLICY "Clinicians can select linked tags" ON public.challenge_tags
  FOR SELECT TO authenticated USING (is_activity_log_visible_to_role(activity_log_id, 'clinician'));
CREATE POLICY "School staff cannot select tags" ON public.challenge_tags
  FOR SELECT TO authenticated USING (false);
CREATE POLICY "Admins can manage all tags" ON public.challenge_tags
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::public.user_role) WITH CHECK (get_user_role(auth.uid()) = 'admin'::public.user_role);
CREATE POLICY "Anon cannot access tags" ON public.challenge_tags
  FOR ALL TO anon USING (false) WITH CHECK (false);

-- daily_checkins
CREATE POLICY "Students can select own checkins" ON public.daily_checkins
  FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Students can insert own checkins" ON public.daily_checkins
  FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can update own checkins" ON public.daily_checkins
  FOR UPDATE TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can delete own checkins" ON public.daily_checkins
  FOR DELETE TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Clinicians can select linked checkins" ON public.daily_checkins
  FOR SELECT TO authenticated USING (is_active_viewer(student_id, 'clinician'));
CREATE POLICY "School staff cannot select checkins" ON public.daily_checkins
  FOR SELECT TO authenticated USING (false);
CREATE POLICY "Admins can manage all checkins" ON public.daily_checkins
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::public.user_role) WITH CHECK (get_user_role(auth.uid()) = 'admin'::public.user_role);
CREATE POLICY "Anon cannot access checkins" ON public.daily_checkins
  FOR ALL TO anon USING (false) WITH CHECK (false);

-- accommodation_records
CREATE POLICY "Students can select own accommodations" ON public.accommodation_records
  FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Clinicians can select linked accommodations" ON public.accommodation_records
  FOR SELECT TO authenticated USING (is_active_viewer(student_id, 'clinician'));
CREATE POLICY "Clinicians can insert accommodations for linked students" ON public.accommodation_records
  FOR INSERT TO authenticated WITH CHECK (is_active_viewer(student_id, 'clinician') AND created_by = auth.uid());
CREATE POLICY "Clinicians can update accommodations for linked students" ON public.accommodation_records
  FOR UPDATE TO authenticated USING (is_active_viewer(student_id, 'clinician')) WITH CHECK (is_active_viewer(student_id, 'clinician'));
CREATE POLICY "School staff can select linked active accommodations" ON public.accommodation_records
  FOR SELECT TO authenticated USING (is_active_viewer(student_id, 'school_staff') AND status = 'active' AND (valid_until IS NULL OR valid_until >= CURRENT_DATE));
CREATE POLICY "Admins can manage all accommodations" ON public.accommodation_records
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::public.user_role) WITH CHECK (get_user_role(auth.uid()) = 'admin'::public.user_role);
CREATE POLICY "Anon cannot access accommodations" ON public.accommodation_records
  FOR ALL TO anon USING (false) WITH CHECK (false);

-- school_staff view for minimum-necessary accommodation disclosure
CREATE OR REPLACE VIEW public.school_staff_accommodations AS
SELECT
  id,
  student_id,
  title,
  source_type,
  valid_until
FROM public.accommodation_records
WHERE status = 'active'
  AND (valid_until IS NULL OR valid_until >= CURRENT_DATE);

ALTER VIEW public.school_staff_accommodations SET (security_invoker = on);

-- student_access
CREATE POLICY "Students can manage own access rows" ON public.student_access
  FOR ALL TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "Viewers can view their own access rows" ON public.student_access
  FOR SELECT TO authenticated USING (viewer_user_id = auth.uid());
CREATE POLICY "Admins can manage all access rows" ON public.student_access
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::public.user_role) WITH CHECK (get_user_role(auth.uid()) = 'admin'::public.user_role);
CREATE POLICY "Anon cannot access student_access" ON public.student_access
  FOR ALL TO anon USING (false) WITH CHECK (false);

-- 10. Auto-update updated_at on user_preferences and accommodation_records
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER accommodation_records_updated_at
  BEFORE UPDATE ON public.accommodation_records
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

BEGIN;

CREATE TABLE public.school_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  context text NOT NULL CHECK (
    context = btrim(context)
    AND length(context) BETWEEN 1 AND 120
  ),
  observation_type text NOT NULL CHECK (observation_type IN (
    'completed_as_planned',
    'completed_with_support',
    'took_break',
    'reduced_or_stopped'
  )),
  support_used text[] NOT NULL DEFAULT '{}'::text[] CHECK (
    support_used <@ ARRAY[
      'quiet_environment',
      'extra_time',
      'reduced_screen_exposure',
      'printed_materials',
      'short_break',
      'reduced_workload',
      'alternate_workspace'
    ]::text[]
  ),
  note text CHECK (
    note IS NULL
    OR (note = btrim(note) AND length(note) BETWEEN 1 AND 500)
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX school_observations_student_occurred_at_idx
  ON public.school_observations(student_id, occurred_at DESC);

ALTER TABLE public.school_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can select own school observations"
ON public.school_observations
FOR SELECT TO authenticated
USING (
  student_id = auth.uid()
  AND public.get_user_role(auth.uid()) = 'student'::public.user_role
);

CREATE POLICY "School staff can select linked school observations"
ON public.school_observations
FOR SELECT TO authenticated
USING (
  public.get_user_role(auth.uid()) = 'school_staff'::public.user_role
  AND public.is_active_viewer(student_id, 'school_staff'::text)
);

CREATE POLICY "School staff can insert linked school observations"
ON public.school_observations
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND public.get_user_role(auth.uid()) = 'school_staff'::public.user_role
  AND public.is_active_viewer(student_id, 'school_staff'::text)
);

CREATE POLICY "School staff can update authored school observations"
ON public.school_observations
FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  AND public.get_user_role(auth.uid()) = 'school_staff'::public.user_role
  AND public.is_active_viewer(student_id, 'school_staff'::text)
)
WITH CHECK (
  created_by = auth.uid()
  AND public.get_user_role(auth.uid()) = 'school_staff'::public.user_role
  AND public.is_active_viewer(student_id, 'school_staff'::text)
);

CREATE POLICY "School staff can delete authored school observations"
ON public.school_observations
FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  AND public.get_user_role(auth.uid()) = 'school_staff'::public.user_role
  AND public.is_active_viewer(student_id, 'school_staff'::text)
);

CREATE POLICY "Clinicians can select linked school observations"
ON public.school_observations
FOR SELECT TO authenticated
USING (
  public.get_user_role(auth.uid()) = 'clinician'::public.user_role
  AND public.is_active_viewer(student_id, 'clinician'::text)
);

CREATE POLICY "Anon cannot access school observations"
ON public.school_observations
FOR ALL TO anon
USING (false)
WITH CHECK (false);

CREATE TRIGGER school_observations_updated_at
  BEFORE UPDATE ON public.school_observations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_observations TO authenticated;

COMMIT;

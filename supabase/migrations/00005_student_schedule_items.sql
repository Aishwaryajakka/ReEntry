BEGIN;

CREATE TABLE public.student_schedule_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_name text NOT NULL CHECK (length(btrim(activity_name)) BETWEEN 1 AND 100),
  activity_category text NOT NULL CHECK (activity_category IN (
    'Reading', 'Screens', 'Class', 'Homework', 'Noise/busy environment',
    'Physical activity', 'Social activity', 'Transportation', 'Other'
  )),
  days_of_week smallint[] NOT NULL CHECK (
    cardinality(days_of_week) > 0
    AND days_of_week <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::smallint[]
  ),
  start_time time NOT NULL,
  end_time time NOT NULL,
  reminders_enabled boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX student_schedule_items_student_id_idx
  ON public.student_schedule_items(student_id);

ALTER TABLE public.student_schedule_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage own schedule"
ON public.student_schedule_items
FOR ALL
TO authenticated
USING (
  student_id = auth.uid()
  AND public.get_user_role(auth.uid()) = 'student'::public.user_role
)
WITH CHECK (
  student_id = auth.uid()
  AND public.get_user_role(auth.uid()) = 'student'::public.user_role
);

CREATE POLICY "Anon cannot access student schedules"
ON public.student_schedule_items
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

CREATE TRIGGER student_schedule_items_updated_at
  BEFORE UPDATE ON public.student_schedule_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_schedule_items TO authenticated;

COMMIT;

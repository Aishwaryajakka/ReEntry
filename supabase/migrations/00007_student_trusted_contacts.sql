BEGIN;

CREATE TABLE public.student_trusted_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (name = btrim(name) AND length(name) BETWEEN 1 AND 100),
  relationship text NOT NULL CHECK (relationship = btrim(relationship) AND length(relationship) BETWEEN 1 AND 60),
  phone_number text NOT NULL CHECK (phone_number = btrim(phone_number) AND length(phone_number) BETWEEN 3 AND 32),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_trusted_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can select own trusted contact"
ON public.student_trusted_contacts FOR SELECT TO authenticated
USING (
  student_id = auth.uid()
  AND public.get_user_role(auth.uid()) = 'student'::public.user_role
);

CREATE POLICY "Students can insert own trusted contact"
ON public.student_trusted_contacts FOR INSERT TO authenticated
WITH CHECK (
  student_id = auth.uid()
  AND public.get_user_role(auth.uid()) = 'student'::public.user_role
);

CREATE POLICY "Students can update own trusted contact"
ON public.student_trusted_contacts FOR UPDATE TO authenticated
USING (
  student_id = auth.uid()
  AND public.get_user_role(auth.uid()) = 'student'::public.user_role
)
WITH CHECK (
  student_id = auth.uid()
  AND public.get_user_role(auth.uid()) = 'student'::public.user_role
);

CREATE POLICY "Students can delete own trusted contact"
ON public.student_trusted_contacts FOR DELETE TO authenticated
USING (
  student_id = auth.uid()
  AND public.get_user_role(auth.uid()) = 'student'::public.user_role
);

CREATE POLICY "Anon cannot access trusted contacts"
ON public.student_trusted_contacts FOR ALL TO anon
USING (false)
WITH CHECK (false);

CREATE TRIGGER student_trusted_contacts_updated_at
  BEFORE UPDATE ON public.student_trusted_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_trusted_contacts TO authenticated;

COMMIT;

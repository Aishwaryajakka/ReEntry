BEGIN;

CREATE TABLE public.shared_support_contacts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('school_staff', 'clinician')),
  display_name text NOT NULL CHECK (display_name = btrim(display_name) AND length(display_name) BETWEEN 1 AND 100),
  support_phone text CHECK (support_phone IS NULL OR (support_phone = btrim(support_phone) AND length(support_phone) BETWEEN 3 AND 32)),
  support_email text CHECK (support_email IS NULL OR (support_email = btrim(support_email) AND length(support_email) BETWEEN 3 AND 254)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (support_phone IS NOT NULL OR support_email IS NOT NULL)
);

ALTER TABLE public.shared_support_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Support users can select own shared contact"
ON public.shared_support_contacts FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  AND role = public.get_user_role(auth.uid())::text
  AND role IN ('school_staff', 'clinician')
);

CREATE POLICY "Support users can insert own shared contact"
ON public.shared_support_contacts FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = public.get_user_role(auth.uid())::text
  AND role IN ('school_staff', 'clinician')
);

CREATE POLICY "Support users can update own shared contact"
ON public.shared_support_contacts FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND role = public.get_user_role(auth.uid())::text
  AND role IN ('school_staff', 'clinician')
)
WITH CHECK (
  user_id = auth.uid()
  AND role = public.get_user_role(auth.uid())::text
  AND role IN ('school_staff', 'clinician')
);

CREATE POLICY "Support users can delete own shared contact"
ON public.shared_support_contacts FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  AND role = public.get_user_role(auth.uid())::text
  AND role IN ('school_staff', 'clinician')
);

CREATE POLICY "Linked students can select shared support contacts"
ON public.shared_support_contacts FOR SELECT TO authenticated
USING (
  public.get_user_role(auth.uid()) = 'student'::public.user_role
  AND role = public.get_user_role(user_id)::text
  AND EXISTS (
    SELECT 1
    FROM public.student_access AS access
    WHERE access.student_id = auth.uid()
      AND access.viewer_user_id = shared_support_contacts.user_id
      AND access.viewer_role = shared_support_contacts.role
      AND access.status = 'active'
  )
);

CREATE POLICY "Anon cannot access shared support contacts"
ON public.shared_support_contacts FOR ALL TO anon
USING (false)
WITH CHECK (false);

CREATE TRIGGER shared_support_contacts_updated_at
  BEFORE UPDATE ON public.shared_support_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_support_contacts TO authenticated;

COMMIT;

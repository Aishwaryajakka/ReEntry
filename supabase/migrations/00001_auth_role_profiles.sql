CREATE TYPE public.user_role AS ENUM ('student', 'school_staff', 'clinician', 'admin');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  role public.user_role NOT NULL DEFAULT 'student'::public.user_role,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student'::public.user_role)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.get_user_role(uid uuid)
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = uid;
$$;

CREATE POLICY "anon cannot select profiles" ON public.profiles
  FOR SELECT TO anon USING (false);

CREATE POLICY "anon cannot insert profiles" ON public.profiles
  FOR INSERT TO anon WITH CHECK (false);

CREATE POLICY "anon cannot update profiles" ON public.profiles
  FOR UPDATE TO anon USING (false) WITH CHECK (false);

CREATE POLICY "anon cannot delete profiles" ON public.profiles
  FOR DELETE TO anon USING (false);

CREATE POLICY "users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "users cannot insert profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "users can update own profile except role" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role IS NOT DISTINCT FROM public.get_user_role(auth.uid()));

CREATE POLICY "users cannot delete profiles" ON public.profiles
  FOR DELETE TO authenticated USING (false);

CREATE POLICY "admins have full access to profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin'::public.user_role)
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin'::public.user_role);

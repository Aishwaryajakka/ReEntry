-- ============================================================
-- SECTION: SCHEMA
-- ============================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS "public";


--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";


--
-- Name: EXTENSION "pgcrypto"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "pgcrypto" IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";


--
-- Name: EXTENSION "supabase_vault"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "supabase_vault" IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'user_role'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE TYPE "public"."user_role" AS ENUM (
    'student',
    'school_staff',
    'clinician',
    'admin'
);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: connect_student_by_code("text", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."connect_student_by_code"("access_code" "text", "requested_role" "text" DEFAULT 'school_staff'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
  FROM public.student_access AS sa
  WHERE sa.access_code = connect_student_by_code.access_code
    AND sa.status = 'active'
    AND sa.viewer_user_id IS NULL
  LIMIT 1;

  IF target_student_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or revoked access code';
  END IF;

  -- Prevent duplicate active links for the same student and viewer.
  SELECT sa.id INTO existing_link
  FROM public.student_access AS sa
  WHERE sa.student_id = target_student_id
    AND sa.viewer_user_id = auth.uid()
    AND sa.viewer_role = connect_student_by_code.requested_role
    AND sa.status = 'active'
  LIMIT 1;

  IF existing_link IS NOT NULL THEN
    RAISE EXCEPTION 'You are already linked to this student';
  END IF;

  -- Claim the pending row.
  UPDATE public.student_access AS sa
  SET viewer_user_id = auth.uid(),
      viewer_role = connect_student_by_code.requested_role,
      status = 'active'
  WHERE sa.student_id = target_student_id
    AND sa.access_code = connect_student_by_code.access_code
    AND sa.status = 'active'
    AND sa.viewer_user_id IS NULL;

  RETURN target_student_id;
END;
$$;


--
-- Name: get_user_role("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."get_user_role"("uid" "uuid") RETURNS "public"."user_role"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT role FROM public.profiles WHERE id = uid;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


--
-- Name: is_active_viewer("uuid", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."is_active_viewer"("student_id" "uuid", "viewer_role" "text") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
  SELECT EXISTS (
    SELECT 1 FROM public.student_access
    WHERE student_id = $1
      AND viewer_user_id = auth.uid()
      AND viewer_role = $2
      AND status = 'active'
  );
$_$;


--
-- Name: is_activity_log_visible_to_role("uuid", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."is_activity_log_visible_to_role"("log_id" "uuid", "viewer_role" "text") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.activity_logs al
    WHERE al.id = log_id
      AND public.is_active_viewer(al.student_id, viewer_role)
  );
$$;


--
-- Name: is_owner_of_activity_log("uuid", "uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."is_owner_of_activity_log"("uid" "uuid", "log_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.activity_logs
    WHERE id = log_id AND student_id = uid
  );
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: accommodation_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."accommodation_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "source_type" "text" NOT NULL,
    "source_name" "text",
    "issued_date" "date",
    "valid_until" "date",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "activity_category" "text" NOT NULL,
    "activity_name" "text" NOT NULL,
    "duration_minutes" integer NOT NULL,
    "manageability" integer NOT NULL,
    "note" "text",
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: challenge_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."challenge_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "activity_log_id" "uuid" NOT NULL,
    "tag" "text" NOT NULL
);


--
-- Name: daily_checkins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."daily_checkins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "checkin_date" "date" NOT NULL,
    "overall_manageability" integer NOT NULL,
    "attendance_context" "text",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "role" "public"."user_role" DEFAULT 'student'::"public"."user_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "display_name" "text",
    "return_to_learn_status" "text"
);


--
-- Name: school_staff_accommodations; Type: VIEW; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW "public"."school_staff_accommodations" WITH ("security_invoker"='on') AS
 SELECT "id",
    "student_id",
    "title",
    "source_type",
    "valid_until"
   FROM "public"."accommodation_records"
  WHERE (("status" = 'active'::"text") AND (("valid_until" IS NULL) OR ("valid_until" >= CURRENT_DATE)));


--
-- Name: student_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."student_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "viewer_user_id" "uuid",
    "viewer_role" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "access_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: student_profiles; Type: VIEW; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW "public"."student_profiles" WITH ("security_invoker"='off') AS
 SELECT "id",
    "display_name",
    "return_to_learn_status"
   FROM "public"."profiles" "p"
  WHERE (("role" = 'student'::"public"."user_role") AND ((EXISTS ( SELECT 1
           FROM "public"."student_access" "sa"
          WHERE (("sa"."student_id" = "p"."id") AND ("sa"."viewer_user_id" = "auth"."uid"()) AND ("sa"."viewer_role" = 'school_staff'::"text") AND ("sa"."status" = 'active'::"text")))) OR (EXISTS ( SELECT 1
           FROM "public"."student_access" "sa"
          WHERE (("sa"."student_id" = "p"."id") AND ("sa"."viewer_user_id" = "auth"."uid"()) AND ("sa"."viewer_role" = 'clinician'::"text") AND ("sa"."status" = 'active'::"text")))) OR (EXISTS ( SELECT 1
           FROM "public"."profiles" "admin_p"
          WHERE (("admin_p"."id" = "auth"."uid"()) AND ("admin_p"."role" = 'admin'::"public"."user_role"))))));


--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "appearance" "text" DEFAULT 'light'::"text" NOT NULL,
    "low_stimulation_enabled" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_preferences_appearance_check" CHECK (("appearance" = ANY (ARRAY['light'::"text", 'dark'::"text"])))
);


--
-- Name: accommodation_records accommodation_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'accommodation_records_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'accommodation_records'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."accommodation_records"
    ADD CONSTRAINT "accommodation_records_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'activity_logs_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'activity_logs'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: challenge_tags challenge_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'challenge_tags_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'challenge_tags'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."challenge_tags"
    ADD CONSTRAINT "challenge_tags_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: daily_checkins daily_checkins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'daily_checkins_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'daily_checkins'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."daily_checkins"
    ADD CONSTRAINT "daily_checkins_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'profiles_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: student_access student_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'student_access_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'student_access'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."student_access"
    ADD CONSTRAINT "student_access_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'user_preferences_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'user_preferences'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: user_preferences user_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'user_preferences_user_id_key'
      AND n.nspname = 'public'
      AND c.relname = 'user_preferences'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_key" UNIQUE ("user_id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: accommodation_records accommodation_records_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE OR REPLACE TRIGGER "accommodation_records_updated_at" BEFORE UPDATE ON "public"."accommodation_records" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: user_preferences user_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE OR REPLACE TRIGGER "user_preferences_updated_at" BEFORE UPDATE ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: accommodation_records accommodation_records_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'accommodation_records_created_by_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'accommodation_records'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."accommodation_records"
    ADD CONSTRAINT "accommodation_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: accommodation_records accommodation_records_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'accommodation_records_student_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'accommodation_records'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."accommodation_records"
    ADD CONSTRAINT "accommodation_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: activity_logs activity_logs_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'activity_logs_student_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'activity_logs'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: challenge_tags challenge_tags_activity_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'challenge_tags_activity_log_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'challenge_tags'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."challenge_tags"
    ADD CONSTRAINT "challenge_tags_activity_log_id_fkey" FOREIGN KEY ("activity_log_id") REFERENCES "public"."activity_logs"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: daily_checkins daily_checkins_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'daily_checkins_student_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'daily_checkins'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."daily_checkins"
    ADD CONSTRAINT "daily_checkins_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'profiles_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: student_access student_access_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'student_access_student_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'student_access'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."student_access"
    ADD CONSTRAINT "student_access_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: student_access student_access_viewer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'student_access_viewer_user_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'student_access'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."student_access"
    ADD CONSTRAINT "student_access_viewer_user_id_fkey" FOREIGN KEY ("viewer_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: user_preferences user_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'user_preferences_user_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'user_preferences'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: student_access Admins can manage all access rows; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Admins can manage all access rows'
      AND n.nspname = 'public'
      AND c.relname = 'student_access'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Admins can manage all access rows" ON "public"."student_access" TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = 'admin'::"public"."user_role")) WITH CHECK (("public"."get_user_role"("auth"."uid"()) = 'admin'::"public"."user_role"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: accommodation_records Admins can manage all accommodations; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Admins can manage all accommodations'
      AND n.nspname = 'public'
      AND c.relname = 'accommodation_records'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Admins can manage all accommodations" ON "public"."accommodation_records" TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = 'admin'::"public"."user_role")) WITH CHECK (("public"."get_user_role"("auth"."uid"()) = 'admin'::"public"."user_role"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: daily_checkins Admins can manage all checkins; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Admins can manage all checkins'
      AND n.nspname = 'public'
      AND c.relname = 'daily_checkins'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Admins can manage all checkins" ON "public"."daily_checkins" TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = 'admin'::"public"."user_role")) WITH CHECK (("public"."get_user_role"("auth"."uid"()) = 'admin'::"public"."user_role"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: activity_logs Admins can manage all logs; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Admins can manage all logs'
      AND n.nspname = 'public'
      AND c.relname = 'activity_logs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Admins can manage all logs" ON "public"."activity_logs" TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = 'admin'::"public"."user_role")) WITH CHECK (("public"."get_user_role"("auth"."uid"()) = 'admin'::"public"."user_role"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: user_preferences Admins can manage all preferences; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Admins can manage all preferences'
      AND n.nspname = 'public'
      AND c.relname = 'user_preferences'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Admins can manage all preferences" ON "public"."user_preferences" TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = 'admin'::"public"."user_role")) WITH CHECK (("public"."get_user_role"("auth"."uid"()) = 'admin'::"public"."user_role"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: challenge_tags Admins can manage all tags; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Admins can manage all tags'
      AND n.nspname = 'public'
      AND c.relname = 'challenge_tags'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Admins can manage all tags" ON "public"."challenge_tags" TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = 'admin'::"public"."user_role")) WITH CHECK (("public"."get_user_role"("auth"."uid"()) = 'admin'::"public"."user_role"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: accommodation_records Anon cannot access accommodations; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Anon cannot access accommodations'
      AND n.nspname = 'public'
      AND c.relname = 'accommodation_records'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Anon cannot access accommodations" ON "public"."accommodation_records" TO "anon" USING (false) WITH CHECK (false);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: daily_checkins Anon cannot access checkins; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Anon cannot access checkins'
      AND n.nspname = 'public'
      AND c.relname = 'daily_checkins'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Anon cannot access checkins" ON "public"."daily_checkins" TO "anon" USING (false) WITH CHECK (false);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: activity_logs Anon cannot access logs; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Anon cannot access logs'
      AND n.nspname = 'public'
      AND c.relname = 'activity_logs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Anon cannot access logs" ON "public"."activity_logs" TO "anon" USING (false) WITH CHECK (false);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: user_preferences Anon cannot access preferences; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Anon cannot access preferences'
      AND n.nspname = 'public'
      AND c.relname = 'user_preferences'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Anon cannot access preferences" ON "public"."user_preferences" TO "anon" USING (false) WITH CHECK (false);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: student_access Anon cannot access student_access; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Anon cannot access student_access'
      AND n.nspname = 'public'
      AND c.relname = 'student_access'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Anon cannot access student_access" ON "public"."student_access" TO "anon" USING (false) WITH CHECK (false);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: challenge_tags Anon cannot access tags; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Anon cannot access tags'
      AND n.nspname = 'public'
      AND c.relname = 'challenge_tags'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Anon cannot access tags" ON "public"."challenge_tags" TO "anon" USING (false) WITH CHECK (false);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: accommodation_records Clinicians can insert accommodations for linked students; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Clinicians can insert accommodations for linked students'
      AND n.nspname = 'public'
      AND c.relname = 'accommodation_records'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Clinicians can insert accommodations for linked students" ON "public"."accommodation_records" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_active_viewer"("student_id", 'clinician'::"text") AND ("created_by" = "auth"."uid"())));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: accommodation_records Clinicians can select linked accommodations; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Clinicians can select linked accommodations'
      AND n.nspname = 'public'
      AND c.relname = 'accommodation_records'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Clinicians can select linked accommodations" ON "public"."accommodation_records" FOR SELECT TO "authenticated" USING ("public"."is_active_viewer"("student_id", 'clinician'::"text"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: daily_checkins Clinicians can select linked checkins; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Clinicians can select linked checkins'
      AND n.nspname = 'public'
      AND c.relname = 'daily_checkins'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Clinicians can select linked checkins" ON "public"."daily_checkins" FOR SELECT TO "authenticated" USING ("public"."is_active_viewer"("student_id", 'clinician'::"text"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: activity_logs Clinicians can select linked student logs; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Clinicians can select linked student logs'
      AND n.nspname = 'public'
      AND c.relname = 'activity_logs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Clinicians can select linked student logs" ON "public"."activity_logs" FOR SELECT TO "authenticated" USING ("public"."is_active_viewer"("student_id", 'clinician'::"text"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: challenge_tags Clinicians can select linked tags; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Clinicians can select linked tags'
      AND n.nspname = 'public'
      AND c.relname = 'challenge_tags'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Clinicians can select linked tags" ON "public"."challenge_tags" FOR SELECT TO "authenticated" USING ("public"."is_activity_log_visible_to_role"("activity_log_id", 'clinician'::"text"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: accommodation_records Clinicians can update accommodations for linked students; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Clinicians can update accommodations for linked students'
      AND n.nspname = 'public'
      AND c.relname = 'accommodation_records'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Clinicians can update accommodations for linked students" ON "public"."accommodation_records" FOR UPDATE TO "authenticated" USING ("public"."is_active_viewer"("student_id", 'clinician'::"text")) WITH CHECK ("public"."is_active_viewer"("student_id", 'clinician'::"text"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: accommodation_records School staff can select linked active accommodations; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'School staff can select linked active accommodations'
      AND n.nspname = 'public'
      AND c.relname = 'accommodation_records'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "School staff can select linked active accommodations" ON "public"."accommodation_records" FOR SELECT TO "authenticated" USING (("public"."is_active_viewer"("student_id", 'school_staff'::"text") AND ("status" = 'active'::"text") AND (("valid_until" IS NULL) OR ("valid_until" >= CURRENT_DATE))));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: daily_checkins School staff cannot select checkins; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'School staff cannot select checkins'
      AND n.nspname = 'public'
      AND c.relname = 'daily_checkins'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "School staff cannot select checkins" ON "public"."daily_checkins" FOR SELECT TO "authenticated" USING (false);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: activity_logs School staff cannot select logs; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'School staff cannot select logs'
      AND n.nspname = 'public'
      AND c.relname = 'activity_logs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "School staff cannot select logs" ON "public"."activity_logs" FOR SELECT TO "authenticated" USING (false);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: challenge_tags School staff cannot select tags; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'School staff cannot select tags'
      AND n.nspname = 'public'
      AND c.relname = 'challenge_tags'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "School staff cannot select tags" ON "public"."challenge_tags" FOR SELECT TO "authenticated" USING (false);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: daily_checkins Students can delete own checkins; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Students can delete own checkins'
      AND n.nspname = 'public'
      AND c.relname = 'daily_checkins'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Students can delete own checkins" ON "public"."daily_checkins" FOR DELETE TO "authenticated" USING (("student_id" = "auth"."uid"()));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: activity_logs Students can delete own logs; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Students can delete own logs'
      AND n.nspname = 'public'
      AND c.relname = 'activity_logs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Students can delete own logs" ON "public"."activity_logs" FOR DELETE TO "authenticated" USING (("student_id" = "auth"."uid"()));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: challenge_tags Students can delete own tags; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Students can delete own tags'
      AND n.nspname = 'public'
      AND c.relname = 'challenge_tags'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Students can delete own tags" ON "public"."challenge_tags" FOR DELETE TO "authenticated" USING ("public"."is_owner_of_activity_log"("auth"."uid"(), "activity_log_id"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: daily_checkins Students can insert own checkins; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Students can insert own checkins'
      AND n.nspname = 'public'
      AND c.relname = 'daily_checkins'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Students can insert own checkins" ON "public"."daily_checkins" FOR INSERT TO "authenticated" WITH CHECK (("student_id" = "auth"."uid"()));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: activity_logs Students can insert own logs; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Students can insert own logs'
      AND n.nspname = 'public'
      AND c.relname = 'activity_logs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Students can insert own logs" ON "public"."activity_logs" FOR INSERT TO "authenticated" WITH CHECK (("student_id" = "auth"."uid"()));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: challenge_tags Students can insert own tags; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Students can insert own tags'
      AND n.nspname = 'public'
      AND c.relname = 'challenge_tags'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Students can insert own tags" ON "public"."challenge_tags" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_owner_of_activity_log"("auth"."uid"(), "activity_log_id"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: student_access Students can manage own access rows; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Students can manage own access rows'
      AND n.nspname = 'public'
      AND c.relname = 'student_access'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Students can manage own access rows" ON "public"."student_access" TO "authenticated" USING (("student_id" = "auth"."uid"())) WITH CHECK (("student_id" = "auth"."uid"()));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: accommodation_records Students can select own accommodations; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Students can select own accommodations'
      AND n.nspname = 'public'
      AND c.relname = 'accommodation_records'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Students can select own accommodations" ON "public"."accommodation_records" FOR SELECT TO "authenticated" USING (("student_id" = "auth"."uid"()));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: daily_checkins Students can select own checkins; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Students can select own checkins'
      AND n.nspname = 'public'
      AND c.relname = 'daily_checkins'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Students can select own checkins" ON "public"."daily_checkins" FOR SELECT TO "authenticated" USING (("student_id" = "auth"."uid"()));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: activity_logs Students can select own logs; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Students can select own logs'
      AND n.nspname = 'public'
      AND c.relname = 'activity_logs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Students can select own logs" ON "public"."activity_logs" FOR SELECT TO "authenticated" USING (("student_id" = "auth"."uid"()));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: challenge_tags Students can select own tags; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Students can select own tags'
      AND n.nspname = 'public'
      AND c.relname = 'challenge_tags'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Students can select own tags" ON "public"."challenge_tags" FOR SELECT TO "authenticated" USING ("public"."is_owner_of_activity_log"("auth"."uid"(), "activity_log_id"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: daily_checkins Students can update own checkins; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Students can update own checkins'
      AND n.nspname = 'public'
      AND c.relname = 'daily_checkins'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Students can update own checkins" ON "public"."daily_checkins" FOR UPDATE TO "authenticated" USING (("student_id" = "auth"."uid"())) WITH CHECK (("student_id" = "auth"."uid"()));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: activity_logs Students can update own logs; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Students can update own logs'
      AND n.nspname = 'public'
      AND c.relname = 'activity_logs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Students can update own logs" ON "public"."activity_logs" FOR UPDATE TO "authenticated" USING (("student_id" = "auth"."uid"())) WITH CHECK (("student_id" = "auth"."uid"()));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: challenge_tags Students can update own tags; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Students can update own tags'
      AND n.nspname = 'public'
      AND c.relname = 'challenge_tags'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Students can update own tags" ON "public"."challenge_tags" FOR UPDATE TO "authenticated" USING ("public"."is_owner_of_activity_log"("auth"."uid"(), "activity_log_id")) WITH CHECK ("public"."is_owner_of_activity_log"("auth"."uid"(), "activity_log_id"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: user_preferences Users can insert own preferences; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Users can insert own preferences'
      AND n.nspname = 'public'
      AND c.relname = 'user_preferences'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Users can insert own preferences" ON "public"."user_preferences" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: user_preferences Users can select own preferences; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Users can select own preferences'
      AND n.nspname = 'public'
      AND c.relname = 'user_preferences'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Users can select own preferences" ON "public"."user_preferences" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: user_preferences Users can update own preferences; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Users can update own preferences'
      AND n.nspname = 'public'
      AND c.relname = 'user_preferences'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Users can update own preferences" ON "public"."user_preferences" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: student_access Viewers can view their own access rows; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Viewers can view their own access rows'
      AND n.nspname = 'public'
      AND c.relname = 'student_access'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Viewers can view their own access rows" ON "public"."student_access" FOR SELECT TO "authenticated" USING (("viewer_user_id" = "auth"."uid"()));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: accommodation_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."accommodation_records" ENABLE ROW LEVEL SECURITY;

--
-- Name: activity_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles admins have full access to profiles; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'admins have full access to profiles'
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "admins have full access to profiles" ON "public"."profiles" TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = 'admin'::"public"."user_role")) WITH CHECK (("public"."get_user_role"("auth"."uid"()) = 'admin'::"public"."user_role"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: profiles anon cannot delete profiles; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon cannot delete profiles'
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon cannot delete profiles" ON "public"."profiles" FOR DELETE TO "anon" USING (false);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: profiles anon cannot insert profiles; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon cannot insert profiles'
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon cannot insert profiles" ON "public"."profiles" FOR INSERT TO "anon" WITH CHECK (false);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: profiles anon cannot select profiles; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon cannot select profiles'
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon cannot select profiles" ON "public"."profiles" FOR SELECT TO "anon" USING (false);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: profiles anon cannot update profiles; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon cannot update profiles'
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon cannot update profiles" ON "public"."profiles" FOR UPDATE TO "anon" USING (false) WITH CHECK (false);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: challenge_tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."challenge_tags" ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_checkins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."daily_checkins" ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: student_access; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."student_access" ENABLE ROW LEVEL SECURITY;

--
-- Name: user_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles users can update own profile except role; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'users can update own profile except role'
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "users can update own profile except role" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK ((("auth"."uid"() = "id") AND (NOT ("role" IS DISTINCT FROM "public"."get_user_role"("auth"."uid"())))));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: profiles users can view own profile; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'users can view own profile'
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "users can view own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: profiles users cannot delete profiles; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'users cannot delete profiles'
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "users cannot delete profiles" ON "public"."profiles" FOR DELETE TO "authenticated" USING (false);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: profiles users cannot insert profiles; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'users cannot insert profiles'
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "users cannot insert profiles" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (false);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- PostgreSQL database dump complete
--




-- ============================================================
-- SECTION: DIFF FILTER OBJECTS
-- ============================================================
-- Objects that match diff-filter.json but cannot be represented
-- precisely by pg_dump --filter.

-- auth.users trigger: on_auth_user_created
DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE NOT t.tgisinternal
      AND t.tgname = 'on_auth_user_created'
      AND n.nspname = 'auth'
      AND c.relname = 'users'
  ) THEN
    EXECUTE 'CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();';
  END IF;
END
$pg_schema_restore$;

-- ============================================================
-- SECTION: STORAGE BUCKETS DATA
-- ============================================================


-- ============================================================
-- SECTION: CRON JOBS
-- ============================================================
-- 用户自定义 pg_cron 任务。


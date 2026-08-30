-- School staff receive accommodation-only access for linked students.
-- These permissive policies would otherwise expose private student history.

BEGIN;

DROP POLICY IF EXISTS "School staff can select linked logs"
ON public.activity_logs;

DROP POLICY IF EXISTS "School staff can select linked challenge tags"
ON public.challenge_tags;

DROP POLICY IF EXISTS "School staff can select linked checkins"
ON public.daily_checkins;

COMMIT;

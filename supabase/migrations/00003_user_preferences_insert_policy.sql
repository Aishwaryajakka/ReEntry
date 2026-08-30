-- Allow authenticated users to insert their own user_preferences row.
-- This is needed for upsert-based persistence and for any user whose row does not exist yet.
CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

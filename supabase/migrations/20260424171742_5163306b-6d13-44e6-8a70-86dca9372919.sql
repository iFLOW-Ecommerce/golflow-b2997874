DROP POLICY IF EXISTS "Teams viewable by authenticated users" ON public.teams;

CREATE POLICY "Teams viewable by everyone"
  ON public.teams FOR SELECT
  TO anon, authenticated
  USING (true);
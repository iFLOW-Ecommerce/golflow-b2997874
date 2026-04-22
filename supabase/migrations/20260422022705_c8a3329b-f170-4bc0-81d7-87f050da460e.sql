-- Table to persist current and previous ranks per user
CREATE TABLE public.user_ranks (
  user_id uuid PRIMARY KEY,
  current_rank integer,
  previous_rank integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_ranks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ranks viewable by authenticated users"
  ON public.user_ranks FOR SELECT
  TO authenticated
  USING (true);

-- Replace the user_ranking view to include rank columns
DROP VIEW IF EXISTS public.user_ranking;

CREATE VIEW public.user_ranking
WITH (security_invoker = true)
AS
SELECT
  p.user_id,
  p.email,
  COALESCE(SUM(pr.points_awarded), 0)::integer AS total_points,
  COUNT(pr.id)::integer AS predictions_count,
  ur.current_rank,
  ur.previous_rank
FROM public.profiles p
LEFT JOIN public.predictions pr ON pr.user_id = p.user_id
LEFT JOIN public.user_ranks ur ON ur.user_id = p.user_id
GROUP BY p.user_id, p.email, ur.current_rank, ur.previous_rank;

-- Recalculation function: shifts current_rank -> previous_rank,
-- then computes new current_rank ordered by total_points DESC, email ASC.
CREATE OR REPLACE FUNCTION public.recalculate_user_ranks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure every profile has a row in user_ranks
  INSERT INTO public.user_ranks (user_id)
  SELECT p.user_id FROM public.profiles p
  ON CONFLICT (user_id) DO NOTHING;

  -- Shift current -> previous
  UPDATE public.user_ranks
  SET previous_rank = current_rank;

  -- Recompute current_rank
  WITH ranked AS (
    SELECT
      p.user_id,
      ROW_NUMBER() OVER (
        ORDER BY COALESCE(SUM(pr.points_awarded), 0) DESC, p.email ASC
      )::integer AS new_rank
    FROM public.profiles p
    LEFT JOIN public.predictions pr ON pr.user_id = p.user_id
    GROUP BY p.user_id, p.email
  )
  UPDATE public.user_ranks ur
  SET current_rank = r.new_rank,
      updated_at = now()
  FROM ranked r
  WHERE ur.user_id = r.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_user_ranks() FROM public;
GRANT EXECUTE ON FUNCTION public.recalculate_user_ranks() TO authenticated;
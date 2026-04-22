-- Add a separate snapshot function so the admin can save current_rank
-- into previous_rank BEFORE points/ranks are recalculated.
CREATE OR REPLACE FUNCTION public.snapshot_user_ranks()
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

  -- Save current_rank into previous_rank
  UPDATE public.user_ranks
  SET previous_rank = current_rank,
      updated_at = now()
  WHERE current_rank IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.snapshot_user_ranks() FROM public;
GRANT EXECUTE ON FUNCTION public.snapshot_user_ranks() TO authenticated;

-- Update recalculate_user_ranks so it ONLY recomputes current_rank,
-- without touching previous_rank (snapshot is now a separate step).
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

  -- Recompute current_rank only
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
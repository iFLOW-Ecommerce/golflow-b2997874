-- Team-specific ranking infrastructure

-- 1) Table to store per-team rank snapshots
CREATE TABLE IF NOT EXISTS public.user_team_ranks (
  user_id uuid NOT NULL,
  team_id uuid NOT NULL,
  current_rank integer,
  previous_rank integer,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, team_id)
);

ALTER TABLE public.user_team_ranks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team ranks viewable by authenticated users"
  ON public.user_team_ranks FOR SELECT
  TO authenticated
  USING (true);

-- 2) Recalculate team-scoped ranks
CREATE OR REPLACE FUNCTION public.recalculate_team_ranks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Ensure each (user, team) pair has a row
  INSERT INTO public.user_team_ranks (user_id, team_id)
  SELECT p.user_id, p.team_id
  FROM public.profiles p
  WHERE p.team_id IS NOT NULL
  ON CONFLICT (user_id, team_id) DO NOTHING;

  -- Remove stale rows whose user no longer belongs to that team
  DELETE FROM public.user_team_ranks utr
  WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = utr.user_id AND p.team_id = utr.team_id
  );

  -- Recompute current_rank within each team
  WITH ranked AS (
    SELECT
      p.user_id,
      p.team_id,
      ROW_NUMBER() OVER (
        PARTITION BY p.team_id
        ORDER BY COALESCE(SUM(pr.points_awarded), 0) DESC, p.email ASC
      )::integer AS new_rank
    FROM public.profiles p
    LEFT JOIN public.predictions pr ON pr.user_id = p.user_id
    WHERE p.team_id IS NOT NULL
    GROUP BY p.user_id, p.team_id, p.email
  )
  UPDATE public.user_team_ranks utr
  SET current_rank = r.new_rank,
      updated_at = now()
  FROM ranked r
  WHERE utr.user_id = r.user_id AND utr.team_id = r.team_id;
END;
$$;

-- 3) Snapshot team ranks (current -> previous)
CREATE OR REPLACE FUNCTION public.snapshot_team_ranks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_team_ranks (user_id, team_id)
  SELECT p.user_id, p.team_id
  FROM public.profiles p
  WHERE p.team_id IS NOT NULL
  ON CONFLICT (user_id, team_id) DO NOTHING;

  UPDATE public.user_team_ranks
  SET previous_rank = current_rank,
      updated_at = now()
  WHERE current_rank IS NOT NULL;
END;
$$;

-- 4) Recreate user_ranking view to include team rank info
DROP VIEW IF EXISTS public.user_ranking;

CREATE VIEW public.user_ranking
WITH (security_invoker = true)
AS
SELECT
  p.user_id,
  p.email,
  p.first_name,
  p.last_name,
  p.avatar_seed,
  p.team_id,
  t.name AS team_name,
  COALESCE(SUM(pr.points_awarded), 0)::integer AS total_points,
  COUNT(pr.id)::integer AS predictions_count,
  ur.current_rank,
  ur.previous_rank,
  utr.current_rank AS team_current_rank,
  utr.previous_rank AS team_previous_rank
FROM public.profiles p
LEFT JOIN public.teams t ON t.id = p.team_id
LEFT JOIN public.predictions pr ON pr.user_id = p.user_id
LEFT JOIN public.user_ranks ur ON ur.user_id = p.user_id
LEFT JOIN public.user_team_ranks utr ON utr.user_id = p.user_id AND utr.team_id = p.team_id
GROUP BY p.user_id, p.email, p.first_name, p.last_name, p.avatar_seed, p.team_id, t.name, ur.current_rank, ur.previous_rank, utr.current_rank, utr.previous_rank;

-- 5) Initial population
SELECT public.recalculate_team_ranks();
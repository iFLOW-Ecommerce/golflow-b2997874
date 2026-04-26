-- 1) Tabla team_avatars
CREATE TABLE public.team_avatars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL UNIQUE REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_avatars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team avatars viewable by authenticated users"
  ON public.team_avatars FOR SELECT TO authenticated USING (true);

-- 2) Tabla team_avatar_ranks
CREATE TABLE public.team_avatar_ranks (
  team_avatar_id uuid PRIMARY KEY REFERENCES public.team_avatars(id) ON DELETE CASCADE,
  total_points integer NOT NULL DEFAULT 0,
  current_rank integer,
  previous_rank integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_avatar_ranks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team avatar ranks viewable by authenticated users"
  ON public.team_avatar_ranks FOR SELECT TO authenticated USING (true);

-- 3) Trigger: al crear un team, crear su team_avatar
CREATE OR REPLACE FUNCTION public.create_team_avatar_for_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.team_avatars (team_id, name)
  VALUES (NEW.id, 'Equipo ' || NEW.name || ' prom.')
  ON CONFLICT (team_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_teams_create_avatar ON public.teams;
CREATE TRIGGER trg_teams_create_avatar
AFTER INSERT ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.create_team_avatar_for_team();

-- 4) Backfill: crear team_avatars para equipos existentes
INSERT INTO public.team_avatars (team_id, name)
SELECT t.id, 'Equipo ' || t.name || ' prom.'
FROM public.teams t
ON CONFLICT (team_id) DO NOTHING;

-- 5) Función: recalcular puntos
CREATE OR REPLACE FUNCTION public.recalculate_team_avatar_points()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Asegurar fila en team_avatar_ranks por cada team_avatar
  INSERT INTO public.team_avatar_ranks (team_avatar_id)
  SELECT ta.id FROM public.team_avatars ta
  ON CONFLICT (team_avatar_id) DO NOTHING;

  -- Recalcular puntos: por cada (team, match) calcular promedio redondeado de puntos
  -- entre los miembros del equipo que predijeron ese partido. Sumar a total del team_avatar.
  WITH per_match AS (
    SELECT
      p.team_id,
      pr.match_id,
      ROUND(AVG(pr.points_awarded))::int AS avg_pts
    FROM public.profiles p
    JOIN public.predictions pr ON pr.user_id = p.user_id
    WHERE p.team_id IS NOT NULL
    GROUP BY p.team_id, pr.match_id
  ),
  per_team AS (
    SELECT team_id, COALESCE(SUM(avg_pts), 0)::int AS total_pts
    FROM per_match
    GROUP BY team_id
  )
  UPDATE public.team_avatar_ranks tar
  SET total_points = COALESCE(pt.total_pts, 0),
      updated_at = now()
  FROM public.team_avatars ta
  LEFT JOIN per_team pt ON pt.team_id = ta.team_id
  WHERE tar.team_avatar_id = ta.id;
END;
$$;

-- 6) Función: recalcular ranks
CREATE OR REPLACE FUNCTION public.recalculate_team_avatar_ranks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.team_avatar_ranks (team_avatar_id)
  SELECT ta.id FROM public.team_avatars ta
  ON CONFLICT (team_avatar_id) DO NOTHING;

  WITH ranked AS (
    SELECT
      tar.team_avatar_id,
      ROW_NUMBER() OVER (
        ORDER BY tar.total_points DESC, ta.name ASC
      )::int AS new_rank
    FROM public.team_avatar_ranks tar
    JOIN public.team_avatars ta ON ta.id = tar.team_avatar_id
  )
  UPDATE public.team_avatar_ranks tar
  SET current_rank = r.new_rank,
      updated_at = now()
  FROM ranked r
  WHERE tar.team_avatar_id = r.team_avatar_id;
END;
$$;

-- 7) Función: snapshot
CREATE OR REPLACE FUNCTION public.snapshot_team_avatar_ranks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.team_avatar_ranks (team_avatar_id)
  SELECT ta.id FROM public.team_avatars ta
  ON CONFLICT (team_avatar_id) DO NOTHING;

  UPDATE public.team_avatar_ranks
  SET previous_rank = current_rank,
      updated_at = now()
  WHERE current_rank IS NOT NULL;
END;
$$;

-- 8) Recálculo inicial
SELECT public.recalculate_team_avatar_points();
SELECT public.recalculate_team_avatar_ranks();
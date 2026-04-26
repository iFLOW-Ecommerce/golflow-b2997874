-- Tabla achievements
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  scope text NOT NULL CHECK (scope IN ('global','team')),
  team_id uuid NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  stage_group text NOT NULL CHECK (stage_group IN ('group','knockout','tournament')),
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 3),
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unicidad: un usuario tiene a lo sumo un logro por (scope, team_id, stage_group)
CREATE UNIQUE INDEX achievements_unique_global
  ON public.achievements (user_id, stage_group)
  WHERE scope = 'global';

CREATE UNIQUE INDEX achievements_unique_team
  ON public.achievements (user_id, team_id, stage_group)
  WHERE scope = 'team';

CREATE INDEX idx_achievements_user ON public.achievements(user_id);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements viewable by authenticated users"
  ON public.achievements FOR SELECT TO authenticated USING (true);

-- Función para recalcular logros
CREATE OR REPLACE FUNCTION public.recalculate_achievements()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sg text;
  match_filter text;
  total_count int;
  finished_count int;
  match_ids uuid[];
BEGIN
  FOR sg IN SELECT unnest(ARRAY['group','knockout','tournament']) LOOP
    -- Obtener IDs de partidos para esta etapa
    IF sg = 'group' THEN
      SELECT array_agg(id), count(*) FILTER (WHERE true), count(*) FILTER (WHERE is_finished AND home_score IS NOT NULL AND away_score IS NOT NULL)
        INTO match_ids, total_count, finished_count
      FROM public.matches WHERE stage = 'group';
    ELSIF sg = 'knockout' THEN
      SELECT array_agg(id), count(*) FILTER (WHERE true), count(*) FILTER (WHERE is_finished AND home_score IS NOT NULL AND away_score IS NOT NULL)
        INTO match_ids, total_count, finished_count
      FROM public.matches WHERE stage IN ('round_of_32','round_of_16','quarterfinal','semifinal','third_place','final');
    ELSE -- tournament
      SELECT array_agg(id), count(*) FILTER (WHERE true), count(*) FILTER (WHERE is_finished AND home_score IS NOT NULL AND away_score IS NOT NULL)
        INTO match_ids, total_count, finished_count
      FROM public.matches;
    END IF;

    -- Limpiar logros previos de esta etapa (idempotente)
    DELETE FROM public.achievements WHERE stage_group = sg;

    -- Si no hay partidos o no están todos terminados, no asignar logros
    IF total_count = 0 OR finished_count < total_count THEN
      CONTINUE;
    END IF;

    -- Top 3 GLOBAL
    INSERT INTO public.achievements (user_id, scope, team_id, stage_group, position, points)
    SELECT user_id, 'global', NULL, sg, rn::smallint, total_pts
    FROM (
      SELECT
        p.user_id,
        COALESCE(SUM(pr.points_awarded), 0)::int AS total_pts,
        ROW_NUMBER() OVER (
          ORDER BY COALESCE(SUM(pr.points_awarded), 0) DESC, p.email ASC
        ) AS rn
      FROM public.profiles p
      LEFT JOIN public.predictions pr
        ON pr.user_id = p.user_id AND pr.match_id = ANY(match_ids)
      GROUP BY p.user_id, p.email
    ) ranked
    WHERE rn <= 3 AND total_pts > 0;

    -- Top 3 por EQUIPO
    INSERT INTO public.achievements (user_id, scope, team_id, stage_group, position, points)
    SELECT user_id, 'team', team_id, sg, rn::smallint, total_pts
    FROM (
      SELECT
        p.user_id,
        p.team_id,
        COALESCE(SUM(pr.points_awarded), 0)::int AS total_pts,
        ROW_NUMBER() OVER (
          PARTITION BY p.team_id
          ORDER BY COALESCE(SUM(pr.points_awarded), 0) DESC, p.email ASC
        ) AS rn
      FROM public.profiles p
      LEFT JOIN public.predictions pr
        ON pr.user_id = p.user_id AND pr.match_id = ANY(match_ids)
      WHERE p.team_id IS NOT NULL
      GROUP BY p.user_id, p.team_id, p.email
    ) ranked
    WHERE rn <= 3 AND total_pts > 0;
  END LOOP;
END;
$$;
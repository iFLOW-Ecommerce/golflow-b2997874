-- Helper: get multiplier per stage
CREATE OR REPLACE FUNCTION public.stage_multiplier(_stage text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _stage
    WHEN 'round_of_16' THEN 2
    WHEN 'quarterfinal' THEN 3
    WHEN 'semifinal' THEN 4
    WHEN 'final' THEN 5
    WHEN 'third_place' THEN 5
    ELSE 1
  END;
$$;

-- Update trigger function on predictions to apply multiplier
CREATE OR REPLACE FUNCTION public.update_prediction_points()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  m RECORD;
  base_pts INTEGER;
BEGIN
  SELECT home_score, away_score, is_finished, stage INTO m
  FROM public.matches WHERE id = NEW.match_id;

  IF m.is_finished AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL THEN
    base_pts := public.calculate_prediction_points(
      NEW.predicted_home_score, NEW.predicted_away_score, m.home_score, m.away_score
    );
    NEW.points_awarded := base_pts * public.stage_multiplier(m.stage);
  ELSE
    NEW.points_awarded := 0;
  END IF;
  RETURN NEW;
END;
$function$;

-- Update trigger function on matches to apply multiplier when results change
CREATE OR REPLACE FUNCTION public.recalc_predictions_for_match()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.is_finished AND NEW.home_score IS NOT NULL AND NEW.away_score IS NOT NULL THEN
    UPDATE public.predictions
    SET points_awarded = public.calculate_prediction_points(
      predicted_home_score, predicted_away_score, NEW.home_score, NEW.away_score
    ) * public.stage_multiplier(NEW.stage)
    WHERE match_id = NEW.id;
  ELSE
    UPDATE public.predictions
    SET points_awarded = 0
    WHERE match_id = NEW.id AND points_awarded <> 0;
  END IF;
  RETURN NEW;
END;
$function$;

-- Recalculate all existing predictions for finished matches
UPDATE public.predictions p
SET points_awarded = public.calculate_prediction_points(
  p.predicted_home_score, p.predicted_away_score, m.home_score, m.away_score
) * public.stage_multiplier(m.stage)
FROM public.matches m
WHERE p.match_id = m.id
  AND m.is_finished = true
  AND m.home_score IS NOT NULL
  AND m.away_score IS NOT NULL;
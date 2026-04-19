-- Function to calculate points for a single prediction vs actual match result
CREATE OR REPLACE FUNCTION public.calculate_prediction_points(
  predicted_home INTEGER,
  predicted_away INTEGER,
  actual_home INTEGER,
  actual_away INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  pts INTEGER := 0;
  total_goals INTEGER;
  predicted_outcome TEXT;
  actual_outcome TEXT;
BEGIN
  IF actual_home IS NULL OR actual_away IS NULL THEN
    RETURN 0;
  END IF;

  -- Determine outcomes
  predicted_outcome := CASE
    WHEN predicted_home > predicted_away THEN 'home'
    WHEN predicted_home < predicted_away THEN 'away'
    ELSE 'draw'
  END;
  actual_outcome := CASE
    WHEN actual_home > actual_away THEN 'home'
    WHEN actual_home < actual_away THEN 'away'
    ELSE 'draw'
  END;

  -- +3 by guessing winner/draw
  IF predicted_outcome = actual_outcome THEN
    pts := pts + 3;
  END IF;

  -- Exact score bonus
  IF predicted_home = actual_home AND predicted_away = actual_away THEN
    total_goals := actual_home + actual_away;
    IF total_goals <= 1 THEN
      pts := pts + 3;
    ELSE
      pts := pts + 3 + (total_goals - 1);
    END IF;
  END IF;

  RETURN pts;
END;
$$;

-- Trigger function to recalculate points on prediction insert/update
CREATE OR REPLACE FUNCTION public.update_prediction_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  m RECORD;
BEGIN
  SELECT home_score, away_score, is_finished INTO m
  FROM public.matches WHERE id = NEW.match_id;

  IF m.is_finished AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL THEN
    NEW.points_awarded := public.calculate_prediction_points(
      NEW.predicted_home_score, NEW.predicted_away_score, m.home_score, m.away_score
    );
  ELSE
    NEW.points_awarded := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prediction_points ON public.predictions;
CREATE TRIGGER trg_prediction_points
BEFORE INSERT OR UPDATE OF predicted_home_score, predicted_away_score, match_id
ON public.predictions
FOR EACH ROW EXECUTE FUNCTION public.update_prediction_points();

-- Trigger function on matches: when result is set, recalc all predictions for that match
CREATE OR REPLACE FUNCTION public.recalc_predictions_for_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_finished AND NEW.home_score IS NOT NULL AND NEW.away_score IS NOT NULL THEN
    UPDATE public.predictions
    SET points_awarded = public.calculate_prediction_points(
      predicted_home_score, predicted_away_score, NEW.home_score, NEW.away_score
    )
    WHERE match_id = NEW.id;
  ELSE
    UPDATE public.predictions
    SET points_awarded = 0
    WHERE match_id = NEW.id AND points_awarded <> 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_predictions ON public.matches;
CREATE TRIGGER trg_recalc_predictions
AFTER UPDATE OF home_score, away_score, is_finished
ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.recalc_predictions_for_match();

-- updated_at triggers (ensure they exist)
DROP TRIGGER IF EXISTS trg_predictions_updated_at ON public.predictions;
CREATE TRIGGER trg_predictions_updated_at
BEFORE UPDATE ON public.predictions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_matches_updated_at ON public.matches;
CREATE TRIGGER trg_matches_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ranking view: aggregate total points per user
CREATE OR REPLACE VIEW public.user_ranking AS
SELECT
  p.user_id,
  p.email,
  COALESCE(SUM(pr.points_awarded), 0)::INTEGER AS total_points,
  COUNT(pr.id)::INTEGER AS predictions_count
FROM public.profiles p
LEFT JOIN public.predictions pr ON pr.user_id = p.user_id
GROUP BY p.user_id, p.email;

GRANT SELECT ON public.user_ranking TO authenticated;
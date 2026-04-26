-- Trigger en predictions: calcula points_awarded al insertar/actualizar
DROP TRIGGER IF EXISTS trg_predictions_calc_points ON public.predictions;
CREATE TRIGGER trg_predictions_calc_points
BEFORE INSERT OR UPDATE OF predicted_home_score, predicted_away_score, match_id
ON public.predictions
FOR EACH ROW
EXECUTE FUNCTION public.update_prediction_points();

-- Trigger en matches: recalcula predicciones cuando cambia el resultado
DROP TRIGGER IF EXISTS trg_matches_recalc_predictions ON public.matches;
CREATE TRIGGER trg_matches_recalc_predictions
AFTER UPDATE OF home_score, away_score, is_finished, stage
ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.recalc_predictions_for_match();

-- Trigger updated_at en matches y predictions
DROP TRIGGER IF EXISTS trg_matches_updated_at ON public.matches;
CREATE TRIGGER trg_matches_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_predictions_updated_at ON public.predictions;
CREATE TRIGGER trg_predictions_updated_at
BEFORE UPDATE ON public.predictions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recalcular puntos de todas las predicciones existentes (basado en partidos finalizados)
UPDATE public.predictions pr
SET points_awarded = CASE
    WHEN m.is_finished AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL
    THEN public.calculate_prediction_points(pr.predicted_home_score, pr.predicted_away_score, m.home_score, m.away_score) * public.stage_multiplier(m.stage)
    ELSE 0
  END
FROM public.matches m
WHERE pr.match_id = m.id;

-- Recalcular rankings y logros
SELECT public.recalculate_user_ranks();
SELECT public.recalculate_team_ranks();
SELECT public.recalculate_achievements();
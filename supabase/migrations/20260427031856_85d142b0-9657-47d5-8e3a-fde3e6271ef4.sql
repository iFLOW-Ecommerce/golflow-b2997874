CREATE OR REPLACE FUNCTION public.admin_save_match_scores(p_updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  v_match_id uuid;
  v_home_score integer;
  v_away_score integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Solo administradores pueden actualizar resultados';
  END IF;

  IF jsonb_typeof(p_updates) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Formato inválido de resultados';
  END IF;

  PERFORM public.snapshot_user_ranks();
  PERFORM public.snapshot_team_ranks();
  PERFORM public.snapshot_team_avatar_ranks();

  FOR item IN SELECT value FROM jsonb_array_elements(p_updates) LOOP
    v_match_id := (item ->> 'id')::uuid;
    v_home_score := NULLIF(item ->> 'home_score', '')::integer;
    v_away_score := NULLIF(item ->> 'away_score', '')::integer;

    UPDATE public.matches
    SET home_score = v_home_score,
        away_score = v_away_score,
        is_finished = (v_home_score IS NOT NULL AND v_away_score IS NOT NULL),
        updated_at = now()
    WHERE id = v_match_id;
  END LOOP;

  PERFORM public.recalculate_user_ranks();
  PERFORM public.recalculate_team_ranks();
  PERFORM public.recalculate_achievements();
  PERFORM public.recalculate_team_avatar_points();
  PERFORM public.recalculate_team_avatar_ranks();
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_match_scores(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_match_scores(jsonb) TO authenticated;
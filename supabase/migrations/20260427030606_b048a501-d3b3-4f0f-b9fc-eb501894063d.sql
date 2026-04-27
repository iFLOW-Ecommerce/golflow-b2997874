-- Wrapper admin que orquesta snapshots y recálculos en orden correcto
CREATE OR REPLACE FUNCTION public.admin_run_recalcs(p_snapshot boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo admins
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Solo administradores pueden ejecutar recálculos';
  END IF;

  IF p_snapshot THEN
    PERFORM public.snapshot_user_ranks();
    PERFORM public.snapshot_team_ranks();
    PERFORM public.snapshot_team_avatar_ranks();
  END IF;

  PERFORM public.recalculate_user_ranks();
  PERFORM public.recalculate_team_ranks();
  PERFORM public.recalculate_achievements();
  PERFORM public.recalculate_team_avatar_points();
  PERFORM public.recalculate_team_avatar_ranks();
END;
$$;

-- Permiso solo a authenticated (la función chequea admin internamente)
REVOKE ALL ON FUNCTION public.admin_run_recalcs(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_run_recalcs(boolean) TO authenticated;

-- Quitar acceso directo a las primitivas
REVOKE EXECUTE ON FUNCTION public.recalculate_user_ranks() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalculate_team_ranks() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalculate_team_avatar_points() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalculate_team_avatar_ranks() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalculate_achievements() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.snapshot_user_ranks() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.snapshot_team_ranks() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.snapshot_team_avatar_ranks() FROM anon, authenticated, PUBLIC;
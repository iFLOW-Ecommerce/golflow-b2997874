DROP VIEW IF EXISTS public.user_ranking;
CREATE VIEW public.user_ranking AS
SELECT
  p.user_id,
  p.email,
  p.first_name,
  p.last_name,
  p.avatar_seed,
  t.name AS team_name,
  COALESCE(SUM(pr.points_awarded), 0::bigint)::integer AS total_points,
  COUNT(pr.id)::integer AS predictions_count,
  ur.current_rank,
  ur.previous_rank
FROM public.profiles p
LEFT JOIN public.predictions pr ON pr.user_id = p.user_id
LEFT JOIN public.user_ranks ur ON ur.user_id = p.user_id
LEFT JOIN public.teams t ON t.id = p.team_id
GROUP BY p.user_id, p.email, p.first_name, p.last_name, p.avatar_seed, t.name, ur.current_rank, ur.previous_rank;
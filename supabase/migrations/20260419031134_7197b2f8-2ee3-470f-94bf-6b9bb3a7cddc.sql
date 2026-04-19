DROP VIEW IF EXISTS public.user_ranking;

CREATE VIEW public.user_ranking
WITH (security_invoker = true) AS
SELECT
  p.user_id,
  p.email,
  COALESCE(SUM(pr.points_awarded), 0)::INTEGER AS total_points,
  COUNT(pr.id)::INTEGER AS predictions_count
FROM public.profiles p
LEFT JOIN public.predictions pr ON pr.user_id = p.user_id
GROUP BY p.user_id, p.email;

GRANT SELECT ON public.user_ranking TO authenticated;
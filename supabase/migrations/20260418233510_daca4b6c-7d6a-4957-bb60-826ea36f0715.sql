-- Add a stable external identifier so we can upsert hardcoded group-stage matches
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE;

-- Helpful index for ordering
CREATE INDEX IF NOT EXISTS idx_matches_group_name ON public.matches(group_name);
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON public.predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match_id ON public.predictions(match_id);

-- Ensure a user can only have ONE prediction per match
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'predictions_user_match_unique'
  ) THEN
    ALTER TABLE public.predictions
      ADD CONSTRAINT predictions_user_match_unique UNIQUE (user_id, match_id);
  END IF;
END$$;

-- Insert the 48 group-stage matches (12 groups x 6 matches). Idempotent via external_id.
INSERT INTO public.matches (external_id, home_team, away_team, group_name, stage, match_date) VALUES
-- Grupo A
('A-1','🇲🇽 México','🇿🇦 Sudáfrica','A','group','2026-06-11 20:00:00+00'),
('A-2','🇰🇷 Corea del Sur','🇨🇿 República Checa','A','group','2026-06-12 20:00:00+00'),
('A-3','🇲🇽 México','🇰🇷 Corea del Sur','A','group','2026-06-17 20:00:00+00'),
('A-4','🇿🇦 Sudáfrica','🇨🇿 República Checa','A','group','2026-06-17 23:00:00+00'),
('A-5','🇲🇽 México','🇨🇿 República Checa','A','group','2026-06-24 20:00:00+00'),
('A-6','🇿🇦 Sudáfrica','🇰🇷 Corea del Sur','A','group','2026-06-24 20:00:00+00'),
-- Grupo B
('B-1','🇨🇦 Canadá','🇧🇦 Bosnia y Herzegovina','B','group','2026-06-12 20:00:00+00'),
('B-2','🇶🇦 Catar','🇨🇭 Suiza','B','group','2026-06-13 20:00:00+00'),
('B-3','🇨🇦 Canadá','🇶🇦 Catar','B','group','2026-06-18 20:00:00+00'),
('B-4','🇧🇦 Bosnia y Herzegovina','🇨🇭 Suiza','B','group','2026-06-18 23:00:00+00'),
('B-5','🇨🇦 Canadá','🇨🇭 Suiza','B','group','2026-06-25 20:00:00+00'),
('B-6','🇧🇦 Bosnia y Herzegovina','🇶🇦 Catar','B','group','2026-06-25 20:00:00+00'),
-- Grupo C
('C-1','🇧🇷 Brasil','🇲🇦 Marruecos','C','group','2026-06-13 20:00:00+00'),
('C-2','🇭🇹 Haití','🏴󠁧󠁢󠁳󠁣󠁴󠁿 Escocia','C','group','2026-06-14 20:00:00+00'),
('C-3','🇧🇷 Brasil','🇭🇹 Haití','C','group','2026-06-19 20:00:00+00'),
('C-4','🇲🇦 Marruecos','🏴󠁧󠁢󠁳󠁣󠁴󠁿 Escocia','C','group','2026-06-19 23:00:00+00'),
('C-5','🇧🇷 Brasil','🏴󠁧󠁢󠁳󠁣󠁴󠁿 Escocia','C','group','2026-06-26 20:00:00+00'),
('C-6','🇲🇦 Marruecos','🇭🇹 Haití','C','group','2026-06-26 20:00:00+00'),
-- Grupo D
('D-1','🇺🇸 Estados Unidos','🇵🇾 Paraguay','D','group','2026-06-14 20:00:00+00'),
('D-2','🇦🇺 Australia','🇹🇷 Turquía','D','group','2026-06-15 20:00:00+00'),
('D-3','🇺🇸 Estados Unidos','🇦🇺 Australia','D','group','2026-06-20 20:00:00+00'),
('D-4','🇵🇾 Paraguay','🇹🇷 Turquía','D','group','2026-06-20 23:00:00+00'),
('D-5','🇺🇸 Estados Unidos','🇹🇷 Turquía','D','group','2026-06-27 20:00:00+00'),
('D-6','🇵🇾 Paraguay','🇦🇺 Australia','D','group','2026-06-27 20:00:00+00'),
-- Grupo E
('E-1','🇩🇪 Alemania','🇨🇼 Curazao','E','group','2026-06-15 20:00:00+00'),
('E-2','🇨🇮 Costa de Marfil','🇪🇨 Ecuador','E','group','2026-06-16 20:00:00+00'),
('E-3','🇩🇪 Alemania','🇨🇮 Costa de Marfil','E','group','2026-06-21 20:00:00+00'),
('E-4','🇨🇼 Curazao','🇪🇨 Ecuador','E','group','2026-06-21 23:00:00+00'),
('E-5','🇩🇪 Alemania','🇪🇨 Ecuador','E','group','2026-06-28 20:00:00+00'),
('E-6','🇨🇼 Curazao','🇨🇮 Costa de Marfil','E','group','2026-06-28 20:00:00+00'),
-- Grupo F
('F-1','🇳🇱 Países Bajos','🇯🇵 Japón','F','group','2026-06-16 20:00:00+00'),
('F-2','🇸🇪 Suecia','🇹🇳 Túnez','F','group','2026-06-17 20:00:00+00'),
('F-3','🇳🇱 Países Bajos','🇸🇪 Suecia','F','group','2026-06-22 20:00:00+00'),
('F-4','🇯🇵 Japón','🇹🇳 Túnez','F','group','2026-06-22 23:00:00+00'),
('F-5','🇳🇱 Países Bajos','🇹🇳 Túnez','F','group','2026-06-29 20:00:00+00'),
('F-6','🇯🇵 Japón','🇸🇪 Suecia','F','group','2026-06-29 20:00:00+00'),
-- Grupo G
('G-1','🇧🇪 Bélgica','🇪🇬 Egipto','G','group','2026-06-17 20:00:00+00'),
('G-2','🇮🇷 Irán','🇳🇿 Nueva Zelanda','G','group','2026-06-18 20:00:00+00'),
('G-3','🇧🇪 Bélgica','🇮🇷 Irán','G','group','2026-06-23 20:00:00+00'),
('G-4','🇪🇬 Egipto','🇳🇿 Nueva Zelanda','G','group','2026-06-23 23:00:00+00'),
('G-5','🇧🇪 Bélgica','🇳🇿 Nueva Zelanda','G','group','2026-06-30 20:00:00+00'),
('G-6','🇪🇬 Egipto','🇮🇷 Irán','G','group','2026-06-30 20:00:00+00'),
-- Grupo H
('H-1','🇪🇸 España','🇨🇻 Cabo Verde','H','group','2026-06-18 20:00:00+00'),
('H-2','🇸🇦 Arabia Saudita','🇺🇾 Uruguay','H','group','2026-06-19 20:00:00+00'),
('H-3','🇪🇸 España','🇸🇦 Arabia Saudita','H','group','2026-06-24 20:00:00+00'),
('H-4','🇨🇻 Cabo Verde','🇺🇾 Uruguay','H','group','2026-06-24 23:00:00+00'),
('H-5','🇪🇸 España','🇺🇾 Uruguay','H','group','2026-07-01 20:00:00+00'),
('H-6','🇨🇻 Cabo Verde','🇸🇦 Arabia Saudita','H','group','2026-07-01 20:00:00+00'),
-- Grupo I
('I-1','🇫🇷 Francia','🇸🇳 Senegal','I','group','2026-06-19 20:00:00+00'),
('I-2','🇮🇶 Irak','🇳🇴 Noruega','I','group','2026-06-20 20:00:00+00'),
('I-3','🇫🇷 Francia','🇮🇶 Irak','I','group','2026-06-25 20:00:00+00'),
('I-4','🇸🇳 Senegal','🇳🇴 Noruega','I','group','2026-06-25 23:00:00+00'),
('I-5','🇫🇷 Francia','🇳🇴 Noruega','I','group','2026-07-02 20:00:00+00'),
('I-6','🇸🇳 Senegal','🇮🇶 Irak','I','group','2026-07-02 20:00:00+00'),
-- Grupo J
('J-1','🇦🇷 Argentina','🇩🇿 Argelia','J','group','2026-06-20 20:00:00+00'),
('J-2','🇦🇹 Austria','🇯🇴 Jordania','J','group','2026-06-21 20:00:00+00'),
('J-3','🇦🇷 Argentina','🇦🇹 Austria','J','group','2026-06-26 20:00:00+00'),
('J-4','🇩🇿 Argelia','🇯🇴 Jordania','J','group','2026-06-26 23:00:00+00'),
('J-5','🇦🇷 Argentina','🇯🇴 Jordania','J','group','2026-07-03 20:00:00+00'),
('J-6','🇩🇿 Argelia','🇦🇹 Austria','J','group','2026-07-03 20:00:00+00'),
-- Grupo K
('K-1','🇵🇹 Portugal','🇨🇩 RD Congo','K','group','2026-06-21 20:00:00+00'),
('K-2','🇺🇿 Uzbekistán','🇨🇴 Colombia','K','group','2026-06-22 20:00:00+00'),
('K-3','🇵🇹 Portugal','🇺🇿 Uzbekistán','K','group','2026-06-27 20:00:00+00'),
('K-4','🇨🇩 RD Congo','🇨🇴 Colombia','K','group','2026-06-27 23:00:00+00'),
('K-5','🇵🇹 Portugal','🇨🇴 Colombia','K','group','2026-07-04 20:00:00+00'),
('K-6','🇨🇩 RD Congo','🇺🇿 Uzbekistán','K','group','2026-07-04 20:00:00+00'),
-- Grupo L
('L-1','🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra','🇭🇷 Croacia','L','group','2026-06-22 20:00:00+00'),
('L-2','🇬🇭 Ghana','🇵🇦 Panamá','L','group','2026-06-23 20:00:00+00'),
('L-3','🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra','🇬🇭 Ghana','L','group','2026-06-28 20:00:00+00'),
('L-4','🇭🇷 Croacia','🇵🇦 Panamá','L','group','2026-06-28 23:00:00+00'),
('L-5','🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra','🇵🇦 Panamá','L','group','2026-07-05 20:00:00+00'),
('L-6','🇭🇷 Croacia','🇬🇭 Ghana','L','group','2026-07-05 20:00:00+00')
ON CONFLICT (external_id) DO UPDATE SET
  home_team = EXCLUDED.home_team,
  away_team = EXCLUDED.away_team,
  group_name = EXCLUDED.group_name,
  stage = EXCLUDED.stage,
  match_date = EXCLUDED.match_date;

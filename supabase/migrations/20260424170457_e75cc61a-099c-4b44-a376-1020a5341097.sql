-- Tabla teams
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teams viewable by authenticated users"
  ON public.teams FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert teams"
  ON public.teams FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can update teams"
  ON public.teams FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can delete teams"
  ON public.teams FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

-- Seed equipos
INSERT INTO public.teams (name) VALUES
  ('Operaciones CDN'),
  ('Operaciones CDR'),
  ('Operaciones CDT'),
  ('Operaciones CDG'),
  ('Operaciones CDQ'),
  ('ecommerce'),
  ('Comercial'),
  ('IT'),
  ('Administración & Finanzas'),
  ('Gente & Cultura'),
  ('Mantenimiento'),
  ('Internacional'),
  ('Liquidaciones'),
  ('Tráfico')
ON CONFLICT (name) DO NOTHING;

-- Extender profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS avatar_seed text;

-- Actualizar handle_new_user para persistir metadata del registro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_team_id uuid;
  v_team_raw text;
BEGIN
  v_team_raw := NEW.raw_user_meta_data ->> 'team_id';
  IF v_team_raw IS NOT NULL AND v_team_raw <> '' THEN
    BEGIN
      v_team_id := v_team_raw::uuid;
    EXCEPTION WHEN others THEN
      v_team_id := NULL;
    END;
  END IF;

  INSERT INTO public.profiles (user_id, email, created_at, first_name, last_name, team_id, avatar_seed)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.created_at,
    NULLIF(NEW.raw_user_meta_data ->> 'first_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'last_name', ''),
    v_team_id,
    NULLIF(NEW.raw_user_meta_data ->> 'avatar_seed', '')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;
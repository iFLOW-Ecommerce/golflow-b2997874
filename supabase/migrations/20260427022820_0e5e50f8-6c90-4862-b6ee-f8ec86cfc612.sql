CREATE TABLE public.password_reset_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_hash text NOT NULL,
  created_by uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  used_at timestamptz,
  failed_attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_password_reset_codes_active
  ON public.password_reset_codes (user_id)
  WHERE used_at IS NULL;

CREATE INDEX idx_password_reset_codes_hash
  ON public.password_reset_codes (code_hash)
  WHERE used_at IS NULL;

ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view reset codes"
  ON public.password_reset_codes
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
  ));
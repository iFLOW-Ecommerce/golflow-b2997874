DO $$
DECLARE
  admin_uid uuid;
  existing_uid uuid;
BEGIN
  SELECT id INTO existing_uid FROM auth.users WHERE email = 'admin@prode.local' LIMIT 1;

  IF existing_uid IS NULL THEN
    admin_uid := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_uid,
      'authenticated',
      'authenticated',
      'admin@prode.local',
      crypt('MQ3vFJ11.2', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      false, false
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      admin_uid,
      jsonb_build_object('sub', admin_uid::text, 'email', 'admin@prode.local', 'email_verified', true),
      'email',
      admin_uid::text,
      now(), now(), now()
    );
  ELSE
    admin_uid := existing_uid;
  END IF;

  -- Desactivar trigger temporalmente para poder asignar el primer admin
  ALTER TABLE public.profiles DISABLE TRIGGER USER;

  INSERT INTO public.profiles (user_id, email, is_admin)
  VALUES (admin_uid, 'admin@prode.local', true)
  ON CONFLICT (user_id) DO UPDATE SET is_admin = true, email = 'admin@prode.local';

  UPDATE public.profiles SET is_admin = false WHERE user_id <> admin_uid AND is_admin = true;

  ALTER TABLE public.profiles ENABLE TRIGGER USER;
END $$;
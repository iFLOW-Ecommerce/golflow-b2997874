-- Promote gmolinaro to admin and remove admin@prode.local
ALTER TABLE public.profiles DISABLE TRIGGER USER;

UPDATE public.profiles
SET is_admin = true
WHERE email = 'gmolinaro@iflow21.com';

UPDATE public.profiles
SET is_admin = false
WHERE email = 'admin@prode.local';

ALTER TABLE public.profiles ENABLE TRIGGER USER;

-- Delete the admin@prode.local auth user (cascade removes profile and predictions)
DELETE FROM auth.users WHERE email = 'admin@prode.local';

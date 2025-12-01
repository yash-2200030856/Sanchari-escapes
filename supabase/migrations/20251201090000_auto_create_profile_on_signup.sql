-- Migration: Automatically create a profile row after a new auth user is created
-- This helps avoids client-side RLS race conditions where signUp may not have a session
-- so the app cannot insert into `profiles` immediately.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try to create a profile for the newly created auth.user.
  -- Catch and swallow errors so an unrelated failure (RLS/permission/etc.)
  -- does not make the auth INSERT fail with a 500.
  BEGIN
    INSERT INTO public.profiles (id, full_name, email, phone, created_at, updated_at)
    VALUES (
      NEW.id,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), 'New User'),
      NEW.email,
      NULL,
      now(),
      now()
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN
    -- Another process already created the profile; ignore.
    NULL;
  WHEN OTHERS THEN
    -- Log for debugging without aborting signup. RAISE NOTICE is safe here.
    RAISE NOTICE 'handle_new_auth_user error for user %: %', NEW.id, SQLERRM;
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- create the trigger on auth.users so it runs after an insert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_auth_user();
  END IF;
END$$;

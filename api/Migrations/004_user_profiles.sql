-- PokéScanner – user profiles
-- ═══════════════════════════════════════════════════════════════════════════

-- ── user_profiles table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name      TEXT NOT NULL,
    email_address  TEXT NOT NULL,
    is_admin       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique usernames (case-insensitive lookup via index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_user_name
    ON user_profiles (LOWER(user_name));

-- ── Row Level Security ────────────────────────────────────────────────────
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Helper function: check admin status without going through RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT is_admin FROM user_profiles WHERE user_id = auth.uid()),
        FALSE
    );
$$;

-- Users: full access to their own row
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own profile' AND tablename = 'user_profiles') THEN
    CREATE POLICY "Users manage own profile" ON user_profiles
        FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Admins: read all rows
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins read all profiles' AND tablename = 'user_profiles') THEN
    CREATE POLICY "Admins read all profiles" ON user_profiles
        FOR SELECT
        USING (public.is_admin());
  END IF;
END $$;

-- Admins: update all rows
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins update all profiles' AND tablename = 'user_profiles') THEN
    CREATE POLICY "Admins update all profiles" ON user_profiles
        FOR UPDATE
        USING (public.is_admin());
  END IF;
END $$;

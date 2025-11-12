-- Fix trigger and backfill missing user profiles
-- This migration ensures the trigger works correctly and creates profiles for existing users

-- First, ensure the trigger function is correct with proper permissions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'teacher')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error (check Supabase logs)
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: Create profiles for any auth.users that don't have profiles yet
-- This uses SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.backfill_user_profiles()
RETURNS void
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', ''),
    COALESCE((au.raw_user_meta_data->>'role')::user_role, 'teacher')
  FROM auth.users au
  LEFT JOIN public.users u ON au.id = u.id
  WHERE u.id IS NULL
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.backfill_user_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_user_profiles() TO service_role;

-- Run the backfill
SELECT public.backfill_user_profiles();

-- Ensure INSERT policy allows users to create their own profile
-- Simplified to avoid recursion - just check that the authenticated user is inserting their own profile
DROP POLICY IF EXISTS "Allow user profile creation on signup" ON users;
CREATE POLICY "Allow user profile creation on signup"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Clean up the backfill function (optional, or keep it for future use)
-- DROP FUNCTION IF EXISTS public.backfill_user_profiles();


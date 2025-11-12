-- Quick fix for infinite recursion error
-- Run this directly in Supabase SQL editor to fix the issue immediately

-- 1. Fix INSERT policy (simplify to avoid recursion)
DROP POLICY IF EXISTS "Allow user profile creation on signup" ON users;
CREATE POLICY "Allow user profile creation on signup"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. Fix admin SELECT policy (use SECURITY DEFINER function to avoid recursion)
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Create function to check admin status (bypasses RLS)
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
  user_role user_role;
BEGIN
  SELECT role INTO user_role
  FROM users
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role = 'admin', false);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_is_admin() TO anon;

-- Create admin policy using the function
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (public.check_is_admin());


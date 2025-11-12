-- Fix infinite recursion in admin SELECT policy
-- The admin policy queries the users table which causes recursion
-- Solution: Use a SECURITY DEFINER function that bypasses RLS

-- Drop the existing admin SELECT policy
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Create a SECURITY DEFINER function that bypasses RLS to check admin status
-- This prevents recursion because the function runs with elevated privileges
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
  -- This query bypasses RLS because of SECURITY DEFINER
  SELECT role INTO user_role
  FROM users
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role = 'admin', false);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_is_admin() TO anon;

-- Create admin policy using the SECURITY DEFINER function
-- This avoids recursion because the function bypasses RLS
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (public.check_is_admin());


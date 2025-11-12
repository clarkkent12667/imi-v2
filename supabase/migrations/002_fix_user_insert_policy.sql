-- Fix: Add INSERT policy for users table and ensure trigger function works
-- The trigger function uses SECURITY DEFINER which should bypass RLS,
-- but we add this policy as a safety measure

-- Drop policy if it exists (in case we're re-running)
DROP POLICY IF EXISTS "Allow user profile creation on signup" ON users;

-- Policy to allow user profile creation during signup
-- This allows inserts when the user ID being inserted exists in auth.users
-- In WITH CHECK, we can reference columns directly (they refer to the row being inserted)
CREATE POLICY "Allow user profile creation on signup"
  ON users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = id
    )
  );

-- Ensure the trigger function has proper permissions
-- SECURITY DEFINER functions run with the privileges of the function owner
-- This should already be set, but we ensure it's correct
ALTER FUNCTION public.handle_new_user() SECURITY DEFINER;


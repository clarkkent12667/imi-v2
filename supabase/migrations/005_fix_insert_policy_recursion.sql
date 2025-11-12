-- Fix infinite recursion in INSERT policy
-- The previous policy was causing recursion, so we simplify it

-- Drop the problematic policy
DROP POLICY IF EXISTS "Allow user profile creation on signup" ON users;

-- Create a simple INSERT policy that only checks authentication
-- This avoids recursion by not querying the users table
CREATE POLICY "Allow user profile creation on signup"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);


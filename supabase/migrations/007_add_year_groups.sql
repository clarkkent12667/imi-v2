-- Add year_groups table and update students table to reference it
-- This ensures consistency for analytics and reporting

-- Create year_groups table
CREATE TABLE IF NOT EXISTS year_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert common UK year groups (you can customize these)
INSERT INTO year_groups (name, display_order) VALUES
  ('Year 7', 7),
  ('Year 8', 8),
  ('Year 9', 9),
  ('Year 10', 10),
  ('Year 11', 11),
  ('Year 12', 12),
  ('Year 13', 13)
ON CONFLICT (name) DO NOTHING;

-- Add year_group_id column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS year_group_id UUID REFERENCES year_groups(id) ON DELETE SET NULL;

-- Migrate existing data: try to match existing school_year_group text to year_groups
-- This handles existing data migration
UPDATE students s
SET year_group_id = yg.id
FROM year_groups yg
WHERE s.school_year_group = yg.name
AND s.year_group_id IS NULL;

-- For any students that don't match, create a year group for them (optional)
-- Or you can manually fix these after migration

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_students_year_group_id ON students(year_group_id);

-- RLS Policies for year_groups
ALTER TABLE year_groups ENABLE ROW LEVEL SECURITY;

-- Everyone can view year groups (needed for dropdowns)
CREATE POLICY "Everyone can view year groups"
  ON year_groups FOR SELECT
  USING (true);

-- Only admins can manage year groups
-- Use the check_is_admin function to avoid recursion
CREATE POLICY "Admins can manage year groups"
  ON year_groups FOR ALL
  USING (public.check_is_admin());

-- Note: We keep school_year_group column for now for backward compatibility
-- You can remove it later after verifying all data is migrated


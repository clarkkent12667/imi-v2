-- Add user_departments junction table for many-to-many relationship
-- This allows teachers to be assigned to departments for easy grouping and scheduling

CREATE TABLE IF NOT EXISTS user_departments (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, department_id)
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_departments_user_id ON user_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_department_id ON user_departments(department_id);

-- RLS Policies for user_departments
ALTER TABLE user_departments ENABLE ROW LEVEL SECURITY;

-- Everyone can view user-department assignments
CREATE POLICY "Everyone can view user-department assignments"
  ON user_departments FOR SELECT
  USING (true);

-- Only admins can manage user-department assignments
CREATE POLICY "Admins can manage user-department assignments"
  ON user_departments FOR ALL
  USING (public.check_is_admin());


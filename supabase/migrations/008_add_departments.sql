  -- Add departments table
  -- Departments: Senior Department, Primary, Central

  CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Insert default departments
  INSERT INTO departments (name) VALUES
    ('Senior Department'),
    ('Primary'),
    ('Central')
  ON CONFLICT (name) DO NOTHING;

  -- Add department_id to classes table
  ALTER TABLE classes ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

  -- Add index for performance
  CREATE INDEX IF NOT EXISTS idx_classes_department_id ON classes(department_id);

  -- RLS Policies for departments
  ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

  -- Everyone can view departments (needed for dropdowns)
  CREATE POLICY "Everyone can view departments"
    ON departments FOR SELECT
    USING (true);

  -- Only admins can manage departments
  CREATE POLICY "Admins can manage departments"
    ON departments FOR ALL
    USING (public.check_is_admin());


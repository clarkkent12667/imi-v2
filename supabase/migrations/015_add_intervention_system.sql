-- Add parent contact information to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS parent_name TEXT,
ADD COLUMN IF NOT EXISTS parent_email TEXT,
ADD COLUMN IF NOT EXISTS parent_phone TEXT;

-- Create enum for intervention action types (if not exists)
DO $$ BEGIN
    CREATE TYPE intervention_action AS ENUM ('message', 'call', 'meeting');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for intervention status (if not exists)
DO $$ BEGIN
    CREATE TYPE intervention_status AS ENUM ('pending', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Table to track low points (red rows) per student
CREATE TABLE IF NOT EXISTS student_low_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  work_record_id UUID NOT NULL REFERENCES work_records(id) ON DELETE CASCADE,
  percentage NUMERIC(5, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, work_record_id) -- Prevent duplicate low points for same work record
);

-- Table to track intervention flags and actions
CREATE TABLE IF NOT EXISTS student_interventions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  flag_count INTEGER NOT NULL CHECK (flag_count >= 1 AND flag_count <= 3),
  action_type intervention_action NOT NULL,
  status intervention_status DEFAULT 'pending',
  low_points_count INTEGER NOT NULL, -- Number of low points that triggered this intervention
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_low_points_student ON student_low_points(student_id);
CREATE INDEX IF NOT EXISTS idx_student_low_points_work_record ON student_low_points(work_record_id);
CREATE INDEX IF NOT EXISTS idx_student_interventions_student ON student_interventions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_interventions_status ON student_interventions(status);
CREATE INDEX IF NOT EXISTS idx_student_interventions_created_by ON student_interventions(created_by);

-- Function to automatically create low points when work records are created/updated
CREATE OR REPLACE FUNCTION check_and_create_low_point()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create low point if percentage is > 0 and < 80
  IF NEW.percentage > 0 AND NEW.percentage < 80 THEN
    INSERT INTO student_low_points (student_id, work_record_id, percentage)
    VALUES (NEW.student_id, NEW.id, NEW.percentage)
    ON CONFLICT (student_id, work_record_id) DO UPDATE
    SET percentage = NEW.percentage;
  ELSE
    -- Remove low point if percentage is now >= 80
    DELETE FROM student_low_points 
    WHERE work_record_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically track low points
DROP TRIGGER IF EXISTS work_record_low_point_tracker ON work_records;
CREATE TRIGGER work_record_low_point_tracker
AFTER INSERT OR UPDATE OF percentage, marks_obtained, total_marks ON work_records
FOR EACH ROW
EXECUTE FUNCTION check_and_create_low_point();

-- Function to check and create interventions based on low point count
CREATE OR REPLACE FUNCTION check_and_create_intervention()
RETURNS TRIGGER AS $$
DECLARE
  low_count INTEGER;
  current_flag_count INTEGER;
  action_type_val intervention_action;
BEGIN
  -- Count low points for this student
  SELECT COUNT(*) INTO low_count
  FROM student_low_points
  WHERE student_id = NEW.student_id;
  
  -- Determine action type and flag count based on low point count
  IF low_count >= 5 THEN
    action_type_val := 'meeting';
    current_flag_count := 3;
  ELSIF low_count >= 4 THEN
    action_type_val := 'call';
    current_flag_count := 2;
  ELSIF low_count >= 3 THEN
    action_type_val := 'message';
    current_flag_count := 1;
  ELSE
    -- Not enough low points for intervention
    RETURN NEW;
  END IF;
  
  -- Check if intervention already exists for this flag count
  IF NOT EXISTS (
    SELECT 1 FROM student_interventions
    WHERE student_id = NEW.student_id
    AND flag_count = current_flag_count
    AND status = 'pending'
  ) THEN
    -- Create new intervention
    -- Try to get an admin user, or use the first user if no admin exists
    INSERT INTO student_interventions (
      student_id,
      flag_count,
      action_type,
      low_points_count,
      created_by,
      status
    )
    SELECT 
      NEW.student_id,
      current_flag_count,
      action_type_val,
      low_count,
      COALESCE(
        (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
        (SELECT id FROM users LIMIT 1)
      ),
      'pending'
    WHERE EXISTS (SELECT 1 FROM users LIMIT 1);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create interventions
DROP TRIGGER IF EXISTS low_point_intervention_tracker ON student_low_points;
CREATE TRIGGER low_point_intervention_tracker
AFTER INSERT ON student_low_points
FOR EACH ROW
EXECUTE FUNCTION check_and_create_intervention();

-- RLS Policies
ALTER TABLE student_low_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_interventions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all low points" ON student_low_points;
DROP POLICY IF EXISTS "Admins can manage all interventions" ON student_interventions;
DROP POLICY IF EXISTS "Teachers can view low points for their students" ON student_low_points;
DROP POLICY IF EXISTS "Teachers can view interventions for their students" ON student_interventions;
DROP POLICY IF EXISTS "Teachers can update interventions for their students" ON student_interventions;

-- Admins can view all low points and interventions
CREATE POLICY "Admins can view all low points"
  ON student_low_points FOR SELECT
  USING (public.check_is_admin());

CREATE POLICY "Admins can manage all interventions"
  ON student_interventions FOR ALL
  USING (public.check_is_admin());

-- Teachers can view low points and interventions for their students
CREATE POLICY "Teachers can view low points for their students"
  ON student_low_points FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM work_records wr
      JOIN classes c ON wr.class_id = c.id
      WHERE wr.id = student_low_points.work_record_id
      AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view interventions for their students"
  ON student_interventions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_students cs
      JOIN classes c ON cs.class_id = c.id
      WHERE cs.student_id = student_interventions.student_id
      AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update interventions for their students"
  ON student_interventions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM class_students cs
      JOIN classes c ON cs.class_id = c.id
      WHERE cs.student_id = student_interventions.student_id
      AND c.teacher_id = auth.uid()
    )
  );


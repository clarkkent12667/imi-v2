-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'teacher');
CREATE TYPE work_type AS ENUM ('homework', 'classwork');

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Students table
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  school_year_group TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Taxonomy tables
CREATE TABLE qualifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE exam_boards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  qualification_id UUID NOT NULL REFERENCES qualifications(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, qualification_id)
);

CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  exam_board_id UUID NOT NULL REFERENCES exam_boards(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, exam_board_id)
);

CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, subject_id)
);

CREATE TABLE subtopics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, topic_id)
);

-- Classes table
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Class Students (many-to-many)
CREATE TABLE class_students (
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  PRIMARY KEY (class_id, student_id)
);

-- Class Schedules table
CREATE TABLE class_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (end_time > start_time)
);

-- Work Records table
CREATE TABLE work_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_type work_type NOT NULL,
  work_title TEXT NOT NULL,
  qualification_id UUID NOT NULL REFERENCES qualifications(id) ON DELETE CASCADE,
  exam_board_id UUID NOT NULL REFERENCES exam_boards(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  subtopic_id UUID REFERENCES subtopics(id) ON DELETE SET NULL,
  assigned_date DATE NOT NULL,
  due_date DATE NOT NULL,
  marks_obtained NUMERIC(10, 2) DEFAULT 0,
  total_marks NUMERIC(10, 2) NOT NULL,
  percentage NUMERIC(5, 2) GENERATED ALWAYS AS (
    CASE 
      WHEN total_marks > 0 THEN ROUND((marks_obtained / total_marks) * 100, 2)
      ELSE 0
    END
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_exam_boards_qualification ON exam_boards(qualification_id);
CREATE INDEX idx_subjects_exam_board ON subjects(exam_board_id);
CREATE INDEX idx_topics_subject ON topics(subject_id);
CREATE INDEX idx_subtopics_topic ON subtopics(topic_id);
CREATE INDEX idx_class_students_class ON class_students(class_id);
CREATE INDEX idx_class_students_student ON class_students(student_id);
CREATE INDEX idx_class_schedules_class ON class_schedules(class_id);
CREATE INDEX idx_work_records_class ON work_records(class_id);
CREATE INDEX idx_work_records_student ON work_records(student_id);
CREATE INDEX idx_work_records_teacher ON work_records(teacher_id);
CREATE INDEX idx_work_records_subject ON work_records(subject_id);
CREATE INDEX idx_work_records_assigned_date ON work_records(assigned_date);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_records ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Students policies
CREATE POLICY "Admins can manage all students"
  ON students FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Teachers can view students in their classes"
  ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_students cs
      JOIN classes c ON cs.class_id = c.id
      WHERE cs.student_id = students.id
      AND c.teacher_id = auth.uid()
    )
  );

-- Taxonomy policies (read-only for teachers, full access for admins)
CREATE POLICY "Everyone can view taxonomy"
  ON qualifications FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage qualifications"
  ON qualifications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Everyone can view exam boards"
  ON exam_boards FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage exam boards"
  ON exam_boards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Everyone can view subjects"
  ON subjects FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage subjects"
  ON subjects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Everyone can view topics"
  ON topics FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage topics"
  ON topics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Everyone can view subtopics"
  ON subtopics FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage subtopics"
  ON subtopics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Classes policies
CREATE POLICY "Teachers can view their own classes"
  ON classes FOR SELECT
  USING (teacher_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Admins can view all classes"
  ON classes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage classes"
  ON classes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Class Students policies
CREATE POLICY "Teachers can view students in their classes"
  ON class_students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE id = class_students.class_id
      AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage class students"
  ON class_students FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Class Schedules policies
CREATE POLICY "Teachers can view schedules for their classes"
  ON class_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE id = class_schedules.class_id
      AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage schedules"
  ON class_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Work Records policies
CREATE POLICY "Teachers can view work records for their classes"
  ON work_records FOR SELECT
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can manage work records"
  ON work_records FOR ALL
  USING (teacher_id = auth.uid());

CREATE POLICY "Admins can view all work records"
  ON work_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'teacher')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


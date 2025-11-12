-- Add subject_id and year_group_id to classes table
-- These fields link classes to subjects and year groups

-- Add subject_id column to classes table
ALTER TABLE classes ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;

-- Add year_group_id column to classes table
ALTER TABLE classes ADD COLUMN IF NOT EXISTS year_group_id UUID REFERENCES year_groups(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_classes_subject_id ON classes(subject_id);
CREATE INDEX IF NOT EXISTS idx_classes_year_group_id ON classes(year_group_id);


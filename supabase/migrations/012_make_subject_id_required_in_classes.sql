-- Make subject_id required (NOT NULL) in classes table
-- This ensures every class has a subject for scheduling, analytics, and auto-filling work records

-- Note: This migration will fail if there are existing classes with NULL subject_id.
-- Before running this migration, ensure all classes have a subject assigned.
-- You can check for NULL values with: SELECT id, name FROM classes WHERE subject_id IS NULL;

-- Update the foreign key constraint to use ON DELETE RESTRICT instead of SET NULL
-- since subject_id will be required
ALTER TABLE classes 
  DROP CONSTRAINT IF EXISTS classes_subject_id_fkey;

-- Make subject_id NOT NULL
ALTER TABLE classes 
  ALTER COLUMN subject_id SET NOT NULL;

-- Recreate the foreign key constraint with RESTRICT
ALTER TABLE classes 
  ADD CONSTRAINT classes_subject_id_fkey 
  FOREIGN KEY (subject_id) 
  REFERENCES subjects(id) 
  ON DELETE RESTRICT;


-- Add status enum type
CREATE TYPE work_status AS ENUM ('not_submitted', 'submitted', 'resit', 're_assigned');

-- Add status column to work_records
ALTER TABLE work_records 
ADD COLUMN status work_status DEFAULT 'not_submitted';

-- Add year column for past papers
ALTER TABLE work_records 
ADD COLUMN year INTEGER;

-- Create index for status
CREATE INDEX idx_work_records_status ON work_records(status);


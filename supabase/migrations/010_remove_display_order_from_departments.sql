-- Remove display_order column from departments table
-- This migration safely drops the column if it exists

ALTER TABLE departments DROP COLUMN IF EXISTS display_order;


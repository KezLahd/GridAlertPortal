-- Migration: Add location, latitude, longitude columns to companies table
-- Remove logo_url column

-- Add new columns for company location
ALTER TABLE gridalert.companies 
  ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Remove logo_url column
ALTER TABLE gridalert.companies 
  DROP COLUMN IF EXISTS logo_url;

-- Update any existing companies to have empty location (they'll need to update)
UPDATE gridalert.companies 
SET location = '' 
WHERE location IS NULL;

-- Add comment to document the purpose of these columns
COMMENT ON COLUMN gridalert.companies.location IS 'Company address used to center the map for this company';
COMMENT ON COLUMN gridalert.companies.latitude IS 'Geocoded latitude of company location';
COMMENT ON COLUMN gridalert.companies.longitude IS 'Geocoded longitude of company location';

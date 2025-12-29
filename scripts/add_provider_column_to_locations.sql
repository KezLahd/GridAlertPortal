-- Add provider column to locations table
ALTER TABLE IF EXISTS gridalert.locations
  ADD COLUMN IF NOT EXISTS provider text;

-- Add index for provider column
CREATE INDEX IF NOT EXISTS idx_locations_provider 
  ON gridalert.locations USING btree (provider) 
  TABLESPACE pg_default;


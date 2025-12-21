-- Cleanup locations table to only have the 17 CSV columns plus id, company_id, created_at, updated_at
-- This removes the old columns: poi_name, street_address, city, state, postcode, country, 
-- contact_name, contact_email, contact_phone, longitude, latitude

BEGIN;

-- Drop old columns that are not part of the CSV import schema
ALTER TABLE IF EXISTS gridalert.locations
  DROP COLUMN IF EXISTS poi_name,
  DROP COLUMN IF EXISTS street_address,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS state,
  DROP COLUMN IF EXISTS postcode,
  DROP COLUMN IF EXISTS country,
  DROP COLUMN IF EXISTS contact_name,
  DROP COLUMN IF EXISTS contact_email,
  DROP COLUMN IF EXISTS contact_phone,
  DROP COLUMN IF EXISTS longitude,
  DROP COLUMN IF EXISTS latitude;

COMMIT;

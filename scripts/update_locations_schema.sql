-- Update the locations table to the new schema.
-- This script is additive and safe to re-run; it only adds columns if they are missing.
-- It keeps existing data/columns; remove old columns separately if desired.

BEGIN;

-- Required base columns
ALTER TABLE IF EXISTS gridalert.locations
  ADD COLUMN IF NOT EXISTS company_id uuid NOT NULL,
  ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- New schema columns
ALTER TABLE IF EXISTS gridalert.locations
  ADD COLUMN IF NOT EXISTS institutionCode text,
  ADD COLUMN IF NOT EXISTS institutionName text,
  ADD COLUMN IF NOT EXISTS institutionNickname text,
  ADD COLUMN IF NOT EXISTS pharmacyId text,
  ADD COLUMN IF NOT EXISTS institutionEmail text,
  ADD COLUMN IF NOT EXISTS institutionMappedState text,
  ADD COLUMN IF NOT EXISTS institutionStatus text,
  ADD COLUMN IF NOT EXISTS siteKeyAccess text,
  ADD COLUMN IF NOT EXISTS institutionPhoneNo text,
  ADD COLUMN IF NOT EXISTS addressLine1 text,
  ADD COLUMN IF NOT EXISTS addressLine2 text,
  ADD COLUMN IF NOT EXISTS addressLine3 text,
  ADD COLUMN IF NOT EXISTS addressSuburb text,
  ADD COLUMN IF NOT EXISTS addressPostcode text,
  ADD COLUMN IF NOT EXISTS addressState text,
  ADD COLUMN IF NOT EXISTS addressLongitude double precision,
  ADD COLUMN IF NOT EXISTS addressLatitude double precision;

-- Constraints (conditional because ADD CONSTRAINT doesn't support IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE c.conname = 'locations_pkey'
      AND t.relname = 'locations'
      AND n.nspname = 'gridalert'
  ) THEN
    ALTER TABLE gridalert.locations
      ADD CONSTRAINT locations_pkey PRIMARY KEY (id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE c.conname = 'locations_company_id_fkey'
      AND t.relname = 'locations'
      AND n.nspname = 'gridalert'
  ) THEN
    ALTER TABLE gridalert.locations
      ADD CONSTRAINT locations_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES gridalert.companies (id) ON DELETE CASCADE;
  END IF;
END$$;

COMMIT;

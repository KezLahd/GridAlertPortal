-- Fix companies table structure and add missing RLS policies
-- Run this to update the companies table schema

-- Add missing columns if they don't exist
ALTER TABLE gridalert.companies 
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- Make location required
ALTER TABLE gridalert.companies 
  ALTER COLUMN location SET NOT NULL;

-- Drop the logo_url column if it exists (since we replaced it with location)
ALTER TABLE gridalert.companies 
  DROP COLUMN IF EXISTS logo_url;

-- Add INSERT policy for companies table
-- Allow authenticated users to insert companies
DROP POLICY IF EXISTS companies_insert_authenticated ON gridalert.companies;
CREATE POLICY companies_insert_authenticated ON gridalert.companies
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Add UPDATE policy for companies table (allow company admins to update)
DROP POLICY IF EXISTS companies_update_admin ON gridalert.companies;
CREATE POLICY companies_update_admin ON gridalert.companies
  FOR UPDATE
  TO authenticated
  USING (
    gridalert.is_company_admin(auth.uid(), id)
  );

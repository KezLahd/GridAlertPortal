-- Add INSERT policy for locations table
-- Run this in Supabase SQL editor (schema: gridalert)

-- Drop existing policy if it exists
drop policy if exists locations_insert_company_member on gridalert.locations;

-- Allow users to insert locations for their company
create policy locations_insert_company_member on gridalert.locations
  for insert
  to authenticated
  with check (
    gridalert.same_company(auth.uid(), company_id)
  );


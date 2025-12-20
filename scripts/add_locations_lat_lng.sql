-- Add longitude and latitude columns to locations table for Google Maps caching
-- Run this in Supabase SQL editor (schema: gridalert)

alter table gridalert.locations 
add column if not exists longitude double precision,
add column if not exists latitude double precision;

-- Add comment to document the purpose
comment on column gridalert.locations.longitude is 'Longitude coordinate for Google Maps caching';
comment on column gridalert.locations.latitude is 'Latitude coordinate for Google Maps caching';


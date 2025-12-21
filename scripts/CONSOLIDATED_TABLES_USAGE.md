# Consolidated Tables Usage Guide

## Overview

The consolidated tables (`unplanned_outages_consolidated`, `current_planned_outages_consolidated`, `future_planned_outages_consolidated`) combine data from all 13 provider tables into single, queryable tables.

## What Data is Stored

Each consolidated table contains normalized data from all providers with these common fields:

- `id` - Unique identifier (TEXT)
- `provider` - Provider name (TEXT): "Ausgrid", "Endeavour", "Energex", etc.
- `statusheading` - Status description (TEXT)
- `area_suburb` - Affected area/suburb (TEXT)
- `cause` - Outage cause/reason (TEXT)
- `customers_affected` - Number of affected customers (TEXT)
- `estimated_finish_time` / `end_date_time` - When outage will end (TIMESTAMPTZ)
- `start_time` / `start_date_time` - When outage started (TIMESTAMPTZ)
- `status` - Current status (TEXT)
- `latitude` / `longitude` - Geographic coordinates (NUMERIC)
- `state` - Australian state (TEXT)
- `streets_affected` - Affected streets (TEXT)
- `polygon_geojson` - Geographic polygon data (JSONB)
- `incident_id` - Provider's incident ID (TEXT)
- `suburbs` - Suburbs array (JSONB)
- `postcodes` - Postcodes array (JSONB)
- `reason` - Outage reason (TEXT)
- `consolidated_at` - When record was last refreshed (TIMESTAMPTZ)

## How to Query the Tables

### Basic Query (All Outages)

\`\`\`sql
SELECT * FROM gridalert.unplanned_outages_consolidated;
SELECT * FROM gridalert.current_planned_outages_consolidated;
SELECT * FROM gridalert.future_planned_outages_consolidated;
\`\`\`

### Filter by Provider

\`\`\`sql
SELECT * FROM gridalert.unplanned_outages_consolidated 
WHERE provider = 'Ausgrid';
\`\`\`

### Filter by State

\`\`\`sql
SELECT * FROM gridalert.unplanned_outages_consolidated 
WHERE state = 'NSW';
\`\`\`

### Filter by Date Range

\`\`\`sql
SELECT * FROM gridalert.current_planned_outages_consolidated 
WHERE start_date_time >= '2024-01-01' 
  AND end_date_time <= '2024-12-31';
\`\`\`

### Count Outages by Provider

\`\`\`sql
SELECT provider, COUNT(*) as outage_count 
FROM gridalert.unplanned_outages_consolidated 
GROUP BY provider 
ORDER BY outage_count DESC;
\`\`\`

## How to Use in Frontend (Supabase Client)

### Replace Old Queries

**OLD WAY (13 separate queries):**
\`\`\`typescript
const [ausgridRes, endeavourRes, energexRes, ...] = await Promise.all([
  supabase.from("ausgrid_unplanned_outages").select("*"),
  supabase.from("endeavour_current_unplanned_outages").select("*"),
  supabase.from("energex_current_unplanned_outages").select("*"),
  // ... 10 more queries
]);
\`\`\`

**NEW WAY (1 query):**
\`\`\`typescript
const { data, error } = await supabase
  .from("unplanned_outages_consolidated")
  .select("*");
\`\`\`

### Filter by Provider in Frontend

\`\`\`typescript
const { data, error } = await supabase
  .from("unplanned_outages_consolidated")
  .select("*")
  .eq("provider", "Ausgrid");
\`\`\`

### Filter by Multiple Providers

\`\`\`typescript
const { data, error } = await supabase
  .from("unplanned_outages_consolidated")
  .select("*")
  .in("provider", ["Ausgrid", "Endeavour", "Energex"]);
\`\`\`

### Filter by State

\`\`\`typescript
const { data, error } = await supabase
  .from("unplanned_outages_consolidated")
  .select("*")
  .eq("state", "NSW");
\`\`\`

### Get Outages Near Location (using coordinates)

\`\`\`typescript
const { data, error } = await supabase
  .from("unplanned_outages_consolidated")
  .select("*")
  .not("latitude", "is", null)
  .not("longitude", "is", null);
\`\`\`

## How to Refresh the Tables

### Manual Refresh

Run these functions in Supabase SQL Editor:

\`\`\`sql
SELECT gridalert.refresh_unplanned_outages_consolidated();
SELECT gridalert.refresh_current_planned_outages_consolidated();
SELECT gridalert.refresh_future_planned_outages_consolidated();
\`\`\`

### Automatic Refresh (pg_cron)

If pg_cron is enabled in Supabase:

\`\`\`sql
-- Refresh every 5 minutes
SELECT cron.schedule(
  'refresh-unplanned-outages',
  '*/5 * * * *',
  $$SELECT gridalert.refresh_unplanned_outages_consolidated()$$
);

SELECT cron.schedule(
  'refresh-current-planned-outages',
  '*/5 * * * *',
  $$SELECT gridalert.refresh_current_planned_outages_consolidated()$$
);

SELECT cron.schedule(
  'refresh-future-planned-outages',
  '*/5 * * * *',
  $$SELECT gridalert.refresh_future_planned_outages_consolidated()$$
);
\`\`\`

### Refresh from Backend/Node.js

\`\`\`typescript
// Using Supabase client
const { error } = await supabase.rpc('refresh_unplanned_outages_consolidated');
const { error } = await supabase.rpc('refresh_current_planned_outages_consolidated');
const { error } = await supabase.rpc('refresh_future_planned_outages_consolidated');
\`\`\`

## Provider-Specific Data Transformations

The consolidated tables normalize data from each provider:

### Ausgrid
- Uses `id` and `webid` (no `incident_id`)
- No `latitude`/`longitude` (geocoded separately)
- Uses `street_affected` (singular)

### Endeavour
- Uses `incident_id` (not `outage_id`)
- Has `latitude`/`longitude` columns
- Filters out `status = 'OUTAGE COMPLETED'`

### Energex / Ergon
- Uses `event_id` (not `outage_id`)
- Has `point_lat`/`point_lng` mapped to `latitude`/`longitude`
- `suburbs` is TEXT (converted to string)

### SA Power
- Uses `job_id` (not `outage_id`)
- `affected_suburbs` is JSONB array (converted to comma-separated string)
- Has `feeders` JSONB array

### Horizon Power / WPower
- Uses `outage_id`
- `service_areas`/`areas` is JSONB array (converted to string)
- WA state defaults

### AusNet
- Uses `incident_id`
- `suburbs` and `postcodes` are TEXT[] arrays (converted to JSONB)
- Complex filtering: excludes MERGED/RESTORED, only IN PROGRESS/EMERGENCY REPAIR
- 7-day recency filter on `status_last_updated`

### CitiPowerCor / Essential Energy / Jemena / UnitedEnergy / TasNetworks
- Uses `outage_id`
- Various array fields converted to strings or JSONB
- State defaults applied (VIC, NSW, TAS)

## Displaying Data in Frontend

### Map Display

\`\`\`typescript
// Get outages with coordinates
const { data: outages } = await supabase
  .from("unplanned_outages_consolidated")
  .select("*")
  .not("latitude", "is", null)
  .not("longitude", "is", null);

// Display on map
outages.forEach(outage => {
  map.addMarker({
    lat: outage.latitude,
    lng: outage.longitude,
    title: outage.area_suburb,
    provider: outage.provider
  });
});
\`\`\`

### List Display

\`\`\`typescript
// Get all outages
const { data: outages } = await supabase
  .from("unplanned_outages_consolidated")
  .select("*")
  .order("start_time", { ascending: false });

// Group by provider
const grouped = outages.reduce((acc, outage) => {
  if (!acc[outage.provider]) acc[outage.provider] = [];
  acc[outage.provider].push(outage);
  return acc;
}, {});
\`\`\`

### Statistics

\`\`\`typescript
// Total outages
const { count } = await supabase
  .from("unplanned_outages_consolidated")
  .select("*", { count: "exact", head: true });

// Outages by provider
const { data } = await supabase
  .from("unplanned_outages_consolidated")
  .select("provider")
  .then(results => {
    // Count in JavaScript or use SQL aggregation
  });
\`\`\`

## Performance Tips

1. **Use Indexes**: The tables have indexes on `provider`, `start_time`, `state` - use these in WHERE clauses
2. **Limit Results**: Use `.limit()` for pagination
3. **Select Specific Columns**: Use `.select("id, provider, area_suburb")` instead of `*`
4. **Refresh Frequency**: Refresh every 5-10 minutes (matches your data update frequency)

## Migration from Views

If you were using views before:

**OLD:**
\`\`\`typescript
supabase.from("unplanned_outages").select("*")
\`\`\`

**NEW:**
\`\`\`typescript
supabase.from("unplanned_outages_consolidated").select("*")
\`\`\`

The data structure is identical, so no frontend changes needed except the table name!

## Troubleshooting

### Data is Stale
- Run the refresh functions manually
- Check if scheduled refresh is running
- Verify refresh functions have proper permissions

### Missing Providers
- Check if source tables have data
- Verify provider name matches exactly (case-sensitive)
- Check refresh function logs for errors

### Type Errors
- All fields are normalized to common types
- `customers_affected` is always TEXT
- `suburbs`/`postcodes` are always JSONB (or NULL)
- Timestamps are always TIMESTAMPTZ

## Summary

1. **Query**: Use `unplanned_outages_consolidated`, `current_planned_outages_consolidated`, `future_planned_outages_consolidated`
2. **Refresh**: Call refresh functions every 5-10 minutes
3. **Filter**: Use standard Supabase filters (`.eq()`, `.in()`, `.gte()`, etc.)
4. **Display**: Data structure matches old views, just change table name

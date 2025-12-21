-- Create a live view that consolidates all unplanned outages from all providers
-- This view automatically updates when any source table changes

CREATE OR REPLACE VIEW gridalert.unplanned_outages AS
SELECT 
  -- Common fields
  COALESCE(id::text, webid::text) as id,
  'Ausgrid'::text as provider,
  statusheading as statusheading,
  area_suburb as area_suburb,
  cause as cause,
  customers_affected::text as customers_affected,
  estimated_finish_time as estimated_finish_time,
  start_time as start_time,
  webid::text as webid,
  status as status,
  NULL::numeric as latitude,
  NULL::numeric as longitude,
  NULL::text as geocoded_address,
  NULL::text as state,
  NULL::text as streets_affected,
  NULL::jsonb as polygon_geojson,
  NULL::text as incident_id,
  NULL::jsonb as suburbs,
  NULL::jsonb as postcodes,
  NULL::text as reason
FROM gridalert.ausgrid_unplanned_outages

UNION ALL

SELECT 
  COALESCE(id::text, incident_id::text) as id,
  'Endeavour'::text as provider,
  status as statusheading,
  suburb as area_suburb,
  reason as cause,
  number_customers_affected::text as customers_affected,
  end_date_time as estimated_finish_time,
  start_date_time as start_time,
  NULL::text as webid,
  status as status,
  latitude::numeric as latitude,
  longitude::numeric as longitude,
  NULL::text as geocoded_address,
  NULL::text as state,
  NULL::text as streets_affected,
  NULL::jsonb as polygon_geojson,
  incident_id::text as incident_id,
  NULL::jsonb as suburbs,
  NULL::jsonb as postcodes,
  reason as reason
FROM gridalert.endeavour_current_unplanned_outages
WHERE status != 'OUTAGE COMPLETED'

UNION ALL

SELECT 
  COALESCE(id::text, event_id::text) as id,
  'Energex'::text as provider,
  status as statusheading,
  suburbs as area_suburb,
  reason as cause,
  customers_affected::text as customers_affected,
  est_fix_time as estimated_finish_time,
  start_time as start_time,
  NULL::text as webid,
  status as status,
  point_lat::numeric as latitude,
  point_lng::numeric as longitude,
  NULL::text as geocoded_address,
  state as state,
  COALESCE(streets, '') as streets_affected,
  polygon_geojson as polygon_geojson,
  event_id::text as incident_id,
  NULL::jsonb as suburbs,
  NULL::jsonb as postcodes,
  reason as reason
FROM gridalert.energex_current_unplanned_outages

UNION ALL

SELECT 
  COALESCE(id::text, event_id::text) as id,
  'Ergon'::text as provider,
  status as statusheading,
  suburbs as area_suburb,
  reason as cause,
  customers_affected::text as customers_affected,
  est_fix_time as estimated_finish_time,
  start_time as start_time,
  NULL::text as webid,
  status as status,
  point_lat::numeric as latitude,
  point_lng::numeric as longitude,
  NULL::text as geocoded_address,
  state as state,
  COALESCE(streets, '') as streets_affected,
  polygon_geojson as polygon_geojson,
  event_id::text as incident_id,
  NULL::jsonb as suburbs,
  NULL::jsonb as postcodes,
  reason as reason
FROM gridalert.ergon_current_unplanned_outages

UNION ALL

SELECT 
  COALESCE(id::text, job_id::text) as id,
  'SA Power'::text as provider,
  status as statusheading,
  CASE 
    WHEN affected_suburbs IS NULL THEN 'Unknown area'
    WHEN jsonb_typeof(affected_suburbs) = 'array' THEN 
      (SELECT string_agg(value::text, ', ') FROM jsonb_array_elements_text(affected_suburbs))
    ELSE affected_suburbs::text
  END as area_suburb,
  reason as cause,
  affected_customers::text as customers_affected,
  est_restoration as estimated_finish_time,
  start_time as start_time,
  NULL::text as webid,
  status as status,
  point_lat::numeric as latitude,
  point_lng::numeric as longitude,
  NULL::text as geocoded_address,
  state as state,
  NULL::text as streets_affected,
  polygon_geojson as polygon_geojson,
  job_id::text as incident_id,
  affected_suburbs as suburbs,
  NULL::jsonb as postcodes,
  reason as reason
FROM gridalert.sapower_current_unplanned_outages

UNION ALL

SELECT 
  COALESCE(outage_id::text, id::text) as id,
  'Horizon Power'::text as provider,
  status as statusheading,
  COALESCE(service_area, region, 
    CASE 
      WHEN service_areas IS NOT NULL AND jsonb_typeof(service_areas) = 'array' THEN
        (SELECT string_agg(value::text, ', ') FROM jsonb_array_elements_text(service_areas))
      ELSE NULL
    END,
    'Unknown area'
  ) as area_suburb,
  COALESCE(outage_type, status, 'Unplanned outage') as cause,
  affected_customers::text as customers_affected,
  estimated_restore_time as estimated_finish_time,
  start_time as start_time,
  NULL::text as webid,
  status as status,
  point_lat::numeric as latitude,
  point_lng::numeric as longitude,
  NULL::text as geocoded_address,
  COALESCE(state, 'WA') as state,
  NULL::text as streets_affected,
  NULL::jsonb as polygon_geojson,
  outage_id::text as incident_id,
  NULL::jsonb as suburbs,
  NULL::jsonb as postcodes,
  NULL::text as reason
FROM gridalert.horizon_current_unplanned_outages

UNION ALL

SELECT 
  COALESCE(outage_id::text, id::text) as id,
  'WPower'::text as provider,
  COALESCE(outage_updated_time::text, outage_type, 'In progress') as statusheading,
  CASE 
    WHEN areas IS NOT NULL AND jsonb_typeof(areas) = 'array' THEN
      (SELECT string_agg(value::text, ', ') FROM jsonb_array_elements_text(areas))
    ELSE 'Unknown area'
  END as area_suburb,
  COALESCE(outage_type, 'Unplanned outage') as cause,
  affected_customers::text as customers_affected,
  restoration_time as estimated_finish_time,
  start_time as start_time,
  NULL::text as webid,
  outage_type as status,
  point_lat::numeric as latitude,
  point_lng::numeric as longitude,
  NULL::text as geocoded_address,
  COALESCE(state, 'WA') as state,
  NULL::text as streets_affected,
  polygon_geojson as polygon_geojson,
  outage_id::text as incident_id,
  NULL::jsonb as suburbs,
  NULL::jsonb as postcodes,
  NULL::text as reason
FROM gridalert.wpower_current_unplanned_outages

UNION ALL

SELECT 
  COALESCE(incident_id::text, id::text) as id,
  'AusNet'::text as provider,
  COALESCE(status, incident_status, 'In progress') as statusheading,
  CASE 
    WHEN suburbs IS NOT NULL AND array_length(suburbs, 1) > 0 THEN
      array_to_string(suburbs, ', ')
    ELSE COALESCE(incident, 'Unknown area')
  END as area_suburb,
  COALESCE(cause, details, 'Unplanned outage') as cause,
  COALESCE(customers_affected, 
    CASE 
      WHEN impacted_nmi IS NOT NULL AND jsonb_typeof(impacted_nmi) = 'array' THEN jsonb_array_length(impacted_nmi)
      ELSE 0
    END
  )::text as customers_affected,
  COALESCE(latest_estimated_time_to_restoration, initial_estimated_time_to_restoration) as estimated_finish_time,
  unplanned_start_time as start_time,
  NULL::text as webid,
  COALESCE(status, incident_status, 'In progress') as status,
  point_lat::numeric as latitude,
  point_lng::numeric as longitude,
  NULL::text as geocoded_address,
  COALESCE(state, 'VIC') as state,
  NULL::text as streets_affected,
  NULL::jsonb as polygon_geojson,
  incident_id::text as incident_id,
  CASE WHEN suburbs IS NOT NULL THEN to_jsonb(suburbs) ELSE NULL END as suburbs,
  CASE WHEN postcodes IS NOT NULL THEN to_jsonb(postcodes) ELSE NULL END as postcodes,
  NULL::text as reason
FROM gridalert.ausnet_current_unplanned_outages
WHERE 
  UPPER(TRIM(COALESCE(status, ''))) NOT IN ('MERGED', 'RESTORED')
  AND UPPER(REPLACE(TRIM(COALESCE(incident_status, '')), '  ', ' ')) IN ('IN PROGRESS', 'EMERGENCY REPAIR')
  AND (
    (status_last_updated IS NOT NULL AND status_last_updated > NOW() - INTERVAL '7 days')
    OR (status_last_updated IS NULL AND incident_last_updated IS NOT NULL AND incident_last_updated > NOW() - INTERVAL '7 days')
    OR (status_last_updated IS NULL AND incident_last_updated IS NULL AND unplanned_start_time IS NOT NULL AND unplanned_start_time > NOW() - INTERVAL '7 days')
  )

UNION ALL

SELECT 
  COALESCE(outage_id::text, id::text) as id,
  'CitiPowerCor'::text as provider,
  COALESCE(outage_type, status, 'In progress') as statusheading,
  COALESCE(town, area, 'Unknown area') as area_suburb,
  COALESCE(reason, 'Unplanned outage') as cause,
  COALESCE(customers_affected, 0)::text as customers_affected,
  est_time_on as estimated_finish_time,
  time_off as start_time,
  NULL::text as webid,
  COALESCE(outage_type, status, 'In progress') as status,
  point_lat::numeric as latitude,
  point_lng::numeric as longitude,
  NULL::text as geocoded_address,
  COALESCE(state, 'VIC') as state,
  CASE 
    WHEN privatised IS NOT NULL THEN SPLIT_PART(privatised, ',', 1)
    ELSE ''
  END as streets_affected,
  polygon_geojson as polygon_geojson,
  outage_id::text as incident_id,
  NULL::jsonb as suburbs,
  NULL::jsonb as postcodes,
  reason as reason
FROM gridalert.citipowercor_current_unplanned_outages

UNION ALL

SELECT 
  COALESCE(outage_id::text, id::text) as id,
  'Essential Energy'::text as provider,
  COALESCE(outage_type, status, 'In progress') as statusheading,
  'Unknown area'::text as area_suburb,
  COALESCE(reason, 'Unplanned outage') as cause,
  COALESCE(customers_affected, 0)::text as customers_affected,
  est_time_on as estimated_finish_time,
  time_off as start_time,
  NULL::text as webid,
  COALESCE(outage_type, status, 'In progress') as status,
  point_lat::numeric as latitude,
  point_lng::numeric as longitude,
  NULL::text as geocoded_address,
  COALESCE(state, 'NSW') as state,
  NULL::text as streets_affected,
  polygon_geojson as polygon_geojson,
  outage_id::text as incident_id,
  NULL::jsonb as suburbs,
  NULL::jsonb as postcodes,
  reason as reason
FROM gridalert.essential_current_unplanned_outages

UNION ALL

SELECT 
  COALESCE(outage_id::text, id::text) as id,
  'Jemena'::text as provider,
  COALESCE(status, outage_type, 'In progress') as statusheading,
  CASE 
    WHEN suburbs IS NOT NULL AND array_length(suburbs, 1) > 0 THEN
      array_to_string(suburbs, ', ')
    WHEN impacted_suburbs IS NOT NULL THEN
      CASE 
        WHEN jsonb_typeof(impacted_suburbs) = 'array' THEN
          (SELECT string_agg(value::text, ', ') FROM jsonb_array_elements_text(impacted_suburbs))
        ELSE impacted_suburbs::text
      END
    ELSE 'Unknown area'
  END as area_suburb,
  COALESCE(reason, 'Unplanned outage') as cause,
  COALESCE(customers_affected, 0)::text as customers_affected,
  est_time_on as estimated_finish_time,
  time_off as start_time,
  NULL::text as webid,
  COALESCE(status, outage_type, 'In progress') as status,
  point_lat::numeric as latitude,
  point_lng::numeric as longitude,
  NULL::text as geocoded_address,
  COALESCE(state, 'VIC') as state,
  CASE 
    WHEN streets IS NOT NULL AND array_length(streets, 1) > 0 THEN
      array_to_string(streets, ', ')
    ELSE ''
  END as streets_affected,
  polygon_geojson as polygon_geojson,
  outage_id::text as incident_id,
  CASE WHEN suburbs IS NOT NULL THEN to_jsonb(suburbs) ELSE NULL END as suburbs,
  CASE WHEN postcodes IS NOT NULL THEN to_jsonb(postcodes) ELSE NULL END as postcodes,
  reason as reason
FROM gridalert.jemena_current_unplanned_outages

UNION ALL

SELECT 
  COALESCE(outage_id::text, id::text) as id,
  'UnitedEnergy'::text as provider,
  COALESCE(outage_type, status, 'In progress') as statusheading,
  CASE 
    WHEN suburbs IS NOT NULL AND array_length(suburbs, 1) > 0 THEN
      array_to_string(suburbs, ', ')
    ELSE COALESCE(street_name, 'Unknown area')
  END as area_suburb,
  COALESCE(reason, 'Unplanned outage') as cause,
  COALESCE(customers_affected, 0)::text as customers_affected,
  est_time_on as estimated_finish_time,
  time_off as start_time,
  NULL::text as webid,
  COALESCE(outage_type, status, 'In progress') as status,
  point_lat::numeric as latitude,
  point_lng::numeric as longitude,
  NULL::text as geocoded_address,
  COALESCE(state, 'VIC') as state,
  COALESCE(street_name, '') as streets_affected,
  polygon_geojson as polygon_geojson,
  outage_id::text as incident_id,
  CASE WHEN suburbs IS NOT NULL THEN to_jsonb(suburbs) ELSE NULL END as suburbs,
  CASE WHEN postcodes IS NOT NULL THEN to_jsonb(postcodes) ELSE NULL END as postcodes,
  reason as reason
FROM gridalert.unitedenergy_current_unplanned_outages

UNION ALL

SELECT 
  COALESCE(outage_id::text, job_id::text, id::text) as id,
  'TasNetworks'::text as provider,
  COALESCE(outage_type, dispatch_status, 'In progress') as statusheading,
  COALESCE(affected_areas, affected_regions, 'Unknown area') as area_suburb,
  COALESCE(reason, 'Unplanned outage') as cause,
  COALESCE(customers_affected, 0)::text as customers_affected,
  est_time_on as estimated_finish_time,
  time_off as start_time,
  NULL::text as webid,
  COALESCE(outage_type, dispatch_status, 'In progress') as status,
  point_lat::numeric as latitude,
  point_lng::numeric as longitude,
  NULL::text as geocoded_address,
  COALESCE(state, 'TAS') as state,
  NULL::text as streets_affected,
  polygon_geojson as polygon_geojson,
  outage_id::text as incident_id,
  NULL::jsonb as suburbs,
  CASE WHEN postcodes IS NOT NULL THEN to_jsonb(ARRAY[postcodes]) ELSE NULL END as postcodes,
  reason as reason
FROM gridalert.tasnetworks_current_unplanned_outages;

-- Grant access to the view
GRANT SELECT ON gridalert.unplanned_outages TO anon, authenticated;

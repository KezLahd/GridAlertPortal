-- Create a live view that consolidates all current planned outages from all providers
-- This view automatically updates when any source table changes

CREATE OR REPLACE VIEW gridalert.current_planned_outages AS
SELECT 
  -- Common fields
  COALESCE(id::text, webid::text) as id,
  'Ausgrid'::text as provider,
  area_suburb as area_suburb,
  cause as cause,
  customers_affected::text as customers_affected,
  end_date_time as end_date_time,
  start_date_time as start_date_time,
  status as status,
  street_affected as streets_affected,
  NULL::numeric as latitude,
  NULL::numeric as longitude,
  NULL::text as state,
  NULL::jsonb as polygon_geojson,
  NULL::text as incident_id,
  NULL::jsonb as suburbs,
  NULL::jsonb as postcodes,
  NULL::text as reason
FROM gridalert.ausgrid_current_planned_outages

UNION ALL

SELECT 
  COALESCE(id::text, incident_id::text) as id,
  'Endeavour'::text as provider,
  suburb as area_suburb,
  reason as cause,
  number_customers_affected::text as customers_affected,
  end_date_time as end_date_time,
  start_date_time as start_date_time,
  status as status,
  street_name as streets_affected,
  latitude::numeric as latitude,
  longitude::numeric as longitude,
  NULL::text as state,
  NULL::jsonb as polygon_geojson,
  NULL::text as incident_id,
  NULL::jsonb as suburbs,
  NULL::jsonb as postcodes,
  reason as reason
FROM gridalert.endeavour_current_planned_outages
WHERE status != 'OUTAGE COMPLETED'

UNION ALL

SELECT 
  COALESCE(id::text, event_id::text) as id,
  'Energex'::text as provider,
  suburbs as area_suburb,
  reason as cause,
  customers_affected::text as customers_affected,
  est_fix_time as end_date_time,
  start_time as start_date_time,
  status as status,
  COALESCE(streets, '') as streets_affected,
  point_lat::numeric as latitude,
  point_lng::numeric as longitude,
  NULL::text as state,
  polygon_geojson as polygon_geojson,
  event_id::text as incident_id,
  NULL::jsonb as suburbs,
  NULL::jsonb as postcodes,
  reason as reason
FROM gridalert.energex_current_planned_outages

UNION ALL

SELECT 
  COALESCE(id::text, event_id::text) as id,
  'Ergon'::text as provider,
  suburbs as area_suburb,
  reason as cause,
  customers_affected::text as customers_affected,
  est_fix_time as end_date_time,
  start_time as start_date_time,
  status as status,
  COALESCE(streets, '') as streets_affected,
  point_lat::numeric as latitude,
  point_lng::numeric as longitude,
  NULL::text as state,
  polygon_geojson as polygon_geojson,
  event_id::text as incident_id,
  NULL::jsonb as suburbs,
  NULL::jsonb as postcodes,
  reason as reason
FROM gridalert.ergon_current_planned_outages

UNION ALL

SELECT 
  COALESCE(id::text, job_id::text) as id,
  'SA Power'::text as provider,
  CASE 
    WHEN affected_suburbs IS NULL THEN 'Unknown area'
    WHEN jsonb_typeof(affected_suburbs) = 'array' THEN 
      (SELECT string_agg(value::text, ', ') FROM jsonb_array_elements_text(affected_suburbs))
    ELSE affected_suburbs::text
  END as area_suburb,
  reason as cause,
  affected_customers::text as customers_affected,
  est_restoration as end_date_time,
  start_time as start_date_time,
  status as status,
  COALESCE(affected_streets, '') as streets_affected,
  point_lat::numeric as latitude,
  point_lng::numeric as longitude,
  NULL::text as state,
  polygon_geojson as polygon_geojson,
  job_id::text as incident_id,
  affected_suburbs as suburbs,
  NULL::jsonb as postcodes,
  reason as reason
FROM gridalert.sapower_current_planned_outages

UNION ALL

SELECT 
  COALESCE(outage_id::text, id::text) as id,
  'Horizon Power'::text as provider,
  COALESCE(service_area, region, 
    CASE 
      WHEN service_areas IS NOT NULL AND jsonb_typeof(service_areas) = 'array' THEN
        (SELECT string_agg(value::text, ', ') FROM jsonb_array_elements_text(service_areas))
      ELSE NULL
    END,
    'Unknown area'
  ) as area_suburb,
  COALESCE(outage_type, 'Planned maintenance') as cause,
  affected_customers::text as customers_affected,
  estimated_restore_time as end_date_time,
  start_time as start_date_time,
  COALESCE(status, 'Planned') as status,
  CASE 
    WHEN service_areas IS NOT NULL AND jsonb_typeof(service_areas) = 'array' THEN
      (SELECT string_agg(value::text, ', ') FROM jsonb_array_elements_text(service_areas))
    ELSE COALESCE(service_area, '')
  END as streets_affected,
  point_lat::numeric as latitude,
  point_lng::numeric as longitude,
  COALESCE(state, 'WA') as state,
  NULL::jsonb as polygon_geojson,
  outage_id::text as incident_id,
  NULL::jsonb as suburbs,
  NULL::jsonb as postcodes,
  NULL::text as reason
FROM gridalert.horizon_current_planned_outages

UNION ALL

SELECT 
  COALESCE(outage_id::text, id::text) as id,
  'WPower'::text as provider,
  CASE 
    WHEN areas IS NOT NULL AND jsonb_typeof(areas) = 'array' THEN
      (SELECT string_agg(value::text, ', ') FROM jsonb_array_elements_text(areas))
    ELSE 'Unknown area'
  END as area_suburb,
  COALESCE(outage_type, 'Planned maintenance') as cause,
  affected_customers::text as customers_affected,
  restoration_time as end_date_time,
  start_time as start_date_time,
  COALESCE(outage_type, 'Planned') as status,
  CASE 
    WHEN areas IS NOT NULL AND jsonb_typeof(areas) = 'array' THEN
      (SELECT string_agg(value::text, ', ') FROM jsonb_array_elements_text(areas))
    ELSE ''
  END as streets_affected,
  point_lat::numeric as latitude,
  point_lng::numeric as longitude,
  COALESCE(state, 'WA') as state,
  polygon_geojson as polygon_geojson,
  outage_id::text as incident_id,
  NULL::jsonb as suburbs,
  NULL::jsonb as postcodes,
  NULL::text as reason
FROM gridalert.wpower_current_planned_outages

UNION ALL

SELECT 
  COALESCE(incident_id::text, id::text) as id,
  'AusNet'::text as provider,
  CASE 
    WHEN suburbs IS NOT NULL AND array_length(suburbs, 1) > 0 THEN
      array_to_string(suburbs, ', ')
    ELSE COALESCE(incident, 'Unknown area')
  END as area_suburb,
  COALESCE(cause, details, 'Planned maintenance') as cause,
  COALESCE(customers_affected, 
    CASE 
      WHEN impacted_nmi IS NOT NULL AND jsonb_typeof(impacted_nmi) = 'array' THEN jsonb_array_length(impacted_nmi)
      ELSE 0
    END
  )::text as customers_affected,
  planned_end_time as end_date_time,
  planned_start_time as start_date_time,
  COALESCE(status, incident_status, 'Planned') as status,
  '' as streets_affected,
  point_lat::numeric as latitude,
  point_lng::numeric as longitude,
  COALESCE(state, 'VIC') as state,
  NULL::jsonb as polygon_geojson,
  incident_id::text as incident_id,
  CASE WHEN suburbs IS NOT NULL THEN to_jsonb(suburbs) ELSE NULL END as suburbs,
  CASE WHEN postcodes IS NOT NULL THEN to_jsonb(postcodes) ELSE NULL END as postcodes,
  NULL::text as reason
FROM gridalert.ausnet_current_planned_outages

UNION ALL

SELECT 
  COALESCE(outage_id::text, id::text) as id,
  'CitiPowerCor'::text as provider,
  COALESCE(town, area, 'Unknown area') as area_suburb,
  COALESCE(reason, 'Planned maintenance') as cause,
  COALESCE(customers_affected, 0)::text as customers_affected,
  est_time_on as end_date_time,
  time_off as start_date_time,
  COALESCE(outage_type, status, 'Planned') as status,
  CASE 
    WHEN privatised IS NOT NULL THEN SPLIT_PART(privatised, ',', 1)
    ELSE ''
  END as streets_affected,
  point_lat::numeric as latitude,
  point_lng::numeric as longitude,
  COALESCE(state, 'VIC') as state,
  polygon_geojson as polygon_geojson,
  outage_id::text as incident_id,
  NULL::jsonb as suburbs,
  NULL::jsonb as postcodes,
  reason as reason
FROM gridalert.citipowercor_current_planned_outages

UNION ALL

SELECT 
  COALESCE(outage_id::text, id::text) as id,
  'Essential Energy'::text as provider,
  'Unknown area'::text as area_suburb,
  COALESCE(reason, 'Planned maintenance') as cause,
  COALESCE(customers_affected, 0)::text as customers_affected,
  est_time_on as end_date_time,
  time_off as start_date_time,
  COALESCE(outage_type, status, 'Planned') as status,
  '' as streets_affected,
  point_lat::numeric as latitude,
  point_lng::numeric as longitude,
  COALESCE(state, 'NSW') as state,
  polygon_geojson as polygon_geojson,
  outage_id::text as incident_id,
  NULL::jsonb as suburbs,
  NULL::jsonb as postcodes,
  reason as reason
FROM gridalert.essential_current_planned_outages

UNION ALL

SELECT 
  COALESCE(outage_id::text, id::text) as id,
  'Jemena'::text as provider,
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
  COALESCE(reason, 'Planned maintenance') as cause,
  COALESCE(customers_affected, 0)::text as customers_affected,
  est_time_on as end_date_time,
  time_off as start_date_time,
  COALESCE(status, outage_type, 'Planned') as status,
  CASE 
    WHEN streets IS NOT NULL AND array_length(streets, 1) > 0 THEN
      array_to_string(streets, ', ')
    ELSE ''
  END as streets_affected,
  point_lat::numeric as latitude,
  point_lng::numeric as longitude,
  COALESCE(state, 'VIC') as state,
  polygon_geojson as polygon_geojson,
  outage_id::text as incident_id,
  CASE WHEN suburbs IS NOT NULL THEN to_jsonb(suburbs) ELSE NULL END as suburbs,
  CASE WHEN postcodes IS NOT NULL THEN to_jsonb(postcodes) ELSE NULL END as postcodes,
  reason as reason
FROM gridalert.jemena_current_planned_outages

UNION ALL

SELECT 
  COALESCE(outage_id::text, id::text) as id,
  'UnitedEnergy'::text as provider,
  CASE 
    WHEN suburbs IS NOT NULL AND array_length(suburbs, 1) > 0 THEN
      array_to_string(suburbs, ', ')
    ELSE COALESCE(street_name, 'Unknown area')
  END as area_suburb,
  COALESCE(reason, 'Planned maintenance') as cause,
  COALESCE(customers_affected, 0)::text as customers_affected,
  est_time_on as end_date_time,
  time_off as start_date_time,
  COALESCE(outage_type, status, 'Planned') as status,
  COALESCE(street_name, '') as streets_affected,
  point_lat::numeric as latitude,
  point_lng::numeric as longitude,
  COALESCE(state, 'VIC') as state,
  polygon_geojson as polygon_geojson,
  outage_id::text as incident_id,
  CASE WHEN suburbs IS NOT NULL THEN to_jsonb(suburbs) ELSE NULL END as suburbs,
  CASE WHEN postcodes IS NOT NULL THEN to_jsonb(postcodes) ELSE NULL END as postcodes,
  reason as reason
FROM gridalert.unitedenergy_current_planned_outages

UNION ALL

SELECT 
  COALESCE(outage_id::text, job_id::text, id::text) as id,
  'TasNetworks'::text as provider,
  COALESCE(affected_areas, affected_regions, 'Unknown area') as area_suburb,
  COALESCE(reason, 'Planned maintenance') as cause,
  COALESCE(customers_affected, 0)::text as customers_affected,
  est_time_on as end_date_time,
  time_off as start_date_time,
  COALESCE(outage_type, dispatch_status, 'Planned') as status,
  NULL::text as streets_affected,
  point_lat::numeric as latitude,
  point_lng::numeric as longitude,
  COALESCE(state, 'TAS') as state,
  polygon_geojson as polygon_geojson,
  outage_id::text as incident_id,
  NULL::jsonb as suburbs,
  CASE WHEN postcodes IS NOT NULL THEN to_jsonb(ARRAY[postcodes]) ELSE NULL END as postcodes,
  reason as reason
FROM gridalert.tasnetworks_current_planned_outages;

-- Grant access to the view
GRANT SELECT ON gridalert.current_planned_outages TO anon, authenticated;

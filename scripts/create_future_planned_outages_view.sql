-- Create a live view that consolidates all future planned outages from all providers
-- This view automatically updates when any source table changes

CREATE OR REPLACE VIEW gridalert.future_planned_outages AS
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
FROM gridalert.ausgrid_future_planned_outages

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
FROM gridalert.endeavour_future_planned_outages
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
FROM gridalert.energex_future_planned_outages

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
FROM gridalert.ergon_future_planned_outages

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
  COALESCE(feeders->>0, '') as streets_affected,
  point_lat::numeric as latitude,
  point_lng::numeric as longitude,
  state as state,
  NULL::jsonb as polygon_geojson,
  job_id::text as incident_id,
  affected_suburbs as suburbs,
  NULL::jsonb as postcodes,
  reason as reason
FROM gridalert.sapower_future_planned_outages

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
  COALESCE(outage_type, 'Future maintenance') as cause,
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
FROM gridalert.horizon_future_planned_outages

UNION ALL

SELECT 
  COALESCE(outage_id::text, id::text) as id,
  'WPower'::text as provider,
  CASE 
    WHEN areas IS NOT NULL AND jsonb_typeof(areas) = 'array' THEN
      (SELECT string_agg(value::text, ', ') FROM jsonb_array_elements_text(areas))
    ELSE 'Unknown area'
  END as area_suburb,
  COALESCE(outage_type, 'Future maintenance') as cause,
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
  NULL::jsonb as polygon_geojson,
  outage_id::text as incident_id,
  NULL::jsonb as suburbs,
  NULL::jsonb as postcodes,
  NULL::text as reason
FROM gridalert.wpower_future_planned_outages

UNION ALL

SELECT 
  COALESCE(incident_id::text, id::text) as id,
  'AusNet'::text as provider,
  CASE 
    WHEN suburbs IS NOT NULL AND array_length(suburbs, 1) > 0 THEN
      array_to_string(suburbs, ', ')
    ELSE COALESCE(incident, 'Unknown area')
  END as area_suburb,
  COALESCE(cause, details, 'Future maintenance') as cause,
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
FROM gridalert.ausnet_future_planned_outages;

-- Grant access to the view
GRANT SELECT ON gridalert.future_planned_outages TO anon, authenticated;

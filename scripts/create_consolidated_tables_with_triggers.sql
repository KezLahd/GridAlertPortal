-- ============================================================================
-- CONSOLIDATED TABLES WITH AUTOMATIC TRIGGERS
-- ============================================================================
-- This creates tables that automatically stay in sync with source tables
-- using database triggers. No manual refresh needed!
-- ============================================================================

-- ============================================================================
-- 1. CURRENT PLANNED OUTAGES CONSOLIDATED
-- ============================================================================

DROP TABLE IF EXISTS gridalert.current_planned_outages_consolidated CASCADE;

CREATE TABLE gridalert.current_planned_outages_consolidated (
    id TEXT,
    provider TEXT NOT NULL,
    area_suburb TEXT,
    cause TEXT,
    customers_affected TEXT,
    end_date_time TIMESTAMPTZ,
    start_date_time TIMESTAMPTZ,
    status TEXT,
    streets_affected TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    state TEXT,
    polygon_geojson JSONB,
    incident_id TEXT,
    suburbs JSONB,
    postcodes JSONB,
    reason TEXT,
    consolidated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, provider)
);

CREATE INDEX IF NOT EXISTS idx_current_planned_provider ON gridalert.current_planned_outages_consolidated(provider);
CREATE INDEX IF NOT EXISTS idx_current_planned_start_date ON gridalert.current_planned_outages_consolidated(start_date_time);
CREATE INDEX IF NOT EXISTS idx_current_planned_end_date ON gridalert.current_planned_outages_consolidated(end_date_time);
CREATE INDEX IF NOT EXISTS idx_current_planned_state ON gridalert.current_planned_outages_consolidated(state);

-- Function to refresh a specific provider's data in consolidated table
CREATE OR REPLACE FUNCTION gridalert.refresh_provider_current_planned(provider_name TEXT)
RETURNS void AS $$
BEGIN
    -- Delete existing records for this provider
    DELETE FROM gridalert.current_planned_outages_consolidated WHERE provider = provider_name;
    
    -- Re-insert based on provider
    CASE provider_name
        WHEN 'Ausgrid' THEN
            INSERT INTO gridalert.current_planned_outages_consolidated
            SELECT 
                COALESCE(id::text, webid::text), 'Ausgrid', area_suburb, cause,
                customers_affected::text, end_date_time, start_date_time, status,
                street_affected, NULL::numeric, NULL::numeric, NULL::text,
                NULL::jsonb, NULL::text, NULL::jsonb, NULL::jsonb, NULL::text,
                CURRENT_TIMESTAMP
            FROM gridalert.ausgrid_current_planned_outages;
            
        WHEN 'Endeavour' THEN
            INSERT INTO gridalert.current_planned_outages_consolidated
            SELECT 
                COALESCE(id::text, incident_id::text), 'Endeavour', suburb, reason,
                number_customers_affected::text, end_date_time, start_date_time, status,
                street_name, latitude::numeric, longitude::numeric, NULL::text,
                NULL::jsonb, incident_id::text, NULL::jsonb, NULL::jsonb, reason,
                CURRENT_TIMESTAMP
            FROM gridalert.endeavour_current_planned_outages
            WHERE status != 'OUTAGE COMPLETED';
            
        WHEN 'Energex' THEN
            INSERT INTO gridalert.current_planned_outages_consolidated
            SELECT 
                COALESCE(id::text, event_id::text), 'Energex', suburbs, reason,
                customers_affected::text, est_fix_time, start_time, status,
                COALESCE(streets, ''), point_lat::numeric, point_lng::numeric, NULL::text,
                polygon_geojson, event_id::text, NULL::jsonb, NULL::jsonb, reason,
                CURRENT_TIMESTAMP
            FROM gridalert.energex_current_planned_outages;
            
        WHEN 'Ergon' THEN
            INSERT INTO gridalert.current_planned_outages_consolidated
            SELECT 
                COALESCE(id::text, event_id::text), 'Ergon', suburbs, reason,
                customers_affected::text, est_fix_time, start_time, status,
                COALESCE(streets, ''), point_lat::numeric, point_lng::numeric, NULL::text,
                polygon_geojson, event_id::text, NULL::jsonb, NULL::jsonb, reason,
                CURRENT_TIMESTAMP
            FROM gridalert.ergon_current_planned_outages;
            
        WHEN 'SA Power' THEN
            INSERT INTO gridalert.current_planned_outages_consolidated
            SELECT 
                COALESCE(id::text, job_id::text), 'SA Power',
                CASE 
                    WHEN affected_suburbs IS NULL THEN 'Unknown area'
                    WHEN jsonb_typeof(affected_suburbs) = 'array' THEN 
                        (SELECT string_agg(value::text, ', ') FROM jsonb_array_elements_text(affected_suburbs))
                    ELSE affected_suburbs::text
                END,
                reason, affected_customers::text, est_restoration, start_time, status,
                COALESCE(affected_streets, ''), point_lat::numeric, point_lng::numeric, NULL::text,
                polygon_geojson, job_id::text, affected_suburbs, NULL::jsonb, reason,
                CURRENT_TIMESTAMP
            FROM gridalert.sapower_current_planned_outages;
            
        WHEN 'Horizon Power' THEN
            INSERT INTO gridalert.current_planned_outages_consolidated
            SELECT 
                COALESCE(outage_id::text, id::text), 'Horizon Power',
                COALESCE(service_area, region, 
                    CASE 
                        WHEN service_areas IS NOT NULL AND jsonb_typeof(service_areas) = 'array' THEN
                            (SELECT string_agg(value::text, ', ') FROM jsonb_array_elements_text(service_areas))
                        ELSE NULL
                    END, 'Unknown area'),
                COALESCE(outage_type, 'Planned maintenance'), affected_customers::text,
                estimated_restore_time, start_time, COALESCE(status, 'Planned'),
                CASE 
                    WHEN service_areas IS NOT NULL AND jsonb_typeof(service_areas) = 'array' THEN
                        (SELECT string_agg(value::text, ', ') FROM jsonb_array_elements_text(service_areas))
                    ELSE COALESCE(service_area, '')
                END,
                point_lat::numeric, point_lng::numeric, COALESCE(state, 'WA'),
                NULL::jsonb, outage_id::text, NULL::jsonb, NULL::jsonb, NULL::text,
                CURRENT_TIMESTAMP
            FROM gridalert.horizon_current_planned_outages;
            
        WHEN 'WPower' THEN
            INSERT INTO gridalert.current_planned_outages_consolidated
            SELECT 
                COALESCE(outage_id::text, id::text), 'WPower',
                CASE 
                    WHEN areas IS NOT NULL AND jsonb_typeof(areas) = 'array' THEN
                        (SELECT string_agg(value::text, ', ') FROM jsonb_array_elements_text(areas))
                    ELSE 'Unknown area'
                END,
                COALESCE(outage_type, 'Planned maintenance'), affected_customers::text,
                restoration_time, start_time, COALESCE(outage_type, 'Planned'),
                CASE 
                    WHEN areas IS NOT NULL AND jsonb_typeof(areas) = 'array' THEN
                        (SELECT string_agg(value::text, ', ') FROM jsonb_array_elements_text(areas))
                    ELSE ''
                END,
                point_lat::numeric, point_lng::numeric, COALESCE(state, 'WA'),
                polygon_geojson, outage_id::text, NULL::jsonb, NULL::jsonb, NULL::text,
                CURRENT_TIMESTAMP
            FROM gridalert.wpower_current_planned_outages;
            
        WHEN 'AusNet' THEN
            INSERT INTO gridalert.current_planned_outages_consolidated
            SELECT 
                COALESCE(incident_id::text, id::text), 'AusNet',
                CASE 
                    WHEN suburbs IS NOT NULL AND array_length(suburbs, 1) > 0 THEN
                        array_to_string(suburbs, ', ')
                    ELSE COALESCE(incident, 'Unknown area')
                END,
                COALESCE(cause, details, 'Planned maintenance'),
                COALESCE(customers_affected, 
                    CASE 
                        WHEN impacted_nmi IS NOT NULL AND jsonb_typeof(impacted_nmi) = 'array' THEN jsonb_array_length(impacted_nmi)
                        ELSE 0
                    END
                )::text,
                planned_end_time, planned_start_time, COALESCE(status, incident_status, 'Planned'),
                '', point_lat::numeric, point_lng::numeric, COALESCE(state, 'VIC'),
                NULL::jsonb, incident_id::text,
                CASE WHEN suburbs IS NOT NULL THEN to_jsonb(suburbs) ELSE NULL END,
                CASE WHEN postcodes IS NOT NULL THEN to_jsonb(postcodes) ELSE NULL END,
                NULL::text, CURRENT_TIMESTAMP
            FROM gridalert.ausnet_current_planned_outages;
            
        WHEN 'CitiPowerCor' THEN
            INSERT INTO gridalert.current_planned_outages_consolidated
            SELECT 
                COALESCE(outage_id::text, id::text), 'CitiPowerCor',
                COALESCE(town, area, 'Unknown area'), COALESCE(reason, 'Planned maintenance'),
                COALESCE(customers_affected, 0)::text, est_time_on, time_off,
                COALESCE(outage_type, status, 'Planned'),
                CASE 
                    WHEN privatised IS NOT NULL THEN SPLIT_PART(privatised, ',', 1)
                    ELSE ''
                END,
                point_lat::numeric, point_lng::numeric, COALESCE(state, 'VIC'),
                polygon_geojson, outage_id::text, NULL::jsonb, NULL::jsonb, reason,
                CURRENT_TIMESTAMP
            FROM gridalert.citipowercor_current_planned_outages;
            
        WHEN 'Essential Energy' THEN
            INSERT INTO gridalert.current_planned_outages_consolidated
            SELECT 
                COALESCE(outage_id::text, id::text), 'Essential Energy',
                'Unknown area', COALESCE(reason, 'Planned maintenance'),
                COALESCE(customers_affected, 0)::text, est_time_on, time_off,
                COALESCE(outage_type, status, 'Planned'), '',
                point_lat::numeric, point_lng::numeric, COALESCE(state, 'NSW'),
                polygon_geojson, outage_id::text, NULL::jsonb, NULL::jsonb, reason,
                CURRENT_TIMESTAMP
            FROM gridalert.essential_current_planned_outages;
            
        WHEN 'Jemena' THEN
            INSERT INTO gridalert.current_planned_outages_consolidated
            SELECT 
                COALESCE(outage_id::text, id::text), 'Jemena',
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
                END,
                COALESCE(reason, 'Planned maintenance'), COALESCE(customers_affected, 0)::text,
                est_time_on, time_off, COALESCE(status, outage_type, 'Planned'),
                CASE 
                    WHEN streets IS NOT NULL AND array_length(streets, 1) > 0 THEN
                        array_to_string(streets, ', ')
                    ELSE ''
                END,
                point_lat::numeric, point_lng::numeric, COALESCE(state, 'VIC'),
                polygon_geojson, outage_id::text,
                CASE WHEN suburbs IS NOT NULL THEN to_jsonb(suburbs) ELSE NULL END,
                CASE WHEN postcodes IS NOT NULL THEN to_jsonb(postcodes) ELSE NULL END,
                reason, CURRENT_TIMESTAMP
            FROM gridalert.jemena_current_planned_outages;
            
        WHEN 'UnitedEnergy' THEN
            INSERT INTO gridalert.current_planned_outages_consolidated
            SELECT 
                COALESCE(outage_id::text, id::text), 'UnitedEnergy',
                CASE 
                    WHEN suburbs IS NOT NULL AND array_length(suburbs, 1) > 0 THEN
                        array_to_string(suburbs, ', ')
                    ELSE COALESCE(street_name, 'Unknown area')
                END,
                COALESCE(reason, 'Planned maintenance'), COALESCE(customers_affected, 0)::text,
                est_time_on, time_off, COALESCE(outage_type, status, 'Planned'),
                COALESCE(street_name, ''), point_lat::numeric, point_lng::numeric,
                COALESCE(state, 'VIC'), polygon_geojson, outage_id::text,
                CASE WHEN suburbs IS NOT NULL THEN to_jsonb(suburbs) ELSE NULL END,
                CASE WHEN postcodes IS NOT NULL THEN to_jsonb(postcodes) ELSE NULL END,
                reason, CURRENT_TIMESTAMP
            FROM gridalert.unitedenergy_current_planned_outages;
            
        WHEN 'TasNetworks' THEN
            INSERT INTO gridalert.current_planned_outages_consolidated
            SELECT 
                COALESCE(outage_id::text, job_id::text, id::text), 'TasNetworks',
                COALESCE(affected_areas, affected_regions, 'Unknown area'),
                COALESCE(reason, 'Planned maintenance'), COALESCE(customers_affected, 0)::text,
                est_time_on, time_off, COALESCE(outage_type, dispatch_status, 'Planned'),
                NULL::text, point_lat::numeric, point_lng::numeric, COALESCE(state, 'TAS'),
                polygon_geojson, outage_id::text, NULL::jsonb,
                CASE WHEN postcodes IS NOT NULL THEN to_jsonb(ARRAY[postcodes]) ELSE NULL END,
                reason, CURRENT_TIMESTAMP
            FROM gridalert.tasnetworks_current_planned_outages;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Trigger function that refreshes provider data after INSERT/UPDATE/DELETE
CREATE OR REPLACE FUNCTION gridalert.trigger_refresh_current_planned()
RETURNS TRIGGER AS $$
DECLARE
    provider_name TEXT;
BEGIN
    -- Determine provider from table name
    provider_name := CASE TG_TABLE_NAME
        WHEN 'ausgrid_current_planned_outages' THEN 'Ausgrid'
        WHEN 'endeavour_current_planned_outages' THEN 'Endeavour'
        WHEN 'energex_current_planned_outages' THEN 'Energex'
        WHEN 'ergon_current_planned_outages' THEN 'Ergon'
        WHEN 'sapower_current_planned_outages' THEN 'SA Power'
        WHEN 'horizon_current_planned_outages' THEN 'Horizon Power'
        WHEN 'wpower_current_planned_outages' THEN 'WPower'
        WHEN 'ausnet_current_planned_outages' THEN 'AusNet'
        WHEN 'citipowercor_current_planned_outages' THEN 'CitiPowerCor'
        WHEN 'essential_current_planned_outages' THEN 'Essential Energy'
        WHEN 'jemena_current_planned_outages' THEN 'Jemena'
        WHEN 'unitedenergy_current_planned_outages' THEN 'UnitedEnergy'
        WHEN 'tasnetworks_current_planned_outages' THEN 'TasNetworks'
        ELSE NULL
    END;
    
    IF provider_name IS NOT NULL THEN
        PERFORM gridalert.refresh_provider_current_planned(provider_name);
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers on all source tables
-- Note: You'll need to create these triggers for each provider table
-- Example for one provider (repeat for all 13):
DROP TRIGGER IF EXISTS trg_refresh_ausgrid_current_planned ON gridalert.ausgrid_current_planned_outages;
CREATE TRIGGER trg_refresh_ausgrid_current_planned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.ausgrid_current_planned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_current_planned();

-- Repeat for other providers...
-- (I'll create a helper script to generate all triggers)

-- Initial population
SELECT gridalert.refresh_provider_current_planned('Ausgrid');
SELECT gridalert.refresh_provider_current_planned('Endeavour');
SELECT gridalert.refresh_provider_current_planned('Energex');
SELECT gridalert.refresh_provider_current_planned('Ergon');
SELECT gridalert.refresh_provider_current_planned('SA Power');
SELECT gridalert.refresh_provider_current_planned('Horizon Power');
SELECT gridalert.refresh_provider_current_planned('WPower');
SELECT gridalert.refresh_provider_current_planned('AusNet');
SELECT gridalert.refresh_provider_current_planned('CitiPowerCor');
SELECT gridalert.refresh_provider_current_planned('Essential Energy');
SELECT gridalert.refresh_provider_current_planned('Jemena');
SELECT gridalert.refresh_provider_current_planned('UnitedEnergy');
SELECT gridalert.refresh_provider_current_planned('TasNetworks');

-- Grant permissions
GRANT SELECT ON gridalert.current_planned_outages_consolidated TO anon, authenticated;


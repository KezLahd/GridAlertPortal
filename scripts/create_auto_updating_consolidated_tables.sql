-- ============================================================================
-- AUTO-UPDATING CONSOLIDATED TABLES WITH DATABASE TRIGGERS
-- ============================================================================
-- These tables automatically stay in sync with source tables using triggers.
-- No scheduled refreshes needed - updates happen instantly when data changes!
-- ============================================================================
-- 
-- HOW IT WORKS:
-- 1. Tables are created to store consolidated data
-- 2. Triggers on source tables automatically refresh provider data when changes occur
-- 3. Frontend queries ONE table instead of 13 separate queries
-- 4. Always up-to-date, no manual refresh needed
--
-- USAGE IN FRONTEND:
-- OLD: 13 separate queries with Promise.all()
-- NEW: supabase.from("unplanned_outages_consolidated").select("*")
-- ============================================================================

-- ============================================================================
-- 1. UNPLANNED OUTAGES CONSOLIDATED TABLE
-- ============================================================================

DROP TABLE IF EXISTS gridalert.unplanned_outages_consolidated CASCADE;

CREATE TABLE gridalert.unplanned_outages_consolidated (
    id TEXT,
    provider TEXT NOT NULL,
    statusheading TEXT,
    area_suburb TEXT,
    cause TEXT,
    customers_affected TEXT,
    estimated_finish_time TIMESTAMPTZ,
    start_time TIMESTAMPTZ,
    webid TEXT,
    status TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    geocoded_address TEXT,
    state TEXT,
    streets_affected TEXT,
    polygon_geojson JSONB,
    incident_id TEXT,
    suburbs JSONB,
    postcodes JSONB,
    reason TEXT,
    consolidated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, provider)
);

CREATE INDEX IF NOT EXISTS idx_unplanned_provider ON gridalert.unplanned_outages_consolidated(provider);
CREATE INDEX IF NOT EXISTS idx_unplanned_start_time ON gridalert.unplanned_outages_consolidated(start_time);
CREATE INDEX IF NOT EXISTS idx_unplanned_state ON gridalert.unplanned_outages_consolidated(state);
CREATE INDEX IF NOT EXISTS idx_unplanned_status ON gridalert.unplanned_outages_consolidated(status);

-- Function to refresh a specific provider's unplanned outages
CREATE OR REPLACE FUNCTION gridalert.refresh_provider_unplanned(provider_name TEXT)
RETURNS void AS $$
BEGIN
    -- Delete existing records for this provider
    DELETE FROM gridalert.unplanned_outages_consolidated WHERE provider = provider_name;
    
    -- Re-insert based on provider (using same logic as views)
    CASE provider_name
        WHEN 'Ausgrid' THEN
            INSERT INTO gridalert.unplanned_outages_consolidated
            SELECT
                COALESCE(id::text, webid::text), 'Ausgrid', statusheading, area_suburb, cause,
                customers_affected::text, estimated_finish_time, start_time, webid::text, status,
                point_lat::numeric, point_lng::numeric, NULL::text, 'NSW'::text, NULL::text,
                polygon_geojson, webid::text, NULL::jsonb, NULL::jsonb, NULL::text,
                CURRENT_TIMESTAMP
            FROM gridalert.ausgrid_unplanned_outages;
            
        WHEN 'Endeavour' THEN
            INSERT INTO gridalert.unplanned_outages_consolidated
            SELECT 
                COALESCE(id::text, incident_id::text), 'Endeavour', status, suburb, reason,
                number_customers_affected::text, end_date_time, start_date_time, NULL::text, status,
                latitude::numeric, longitude::numeric, NULL::text, 'NSW'::text, NULL::text,
                NULL::jsonb, incident_id::text, NULL::jsonb, NULL::jsonb, reason,
                CURRENT_TIMESTAMP
            FROM gridalert.endeavour_current_unplanned_outages
            WHERE status != 'OUTAGE COMPLETED';
            
        WHEN 'Energex' THEN
            INSERT INTO gridalert.unplanned_outages_consolidated
            SELECT 
                COALESCE(id::text, event_id::text), 'Energex', status, suburbs, reason,
                customers_affected::text, est_fix_time, start_time, NULL::text, status,
                point_lat::numeric, point_lng::numeric, NULL::text, 'QLD'::text, COALESCE(streets, ''),
                polygon_geojson, event_id::text, NULL::jsonb, NULL::jsonb, reason,
                CURRENT_TIMESTAMP
            FROM gridalert.energex_current_unplanned_outages;
            
        WHEN 'Ergon' THEN
            INSERT INTO gridalert.unplanned_outages_consolidated
            SELECT 
                COALESCE(id::text, event_id::text), 'Ergon', status, suburbs, reason,
                customers_affected::text, est_fix_time, start_time, NULL::text, status,
                point_lat::numeric, point_lng::numeric, NULL::text, 'QLD'::text, COALESCE(streets, ''),
                polygon_geojson, event_id::text, NULL::jsonb, NULL::jsonb, reason,
                CURRENT_TIMESTAMP
            FROM gridalert.ergon_current_unplanned_outages;
            
        WHEN 'SA Power' THEN
            INSERT INTO gridalert.unplanned_outages_consolidated
            SELECT 
                COALESCE(id::text, job_id::text), 'SA Power', status,
                CASE 
                    WHEN affected_suburbs IS NULL THEN 'Unknown area'
                    WHEN jsonb_typeof(affected_suburbs) = 'array' THEN 
                        (SELECT string_agg(
                            CASE 
                                WHEN jsonb_typeof(elem) = 'object' THEN elem->>'name'
                                ELSE elem::text
                            END, ', '
                        ) FROM jsonb_array_elements(affected_suburbs) AS elem)
                    ELSE affected_suburbs::text
                END,
                reason, affected_customers::text, est_restoration, start_time, NULL::text, status,
                point_lat::numeric, point_lng::numeric, NULL::text, 'SA'::text, NULL::text,
                polygon_geojson, job_id::text, affected_suburbs, NULL::jsonb, reason,
                CURRENT_TIMESTAMP
            FROM gridalert.sapower_current_unplanned_outages;
            
        WHEN 'Horizon Power' THEN
            INSERT INTO gridalert.unplanned_outages_consolidated
            SELECT 
                COALESCE(outage_id::text, id::text), 'Horizon Power', status,
                COALESCE(service_area, region, 
                    CASE 
                        WHEN service_areas IS NOT NULL AND jsonb_typeof(service_areas) = 'array' THEN
                            (SELECT string_agg(value::text, ', ') FROM jsonb_array_elements_text(service_areas))
                        ELSE NULL
                    END, 'Unknown area'),
                COALESCE(outage_type, status, 'Unplanned outage'), affected_customers::text,
                estimated_restore_time, start_time, NULL::text, status,
                point_lat::numeric, point_lng::numeric, NULL::text, 'WA'::text, NULL::text,
                NULL::jsonb, outage_id::text, NULL::jsonb, NULL::jsonb, NULL::text,
                CURRENT_TIMESTAMP
            FROM gridalert.horizon_current_unplanned_outages;
            
        WHEN 'WPower' THEN
            INSERT INTO gridalert.unplanned_outages_consolidated
            SELECT 
                COALESCE(outage_id::text, id::text), 'WPower',
                COALESCE(outage_updated_time::text, outage_type, 'In progress'),
                CASE 
                    WHEN areas IS NOT NULL AND jsonb_typeof(areas) = 'array' THEN
                        (SELECT string_agg(value::text, ', ') FROM jsonb_array_elements_text(areas))
                    ELSE 'Unknown area'
                END,
                COALESCE(outage_type, 'Unplanned outage'), affected_customers::text,
                restoration_time, start_time, NULL::text, outage_type,
                point_lat::numeric, point_lng::numeric, NULL::text, 'WA'::text, NULL::text,
                polygon_geojson, outage_id::text, NULL::jsonb, NULL::jsonb, NULL::text,
                CURRENT_TIMESTAMP
            FROM gridalert.wpower_current_unplanned_outages;
            
        WHEN 'AusNet' THEN
            INSERT INTO gridalert.unplanned_outages_consolidated
            SELECT 
                COALESCE(incident_id::text, id::text), 'AusNet',
                COALESCE(status, incident_status, 'In progress'),
                CASE 
                    WHEN suburbs IS NOT NULL AND array_length(suburbs, 1) > 0 THEN
                        array_to_string(suburbs, ', ')
                    ELSE COALESCE(incident, 'Unknown area')
                END,
                CASE 
                    WHEN cause IS NOT NULL AND cause != '' THEN cause
                    WHEN details IS NOT NULL THEN details::text
                    ELSE 'Unplanned outage'
                END,
                COALESCE(customers_affected, 
                    CASE 
                        WHEN impacted_nmi IS NOT NULL AND jsonb_typeof(impacted_nmi) = 'array' THEN jsonb_array_length(impacted_nmi)
                        ELSE 0
                    END
                )::text,
                COALESCE(latest_estimated_time_to_restoration, initial_estimated_time_to_restoration),
                unplanned_start_time, NULL::text, COALESCE(status, incident_status, 'In progress'),
                point_lat::numeric, point_lng::numeric, NULL::text, 'VIC'::text, NULL::text,
                NULL::jsonb, incident_id::text,
                CASE WHEN suburbs IS NOT NULL THEN to_jsonb(suburbs) ELSE NULL END,
                CASE WHEN postcodes IS NOT NULL THEN to_jsonb(postcodes) ELSE NULL END,
                NULL::text, CURRENT_TIMESTAMP
            FROM gridalert.ausnet_current_unplanned_outages
            WHERE 
                UPPER(TRIM(COALESCE(status, ''))) NOT IN ('MERGED', 'RESTORED')
                AND UPPER(REPLACE(TRIM(COALESCE(incident_status, '')), '  ', ' ')) IN ('IN PROGRESS', 'EMERGENCY REPAIR')
                AND (
                    (status_last_updated IS NOT NULL AND status_last_updated > NOW() - INTERVAL '7 days')
                    OR (status_last_updated IS NULL AND incident_last_updated IS NOT NULL AND incident_last_updated > NOW() - INTERVAL '7 days')
                    OR (status_last_updated IS NULL AND incident_last_updated IS NULL AND unplanned_start_time IS NOT NULL AND unplanned_start_time > NOW() - INTERVAL '7 days')
                );
            
        WHEN 'CitiPowerCor' THEN
            INSERT INTO gridalert.unplanned_outages_consolidated
            SELECT 
                COALESCE(outage_id::text, id::text), 'CitiPowerCor',
                COALESCE(outage_type, crew_status, 'In progress'), COALESCE(town, area, 'Unknown area'),
                COALESCE(reason, 'Unplanned outage'), COALESCE(customers_affected, 0)::text,
                est_time_on, time_off, NULL::text, COALESCE(outage_type, crew_status, 'In progress')::text,
                point_lat::numeric, point_lng::numeric, NULL::text, 'VIC'::text,
                CASE 
                    WHEN privatised IS NOT NULL THEN SPLIT_PART(privatised, ',', 1)
                    ELSE ''
                END,
                polygon_geojson, outage_id::text, NULL::jsonb, NULL::jsonb, reason,
                CURRENT_TIMESTAMP
            FROM gridalert.citipowercor_current_unplanned_outages;
            
        WHEN 'Essential Energy' THEN
            INSERT INTO gridalert.unplanned_outages_consolidated
            SELECT 
                COALESCE(outage_id::text, id::text), 'Essential Energy',
                COALESCE(outage_type, 'In progress'), 'Unknown area',
                COALESCE(reason, 'Unplanned outage'), COALESCE(customers_affected, 0)::text,
                est_time_on, time_off, NULL::text, COALESCE(outage_type, 'In progress'),
                point_lat::numeric, point_lng::numeric, NULL::text, 'NSW'::text, NULL::text,
                polygon_geojson, outage_id::text, NULL::jsonb, NULL::jsonb, reason,
                CURRENT_TIMESTAMP
            FROM gridalert.essential_current_unplanned_outages;
            
        WHEN 'Jemena' THEN
            INSERT INTO gridalert.unplanned_outages_consolidated
            SELECT 
                COALESCE(outage_id::text, id::text), 'Jemena',
                COALESCE(status, outage_type, 'In progress'),
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
                COALESCE(reason, 'Unplanned outage'), COALESCE(customers_affected, 0)::text,
                est_time_on, time_off, NULL::text, COALESCE(status, outage_type, 'In progress'),
                point_lat::numeric, point_lng::numeric, NULL::text, 'VIC'::text,
                CASE 
                    WHEN streets IS NOT NULL AND array_length(streets, 1) > 0 THEN
                        array_to_string(streets, ', ')
                    ELSE ''
                END,
                polygon_geojson, outage_id::text,
                CASE WHEN suburbs IS NOT NULL THEN to_jsonb(suburbs) ELSE NULL END,
                CASE WHEN postcodes IS NOT NULL THEN to_jsonb(postcodes) ELSE NULL END,
                reason, CURRENT_TIMESTAMP
            FROM gridalert.jemena_current_unplanned_outages;
            
        WHEN 'UnitedEnergy' THEN
            INSERT INTO gridalert.unplanned_outages_consolidated
            SELECT 
                COALESCE(outage_id::text, id::text), 'UnitedEnergy',
                COALESCE(outage_type, 'In progress'),
                CASE 
                    WHEN suburbs IS NOT NULL AND array_length(suburbs, 1) > 0 THEN
                        array_to_string(suburbs, ', ')
                    ELSE COALESCE(street_name, 'Unknown area')
                END,
                COALESCE(reason, 'Unplanned outage'), COALESCE(customers_affected, 0)::text,
                est_time_on, time_off, NULL::text, COALESCE(outage_type, 'In progress'),
                point_lat::numeric, point_lng::numeric, NULL::text, 'VIC'::text,
                COALESCE(street_name, ''), polygon_geojson, outage_id::text,
                CASE WHEN suburbs IS NOT NULL THEN to_jsonb(suburbs) ELSE NULL END,
                CASE WHEN postcodes IS NOT NULL THEN to_jsonb(postcodes) ELSE NULL END,
                reason, CURRENT_TIMESTAMP
            FROM gridalert.unitedenergy_current_unplanned_outages;
            
        WHEN 'TasNetworks' THEN
            INSERT INTO gridalert.unplanned_outages_consolidated
            SELECT 
                COALESCE(outage_id::text, job_id::text, id::text), 'TasNetworks',
                COALESCE(outage_type, dispatch_status, 'In progress'),
                COALESCE(affected_areas, affected_regions, 'Unknown area'),
                COALESCE(reason, 'Unplanned outage'), COALESCE(customers_affected, 0)::text,
                est_time_on, time_off, NULL::text, COALESCE(outage_type, dispatch_status, 'In progress'),
                point_lat::numeric, point_lng::numeric, NULL::text, 'TAS'::text, NULL::text,
                polygon_geojson, outage_id::text, NULL::jsonb,
                CASE WHEN postcodes IS NOT NULL THEN to_jsonb(ARRAY[postcodes]) ELSE NULL END,
                reason, CURRENT_TIMESTAMP
            FROM gridalert.tasnetworks_current_unplanned_outages;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Trigger function that refreshes provider data after INSERT/UPDATE/DELETE
CREATE OR REPLACE FUNCTION gridalert.trigger_refresh_unplanned()
RETURNS TRIGGER AS $$
DECLARE
    provider_name TEXT;
BEGIN
    -- Determine provider from table name
    provider_name := CASE TG_TABLE_NAME
        WHEN 'ausgrid_unplanned_outages' THEN 'Ausgrid'
        WHEN 'endeavour_current_unplanned_outages' THEN 'Endeavour'
        WHEN 'energex_current_unplanned_outages' THEN 'Energex'
        WHEN 'ergon_current_unplanned_outages' THEN 'Ergon'
        WHEN 'sapower_current_unplanned_outages' THEN 'SA Power'
        WHEN 'horizon_current_unplanned_outages' THEN 'Horizon Power'
        WHEN 'wpower_current_unplanned_outages' THEN 'WPower'
        WHEN 'ausnet_current_unplanned_outages' THEN 'AusNet'
        WHEN 'citipowercor_current_unplanned_outages' THEN 'CitiPowerCor'
        WHEN 'essential_current_unplanned_outages' THEN 'Essential Energy'
        WHEN 'jemena_current_unplanned_outages' THEN 'Jemena'
        WHEN 'unitedenergy_current_unplanned_outages' THEN 'UnitedEnergy'
        WHEN 'tasnetworks_current_unplanned_outages' THEN 'TasNetworks'
        ELSE NULL
    END;
    
    IF provider_name IS NOT NULL THEN
        PERFORM gridalert.refresh_provider_unplanned(provider_name);
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers on all source tables (AFTER INSERT/UPDATE/DELETE)
-- These fire automatically when data changes, keeping consolidated table in sync

DROP TRIGGER IF EXISTS trg_refresh_ausgrid_unplanned ON gridalert.ausgrid_unplanned_outages;
CREATE TRIGGER trg_refresh_ausgrid_unplanned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.ausgrid_unplanned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_unplanned();

DROP TRIGGER IF EXISTS trg_refresh_endeavour_unplanned ON gridalert.endeavour_current_unplanned_outages;
CREATE TRIGGER trg_refresh_endeavour_unplanned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.endeavour_current_unplanned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_unplanned();

DROP TRIGGER IF EXISTS trg_refresh_energex_unplanned ON gridalert.energex_current_unplanned_outages;
CREATE TRIGGER trg_refresh_energex_unplanned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.energex_current_unplanned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_unplanned();

DROP TRIGGER IF EXISTS trg_refresh_ergon_unplanned ON gridalert.ergon_current_unplanned_outages;
CREATE TRIGGER trg_refresh_ergon_unplanned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.ergon_current_unplanned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_unplanned();

DROP TRIGGER IF EXISTS trg_refresh_sapower_unplanned ON gridalert.sapower_current_unplanned_outages;
CREATE TRIGGER trg_refresh_sapower_unplanned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.sapower_current_unplanned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_unplanned();

DROP TRIGGER IF EXISTS trg_refresh_horizon_unplanned ON gridalert.horizon_current_unplanned_outages;
CREATE TRIGGER trg_refresh_horizon_unplanned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.horizon_current_unplanned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_unplanned();

DROP TRIGGER IF EXISTS trg_refresh_wpower_unplanned ON gridalert.wpower_current_unplanned_outages;
CREATE TRIGGER trg_refresh_wpower_unplanned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.wpower_current_unplanned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_unplanned();

DROP TRIGGER IF EXISTS trg_refresh_ausnet_unplanned ON gridalert.ausnet_current_unplanned_outages;
CREATE TRIGGER trg_refresh_ausnet_unplanned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.ausnet_current_unplanned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_unplanned();

DROP TRIGGER IF EXISTS trg_refresh_citipowercor_unplanned ON gridalert.citipowercor_current_unplanned_outages;
CREATE TRIGGER trg_refresh_citipowercor_unplanned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.citipowercor_current_unplanned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_unplanned();

DROP TRIGGER IF EXISTS trg_refresh_essential_unplanned ON gridalert.essential_current_unplanned_outages;
CREATE TRIGGER trg_refresh_essential_unplanned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.essential_current_unplanned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_unplanned();

DROP TRIGGER IF EXISTS trg_refresh_jemena_unplanned ON gridalert.jemena_current_unplanned_outages;
CREATE TRIGGER trg_refresh_jemena_unplanned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.jemena_current_unplanned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_unplanned();

DROP TRIGGER IF EXISTS trg_refresh_unitedenergy_unplanned ON gridalert.unitedenergy_current_unplanned_outages;
CREATE TRIGGER trg_refresh_unitedenergy_unplanned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.unitedenergy_current_unplanned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_unplanned();

DROP TRIGGER IF EXISTS trg_refresh_tasnetworks_unplanned ON gridalert.tasnetworks_current_unplanned_outages;
CREATE TRIGGER trg_refresh_tasnetworks_unplanned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.tasnetworks_current_unplanned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_unplanned();

-- Initial population (populate all providers)
SELECT gridalert.refresh_provider_unplanned('Ausgrid');
SELECT gridalert.refresh_provider_unplanned('Endeavour');
SELECT gridalert.refresh_provider_unplanned('Energex');
SELECT gridalert.refresh_provider_unplanned('Ergon');
SELECT gridalert.refresh_provider_unplanned('SA Power');
SELECT gridalert.refresh_provider_unplanned('Horizon Power');
SELECT gridalert.refresh_provider_unplanned('WPower');
SELECT gridalert.refresh_provider_unplanned('AusNet');
SELECT gridalert.refresh_provider_unplanned('CitiPowerCor');
SELECT gridalert.refresh_provider_unplanned('Essential Energy');
SELECT gridalert.refresh_provider_unplanned('Jemena');
SELECT gridalert.refresh_provider_unplanned('UnitedEnergy');
SELECT gridalert.refresh_provider_unplanned('TasNetworks');

-- Enable Row Level Security (for consistency with other tables)
ALTER TABLE gridalert.unplanned_outages_consolidated ENABLE ROW LEVEL SECURITY;

-- RLS policy: Allow read access to everyone (anon and authenticated)
DROP POLICY IF EXISTS unplanned_consolidated_select_anon ON gridalert.unplanned_outages_consolidated;
CREATE POLICY unplanned_consolidated_select_anon
    ON gridalert.unplanned_outages_consolidated
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Grant permissions
GRANT SELECT ON gridalert.unplanned_outages_consolidated TO anon, authenticated;
GRANT EXECUTE ON FUNCTION gridalert.refresh_provider_unplanned(TEXT) TO service_role;

-- ============================================================================
-- NOTE: Similar tables and triggers need to be created for:
-- - current_planned_outages_consolidated
-- - future_planned_outages_consolidated
-- 
-- The pattern is identical - just change the table names and field mappings.
-- ============================================================================


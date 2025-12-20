-- ============================================================================
-- AUTO-UPDATING CONSOLIDATED TABLE FOR FUTURE PLANNED OUTAGES
-- ============================================================================
-- This table automatically stays in sync with source tables using triggers.
-- No scheduled refreshes needed - updates happen instantly when data changes!
-- ============================================================================
-- NOTE: Not all providers have future planned outages tables.
-- This includes: Ausgrid, Endeavour, Energex, Ergon, SA Power, Horizon Power, WPower, AusNet
-- ============================================================================

-- ============================================================================
-- FUTURE PLANNED OUTAGES CONSOLIDATED TABLE
-- ============================================================================

DROP TABLE IF EXISTS gridalert.future_planned_outages_consolidated CASCADE;

CREATE TABLE gridalert.future_planned_outages_consolidated (
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

CREATE INDEX IF NOT EXISTS idx_future_planned_provider ON gridalert.future_planned_outages_consolidated(provider);
CREATE INDEX IF NOT EXISTS idx_future_planned_start_date ON gridalert.future_planned_outages_consolidated(start_date_time);
CREATE INDEX IF NOT EXISTS idx_future_planned_end_date ON gridalert.future_planned_outages_consolidated(end_date_time);
CREATE INDEX IF NOT EXISTS idx_future_planned_state ON gridalert.future_planned_outages_consolidated(state);

-- Function to refresh a specific provider's future planned outages
CREATE OR REPLACE FUNCTION gridalert.refresh_provider_future_planned(provider_name TEXT)
RETURNS void AS $$
DECLARE
    feeder_count BIGINT;
    consolidated_count BIGINT;
BEGIN
    -- Delete existing records for this provider
    DELETE FROM gridalert.future_planned_outages_consolidated WHERE provider = provider_name;
    
    -- Get feeder table count before insert
    CASE provider_name
        WHEN 'Ausgrid' THEN SELECT COUNT(*) INTO feeder_count FROM gridalert.ausgrid_future_planned_outages;
        WHEN 'Endeavour' THEN SELECT COUNT(*) INTO feeder_count FROM gridalert.endeavour_future_planned_outages;
        WHEN 'Energex' THEN SELECT COUNT(*) INTO feeder_count FROM gridalert.energex_future_planned_outages;
        WHEN 'Ergon' THEN SELECT COUNT(*) INTO feeder_count FROM gridalert.ergon_future_planned_outages;
        WHEN 'SA Power' THEN SELECT COUNT(*) INTO feeder_count FROM gridalert.sapower_future_planned_outages;
        WHEN 'Horizon Power' THEN SELECT COUNT(*) INTO feeder_count FROM gridalert.horizon_future_planned_outages;
        WHEN 'WPower' THEN SELECT COUNT(*) INTO feeder_count FROM gridalert.wpower_future_planned_outages;
        WHEN 'AusNet' THEN SELECT COUNT(*) INTO feeder_count FROM gridalert.ausnet_future_planned_outages;
        ELSE feeder_count := 0;
    END CASE;
    
    -- Re-insert based on provider
    CASE provider_name
        WHEN 'Ausgrid' THEN
            INSERT INTO gridalert.future_planned_outages_consolidated
            SELECT 
                id::text, 'Ausgrid', area_suburb, cause,
                customers_affected::text, end_date_time, start_date_time, status,
                COALESCE(street_affected, ''), point_lat::numeric, point_lng::numeric, 'NSW'::text,
                polygon_geojson, webid::text, NULL::jsonb, NULL::jsonb, cause,
                CURRENT_TIMESTAMP
            FROM gridalert.ausgrid_future_planned_outages
            ON CONFLICT (id, provider) DO UPDATE SET
                area_suburb = EXCLUDED.area_suburb,
                cause = EXCLUDED.cause,
                customers_affected = EXCLUDED.customers_affected,
                end_date_time = EXCLUDED.end_date_time,
                start_date_time = EXCLUDED.start_date_time,
                status = EXCLUDED.status,
                streets_affected = EXCLUDED.streets_affected,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                polygon_geojson = EXCLUDED.polygon_geojson,
                reason = EXCLUDED.reason,
                consolidated_at = CURRENT_TIMESTAMP;
            
        WHEN 'Endeavour' THEN
            INSERT INTO gridalert.future_planned_outages_consolidated
            SELECT 
                id::text, 'Endeavour', suburb, reason,
                number_customers_affected::text, end_date_time, start_date_time, status,
                street_name, latitude::numeric, longitude::numeric, 'NSW'::text,
                NULL::jsonb, incident_id::text, NULL::jsonb, NULL::jsonb, reason,
                CURRENT_TIMESTAMP
            FROM gridalert.endeavour_future_planned_outages
            ON CONFLICT (id, provider) DO UPDATE SET
                area_suburb = EXCLUDED.area_suburb,
                cause = EXCLUDED.cause,
                customers_affected = EXCLUDED.customers_affected,
                end_date_time = EXCLUDED.end_date_time,
                start_date_time = EXCLUDED.start_date_time,
                status = EXCLUDED.status,
                streets_affected = EXCLUDED.streets_affected,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                reason = EXCLUDED.reason,
                consolidated_at = CURRENT_TIMESTAMP;
            
        WHEN 'Energex' THEN
            INSERT INTO gridalert.future_planned_outages_consolidated
            SELECT 
                id::text, 'Energex', suburbs, reason,
                customers_affected::text, est_fix_time, start_time, status,
                COALESCE(streets, ''), point_lat::numeric, point_lng::numeric, 'QLD'::text,
                polygon_geojson, event_id::text, NULL::jsonb, NULL::jsonb, reason,
                CURRENT_TIMESTAMP
            FROM gridalert.energex_future_planned_outages
            ON CONFLICT (id, provider) DO UPDATE SET
                area_suburb = EXCLUDED.area_suburb,
                cause = EXCLUDED.cause,
                customers_affected = EXCLUDED.customers_affected,
                end_date_time = EXCLUDED.end_date_time,
                start_date_time = EXCLUDED.start_date_time,
                status = EXCLUDED.status,
                streets_affected = EXCLUDED.streets_affected,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                polygon_geojson = EXCLUDED.polygon_geojson,
                reason = EXCLUDED.reason,
                consolidated_at = CURRENT_TIMESTAMP;
            
        WHEN 'Ergon' THEN
            INSERT INTO gridalert.future_planned_outages_consolidated
            SELECT 
                id::text, 'Ergon', suburbs, reason,
                customers_affected::text, est_fix_time, start_time, status,
                COALESCE(streets, ''), point_lat::numeric, point_lng::numeric, 'QLD'::text,
                polygon_geojson, event_id::text, NULL::jsonb, NULL::jsonb, reason,
                CURRENT_TIMESTAMP
            FROM gridalert.ergon_future_planned_outages
            ON CONFLICT (id, provider) DO UPDATE SET
                area_suburb = EXCLUDED.area_suburb,
                cause = EXCLUDED.cause,
                customers_affected = EXCLUDED.customers_affected,
                end_date_time = EXCLUDED.end_date_time,
                start_date_time = EXCLUDED.start_date_time,
                status = EXCLUDED.status,
                streets_affected = EXCLUDED.streets_affected,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                polygon_geojson = EXCLUDED.polygon_geojson,
                reason = EXCLUDED.reason,
                consolidated_at = CURRENT_TIMESTAMP;
            
        WHEN 'SA Power' THEN
            INSERT INTO gridalert.future_planned_outages_consolidated
            SELECT 
                id::text, 'SA Power',
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
                reason, affected_customers::text, est_restoration, start_time, status,
                COALESCE(feeders->>0, ''), point_lat::numeric, point_lng::numeric, 'SA'::text,
                NULL::jsonb, job_id::text, affected_suburbs, NULL::jsonb, reason,
                CURRENT_TIMESTAMP
            FROM gridalert.sapower_future_planned_outages
            ON CONFLICT (id, provider) DO UPDATE SET
                area_suburb = EXCLUDED.area_suburb,
                cause = EXCLUDED.cause,
                customers_affected = EXCLUDED.customers_affected,
                end_date_time = EXCLUDED.end_date_time,
                start_date_time = EXCLUDED.start_date_time,
                status = EXCLUDED.status,
                streets_affected = EXCLUDED.streets_affected,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                suburbs = EXCLUDED.suburbs,
                reason = EXCLUDED.reason,
                consolidated_at = CURRENT_TIMESTAMP;
            
        WHEN 'Horizon Power' THEN
            INSERT INTO gridalert.future_planned_outages_consolidated
            SELECT 
                id::text, 'Horizon Power',
                COALESCE(service_area, region, 
                    CASE 
                        WHEN service_areas IS NOT NULL AND jsonb_typeof(service_areas) = 'array' THEN
                            (SELECT string_agg(value::text, ', ') FROM jsonb_array_elements_text(service_areas))
                        ELSE NULL
                    END, 'Unknown area'),
                COALESCE(outage_type, 'Future maintenance'), affected_customers::text,
                estimated_restore_time, start_time, COALESCE(status, 'Planned'),
                CASE 
                    WHEN service_areas IS NOT NULL AND jsonb_typeof(service_areas) = 'array' THEN
                        (SELECT string_agg(value::text, ', ') FROM jsonb_array_elements_text(service_areas))
                    ELSE COALESCE(service_area, '')
                END,
                point_lat::numeric, point_lng::numeric, 'WA'::text,
                NULL::jsonb, outage_id::text, NULL::jsonb, NULL::jsonb, NULL::text,
                CURRENT_TIMESTAMP
            FROM gridalert.horizon_future_planned_outages
            ON CONFLICT (id, provider) DO UPDATE SET
                area_suburb = EXCLUDED.area_suburb,
                cause = EXCLUDED.cause,
                customers_affected = EXCLUDED.customers_affected,
                end_date_time = EXCLUDED.end_date_time,
                start_date_time = EXCLUDED.start_date_time,
                status = EXCLUDED.status,
                streets_affected = EXCLUDED.streets_affected,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                consolidated_at = CURRENT_TIMESTAMP;
            
        WHEN 'WPower' THEN
            INSERT INTO gridalert.future_planned_outages_consolidated
            SELECT 
                id::text, 'WPower',
                CASE 
                    WHEN areas IS NOT NULL AND jsonb_typeof(areas) = 'array' THEN
                        (SELECT string_agg(value::text, ', ') FROM jsonb_array_elements_text(areas))
                    ELSE 'Unknown area'
                END,
                COALESCE(outage_type, 'Future maintenance'), affected_customers::text,
                restoration_time, start_time, COALESCE(outage_type, 'Planned'),
                CASE 
                    WHEN areas IS NOT NULL AND jsonb_typeof(areas) = 'array' THEN
                        (SELECT string_agg(value::text, ', ') FROM jsonb_array_elements_text(areas))
                    ELSE ''
                END,
                point_lat::numeric, point_lng::numeric, 'WA'::text,
                NULL::jsonb, outage_id::text, NULL::jsonb, NULL::jsonb, NULL::text,
                CURRENT_TIMESTAMP
            FROM gridalert.wpower_future_planned_outages
            ON CONFLICT (id, provider) DO UPDATE SET
                area_suburb = EXCLUDED.area_suburb,
                cause = EXCLUDED.cause,
                customers_affected = EXCLUDED.customers_affected,
                end_date_time = EXCLUDED.end_date_time,
                start_date_time = EXCLUDED.start_date_time,
                status = EXCLUDED.status,
                streets_affected = EXCLUDED.streets_affected,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                consolidated_at = CURRENT_TIMESTAMP;
            
        WHEN 'AusNet' THEN
            INSERT INTO gridalert.future_planned_outages_consolidated
            SELECT 
                id::text, 'AusNet',
                CASE 
                    WHEN suburbs IS NOT NULL AND array_length(suburbs, 1) > 0 THEN
                        array_to_string(suburbs, ', ')
                    ELSE COALESCE(incident, 'Unknown area')
                END,
                CASE 
                    WHEN cause IS NOT NULL THEN cause
                    WHEN details IS NOT NULL THEN details::text
                    ELSE 'Future maintenance'
                END,
                COALESCE(customers_affected, 
                    CASE 
                        WHEN impacted_nmi IS NOT NULL AND jsonb_typeof(impacted_nmi) = 'array' THEN jsonb_array_length(impacted_nmi)
                        ELSE 0
                    END
                )::text,
                planned_end_time, planned_start_time, COALESCE(status, incident_status, 'Planned'),
                '', point_lat::numeric, point_lng::numeric, 'VIC'::text,
                NULL::jsonb, incident_id::text,
                CASE WHEN suburbs IS NOT NULL THEN to_jsonb(suburbs) ELSE NULL END,
                CASE WHEN postcodes IS NOT NULL THEN to_jsonb(postcodes) ELSE NULL END,
                NULL::text, CURRENT_TIMESTAMP
            FROM gridalert.ausnet_future_planned_outages
            WHERE
                (status NOT ILIKE '%MERGED%' OR status IS NULL) AND
                (status NOT ILIKE '%RESTORED%' OR status IS NULL) AND
                (incident_status NOT ILIKE '%MERGED%' OR incident_status IS NULL) AND
                (incident_status NOT ILIKE '%RESTORED%' OR incident_status IS NULL) AND
                status_last_updated >= (CURRENT_TIMESTAMP - INTERVAL '14 days')
            ON CONFLICT (id, provider) DO UPDATE SET
                area_suburb = EXCLUDED.area_suburb,
                cause = EXCLUDED.cause,
                customers_affected = EXCLUDED.customers_affected,
                end_date_time = EXCLUDED.end_date_time,
                start_date_time = EXCLUDED.start_date_time,
                status = EXCLUDED.status,
                streets_affected = EXCLUDED.streets_affected,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                suburbs = EXCLUDED.suburbs,
                postcodes = EXCLUDED.postcodes,
                consolidated_at = CURRENT_TIMESTAMP;
    END CASE;

    -- Get consolidated table count after insert
    SELECT COUNT(*) INTO consolidated_count FROM gridalert.future_planned_outages_consolidated WHERE provider = provider_name;

    RAISE NOTICE 'Provider: %, Feeder Count: %, Consolidated Count: %, Match: %', 
        provider_name, feeder_count, consolidated_count, 
        CASE WHEN feeder_count = consolidated_count THEN 'YES' ELSE 'NO' END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function that refreshes provider data after INSERT/UPDATE/DELETE
-- Only triggers consolidation when geometry data is present for Ausgrid
CREATE OR REPLACE FUNCTION gridalert.trigger_refresh_future_planned()
RETURNS TRIGGER AS $$
DECLARE
    provider_name TEXT;
    has_geometry BOOLEAN := FALSE;
BEGIN
    -- Determine provider from table name
    provider_name := CASE TG_TABLE_NAME
        WHEN 'ausgrid_future_planned_outages' THEN 'Ausgrid'
        WHEN 'endeavour_future_planned_outages' THEN 'Endeavour'
        WHEN 'energex_future_planned_outages' THEN 'Energex'
        WHEN 'ergon_future_planned_outages' THEN 'Ergon'
        WHEN 'sapower_future_planned_outages' THEN 'SA Power'
        WHEN 'horizon_future_planned_outages' THEN 'Horizon Power'
        WHEN 'wpower_future_planned_outages' THEN 'WPower'
        WHEN 'ausnet_future_planned_outages' THEN 'AusNet'
        ELSE NULL
    END;

    IF provider_name IS NOT NULL THEN
        -- For Ausgrid, only trigger consolidation on INSERT/UPDATE (not DELETE)
        -- Check if ANY records in the table have geometry data before refreshing
        IF provider_name = 'Ausgrid' THEN
            -- Skip DELETE operations - they will be handled when new data is inserted
            IF TG_OP = 'DELETE' THEN
                RETURN NULL;
            END IF;

            -- For INSERT/UPDATE, always refresh after batch insert completes
            -- The refresh function will include all records (with or without geometry)
            IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
                -- Always refresh - the function handles all records appropriately
                PERFORM gridalert.refresh_provider_future_planned(provider_name);
            END IF;
        ELSE
            -- For all other providers, trigger immediately (but skip DELETE)
            IF TG_OP != 'DELETE' THEN
                PERFORM gridalert.refresh_provider_future_planned(provider_name);
            END IF;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers on all source tables
DROP TRIGGER IF EXISTS trg_refresh_ausgrid_future_planned ON gridalert.ausgrid_future_planned_outages;
CREATE TRIGGER trg_refresh_ausgrid_future_planned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.ausgrid_future_planned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_future_planned();

DROP TRIGGER IF EXISTS trg_refresh_endeavour_future_planned ON gridalert.endeavour_future_planned_outages;
CREATE TRIGGER trg_refresh_endeavour_future_planned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.endeavour_future_planned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_future_planned();

DROP TRIGGER IF EXISTS trg_refresh_energex_future_planned ON gridalert.energex_future_planned_outages;
CREATE TRIGGER trg_refresh_energex_future_planned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.energex_future_planned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_future_planned();

DROP TRIGGER IF EXISTS trg_refresh_ergon_future_planned ON gridalert.ergon_future_planned_outages;
CREATE TRIGGER trg_refresh_ergon_future_planned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.ergon_future_planned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_future_planned();

DROP TRIGGER IF EXISTS trg_refresh_sapower_future_planned ON gridalert.sapower_future_planned_outages;
CREATE TRIGGER trg_refresh_sapower_future_planned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.sapower_future_planned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_future_planned();

DROP TRIGGER IF EXISTS trg_refresh_horizon_future_planned ON gridalert.horizon_future_planned_outages;
CREATE TRIGGER trg_refresh_horizon_future_planned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.horizon_future_planned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_future_planned();

DROP TRIGGER IF EXISTS trg_refresh_wpower_future_planned ON gridalert.wpower_future_planned_outages;
CREATE TRIGGER trg_refresh_wpower_future_planned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.wpower_future_planned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_future_planned();

DROP TRIGGER IF EXISTS trg_refresh_ausnet_future_planned ON gridalert.ausnet_future_planned_outages;
CREATE TRIGGER trg_refresh_ausnet_future_planned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.ausnet_future_planned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_future_planned();

-- Initial population
SELECT gridalert.refresh_provider_future_planned('Ausgrid');
SELECT gridalert.refresh_provider_future_planned('Endeavour');
SELECT gridalert.refresh_provider_future_planned('Energex');
SELECT gridalert.refresh_provider_future_planned('Ergon');
SELECT gridalert.refresh_provider_future_planned('SA Power');
SELECT gridalert.refresh_provider_future_planned('Horizon Power');
SELECT gridalert.refresh_provider_future_planned('WPower');
SELECT gridalert.refresh_provider_future_planned('AusNet');

-- Enable Row Level Security
ALTER TABLE gridalert.future_planned_outages_consolidated ENABLE ROW LEVEL SECURITY;

-- RLS policy: Allow read access to everyone
DROP POLICY IF EXISTS future_planned_consolidated_select_anon ON gridalert.future_planned_outages_consolidated;
CREATE POLICY future_planned_consolidated_select_anon
    ON gridalert.future_planned_outages_consolidated
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Grant permissions
GRANT SELECT ON gridalert.future_planned_outages_consolidated TO anon, authenticated;
GRANT EXECUTE ON FUNCTION gridalert.refresh_provider_future_planned(TEXT) TO service_role;

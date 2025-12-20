-- ============================================================================
-- AUTO-UPDATING CONSOLIDATED TABLE FOR CURRENT PLANNED OUTAGES
-- ============================================================================
-- This table automatically stays in sync with source tables using triggers.
-- No scheduled refreshes needed - updates happen instantly when data changes!
-- ============================================================================

-- ============================================================================
-- CURRENT PLANNED OUTAGES CONSOLIDATED TABLE
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

-- Function to refresh a specific provider's current planned outages
CREATE OR REPLACE FUNCTION gridalert.refresh_provider_current_planned(provider_name TEXT)
RETURNS void AS $$
DECLARE
    feeder_count BIGINT;
    consolidated_count BIGINT;
BEGIN
    -- Delete existing records for this provider
    DELETE FROM gridalert.current_planned_outages_consolidated WHERE provider = provider_name;
    
    -- Get feeder table count before insert
    CASE provider_name
        WHEN 'Ausgrid' THEN SELECT COUNT(*) INTO feeder_count FROM gridalert.ausgrid_current_planned_outages;
        WHEN 'Endeavour' THEN SELECT COUNT(*) INTO feeder_count FROM gridalert.endeavour_current_planned_outages;
        WHEN 'Energex' THEN SELECT COUNT(*) INTO feeder_count FROM gridalert.energex_current_planned_outages;
        WHEN 'Ergon' THEN SELECT COUNT(*) INTO feeder_count FROM gridalert.ergon_current_planned_outages;
        WHEN 'SA Power' THEN SELECT COUNT(*) INTO feeder_count FROM gridalert.sapower_current_planned_outages;
        WHEN 'Horizon Power' THEN SELECT COUNT(*) INTO feeder_count FROM gridalert.horizon_current_planned_outages;
        WHEN 'WPower' THEN SELECT COUNT(*) INTO feeder_count FROM gridalert.wpower_current_planned_outages;
        WHEN 'AusNet' THEN SELECT COUNT(*) INTO feeder_count FROM gridalert.ausnet_current_planned_outages;
        WHEN 'CitiPowerCor' THEN SELECT COUNT(*) INTO feeder_count FROM gridalert.citipowercor_current_planned_outages;
        WHEN 'Essential Energy' THEN SELECT COUNT(*) INTO feeder_count FROM gridalert.essential_current_planned_outages;
        WHEN 'Jemena' THEN SELECT COUNT(*) INTO feeder_count FROM gridalert.jemena_current_planned_outages;
        WHEN 'UnitedEnergy' THEN SELECT COUNT(*) INTO feeder_count FROM gridalert.unitedenergy_current_planned_outages;
        WHEN 'TasNetworks' THEN SELECT COUNT(*) INTO feeder_count FROM gridalert.tasnetworks_current_planned_outages;
        ELSE feeder_count := 0;
    END CASE;
    
    -- Re-insert based on provider
    CASE provider_name
        WHEN 'Ausgrid' THEN
            INSERT INTO gridalert.current_planned_outages_consolidated
            SELECT 
                id::text, 'Ausgrid', area_suburb, cause,
                customers_affected::text, end_date_time, start_date_time, status,
                COALESCE(streets_affected, ''), point_lat::numeric, point_lng::numeric, 'NSW'::text,
                polygon_geojson, webid::text, NULL::jsonb, NULL::jsonb, cause,
                CURRENT_TIMESTAMP
            FROM gridalert.ausgrid_current_planned_outages
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
            INSERT INTO gridalert.current_planned_outages_consolidated
            SELECT 
                id::text, 'Endeavour', suburb, reason,
                number_customers_affected::text, end_date_time, start_date_time, status,
                street_name, latitude::numeric, longitude::numeric, 'NSW'::text,
                NULL::jsonb, incident_id::text, NULL::jsonb, NULL::jsonb, reason,
                CURRENT_TIMESTAMP
            FROM gridalert.endeavour_current_planned_outages
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
            INSERT INTO gridalert.current_planned_outages_consolidated
            SELECT 
                id::text, 'Energex', suburbs, reason,
                customers_affected::text, est_fix_time, start_time, status,
                COALESCE(streets, ''), point_lat::numeric, point_lng::numeric, 'QLD'::text,
                polygon_geojson, event_id::text, NULL::jsonb, NULL::jsonb, reason,
                CURRENT_TIMESTAMP
            FROM gridalert.energex_current_planned_outages
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
            INSERT INTO gridalert.current_planned_outages_consolidated
            SELECT 
                id::text, 'Ergon', suburbs, reason,
                customers_affected::text, est_fix_time, start_time, status,
                COALESCE(streets, ''), point_lat::numeric, point_lng::numeric, 'QLD'::text,
                polygon_geojson, event_id::text, NULL::jsonb, NULL::jsonb, reason,
                CURRENT_TIMESTAMP
            FROM gridalert.ergon_current_planned_outages
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
            INSERT INTO gridalert.current_planned_outages_consolidated
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
                polygon_geojson, job_id::text, affected_suburbs, NULL::jsonb, reason,
                CURRENT_TIMESTAMP
            FROM gridalert.sapower_current_planned_outages
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
                suburbs = EXCLUDED.suburbs,
                reason = EXCLUDED.reason,
                consolidated_at = CURRENT_TIMESTAMP;
            
        WHEN 'Horizon Power' THEN
            INSERT INTO gridalert.current_planned_outages_consolidated
            SELECT 
                id::text, 'Horizon Power',
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
                point_lat::numeric, point_lng::numeric, 'WA'::text,
                NULL::jsonb, outage_id::text, NULL::jsonb, NULL::jsonb, NULL::text,
                CURRENT_TIMESTAMP
            FROM gridalert.horizon_current_planned_outages
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
            INSERT INTO gridalert.current_planned_outages_consolidated
            SELECT 
                id::text, 'WPower',
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
                point_lat::numeric, point_lng::numeric, 'WA'::text,
                polygon_geojson, outage_id::text, NULL::jsonb, NULL::jsonb, NULL::text,
                CURRENT_TIMESTAMP
            FROM gridalert.wpower_current_planned_outages
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
                consolidated_at = CURRENT_TIMESTAMP;
            
        WHEN 'AusNet' THEN
            INSERT INTO gridalert.current_planned_outages_consolidated
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
                    ELSE 'Planned maintenance'
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
            FROM gridalert.ausnet_current_planned_outages
            WHERE
                (status NOT ILIKE '%MERGED%' OR status IS NULL) AND
                (status NOT ILIKE '%RESTORED%' OR status IS NULL) AND
                (incident_status NOT ILIKE '%MERGED%' OR incident_status IS NULL) AND
                (incident_status NOT ILIKE '%RESTORED%' OR incident_status IS NULL) AND
                status_last_updated >= (CURRENT_TIMESTAMP - INTERVAL '14 days') AND
                incident_status = 'In Progress'
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
            
        WHEN 'CitiPowerCor' THEN
            INSERT INTO gridalert.current_planned_outages_consolidated
            SELECT 
                id::text, 'CitiPowerCor',
                COALESCE(town, area, 'Unknown area'), COALESCE(reason, 'Planned maintenance'),
                COALESCE(customers_affected, 0)::text, est_time_on, time_off,
                COALESCE(outage_type, crew_status, 'Planned'),
                CASE 
                    WHEN privatised IS NOT NULL THEN SPLIT_PART(privatised, ',', 1)
                    ELSE ''
                END,
                point_lat::numeric, point_lng::numeric, 'VIC'::text,
                polygon_geojson, outage_id::text, NULL::jsonb, NULL::jsonb, reason,
                CURRENT_TIMESTAMP
            FROM gridalert.citipowercor_current_planned_outages
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
            
        WHEN 'Essential Energy' THEN
            INSERT INTO gridalert.current_planned_outages_consolidated
            SELECT 
                id::text, 'Essential Energy',
                'Unknown area', COALESCE(reason, 'Planned maintenance'),
                COALESCE(customers_affected, 0)::text, est_time_on, time_off,
                COALESCE(outage_type, 'Planned'),
                '', point_lat::numeric, point_lng::numeric, 'NSW'::text,
                polygon_geojson, outage_id::text, NULL::jsonb, NULL::jsonb, reason,
                CURRENT_TIMESTAMP
            FROM gridalert.essential_current_planned_outages
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
            
        WHEN 'Jemena' THEN
            INSERT INTO gridalert.current_planned_outages_consolidated
            SELECT 
                id::text, 'Jemena',
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
                point_lat::numeric, point_lng::numeric, 'VIC'::text,
                polygon_geojson, outage_id::text,
                CASE WHEN suburbs IS NOT NULL THEN to_jsonb(suburbs) ELSE NULL END,
                CASE WHEN postcodes IS NOT NULL THEN to_jsonb(postcodes) ELSE NULL END,
                reason, CURRENT_TIMESTAMP
            FROM gridalert.jemena_current_planned_outages
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
                suburbs = EXCLUDED.suburbs,
                postcodes = EXCLUDED.postcodes,
                reason = EXCLUDED.reason,
                consolidated_at = CURRENT_TIMESTAMP;
            
        WHEN 'UnitedEnergy' THEN
            INSERT INTO gridalert.current_planned_outages_consolidated
            SELECT 
                id::text, 'UnitedEnergy',
                CASE 
                    WHEN suburbs IS NOT NULL AND array_length(suburbs, 1) > 0 THEN
                        array_to_string(suburbs, ', ')
                    ELSE COALESCE(street_name, 'Unknown area')
                END,
                COALESCE(reason, 'Planned maintenance'), COALESCE(customers_affected, 0)::text,
                est_time_on, time_off, COALESCE(outage_type, 'Planned'),
                COALESCE(street_name, ''), point_lat::numeric, point_lng::numeric,
                'VIC'::text, polygon_geojson, outage_id::text,
                CASE WHEN suburbs IS NOT NULL THEN to_jsonb(suburbs) ELSE NULL END,
                CASE WHEN postcodes IS NOT NULL THEN to_jsonb(postcodes) ELSE NULL END,
                reason, CURRENT_TIMESTAMP
            FROM gridalert.unitedenergy_current_planned_outages
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
                suburbs = EXCLUDED.suburbs,
                postcodes = EXCLUDED.postcodes,
                reason = EXCLUDED.reason,
                consolidated_at = CURRENT_TIMESTAMP;
            
        WHEN 'TasNetworks' THEN
            INSERT INTO gridalert.current_planned_outages_consolidated
            SELECT 
                id::text, 'TasNetworks',
                COALESCE(affected_areas, affected_regions, 'Unknown area'),
                COALESCE(reason, 'Planned maintenance'), COALESCE(customers_affected, 0)::text,
                est_time_on, time_off, COALESCE(outage_type, dispatch_status, 'Planned'),
                NULL::text, point_lat::numeric, point_lng::numeric, 'TAS'::text,
                polygon_geojson, COALESCE(outage_id::text, job_id::text), NULL::jsonb,
                CASE WHEN postcodes IS NOT NULL THEN to_jsonb(ARRAY[postcodes]) ELSE NULL END,
                reason, CURRENT_TIMESTAMP
            FROM gridalert.tasnetworks_current_planned_outages
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
                postcodes = EXCLUDED.postcodes,
                reason = EXCLUDED.reason,
                consolidated_at = CURRENT_TIMESTAMP;
    END CASE;
    
    -- Get consolidated table count after insert
    SELECT COUNT(*) INTO consolidated_count 
    FROM gridalert.current_planned_outages_consolidated 
    WHERE provider = provider_name;
    
    -- Log the counts (this will appear in PostgreSQL logs and can be captured by application)
    RAISE NOTICE 'Provider: %, Feeder Table Rows: %, Consolidated Table Rows: %, Match: %', 
        provider_name, feeder_count, consolidated_count, 
        CASE WHEN feeder_count = consolidated_count THEN 'YES' ELSE 'NO' END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function that refreshes provider data after INSERT/UPDATE/DELETE
-- Only triggers consolidation when geometry data is present for Ausgrid
CREATE OR REPLACE FUNCTION gridalert.trigger_refresh_current_planned()
RETURNS TRIGGER AS $$
DECLARE
    provider_name TEXT;
    has_geometry BOOLEAN := FALSE;
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
                PERFORM gridalert.refresh_provider_current_planned(provider_name);
            END IF;
        ELSE
            -- For all other providers, trigger immediately (but skip DELETE)
            IF TG_OP != 'DELETE' THEN
                PERFORM gridalert.refresh_provider_current_planned(provider_name);
            END IF;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers on all source tables
DROP TRIGGER IF EXISTS trg_refresh_ausgrid_current_planned ON gridalert.ausgrid_current_planned_outages;
CREATE TRIGGER trg_refresh_ausgrid_current_planned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.ausgrid_current_planned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_current_planned();

DROP TRIGGER IF EXISTS trg_refresh_endeavour_current_planned ON gridalert.endeavour_current_planned_outages;
CREATE TRIGGER trg_refresh_endeavour_current_planned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.endeavour_current_planned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_current_planned();

DROP TRIGGER IF EXISTS trg_refresh_energex_current_planned ON gridalert.energex_current_planned_outages;
CREATE TRIGGER trg_refresh_energex_current_planned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.energex_current_planned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_current_planned();

DROP TRIGGER IF EXISTS trg_refresh_ergon_current_planned ON gridalert.ergon_current_planned_outages;
CREATE TRIGGER trg_refresh_ergon_current_planned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.ergon_current_planned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_current_planned();

DROP TRIGGER IF EXISTS trg_refresh_sapower_current_planned ON gridalert.sapower_current_planned_outages;
CREATE TRIGGER trg_refresh_sapower_current_planned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.sapower_current_planned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_current_planned();

DROP TRIGGER IF EXISTS trg_refresh_horizon_current_planned ON gridalert.horizon_current_planned_outages;
CREATE TRIGGER trg_refresh_horizon_current_planned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.horizon_current_planned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_current_planned();

DROP TRIGGER IF EXISTS trg_refresh_wpower_current_planned ON gridalert.wpower_current_planned_outages;
CREATE TRIGGER trg_refresh_wpower_current_planned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.wpower_current_planned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_current_planned();

DROP TRIGGER IF EXISTS trg_refresh_ausnet_current_planned ON gridalert.ausnet_current_planned_outages;
CREATE TRIGGER trg_refresh_ausnet_current_planned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.ausnet_current_planned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_current_planned();

DROP TRIGGER IF EXISTS trg_refresh_citipowercor_current_planned ON gridalert.citipowercor_current_planned_outages;
CREATE TRIGGER trg_refresh_citipowercor_current_planned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.citipowercor_current_planned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_current_planned();

DROP TRIGGER IF EXISTS trg_refresh_essential_current_planned ON gridalert.essential_current_planned_outages;
CREATE TRIGGER trg_refresh_essential_current_planned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.essential_current_planned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_current_planned();

DROP TRIGGER IF EXISTS trg_refresh_jemena_current_planned ON gridalert.jemena_current_planned_outages;
CREATE TRIGGER trg_refresh_jemena_current_planned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.jemena_current_planned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_current_planned();

DROP TRIGGER IF EXISTS trg_refresh_unitedenergy_current_planned ON gridalert.unitedenergy_current_planned_outages;
CREATE TRIGGER trg_refresh_unitedenergy_current_planned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.unitedenergy_current_planned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_current_planned();

DROP TRIGGER IF EXISTS trg_refresh_tasnetworks_current_planned ON gridalert.tasnetworks_current_planned_outages;
CREATE TRIGGER trg_refresh_tasnetworks_current_planned
    AFTER INSERT OR UPDATE OR DELETE ON gridalert.tasnetworks_current_planned_outages
    FOR EACH STATEMENT
    EXECUTE FUNCTION gridalert.trigger_refresh_current_planned();

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

-- Enable Row Level Security
ALTER TABLE gridalert.current_planned_outages_consolidated ENABLE ROW LEVEL SECURITY;

-- RLS policy: Allow read access to everyone
DROP POLICY IF EXISTS current_planned_consolidated_select_anon ON gridalert.current_planned_outages_consolidated;
CREATE POLICY current_planned_consolidated_select_anon
    ON gridalert.current_planned_outages_consolidated
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Grant permissions
GRANT SELECT ON gridalert.current_planned_outages_consolidated TO anon, authenticated;
GRANT EXECUTE ON FUNCTION gridalert.refresh_provider_current_planned(TEXT) TO service_role;

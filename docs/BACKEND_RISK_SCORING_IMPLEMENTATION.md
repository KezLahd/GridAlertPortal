# Backend Risk Scoring Implementation Guide

## Overview
This guide details how to implement an at-risk power outage scoring system for clinics (POIs/institutions) based on their proximity to active outages. The system calculates risk scores using both point-to-point distance calculations and polygon intersection checks.

## Table of Contents
1. [Database Schema](#database-schema)
2. [PostgreSQL Functions](#postgresql-functions)
3. [Risk Scoring Logic](#risk-scoring-logic)
4. [Triggers & Auto-Updates](#triggers--auto-updates)
5. [API Endpoints](#api-endpoints)
6. [Testing](#testing)
7. [Performance Optimization](#performance-optimization)

---

## Database Schema

### Step 1: Enable PostGIS Extension
```sql
-- Enable PostGIS for spatial calculations
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Step 2: Create Risk Scoring Table
```sql
-- Create table to store clinic-outage risk assessments
CREATE TABLE IF NOT EXISTS gridalert.clinic_outage_risk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES gridalert.locations(id) ON DELETE CASCADE,
  outage_id INTEGER NOT NULL,
  outage_type VARCHAR(20) NOT NULL CHECK (outage_type IN ('unplanned', 'planned', 'future')),
  provider VARCHAR(100) NOT NULL,
  
  -- Risk metrics
  risk_score DECIMAL(5,2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('critical', 'high', 'medium', 'low', 'none')),
  
  -- Spatial calculations
  distance_km DECIMAL(10,4), -- Distance in kilometers (NULL if inside polygon)
  is_inside_polygon BOOLEAN DEFAULT FALSE,
  polygon_provider VARCHAR(100), -- Provider that provided the polygon data
  
  -- Metadata
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  outage_start_time TIMESTAMP WITH TIME ZONE,
  outage_end_time TIMESTAMP WITH TIME ZONE,
  
  -- Indexes for performance
  CONSTRAINT unique_clinic_outage UNIQUE (clinic_id, outage_id, outage_type)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_clinic_outage_risk_clinic_id ON gridalert.clinic_outage_risk(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_outage_risk_outage_id ON gridalert.clinic_outage_risk(outage_id);
CREATE INDEX IF NOT EXISTS idx_clinic_outage_risk_risk_level ON gridalert.clinic_outage_risk(risk_level);
CREATE INDEX IF NOT EXISTS idx_clinic_outage_risk_risk_score ON gridalert.clinic_outage_risk(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_clinic_outage_risk_calculated_at ON gridalert.clinic_outage_risk(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinic_outage_risk_outage_type ON gridalert.clinic_outage_risk(outage_type);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_clinic_outage_risk_clinic_risk ON gridalert.clinic_outage_risk(clinic_id, risk_level, risk_score DESC);
```

### Step 3: Add Spatial Columns to Existing Tables (if needed)
```sql
-- Add PostGIS geometry columns for locations if not already present
-- This assumes locations table has latitude/longitude columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'gridalert' 
    AND table_name = 'locations' 
    AND column_name = 'geom'
  ) THEN
    ALTER TABLE gridalert.locations 
    ADD COLUMN geom GEOMETRY(POINT, 4326);
    
    -- Populate geometry from lat/lng
    UPDATE gridalert.locations
    SET geom = ST_SetSRID(ST_MakePoint(
      CAST(addresslongitude AS DOUBLE PRECISION),
      CAST(addresslatitude AS DOUBLE PRECISION)
    ), 4326)
    WHERE addresslatitude IS NOT NULL 
    AND addresslongitude IS NOT NULL;
    
    -- Create spatial index
    CREATE INDEX idx_locations_geom ON gridalert.locations USING GIST(geom);
  END IF;
END $$;
```

---

## PostgreSQL Functions

### Step 4: Create Helper Functions

#### Function 1: Calculate Distance Between Two Points
```sql
CREATE OR REPLACE FUNCTION gridalert.calculate_distance_km(
  lat1 DOUBLE PRECISION,
  lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lng2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
BEGIN
  -- Haversine formula for distance calculation
  RETURN (
    6371 * acos(
      cos(radians(lat1)) * 
      cos(radians(lat2)) * 
      cos(radians(lng2) - radians(lng1)) + 
      sin(radians(lat1)) * 
      sin(radians(lat2))
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

#### Function 2: Check if Point is Inside Polygon
```sql
CREATE OR REPLACE FUNCTION gridalert.is_point_in_polygon(
  point_lat DOUBLE PRECISION,
  point_lng DOUBLE PRECISION,
  polygon_geojson JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  polygon_geom GEOMETRY;
  point_geom GEOMETRY;
BEGIN
  -- Return false if polygon data is missing
  IF polygon_geojson IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Create point geometry
  point_geom := ST_SetSRID(ST_MakePoint(point_lng, point_lat), 4326);
  
  -- Parse GeoJSON polygon and create geometry
  BEGIN
    polygon_geom := ST_GeomFromGeoJSON(polygon_geojson::text);
    
    -- Check if point is inside polygon
    RETURN ST_Contains(polygon_geom, point_geom);
  EXCEPTION WHEN OTHERS THEN
    -- If polygon parsing fails, return false
    RETURN FALSE;
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

#### Function 3: Calculate Risk Score
```sql
CREATE OR REPLACE FUNCTION gridalert.calculate_risk_score(
  distance_km DOUBLE PRECISION,
  is_inside_polygon BOOLEAN,
  outage_type VARCHAR(20)
) RETURNS TABLE(
  risk_score DECIMAL(5,2),
  risk_level VARCHAR(20)
) AS $$
DECLARE
  base_score DECIMAL(5,2);
  type_multiplier DECIMAL(3,2);
BEGIN
  -- If inside polygon, always critical
  IF is_inside_polygon THEN
    RETURN QUERY SELECT 100.00::DECIMAL(5,2), 'critical'::VARCHAR(20);
    RETURN;
  END IF;
  
  -- If no distance (shouldn't happen, but safety check)
  IF distance_km IS NULL THEN
    RETURN QUERY SELECT 0.00::DECIMAL(5,2), 'none'::VARCHAR(20);
    RETURN;
  END IF;
  
  -- Outage type multiplier (unplanned is more critical)
  type_multiplier := CASE outage_type
    WHEN 'unplanned' THEN 1.0
    WHEN 'planned' THEN 0.8
    WHEN 'future' THEN 0.6
    ELSE 0.5
  END;
  
  -- Calculate base score based on distance
  base_score := CASE
    WHEN distance_km < 1.0 THEN 90.0 * type_multiplier  -- High risk
    WHEN distance_km < 2.0 THEN 75.0 * type_multiplier  -- High-Medium
    WHEN distance_km < 5.0 THEN 60.0 * type_multiplier  -- Medium
    WHEN distance_km < 10.0 THEN 40.0 * type_multiplier -- Low-Medium
    WHEN distance_km < 20.0 THEN 20.0 * type_multiplier -- Low
    ELSE 0.0                                             -- None
  END;
  
  -- Determine risk level
  RETURN QUERY SELECT 
    base_score::DECIMAL(5,2),
    CASE
      WHEN base_score >= 80 THEN 'critical'::VARCHAR(20)
      WHEN base_score >= 60 THEN 'high'::VARCHAR(20)
      WHEN base_score >= 40 THEN 'medium'::VARCHAR(20)
      WHEN base_score >= 20 THEN 'low'::VARCHAR(20)
      ELSE 'none'::VARCHAR(20)
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

---

## Risk Scoring Logic

### Step 5: Create Main Risk Calculation Function

```sql
CREATE OR REPLACE FUNCTION gridalert.calculate_clinic_outage_risks(
  p_outage_type VARCHAR(20) DEFAULT NULL -- NULL = all types
) RETURNS INTEGER AS $$
DECLARE
  v_clinic RECORD;
  v_outage RECORD;
  v_distance_km DOUBLE PRECISION;
  v_is_inside_polygon BOOLEAN;
  v_risk_score DECIMAL(5,2);
  v_risk_level VARCHAR(20);
  v_count INTEGER := 0;
  v_outage_start TIMESTAMP WITH TIME ZONE;
  v_outage_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Loop through all active clinics
  FOR v_clinic IN 
    SELECT 
      id,
      addresslatitude::DOUBLE PRECISION AS lat,
      addresslongitude::DOUBLE PRECISION AS lng
    FROM gridalert.locations
    WHERE institutionstatus = 'ACTIVE'
    AND addresslatitude IS NOT NULL
    AND addresslongitude IS NOT NULL
  LOOP
    -- Loop through outages based on type
    FOR v_outage IN 
      SELECT 
        id,
        provider,
        latitude::DOUBLE PRECISION AS lat,
        longitude::DOUBLE PRECISION AS lng,
        polygon_geojson,
        'unplanned'::VARCHAR(20) AS outage_type,
        start_time AS start_time,
        estimated_finish_time AS end_time
      FROM gridalert.unplanned_outages_consolidated
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      AND (p_outage_type IS NULL OR p_outage_type = 'unplanned')
      
      UNION ALL
      
      SELECT 
        id,
        provider,
        latitude::DOUBLE PRECISION AS lat,
        longitude::DOUBLE PRECISION AS lng,
        polygon_geojson,
        'planned'::VARCHAR(20) AS outage_type,
        start_date_time AS start_time,
        end_date_time AS end_time
      FROM gridalert.current_planned_outages_consolidated
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      AND (p_outage_type IS NULL OR p_outage_type = 'planned')
      
      UNION ALL
      
      SELECT 
        id,
        provider,
        latitude::DOUBLE PRECISION AS lat,
        longitude::DOUBLE PRECISION AS lng,
        polygon_geojson,
        'future'::VARCHAR(20) AS outage_type,
        start_date_time AS start_time,
        end_date_time AS end_time
      FROM gridalert.future_planned_outages_consolidated
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      AND (p_outage_type IS NULL OR p_outage_type = 'future')
    LOOP
      -- Check if clinic is inside polygon
      v_is_inside_polygon := gridalert.is_point_in_polygon(
        v_clinic.lat,
        v_clinic.lng,
        v_outage.polygon_geojson
      );
      
      -- Calculate distance (only if not inside polygon)
      IF v_is_inside_polygon THEN
        v_distance_km := NULL;
      ELSE
        v_distance_km := gridalert.calculate_distance_km(
          v_clinic.lat,
          v_clinic.lng,
          v_outage.lat,
          v_outage.lng
        );
      END IF;
      
      -- Calculate risk score
      SELECT risk_score, risk_level INTO v_risk_score, v_risk_level
      FROM gridalert.calculate_risk_score(
        v_distance_km,
        v_is_inside_polygon,
        v_outage.outage_type
      );
      
      -- Only insert if risk score > 0 (ignore clinics too far away)
      IF v_risk_score > 0 THEN
        -- Insert or update risk record
        INSERT INTO gridalert.clinic_outage_risk (
          clinic_id,
          outage_id,
          outage_type,
          provider,
          risk_score,
          risk_level,
          distance_km,
          is_inside_polygon,
          polygon_provider,
          outage_start_time,
          outage_end_time,
          calculated_at
        ) VALUES (
          v_clinic.id,
          v_outage.id,
          v_outage.outage_type,
          v_outage.provider,
          v_risk_score,
          v_risk_level,
          v_distance_km,
          v_is_inside_polygon,
          CASE WHEN v_is_inside_polygon THEN v_outage.provider ELSE NULL END,
          v_outage.start_time,
          v_outage.end_time,
          NOW()
        )
        ON CONFLICT (clinic_id, outage_id, outage_type)
        DO UPDATE SET
          risk_score = EXCLUDED.risk_score,
          risk_level = EXCLUDED.risk_level,
          distance_km = EXCLUDED.distance_km,
          is_inside_polygon = EXCLUDED.is_inside_polygon,
          polygon_provider = EXCLUDED.polygon_provider,
          outage_start_time = EXCLUDED.outage_start_time,
          outage_end_time = EXCLUDED.outage_end_time,
          calculated_at = NOW();
        
        v_count := v_count + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
```

---

## Triggers & Auto-Updates

### Step 6: Create Cleanup Function for Resolved Outages
```sql
CREATE OR REPLACE FUNCTION gridalert.cleanup_resolved_outage_risks()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Remove risk records for outages that no longer exist
  DELETE FROM gridalert.clinic_outage_risk
  WHERE (outage_type = 'unplanned' AND outage_id NOT IN (
    SELECT id FROM gridalert.unplanned_outages_consolidated
  ))
  OR (outage_type = 'planned' AND outage_id NOT IN (
    SELECT id FROM gridalert.current_planned_outages_consolidated
  ))
  OR (outage_type = 'future' AND outage_id NOT IN (
    SELECT id FROM gridalert.future_planned_outages_consolidated
  ));
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;
```

### Step 7: Create Scheduled Job Function
```sql
-- Function to run full risk calculation
CREATE OR REPLACE FUNCTION gridalert.update_all_clinic_risks()
RETURNS TABLE(
  outage_type VARCHAR(20),
  records_updated INTEGER,
  execution_time_ms INTEGER
) AS $$
DECLARE
  v_start_time TIMESTAMP;
  v_end_time TIMESTAMP;
  v_count INTEGER;
BEGIN
  -- Clean up resolved outages first
  PERFORM gridalert.cleanup_resolved_outage_risks();
  
  -- Calculate for each outage type
  FOR v_outage_type IN SELECT unnest(ARRAY['unplanned', 'planned', 'future']) LOOP
    v_start_time := clock_timestamp();
    v_count := gridalert.calculate_clinic_outage_risks(v_outage_type);
    v_end_time := clock_timestamp();
    
    RETURN QUERY SELECT 
      v_outage_type,
      v_count,
      EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### Step 8: Set Up pg_cron (Optional - for automatic updates)
```sql
-- Install pg_cron extension (requires superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule risk calculation every 5 minutes
SELECT cron.schedule(
  'update-clinic-outage-risks',
  '*/5 * * * *', -- Every 5 minutes
  $$SELECT gridalert.update_all_clinic_risks()$$
);

-- Schedule cleanup every hour
SELECT cron.schedule(
  'cleanup-resolved-outage-risks',
  '0 * * * *', -- Every hour
  $$SELECT gridalert.cleanup_resolved_outage_risks()$$
);
```

---

## API Endpoints

### Step 9: Create Supabase Functions/API Endpoints

#### Get At-Risk Clinics
```sql
-- Function to get clinics with risk scores
CREATE OR REPLACE FUNCTION gridalert.get_at_risk_clinics(
  p_risk_level VARCHAR(20) DEFAULT NULL,
  p_min_score DECIMAL(5,2) DEFAULT 0,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
  clinic_id UUID,
  clinic_name VARCHAR,
  institution_code VARCHAR,
  risk_score DECIMAL(5,2),
  risk_level VARCHAR(20),
  outage_count INTEGER,
  critical_outages INTEGER,
  address_lat DOUBLE PRECISION,
  address_lng DOUBLE PRECISION,
  outages JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id AS clinic_id,
    l.institutionname AS clinic_name,
    l.institutioncode AS institution_code,
    MAX(cor.risk_score) AS risk_score,
    MAX(cor.risk_level) AS risk_level,
    COUNT(DISTINCT cor.outage_id)::INTEGER AS outage_count,
    COUNT(DISTINCT CASE WHEN cor.risk_level = 'critical' THEN cor.outage_id END)::INTEGER AS critical_outages,
    l.addresslatitude::DOUBLE PRECISION AS address_lat,
    l.addresslongitude::DOUBLE PRECISION AS address_lng,
    jsonb_agg(
      jsonb_build_object(
        'outage_id', cor.outage_id,
        'outage_type', cor.outage_type,
        'provider', cor.provider,
        'risk_score', cor.risk_score,
        'risk_level', cor.risk_level,
        'distance_km', cor.distance_km,
        'is_inside_polygon', cor.is_inside_polygon,
        'outage_start', cor.outage_start_time,
        'outage_end', cor.outage_end_time
      ) ORDER BY cor.risk_score DESC
    ) AS outages
  FROM gridalert.locations l
  INNER JOIN gridalert.clinic_outage_risk cor ON l.id = cor.clinic_id
  WHERE l.institutionstatus = 'ACTIVE'
    AND (p_risk_level IS NULL OR cor.risk_level = p_risk_level)
    AND cor.risk_score >= p_min_score
  GROUP BY l.id, l.institutionname, l.institutioncode, l.addresslatitude, l.addresslongitude
  HAVING MAX(cor.risk_score) >= p_min_score
  ORDER BY MAX(cor.risk_score) DESC, COUNT(DISTINCT cor.outage_id) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
```

#### Get Clinic Risk Details
```sql
CREATE OR REPLACE FUNCTION gridalert.get_clinic_risk_details(
  p_clinic_id UUID
)
RETURNS TABLE(
  clinic_id UUID,
  clinic_name VARCHAR,
  institution_code VARCHAR,
  overall_risk_score DECIMAL(5,2),
  overall_risk_level VARCHAR(20),
  total_at_risk_outages INTEGER,
  critical_outages INTEGER,
  high_risk_outages INTEGER,
  medium_risk_outages INTEGER,
  low_risk_outages INTEGER,
  outages JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id AS clinic_id,
    l.institutionname AS clinic_name,
    l.institutioncode AS institution_code,
    MAX(cor.risk_score) AS overall_risk_score,
    MAX(cor.risk_level) AS overall_risk_level,
    COUNT(DISTINCT cor.outage_id)::INTEGER AS total_at_risk_outages,
    COUNT(DISTINCT CASE WHEN cor.risk_level = 'critical' THEN cor.outage_id END)::INTEGER AS critical_outages,
    COUNT(DISTINCT CASE WHEN cor.risk_level = 'high' THEN cor.outage_id END)::INTEGER AS high_risk_outages,
    COUNT(DISTINCT CASE WHEN cor.risk_level = 'medium' THEN cor.outage_id END)::INTEGER AS medium_risk_outages,
    COUNT(DISTINCT CASE WHEN cor.risk_level = 'low' THEN cor.outage_id END)::INTEGER AS low_risk_outages,
    jsonb_agg(
      jsonb_build_object(
        'outage_id', cor.outage_id,
        'outage_type', cor.outage_type,
        'provider', cor.provider,
        'risk_score', cor.risk_score,
        'risk_level', cor.risk_level,
        'distance_km', cor.distance_km,
        'is_inside_polygon', cor.is_inside_polygon,
        'outage_start', cor.outage_start_time,
        'outage_end', cor.outage_end_time
      ) ORDER BY cor.risk_score DESC
    ) AS outages
  FROM gridalert.locations l
  LEFT JOIN gridalert.clinic_outage_risk cor ON l.id = cor.clinic_id
  WHERE l.id = p_clinic_id
  GROUP BY l.id, l.institutionname, l.institutioncode;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## Testing

### Step 10: Test the Implementation

```sql
-- Test 1: Calculate risks for all clinics
SELECT * FROM gridalert.update_all_clinic_risks();

-- Test 2: Get at-risk clinics
SELECT * FROM gridalert.get_at_risk_clinics('critical', 80, 50);

-- Test 3: Get specific clinic details
SELECT * FROM gridalert.get_clinic_risk_details('YOUR_CLINIC_ID_HERE');

-- Test 4: Check risk distribution
SELECT 
  risk_level,
  COUNT(*) as count,
  AVG(risk_score) as avg_score,
  MIN(risk_score) as min_score,
  MAX(risk_score) as max_score
FROM gridalert.clinic_outage_risk
GROUP BY risk_level
ORDER BY avg_score DESC;

-- Test 5: Check polygon intersections
SELECT 
  COUNT(*) as total_risks,
  COUNT(*) FILTER (WHERE is_inside_polygon = TRUE) as inside_polygon,
  COUNT(*) FILTER (WHERE is_inside_polygon = FALSE) as distance_based
FROM gridalert.clinic_outage_risk;

-- Test 6: Performance test
EXPLAIN ANALYZE
SELECT * FROM gridalert.get_at_risk_clinics(NULL, 0, 100);
```

---

## Performance Optimization

### Step 11: Additional Optimizations

```sql
-- Create materialized view for dashboard (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS gridalert.clinic_risk_summary AS
SELECT 
  l.id AS clinic_id,
  l.institutionname AS clinic_name,
  l.institutioncode AS institution_code,
  l.addresslatitude,
  l.addresslongitude,
  MAX(cor.risk_score) AS max_risk_score,
  MAX(cor.risk_level) AS max_risk_level,
  COUNT(DISTINCT cor.outage_id) AS at_risk_outage_count,
  COUNT(DISTINCT CASE WHEN cor.risk_level = 'critical' THEN cor.outage_id END) AS critical_count,
  COUNT(DISTINCT CASE WHEN cor.risk_level = 'high' THEN cor.outage_id END) AS high_count,
  COUNT(DISTINCT cor.provider) AS affected_providers,
  MAX(cor.calculated_at) AS last_updated
FROM gridalert.locations l
LEFT JOIN gridalert.clinic_outage_risk cor ON l.id = cor.clinic_id
WHERE l.institutionstatus = 'ACTIVE'
GROUP BY l.id, l.institutionname, l.institutioncode, l.addresslatitude, l.addresslongitude;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_clinic_risk_summary_max_score 
ON gridalert.clinic_risk_summary(max_risk_score DESC);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION gridalert.refresh_clinic_risk_summary()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY gridalert.clinic_risk_summary;
END;
$$ LANGUAGE plpgsql;

-- Add to cron schedule
SELECT cron.schedule(
  'refresh-clinic-risk-summary',
  '*/10 * * * *', -- Every 10 minutes
  $$SELECT gridalert.refresh_clinic_risk_summary()$$
);
```

---

## Implementation Checklist

- [ ] Enable PostGIS extension
- [ ] Create `clinic_outage_risk` table
- [ ] Add spatial columns to locations table (if needed)
- [ ] Create distance calculation function
- [ ] Create polygon intersection function
- [ ] Create risk score calculation function
- [ ] Create main risk calculation function
- [ ] Create cleanup function
- [ ] Create scheduled update function
- [ ] Set up pg_cron jobs (optional)
- [ ] Create API functions for frontend
- [ ] Test all functions
- [ ] Create materialized view (optional)
- [ ] Set up monitoring/alerting

---

## Notes

1. **Initial Run**: The first calculation may take several minutes depending on the number of clinics and outages. Consider running it during off-peak hours.

2. **Update Frequency**: Adjust cron schedule based on your needs:
   - High-frequency updates (every 1-2 minutes) for real-time monitoring
   - Medium-frequency (every 5 minutes) for most use cases
   - Low-frequency (every 15-30 minutes) for less critical scenarios

3. **Performance**: Monitor query performance. If slow, consider:
   - Adding more indexes
   - Using materialized views
   - Partitioning the risk table by date
   - Limiting distance calculations (e.g., only calculate within 20km)

4. **Polygon Data**: Ensure polygon_geojson data is valid GeoJSON. Invalid polygons will be skipped.

5. **Scaling**: For very large datasets (10,000+ clinics, 1,000+ outages), consider:
   - Batch processing
   - Parallel execution
   - Database connection pooling
   - Caching results

---

## Frontend Integration

Once the backend is set up, the frontend can query:

```typescript
// Get all at-risk clinics
const { data: atRiskClinics } = await supabase
  .rpc('get_at_risk_clinics', {
    p_risk_level: 'critical', // or null for all
    p_min_score: 80,
    p_limit: 100
  })

// Get specific clinic risk details
const { data: clinicRisk } = await supabase
  .rpc('get_clinic_risk_details', {
    p_clinic_id: clinicId
  })
```

---

## Troubleshooting

**Issue**: Risk calculations are slow
- **Solution**: Add indexes, use materialized views, limit distance calculations

**Issue**: No polygon intersections detected
- **Solution**: Verify polygon_geojson format is valid GeoJSON, check coordinate system (should be WGS84/4326)

**Issue**: Risk scores seem incorrect
- **Solution**: Review distance calculation logic, verify lat/lng coordinates are correct

**Issue**: Triggers not firing
- **Solution**: Check pg_cron is enabled, verify cron jobs are scheduled correctly


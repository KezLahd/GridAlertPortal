-- Create a function to find provider by location using PostGIS geometry
-- This function will be called from the client to determine which service area a point lies in

CREATE OR REPLACE FUNCTION gridalert.find_provider_by_location(
  p_lat double precision,
  p_lng double precision,
  p_state text
)
RETURNS TABLE(provider text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_point geometry;
BEGIN
  -- Create a point geometry from the lat/lng
  v_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);
  
  -- Find the provider service area that contains this point
  -- First check if geometry column has data and contains the point
  SELECT psa.provider INTO provider
  FROM gridalert.provider_service_area psa
  WHERE psa.state = p_state
    AND psa.geometry IS NOT NULL
    AND ST_Contains(psa.geometry, v_point)
  LIMIT 1;
  
  -- If no match found via geometry, return NULL
  IF provider IS NULL THEN
    RETURN;
  END IF;
  
  RETURN NEXT;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION gridalert.find_provider_by_location(double precision, double precision, text) TO authenticated, anon;


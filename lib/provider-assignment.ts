/// <reference path="../types/google-maps.d.ts" />
import { getSupabaseClient } from "./supabase"

/**
 * Reverse geocode coordinates to get state information
 */
const reverseGeocodeState = async (
  lat: number,
  lng: number
): Promise<string | null> => {
  return new Promise((resolve) => {
    if (
      typeof window === "undefined" ||
      !window.google ||
      !window.google.maps ||
      !window.google.maps.Geocoder
    ) {
      console.warn("Google Maps Geocoder not available for reverse geocoding")
      resolve(null)
      return
    }

    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode(
      { location: { lat, lng } },
      (results, status) => {
        if (status === "OK" && results && results.length > 0) {
          // Look for administrative_area_level_1 (state) in address components
          const addressComponents = results[0].address_components
          for (const component of addressComponents) {
            if (component.types.includes("administrative_area_level_1")) {
              // Map full state names to abbreviations if needed
              const stateName = component.short_name || component.long_name
              // Convert full names to abbreviations
              const stateMap: Record<string, string> = {
                "New South Wales": "NSW",
                "Victoria": "VIC",
                "Queensland": "QLD",
                "South Australia": "SA",
                "Western Australia": "WA",
                "Tasmania": "TAS",
                "Northern Territory": "NT",
                "Australian Capital Territory": "ACT",
              }
              resolve(stateMap[stateName] || stateName || null)
              return
            }
          }
        }
        resolve(null)
      }
    )
  })
}

/**
 * Determine provider for a location based on state, postcode, and geometry
 * Logic:
 * 1. First, determine the state from lat/long
 * 2. Check if state has a monopoly (only one provider with that state)
 * 3. If monopoly, return that provider
 * 4. If not monopoly:
 *    - Check if postcode matches any provider service area
 *    - If no postcode match, check geojson geometry to see which service area the point lies in
 */
export async function determineProviderForLocation(
  latitude: number,
  longitude: number,
  postcode?: string | null,
  state?: string | null
): Promise<string | null> {
  try {
    const supabase = getSupabaseClient()

    // Step 1: Get state from coordinates if not provided
    let locationState = state
    if (!locationState && latitude && longitude) {
      locationState = await reverseGeocodeState(latitude, longitude)
    }

    if (!locationState) {
      console.warn("Could not determine state for location")
      return null
    }

    // Step 2: Check if state has a monopoly (only one provider with that state)
    const { data: stateProviders, error: stateError } = await supabase
      .from("provider_service_area")
      .select("provider, geojson, postcode")
      .eq("state", locationState)

    if (stateError) {
      console.error("Error querying provider_service_area by state:", stateError)
      return null
    }

    if (!stateProviders || stateProviders.length === 0) {
      console.warn(`No provider service areas found for state: ${locationState}`)
      return null
    }

    // Check for monopoly: only one unique provider for this state
    const uniqueProviders = new Set(stateProviders.map((p) => p.provider))
    if (uniqueProviders.size === 1) {
      // Monopoly - return the single provider
      return Array.from(uniqueProviders)[0]
    }

    // Step 3: Not a monopoly - check postcode match if available
    // The postcode column contains comma-separated values like "3061,3062,3064,3073..."
    // We need to check if the location's postcode is in any of these comma-separated lists
    if (postcode) {
      const { data: postcodeProviders, error: postcodeError } = await supabase
        .from("provider_service_area")
        .select("provider, postcode")
        .eq("state", locationState)
        .not("postcode", "is", null)

      if (!postcodeError && postcodeProviders && postcodeProviders.length > 0) {
        // Check each provider's postcode list to see if it contains our postcode
        for (const area of postcodeProviders) {
          if (area.postcode) {
            // Split the comma-separated postcodes and check if our postcode is in the list
            const postcodeList = area.postcode.split(',').map(p => p.trim())
            if (postcodeList.includes(postcode)) {
              return area.provider
            }
          }
        }
      }
    }

    // Step 4: No postcode match or no postcode - check geojson geometry
    // Use PostGIS ST_Contains via RPC function to find which service area contains this point
    const { data: geometryMatch, error: geometryError } = await supabase
      .rpc("find_provider_by_location", {
        p_lat: latitude,
        p_lng: longitude,
        p_state: locationState,
      })
      .maybeSingle()

    if (!geometryError && geometryMatch && geometryMatch.provider) {
      return geometryMatch.provider
    }

    // If RPC doesn't exist or fails, log a warning
    if (geometryError) {
      console.warn("Error checking geometry for provider:", geometryError)
    }

    // Could not determine provider via any method
    console.warn("Could not determine provider for location")
    return null
  } catch (error) {
    console.error("Error determining provider for location:", error)
    return null
  }
}


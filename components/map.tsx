"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Circle } from "@react-google-maps/api"
import MapsError from "./maps-error"
import MapLegend from "./map-legend"

// Map container style
const containerStyle = {
  width: "100%",
  height: "70vh",
}

// Default center (can be adjusted based on your location)
const defaultCenter = {
  lat: -33.865143, // Default to Sydney, Australia
  lng: 151.2099,
}

// Map options
const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: true,
}

// Libraries to load - make sure to include 'places'
const libraries = ["places"]

// Marker colors based on outage type
const markerColors = {
  unplanned: "red",
  planned: "orange",
  future: "blue",
}

interface MapProps {
  outages: any[]
  outageType: "unplanned" | "planned" | "future"
  searchLocation?: { lat: number; lng: number } | null
}

// Function to check if Google Maps API is loaded
const isGoogleMapsLoaded = () => {
  return (
    typeof window !== "undefined" &&
    window.google &&
    window.google.maps &&
    typeof window.google.maps.Geocoder === "function"
  )
}

export default function Map({ outages, outageType, searchLocation }: MapProps) {
  const [apiError, setApiError] = useState<string | null>(null)
  const [currentZoom, setCurrentZoom] = useState(10)

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: libraries as any,
  })

  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [selectedOutage, setSelectedOutage] = useState<any | null>(null)
  const [center, setCenter] = useState(defaultCenter)
  const mapRef = useRef<google.maps.Map | null>(null)

  // Check for API errors
  useEffect(() => {
    if (!isLoaded || typeof window === "undefined") return

    const handleApiError = () => {
      try {
        if (window.google && window.google.maps && window.google.maps.places) {
          // API loaded successfully
          setApiError(null)
        } else {
          // Check for specific error messages in the console
          const errorElements = document.querySelectorAll(".gm-err-message")
          if (errorElements.length > 0) {
            const errorMessage = errorElements[0].textContent || "Unknown Google Maps API error"
            setApiError(errorMessage)
          }
        }
      } catch (error) {
        console.error("Error checking Google Maps API:", error)
      }
    }

    // Wait a bit for potential errors to appear in the DOM
    const timer = setTimeout(handleApiError, 1000)
    return () => clearTimeout(timer)
  }, [isLoaded])

  // Calculate map center based on outages or search location
  useEffect(() => {
    if (searchLocation) {
      setCenter(searchLocation)
      if (mapRef.current) {
        mapRef.current.setZoom(14) // Zoom in when searching for a location
      }
    } else if (outages.length > 0) {
      // Calculate the average lat/lng to center the map
      const validOutages = outages.filter((outage) => outage.latitude && outage.longitude)

      if (validOutages.length > 0) {
        const avgLat =
          validOutages.reduce((sum, outage) => sum + Number.parseFloat(outage.latitude), 0) / validOutages.length
        const avgLng =
          validOutages.reduce((sum, outage) => sum + Number.parseFloat(outage.longitude), 0) / validOutages.length
        setCenter({ lat: avgLat, lng: avgLng })
      } else {
        setCenter(defaultCenter)
      }
    } else {
      setCenter(defaultCenter)
    }
  }, [outages, searchLocation])

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    setMap(map)
    setCurrentZoom(map.getZoom() || 10)
  }, [])

  const onUnmount = useCallback(() => {
    mapRef.current = null
    setMap(null)
  }, [])

  const onZoomChanged = useCallback(() => {
    if (mapRef.current) {
      setCurrentZoom(mapRef.current.getZoom() || 10)
    }
  }, [])

  // Get marker title based on outage type
  const getMarkerTitle = (outage: any) => {
    if (outageType === "unplanned") {
      return `Unplanned Outage: ${outage.area_suburb}`
    } else {
      return `Planned Outage: ${outage.streets_affected || outage.area_suburb}`
    }
  }

  // Get info window content based on outage type
  const getInfoWindowContent = (outage: any) => {
    if (outageType === "unplanned") {
      return (
        <div className="p-2 max-w-xs">
          <h3 className="font-bold text-red-600">Unplanned Outage</h3>
          <p>
            <strong>Area:</strong> {outage.area_suburb}
          </p>
          <p>
            <strong>Status:</strong> {outage.statusheading}
          </p>
          <p>
            <strong>Cause:</strong> {outage.cause}
          </p>
          <p>
            <strong>Est. Restoration:</strong> {new Date(outage.estimated_finish_time).toLocaleString()}
          </p>
          <p>
            <strong>Affected Customers:</strong> {outage.customers_affected}
          </p>
          <p>
            <strong>Provider:</strong> {outage.provider || "Not specified"}
          </p>
          {outage.geocoded_address && (
            <p className="mt-2 text-xs text-gray-500">
              <strong>Location:</strong> {outage.geocoded_address}
            </p>
          )}
        </div>
      )
    } else {
      const isCurrentPlanned = outageType === "planned"
      return (
        <div className="p-2 max-w-xs">
          <h3 className={`font-bold ${isCurrentPlanned ? "text-orange-600" : "text-blue-600"}`}>
            {isCurrentPlanned ? "Current Planned Outage" : "Future Planned Outage"}
          </h3>
          <p>
            <strong>Area:</strong> {outage.area_suburb}
          </p>
          <p>
            <strong>Streets:</strong> {outage.streets_affected || "Not specified"}
          </p>
          <p>
            <strong>Start:</strong> {new Date(outage.start_date_time).toLocaleString()}
          </p>
          <p>
            <strong>End:</strong> {new Date(outage.end_date_time).toLocaleString()}
          </p>
          <p>
            <strong>Details:</strong> {outage.details || "Not specified"}
          </p>
          <p>
            <strong>Provider:</strong> {outage.provider || "Not specified"}
          </p>
          {outage.geocoded_address && (
            <p className="mt-2 text-xs text-gray-500">
              <strong>Location:</strong> {outage.geocoded_address}
            </p>
          )}
        </div>
      )
    }
  }

  // Display error message if API key is not activated
  if (apiError || loadError) {
    return (
      <div className="flex flex-col h-[70vh] w-full items-center justify-center bg-gray-100 p-4">
        <MapsError message={apiError || "Failed to load Google Maps. Please check your API key configuration."} />
        <div className="mt-4 p-4 bg-white rounded-lg shadow-md w-full max-w-md">
          <h3 className="font-bold text-lg mb-2">Outage Data Preview</h3>
          <p className="text-sm text-gray-600 mb-4">
            Map visualization is unavailable, but you can still view outage data:
          </p>
          <div className="max-h-[40vh] overflow-y-auto border rounded-md p-2">
            {outages.length > 0 ? (
              <ul className="divide-y">
                {outages.slice(0, 5).map((outage) => (
                  <li key={outage.id} className="py-2">
                    <p className="font-medium">{outage.area_suburb}</p>
                    <p className="text-sm text-gray-600">
                      {outageType === "unplanned"
                        ? `Cause: ${outage.cause}`
                        : `Streets: ${outage.streets_affected || "Not specified"}`}
                    </p>
                  </li>
                ))}
                {outages.length > 5 && (
                  <li className="py-2 text-center text-sm text-gray-500">+ {outages.length - 5} more outages</li>
                )}
              </ul>
            ) : (
              <p className="text-center py-4 text-gray-500">No outage data available</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex h-[70vh] w-full items-center justify-center bg-gray-100">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="relative">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={10}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onZoomChanged={onZoomChanged}
        options={mapOptions}
      >
        {/* Search location marker */}
        {searchLocation && (
          <Marker
            position={searchLocation}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: "#4285F4",
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: "#ffffff",
              scale: 8,
            }}
          />
        )}

        {outages.map((outage) => {
          if (!outage.latitude || !outage.longitude) return null

          // Convert latitude and longitude to numbers if they're strings
          const lat = typeof outage.latitude === "string" ? Number.parseFloat(outage.latitude) : outage.latitude
          const lng = typeof outage.longitude === "string" ? Number.parseFloat(outage.longitude) : outage.longitude

          // Skip if invalid coordinates
          if (isNaN(lat) || isNaN(lng)) return null

          return (
            <div key={outage.id}>
              {/* Show markers for all outage types at all zoom levels */}
              <Marker
                position={{ lat, lng }}
                title={getMarkerTitle(outage)}
                onClick={() => setSelectedOutage(outage)}
                icon={{
                  path: window.google && window.google.maps ? window.google.maps.SymbolPath.CIRCLE : "",
                  fillColor: markerColors[outageType],
                  fillOpacity: 0.7,
                  strokeWeight: 1,
                  strokeColor: "#ffffff",
                  scale: 10,
                }}
              />

              {outageType === "unplanned" && (
                // For unplanned outages, show a circle around the suburb
                <Circle
                  center={{ lat, lng }}
                  radius={1000} // 1km radius
                  options={{
                    fillColor: "#ff0000",
                    fillOpacity: 0.1,
                    strokeColor: "#ff0000",
                    strokeOpacity: 0.5,
                    strokeWeight: 1,
                  }}
                />
              )}
            </div>
          )
        })}

        {selectedOutage && selectedOutage.latitude && selectedOutage.longitude && (
          <InfoWindow
            position={{
              lat:
                typeof selectedOutage.latitude === "string"
                  ? Number.parseFloat(selectedOutage.latitude)
                  : selectedOutage.latitude,
              lng:
                typeof selectedOutage.longitude === "string"
                  ? Number.parseFloat(selectedOutage.longitude)
                  : selectedOutage.longitude,
            }}
            onCloseClick={() => setSelectedOutage(null)}
          >
            <div>{getInfoWindowContent(selectedOutage)}</div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Map Legend */}
      <MapLegend outageType={outageType} zoomLevel={currentZoom} />
    </div>
  )
}

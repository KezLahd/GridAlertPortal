"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api"
import MapsError from "./maps-error"
import MapLegend from "./map-legend"

// Map container style
const containerStyle = {
  width: "100%",
  height: "70vh",
}

// Default center (can be adjusted based on your location)
const defaultCenter = {
  lat: -33.8688, // Sydney CBD
  lng: 151.2093,
}

// Libraries to load - make sure to include 'places'
const libraries = ["places"]

// Marker colors based on outage type
const markerColors = {
  unplanned: "red",
  planned: "orange",
  future: "blue",
}

const buildOutageKey = (outage: any, index: number) => {
  // Build a deterministic composite key to avoid duplicate keys from shared ids
  const parts = [
    outage?.provider ?? "provider",
    outage?.incident_id,
    outage?.webid,
    outage?.job_id,
    outage?.event_id,
    outage?.id,
    outage?.start_time,
    outage?.start_date_time,
    outage?.area_suburb,
    outage?.status,
    outage?.latitude,
    outage?.longitude,
  ]
    .filter((v) => v !== undefined && v !== null && v !== "")
    .map((v) => String(v))

  const composite = parts.join("|")
  return composite || `outage-${index}`
}

const providerIconsNew: Record<string, string> = {
  Ausgrid: "/providers/Ausgrid-new.svg",
  Endeavour: "/providers/Endeavour-new.svg",
  Energex: "/providers/Energex-new.svg",
  Ergon: "/providers/Ergon-new.svg",
  "SA Power": "/providers/SAPower-new.svg",
}

interface MapProps {
  outages: any[]
  outageType: "unplanned" | "planned" | "future"
  searchLocation?: { lat: number; lng: number } | null
  companyCenter?: { lat: number; lng: number } | null
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

// Create a client component wrapper for the GoogleMap
const ClientGoogleMap = ({ children, ...props }: any) => {
  return <GoogleMap {...props}>{children}</GoogleMap>
}

export default function Map({ outages, outageType, searchLocation, companyCenter }: MapProps) {
  const [apiError, setApiError] = useState<string | null>(null)
  const [currentZoom, setCurrentZoom] = useState(12)

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: libraries as any,
  })

  const [map, setMap] = useState<any | null>(null)
  const [selectedOutage, setSelectedOutage] = useState<any | null>(null)
  const [center, setCenter] = useState(defaultCenter)
  const [visibleOutages, setVisibleOutages] = useState<any[]>([])
  const mapRef = useRef<any | null>(null)

  const mapOptions = useMemo<any>(() => {
    const opts: any = {
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
    }
    if (typeof window !== "undefined" && window.google?.maps?.ControlPosition) {
      opts.fullscreenControlOptions = {
        position: window.google.maps.ControlPosition.RIGHT_BOTTOM,
      }
    }
    return opts
  }, [isLoaded])

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

  useEffect(() => {
    if (searchLocation) {
      // Search location takes highest priority
      setCenter(searchLocation)
      if (mapRef.current) {
        mapRef.current.setZoom(14)
      }
    } else if (companyCenter && !searchLocation) {
      // Use company center if available and no search active
      setCenter(companyCenter)
    } else {
      // Default to Sydney CBD
      setCenter(defaultCenter)
    }
  }, [searchLocation, companyCenter])

  const updateVisible = useCallback(
    (mapInstance?: any | null) => {
      const m = mapInstance ?? mapRef.current
      if (!m) return
      const bounds = m.getBounds()
      if (!bounds) return
      const b = bounds.toJSON()
      const latPad = (b.north - b.south) * 0.15
      const lngPad = (b.east - b.west) * 0.15
      const north = b.north + latPad
      const south = b.south - latPad
      const east = b.east + lngPad
      const west = b.west - lngPad

      const within = outages.filter((o) => {
        const lat = Number(o.latitude)
        const lng = Number(o.longitude)
        if (Number.isNaN(lat) || Number.isNaN(lng)) return false
        return lat <= north && lat >= south && lng <= east && lng >= west
      })
      setVisibleOutages(within)
    },
    [outages],
  )

  const onLoad = useCallback(
    (map: any) => {
      mapRef.current = map
      setMap(map)
      const initialCenter = companyCenter || defaultCenter
      map.setCenter(initialCenter)
      setCenter(initialCenter)
      map.setZoom(12)
      setCurrentZoom(12)
      updateVisible(map)
    },
    [updateVisible, companyCenter],
  )

  const onUnmount = useCallback(() => {
    mapRef.current = null
    setMap(null)
  }, [])

  const onZoomChanged = useCallback(() => {
    if (mapRef.current) {
      setCurrentZoom(mapRef.current.getZoom() || 12)
      updateVisible()
    }
  }, [updateVisible])

  const onIdle = useCallback(() => {
    updateVisible()
  }, [updateVisible])

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

  // Marker icon resolver
  const markerOptimizationEnabled = false
  const shouldOptimizeMarkers = false

  const getMarkerIcon = (outage: any): any | undefined => {
    if (typeof window !== "undefined" && window.google?.maps) {
      if (outage?.provider && providerIconsNew[outage.provider]) {
        return {
          url: providerIconsNew[outage.provider],
          size: new window.google.maps.Size(32, 32),
          scaledSize: new window.google.maps.Size(32, 32),
          origin: new window.google.maps.Point(0, 0),
          anchor: new window.google.maps.Point(16, 32), // bottom-center on point
          labelOrigin: new window.google.maps.Point(16, 10),
        }
      }

      // Fallback colored dot by outage type
      return {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: markerColors[outageType],
        fillOpacity: 0.8,
        strokeWeight: 1.5,
        strokeColor: "#ffffff",
        scale: 10,
        anchor: new window.google.maps.Point(0, 10),
      }
    }

    return undefined
  }

  if (!isLoaded) {
    return (
      <div className="flex h-[70vh] w-full items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <ClientGoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onIdle={onIdle}
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

        {visibleOutages.map((outage, idx) => {
          if (!outage.latitude || !outage.longitude) return null

          // Convert latitude and longitude to numbers if they're strings
          const lat = typeof outage.latitude === "string" ? Number.parseFloat(outage.latitude) : outage.latitude
          const lng = typeof outage.longitude === "string" ? Number.parseFloat(outage.longitude) : outage.longitude

          // Skip if invalid coordinates
          if (isNaN(lat) || isNaN(lng)) return null

          const z = Number.isFinite(lat) ? Math.round(lat * 1000) : 0

          return (
            <div key={buildOutageKey(outage, idx)}>
              {/* Foreground marker */}
              <Marker
                position={{ lat, lng }}
                title={getMarkerTitle(outage)}
                onClick={() => setSelectedOutage(outage)}
                icon={getMarkerIcon(outage)}
                options={{ optimized: shouldOptimizeMarkers }}
                zIndex={z + 10}
              />
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
      </ClientGoogleMap>

      {/* Map Legend */}
      <MapLegend outageType={outageType} zoomLevel={currentZoom} />
    </div>
  )
}

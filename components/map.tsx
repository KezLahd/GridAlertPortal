"use client"

import { googleMapsApiKey } from "@/lib/config"
import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polygon } from "@react-google-maps/api"
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

// Helper function to calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

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
  "Horizon Power": "/providers/HorizonPower-new.svg",
  WPower: "/providers/WPower-new.svg",
  AusNet: "/providers/AusNet-new.svg",
  CitiPowerCor: "/providers/CitiPowerCor-new.svg",
  "Essential Energy": "/providers/EssentialEnergy-new.svg",
  Jemena: "/providers/Jemena-new.svg",
  UnitedEnergy: "/providers/UnitedEnergy-new.svg",
  TasNetworks: "/providers/TasNetworks-new.svg",
}

const providerHeaderIcons: Record<string, string> = {
  Ausgrid: "/providers/Ausgrid-header.svg",
  Endeavour: "/providers/Endeavour-header.svg",
  Energex: "/providers/energex-header.svg",
  Ergon: "/providers/ergon-header.svg",
  "SA Power": "/providers/SAPower-header.svg",
  "Horizon Power": "/providers/HorizonPower-header.svg",
  WPower: "/providers/WPower-header.svg",
  AusNet: "/providers/AusNet-header.svg",
  CitiPowerCor: "/providers/CitiPowerCor-header.svg",
  "Essential Energy": "/providers/EssentialEnergy-header.svg",
  Jemena: "/providers/Jemena-header.svg",
  UnitedEnergy: "/providers/UnitedEnergy-header.svg",
  TasNetworks: "/providers/TasNetworks-header.svg",
}

interface PoiLocation {
  id: string
  poi_name: string
  institution_code?: string
  institution_email?: string
  institution_phone?: string
  latitude: number | string
  longitude: number | string
  street_address?: string
  city?: string
  state?: string
  postcode?: string
}

interface MapProps {
  outages: any[]
  outageType: "unplanned" | "planned" | "future"
  searchQuery?: string
  selectedOutageId?: string | number | null
  selectedPoiId?: string | null
  companyCenter?: { lat: number; lng: number } | null
  companyLocation?: { lat: number; lng: number; name?: string; userCount?: number } | null
  poiLocations?: PoiLocation[]
  showPoiMarkers?: boolean
  showPolygons?: boolean
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

export default function Map({ outages, outageType, searchQuery = "", selectedOutageId, selectedPoiId, companyCenter, companyLocation, poiLocations = [], showPoiMarkers = false, showPolygons = false }: MapProps) {
  const [apiError, setApiError] = useState<string | null>(null)
  const [currentZoom, setCurrentZoom] = useState(12)

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey,
    libraries: libraries as any,
  })

  const [map, setMap] = useState<any | null>(null)
  const [selectedOutage, setSelectedOutage] = useState<any | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null)
  const [selectedPoi, setSelectedPoi] = useState<PoiLocation | null>(null)
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
      minZoom: 1, // Minimum zoom level to keep map focused on Australia
      maxZoom: 19, // Allow more zoom-in (lower maxZoom = less zoom-in ability)
      // Restrict map viewport to Australia and surrounding areas (expanded for zoom-out)
      restriction: {
        latLngBounds: {
          north: 10.0,   // Much further north to allow zoom-out
          south: -60.0,  // Much further south to allow zoom-out
          east: 180.0,   // Much further east to allow zoom-out
          west: 90.0,    // Much further west to allow zoom-out
        },
        strictBounds: true, // Prevent panning outside bounds
      },
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
    if (companyCenter) {
      // Use company center if available
      setCenter(companyCenter)
    } else {
      // Default to Sydney CBD
      setCenter(defaultCenter)
    }
  }, [companyCenter])

  // Handle selected outage from parent (e.g., when clicking from list)
  useEffect(() => {
    if (selectedOutageId && outages.length > 0) {
      const outage = outages.find((o) => {
        const id = o.incident_id || o.webid || o.id || o.event_id || o.outage_id
        return String(id) === String(selectedOutageId)
      })
      
      if (outage && outage.latitude && outage.longitude) {
        const lat = typeof outage.latitude === "string" ? Number.parseFloat(outage.latitude) : outage.latitude
        const lng = typeof outage.longitude === "string" ? Number.parseFloat(outage.longitude) : outage.longitude
        
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          setCenter({ lat, lng })
          setSelectedOutage(outage)
          if (mapRef.current) {
            mapRef.current.setZoom(8)
            mapRef.current.panTo({ lat, lng })
          }
        }
      }
    }
  }, [selectedOutageId, outages])

  // Handle selected POI from parent (e.g., when clicking from search dropdown)
  useEffect(() => {
    if (selectedPoiId && poiLocations.length > 0) {
      const poi = poiLocations.find((p) => p.id === selectedPoiId)
      
      if (poi && poi.latitude && poi.longitude) {
        const lat = typeof poi.latitude === "string" ? Number.parseFloat(poi.latitude) : poi.latitude
        const lng = typeof poi.longitude === "string" ? Number.parseFloat(poi.longitude) : poi.longitude
        
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          setCenter({ lat, lng })
          setSelectedPoi(poi)
          setSelectedOutage(null) // Clear outage selection
          setSelectedCompany(null) // Clear company selection
          if (mapRef.current) {
            mapRef.current.setZoom(16)
            mapRef.current.panTo({ lat, lng })
          }
        }
      }
    }
  }, [selectedPoiId, poiLocations])

  useEffect(() => {
    // Hide the default Google Maps InfoWindow close button
    const style = document.createElement("style")
    style.innerHTML = `
      .gm-ui-hover-effect {
        display: none !important;
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

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

      let filtered = outages.filter((o) => {
        const lat = Number(o.latitude)
        const lng = Number(o.longitude)
        if (Number.isNaN(lat) || Number.isNaN(lng)) return false

        // First check if within map bounds
        const inBounds = lat <= north && lat >= south && lng <= east && lng >= west

        // If search query is set, also check text content
        if (searchQuery && inBounds) {
          const query = searchQuery.toLowerCase()
          const searchableText = [
            o.area_suburb,
            o.streets_affected,
            o.cause,
            o.status,
            o.provider,
            o.state
          ].filter(Boolean).join(' ').toLowerCase()

          return searchableText.includes(query)
        }

        return inBounds
      })

      setVisibleOutages(filtered)
    },
    [outages, searchQuery],
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

  // Parse polygon_geojson data to Google Maps path format
  const parsePolygonGeoJson = (geojson: any): Array<{ lat: number; lng: number }> | null => {
    if (!geojson) return null
    
    try {
      // Handle if it's already a parsed JSON object
      const data = typeof geojson === 'string' ? JSON.parse(geojson) : geojson
      
      // Helper function to detect coordinate format and convert to [lat, lng]
      const convertCoord = (coord: number[]): { lat: number; lng: number } => {
        if (!Array.isArray(coord) || coord.length < 2) {
          throw new Error('Invalid coordinate format')
        }
        
        const [first, second] = coord
        
        // Detect format: if first value is <= 90 (latitude range) and second is > 90 (longitude range),
        // then it's [lat, lng] format, otherwise assume [lng, lat] format (GeoJSON standard)
        const absFirst = Math.abs(first)
        const absSecond = Math.abs(second)
        
        // Check if it looks like [lat, lng] format (first value in lat range, second in lng range)
        if (absFirst <= 90 && absSecond > 90 && absSecond <= 180) {
          // It's [lat, lng] format, swap them
          return { lat: first, lng: second }
        } else {
          // Assume GeoJSON standard [lng, lat] format
          return { lat: second, lng: first }
        }
      }
      
      // Handle GeoJSON format
      if (data.type === 'Polygon' && data.coordinates && Array.isArray(data.coordinates[0])) {
        return data.coordinates[0].map((coord: number[]) => convertCoord(coord))
      }
      
      // Handle if it's already an array of coordinates
      if (Array.isArray(data) && data.length > 0) {
        if (Array.isArray(data[0]) && data[0].length === 2) {
          return data.map((coord: number[]) => convertCoord(coord))
        }
      }
      
      return null
    } catch (error) {
      console.error('Error parsing polygon_geojson:', error)
      return null
    }
  }

  // Get info window content based on outage type
  const getCompanyInfoWindowContent = (company: any) => {
    return (
      <div className="p-3 pr-6 max-w-xs" style={{ marginRight: '20px' }}>
        <h3 className="font-semibold text-lg mb-2">{company.name || "Company Location"}</h3>
        <div className="space-y-1 text-sm">
          <div><strong>Users:</strong> {company.userCount || 0}</div>
        </div>
      </div>
    )
  }

  const getPoiInfoWindowContent = (poi: PoiLocation) => {
    const addressParts = [
      poi.street_address,
      poi.city,
      poi.state,
      poi.postcode
    ].filter(Boolean)

    const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : "No address available"
    const centreNumber = poi.institution_code ? `C${poi.institution_code}` : `C${poi.id.split('-')[0]}`

    return (
      <div className="p-3 pr-6 max-w-xs" style={{ marginRight: '20px' }}>
        <h3 className="font-semibold text-lg mb-2">{centreNumber}</h3>
        <div className="space-y-1 text-sm">
          <div><strong>Institution:</strong> {poi.poi_name || "Unknown"}</div>
          <div><strong>Address:</strong> {fullAddress}</div>
          {poi.institution_email && (
            <div><strong>Email:</strong> {poi.institution_email}</div>
          )}
          {poi.institution_phone && (
            <div><strong>Phone:</strong> {poi.institution_phone}</div>
          )}
        </div>
      </div>
    )
  }

  const getInfoWindowContent = (outage: any) => {
    const headerSrc = outage?.provider ? providerHeaderIcons[outage.provider] : undefined
    const close = () => {
      setSelectedOutage(null)
    }

    if (outageType === "unplanned") {
      return (
        <div className="relative w-[320px] bg-white -mt-4 mx-0">
          <button
            onClick={close}
            className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/30 hover:bg-white/40 shadow-md transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {headerSrc ? (
            <img
              src={headerSrc || "/placeholder.svg"}
              alt={`${outage.provider} header`}
              className="w-full aspect-[3/1] object-cover"
            />
          ) : (
            <div className="w-full aspect-[3/1] bg-white px-3 py-2 border-b flex items-end">
              <span className="font-semibold text-sm text-gray-800 block">{outage.provider || "Unplanned Outage"}</span>
            </div>
          )}
          <div className="px-6 pb-6 pt-3 space-y-1 bg-white">
            <h3 className="font-bold text-red-600">Unplanned Outage</h3>
            <p>
              <strong>Suburb:</strong> {outage.area_suburb && outage.area_suburb.toLowerCase() !== "unknown area" ? outage.area_suburb : "Not specified"}
            </p>
            {(outage.street_name || outage.streets_affected) && (
              <p>
                <strong>Streets:</strong> {outage.street_name || outage.streets_affected}
              </p>
            )}
            {outage.reason && (
              <p>
                <strong>Reason:</strong> {outage.reason}
              </p>
            )}
            <p>
              <strong>Est. Restoration:</strong> {outage.estimated_finish_time ? new Date(outage.estimated_finish_time).toLocaleString() : "Not specified"}
            </p>
            <p>
              <strong>Affected Customers:</strong> {outage.customers_affected}
            </p>
            {outage.geocoded_address && (
              <p className="mt-1 text-xs text-gray-500">
                <strong>Location:</strong> {outage.geocoded_address}
              </p>
            )}
          </div>
        </div>
      )
    } else {
      const isCurrentPlanned = outageType === "planned"
      return (
        <div className="relative w-[320px] bg-white -mt-4 mx-0">
          <button
            onClick={close}
            className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/30 hover:bg-white/40 shadow-md transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {headerSrc ? (
            <img
              src={headerSrc || "/placeholder.svg"}
              alt={`${outage.provider} header`}
              className="w-full aspect-[3/1] object-cover"
            />
          ) : (
            <div className="w-full aspect-[3/1] bg-white px-3 py-2 border-b flex items-end">
              <span className="font-semibold text-sm text-gray-800 block">{outage.provider || "Planned Outage"}</span>
            </div>
          )}
          <div className="px-6 pb-6 pt-3 space-y-1 bg-white">
            <h3 className={`font-bold ${isCurrentPlanned ? "text-orange-600" : "text-blue-600"}`}>
              {isCurrentPlanned ? "Current Planned Outage" : "Future Planned Outage"}
            </h3>
            <p>
              <strong>Area:</strong> {outage.area_suburb && outage.area_suburb.toLowerCase() !== "unknown area" ? outage.area_suburb : "Not specified"}
            </p>
            <p>
              <strong>Streets:</strong> {outage.streets_affected || "Not specified"}
            </p>
            <p>
              <strong>Start:</strong> {outage.start_date_time ? new Date(outage.start_date_time).toLocaleString() : "Not specified"}
            </p>
            <p>
              <strong>End:</strong> {outage.end_date_time ? new Date(outage.end_date_time).toLocaleString() : "Not specified"}
            </p>
            {outage.reason && (
              <p>
                <strong>Reason:</strong> {outage.reason}
              </p>
            )}
            {outage.geocoded_address && (
              <p className="mt-1 text-xs text-gray-500">
                <strong>Location:</strong> {outage.geocoded_address}
              </p>
            )}
          </div>
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

  // Get company location marker icon
  const getCompanyLocationIcon = (): any | undefined => {
    if (typeof window !== "undefined" && window.google?.maps) {
      return {
        url: "/company_location.svg",
        size: new window.google.maps.Size(24, 24),
        scaledSize: new window.google.maps.Size(24, 24),
        origin: new window.google.maps.Point(0, 0),
        anchor: new window.google.maps.Point(12, 24), // bottom-center on point
      }
    }
    return undefined
  }

  // Get POI location marker icon - simple red dot
  const getPoiLocationIcon = (): any | undefined => {
    if (typeof window !== "undefined" && window.google?.maps) {
      return {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: "#EF4444",
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: "#ffffff",
        scale: 8,
      }
    }
    return undefined
  }

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
        {/* Company location marker */}
        {companyLocation && companyLocation.lat && companyLocation.lng && (
          <Marker
            position={{
              lat: typeof companyLocation.lat === "string" ? Number.parseFloat(companyLocation.lat) : companyLocation.lat,
              lng: typeof companyLocation.lng === "string" ? Number.parseFloat(companyLocation.lng) : companyLocation.lng,
            }}
            title={companyLocation.name || "Company Location"}
            icon={getCompanyLocationIcon()}
            options={{ optimized: false }}
            zIndex={1000}
            onClick={() => {
              setSelectedCompany(companyLocation)
              setSelectedPoi(null) // Clear POI selection
              setSelectedOutage(null) // Clear outage selection
            }}
          />
        )}

        {/* POI location markers - only show if toggle is enabled */}
        {showPoiMarkers && poiLocations
          .filter((poi) => {
            if (!searchQuery) return true

            const query = searchQuery.toLowerCase()
            const searchableText = [
              poi.poi_name,
              poi.institution_code,
              poi.street_address,
              poi.city,
              poi.state,
              poi.postcode
            ].filter(Boolean).join(' ').toLowerCase()

            return searchableText.includes(query)
          })
          .map((poi) => {
            if (!poi.latitude || !poi.longitude) return null

            const lat = typeof poi.latitude === "string" ? Number.parseFloat(poi.latitude) : poi.latitude
            const lng = typeof poi.longitude === "string" ? Number.parseFloat(poi.longitude) : poi.longitude

            // Skip if invalid coordinates
            if (isNaN(lat) || isNaN(lng)) return null

            return (
              <Marker
                key={poi.id}
                position={{ lat, lng }}
                title={poi.poi_name || "POI Location"}
                icon={getPoiLocationIcon()}
                options={{ optimized: false }}
                zIndex={999}
                onClick={() => {
                  setSelectedPoi(poi)
                  setSelectedCompany(null) // Clear company selection
                  setSelectedOutage(null) // Clear outage selection
                }}
              />
            )
          })}


        {visibleOutages.map((outage, idx) => {
          if (!outage.latitude || !outage.longitude) return null

          // Convert latitude and longitude to numbers if they're strings
          const lat = typeof outage.latitude === "string" ? Number.parseFloat(outage.latitude) : outage.latitude
          const lng = typeof outage.longitude === "string" ? Number.parseFloat(outage.longitude) : outage.longitude

          // Skip if invalid coordinates
          if (isNaN(lat) || isNaN(lng)) return null

          const z = Number.isFinite(lat) ? Math.round(lat * 1000) : 0

          return (
            <Marker
              key={buildOutageKey(outage, idx)}
              position={{ lat, lng }}
              title={getMarkerTitle(outage)}
              onClick={() => {
                setSelectedOutage(outage)
              }}
              icon={getMarkerIcon(outage)}
              options={{ optimized: shouldOptimizeMarkers }}
              zIndex={z + 10}
            />
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
            onCloseClick={() => {
              setSelectedOutage(null)
            }}
            options={{ disableAutoPan: false, pixelOffset: new window.google.maps.Size(0, -10) }}
          >
            <div>{getInfoWindowContent(selectedOutage)}</div>
          </InfoWindow>
        )}

        {selectedCompany && selectedCompany.lat && selectedCompany.lng && (
          <InfoWindow
            position={{
              lat: typeof selectedCompany.lat === "string" ? Number.parseFloat(selectedCompany.lat) : selectedCompany.lat,
              lng: typeof selectedCompany.lng === "string" ? Number.parseFloat(selectedCompany.lng) : selectedCompany.lng,
            }}
            onCloseClick={() => {
              setSelectedCompany(null)
            }}
            options={{
              disableAutoPan: false,
              pixelOffset: new window.google.maps.Size(0, -30)
            }}
          >
            <div className="relative">
              <button
                onClick={() => setSelectedCompany(null)}
                className="absolute top-1 right-2 text-black text-2xl font-normal z-10 bg-transparent border-none cursor-pointer"
                style={{ lineHeight: 1 }}
                aria-label="Close"
              >
                ×
              </button>
              {getCompanyInfoWindowContent(selectedCompany)}
            </div>
          </InfoWindow>
        )}

        {selectedPoi && selectedPoi.latitude && selectedPoi.longitude && (
          <InfoWindow
            position={{
              lat: typeof selectedPoi.latitude === "string" ? Number.parseFloat(selectedPoi.latitude) : selectedPoi.latitude,
              lng: typeof selectedPoi.longitude === "string" ? Number.parseFloat(selectedPoi.longitude) : selectedPoi.longitude,
            }}
            onCloseClick={() => {
              setSelectedPoi(null)
            }}
            options={{
              disableAutoPan: false,
              pixelOffset: new window.google.maps.Size(0, -30)
            }}
          >
            <div className="relative">
              <button
                onClick={() => setSelectedPoi(null)}
                className="absolute top-1 right-2 text-black text-2xl font-normal z-10 bg-transparent border-none cursor-pointer"
                style={{ lineHeight: 1 }}
                aria-label="Close"
              >
                ×
              </button>
              {getPoiInfoWindowContent(selectedPoi)}
            </div>
          </InfoWindow>
        )}

        {/* Render polygons for all outages when global toggle is enabled */}
        {showPolygons && visibleOutages
          .filter((outage) => outage.polygon_geojson)
          .map((outage) => {
            const polygonPath = parsePolygonGeoJson(outage.polygon_geojson)
            if (!polygonPath || polygonPath.length === 0) return null
            
            const outageId = outage.id || outage.incident_id || outage.webid || outage.outage_id || Math.random()
            const provider = outage.provider || 'unknown'
            return (
              <Polygon
                key={`polygon-${outageId}-${provider}`}
                paths={polygonPath}
                options={{
                  fillColor: outageType === "unplanned" ? "#EF4444" : outageType === "planned" ? "#F97316" : "#3B82F6",
                  fillOpacity: 0.25,
                  strokeColor: outageType === "unplanned" ? "#EF4444" : outageType === "planned" ? "#F97316" : "#3B82F6",
                  strokeOpacity: 0.7,
                  strokeWeight: 2,
                  clickable: false,
                  zIndex: 1,
                }}
              />
            )
          })}
      </ClientGoogleMap>

      {/* Map Legend */}
      <MapLegend outageType={outageType} zoomLevel={currentZoom} showPoiMarkers={showPoiMarkers} showPolygons={showPolygons} />
    </div>
  )
}

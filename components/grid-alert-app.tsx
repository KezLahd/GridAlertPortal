/// <reference path="../types/google-maps.d.ts" />
"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { createClient } from "@supabase/supabase-js"
import { addDays, format } from "date-fns"
import { parseDate, CalendarDate } from "@internationalized/date"
import type { RangeValue } from "@react-types/shared"
import dynamic from "next/dynamic"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DateRangePicker, Popover, PopoverContent, PopoverTrigger, Button } from "@/components/ui/heroui"
import { Input } from "@/components/ui/input"
import { AlertCircle, Info, PieChart, TableIcon, Download, FileText, ChevronDown, ChevronUp, RefreshCw, Search, X } from "lucide-react"
import { exportToCSV, exportToPDF } from "@/lib/export-utils"
import { cn } from "@/lib/utils"
import OutageList, { aggregateOutages } from "@/components/outage-list"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import SearchBar from "@/components/search-bar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ToastContainer, type Toast } from "@/components/ui/toast"
import OutageStats from "@/components/outage-stats"
import MapsError from "@/components/maps-error"
import { AppSidebar } from "@/components/sidebar"
import { Badge } from "@/components/ui/badge"
import { MapSkeleton, ListSkeleton, StatsSkeleton, TableSkeleton } from "@/components/skeleton-components"

// Dynamically import the Map component to avoid SSR issues with Google Maps
const Map = dynamic(() => import("@/components/map"), {
  ssr: false,
  loading: () => null, // Don't show loading state - we handle it with skeletons
})

// Supabase client initialization (env vars only so we always hit the intended project)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.")
}

// We read from the dedicated gridalert schema in the new Supabase project
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: "gridalert" },
})

// Outage types
type OutageType = "unplanned" | "planned" | "future"
type SortField = "incident" | "provider" | "streets" | "suburb" | "reason" | "customers" | "start" | "end"
type SortDirection = "asc" | "desc"

// Energy providers
type EnergyProvider = "Ausgrid" | "Endeavour" | "Energex" | "Ergon" | "SA Power" | "Horizon Power" | "WPower" | "AusNet" | "CitiPowerCor" | "Essential Energy" | "Jemena" | "UnitedEnergy" | "TasNetworks"

const PROVIDER_STATE_DEFAULTS: Record<EnergyProvider, string> = {
  Ausgrid: "NSW",
  Endeavour: "NSW",
  Energex: "QLD",
  Ergon: "QLD",
  "SA Power": "SA",
  "Horizon Power": "WA",
  WPower: "WA",
  AusNet: "VIC",
  CitiPowerCor: "VIC",
  "Essential Energy": "NSW",
  Jemena: "VIC",
  UnitedEnergy: "VIC",
  TasNetworks: "TAS",
}

// Provider badge colors (aligned with provider SVG branding)
const PROVIDER_BADGE_CLASSES: Record<string, string> = {
  Ausgrid: "bg-blue-100 text-blue-800",
  Endeavour: "bg-green-100 text-green-800",
  Energex: "bg-cyan-100 text-lime-700 border-lime-200",
  Ergon: "bg-red-100 text-red-800",
  "SA Power": "bg-orange-100 text-orange-800",
  "Horizon Power": "bg-amber-100 text-amber-900",
  WPower: "bg-amber-200 text-black",
  AusNet: "bg-emerald-50 text-emerald-900 border-emerald-200",
  CitiPowerCor: "bg-blue-50 text-red-700 border-blue-200",
  "Essential Energy": "bg-orange-50 text-blue-700 border-orange-200",
  Jemena: "bg-cyan-50 text-indigo-900 border-cyan-200",
  UnitedEnergy: "bg-purple-100 text-purple-800 border-purple-200",
  TasNetworks: "bg-pink-100 text-pink-700 border-pink-200",
}

// Outage data interfaces based on actual database structure
interface UnplannedOutage {
  id: number
  statusheading: string
  area_suburb: string
  cause: string
  customers_affected: number | string
  estimated_finish_time: string
  start_time: string
  webid: number
  status: string
  // Adding latitude and longitude for map display
  latitude?: number | string
  longitude?: number | string
  geocoded_address?: string
  state?: string
  // Adding provider field
  provider: EnergyProvider
  // Polygon data for providers that support it
  polygon_geojson?: any
  reason?: string
}

interface PlannedOutage {
  id: number
  area_suburb: string
  cause: string
  details: string
  customers_affected: number | string
  end_date_time: string
  start_date_time: string
  status: string
  streets_affected: string
  webid: number
  paid: string
  created_at: string
  // Adding latitude and longitude for map display
  latitude?: number | string
  longitude?: number | string
  geocoded_address?: string
  state?: string
  // Adding provider field
  provider: EnergyProvider
  // Polygon data for providers that support it
  polygon_geojson?: any
  reason?: string
}

// Function to check if Google Maps API is loaded
const isGoogleMapsLoaded = () => {
  return (
    typeof window !== "undefined" &&
    typeof window.google !== "undefined" &&
    window.google.maps &&
    typeof window.google.maps.Geocoder === "function"
  )
}

// Simple in-memory geocode cache to avoid repeated lookups
const geocodeCache = new globalThis.Map<string, { lat: number; lng: number; formatted_address: string }>()

// SA PowerNet outages return suburbs as JSON; normalise to a readable string (suburb only, no postcode)
const formatSapowerSuburbs = (value: any): string => {
  if (!value) return "N/A"
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!item) return ""
        if (typeof item === "string") {
          // If it's a string, check if it contains postcode and extract suburb only
          // Format might be "Suburb Name 5000" or just "Suburb Name"
          const parts = item.trim().split(/\s+/)
          // If last part is a 4-digit number (postcode), remove it
          if (parts.length > 1 && /^\d{4}$/.test(parts[parts.length - 1])) {
            return parts.slice(0, -1).join(" ")
          }
          return item
        }
        if (typeof item === "object") {
          // Extract suburb name from object (usually has 'suburb' or 'name' property)
          // Avoid postcode fields
          return item.suburb || item.name || item.suburb_name || 
            Object.values(item).find((v: any) => typeof v === "string" && !/^\d{4}$/.test(v) && v.trim() !== "") || ""
        }
        return String(item)
      })
      .filter(Boolean)
      .join(", ")
  }
  if (typeof value === "object") {
    // Extract suburb name from object, avoid postcode
    return value.suburb || value.name || value.suburb_name || ""
  }
  // If it's a string, remove postcode if present
  const str = String(value).trim()
  const parts = str.split(/\s+/)
  if (parts.length > 1 && /^\d{4}$/.test(parts[parts.length - 1])) {
    return parts.slice(0, -1).join(" ")
  }
  return str
}

const formatAreasList = (value: any): string => {
  if (!value) return ""
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!item) return ""
        if (typeof item === "string") return item
        if (typeof item === "object") return Object.values(item).join(" ")
        return String(item)
      })
      .filter(Boolean)
      .join(", ")
  }
  if (typeof value === "object") {
    return Object.values(value)
      .map((v) => (typeof v === "string" ? v : String(v)))
      .filter(Boolean)
      .join(", ")
  }
  return String(value)
}

// Function to convert address to coordinates (geocoding)
const geocodeAddresses = async <T extends UnplannedOutage | PlannedOutage>(
  outages: T[],
  outageType: OutageType,
): Promise<T[]> => {
  // Filter outages that already have coordinates
  const outagesToGeocode = outages.filter((outage: T) => !outage.latitude || !outage.longitude)
  const outagesWithCoordinates = outages.filter((outage: T) => outage.latitude && outage.longitude)

  // If all outages have coordinates, return them
  if (outagesToGeocode.length === 0) {
    return outages
  }

  // Check if Google Maps API is loaded
  if (!isGoogleMapsLoaded()) {
    console.warn("Google Maps API not fully loaded, deferring geocoding until available")
    // Return only outages that already have coordinates; remaining will be re-fetched once Maps is ready
    return [...outagesWithCoordinates]
  }

  // Use Google Maps Geocoding API
  const geocoder = new window.google.maps.Geocoder()

  // Process outages one by one to avoid rate limiting
  const geocodedOutages: T[] = []

  for (const outage of outagesToGeocode) {
    try {
      let geocodeRequest = ""

      const providerState =
        (outage as any).state ||
        (outage.provider ? PROVIDER_STATE_DEFAULTS[outage.provider as EnergyProvider] : undefined) ||
        "NSW"

      // For planned outages, try to geocode the specific street
      if (outageType === "planned" || outageType === "future") {
        // If we have streets_affected, use the first street mentioned
        if ("streets_affected" in outage && outage.streets_affected) {
          const streets = outage.streets_affected.split(",")
          const firstStreet = streets[0].trim()
          // Combine street with suburb for better accuracy
          geocodeRequest = `${firstStreet}, ${outage.area_suburb}, ${providerState}, Australia`
        } else {
          // Fallback to suburb if no streets are specified
          geocodeRequest = `${outage.area_suburb}, ${providerState}, Australia`
        }
      } else {
        // For unplanned outages, geocode suburb using provider's state to improve accuracy
        geocodeRequest = `${outage.area_suburb}, ${providerState}, Australia`
      }

      // Cache hit check to avoid repeat geocoding
      const cached = geocodeCache.get(geocodeRequest)
      if (cached) {
        geocodedOutages.push({
          ...outage,
          latitude: cached.lat,
          longitude: cached.lng,
          geocoded_address: cached.formatted_address,
        } as T)
        continue
      }

      // </CHANGE> Using window.google consistently to avoid undeclared variable lint errors
      // Wait for geocoding result
      const result = await new Promise<any>((resolve) => {
        if (window.google && window.google.maps) {
          geocoder.geocode({ address: geocodeRequest }, (results: any, status: any) => {
            if (status === "OK" && results && results[0]) {
              resolve(results[0])
            } else {
              console.warn(`Geocoding failed for "${geocodeRequest}": ${status}`)
              resolve(null)
            }
          })
        } else {
          console.warn("Google Maps API not available")
          resolve(null)
        }
      })

      if (result) {
        geocodeCache.set(geocodeRequest, {
          lat: result.geometry.location.lat(),
          lng: result.geometry.location.lng(),
          formatted_address: result.formatted_address,
        })
        geocodedOutages.push({
          ...outage,
          latitude: result.geometry.location.lat(),
          longitude: result.geometry.location.lng(),
          geocoded_address: result.formatted_address,
        } as T)
      } else {
        // If geocoding fails, use random coordinates as fallback
        const baseLatitude = -33.865143 // Sydney area
        const baseLongitude = 151.2099
        geocodedOutages.push({
          ...outage,
          latitude: baseLatitude + (Math.random() - 0.5) * 0.1,
          longitude: baseLongitude + (Math.random() - 0.5) * 0.1,
        } as T)
      }
    } catch (error) {
      console.error("Error geocoding address:", error)
      // If there's an error, use random coordinates as fallback
      const baseLatitude = -33.865143 // Sydney area
      const baseLongitude = 151.2099
      geocodedOutages.push({
        ...outage,
        latitude: baseLatitude + (Math.random() - 0.5) * 0.1,
        longitude: baseLongitude + (Math.random() - 0.5) * 0.1,
      } as T)
    }
  }

  return [...outagesWithCoordinates, ...geocodedOutages]
}

type GridAlertAppProps = {
  initialOutageType?: OutageType
}

export default function GridAlertApp({ initialOutageType = "unplanned" }: GridAlertAppProps) {
  const [outageType, setOutageType] = useState<OutageType>(initialOutageType)
  const [date, setDate] = useState<Date | undefined>(new Date())

  // Sync outageType when initialOutageType prop changes (e.g., on navigation)
  useEffect(() => {
    if (outageType !== initialOutageType) {
      setOutageType(initialOutageType)
      // Don't set loading here - let the fetchData effect handle it
    }
  }, [initialOutageType, outageType])
  const [unplannedOutages, setUnplannedOutages] = useState<UnplannedOutage[]>([])
  const [plannedOutages, setPlannedOutages] = useState<PlannedOutage[]>([])
  const [futurePlannedOutages, setFuturePlannedOutages] = useState<PlannedOutage[]>([])
  const [loading, setLoading] = useState(false)
  const [isInitialMount, setIsInitialMount] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null)
  const [selectedOutageId, setSelectedOutageId] = useState<string | number | null>(null)
  // Track previous incident IDs to detect new and restored outages
  const [previousUnplannedIds, setPreviousUnplannedIds] = useState<Set<string>>(new Set())
  const [previousPlannedIds, setPreviousPlannedIds] = useState<Set<string>>(new Set())
  const [previousFutureIds, setPreviousFutureIds] = useState<Set<string>>(new Set())
  
  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([])
  const hasShownToastsForCurrentData = useRef(false)
  
  const [connectionTested, setConnectionTested] = useState(false)
  const [mapsApiError, setMapsApiError] = useState<string | null>(null)
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<EnergyProvider | "all">("all")
  const [viewMode, setViewMode] = useState<"map" | "report">("map")
  const [sortField, setSortField] = useState<SortField>("incident")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [reportSearch, setReportSearch] = useState("")
  const [reportPage, setReportPage] = useState(1)
  const pageSize = 100
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [providerStatus, setProviderStatus] = useState<Record<string, Date>>({})

  // Fetch provider status data from consolidated table
  const fetchProviderStatus = async () => {
    try {
      console.log(`[DEBUG] Starting fetchProviderStatus for ${outageType}`)

      // Test basic Supabase connectivity first
      console.log(`[DEBUG] Testing Supabase connectivity...`)
      try {
        const { data: testData, error: testError } = await supabase
          .from("unplanned_outages_consolidated")
          .select("count", { count: 'exact', head: true })

        if (testError) {
          console.error(`[DEBUG] Supabase connectivity test failed:`, testError)
        } else {
          console.log(`[DEBUG] Supabase connectivity OK, table has ${testData} rows`)
        }
      } catch (connectivityErr) {
        console.error(`[DEBUG] Supabase connectivity test threw error:`, connectivityErr)
      }

      // Choose the appropriate consolidated table based on outage type
      const tableName = {
        unplanned: "unplanned_outages_consolidated",
        planned: "current_planned_outages_consolidated",
        future: "future_planned_outages_consolidated"
      }[outageType] || "unplanned_outages_consolidated"

      console.log(`[DEBUG] Using table: ${tableName}`)

      // Select appropriate columns based on outage type
      // Different tables have different column names for start/end times
      const selectColumns = outageType === "unplanned"
        ? "provider, start_time, estimated_finish_time, consolidated_at"
        : "provider, start_date_time, end_date_time, consolidated_at"

      // For provider status, we want ALL data regardless of date filters
      // The date filters only apply to what outages are displayed, not to when data was last updated
      let query = supabase
        .from(tableName)
        .select(selectColumns)

      // Don't apply any date filters for provider status - we want to see when ALL providers last updated
      console.log(`[DEBUG] Getting all provider status data (no date filters applied)`)

      console.log(`[DEBUG] Executing query...`)
      const { data, error } = await query
      console.log(`[DEBUG] Query completed. Data length: ${data?.length || 0}, Error:`, error)

      if (error) {
        console.error(`Error fetching provider status from ${tableName}:`, {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error,
          errorType: typeof error,
          errorKeys: Object.keys(error)
        })
        return
      }

      // If no data returned, log a warning but don't fail
      if (!data || data.length === 0) {
        console.warn(`No provider status data found for ${outageType} in table ${tableName}`)
        return
      }

      // Group by provider and get the most recent outage timestamp for each
      const statusMap: Record<string, Date> = {}
      data?.forEach(row => {
        // Use consolidated_at for all outage types (when data was synchronized)
        if (!row.consolidated_at) {
          console.warn(`[DEBUG] Row missing consolidated_at for provider ${row.provider}:`, row)
          return
        }

        const timestamp = new Date(row.consolidated_at)
        if (isNaN(timestamp.getTime())) {
          console.warn(`[DEBUG] Invalid consolidated_at date for provider ${row.provider}:`, row.consolidated_at)
          return
        }

        if (!statusMap[row.provider] || timestamp > statusMap[row.provider]) {
          statusMap[row.provider] = timestamp
        }
      })

      console.log(`[DEBUG] Final statusMap for ${outageType}:`, statusMap)
      setProviderStatus(statusMap)
    } catch (err) {
      console.error("Error fetching provider status:", err)
    }
  }

  // Fetch provider status on mount and periodically
  useEffect(() => {
    fetchProviderStatus()

    // Refresh provider status every 30 seconds
    const interval = setInterval(fetchProviderStatus, 30000)

    return () => clearInterval(interval)
  }, [outageType])

  // Helper function to get status color based on data freshness
  const getStatusColor = (lastUpdated: Date | undefined) => {
    if (!lastUpdated) return "text-gray-500"

    const now = new Date()
    const diffMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60)
    const diffHours = diffMinutes / 60
    const diffDays = diffHours / 24

    // Different thresholds for different outage types
    if (outageType === "future") {
      // Future outages: green <1 day, yellow 1-2 days, red >2 days (since they update once daily)
      if (diffDays > 2) return "text-red-500" // Very stale data
      if (diffDays > 1) return "text-yellow-500" // Stale data
      return "text-green-500" // Fresh data
    } else {
      // Unplanned/planned: green <5min, yellow 5-30min, red >30min
      if (diffMinutes > 30) return "text-red-500" // Very stale data
      if (diffMinutes > 5) return "text-yellow-500" // Stale data
      return "text-green-500" // Fresh data
    }
  }

  // Helper function to format time ago
  const getTimeAgo = (date: Date | undefined) => {
    if (!date) return "No data"

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)

    if (diffMinutes < 1) return "Just now"
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.floor(diffHours / 24)}d ago`
  }
  const [futureStartDate, setFutureStartDate] = useState<Date | null>(null)
  const [futureEndDate, setFutureEndDate] = useState<Date | null>(null)
  const [futureRangeSet, setFutureRangeSet] = useState(false)
  const [futureModalRange, setFutureModalRange] = useState<RangeValue<CalendarDate> | null>(null)
  const [companyCenter, setCompanyCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [companyLocation, setCompanyLocation] = useState<{ lat: number; lng: number; name?: string; userCount?: number } | null>(null)
  const [poiLocations, setPoiLocations] = useState<Array<{ id: string; poi_name: string; institution_code?: string; institution_email?: string; institution_phone?: string; latitude: number | string; longitude: number | string; street_address?: string; city?: string; state?: string; postcode?: string }>>([])
  const [showPoiMarkers, setShowPoiMarkers] = useState(false)
  const [showPolygons, setShowPolygons] = useState(false)

  // Keep snapshots of previous outages so we can describe restored ones in toasts
  const previousUnplannedOutagesRef = useRef<any[]>([])
  const previousPlannedOutagesRef = useRef<any[]>([])
  const previousFutureOutagesRef = useRef<any[]>([])

  const getOutageIdentifier = (outage: any) =>
    String(outage.incident_id || outage.webid || outage.id || outage.event_id || outage.outage_id || "")

  const truncateSuburb = (suburb: string) => {
    const words = suburb.split(/\s+/).filter(Boolean)
    if (words.length <= 3) return suburb
    return `${words.slice(0, 3).join(" ")}…`
  }

  const formatOutageSummary = (outage: any) => {
    const id = getOutageIdentifier(outage) || "N/A"
    const rawSuburb =
      outage.area_suburb ||
      outage.suburb ||
      outage.locality ||
      outage.city ||
      outage.town ||
      "Unknown area"
    const suburb = truncateSuburb(rawSuburb)
    const provider = outage.provider || "Unknown provider"
    return `${id} – ${suburb} (${provider})`
  }

  const buildOutageDescription = (outages: any[]) => {
    const seen = new Set<string>()
    const items: { suburb: string; provider: string; id: string }[] = []

    for (const outage of outages) {
      const id = getOutageIdentifier(outage)
      if (!id) continue
      const rawSuburb =
        outage.area_suburb ||
        outage.suburb ||
        outage.locality ||
        outage.city ||
        outage.town ||
        "Unknown area"
      const suburb = truncateSuburb(rawSuburb)
      const provider = outage.provider || "Unknown provider"
      const key = `${id}|${suburb}|${provider}`
      if (seen.has(key)) continue
      seen.add(key)
      items.push({ suburb, provider, id })
    }

    return items
  }

  // Check if Google Maps API is properly loaded
  useEffect(() => {
    if (typeof window === "undefined") return

    const checkGoogleMapsApi = () => {
      try {
        // Check if we can access the Google Maps API
        if (isGoogleMapsLoaded()) {
          setGoogleMapsLoaded(true)
          setMapsApiError(null)
        } else {
          // Check for gm-err-container which Google adds for API errors
          const errorContainer = document.querySelector(".gm-err-container")
          const errorMessage = document.querySelector(".gm-err-message")
          const errorTitle = document.querySelector(".gm-err-title")

          if (errorContainer || errorMessage || errorTitle) {
            let errorText = "Google Maps API Error"

            if (errorTitle) {
              errorText = errorTitle.textContent || errorText
            }
            if (errorMessage) {
              errorText += ": " + (errorMessage.textContent || "")
            }

            // Check if it's a billing error specifically
            if (errorText.toLowerCase().includes("billing") || window.location.href.includes("billingnotenabled")) {
              errorText =
                "Billing Not Enabled - You must enable billing on your Google Cloud project to use Google Maps"
            }

            setMapsApiError(errorText)
            console.error("Google Maps API error detected:", errorText)
          }

          // If no error elements but API still not loaded, try again later
          if (!window.google || !window.google.maps) {
            setTimeout(checkGoogleMapsApi, 1000)
          }
        }
      } catch (err) {
        console.error("Error checking Google Maps API:", err)
        setMapsApiError("Failed to load Google Maps API")
      }
    }

    checkGoogleMapsApi()
    const timer = setTimeout(checkGoogleMapsApi, 2000)
    const timer2 = setTimeout(checkGoogleMapsApi, 4000)

    return () => {
      clearTimeout(timer)
      clearTimeout(timer2)
    }
  }, [])

  // Test Supabase connection on mount
  useEffect(() => {
    const testConnection = async () => {
      if (connectionTested) return // Only test once

      try {
        console.log("Testing Supabase connection...")
        // Test consolidated tables instead of individual provider tables
        const { data, error } = await supabase
          .from("unplanned_outages_consolidated")
          .select("id")
          .limit(1)

        if (error) {
          console.error("Supabase connection test error:", error)
          setError("Database connection error: " + error.message)
        } else {
          console.log("Supabase connection successful")
          console.log("Consolidated table data:", data)
          setConnectionTested(true)
        }
      } catch (err: any) {
        const errorDetails = {
          message: err.message || "Unknown error",
          details: err.details,
          hint: err.hint,
          code: err.code,
          stack: err.stack,
        }
        console.error("Supabase connection test error:", errorDetails)
        setError(`Database connection error: ${errorDetails.message}`)
      }
    }

    testConnection()
  }, [connectionTested])

  // Fetch data based on the selected outage type
  useEffect(() => {
    // Skip on initial mount - let initialFetch handle it
    if (isInitialMount) {
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        if (outageType === "unplanned") {
          await fetchUnplannedOutages()
        } else if (outageType === "planned") {
          await fetchPlannedOutages()
        } else if (outageType === "future") {
          if (!futureStartDate || !futureEndDate) {
            setLoading(false)
            return
          }
          await fetchFutureOutages()
        }

        // IDs are updated inside fetch functions, no need to update here
      } catch (error: any) {
        console.error("Error fetching data:", error)
        setError("Failed to load data: " + error.message)
      } finally {
        setLoading(false)
      }
    }

    // Only fetch data if connection is tested and maps API is loaded (if needed)
    if (googleMapsLoaded || !["map"].includes(viewMode)) {
      // Fetch if map view or maps API is loaded
      fetchData()
    } else if (!mapsApiError) {
      // If maps API error, don't fetch map data
      setTimeout(fetchData, 1000) // Retry if maps API is still loading
    }
  }, [outageType, date, selectedProvider, futureStartDate, futureEndDate, googleMapsLoaded, mapsApiError, isInitialMount])

  // Re-fetch with proper geocoding once Google Maps is available
  useEffect(() => {
    if (!googleMapsLoaded) return
    if (outageType === "unplanned") {
      fetchUnplannedOutages()
    } else if (outageType === "planned") {
      fetchPlannedOutages()
    } else if (outageType === "future" && futureStartDate && futureEndDate) {
      fetchFutureOutages()
    }
  }, [googleMapsLoaded])

  const fetchUserProfile = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData?.user) return

      const { data: profileData } = await supabase
        .from("user_profiles")
        .select(
          `
          user_id,
          company:companies(id,name,location,latitude,longitude)
        `,
        )
        .eq("user_id", authData.user.id)
        .maybeSingle()

      // Profile's company may actually be an array due to join; handle accordingly
      const company = Array.isArray(profileData?.company) ? profileData.company[0] : profileData?.company

      if (company && company.latitude && company.longitude) {
        // Get user count for this company
        const { count: userCount } = await supabase
          .from("user_profiles")
          .select("*", { count: "exact", head: true })
          .eq("company_id", company.id)

        const companyCoords = {
          lat: Number(company.latitude),
          lng: Number(company.longitude),
        }
        setCompanyCenter(companyCoords)
        setCompanyLocation({
          ...companyCoords,
          name: company.name || undefined,
          userCount: userCount || 0,
        })
        
        // POI locations will be fetched lazily when toggle is enabled
      }
    } catch (error) {
      console.error("[v0] Error fetching user profile for map center:", error)
    }
  }

  const fetchPoiLocations = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("id, institutioncode, institutionname, institutionemail, institutionphoneno, addresslatitude, addresslongitude, addressline1, addresssuburb, addressstate, addresspostcode")
        .eq("company_id", companyId)
        .eq("institutionstatus", "ACTIVE")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching POI locations:", error)
        return
      }

      if (data) {
        setPoiLocations(data.map((location: any) => ({
          id: location.id,
          poi_name: location.institutionname || "",
          institution_code: location.institutioncode,
          institution_email: location.institutionemail,
          institution_phone: location.institutionphoneno,
          latitude: location.addresslatitude,
          longitude: location.addresslongitude,
          street_address: location.addressline1,
          city: location.addresssuburb,
          state: location.addressstate,
          postcode: location.addresspostcode,
        })))
      }
    } catch (error) {
      console.error("Error fetching POI locations:", error)
    }
  }

  // Only fetch POI locations when toggle is enabled
  useEffect(() => {
    const fetchIfNeeded = async () => {
      if (showPoiMarkers && companyLocation && poiLocations.length === 0) {
        // Get company ID from user profile
        const { data: authData } = await supabase.auth.getUser()
        if (!authData?.user) return

        const { data: profileData } = await supabase
          .from("user_profiles")
          .select("company:companies(id)")
          .eq("user_id", authData.user.id)
          .maybeSingle()

        const company = Array.isArray(profileData?.company) ? profileData.company[0] : profileData?.company
        if (company?.id) {
          await fetchPoiLocations(company.id)
        }
      }
    }
    fetchIfNeeded()
  }, [showPoiMarkers, companyLocation])

  // Initial data fetch and connection test on mount
  useEffect(() => {
    const initialFetch = async () => {
      setLoading(true)
      setError(null)
      try {
        // Test Supabase connection to consolidated tables
        const { error } = await supabase
          .from("unplanned_outages_consolidated")
          .select("id")
          .limit(1)

        if (error) {
          console.error("Supabase connection test error:", error)
          setError("Database connection error: " + error.message)
          setLoading(false)
          return
        }
        setConnectionTested(true)

        // Fetch initial data based on initialOutageType
        // Note: We don't set previous IDs on initial load to avoid false notifications
        // Also clear toasts on initial load
        setToasts([])
        if (initialOutageType === "unplanned") {
          await fetchUnplannedOutages()
          // Clear previous IDs on initial load so notifications only show after refresh
          setPreviousUnplannedIds(new Set())
        } else if (initialOutageType === "planned") {
          await fetchPlannedOutages()
          setPreviousPlannedIds(new Set())
        } else if (initialOutageType === "future") {
          // Set default future date range if not already set
          if (!futureStartDate || !futureEndDate) {
            const today = new Date()
            const defaultEndDate = addDays(today, 2)
            setFutureStartDate(today)
            setFutureEndDate(defaultEndDate)
            setFutureRangeSet(true)
            await fetchFutureOutages(today, defaultEndDate)
          } else {
            await fetchFutureOutages()
          }
        }
        // Fetch user profile for map centering
        await fetchUserProfile()
      } catch (error: any) {
        console.error("Initial data fetch error:", error)
        setError("Failed to load initial data: " + error.message)
      } finally {
        setLoading(false)
        setIsInitialMount(false) // Mark initial mount as complete
      }
    }

    initialFetch()
  }, []) // Empty dependency array ensures this runs only once on mount

  // Get current outages based on the selected type
  const getCurrentOutages = () => {
    let outages: any[] = []
    switch (outageType) {
      case "unplanned":
        outages = unplannedOutages
        break
      case "planned":
        outages = plannedOutages
        break
      case "future":
        outages = futurePlannedOutages
        break
      default:
        return []
    }
    
    // Filter by selected provider if not "all"
    if (selectedProvider !== "all") {
      return outages.filter((outage) => outage.provider === selectedProvider)
    }
    
    return outages
  }

  const formatDateTimeSafe = (value?: string) => {
    if (!value) return "N/A"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    try {
      return format(date, "PP p")
    } catch (e) {
      return value
    }
  }

  type ReportRow = {
    incident: string
    streets: string
    suburb: string
    provider: string
    reason: string
    customers: number | string
    start: string
    end: string
    state?: string
  }

  const normalizeOutageRow = (outage: any): ReportRow => {
    const incident = outage.incident_id ?? outage.webid ?? outage.id ?? "N/A"
    const provider = outage.provider ?? "Unknown"
    const streets = (() => {
      const streetsClean = outage.streets_affected && String(outage.streets_affected).trim()
      // SA Power doesn't provide streets, so return empty/N/A
      if (outage.provider === "SA Power") {
        return streetsClean || "N/A"
      }
      if (outageType === "unplanned") {
        if (outage.provider === "Ausgrid") {
          return streetsClean || "N/A"
        }
        return streetsClean || outage.geocoded_address || "N/A"
      }
      return streetsClean || outage.geocoded_address || "N/A"
    })()
    const suburb = outage.area_suburb || "N/A"
    const reason = (() => {
      // Only use reason field, no fallbacks
      const reasonValue = outage.reason
      if (!reasonValue || reasonValue === null || reasonValue === undefined) return "N/A"
      // If it's an object, try to extract meaningful data
      if (typeof reasonValue === "object" && reasonValue !== null) {
        // If it's an array, join it
        if (Array.isArray(reasonValue)) {
          return reasonValue.join(", ")
        }
        // If it has specific properties like postCode, townName, customerCount, format them nicely
        if (reasonValue.townName || reasonValue.postCode || reasonValue.customerCount !== undefined) {
          const parts = []
          if (reasonValue.townName) parts.push(reasonValue.townName)
          if (reasonValue.postCode) parts.push(`Postcode: ${reasonValue.postCode}`)
          if (reasonValue.customerCount !== undefined) parts.push(`Customers: ${reasonValue.customerCount}`)
          return parts.length > 0 ? parts.join(", ") : "N/A"
        }
        // Try to find a meaningful string property
        if (reasonValue.reason) return String(reasonValue.reason)
        if (reasonValue.description) return String(reasonValue.description)
        if (reasonValue.text) return String(reasonValue.text)
        // If it has a toString that's not the default, use it
        if (reasonValue.toString && reasonValue.toString() !== "[object Object]") {
          return String(reasonValue)
        }
        // Last resort: return a simple message
        return "See details"
      }
      return String(reasonValue)
    })()
    const customers = Number.isFinite(Number(outage.customers_affected))
      ? Number(outage.customers_affected)
      : (outage.customers_affected ?? "N/A")

    const start =
      outageType === "planned" || outageType === "future"
        ? outage.start_date_time || outage.created_at
        : outage.start_time
    const end =
      outageType === "planned" || outageType === "future"
        ? outage.end_date_time || outage.estimated_finish_time
        : outage.estimated_finish_time

    return {
      incident,
      streets,
      suburb,
      provider,
      reason,
      customers,
      start,
      end,
      state: outage.state || PROVIDER_STATE_DEFAULTS[provider as EnergyProvider] || "",
    }
  }

  const currentOutages = getCurrentOutages()

  const reportRows = useMemo(() => {
    return aggregateOutages(currentOutages).map((row) => normalizeOutageRow(row))
  }, [currentOutages, outageType])

  // Check if any rows have actual street data (not just N/A) in the "streets" column
  const hasStreetData = useMemo(() => {
    return reportRows.some((row) => {
      const streetsValue = row.streets
      return streetsValue && streetsValue !== "N/A" && String(streetsValue).trim() !== ""
    })
  }, [reportRows])

  const filteredReportRows = useMemo(() => {
    const query = reportSearch.trim().toLowerCase()
    return reportRows.filter((row) => {
      const matchesProvider = selectedProvider === "all" || row.provider === selectedProvider
      const matchesQuery =
        !query ||
        row.incident.toString().toLowerCase().includes(query) ||
        (hasStreetData && String(row.streets).toLowerCase().includes(query)) ||
        row.suburb.toLowerCase().includes(query) ||
        row.provider.toLowerCase().includes(query) ||
        row.reason.toLowerCase().includes(query)
      return matchesProvider && matchesQuery
    })
  }, [reportRows, reportSearch, selectedProvider, hasStreetData])

  const sortedReportRows = useMemo(() => {
    // State order for sorting
    const stateOrder = ["NSW", "QLD", "VIC", "SA", "WA", "TAS"]
    
    return [...filteredReportRows].sort((a, b) => {
      // First, sort by state (NSW, QLD, VIC, SA, WA, TAS)
      const stateA = (a.state || "").toUpperCase()
      const stateB = (b.state || "").toUpperCase()
      const indexA = stateOrder.indexOf(stateA)
      const indexB = stateOrder.indexOf(stateB)
      
      if (indexA !== -1 && indexB !== -1) {
        if (indexA !== indexB) {
          return indexA - indexB
        }
      } else if (indexA !== -1) {
        return -1 // stateA comes first
      } else if (indexB !== -1) {
        return 1 // stateB comes first
      } else if (stateA !== stateB) {
        return stateA.localeCompare(stateB)
      }
      
      // If states are the same, sort by provider alphabetically
      const providerA = (a.provider || "").toLowerCase()
      const providerB = (b.provider || "").toLowerCase()
      if (providerA !== providerB) {
        return providerA.localeCompare(providerB)
      }
      
      // Finally, sort by the user's selected sort field
      let valA: any = a[sortField]
      let valB: any = b[sortField]

      if (valA === undefined || valA === null) valA = ""
      if (valB === undefined || valB === null) valB = ""

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA
      }

      if (typeof valA === "string" && typeof valB === "string") {
        valA = valA.toLowerCase()
        valB = valB.toLowerCase()
        if (valA < valB) return sortDirection === "asc" ? -1 : 1
        if (valA > valB) return sortDirection === "asc" ? 1 : -1
        return 0
      }

      return 0 // Default case for unhandled types
    })
  }, [filteredReportRows, sortField, sortDirection])

  const pagedReportRows = useMemo(() => {
    const startIndex = (reportPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return sortedReportRows.slice(startIndex, endIndex)
  }, [sortedReportRows, reportPage, pageSize])

  const totalReportPages = Math.ceil(sortedReportRows.length / pageSize)

  useEffect(() => {
    setReportPage(1)
  }, [reportSearch, selectedProvider, sortField, sortDirection, outageType])

  useEffect(() => {
    if (outageType === "future") {
      if (futureRangeSet && futureStartDate && futureEndDate) {
        // Initialize from existing dates
        const startCal = parseDate(format(futureStartDate, "yyyy-MM-dd"))
        const endCal = parseDate(format(futureEndDate, "yyyy-MM-dd"))
        setFutureModalRange({ start: startCal, end: endCal })
      } else if (!futureRangeSet) {
        // Initialize with default range
        const today = new Date()
        const todayCal = parseDate(format(today, "yyyy-MM-dd"))
        const tomorrowCal = parseDate(format(addDays(today, 1), "yyyy-MM-dd"))
        setFutureModalRange({ start: todayCal, end: tomorrowCal })
      }
    }
  }, [outageType, futureRangeSet, futureStartDate, futureEndDate])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="w-4 h-4 ml-1 opacity-30" />
    return sortDirection === "asc" ? (
      <ChevronUp className="w-4 h-4 ml-1 text-primary" />
    ) : (
      <ChevronDown className="w-4 h-4 ml-1 text-primary" />
    )
  }

  const buildExportHeaders = () => {
    const headers = ["Incident"]
    if (hasStreetData) {
      headers.push("Streets")
    }
    headers.push("Suburb", "Provider", "Reason", "Customers", "Start Time", "End Time")
    return headers
  }

  const buildExportRows = () =>
    sortedReportRows.map((row) => {
      const baseRow: (string | number)[] = [row.incident]
      if (hasStreetData) {
        baseRow.push(String(row.streets))
      }
      baseRow.push(row.suburb, row.provider, row.reason, row.customers ?? "", formatDateTimeSafe(row.start), formatDateTimeSafe(row.end))
      return baseRow
    })

  const exportAsCSV = () => {
    exportToCSV(
      {
        headers: buildExportHeaders(),
        rows: buildExportRows(),
        title: "Outage Report",
        subtitle: `Mode: ${outageType}`,
      },
      `outage-report-${outageType}`,
    )
  }

  const exportAsPDF = () => {
    exportToPDF(
      {
        headers: buildExportHeaders(),
        rows: buildExportRows(),
        title: "Outage Report",
        subtitle: `Mode: ${outageType}`,
      },
      `outage-report-${outageType}`,
    )
  }

  // Handle date change for future planned outages (legacy - retained for map date picker if needed)
  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate)
      setIsCalendarOpen(false)
      if (outageType === "future" && futureRangeSet) {
        fetchFutureOutages()
      }
    }
  }

  // Handle location selection from search
  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const clearSearch = () => {
    setSearchQuery("")
  }

  // Handle outage selection from search dropdown
  const handleSelectOutage = (outage: any) => {
    const outageId = outage.incident_id || outage.webid || outage.id || outage.event_id || outage.outage_id
    setSelectedOutageId(outageId)
    setSelectedPoiId(null) // Clear POI selection
    setSearchQuery("") // Clear search query
  }

  // Handle POI selection from search dropdown
  const handleSelectPoi = (poi: any) => {
    setSelectedPoiId(poi.id)
    setSelectedOutageId(null) // Clear outage selection
    setSearchQuery("") // Clear search query
  }


  // Handle provider change
  const handleProviderChange = (provider: EnergyProvider | "all") => {
    setSelectedProvider(provider)
  }

  // Fetch functions declaration
  const fetchUnplannedOutages = async () => {
    try {
      // Query consolidated table - all providers already merged and normalized
      const { data, error } = await supabase
        .from("unplanned_outages_consolidated")
        .select("*")

      if (error) {
        console.error("Error fetching unplanned outages:", error)
        setError("Failed to load unplanned outages: " + error.message)
        return
      }

      // Update state first
      setUnplannedOutages((data || []) as any)
      setLastRefreshed(new Date())
      
      // Update previous IDs and snapshot after a short delay to allow comparisons
      setTimeout(() => {
        const currentIds = new Set(
          (data || []).map((outage: any) => 
            getOutageIdentifier(outage)
          ).filter((id: string) => id !== "")
        )
        setPreviousUnplannedIds(currentIds)
        previousUnplannedOutagesRef.current = data || []
      }, 100)
    } catch (err: any) {
      console.error("Error fetching unplanned outages:", err)
      setError("Failed to load unplanned outages: " + err.message)
    }
  }

  const fetchPlannedOutages = async () => {
    try {
      // Query consolidated table - all providers already merged and normalized
      const { data, error } = await supabase
        .from("current_planned_outages_consolidated")
        .select("*")

      if (error) {
        console.error("Error fetching planned outages:", error)
        setError("Failed to load planned outages: " + error.message)
        return
      }

      // Update state first
      setPlannedOutages((data || []) as any)
      setLastRefreshed(new Date())
      
      // Update previous IDs and snapshot after a short delay to allow comparisons
      setTimeout(() => {
        const currentIds = new Set(
          (data || []).map((outage: any) => 
            getOutageIdentifier(outage)
          ).filter((id: string) => id !== "")
        )
        setPreviousPlannedIds(currentIds)
        previousPlannedOutagesRef.current = data || []
      }, 100)
    } catch (err: any) {
      console.error("Error fetching planned outages:", err)
      setError("Failed to load planned outages: " + err.message)
    }
  }

  const fetchFutureOutages = async (startDate?: Date, endDate?: Date) => {
    try {
      // Query consolidated table - all providers already merged and normalized
      let query = supabase.from("future_planned_outages_consolidated").select("*")
      
      // Apply date range filter if provided
      const start = startDate || futureStartDate
      const end = endDate || futureEndDate
      if (start && end) {
        query = query
          .gte("start_date_time", start.toISOString())
          .lte("end_date_time", end.toISOString())
      }
      
      const { data, error } = await query

      if (error) {
        console.error("Error fetching future outages:", error)
        setError("Failed to load future outages: " + error.message)
        return
      }

      // Update state first
      setFuturePlannedOutages((data || []) as any)
      setLastRefreshed(new Date())
      
      // Update previous IDs and snapshot after a short delay to allow comparisons
      setTimeout(() => {
        const currentIds = new Set(
          (data || []).map((outage: any) => 
            getOutageIdentifier(outage)
          ).filter((id: string) => id !== "")
        )
        setPreviousFutureIds(currentIds)
        previousFutureOutagesRef.current = data || []
      }, 100)
    } catch (err: any) {
      console.error("Error fetching future outages:", err)
      setError("Failed to load future outages: " + err.message)
    }
  }

  // Manual refresh function
  const handleRefresh = async () => {
    // Clear all toasts when refreshing and reset the flag
    setToasts([])
    hasShownToastsForCurrentData.current = false
    setLoading(true)
    setError(null)
    try {
      if (outageType === "unplanned") {
        await fetchUnplannedOutages()
      } else if (outageType === "planned") {
        await fetchPlannedOutages()
      } else if (outageType === "future") {
        await fetchFutureOutages()
      }
    } catch (err: any) {
      console.error("Error refreshing outages:", err)
      setError("Failed to refresh outages: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Check for new and restored outages and show toasts
  // Only show toasts once per data change, not every time the effect runs
  useEffect(() => {
    // Skip if we've already shown toasts for this data
    if (hasShownToastsForCurrentData.current) return
    
    if (outageType === "unplanned" && previousUnplannedIds.size > 0 && unplannedOutages.length > 0) {
      const currentIds = new Set(
        unplannedOutages.map((outage: any) => 
          getOutageIdentifier(outage)
        ).filter((id: string) => id !== "")
      )
      
      const newIds = new Set([...currentIds].filter((id) => !previousUnplannedIds.has(id)))
      const restoredIds = new Set([...previousUnplannedIds].filter((id) => !currentIds.has(id)))

      const newOutages = unplannedOutages.filter((outage: any) =>
        newIds.has(getOutageIdentifier(outage)),
      )
      const restoredOutages = (previousUnplannedOutagesRef.current || []).filter((outage: any) =>
        restoredIds.has(getOutageIdentifier(outage)),
      )

      const newDescription = buildOutageDescription(newOutages)
      const restoredDescription = buildOutageDescription(restoredOutages)
      
      const newToasts: Toast[] = []
      if (newIds.size > 0) {
        newToasts.push({
          id: `new-unplanned-${Date.now()}-${Math.random()}`,
          title: `${newIds.size} new ${newIds.size === 1 ? "outage" : "outages"}`,
          type: "error",
          outages: newDescription.slice(0, 10), // Truncate to max 10 items
        })
      }
      if (restoredIds.size > 0) {
        newToasts.push({
          id: `restored-unplanned-${Date.now()}-${Math.random()}`,
          title: `${restoredIds.size} ${restoredIds.size === 1 ? "outage" : "outages"} restored`,
          type: "success",
          outages: restoredDescription.slice(0, 10), // Truncate to max 10 items
        })
      }
      
      if (newToasts.length > 0) {
        setToasts((prev) => [...prev, ...newToasts])
        hasShownToastsForCurrentData.current = true
      }
    } else if (outageType === "planned" && previousPlannedIds.size > 0 && plannedOutages.length > 0) {
      const currentIds = new Set(
        plannedOutages.map((outage: any) => 
          getOutageIdentifier(outage)
        ).filter((id: string) => id !== "")
      )
      
      const newIds = new Set([...currentIds].filter((id) => !previousPlannedIds.has(id)))
      const restoredIds = new Set([...previousPlannedIds].filter((id) => !currentIds.has(id)))

      const newOutages = plannedOutages.filter((outage: any) =>
        newIds.has(getOutageIdentifier(outage)),
      )
      const restoredOutages = (previousPlannedOutagesRef.current || []).filter((outage: any) =>
        restoredIds.has(getOutageIdentifier(outage)),
      )

      const newDescription = buildOutageDescription(newOutages)
      const restoredDescription = buildOutageDescription(restoredOutages)
      
      const newToasts: Toast[] = []
      if (newIds.size > 0) {
        newToasts.push({
          id: `new-planned-${Date.now()}-${Math.random()}`,
          title: `${newIds.size} new ${newIds.size === 1 ? "outage" : "outages"}`,
          type: "error",
          outages: newDescription.slice(0, 10), // Truncate to max 10 items
        })
      }
      if (restoredIds.size > 0) {
        newToasts.push({
          id: `restored-planned-${Date.now()}-${Math.random()}`,
          title: `${restoredIds.size} ${restoredIds.size === 1 ? "outage" : "outages"} restored`,
          type: "success",
          outages: restoredDescription.slice(0, 10), // Truncate to max 10 items
        })
      }
      
      if (newToasts.length > 0) {
        setToasts((prev) => [...prev, ...newToasts])
        hasShownToastsForCurrentData.current = true
      }
    } else if (outageType === "future" && previousFutureIds.size > 0 && futurePlannedOutages.length > 0) {
      const currentIds = new Set(
        futurePlannedOutages.map((outage: any) => 
          getOutageIdentifier(outage)
        ).filter((id: string) => id !== "")
      )
      
      const newIds = new Set([...currentIds].filter((id) => !previousFutureIds.has(id)))
      const restoredIds = new Set([...previousFutureIds].filter((id) => !currentIds.has(id)))

      const newOutages = futurePlannedOutages.filter((outage: any) =>
        newIds.has(getOutageIdentifier(outage)),
      )
      const restoredOutages = (previousFutureOutagesRef.current || []).filter((outage: any) =>
        restoredIds.has(getOutageIdentifier(outage)),
      )

      const newDescription = buildOutageDescription(newOutages)
      const restoredDescription = buildOutageDescription(restoredOutages)
      
      const newToasts: Toast[] = []
      if (newIds.size > 0) {
        newToasts.push({
          id: `new-future-${Date.now()}-${Math.random()}`,
          title: `${newIds.size} new ${newIds.size === 1 ? "outage" : "outages"}`,
          type: "error",
          outages: newDescription.slice(0, 10), // Truncate to max 10 items
        })
      }
      if (restoredIds.size > 0) {
        newToasts.push({
          id: `restored-future-${Date.now()}-${Math.random()}`,
          title: `${restoredIds.size} ${restoredIds.size === 1 ? "outage" : "outages"} restored`,
          type: "success",
          outages: restoredDescription.slice(0, 10), // Truncate to max 10 items
        })
      }
      
      if (newToasts.length > 0) {
        setToasts((prev) => [...prev, ...newToasts])
        hasShownToastsForCurrentData.current = true
      }
    }
  }, [unplannedOutages, plannedOutages, futurePlannedOutages, previousUnplannedIds, previousPlannedIds, previousFutureIds, outageType])
  
  // Clear toasts and reset flag when switching outage types
  useEffect(() => {
    setToasts([])
    hasShownToastsForCurrentData.current = false
  }, [outageType])


  // Info Button Component
  const InfoButton = () => {

    const providers: EnergyProvider[] = [
      "Ausgrid", "Endeavour", "Energex", "Ergon", "SA Power",
      "Horizon Power", "WPower", "AusNet", "CitiPowerCor",
      "Essential Energy", "Jemena", "UnitedEnergy", "TasNetworks"
    ]

    return (
      <div className="fixed bottom-6 right-6 z-[9999]">
        <Popover placement="top-end">
          <PopoverTrigger>
            <Button
              variant="bordered"
              size="sm"
              isIconOnly
              className="rounded-full w-10 h-10 p-0 shadow-lg bg-white/90 backdrop-blur-sm border-gray-300 hover:bg-white"
            >
              <Info className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 max-h-96 overflow-y-auto">
            <div className="space-y-3">
              <h3 className="font-semibold text-lg pb-2 border-b">Provider Data Status</h3>
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {providers.map(provider => (
                  <div key={provider} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                    <span className="text-sm font-medium truncate mr-2">{provider}</span>
                    <span className={`text-xs font-mono whitespace-nowrap ${getStatusColor(providerStatus[provider])}`}>
                      {getTimeAgo(providerStatus[provider])}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#f2f2f4] text-[#1f1f22]">
      <AppSidebar />

      <div className="flex w-full flex-col">
        <div className="bg-gray-900 w-full px-8 py-4">
          <div className="mx-auto flex w-full min-w-[900px] max-w-[1800px]">
            <div className="flex flex-col gap-4 md:grid md:grid-cols-3 md:items-center w-full">
              <div className="flex items-center gap-3 md:justify-start">
                <Button
                  variant="bordered"
                  size="sm"
                  className="flex items-center gap-2 bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
                  onPress={handleRefresh}
                  isDisabled={loading}
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                  Refresh
                </Button>
                <div className="flex flex-col text-xs leading-tight" style={{ color: '#f3f4f6' }}>
                  <span style={{ color: '#f3f4f6' }}>
                    Last refreshed: {lastRefreshed ? format(lastRefreshed, "PP p") : "Just now"}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1 items-center text-center">
                <h1 className="text-3xl font-semibold text-white">Outage Map</h1>
                {outageType === "future" && (
                  <div className="flex items-center gap-3 flex-wrap justify-center">
                    <div suppressHydrationWarning>
                      <DateRangePicker
                        label=""
                        value={futureModalRange}
                        onChange={(range) => {
                          setFutureModalRange(range)
                          if (range?.start && range?.end) {
                            const start = new Date(range.start.year, range.start.month - 1, range.start.day)
                            const end = new Date(range.end.year, range.end.month - 1, range.end.day)
                            setFutureStartDate(start)
                            setFutureEndDate(end)
                            setFutureRangeSet(true)
                            setLoading(true)
                            fetchFutureOutages(start, end)
                          }
                        }}
                        visibleMonths={2}
                        // Disallow selecting dates before today at the component level
                        minValue={parseDate(format(new Date(), "yyyy-MM-dd"))}
                        className="max-w-md"
                        classNames={{
                          base: "bg-white rounded-lg shadow-sm border border-gray-200",
                          inputWrapper: "bg-white",
                          input: "bg-white",
                        }}
                        calendarProps={{
                          classNames: {
                            // Style days outside the current month - match background (very light)
                            // Style disabled/unavailable days - slightly darker grey
                            cell: "[&[data-outside-month]]:text-gray-100 [&[data-disabled]]:text-gray-500 [&[data-disabled]]:opacity-60",
                          },
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2">
                <div className="flex items-center gap-1 bg-gray-800 rounded-lg px-1 py-1 shadow-sm border border-gray-700">
                  <Button
                    variant={viewMode === "map" ? "solid" : "light"}
                    size="sm"
                    className={cn(
                      "flex items-center gap-2 rounded-md",
                      viewMode === "map" 
                        ? "bg-orange-600 hover:bg-orange-700" 
                        : "hover:bg-gray-700"
                    )}
                    style={{ color: '#ffffff' }}
                    onPress={() => setViewMode("map")}
                  >
                    <PieChart className="h-4 w-4" style={{ color: '#ffffff' }} />
                    <span className="hidden sm:inline" style={{ color: '#ffffff' }}>Visual</span>
                  </Button>
                  <Button
                    variant={viewMode === "report" ? "solid" : "light"}
                    size="sm"
                    className={cn(
                      "flex items-center gap-2 rounded-md",
                      viewMode === "report" 
                        ? "bg-orange-600 hover:bg-orange-700" 
                        : "hover:bg-gray-700"
                    )}
                    style={{ color: '#ffffff' }}
                    onPress={() => setViewMode("report")}
                  >
                    <TableIcon className="h-4 w-4" style={{ color: '#ffffff' }} />
                    <span className="hidden sm:inline" style={{ color: '#ffffff' }}>Report</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="relative mx-auto flex w-full min-w-[900px] max-w-[1800px] flex-1 flex-col gap-4 px-8 py-6">
          {mapsApiError && (
            <MapsError message="The Google Maps API is not activated for your API key. Please check your Google Cloud Console to enable the necessary APIs." />
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {searchQuery && (
            <Alert>
              <Search className="h-4 w-4" />
              <AlertDescription className="flex justify-between items-center">
                <span>Search results for: "{searchQuery}"</span>
                <Button variant="bordered" size="sm" onPress={clearSearch}>
                  Clear Search
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <ToastContainer
            toasts={toasts}
            onClose={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
          />


          {loading ? (
            <StatsSkeleton />
          ) : (
            <OutageStats outages={getCurrentOutages()} outageType={outageType} />
          )}

          {viewMode === "map" ? (
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex-1 min-w-0">
                <Card className="rounded-xl overflow-hidden">
                  <CardContent className="relative p-0">
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 bg-gradient-to-b from-black/60 via-black/35 to-transparent px-4 py-3">
                      <div className="pointer-events-auto w-full max-w-md">
                        <SearchBar
                          onSearch={handleSearch}
                          onSelectOutage={handleSelectOutage}
                          onSelectPoi={handleSelectPoi}
                          outages={getCurrentOutages()}
                          poiLocations={poiLocations}
                          showPoiMarkers={showPoiMarkers}
                        />
                      </div>
                      <div className="pointer-events-auto flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md">
                          <input
                            type="checkbox"
                            id="show-poi-markers"
                            checked={showPoiMarkers}
                            onChange={(e) => setShowPoiMarkers(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <label htmlFor="show-poi-markers" className="text-sm font-medium text-gray-700 cursor-pointer">
                            Show POIs
                          </label>
                        </div>
                        {getCurrentOutages().some((outage) => outage.polygon_geojson) && (
                          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md">
                            <input
                              type="checkbox"
                              id="show-polygons"
                              checked={showPolygons}
                              onChange={(e) => setShowPolygons(e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label htmlFor="show-polygons" className="text-sm font-medium text-gray-700 cursor-pointer">
                              Show Polygons
                            </label>
                          </div>
                        )}
                        <div className="w-[200px]">
                          <Select value={selectedProvider} onValueChange={(val) => handleProviderChange(val as any)}>
                            <SelectTrigger className="w-full bg-white">
                              <SelectValue placeholder="All providers">
                                {selectedProvider === "all" ? "All providers" : selectedProvider}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All</SelectItem>
                              <SelectItem value="Ausgrid">Ausgrid</SelectItem>
                              <SelectItem value="Endeavour">Endeavour</SelectItem>
                              <SelectItem value="Energex">Energex</SelectItem>
                              <SelectItem value="Ergon">Ergon</SelectItem>
                              <SelectItem value="SA Power">SA Power</SelectItem>
                              <SelectItem value="Horizon Power">Horizon Power</SelectItem>
                              <SelectItem value="WPower">WPower</SelectItem>
                              <SelectItem value="AusNet">AusNet</SelectItem>
                              <SelectItem value="CitiPowerCor">CitiPowerCor</SelectItem>
                              <SelectItem value="Essential Energy">Essential Energy</SelectItem>
                              <SelectItem value="Jemena">Jemena</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-b-xl rounded-t-xl">
                      {loading ? (
                        <MapSkeleton />
                      ) : (
                        <div className="h-[70vh]">
                          <Map
                            outages={getCurrentOutages()}
                            outageType={outageType}
                            searchQuery={searchQuery}
                            selectedPoiId={selectedPoiId}
                            selectedOutageId={selectedOutageId}
                            companyCenter={companyCenter}
                            companyLocation={companyLocation}
                            poiLocations={poiLocations}
                            showPoiMarkers={showPoiMarkers}
                            showPolygons={showPolygons}
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="w-full md:w-auto md:max-w-[300px]">
                <div className="h-full relative rounded-xl">
                  {error ? (
                    <div className="rounded-md bg-red-50 p-4 text-red-500">{error}</div>
                  ) : loading ? (
                    <ListSkeleton />
                  ) : (
                    <div className="relative">
                      <OutageList
                        outages={getCurrentOutages()}
                        outageType={outageType}
                        aggregatedOutages={aggregateOutages(getCurrentOutages())}
                        compact
                        noPadding
                        onOutageClick={(outage) => {
                          const outageId = outage.incident_id || outage.webid || outage.id || outage.event_id || outage.outage_id
                          setSelectedOutageId(outageId)
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start gap-3 justify-between">
                  <div>
                    <CardTitle>Outage Report</CardTitle>
                    <CardDescription>Tabular view of current outages</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Input
                      placeholder="Search incident, streets, suburb, provider, reason..."
                      value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                      className="w-full md:w-80"
                    />
                    <Select
                      value={selectedProvider}
                      onValueChange={(val) => setSelectedProvider(val as EnergyProvider | "all")}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All providers</SelectItem>
                        <SelectItem value="Ausgrid">Ausgrid</SelectItem>
                        <SelectItem value="Endeavour">Endeavour</SelectItem>
                        <SelectItem value="Energex">Energex</SelectItem>
                        <SelectItem value="Ergon">Ergon</SelectItem>
                        <SelectItem value="SA Power">SA Power</SelectItem>
                        <SelectItem value="Horizon Power">Horizon Power</SelectItem>
                        <SelectItem value="WPower">WPower</SelectItem>
                        <SelectItem value="AusNet">AusNet</SelectItem>
                        <SelectItem value="CitiPowerCor">CitiPowerCor</SelectItem>
                        <SelectItem value="Essential Energy">Essential Energy</SelectItem>
                        <SelectItem value="Jemena">Jemena</SelectItem>
                        <SelectItem value="UnitedEnergy">UnitedEnergy</SelectItem>
                        <SelectItem value="TasNetworks">TasNetworks</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="bordered" size="sm" onPress={exportAsPDF}>
                      <FileText className="w-4 h-4 mr-2" />
                      Export PDF
                    </Button>
                    <Button variant="bordered" size="sm" onPress={exportAsCSV}>
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {loading ? (
                  <TableSkeleton />
                ) : (
                  <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-semibold text-foreground uppercase text-sm py-3">
                        <button className="flex items-center gap-1" onClick={() => handleSort("incident")}>
                          Incident
                          <SortIcon field="incident" />
                        </button>
                      </TableHead>
                      {hasStreetData && (
                        <TableHead className="font-semibold text-foreground uppercase text-sm py-3">
                          <button className="flex items-center gap-1" onClick={() => handleSort("streets")}>
                            Streets
                            <SortIcon field="streets" />
                          </button>
                        </TableHead>
                      )}
                      <TableHead className="font-semibold text-foreground uppercase text-sm py-3">
                        <button className="flex items-center gap-1" onClick={() => handleSort("suburb")}>
                          Suburb
                          <SortIcon field="suburb" />
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold text-foreground uppercase text-sm py-3">
                        <button className="flex items-center gap-1" onClick={() => handleSort("provider")}>
                          Provider
                          <SortIcon field="provider" />
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold text-foreground uppercase text-sm py-3">
                        <button className="flex items-center gap-1" onClick={() => handleSort("reason")}>
                          Reason
                          <SortIcon field="reason" />
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold text-foreground uppercase text-sm py-3 text-right">
                        <button className="flex items-center gap-1 ml-auto" onClick={() => handleSort("customers")}>
                          Customers
                          <SortIcon field="customers" />
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold text-foreground uppercase text-sm py-3">
                        <button className="flex items-center gap-1" onClick={() => handleSort("start")}>
                          Start Time
                          <SortIcon field="start" />
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold text-foreground uppercase text-sm py-3">
                        <button className="flex items-center gap-1" onClick={() => handleSort("end")}>
                          End Time
                          <SortIcon field="end" />
                        </button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedReportRows.map((row, idx) => (
                      <TableRow
                        key={`${row.incident}-${row.suburb}-${row.provider}-${idx}`}
                        className="hover:bg-secondary/60"
                      >
                        <TableCell className="font-medium">{row.incident}</TableCell>
                        {hasStreetData && (
                          <TableCell className="max-w-[560px] whitespace-normal break-words">{row.streets}</TableCell>
                        )}
                        <TableCell>{row.suburb}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={PROVIDER_BADGE_CLASSES[row.provider] ?? "bg-gray-100 text-gray-800"}
                            variant="outline"
                          >
                            {row.provider}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[260px] whitespace-normal break-words">
                          {row.reason}
                        </TableCell>
                        <TableCell className="text-center w-24">{row.customers ?? "N/A"}</TableCell>
                        <TableCell>{formatDateTimeSafe(row.start)}</TableCell>
                        <TableCell>{formatDateTimeSafe(row.end)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between gap-3 py-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(reportPage - 1) * pageSize + 1}-{Math.min(reportPage * pageSize, sortedReportRows.length)}{" "}
                    of {sortedReportRows.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="bordered"
                      size="sm"
                      onPress={() => setReportPage((p) => Math.max(1, p - 1))}
                      isDisabled={reportPage === 1}
                    >
                      Prev
                    </Button>
                    <span className="text-sm">
                      Page {reportPage} / {totalReportPages}
                    </span>
                    <Button
                      variant="bordered"
                      size="sm"
                      onPress={() => setReportPage((p) => Math.min(totalReportPages, p + 1))}
                      isDisabled={reportPage >= totalReportPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
                {sortedReportRows.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-lg font-semibold text-foreground mb-2">No data found</p>
                    <p>Try adjusting filters or refresh</p>
                  </div>
                )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <footer className="mt-auto w-full border-t border-[#e0d9cf] bg-[#f2f2f4] px-8 py-4">
          <div className="mx-auto max-w-screen-2xl text-center text-sm text-[#1f1f22]">
            <p>GridAlert © {new Date().getFullYear()} - Real-time power outage monitoring</p>
          </div>
        </footer>

        {/* Info Button for Data Source Status */}
        <InfoButton />
      </div>
    </div>
  )
}

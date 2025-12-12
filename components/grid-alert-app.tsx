/// <reference path="../types/google-maps.d.ts" />
"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@supabase/supabase-js"
import { addDays, format } from "date-fns"
import type { DateRange } from "react-day-picker"
import dynamic from "next/dynamic"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar05 } from "@/components/calendar05"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, Info, PieChart, TableIcon, Download, FileText, ChevronDown, ChevronUp } from "lucide-react"
import { exportToCSV, exportToPDF } from "@/lib/export-utils"
import OutageList, { aggregateOutages } from "@/components/outage-list"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import SearchBar from "@/components/search-bar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import NotificationBanner from "@/components/notification-banner"
import OutageStats from "@/components/outage-stats"
import MapsError from "@/components/maps-error"
import { AppSidebar } from "@/components/sidebar"
import { Badge } from "@/components/ui/badge"

// Dynamically import the Map component to avoid SSR issues with Google Maps
const Map = dynamic(() => import("@/components/map"), {
  ssr: false,
  loading: () => <div className="h-[70vh] w-full bg-gray-200 animate-pulse"></div>,
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
type SortField = "incident" | "provider" | "streets" | "suburb" | "cause" | "customers" | "start" | "end"
type SortDirection = "asc" | "desc"

// Energy providers
type EnergyProvider = "Ausgrid" | "Endeavour" | "Energex" | "Ergon" | "SA Power" | "Horizon Power" | "WPower"

const PROVIDER_STATE_DEFAULTS: Record<EnergyProvider, string> = {
  Ausgrid: "NSW",
  Endeavour: "NSW",
  Energex: "QLD",
  Ergon: "QLD",
  "SA Power": "SA",
  "Horizon Power": "WA",
  WPower: "WA",
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

// SA PowerNet outages return suburbs as JSON; normalise to a readable string
const formatSapowerSuburbs = (value: any): string => {
  if (!value) return "N/A"
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
  const [unplannedOutages, setUnplannedOutages] = useState<UnplannedOutage[]>([])
  const [plannedOutages, setPlannedOutages] = useState<PlannedOutage[]>([])
  const [futurePlannedOutages, setFuturePlannedOutages] = useState<PlannedOutage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [searchLocation, setSearchLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [searchAddress, setSearchAddress] = useState<string | null>(null)
  const [previousUnplannedCount, setPreviousUnplannedCount] = useState(0)
  const [previousPlannedCount, setPreviousPlannedCount] = useState(0)
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
  const [futureStartDate, setFutureStartDate] = useState<Date | null>(null)
  const [futureEndDate, setFutureEndDate] = useState<Date | null>(null)
  const [futureRangeSet, setFutureRangeSet] = useState(false)
  const [showFutureRangeModal, setShowFutureRangeModal] = useState(false)
  const [futureModalRange, setFutureModalRange] = useState<DateRange | undefined>()
  const [companyCenter, setCompanyCenter] = useState<{ lat: number; lng: number } | null>(null)

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
        const [
          { data, error },
          { error: endeavourError },
          { error: energexError },
          { error: ergonError },
          { error: sapowerError },
          { error: horizonError },
          { error: wpowerError },
        ] = await Promise.all([
          supabase.from("ausgrid_unplanned_outages").select("id").limit(1),
          supabase.from("endeavour_current_unplanned_outages").select("id").limit(1),
          supabase.from("energex_current_unplanned_outages").select("id").limit(1),
          supabase.from("ergon_current_unplanned_outages").select("id").limit(1),
          supabase.from("sapower_current_unplanned_outages").select("id").limit(1),
          supabase.from("horizon_current_unplanned_outages").select("id").limit(1),
          supabase.from("wpower_current_unplanned_outages").select("id").limit(1),
        ])

        const firstError =
          error || endeavourError || energexError || ergonError || sapowerError || horizonError || wpowerError
        if (firstError) {
          console.error("Supabase connection test error:", firstError)
          setError("Database connection error: " + firstError.message)
        } else {
          console.log("Supabase connection successful")
          console.log("Ausgrid data:", data)
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

        // Update previous counts after fetching
        if (outageType === "unplanned") {
          setPreviousUnplannedCount(unplannedOutages.length)
        } else if (outageType === "planned") {
          setPreviousPlannedCount(plannedOutages.length)
        }
      } catch (error: any) {
        console.error("Error fetching data:", error)
        setError("Failed to load data: " + error.message)
      } finally {
        setLoading(false)
      }
    }

    // Only fetch data if connection is tested and maps API is loaded (if needed)
    // For initial load, fetch regardless of connectionTested, as it's part of the loading process
    if (googleMapsLoaded || !["map"].includes(viewMode)) {
      // Fetch if map view or maps API is loaded
      fetchData()
    } else if (!mapsApiError) {
      // If maps API error, don't fetch map data
      setTimeout(fetchData, 1000) // Retry if maps API is still loading
    }
  }, [outageType, date, selectedProvider, futureStartDate, futureEndDate, googleMapsLoaded, mapsApiError])

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
        setCompanyCenter({
          lat: Number(company.latitude),
          lng: Number(company.longitude),
        })
      }
    } catch (error) {
      console.error("[v0] Error fetching user profile for map center:", error)
    }
  }

  // Initial data fetch and connection test on mount
  useEffect(() => {
    const initialFetch = async () => {
      setLoading(true)
      setError(null)
      try {
        // Test Supabase connection across providers
        const [
          { error: ausgridError },
          { error: endeavourError },
          { error: energexError },
          { error: ergonError },
          { error: sapowerError },
          { error: horizonError },
          { error: wpowerError },
        ] = await Promise.all([
          supabase.from("ausgrid_unplanned_outages").select("id").limit(1),
          supabase.from("endeavour_current_unplanned_outages").select("id").limit(1),
          supabase.from("energex_current_unplanned_outages").select("id").limit(1),
          supabase.from("ergon_current_unplanned_outages").select("id").limit(1),
          supabase.from("sapower_current_unplanned_outages").select("id").limit(1),
          supabase.from("horizon_current_unplanned_outages").select("id").limit(1),
          supabase.from("wpower_current_unplanned_outages").select("id").limit(1),
        ])

        const firstError =
          ausgridError ||
          endeavourError ||
          energexError ||
          ergonError ||
          sapowerError ||
          horizonError ||
          wpowerError
        if (firstError) {
          console.error("Supabase connection test error:", firstError)
          setError("Database connection error: " + firstError.message)
          setLoading(false)
          return
        }
        setConnectionTested(true)

        // Fetch initial data based on initialOutageType
        if (initialOutageType === "unplanned") {
          await fetchUnplannedOutages()
          setPreviousUnplannedCount(unplannedOutages.length)
        } else if (initialOutageType === "planned") {
          await fetchPlannedOutages()
          setPreviousPlannedCount(plannedOutages.length)
        } else if (initialOutageType === "future") {
          // Set default future date range if not already set
          if (!futureStartDate || !futureEndDate) {
            const today = new Date()
            const defaultEndDate = addDays(today, 7)
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
      }
    }

    initialFetch()
  }, []) // Empty dependency array ensures this runs only once on mount

  // Get current outages based on the selected type
  const getCurrentOutages = () => {
    switch (outageType) {
      case "unplanned":
        return unplannedOutages
      case "planned":
        return plannedOutages
      case "future":
        return futurePlannedOutages
      default:
        return []
    }
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
    cause: string
    customers: number | string
    start: string
    end: string
  }

  const normalizeOutageRow = (outage: any): ReportRow => {
    const incident = outage.incident_id ?? outage.webid ?? outage.id ?? "N/A"
    const provider = outage.provider ?? "Unknown"
    const streets = (() => {
      const streetsClean = outage.streets_affected && String(outage.streets_affected).trim()
      // SA Power only provides suburb/postcode; show suburb in report streets column
      if (outage.provider === "SA Power") {
        return outage.area_suburb || streetsClean || outage.geocoded_address || "N/A"
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
    const cause = outage.cause || outage.details || "N/A"
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
      cause,
      customers,
      start,
      end,
    }
  }

  const currentOutages = getCurrentOutages()

  const reportRows = useMemo(() => {
    return aggregateOutages(currentOutages).map((row) => normalizeOutageRow(row))
  }, [currentOutages, outageType])

  const filteredReportRows = useMemo(() => {
    const query = reportSearch.trim().toLowerCase()
    return reportRows.filter((row) => {
      const matchesProvider = selectedProvider === "all" || row.provider === selectedProvider
      const matchesQuery =
        !query ||
        row.incident.toString().toLowerCase().includes(query) ||
        row.streets.toLowerCase().includes(query) ||
        row.suburb.toLowerCase().includes(query) ||
        row.provider.toLowerCase().includes(query) ||
        row.cause.toLowerCase().includes(query)
      return matchesProvider && matchesQuery
    })
  }, [reportRows, reportSearch, selectedProvider])

  const sortedReportRows = useMemo(() => {
    return [...filteredReportRows].sort((a, b) => {
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
    if (outageType === "future" && !futureRangeSet) {
      const today = new Date()
      setFutureModalRange({ from: today, to: addDays(today, 1) })
      setShowFutureRangeModal(true)
      setLoading(false)
    }
  }, [outageType, futureRangeSet])

  const handleFutureRangeConfirm = () => {
    if (!futureModalRange?.from || !futureModalRange?.to) return
    const start = futureModalRange.from
    const end = futureModalRange.to
    if (end < start) return
    setFutureStartDate(start)
    setFutureEndDate(end)
    setFutureRangeSet(true)
    setShowFutureRangeModal(false)
    setLoading(true)
    fetchFutureOutages(start, end)
  }

  const handleFutureRangeChange = () => {
    const today = new Date()
    setFutureModalRange({ from: futureStartDate ?? today, to: futureEndDate ?? addDays(today, 1) })
    setFutureRangeSet(false)
    setShowFutureRangeModal(true)
  }

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

  const buildExportHeaders = () => [
    "Incident",
    "Streets",
    "Suburb",
    "Provider",
    "Cause",
    "Customers",
    "Start Time",
    "End Time",
  ]

  const buildExportRows = () =>
    sortedReportRows.map((row) => [
      row.incident,
      row.streets,
      row.suburb,
      row.provider,
      row.cause,
      row.customers ?? "",
      formatDateTimeSafe(row.start),
      formatDateTimeSafe(row.end),
    ])

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
  const handleLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    setSearchLocation({ lat: location.lat, lng: location.lng })
    setSearchAddress(location.address)
  }

  // Clear search
  const clearSearch = () => {
    setSearchLocation(null)
    setSearchAddress(null)
  }

  // Handle provider change
  const handleProviderChange = (provider: EnergyProvider | "all") => {
    setSelectedProvider(provider)
  }

  // Fetch functions declaration
  const fetchUnplannedOutages = async () => {
    try {
      // Query all provider unplanned outage tables in parallel
      const [ausgridRes, endeavourRes, energexRes, ergonRes, sapowerRes, horizonRes, wpowerRes] = await Promise.all([
        supabase.from("ausgrid_unplanned_outages").select("*"),
        supabase.from("endeavour_current_unplanned_outages").select("*"),
        supabase.from("energex_current_unplanned_outages").select("*"),
        supabase.from("ergon_current_unplanned_outages").select("*"),
        supabase.from("sapower_current_unplanned_outages").select("*"),
        supabase.from("horizon_current_unplanned_outages").select("*"),
        supabase.from("wpower_current_unplanned_outages").select("*"),
      ])

      // Check for errors
      if (ausgridRes.error) console.error("Ausgrid unplanned error:", ausgridRes.error)
      if (endeavourRes.error) console.error("Endeavour unplanned error:", endeavourRes.error)
      if (energexRes.error) console.error("Energex unplanned error:", energexRes.error)
      if (ergonRes.error) console.error("Ergon unplanned error:", ergonRes.error)
      if (sapowerRes.error) console.error("SA Power unplanned error:", sapowerRes.error)
      if (horizonRes.error) console.error("Horizon Power unplanned error:", horizonRes.error)
      if (wpowerRes.error) console.error("WPower unplanned error:", wpowerRes.error)

      // Merge all results with provider labels
      const merged = [
        ...(ausgridRes.data || []).map((item: any) => ({ ...item, provider: "Ausgrid" as const })),
        ...(endeavourRes.data || []).map((item: any) => ({
          ...item,
          provider: "Endeavour" as const,
          area_suburb: item.suburb,
          cause: item.reason,
          customers_affected: item.number_customers_affected,
          estimated_finish_time: item.end_date_time,
          statusheading: item.status,
        })),
        ...(energexRes.data || []).map((item: any) => ({
          ...item,
          provider: "Energex" as const,
          area_suburb: item.suburbs,
          cause: item.reason,
          customers_affected: item.customers_affected,
          estimated_finish_time: item.est_fix_time,
          statusheading: item.status,
          latitude: item.point_lat,
          longitude: item.point_lng,
        })),
        ...(ergonRes.data || []).map((item: any) => ({
          ...item,
          provider: "Ergon" as const,
          area_suburb: item.suburbs,
          cause: item.reason,
          customers_affected: item.customers_affected,
          estimated_finish_time: item.est_fix_time,
          statusheading: item.status,
          latitude: item.point_lat,
          longitude: item.point_lng,
        })),
        ...(sapowerRes.data || []).map((item: any) => ({
          ...item,
          provider: "SA Power" as const,
          area_suburb: formatSapowerSuburbs(item.affected_suburbs),
          cause: item.reason,
          customers_affected: item.affected_customers,
          estimated_finish_time: item.est_restoration,
          statusheading: item.status,
          latitude: item.point_lat,
          longitude: item.point_lng,
        })),
        ...(horizonRes.data || []).map((item: any) => ({
          ...item,
          provider: "Horizon Power" as const,
          incident_id: item.outage_id,
          area_suburb: item.service_area || item.region || formatAreasList(item.service_areas) || "Unknown area",
          cause: item.outage_type || item.status || "Unplanned outage",
          customers_affected: item.affected_customers,
          estimated_finish_time: item.estimated_restore_time,
          statusheading: item.status,
          start_time: item.start_time,
          latitude: item.point_lat,
          longitude: item.point_lng,
          state: item.state || "WA",
        })),
        ...(wpowerRes.data || []).map((item: any) => ({
          ...item,
          provider: "WPower" as const,
          incident_id: item.outage_id,
          area_suburb: formatAreasList(item.areas) || "Unknown area",
          cause: item.outage_type || "Unplanned outage",
          customers_affected: item.affected_customers,
          estimated_finish_time: item.restoration_time,
          statusheading: item.outage_updated_time || item.outage_type || "In progress",
          start_time: item.start_time,
          latitude: item.point_lat,
          longitude: item.point_lng,
          state: item.state || "WA",
        })),
      ]

      setUnplannedOutages(merged as any)
    } catch (err: any) {
      console.error("Error fetching unplanned outages:", err)
      setError("Failed to load unplanned outages: " + err.message)
    }
  }

  const fetchPlannedOutages = async () => {
    try {
      // Query all provider planned outage tables in parallel
      const [ausgridRes, endeavourRes, energexRes, ergonRes, sapowerRes, horizonRes, wpowerRes] = await Promise.all([
        supabase.from("ausgrid_current_planned_outages").select("*"),
        supabase.from("endeavour_current_planned_outages").select("*"),
        supabase.from("energex_current_planned_outages").select("*"),
        supabase.from("ergon_current_planned_outages").select("*"),
        supabase.from("sapower_current_planned_outages").select("*"),
        supabase.from("horizon_current_planned_outages").select("*"),
        supabase.from("wpower_current_planned_outages").select("*"),
      ])

      // Check for errors
      if (ausgridRes.error) console.error("Ausgrid planned error:", ausgridRes.error)
      if (endeavourRes.error) console.error("Endeavour planned error:", endeavourRes.error)
      if (energexRes.error) console.error("Energex planned error:", energexRes.error)
      if (ergonRes.error) console.error("Ergon planned error:", ergonRes.error)
      if (sapowerRes.error) console.error("SA Power planned error:", sapowerRes.error)
      if (horizonRes.error) console.error("Horizon Power planned error:", horizonRes.error)
      if (wpowerRes.error) console.error("WPower planned error:", wpowerRes.error)

      // Merge all results with provider labels
      const merged = [
        ...(ausgridRes.data || []).map((item: any) => ({ ...item, provider: "Ausgrid" as const })),
        ...(endeavourRes.data || []).map((item: any) => ({
          ...item,
          provider: "Endeavour" as const,
          area_suburb: item.suburb,
          cause: item.reason,
          customers_affected: item.number_customers_affected,
          end_date_time: item.end_date_time,
          start_date_time: item.start_date_time,
          status: item.status,
          streets_affected: item.street_name,
        })),
        ...(energexRes.data || []).map((item: any) => ({
          ...item,
          provider: "Energex" as const,
          area_suburb: item.suburbs,
          cause: item.reason,
          customers_affected: item.customers_affected,
          end_date_time: item.est_fix_time,
          start_date_time: item.start_time,
          status: item.status,
          streets_affected: item.streets,
          latitude: item.point_lat,
          longitude: item.point_lng,
        })),
        ...(ergonRes.data || []).map((item: any) => ({
          ...item,
          provider: "Ergon" as const,
          area_suburb: item.suburbs,
          cause: item.reason,
          customers_affected: item.customers_affected,
          end_date_time: item.est_fix_time,
          start_date_time: item.start_time,
          status: item.status,
          streets_affected: item.streets,
          latitude: item.point_lat,
          longitude: item.point_lng,
        })),
        ...(sapowerRes.data || []).map((item: any) => ({
          ...item,
          provider: "SA Power" as const,
          area_suburb: formatSapowerSuburbs(item.affected_suburbs),
          cause: item.reason,
          customers_affected: item.affected_customers,
          end_date_time: item.est_restoration,
          start_date_time: item.start_time,
          status: item.status,
          streets_affected: item.affected_streets || "",
          latitude: item.point_lat,
          longitude: item.point_lng,
        })),
        ...(horizonRes.data || []).map((item: any) => ({
          ...item,
          provider: "Horizon Power" as const,
          incident_id: item.outage_id,
          area_suburb: item.service_area || item.region || formatAreasList(item.service_areas) || "Unknown area",
          cause: item.outage_type || "Planned maintenance",
          customers_affected: item.affected_customers,
          end_date_time: item.estimated_restore_time,
          start_date_time: item.start_time,
          status: item.status || "Planned",
          streets_affected: formatAreasList(item.service_areas) || item.service_area || "",
          latitude: item.point_lat,
          longitude: item.point_lng,
          state: item.state || "WA",
        })),
        ...(wpowerRes.data || []).map((item: any) => ({
          ...item,
          provider: "WPower" as const,
          incident_id: item.outage_id,
          area_suburb: formatAreasList(item.areas) || "Unknown area",
          cause: item.outage_type || "Planned maintenance",
          customers_affected: item.affected_customers,
          end_date_time: item.restoration_time,
          start_date_time: item.start_time,
          status: item.outage_type || "Planned",
          streets_affected: formatAreasList(item.areas),
          latitude: item.point_lat,
          longitude: item.point_lng,
          state: item.state || "WA",
        })),
      ]

      setPlannedOutages(merged as any)
    } catch (err: any) {
      console.error("Error fetching planned outages:", err)
      setError("Failed to load planned outages: " + err.message)
    }
  }

  const fetchFutureOutages = async (startDate?: Date, endDate?: Date) => {
    try {
      // Query all provider future planned outage tables in parallel
      const [ausgridRes, endeavourRes, energexRes, ergonRes, sapowerRes, horizonRes, wpowerRes] = await Promise.all([
        supabase.from("ausgrid_future_planned_outages").select("*"),
        supabase.from("endeavour_future_planned_outages").select("*"),
        supabase.from("energex_future_planned_outages").select("*"),
        supabase.from("ergon_future_planned_outages").select("*"),
        supabase.from("sapower_future_planned_outages").select("*"),
        supabase.from("horizon_future_planned_outages").select("*"),
        supabase.from("wpower_future_planned_outages").select("*"),
      ])

      // Check for errors
      if (ausgridRes.error) console.error("Ausgrid future error:", ausgridRes.error)
      if (endeavourRes.error) console.error("Endeavour future error:", endeavourRes.error)
      if (energexRes.error) console.error("Energex future error:", energexRes.error)
      if (ergonRes.error) console.error("Ergon future error:", ergonRes.error)
      if (sapowerRes.error) console.error("SA Power future error:", sapowerRes.error)
      if (horizonRes.error) console.error("Horizon Power future error:", horizonRes.error)
      if (wpowerRes.error) console.error("WPower future error:", wpowerRes.error)

      // Merge all results with provider labels
      const merged = [
        ...(ausgridRes.data || []).map((item: any) => ({ ...item, provider: "Ausgrid" as const })),
        ...(endeavourRes.data || []).map((item: any) => ({
          ...item,
          provider: "Endeavour" as const,
          area_suburb: item.suburb,
          cause: item.reason,
          customers_affected: item.number_customers_affected,
          end_date_time: item.end_date_time,
          start_date_time: item.start_date_time,
          status: item.status,
          streets_affected: item.street_name,
        })),
        ...(energexRes.data || []).map((item: any) => ({
          ...item,
          provider: "Energex" as const,
          area_suburb: item.suburbs,
          cause: item.reason,
          customers_affected: item.customers_affected,
          end_date_time: item.est_fix_time,
          start_date_time: item.start_time,
          status: item.status,
          streets_affected: item.streets,
          latitude: item.point_lat,
          longitude: item.point_lng,
        })),
        ...(ergonRes.data || []).map((item: any) => ({
          ...item,
          provider: "Ergon" as const,
          area_suburb: item.suburbs,
          cause: item.reason,
          customers_affected: item.customers_affected,
          end_date_time: item.est_fix_time,
          start_date_time: item.start_time,
          status: item.status,
          streets_affected: item.streets,
          latitude: item.point_lat,
          longitude: item.point_lng,
        })),
        ...(sapowerRes.data || []).map((item: any) => ({
          ...item,
          provider: "SA Power" as const,
          area_suburb: formatSapowerSuburbs(item.affected_suburbs), // Apply formatSapowerSuburbs to SA Power affected_suburbs in future outages
          cause: item.reason,
          customers_affected: item.affected_customers,
          end_date_time: item.est_restoration,
          start_date_time: item.start_time,
          status: item.status,
          streets_affected: item.feeders?.[0] || "",
          latitude: item.point_lat,
          longitude: item.point_lng,
        })),
        ...(horizonRes.data || []).map((item: any) => ({
          ...item,
          provider: "Horizon Power" as const,
          incident_id: item.outage_id,
          area_suburb: item.service_area || item.region || formatAreasList(item.service_areas) || "Unknown area",
          cause: item.outage_type || "Future maintenance",
          customers_affected: item.affected_customers,
          end_date_time: item.estimated_restore_time,
          start_date_time: item.start_time,
          status: item.status || "Planned",
          streets_affected: formatAreasList(item.service_areas) || item.service_area || "",
          latitude: item.point_lat,
          longitude: item.point_lng,
          state: item.state || "WA",
        })),
        ...(wpowerRes.data || []).map((item: any) => ({
          ...item,
          provider: "WPower" as const,
          incident_id: item.outage_id,
          area_suburb: formatAreasList(item.areas) || "Unknown area",
          cause: item.outage_type || "Future maintenance",
          customers_affected: item.affected_customers,
          end_date_time: item.restoration_time,
          start_date_time: item.start_time,
          status: item.outage_type || "Planned",
          streets_affected: formatAreasList(item.areas),
          latitude: item.point_lat,
          longitude: item.point_lng,
          state: item.state || "WA",
        })),
      ]

      setFuturePlannedOutages(merged as any)
    } catch (err: any) {
      console.error("Error fetching future outages:", err)
      setError("Failed to load future outages: " + err.message)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f2f2f4] text-[#1f1f22]">
      <AppSidebar />

      <div className="flex w-full flex-col">
        <div className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-4 px-8 py-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-semibold text-[#1f1f22]">Outage Map</h1>
              <p className="text-base text-muted-foreground">
                {outageType === "unplanned"
                  ? "Current unplanned outages by area/suburb"
                  : outageType === "planned"
                    ? "Current planned outages by affected streets"
                    : futureStartDate && futureEndDate
                      ? `Future planned outages from ${format(futureStartDate, "PPP")} to ${format(futureEndDate, "PPP")}`
                      : "Future planned outages"}
              </p>
              {outageType === "future" && futureRangeSet && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Date range:</span>
                  <span className="text-muted-foreground">
                    {format(futureStartDate as Date, "PPP")} to {format(futureEndDate as Date, "PPP")}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 bg-transparent"
                    onClick={handleFutureRangeChange}
                  >
                    Change range
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 bg-white rounded-full px-2 py-1 shadow-sm border border-[#e4e4e7]">
              <Button
                variant={viewMode === "map" ? "default" : "ghost"}
                size="sm"
                className="flex items-center gap-2 rounded-full"
                onClick={() => setViewMode("map")}
              >
                <PieChart className="h-4 w-4" />
                Visual
              </Button>
              <Button
                variant={viewMode === "report" ? "default" : "ghost"}
                size="sm"
                className="flex items-center gap-2 rounded-full"
                onClick={() => setViewMode("report")}
              >
                <TableIcon className="h-4 w-4" />
                Report
              </Button>
            </div>
          </div>
          {mapsApiError && (
            <MapsError message="The Google Maps API is not activated for your API key. Please check your Google Cloud Console to enable the necessary APIs." />
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {searchAddress && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="flex justify-between items-center">
                <span>Showing results near: {searchAddress}</span>
                <Button variant="outline" size="sm" onClick={clearSearch}>
                  Clear Search
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {outageType === "unplanned" && (
            <NotificationBanner
              outageType="unplanned"
              outages={unplannedOutages}
              previousOutagesCount={previousUnplannedCount}
            />
          )}
          {outageType === "planned" && (
            <NotificationBanner
              outageType="planned"
              outages={plannedOutages}
              previousOutagesCount={previousPlannedCount}
            />
          )}

          {showFutureRangeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-xl">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-semibold">Select future outage date range</h3>
                  </div>
                  <div className="flex justify-center">
                    <Calendar05
                      value={futureModalRange}
                      onChange={setFutureModalRange}
                      defaultMonth={futureModalRange?.from}
                      numberOfMonths={2}
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={handleFutureRangeConfirm}
                      disabled={!futureModalRange?.from || !futureModalRange?.to}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <OutageStats outages={getCurrentOutages()} outageType={outageType} />

          {viewMode === "map" ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <Card className="rounded-xl overflow-hidden">
                  <CardContent className="relative p-0">
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 bg-gradient-to-b from-black/60 via-black/35 to-transparent px-4 py-3">
                      <div className="pointer-events-auto w-full max-w-md">
                        <SearchBar onLocationSelect={handleLocationSelect} />
                      </div>
                      <div className="pointer-events-auto w-[200px]">
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
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-b-xl rounded-t-xl">
                      {loading ? (
                        <div className="h-[70vh] bg-gray-200 animate-pulse" />
                      ) : (
                        <div className="h-[70vh]">
                          <Map
                            outages={getCurrentOutages()}
                            outageType={outageType}
                            searchLocation={searchLocation}
                            companyCenter={companyCenter}
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <div className="h-full relative rounded-xl">
                  {error ? (
                    <div className="rounded-md bg-red-50 p-4 text-red-500">{error}</div>
                  ) : loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-2 rounded-lg border border-[#e5e7eb] bg-white p-3">
                          <div className="h-4 w-1/3 bg-gray-200 animate-pulse rounded" />
                          <div className="h-3 w-1/4 bg-gray-200 animate-pulse rounded" />
                          <div className="h-3 w-1/2 bg-gray-200 animate-pulse rounded" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="relative">
                      <OutageList
                        outages={getCurrentOutages()}
                        outageType={outageType}
                        aggregatedOutages={aggregateOutages(getCurrentOutages())}
                        compact
                        noPadding
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
                      placeholder="Search incident, streets, suburb, provider, cause..."
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
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={exportAsPDF}>
                      <FileText className="w-4 h-4 mr-2" />
                      Export PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportAsCSV}>
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-semibold text-foreground uppercase text-sm py-3">
                        <button className="flex items-center gap-1" onClick={() => handleSort("incident")}>
                          Incident
                          <SortIcon field="incident" />
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold text-foreground uppercase text-sm py-3">
                        <button className="flex items-center gap-1" onClick={() => handleSort("streets")}>
                          Streets
                          <SortIcon field="streets" />
                        </button>
                      </TableHead>
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
                        <button className="flex items-center gap-1" onClick={() => handleSort("cause")}>
                          Cause
                          <SortIcon field="cause" />
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
                        <TableCell className="max-w-[560px] whitespace-normal break-words">{row.streets}</TableCell>
                        <TableCell>{row.suburb}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              row.provider === "Ausgrid"
                                ? "bg-blue-100 text-blue-800"
                                : row.provider === "Endeavour"
                                  ? "bg-green-100 text-green-800"
                                  : row.provider === "Energex"
                                    ? "bg-cyan-100 text-teal-800"
                                    : row.provider === "Ergon"
                                      ? "bg-red-100 text-red-800"
                                      : row.provider === "SA Power"
                                        ? "bg-orange-100 text-orange-800"
                                        : row.provider === "Horizon Power"
                                          ? "bg-rose-100 text-orange-900"
                                          : row.provider === "WPower"
                                            ? "bg-amber-200 text-black"
                                            : "bg-gray-100 text-gray-800"
                            }
                            variant="outline"
                          >
                            {row.provider}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[260px] whitespace-normal break-words">
                          {row.cause}
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
                      variant="outline"
                      size="sm"
                      onClick={() => setReportPage((p) => Math.max(1, p - 1))}
                      disabled={reportPage === 1}
                    >
                      Prev
                    </Button>
                    <span className="text-sm">
                      Page {reportPage} / {totalReportPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReportPage((p) => Math.min(totalReportPages, p + 1))}
                      disabled={reportPage >= totalReportPages}
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
              </CardContent>
            </Card>
          )}
        </div>

        <footer className="mt-auto w-full border-t border-[#e0d9cf] bg-[#f2f2f4] px-8 py-4">
          <div className="mx-auto max-w-screen-2xl text-center text-sm text-[#1f1f22]">
            <p>GridAlert © {new Date().getFullYear()} - Real-time power outage monitoring</p>
          </div>
        </footer>
      </div>
    </div>
  )
}

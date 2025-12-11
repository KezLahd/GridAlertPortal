"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { format } from "date-fns"
import dynamic from "next/dynamic"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { AlertCircle, CalendarIcon, Info } from "lucide-react"
import OutageList from "@/components/outage-list"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import SearchBar from "@/components/search-bar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import NotificationBanner from "@/components/notification-banner"
import OutageStats from "@/components/outage-stats"
import MapsError from "@/components/maps-error"
import StreetDebug from "@/components/street-debug"

// Dynamically import the Map component to avoid SSR issues with Google Maps
const Map = dynamic(() => import("@/components/map"), {
  ssr: false,
  loading: () => <div className="h-[70vh] w-full bg-gray-200 animate-pulse"></div>,
})

// Hardcoded Supabase credentials for testing
const SUPABASE_URL = "https://tqgecnxpgxirlfvlpgot.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxZ2VjbnhwZ3hpcmxmdmxwZ290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyOTI1NDEsImV4cCI6MjA2MDg2ODU0MX0.wpInBXc6LZiEY5DoYAI7jF8EWYEuZqQ49Pvw-WkRS7c"

// Initialize Supabase client with error handling
let supabase: ReturnType<typeof createClient>

try {
  // Remove the schema specification to use the default schema
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
} catch (error) {
  console.error("Failed to initialize Supabase client:", error)
  // Provide a fallback client that will gracefully handle errors
  supabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          data: [],
          error: new Error("Supabase client initialization failed"),
        }),
        gte: () => ({
          lt: () => ({
            data: [],
            error: new Error("Supabase client initialization failed"),
          }),
        }),
      }),
    }),
  } as any
}

// Outage types
type OutageType = "unplanned" | "planned" | "future"

// Energy providers
type EnergyProvider = "Ausgrid" | "Endeavour"

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

// Function to convert address to coordinates (geocoding)
const geocodeAddresses = async (outages: any[], outageType: OutageType) => {
  // Filter outages that already have coordinates
  const outagesToGeocode = outages.filter((outage) => !outage.latitude || !outage.longitude)
  const outagesWithCoordinates = outages.filter((outage) => outage.latitude && outage.longitude)

  // If all outages have coordinates, return them
  if (outagesToGeocode.length === 0) {
    return outages
  }

  // Check if Google Maps API is loaded
  if (!isGoogleMapsLoaded()) {
    console.warn("Google Maps API not fully loaded, using mock coordinates")
    // If Google Maps API is not available, return mock coordinates
    const outagesWithMockCoordinates = outagesToGeocode.map((outage) => {
      const baseLatitude = -33.865143 // Sydney area
      const baseLongitude = 151.2099
      const latitude = baseLatitude + (Math.random() - 0.5) * 0.1
      const longitude = baseLongitude + (Math.random() - 0.5) * 0.1
      return { ...outage, latitude, longitude }
    })

    return [...outagesWithCoordinates, ...outagesWithMockCoordinates]
  }

  // Use Google Maps Geocoding API
  const geocoder = new window.google.maps.Geocoder()

  // Process outages one by one to avoid rate limiting
  const geocodedOutages = []

  for (const outage of outagesToGeocode) {
    try {
      let geocodeRequest = ""

      // For planned outages, try to geocode the specific street
      if (outageType === "planned" || outageType === "future") {
        // If we have streets_affected, use the first street mentioned
        if (outage.streets_affected) {
          const streets = outage.streets_affected.split(",")
          const firstStreet = streets[0].trim()
          // Combine street with suburb for better accuracy
          geocodeRequest = `${firstStreet}, ${outage.area_suburb}, Australia`
        } else {
          // Fallback to suburb if no streets are specified
          geocodeRequest = `${outage.area_suburb}, Australia`
        }
      } else {
        // For unplanned outages, geocode the suburb
        geocodeRequest = `${outage.area_suburb}, Australia`
      }

      // Wait for geocoding result
      const result = await new Promise<google.maps.GeocoderResult | null>((resolve) => {
        if (window.google && window.google.maps) {
          geocoder.geocode({ address: geocodeRequest }, (results, status) => {
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
        geocodedOutages.push({
          ...outage,
          latitude: result.geometry.location.lat(),
          longitude: result.geometry.location.lng(),
          geocoded_address: result.formatted_address,
        })
      } else {
        // If geocoding fails, use random coordinates as fallback
        const baseLatitude = -33.865143 // Sydney area
        const baseLongitude = 151.2099
        geocodedOutages.push({
          ...outage,
          latitude: baseLatitude + (Math.random() - 0.5) * 0.1,
          longitude: baseLongitude + (Math.random() - 0.5) * 0.1,
        })
      }

      // Add a small delay to avoid hitting rate limits
      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (error) {
      console.error("Error geocoding address:", error)
      // Add outage with random coordinates as fallback
      const baseLatitude = -33.865143 // Sydney area
      const baseLongitude = 151.2099
      geocodedOutages.push({
        ...outage,
        latitude: baseLatitude + (Math.random() - 0.5) * 0.1,
        longitude: baseLongitude + (Math.random() - 0.5) * 0.1,
      })
    }
  }

  return [...outagesWithCoordinates, ...geocodedOutages]
}

export default function GridAlertApp() {
  const [outageType, setOutageType] = useState<OutageType>("unplanned")
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
          // Look for error messages in the DOM (Google Maps adds these when there's an API error)
          const errorElements = document.querySelectorAll(".gm-err-message")
          if (errorElements.length > 0) {
            const errorMessage = errorElements[0].textContent || "Unknown Google Maps API error"
            setMapsApiError(errorMessage)
            console.error("Google Maps API error:", errorMessage)
          }

          // If no error elements but API still not loaded, try again later
          if (!window.google || !window.google.maps) {
            setTimeout(checkGoogleMapsApi, 1000)
          }
        }
      } catch (err) {
        console.error("Error checking Google Maps API:", err)
      }
    }

    // Wait a bit for the API to load or error out
    const timer = setTimeout(checkGoogleMapsApi, 2000)
    return () => clearTimeout(timer)
  }, [])

  // Fetch current unplanned outages
  const fetchUnplannedOutages = async () => {
    try {
      // Query the unplanned_outages table in the api schema (Ausgrid)
      const { data: ausgridData, error: ausgridError } = await supabase
        .from("unplanned_outages")
        .select("*")
        .eq("status", "2") // Assuming status 2 means active outages

      if (ausgridError) throw ausgridError

      // Query the endeavour_current_unplanned_outages table
      const { data: endeavourData, error: endeavourError } = await supabase
        .from("endeavour_current_unplanned_outages")
        .select("*")
        .eq("status", "2") // Assuming status 2 means active outages

      if (endeavourError) throw endeavourError

      console.log("Endeavour unplanned outages:", endeavourData)

      // Add provider field to each outage
      const ausgridOutages = (ausgridData || []).map((outage) => ({
        ...outage,
        provider: "Ausgrid" as EnergyProvider,
      }))

      const endeavourOutages = (endeavourData || []).map((outage) => ({
        ...outage,
        provider: "Endeavour" as EnergyProvider,
      }))

      // Combine outages from both providers
      let combinedOutages = [...ausgridOutages, ...endeavourOutages]

      // Filter by provider if needed
      if (selectedProvider !== "all") {
        combinedOutages = combinedOutages.filter((outage) => outage.provider === selectedProvider)
      }

      console.log("Unplanned outages fetched:", combinedOutages.length)

      // Add geocoded coordinates for Ausgrid outages only (Endeavour already has coordinates)
      const outagesWithCoordinates = await geocodeAddresses(combinedOutages, "unplanned")
      setUnplannedOutages(outagesWithCoordinates)
    } catch (error: any) {
      console.error("Error fetching unplanned outages:", error)
      setError("Failed to load unplanned outages: " + error.message)
      // Set empty array to prevent undefined errors
      setUnplannedOutages([])
    }
  }

  // Fetch current planned outages
  const fetchPlannedOutages = async () => {
    try {
      // Query the current_planned_outages table in the api schema (Ausgrid)
      const { data: ausgridData, error: ausgridError } = await supabase
        .from("current_planned_outages")
        .select("*")
        .eq("status", "Proceeding as scheduled") // Filter for active planned outages

      if (ausgridError) throw ausgridError

      // Query the endeavour_current_planned_outages table
      const { data: endeavourData, error: endeavourError } = await supabase
        .from("endeavour_current_planned_outages")
        .select("*")
        .eq("status", "Proceeding as scheduled") // Filter for active planned outages

      if (endeavourError) throw endeavourError

      console.log("Endeavour planned outages:", endeavourData)

      // Add provider field to each outage
      const ausgridOutages = (ausgridData || []).map((outage) => ({
        ...outage,
        provider: "Ausgrid" as EnergyProvider,
      }))

      const endeavourOutages = (endeavourData || []).map((outage) => ({
        ...outage,
        provider: "Endeavour" as EnergyProvider,
      }))

      // Combine outages from both providers
      let combinedOutages = [...ausgridOutages, ...endeavourOutages]

      // Filter by provider if needed
      if (selectedProvider !== "all") {
        combinedOutages = combinedOutages.filter((outage) => outage.provider === selectedProvider)
      }

      console.log("Planned outages fetched:", combinedOutages.length)

      // Add geocoded coordinates for Ausgrid outages only (Endeavour already has coordinates)
      const outagesWithCoordinates = await geocodeAddresses(combinedOutages, "planned")
      setPlannedOutages(outagesWithCoordinates)
    } catch (error: any) {
      console.error("Error fetching planned outages:", error)
      setError("Failed to load planned outages: " + error.message)
      // Set empty array to prevent undefined errors
      setPlannedOutages([])
    }
  }

  // Fetch future planned outages for a specific date
  const fetchFuturePlannedOutages = async (selectedDate: Date) => {
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd")

      // Query the future_planned_outages table in the api schema (Ausgrid)
      const { data: ausgridData, error: ausgridError } = await supabase
        .from("future_planned_outages")
        .select("*")
        .gte("start_date_time", `${dateStr}T00:00:00`)
        .lt("start_date_time", `${dateStr}T23:59:59`)

      if (ausgridError) throw ausgridError

      // Query the endeavour_future_planned_outages table
      const { data: endeavourData, error: endeavourError } = await supabase
        .from("endeavour_future_planned_outages")
        .select("*")
        .gte("start_date_time", `${dateStr}T00:00:00`)
        .lt("start_date_time", `${dateStr}T23:59:59`)

      if (endeavourError) throw endeavourError

      console.log("Endeavour future planned outages:", endeavourData)

      // Add provider field to each outage
      const ausgridOutages = (ausgridData || []).map((outage) => ({
        ...outage,
        provider: "Ausgrid" as EnergyProvider,
      }))

      const endeavourOutages = (endeavourData || []).map((outage) => ({
        ...outage,
        provider: "Endeavour" as EnergyProvider,
      }))

      // Combine outages from both providers
      let combinedOutages = [...ausgridOutages, ...endeavourOutages]

      // Filter by provider if needed
      if (selectedProvider !== "all") {
        combinedOutages = combinedOutages.filter((outage) => outage.provider === selectedProvider)
      }

      console.log("Future planned outages fetched:", combinedOutages.length)

      // Add geocoded coordinates for Ausgrid outages only (Endeavour already has coordinates)
      const outagesWithCoordinates = await geocodeAddresses(combinedOutages, "future")
      setFuturePlannedOutages(outagesWithCoordinates)
    } catch (error: any) {
      console.error("Error fetching future planned outages:", error)
      setError("Failed to load future planned outages: " + error.message)
      // Set empty array to prevent undefined errors
      setFuturePlannedOutages([])
    }
  }

  // Test Supabase connection on mount
  useEffect(() => {
    const testConnection = async () => {
      if (connectionTested) return // Only test once

      try {
        console.log("Testing Supabase connection...")
        // Use a simple query instead of an aggregate function
        const { data, error } = await supabase.from("unplanned_outages").select("id").limit(1)

        if (error) {
          console.error("Supabase connection test failed:", error)
          setError("Database connection failed: " + error.message)
        } else {
          console.log("Supabase connection successful, found:", data)
          setConnectionTested(true)
        }
      } catch (err: any) {
        console.error("Supabase connection test error:", err)
        setError("Database connection error: " + (err.message || "Unknown error"))
      }
    }

    testConnection()
  }, [connectionTested])

  // Fetch data based on the selected outage type
  useEffect(() => {
    setLoading(true)
    setError(null)

    const fetchData = async () => {
      try {
        if (outageType === "unplanned") {
          await fetchUnplannedOutages()
        } else if (outageType === "planned") {
          await fetchPlannedOutages()
        } else if (outageType === "future" && date) {
          await fetchFuturePlannedOutages(date)
        }

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

    fetchData()
  }, [outageType, date, selectedProvider])

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

  // Handle date change for future planned outages
  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate)
      setIsCalendarOpen(false)
      if (outageType === "future") {
        fetchFuturePlannedOutages(newDate)
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

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-primary text-white p-4 shadow-md">
        <div className="container mx-auto flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertCircle className="h-6 w-6" />
            GridAlert
          </h1>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <SearchBar onLocationSelect={handleLocationSelect} />
            {outageType === "future" && (
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="bg-white text-primary hover:bg-gray-100 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {date ? format(date, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar mode="single" selected={date} onSelect={handleDateChange} initialFocus />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4 flex-1 flex flex-col gap-4">
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

        {/* Provider selection */}
        <div className="flex justify-end mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Provider:</span>
            <div className="flex gap-1">
              <Button
                variant={selectedProvider === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => handleProviderChange("all")}
              >
                All
              </Button>
              <Button
                variant={selectedProvider === "Ausgrid" ? "default" : "outline"}
                size="sm"
                onClick={() => handleProviderChange("Ausgrid")}
              >
                Ausgrid
              </Button>
              <Button
                variant={selectedProvider === "Endeavour" ? "default" : "outline"}
                size="sm"
                onClick={() => handleProviderChange("Endeavour")}
              >
                Endeavour
              </Button>
            </div>
          </div>
        </div>

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

        <OutageStats outages={getCurrentOutages()} outageType={outageType} />

        <Tabs defaultValue="unplanned" onValueChange={(value) => setOutageType(value as OutageType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="unplanned">Unplanned Outages</TabsTrigger>
            <TabsTrigger value="planned">Current Planned</TabsTrigger>
            <TabsTrigger value="future">Future Planned</TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle>Outage Map</CardTitle>
                    <CardDescription>
                      {outageType === "unplanned" && "Current unplanned outages by area/suburb"}
                      {outageType === "planned" && "Current planned outages by affected streets"}
                      {outageType === "future" && `Planned outages for ${date ? format(date, "PPP") : "selected date"}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Map outages={getCurrentOutages()} outageType={outageType} searchLocation={searchLocation} />
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle>Outage List</CardTitle>
                    <CardDescription>
                      {loading ? "Loading outages..." : `${getCurrentOutages().length} outages found`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {error ? (
                      <div className="p-4 text-red-500 bg-red-50 rounded-md">{error}</div>
                    ) : (
                      <OutageList outages={getCurrentOutages()} outageType={outageType} />
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </Tabs>
      </div>

      {/* Street Debug Panel */}
      <StreetDebug outages={getCurrentOutages()} outageType={outageType} />

      <footer className="bg-gray-100 p-4 border-t">
        <div className="container mx-auto text-center text-sm text-gray-500">
          <p>GridAlert &copy; {new Date().getFullYear()} - Real-time power outage monitoring</p>
        </div>
      </footer>
    </div>
  )
}

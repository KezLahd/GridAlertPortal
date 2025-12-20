"use client"

import type React from "react"

import { format, parseISO } from "date-fns"
import { AlertTriangle, Clock, MapPin, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useEffect, useRef, useState } from "react"

interface OutageListProps {
  outages: any[]
  outageType: "unplanned" | "planned" | "future"
  aggregatedOutages?: any[]
  compact?: boolean
  noPadding?: boolean
  onOutageClick?: (outage: any) => void
}

const providerColors: Record<string, string> = {
  Ausgrid: "bg-blue-100 text-blue-800",
  Endeavour: "bg-green-100 text-green-800",
  // Light blue base with lime green text for Energex
  Energex: "bg-cyan-100 text-lime-700 border-lime-200",
  // Maroon tones for Ergon
  Ergon: "bg-red-100 text-red-800",
  // Orange for SA Power Networks
  "SA Power": "bg-orange-100 text-orange-800",
  // Medium brown for Horizon Power
  "Horizon Power": "bg-amber-100 text-amber-900",
  // Dark orange and black for WPower
  WPower: "bg-amber-200 text-black",
  // Navy/green mix from AusNet badge (stronger foreground green)
  AusNet: "bg-emerald-50 text-emerald-900 border-emerald-200",
  // Blue base with bright red text for CitiPowerCor
  CitiPowerCor: "bg-blue-50 text-red-700 border-blue-200",
  // Orange base with bright blue text for Essential Energy
  "Essential Energy": "bg-orange-50 text-blue-700 border-orange-200",
  // Cool blues with navy text for Jemena
  Jemena: "bg-cyan-50 text-indigo-900 border-cyan-200",
  // Purple colorway for UnitedEnergy
  UnitedEnergy: "bg-purple-100 text-purple-800 border-purple-200",
  // Pale pink with darker pink text for TasNetworks
  TasNetworks: "bg-pink-100 text-pink-700 border-pink-200",
}

// Aggregate outages by incident_id only to avoid duplicate rows.
// - Group key: incident_id || webid || id (combines all suburbs/streets for same incident)
// - Sum customers_affected, combine suburbs and streets with commas
export function aggregateOutages(outages: any[]) {
  const map = new Map<string, any>()

  for (const outage of outages) {
    const incident = outage.incident_id ?? outage.webid ?? outage.id
    if (!incident) continue // Skip if no incident ID
    const key = String(incident)

    if (!map.has(key)) {
      // First occurrence - initialize with arrays for suburbs and streets
      map.set(key, {
        ...outage,
        _suburbs: new Set<string>(),
        _streets: new Set<string>(),
        _allOutages: [outage] // Store all outages for reference (map will use this)
      })
      // Add initial suburb and streets
      if (outage.area_suburb) {
        map.get(key)._suburbs.add(outage.area_suburb)
      }
      if (outage.streets_affected) {
        const streets = String(outage.streets_affected).split(",").map((s: string) => s.trim()).filter(Boolean)
        streets.forEach((street: string) => map.get(key)._streets.add(street))
      }
      continue
    }

    const existing = map.get(key)
    existing._allOutages.push(outage) // Keep track of all outages with this incident_id

    // Add suburb if it exists and is unique
    if (outage.area_suburb) {
      existing._suburbs.add(outage.area_suburb)
    }

    // Add streets if they exist
    if (outage.streets_affected) {
      const streets = String(outage.streets_affected).split(",").map((s: string) => s.trim()).filter(Boolean)
      streets.forEach((street: string) => existing._streets.add(street))
    }

    // Sum customers_affected when numeric
    const toNumber = (val: any) => {
      if (typeof val === 'number') return val
      const n = Number.parseInt(String(val))
      return Number.isNaN(n) ? 0 : n
    }
    const existingCustomers = toNumber(existing.customers_affected)
    const incomingCustomers = toNumber(outage.customers_affected)
    const summed = existingCustomers + incomingCustomers
    existing.customers_affected = summed || existing.customers_affected || outage.customers_affected
  }

  // Convert sets to comma-separated strings and clean up
  return Array.from(map.values()).map((outage) => {
    // Combine suburbs with commas
    const suburbsArray = Array.from(outage._suburbs).filter(Boolean)
    outage.area_suburb = suburbsArray.length > 0 ? suburbsArray.join(", ") : outage.area_suburb

    // Combine streets with commas
    const streetsArray = Array.from(outage._streets).filter(Boolean)
    outage.streets_affected = streetsArray.length > 0 ? streetsArray.join(", ") : (outage.streets_affected || "")

    // Keep first lat/lng for map navigation (but map will show all points)
    if (outage._allOutages && outage._allOutages.length > 0) {
      const firstOutage = outage._allOutages[0]
      // Keep the first outage's coordinates for navigation purposes
      if (!outage.latitude && firstOutage.latitude) outage.latitude = firstOutage.latitude
      if (!outage.longitude && firstOutage.longitude) outage.longitude = firstOutage.longitude
    }

    // Remove temporary properties
    delete outage._suburbs
    delete outage._streets
    delete outage._allOutages

    return outage
  })
}

export default function OutageList({
  outages,
  outageType,
  aggregatedOutages,
  compact = false,
  noPadding = false,
  onOutageClick,
}: OutageListProps) {
  const aggregated = aggregatedOutages ?? aggregateOutages(outages)
  
  // Sort outages by state (NSW, QLD, VIC, SA, WA, TAS) then by provider alphabetically
  const stateOrder = ["NSW", "QLD", "VIC", "SA", "WA", "TAS"]
  // Provider to state mapping for fallback
  const providerStateMap: Record<string, string> = {
    Ausgrid: "NSW",
    Endeavour: "NSW",
    "Essential Energy": "NSW",
    Energex: "QLD",
    Ergon: "QLD",
    AusNet: "VIC",
    CitiPowerCor: "VIC",
    Jemena: "VIC",
    UnitedEnergy: "VIC",
    "SA Power": "SA",
    "Horizon Power": "WA",
    WPower: "WA",
    TasNetworks: "TAS",
  }
  
  const sortedAggregated = [...aggregated].sort((a, b) => {
    // Get state, fallback to provider's default state if not available
    const stateA = (a.state || providerStateMap[a.provider] || "").toUpperCase()
    const stateB = (b.state || providerStateMap[b.provider] || "").toUpperCase()
    const indexA = stateOrder.indexOf(stateA)
    const indexB = stateOrder.indexOf(stateB)
    
    // If both states are in the order, sort by state order
    if (indexA !== -1 && indexB !== -1) {
      if (indexA !== indexB) {
        return indexA - indexB
      }
    } else if (indexA !== -1) {
      return -1 // stateA comes first
    } else if (indexB !== -1) {
      return 1 // stateB comes first
    } else if (stateA !== stateB) {
      // If neither is in the order, sort alphabetically
      return stateA.localeCompare(stateB)
    }
    
    // If states are the same, sort by provider alphabetically
    const providerA = (a.provider || "").toLowerCase()
    const providerB = (b.provider || "").toLowerCase()
    return providerA.localeCompare(providerB)
  })
  
  const [showTopFade, setShowTopFade] = useState(false)
  const [showBottomFade, setShowBottomFade] = useState(true)
  const [scrollbarWidth, setScrollbarWidth] = useState(0)
  const viewportRef = useRef<HTMLDivElement | null>(null)

  const updateFadeState = (target: HTMLDivElement) => {
    const { scrollTop, scrollHeight, clientHeight } = target
    setShowTopFade(scrollTop > 4)
    setShowBottomFade(scrollTop + clientHeight < scrollHeight - 1)
  }

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    updateFadeState(event.currentTarget)
  }

  useEffect(() => {
    const node = viewportRef.current
    if (!node) return

    const measure = () => {
      const width = node.offsetWidth - node.clientWidth
      setScrollbarWidth(width)
      updateFadeState(node)
    }

    measure()

    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(node)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  if (aggregated.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <AlertTriangle className="h-12 w-12 mb-2 text-muted-foreground/50" />
        <p>No outages found for the selected criteria.</p>
      </div>
    )
  }

  return (
    <div className="relative h-[70vh] w-full rounded-xl overflow-hidden">
      <ScrollArea
        className="h-full w-full"
        viewportRef={viewportRef}
        viewportClassName="relative overflow-x-hidden [scrollbar-gutter:stable]"
        viewportProps={{
          onScrollCapture: handleScroll,
        }}
      >
        <div className={cn("space-y-3 pr-4", noPadding ? "pt-0 pb-8" : "")}>
          {sortedAggregated.map((outage, idx) => {
            const key =
              (outage.incident_id ??
                outage.webid ??
                outage.id ??
                outage.event_id ??
                outage.start_time ??
                outage.area_suburb ??
                "outage") +
              "-" +
              (outage.provider ?? "provider") +
              "-" +
              idx
            return (
              <div
                key={key}
                className={cn(
                  "rounded-lg border border-[#e5e7eb] bg-white hover:bg-gray-50 transition-colors",
                  onOutageClick && "cursor-pointer",
                  noPadding ? "p-2" : "p-3",
                )}
                onClick={() => {
                  if (onOutageClick && (outage.latitude || outage.longitude)) {
                    onOutageClick(outage)
                  }
                }}
              >
                {compact ? (
                  <CompactOutageItem outage={outage} outageType={outageType} />
                ) : outageType === "unplanned" ? (
                  <UnplannedOutageItem outage={outage} />
                ) : (
                  <PlannedOutageItem outage={outage} isFuture={outageType === "future"} />
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
      {showTopFade && (
        <div
          className="pointer-events-none absolute left-0 top-0 h-8 rounded-t-xl bg-gradient-to-b from-black/10 to-transparent transition-opacity duration-300"
          style={{ right: scrollbarWidth }}
        />
      )}
      {showBottomFade && (
        <div
          className="pointer-events-none absolute left-0 bottom-0 h-8 rounded-b-xl bg-gradient-to-t from-black/10 to-transparent transition-opacity duration-300"
          style={{ right: scrollbarWidth }}
        />
      )}
    </div>
  )
}

function UnplannedOutageItem({ outage }: { outage: any }) {
  // Format dates safely
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "PPp")
    } catch (e) {
      return dateString
    }
  }

  // Determine badge color based on provider
  const providerColor = providerColors[outage.provider] ?? "bg-gray-100 text-gray-800"

  return (
    <>
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-medium">{outage.area_suburb}</h3>
          <p className="text-sm text-muted-foreground">{outage.statusheading}</p>
        </div>
        <Badge className={cn(providerColor, "text-center")} variant="outline">
          {outage.provider || "Unknown"}
        </Badge>
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>Cause: {outage.cause}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>Affected customers: {outage.customers_affected}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>Est. restoration: {formatDate(outage.estimated_finish_time)}</span>
        </div>
        <div className="mt-2">
          <Badge variant="outline">{outage.status === "2" ? "Active" : outage.status}</Badge>
        </div>
      </div>
    </>
  )
}

function PlannedOutageItem({ outage, isFuture }: { outage: any; isFuture: boolean }) {
  // Format dates safely
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "PPp")
    } catch (e) {
      return dateString
    }
  }

  // Determine badge color based on provider
  const providerColor = providerColors[outage.provider] ?? "bg-gray-100 text-gray-800"

  return (
    <>
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium">{outage.area_suburb}</h3>
        <Badge className={cn(providerColor, "text-center")} variant="outline">
          {outage.provider || "Unknown"}
        </Badge>
      </div>

      <div className="space-y-1 text-sm">
        <p className="text-muted-foreground line-clamp-2">{outage.streets_affected || "No streets specified"}</p>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>
            {formatDate(outage.start_date_time)} - {formatDate(outage.end_date_time)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>Affected customers: {outage.customers_affected}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="outline">{outage.status}</Badge>
          {outage.details && <Badge variant="outline">{outage.details}</Badge>}
        </div>
      </div>
    </>
  )
}

function CompactOutageItem({ outage, outageType }: { outage: any; outageType: "unplanned" | "planned" | "future" }) {
  const providerColor = providerColors[outage.provider] ?? "bg-gray-100 text-gray-800"
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <h3 className="font-semibold text-[#1f1f22]">{outage.area_suburb}</h3>
        </div>
        <Badge className={cn(providerColor, "text-center")} variant="outline">
          {outage.provider || "Unknown"}
        </Badge>
      </div>
      <div className="text-sm text-muted-foreground">Affected customers: {outage.customers_affected ?? "N/A"}</div>
    </div>
  )
}

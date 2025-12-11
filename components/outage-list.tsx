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
}

const providerColors: Record<string, string> = {
  Ausgrid: "bg-blue-100 text-blue-800",
  Endeavour: "bg-green-100 text-green-800",
  // Light blue with a green tinge to align with Energex branding
  Energex: "bg-cyan-100 text-teal-800",
  // Maroon tones for Ergon
  Ergon: "bg-red-100 text-red-800",
  // Orange for SA Power Networks
  "SA Power": "bg-orange-100 text-orange-800",
}

// Aggregate outages by incident (and suburb) to avoid duplicate rows.
// - Group key: incident_id || webid || id + area_suburb (so different suburbs stay separate).
// - Sum customers_affected (numeric only) and merge streets_affected.
export function aggregateOutages(outages: any[]) {
  const map = new Map<string, any>()

  for (const outage of outages) {
    const incident = outage.incident_id ?? outage.webid ?? outage.id
    const suburb = outage.area_suburb ?? ""
    const key = `${incident}__${suburb}`

    if (!map.has(key)) {
      map.set(key, { ...outage })
      continue
    }

    const existing = map.get(key)

    // Sum customers_affected when numeric
    const toNumber = (val: any) => {
      const n = Number.parseInt(val as string)
      return Number.isNaN(n) ? 0 : n
    }
    const existingCustomers = toNumber(existing.customers_affected)
    const incomingCustomers = toNumber(outage.customers_affected)
    const summed = existingCustomers + incomingCustomers
    existing.customers_affected = summed || existing.customers_affected || outage.customers_affected

    // Merge streets_affected, keep unique tokens
    const existingStreets = (existing.streets_affected ?? "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean)
    const incomingStreets = (outage.streets_affected ?? "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean)
    const mergedStreets = Array.from(new Set([...existingStreets, ...incomingStreets])).filter(Boolean)
    existing.streets_affected = mergedStreets.join(", ")

    map.set(key, existing)
  }

  return Array.from(map.values())
}

export default function OutageList({ outages, outageType, aggregatedOutages, compact = false, noPadding = false }: OutageListProps) {
  const aggregated = aggregatedOutages ?? aggregateOutages(outages)
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
          {aggregated.map((outage, idx) => {
            const key =
              (outage.incident_id ?? outage.webid ?? outage.id ?? outage.event_id ?? outage.start_time ?? outage.area_suburb ?? "outage") +
              "-" +
              (outage.provider ?? "provider") +
              "-" +
              idx
            return (
            <div
              key={key}
              className={cn(
                "rounded-lg border border-[#e5e7eb] bg-white hover:bg-gray-50 transition-colors",
                noPadding ? "p-2" : "p-3"
              )}
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
        <div className="flex gap-2">
          <Badge variant="destructive">Unplanned</Badge>
          <Badge className={providerColor} variant="outline">
            {outage.provider || "Unknown"}
          </Badge>
        </div>
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
        <div className="flex gap-2">
          <Badge variant={isFuture ? "secondary" : "outline"} className={isFuture ? "" : "border-[#FF7134] text-[#FF7134]"}>
            {isFuture ? "Future" : "Current"}
          </Badge>
          <Badge className={providerColor} variant="outline">
            {outage.provider || "Unknown"}
          </Badge>
        </div>
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
  const typeLabel = outageType === "unplanned" ? "Unplanned" : "Planned"
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <h3 className="font-semibold text-[#1f1f22]">{outage.area_suburb}</h3>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">{typeLabel}</Badge>
          <Badge className={providerColor} variant="outline">
            {outage.provider || "Unknown"}
          </Badge>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        Affected customers: {outage.customers_affected ?? "N/A"}
      </div>
    </div>
  )
}

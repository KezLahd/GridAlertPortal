import { format, parseISO } from "date-fns"
import { AlertTriangle, Clock, MapPin, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface OutageListProps {
  outages: any[]
  outageType: "unplanned" | "planned" | "future"
}

export default function OutageList({ outages, outageType }: OutageListProps) {
  if (outages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <AlertTriangle className="h-12 w-12 mb-2 text-muted-foreground/50" />
        <p>No outages found for the selected criteria.</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[60vh] pr-4">
      <div className="space-y-4">
        {outages.map((outage) => (
          <div key={outage.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
            {outageType === "unplanned" ? (
              <UnplannedOutageItem outage={outage} />
            ) : (
              <PlannedOutageItem outage={outage} isFuture={outageType === "future"} />
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
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
  const providerColor = outage.provider === "Ausgrid" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"

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
  const providerColor = outage.provider === "Ausgrid" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"

  return (
    <>
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium">{outage.area_suburb}</h3>
        <div className="flex gap-2">
          <Badge variant={isFuture ? "secondary" : "warning"}>{isFuture ? "Future" : "Current"}</Badge>
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

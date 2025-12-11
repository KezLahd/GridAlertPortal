import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Clock, Users, Zap } from "lucide-react"
import { parseISO } from "date-fns"

interface OutageStatsProps {
  outages: any[]
  outageType: "unplanned" | "planned" | "future"
}

export default function OutageStats({ outages, outageType }: OutageStatsProps) {
  // Calculate statistics based on outage type
  const calculateStats = () => {
    if (outageType === "unplanned") {
      // Convert string customers_affected to numbers where possible
      const totalAffected = outages.reduce((sum, outage) => {
        const count = Number.parseInt(outage.customers_affected as string)
        return sum + (isNaN(count) ? 0 : count)
      }, 0)

      // Calculate average restoration time in hours
      const avgRestorationTime =
        outages.length > 0
          ? outages.reduce((sum, outage) => {
              try {
                const estTime = parseISO(outage.estimated_finish_time).getTime()
                const startTime = parseISO(outage.start_time).getTime()
                return sum + (estTime - startTime) / (1000 * 60 * 60) // Convert to hours
              } catch (e) {
                return sum
              }
            }, 0) / outages.length
          : 0

      return {
        totalOutages: outages.length,
        totalAffected,
        avgRestorationTime: avgRestorationTime.toFixed(1),
        activeAreas: new Set(outages.map((o) => o.area_suburb)).size,
      }
    } else {
      // For planned outages
      const uniqueStreets = new Set()
      let totalDuration = 0

      outages.forEach((outage) => {
        // Add each street to the set if streets_affected exists
        if (outage.streets_affected) {
          const streets = outage.streets_affected.split(",").map((s: string) => s.trim())
          streets.forEach((street: string) => uniqueStreets.add(street))
        }

        // Calculate duration in hours
        try {
          const startTime = parseISO(outage.start_date_time).getTime()
          const endTime = parseISO(outage.end_date_time).getTime()
          totalDuration += (endTime - startTime) / (1000 * 60 * 60)
        } catch (e) {
          // Skip if dates can't be parsed
        }
      })

      // Convert string customers_affected to numbers where possible
      const totalAffected = outages.reduce((sum, outage) => {
        const count = Number.parseInt(outage.customers_affected as string)
        return sum + (isNaN(count) ? 0 : count)
      }, 0)

      return {
        totalOutages: outages.length,
        affectedStreets: uniqueStreets.size,
        avgDuration: outages.length > 0 ? (totalDuration / outages.length).toFixed(1) : 0,
        totalDuration: totalDuration.toFixed(1),
        totalAffected,
      }
    }
  }

  const stats = calculateStats()

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Outages</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalOutages}</div>
          <p className="text-xs text-muted-foreground">
            {outageType === "unplanned" ? "Unplanned incidents" : "Planned maintenance"}
          </p>
        </CardContent>
      </Card>

      {outageType === "unplanned" ? (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Affected Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAffected.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Customers without power</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Restoration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgRestorationTime}h</div>
              <p className="text-xs text-muted-foreground">Average time to restore</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Affected Areas</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeAreas}</div>
              <p className="text-xs text-muted-foreground">Suburbs/areas affected</p>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Affected Streets</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.affectedStreets}</div>
              <p className="text-xs text-muted-foreground">Streets with maintenance</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Affected Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAffected.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Customers affected</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgDuration}h</div>
              <p className="text-xs text-muted-foreground">Average outage duration</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

import { AlertTriangle, Clock, Users, Zap, ZapOff, MapPinned } from "lucide-react"
import { parseISO } from "date-fns"
import { SummaryCard } from "@/components/summary-card"
import { aggregateOutages } from "@/components/outage-list"

interface OutageStatsProps {
  outages: any[]
  outageType: "unplanned" | "planned" | "future"
}

export default function OutageStats({ outages, outageType }: OutageStatsProps) {
  const aggregatedOutages = aggregateOutages(outages)

  const sumUniqueCustomers = (items: any[]) => {
    const seen = new Set<string>()
    return items.reduce((sum, outage) => {
      const key = outage.incident_id ?? outage.webid ?? outage.id
      if (!key || seen.has(key)) return sum
      seen.add(key)
      const count = Number.parseInt(outage.customers_affected as string)
      return sum + (isNaN(count) ? 0 : count)
    }, 0)
  }

  const formatHours = (hours: number) => {
    if (hours >= 24) {
      const days = Math.floor(hours / 24)
      const remaining = hours - days * 24
      const roundedHours = Math.round(remaining)
      return `${days}d ${roundedHours}h`
    }
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    return `${wholeHours}h ${minutes}m`
  }

  // Calculate statistics based on outage type
  const calculateStats = () => {
    if (outageType === "unplanned") {
      const uniqueIncidents = new Set(outages.map((o) => o.incident_id ?? o.webid ?? o.id)).size
      const totalAffectedUnplanned = sumUniqueCustomers(outages)

      // Calculate average restoration time in hours, filtering bad data (<=0 or >30 days)
      const restorationDurations: number[] = []
      outages.forEach((outage) => {
        try {
          const estTime = parseISO(outage.estimated_finish_time).getTime()
          const startTime = parseISO(outage.start_time).getTime()
          const durationHours = (estTime - startTime) / (1000 * 60 * 60)
          if (Number.isFinite(durationHours) && durationHours > 0 && durationHours <= 24 * 30) {
            restorationDurations.push(durationHours)
          }
        } catch (e) {
          // skip bad dates
        }
      })

      const avgRestorationTime =
        restorationDurations.length > 0
          ? restorationDurations.reduce((sum, d) => sum + d, 0) / restorationDurations.length
          : 0

      return {
        totalOutages: aggregatedOutages.length || uniqueIncidents || outages.length,
        totalAffected: totalAffectedUnplanned,
        avgRestorationTime,
        activeAreas: new Set(outages.map((o) => o.area_suburb)).size,
      }
    } else {
      const uniqueIncidents = new Set(outages.map((o) => o.incident_id ?? o.webid ?? o.id)).size
      // For planned outages
      const uniqueStreets = new Set()
      const durations: number[] = []
      const totalAffectedPlanned = sumUniqueCustomers(outages)

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
          const durationHours = (endTime - startTime) / (1000 * 60 * 60)
          // Guard against bad data: skip negative or absurdly long durations (> 30 days)
          if (Number.isFinite(durationHours) && durationHours > 0 && durationHours <= 24 * 30) {
            durations.push(durationHours)
          }
        } catch (e) {
          // Skip if dates can't be parsed
        }
      })

      // Convert string customers_affected to numbers where possible
      const totalAffected = outages.reduce((sum, outage) => {
        const count = Number.parseInt(outage.customers_affected as string)
        return sum + (isNaN(count) ? 0 : count)
      }, 0)

      const totalDuration = durations.reduce((sum, val) => sum + val, 0)
      const avgDurationHours = durations.length > 0 ? totalDuration / durations.length : 0

      return {
        totalOutages: aggregatedOutages.length || uniqueIncidents || outages.length,
        affectedStreets: uniqueStreets.size,
        avgDuration: avgDurationHours,
        totalDuration: totalDuration.toFixed(1),
        totalAffected: totalAffectedPlanned,
      }
    }
  }

  const stats = calculateStats()

  return (
    <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
      <SummaryCard
        title="Total Outages"
        value={stats.totalOutages ?? 0}
        icon={AlertTriangle}
      />

      {outageType === "unplanned" ? (
        <>
          <SummaryCard
            title="Affected Customers"
            value={stats.totalAffected.toLocaleString()}
            icon={Users}
          />
          <SummaryCard
            title="Avg. Restoration"
            value={formatHours(stats.avgRestorationTime ?? 0)}
            icon={Clock}
          />
          <SummaryCard
            title="Affected Areas"
            value={stats.activeAreas ?? 0}
            icon={MapPinned}
          />
        </>
      ) : (
        <>
          <SummaryCard
            title="Affected Streets"
            value={stats.affectedStreets ?? 0}
            icon={ZapOff}
          />
          <SummaryCard
            title="Affected Customers"
            value={stats.totalAffected.toLocaleString()}
            icon={Users}
          />
          <SummaryCard
            title="Avg. Duration"
            value={formatHours(stats.avgDuration ?? 0)}
            icon={Clock}
          />
        </>
      )}
    </div>
  )
}

import { Circle } from "lucide-react"

interface MapLegendProps {
  outageType: "unplanned" | "planned" | "future"
  zoomLevel: number
}

export default function MapLegend({ outageType, zoomLevel }: MapLegendProps) {
  return (
    <div className="absolute bottom-4 left-4 bg-white p-3 rounded-md shadow-md z-10 text-sm">
      <h4 className="font-medium mb-2">Map Legend</h4>
      <div className="space-y-2">
        {outageType === "unplanned" && (
          <div className="flex items-center gap-2">
            <Circle className="h-4 w-4 text-red-500 fill-red-500 opacity-70" />
            <span>Unplanned Outage (Suburb)</span>
          </div>
        )}

        {(outageType === "planned" || outageType === "future") && (
          <div className="flex items-center gap-2">
            <Circle
              className={`h-4 w-4 ${outageType === "planned" ? "text-orange-500 fill-orange-500" : "text-blue-500 fill-blue-500"} opacity-70`}
            />
            <span>{outageType === "planned" ? "Planned" : "Future"} Outage Location</span>
          </div>
        )}
      </div>
    </div>
  )
}

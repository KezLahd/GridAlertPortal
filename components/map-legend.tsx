import { Circle, MapPin } from "lucide-react"

interface MapLegendProps {
  outageType: "unplanned" | "planned" | "future"
  zoomLevel: number
  showPoiMarkers?: boolean
  showPolygons?: boolean
}

export default function MapLegend({ outageType, zoomLevel, showPoiMarkers = false, showPolygons = false }: MapLegendProps) {
  return (
    <div className="absolute bottom-4 left-4 bg-white p-3 rounded-md shadow-md z-10 text-sm">
      <h4 className="font-medium mb-2">Map Legend</h4>
      <div className="space-y-2">
        {outageType === "unplanned" && (
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id={`multiColorGradient-${outageType}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#EF4444" />
                  <stop offset="50%" stopColor="#F97316" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
              <path
                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                fill={`url(#multiColorGradient-${outageType})`}
              />
            </svg>
            <span>Unplanned Outage</span>
          </div>
        )}

        {(outageType === "planned" || outageType === "future") && (
          <div className="flex items-center gap-2">
            <MapPin
              className={`h-4 w-4 ${outageType === "planned" ? "text-orange-500 fill-orange-500" : "text-blue-500 fill-blue-500"}`}
            />
            <span>{outageType === "planned" ? "Planned" : "Future"} Outage</span>
          </div>
        )}

        {showPoiMarkers && (
          <div className="flex items-center gap-2">
            <Circle className="h-4 w-4 text-red-500 fill-red-500" />
            <span>Clinic (POI)</span>
          </div>
        )}

        {showPolygons && (
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 2L22 8.5L18 21H6L2 8.5L12 2Z"
                stroke={outageType === "unplanned" ? "#EF4444" : outageType === "planned" ? "#F97316" : "#3B82F6"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity="0.7"
                fill={outageType === "unplanned" ? "#EF4444" : outageType === "planned" ? "#F97316" : "#3B82F6"}
                fillOpacity="0.25"
              />
            </svg>
            <span>Polygon Area</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <img src="/company_location.svg" alt="Company" className="h-4 w-4" />
          <span>Company Location</span>
        </div>
      </div>
    </div>
  )
}

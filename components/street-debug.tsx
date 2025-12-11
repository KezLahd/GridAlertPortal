"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface StreetDebugProps {
  outages: any[]
  outageType: "unplanned" | "planned" | "future"
}

export default function StreetDebug({ outages, outageType }: StreetDebugProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedOutage, setExpandedOutage] = useState<number | null>(null)

  // Only show for planned or future outages
  if (outageType === "unplanned") return null

  const plannedOutages = outages.filter((outage) => outage.streets_affected)

  if (plannedOutages.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button variant="outline" size="sm" className="bg-white shadow-md" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? "Hide Street Debug" : "Show Street Debug"}
      </Button>

      {isOpen && (
        <Card className="mt-2 w-[500px] max-h-[500px] overflow-auto shadow-lg">
          <CardHeader className="py-2">
            <CardTitle className="text-sm">Streets Debug</CardTitle>
          </CardHeader>
          <CardContent className="p-2 text-xs">
            <div className="space-y-4">
              {plannedOutages.map((outage) => {
                const streets = outage.streets_affected
                  ? outage.streets_affected
                      .split(",")
                      .map((s: string) => s.trim())
                      .filter((s: string) => s.length > 0)
                  : []

                const isExpanded = expandedOutage === outage.id

                return (
                  <div key={outage.id} className="border p-2 rounded">
                    <div
                      className="font-medium cursor-pointer flex justify-between items-center"
                      onClick={() => setExpandedOutage(isExpanded ? null : outage.id)}
                    >
                      <span>
                        Outage #{outage.id} - {outage.area_suburb}
                      </span>
                      <span>{isExpanded ? "▲" : "▼"}</span>
                    </div>

                    <div className="mt-1">
                      <Badge variant="outline" className="mr-1">
                        {streets.length} streets
                      </Badge>
                    </div>

                    {isExpanded && streets.length > 0 && (
                      <div className="mt-2 space-y-2">
                        <div className="bg-gray-100 p-2 rounded">
                          <div className="font-medium">Streets Affected:</div>
                          <ul className="list-disc pl-5 mt-1">
                            {streets.map((street, idx) => (
                              <li key={idx}>{street}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Each street will be geocoded to find its midpoint, then highlighted with a 1km line.
                        </div>
                      </div>
                    )}

                    {isExpanded && streets.length === 0 && (
                      <div className="mt-2 p-2 bg-red-50 text-red-500 rounded">
                        No streets specified for this outage
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

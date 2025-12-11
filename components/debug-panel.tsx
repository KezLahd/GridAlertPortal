"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface DebugPanelProps {
  outages: any[]
  outageType: "unplanned" | "planned" | "future"
  debugMode?: boolean
  toggleDebugMode?: () => void
}

export default function DebugPanel({ outages, outageType, debugMode = false, toggleDebugMode }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedOutage, setSelectedOutage] = useState<number | null>(null)

  // Only show for planned or future outages
  if (outageType === "unplanned") return null

  const plannedOutages = outages.filter((outage) => outage.streets_affected)

  if (plannedOutages.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button variant="outline" size="sm" className="bg-white shadow-md" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? "Hide Debug" : "Show Debug"}
      </Button>

      {isOpen && (
        <Card className="mt-2 w-96 max-h-96 overflow-auto shadow-lg">
          <CardHeader className="py-2">
            <CardTitle className="text-sm">Street Coordinates Debug</CardTitle>
          </CardHeader>
          <CardContent className="p-2 text-xs">
            <div className="space-y-2">
              {plannedOutages.map((outage) => (
                <div key={outage.id} className="border-b pb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-left font-normal"
                    onClick={() => setSelectedOutage(selectedOutage === outage.id ? null : outage.id)}
                  >
                    <span>
                      Outage #{outage.id} - {outage.area_suburb}
                    </span>
                    <span>{selectedOutage === outage.id ? "▲" : "▼"}</span>
                  </Button>

                  {selectedOutage === outage.id && (
                    <div className="mt-2 pl-2">
                      <p>
                        <strong>Streets:</strong> {outage.streets_affected}
                      </p>
                      <p className="mt-1">
                        <strong>Has Coordinates:</strong> {outage.street_coordinates ? "Yes" : "No"}
                      </p>
                      {outage.street_coordinates && (
                        <>
                          <p className="mt-1">
                            <strong>Coordinates Type:</strong> {typeof outage.street_coordinates}
                          </p>
                          <pre className="mt-1 bg-gray-100 p-2 rounded text-[10px] overflow-auto max-h-40">
                            {typeof outage.street_coordinates === "string"
                              ? outage.street_coordinates
                              : JSON.stringify(outage.street_coordinates, null, 2)}
                          </pre>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

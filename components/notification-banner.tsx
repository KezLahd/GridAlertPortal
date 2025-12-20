"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface NotificationBannerProps {
  outageType: "unplanned" | "planned" | "future"
  outages: any[]
  previousIncidentIds: Set<string>
}

export default function NotificationBanner({ outageType, outages, previousIncidentIds }: NotificationBannerProps) {
  const [visible, setVisible] = useState(false)
  const [newOutagesCount, setNewOutagesCount] = useState(0)
  const [restoredOutagesCount, setRestoredOutagesCount] = useState(0)

  useEffect(() => {
    // Only show notification if we have previous data to compare
    if (previousIncidentIds.size === 0) {
      setVisible(false)
      return
    }

    // Get current incident IDs
    const currentIds = new Set(
      outages.map((outage) => {
        return String(outage.incident_id || outage.webid || outage.id || outage.event_id || outage.outage_id || "")
      }).filter((id) => id !== "")
    )

    // Find new outages (in current but not in previous)
    const newIds = new Set([...currentIds].filter((id) => !previousIncidentIds.has(id)))
    
    // Find restored outages (in previous but not in current)
    const restoredIds = new Set([...previousIncidentIds].filter((id) => !currentIds.has(id)))

    const newCount = newIds.size
    const restoredCount = restoredIds.size

    if (newCount > 0 || restoredCount > 0) {
      setNewOutagesCount(newCount)
      setRestoredOutagesCount(restoredCount)
      setVisible(true)
    } else {
      setVisible(false)
    }
  }, [outages, previousIncidentIds])

  if (!visible) return null

  const outageTypeLabel = outageType === "unplanned" ? "unplanned" : outageType === "planned" ? "planned" : "future planned"

  return (
    <Alert variant="destructive" className="mb-4 animate-in fade-in slide-in-from-top duration-300">
      <AlertTitle className="flex items-center justify-between">
        Outage Updates
        <Button variant="ghost" size="icon" onClick={() => setVisible(false)} className="h-6 w-6">
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription>
        {newOutagesCount > 0 && (
          <div>
            <strong>{newOutagesCount}</strong> new {outageTypeLabel} outage{newOutagesCount > 1 ? "s" : ""} detected.
          </div>
        )}
        {restoredOutagesCount > 0 && (
          <div className={newOutagesCount > 0 ? "mt-1" : ""}>
            <strong>{restoredOutagesCount}</strong> {outageTypeLabel} outage{restoredOutagesCount > 1 ? "s" : ""} {restoredOutagesCount === 1 ? "has" : "have"} been restored.
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}

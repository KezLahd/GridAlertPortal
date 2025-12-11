"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface NotificationBannerProps {
  outageType: "unplanned" | "planned" | "future"
  outages: any[]
  previousOutagesCount: number
}

export default function NotificationBanner({ outageType, outages, previousOutagesCount }: NotificationBannerProps) {
  const [visible, setVisible] = useState(false)
  const [newOutagesCount, setNewOutagesCount] = useState(0)

  useEffect(() => {
    // Only show notification if there are new outages
    const currentCount = outages.length
    if (previousOutagesCount > 0 && currentCount > previousOutagesCount) {
      setNewOutagesCount(currentCount - previousOutagesCount)
      setVisible(true)
    }
  }, [outages, previousOutagesCount])

  if (!visible) return null

  return (
    <Alert variant="destructive" className="mb-4 animate-in fade-in slide-in-from-top duration-300">
      <AlertTitle className="flex items-center justify-between">
        New Outages Detected
        <Button variant="ghost" size="icon" onClick={() => setVisible(false)} className="h-6 w-6">
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription>
        {newOutagesCount} new {outageType === "unplanned" ? "unplanned" : "planned"} outage
        {newOutagesCount > 1 ? "s" : ""} detected in your area. Please check the map for details.
      </AlertDescription>
    </Alert>
  )
}

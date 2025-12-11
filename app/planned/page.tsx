"use client"

import { Suspense } from "react"
import GridAlertApp from "@/components/grid-alert-app"
import LoadingMap from "@/components/loading-map"

export default function PlannedPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <Suspense fallback={<LoadingMap />}>
        <GridAlertApp initialOutageType="planned" />
      </Suspense>
    </main>
  )
}

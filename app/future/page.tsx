"use client"

import { Suspense } from "react"
import GridAlertApp from "@/components/grid-alert-app"
import LoadingMap from "@/components/loading-map"

export default function FuturePage() {
  return (
    <main className="flex min-h-screen flex-col">
      <Suspense fallback={<LoadingMap />}>
        <GridAlertApp initialOutageType="future" />
      </Suspense>
    </main>
  )
}

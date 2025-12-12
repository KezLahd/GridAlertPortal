"use client"

import { Suspense } from "react"
import GridAlertApp from "@/components/grid-alert-app"
import LoadingMap from "@/components/loading-map"
import { AuthGuard } from "@/components/auth-guard"

export default function UnplannedPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <AuthGuard>
        <Suspense fallback={<LoadingMap />}>
          <GridAlertApp initialOutageType="unplanned" />
        </Suspense>
      </AuthGuard>
    </main>
  )
}

"use client"

import { Suspense } from "react"
import GridAlertApp from "@/components/grid-alert-app"
import LoadingMap from "@/components/loading-map"
import { AuthGuard } from "@/components/auth-guard"

export default function FuturePage() {
  return (
    <main className="flex min-h-screen flex-col">
      <AuthGuard>
        <Suspense fallback={<LoadingMap />}>
          <GridAlertApp initialOutageType="future" />
        </Suspense>
      </AuthGuard>
    </main>
  )
}

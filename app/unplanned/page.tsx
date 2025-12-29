"use client"

import GridAlertApp from "@/components/grid-alert-app"
import { AuthGuard } from "@/components/auth-guard"

export const dynamic = 'force-dynamic'

export default function UnplannedPage() {
  return (
    <main className="flex min-h-mobile flex-col">
      <AuthGuard>
        <GridAlertApp initialOutageType="unplanned" />
      </AuthGuard>
    </main>
  )
}

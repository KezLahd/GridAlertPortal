"use client"

import GridAlertApp from "@/components/grid-alert-app"
import { AuthGuard } from "@/components/auth-guard"

export const dynamic = 'force-dynamic'

export default function PlannedPage() {
  return (
    <main className="flex h-screen md:min-h-mobile flex-col md:overflow-visible">
      <AuthGuard>
        <GridAlertApp initialOutageType="planned" />
      </AuthGuard>
    </main>
  )
}

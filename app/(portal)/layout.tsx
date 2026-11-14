"use client"

import "./wattle.css"
import { PortalProvider } from "@/components/wattle/data"
import { Shell } from "@/components/wattle/shell"

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalProvider><Shell>{children}</Shell></PortalProvider>
}

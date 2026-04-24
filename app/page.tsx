"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Landing from "@/components/marketing/landing"

export const dynamic = "force-dynamic"

export default function Home() {
  const router = useRouter()
  // null = checking, true = show landing, false = redirecting to portal
  const [showLanding, setShowLanding] = useState<boolean | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      if (!mounted) return
      if (data?.user) {
        router.replace("/unplanned")
      } else {
        setShowLanding(true)
      }
    })()
    return () => {
      mounted = false
    }
  }, [router])

  // While checking (or redirecting), render nothing — avoids a flash of the
  // landing for signed-in users.
  if (!showLanding) return null

  return <Landing />
}

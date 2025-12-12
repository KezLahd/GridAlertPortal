"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

interface AuthGuardProps {
  children: React.ReactNode
  redirectTo?: string
}

export function AuthGuard({ children, redirectTo = "/login" }: AuthGuardProps) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let mounted = true
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser()
      if (!mounted) return
      if (!data?.user) {
        router.replace(redirectTo)
        return
      }
      setChecking(false)
    }
    checkAuth()
    return () => {
      mounted = false
    }
  }, [redirectTo, router])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Checking authentication…</p>
      </div>
    )
  }

  return <>{children}</>
}


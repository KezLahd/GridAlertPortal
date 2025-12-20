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
  const [checking, setChecking] = useState(false)

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
    // Check auth in background without blocking render
    checkAuth()
    return () => {
      mounted = false
    }
  }, [redirectTo, router])

  // Always render children immediately, auth check happens in background
  return <>{children}</>
}

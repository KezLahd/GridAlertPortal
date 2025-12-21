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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    let mounted = true
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser()
      if (!mounted) return
      if (!data?.user) {
        router.replace(redirectTo)
        return
      }
      setIsAuthenticated(true)
    }
    checkAuth()
    return () => {
      mounted = false
    }
  }, [redirectTo, router])

  // Show nothing until auth check completes
  if (isAuthenticated === null) {
    return null // or a loading spinner
  }

  return <>{children}</>
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const ensureProfileRow = async (userId: string, userEmail: string) => {
    const { data: existing, error: fetchError } = await supabase
      .from("user_profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle()

    if (fetchError) {
      console.error("Profile lookup failed", fetchError)
      return
    }

    if (!existing) {
      const { error: insertError } = await supabase.from("user_profiles").insert({
        user_id: userId,
        email: userEmail,
        first_name: "",
        last_name: "",
        mobile: "",
        role: "member",
        notify_outage_types: ["unplanned", "planned", "future"],
        notify_channels: ["email"],
        notify_providers: ["Ausgrid", "Endeavour", "Energex", "Ergon", "SA Power"],
        region_access: ["NSW", "QLD", "VIC", "SA", "WA", "NT", "ACT", "TAS"],
      })

      if (insertError) {
        console.error("Profile insert failed", insertError)
      }
    }
  }

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message || "Unable to sign in. Please try again.")
      setLoading(false)
      return
    }

    const userId = authData.user?.id
    if (userId) {
      await ensureProfileRow(userId, email)
    }

    router.push("/unplanned")
  }

  return (
    <div className="rounded-xl border bg-white/95 p-6 shadow-lg backdrop-blur">
      <div className="mb-6 space-y-2 text-center">
        <p className="text-3xl font-semibold tracking-tight text-black">GridAlert</p>
        <h1 className="text-2xl font-semibold text-neutral-900">Sign in</h1>
        <p className="text-sm text-neutral-600">Use your company email and password.</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form className="space-y-4" onSubmit={handleLogin}>
        <div className="space-y-2">
          <Label htmlFor="email">Email (username)</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
            </span>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    </div>
  )
}


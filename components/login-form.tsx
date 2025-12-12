"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button, Input } from "@/components/ui/heroui"
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
    <div className="rounded-xl border bg-white p-6 shadow-lg backdrop-blur">
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
        <Input
          label="Email"
          placeholder=" "
          id="email"
          type="email"
          isRequired
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          variant="underlined"
          labelPlacement="inside"
          autoComplete="username"
          className="w-full"
          classNames={{
            base: "bg-transparent",
            mainWrapper: "bg-transparent",
            inputWrapper:
              "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-orange-200 border-x-0 border-t-0 data-[hover=true]:border-b-orange-400 data-[focus=true]:border-b-orange-500 data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-0 data-[focus-visible=true]:ring-offset-0 data-[invalid=true]:border-b-danger-500",
            input: "bg-transparent text-base text-slate-900 placeholder:text-slate-500 caret-orange-500",
            label: "text-slate-700",
          }}
        />
        <Input
          label="Password"
          placeholder=" "
          id="password"
          type="password"
          isRequired
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          variant="underlined"
          labelPlacement="inside"
          autoComplete="current-password"
          className="w-full"
          classNames={{
            base: "bg-transparent",
            mainWrapper: "bg-transparent",
            inputWrapper:
              "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-orange-200 border-x-0 border-t-0 data-[hover=true]:border-b-orange-400 data-[focus=true]:border-b-orange-500 data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-0 data-[focus-visible=true]:ring-offset-0 data-[invalid=true]:border-b-danger-500",
            input: "bg-transparent text-base text-slate-900 placeholder:text-slate-500 caret-orange-500",
            label: "text-slate-700",
          }}
        />
        <Button type="submit" className="w-full" isDisabled={loading} color="primary" variant="solid">
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

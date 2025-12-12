"use client"

import type React from "react"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/heroui"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Eye, EyeOff, ChevronsUpDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

const BACKGROUNDS = ["/animation-1.svg", "/animation-2.svg", "/animation-3.svg", "/animation-4.svg", "/animation-5.svg", "/animation-6.svg"]
const PROVIDERS = [
  { name: "Ausgrid", color: "bg-blue-500" },
  { name: "Endeavour", color: "bg-green-500" },
  { name: "Energex", color: "bg-cyan-500" },
  { name: "Ergon", color: "bg-red-500" },
  { name: "SA Power", color: "bg-orange-500" },
]

const OUTAGE_TYPES = [
  { value: "unplanned", label: "Unplanned" },
  { value: "planned", label: "Current Planned" },
  { value: "future", label: "Future Planned" },
]

const NOTIFICATION_CHANNELS = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
]

function MultiSelect({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string[]
  options: { value: string; label: string }[]
  onChange: (vals: string[]) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const toggle = (v: string) => {
    const next = value.includes(v) ? value.filter((i) => i !== v) : [...value, v]
    onChange(next)
  }

  const display =
    value.length === 0
      ? "None"
      : value.length === options.length
        ? "All"
        : options
            .filter((o) => value.includes(o.value))
            .map((o) => o.label)
            .join(", ")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="bordered"
          className="w-full justify-between rounded-none border-0 border-b-2 border-gray-200 bg-white px-2 py-3 text-sm text-slate-900 shadow-none hover:bg-white focus:border-orange-500 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:border-orange-500 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <span className="truncate">{display}</span>
          <ChevronsUpDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[320px]">
        <Command>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  onSelect={() => toggle(opt.value)}
                  className="flex items-center gap-2 bg-white text-foreground hover:!bg-muted/70 data-[highlighted]:!bg-muted/70 data-[highlighted]:!text-foreground data-[selected]:bg-white data-[selected]:text-foreground"
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border text-[10px]",
                      value.includes(opt.value)
                        ? "border-orange-500 bg-orange-500 text-white"
                        : "border-muted-foreground/30 text-transparent",
                    )}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </div>
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function SetupAccountContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
    mobile: "",
    notify_channels: ["email"] as string[],
    notify_outage_types: OUTAGE_TYPES.map((o) => o.value) as string[],
    notify_providers: [] as string[],
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link")
      setLoading(false)
      return
    }

    // Fetch the pending profile
    fetch(`/api/get-invitation?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          const safeProfile = data.profile || {}
          setProfile(safeProfile)
          setFormData((prev) => ({
            ...prev,
            notify_outage_types: safeProfile.notify_outage_types?.length
              ? safeProfile.notify_outage_types
              : OUTAGE_TYPES.map((o: any) => o.value),
            notify_providers: safeProfile.notify_providers || [],
          }))
        }
        setLoading(false)
      })
      .catch((err) => {
        setError("Failed to load invitation")
        setLoading(false)
      })
  }, [token])

  const toggleChannel = (channel: string) => {
    setFormData((prev) => ({
      ...prev,
      notify_channels: prev.notify_channels.includes(channel)
        ? prev.notify_channels.filter((c) => c !== channel)
        : [...prev.notify_channels, channel],
    }))
  }

  const toggleOutageType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      notify_outage_types: prev.notify_outage_types.includes(type)
        ? prev.notify_outage_types.filter((t) => t !== type)
        : [...prev.notify_outage_types, type],
    }))
  }

  const toggleProvider = (provider: string) => {
    setFormData((prev) => ({
      ...prev,
      notify_providers: prev.notify_providers.includes(provider)
        ? prev.notify_providers.filter((p) => p !== provider)
        : [...prev.notify_providers, provider],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (formData.notify_channels.includes("sms") && !formData.mobile.trim()) {
      setError("Mobile number is required for SMS notifications")
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch("/api/complete-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          ...formData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to complete setup")
        setSubmitting(false)
        return
      }

      setToastMessage("Account setup complete! Redirecting to sign in...")
      setTimeout(() => router.push("/login"), 1200)
    } catch (err: any) {
      setError(err.message || "Failed to complete setup")
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
        <Card className="max-w-md w-full p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">Invalid Invitation</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => router.push("/")}>Go to Homepage</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-svh w-full items-center justify-center bg-[#050505] p-6 md:p-10 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-white/6 to-black/80 mix-blend-screen" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.22)_0%,_rgba(255,255,255,0)_40%)] opacity-60" />
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {BACKGROUNDS.map((src, idx) => (
          <img
            key={src}
            src={src}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-0 animate-[bgCycle_7s_linear_infinite]"
            style={{
              animationDelay: `${idx * 0.3}s`,
              filter:
                "brightness(0) invert(1) drop-shadow(0 0 18px rgba(255,140,0,0.65)) drop-shadow(0 0 42px rgba(255,140,0,0.5))",
            }}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute left-0 right-0 top-6 md:top-10 flex flex-col items-center gap-3 md:gap-6">
        <img
          src="/gridalert-logo.svg"
          alt="GridAlert"
          className="h-24 w-auto md:h-32 drop-shadow-[0_14px_48px_rgba(0,0,0,0.6)]"
        />
        <span className="text-white text-2xl md:text-3xl font-semibold tracking-tight drop-shadow-[0_3px_12px_rgba(0,0,0,0.55)]">
          GridAlert
        </span>
      </div>

      <div className="relative w-full max-w-3xl">
        <Card className="relative w-full border border-white/10 bg-white shadow-2xl p-8 md:p-10">
          <div className="mb-6 md:mb-8 space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Complete Your Account Setup</h1>
            <p className="text-sm md:text-base text-slate-600">
              Welcome, {profile?.first_name || "there"}! Finish your profile to access GridAlert.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">{error}</div>}

            <div className="grid gap-4 md:gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="At least 8 characters"
                    required
                    className="rounded-none border-0 border-b-2 border-gray-200 bg-white px-2 py-3 text-sm text-slate-900 shadow-none hover:bg-white focus:border-orange-500 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:border-orange-500 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirm Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Re-enter your password"
                  required
                  className="rounded-none border-0 border-b-2 border-gray-200 bg-white px-2 py-3 text-sm text-slate-900 shadow-none hover:bg-white focus:border-orange-500 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:border-orange-500 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="mobile">Mobile Number (optional)</Label>
                <Input
                  id="mobile"
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="+61 400 000 000"
                  className="rounded-none border-0 border-b-2 border-gray-200 bg-white px-2 py-3 text-sm text-slate-900 shadow-none hover:bg-white focus:border-orange-500 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:border-orange-500 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            <div className="border-t border-slate-200/70 pt-6 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <Label className="text-sm text-slate-700">Notification Channels</Label>
                <MultiSelect
                  value={formData.notify_channels}
                  options={NOTIFICATION_CHANNELS}
                  onChange={(vals) => setFormData((prev) => ({ ...prev, notify_channels: vals }))}
                  placeholder="Select channels"
                />
              </div>

              <div className="space-y-4">
                <Label className="text-sm text-slate-700">Outage Types to Monitor</Label>
                <MultiSelect
                  value={formData.notify_outage_types}
                  options={OUTAGE_TYPES}
                  onChange={(vals) => setFormData((prev) => ({ ...prev, notify_outage_types: vals }))}
                  placeholder="Select outage types"
                />
              </div>
            </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" isDisabled={submitting} color="primary" variant="solid">
                {submitting ? "Setting up..." : "Complete Setup"}
              </Button>
              <Button type="button" variant="bordered" onClick={() => router.push("/login")} className="flex-1">
                Back to Sign In
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="rounded-lg bg-slate-900 text-white px-4 py-3 shadow-xl border border-white/10">
            {toastMessage}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes bgCycle {
          0% {
            opacity: 0;
            transform: scale(1);
          }
          6% {
            opacity: 0.6;
          }
          12% {
            opacity: 0.8;
            transform: scale(1.006);
          }
          18% {
            opacity: 0;
            transform: scale(1.004);
          }
          100% {
            opacity: 0;
            transform: scale(1.01);
          }
        }
      `}</style>
    </div>
  )
}

export default function SetupAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SetupAccountContent />
    </Suspense>
  )
}

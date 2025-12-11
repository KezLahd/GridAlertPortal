"use client"

import type React from "react"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card } from "@/components/ui/card"
import { Eye, EyeOff } from "lucide-react"

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
    notify_outage_types: [] as string[],
    notify_providers: [] as string[],
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
          setProfile(data.profile)
          setFormData((prev) => ({
            ...prev,
            notify_outage_types: data.profile.notify_outage_types || [],
            notify_providers: data.profile.notify_providers || [],
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

      // Redirect to the main app
      router.push("/unplanned")
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-4">
      <Card className="max-w-2xl w-full p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Complete Your Account Setup</h1>
          <p className="text-gray-600">Welcome, {profile?.first_name}! Complete your profile to access GridAlert.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">{error}</div>}

          <div className="space-y-4">
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number (optional)</Label>
              <Input
                id="mobile"
                type="tel"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="+61 400 000 000"
              />
              <p className="text-sm text-gray-500">Required if you want to receive SMS notifications</p>
            </div>
          </div>

          <div className="border-t pt-6 space-y-6">
            <h3 className="font-semibold text-lg">Notification Preferences</h3>

            <div className="space-y-3">
              <Label>Notification Channels</Label>
              <div className="flex gap-6">
                {NOTIFICATION_CHANNELS.map((channel) => (
                  <div key={channel.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`channel-${channel.value}`}
                      checked={formData.notify_channels.includes(channel.value)}
                      onCheckedChange={() => toggleChannel(channel.value)}
                      className="rounded-[3px]"
                    />
                    <Label htmlFor={`channel-${channel.value}`} className="text-sm font-normal cursor-pointer">
                      {channel.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Outage Types to Monitor</Label>
              <div className="flex gap-6">
                {OUTAGE_TYPES.map((type) => (
                  <div key={type.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`outage-${type.value}`}
                      checked={formData.notify_outage_types.includes(type.value)}
                      onCheckedChange={() => toggleOutageType(type.value)}
                      className="rounded-[3px]"
                    />
                    <Label htmlFor={`outage-${type.value}`} className="text-sm font-normal cursor-pointer">
                      {type.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Energy Providers to Monitor</Label>
              <div className="grid grid-cols-2 gap-3">
                {PROVIDERS.map((provider) => (
                  <div key={provider.name} className="flex items-center gap-2">
                    <Checkbox
                      id={`provider-${provider.name}`}
                      checked={formData.notify_providers.includes(provider.name)}
                      onCheckedChange={() => toggleProvider(provider.name)}
                      className="rounded-[3px]"
                    />
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${provider.color}`} />
                      <Label htmlFor={`provider-${provider.name}`} className="text-sm font-normal cursor-pointer">
                        {provider.name}
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? "Setting up..." : "Complete Setup"}
            </Button>
          </div>
        </form>
      </Card>
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

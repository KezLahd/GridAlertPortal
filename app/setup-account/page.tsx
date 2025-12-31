"use client"

import type React from "react"

import { useEffect, useState, Suspense, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/heroui"
import { DesktopInput } from "@/components/desktop-input"
import { MobileInput } from "@/components/mobile-input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Select, SelectItem, Checkbox } from "@heroui/react"
import { Eye, EyeOff, Check } from "lucide-react"

const BACKGROUNDS = ["/animation-1.svg", "/animation-2.svg", "/animation-3.svg", "/animation-4.svg", "/animation-5.svg", "/animation-6.svg"]
const PROVIDERS = [
  { name: "Ausgrid", color: "bg-blue-500" },
  { name: "Endeavour", color: "bg-green-500" },
  { name: "Energex", color: "bg-cyan-500" },
  { name: "Ergon", color: "bg-red-500" },
  { name: "SA Power", color: "bg-orange-500" },
  { name: "Horizon Power", color: "bg-rose-500" },
  { name: "WPower", color: "bg-amber-500" },
  { name: "AusNet", color: "bg-emerald-500" },
  { name: "CitiPowerCor", color: "bg-blue-500" },
  { name: "Essential Energy", color: "bg-orange-500" },
  { name: "Jemena", color: "bg-cyan-500" },
  { name: "UnitedEnergy", color: "bg-purple-500" },
  { name: "TasNetworks", color: "bg-purple-500" },
]

const OUTAGE_TYPES = [
  { value: "unplanned", label: "Unplanned" },
  { value: "planned", label: "Current Planned" },
  { value: "future", label: "Future Planned" },
]

const OUTAGE_TYPES_MOBILE = [
  { value: "unplanned", label: "Unplanned" },
  { value: "planned", label: "Current" },
  { value: "future", label: "Future" },
]

const NOTIFICATION_CHANNELS = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
]

// Mobile Dropdown Multiselect Component (identical to invite-user-dialog)
function MobileDropdownMultiselect({
  value,
  options,
  onChange,
  placeholder,
  portalContainer,
  onOpenChange,
}: {
  value: string[]
  options: { value: string; label: string }[]
  onChange: (vals: string[]) => void
  placeholder: string
  portalContainer?: HTMLElement | null
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <Select
      variant="underlined"
      fullWidth
      className="w-full"
      label={placeholder}
      labelPlacement="inside"
      placeholder=""
      selectionMode="multiple"
      selectedKeys={new Set(value)}
      onSelectionChange={(keys) => {
        onChange(Array.from(keys) as string[])
      }}
      onOpenChange={onOpenChange}
      popoverProps={{
        portalContainer: portalContainer ?? undefined,
        shouldBlockScroll: false,
        placement: "top",
        classNames: {
          base: "!z-[9999] !pointer-events-auto !bg-black !border-gray-700",
          content: "!z-[9999] !pointer-events-auto !bg-black !border !border-gray-700 !rounded-md",
        },
      }}
      classNames={{
        base: "bg-transparent group",
        mainWrapper: "bg-transparent",
        trigger: "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-gray-600 border-x-0 border-t-0 group-data-[focus-within=true]:border-b-orange-500 transition-[border-color] duration-200 ease-in-out [&::after]:!bg-white group-data-[focus-within=true]:[&::after]:!bg-white [&::after]:!transition-all [&::after]:!duration-300 [&::after]:!ease-in-out",
        value: "bg-transparent text-sm !text-white",
        label: "text-gray-300 data-[inside=true]:text-gray-400 group-data-[filled=true]:text-white group-data-[focus-within=true]:text-white",
        selectorIcon: "!text-white",
        listbox: "!bg-black !z-[9999] !pointer-events-auto",
        popoverContent: "!bg-black !z-[9999] !pointer-events-auto !border !border-gray-700 !rounded-md",
      }}
      listboxProps={{
        classNames: {
          base: "!bg-black !z-[9999] !pointer-events-auto",
          list: "p-1 max-h-[200px] overflow-y-auto overflow-x-hidden overscroll-contain !pointer-events-auto touch-pan-y -webkit-overflow-scrolling-touch",
        },
      }}
      renderValue={(items) => {
        if (value.length === 0) {
          return null
        }
        if (value.length === options.length) {
          return "All"
        }
        return options
          .filter((o) => value.includes(o.value))
          .map((o) => o.label)
          .join(", ")
      }}
    >
      {options.map((opt) => {
        const isSelected = value.includes(opt.value)
        return (
          <SelectItem
            key={opt.value}
            textValue={opt.label}
            hideSelectedIcon
            startContent={
              <Checkbox
                isSelected={isSelected}
                size="sm"
                classNames={{
                  base: "pointer-events-none flex-shrink-0",
                  icon: "!text-white",
                }}
              />
            }
            classNames={{
              base: "!bg-black !text-white data-[hover=true]:!bg-gray-800 [&[data-selected=true]]:!bg-gray-900 [&[data-selected=true]]:!border [&[data-selected=true]]:!border-gray-700 !pointer-events-auto [&>span]:!text-white [&>span]:!text-xs transition-colors duration-200 ease-in-out",
            }}
          >
            {opt.label}
          </SelectItem>
        )
      })}
    </Select>
  )
}

// Desktop Dropdown Multiselect Component (identical to invite-user-dialog)
function DesktopDropdownMultiselect({
  value,
  options,
  onChange,
  placeholder,
  portalContainer,
  onOpenChange,
}: {
  value: string[]
  options: { value: string; label: string }[]
  onChange: (vals: string[]) => void
  placeholder: string
  portalContainer?: HTMLElement | null
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <Select
      variant="underlined"
      fullWidth
      className="w-full"
      label={placeholder}
      labelPlacement="inside"
      placeholder=""
      selectionMode="multiple"
      selectedKeys={new Set(value)}
      onSelectionChange={(keys) => {
        onChange(Array.from(keys) as string[])
      }}
      onOpenChange={onOpenChange}
      popoverProps={{
        portalContainer: portalContainer ?? undefined,
        shouldBlockScroll: false,
        placement: "top",
        classNames: {
          base: "!z-[9999] !pointer-events-auto",
          content: "!z-[9999] !pointer-events-auto !min-w-[280px]",
        },
      }}
      classNames={{
        base: "bg-transparent group",
        mainWrapper: "bg-transparent",
        trigger: "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-orange-200 border-x-0 border-t-0 data-[hover=true]:border-b-orange-400 group-data-[focus-within=true]:!border-b-black transition-[border-color] duration-200 ease-in-out",
        value: "bg-transparent text-base !text-slate-900",
        label: "text-slate-700 data-[inside=true]:text-slate-500 group-data-[filled=true]:text-slate-700 group-data-[focus-within=true]:text-slate-700",
        listbox: "!bg-white !z-[9999] !pointer-events-auto",
        popoverContent: "!bg-white !z-[9999] !pointer-events-auto !min-w-[280px]",
      }}
      listboxProps={{
        classNames: {
          base: "!bg-white !z-[9999] !pointer-events-auto",
          list: "p-1 max-h-[200px] overflow-y-auto overflow-x-hidden overscroll-contain !pointer-events-auto touch-pan-y -webkit-overflow-scrolling-touch",
        },
      }}
      renderValue={(items) => {
        if (value.length === 0) {
          return null
        }
        if (value.length === options.length) {
          return "All"
        }
        return options
          .filter((o) => value.includes(o.value))
          .map((o) => o.label)
          .join(", ")
      }}
    >
      {options.map((opt) => {
        const isSelected = value.includes(opt.value)
        return (
          <SelectItem
            key={opt.value}
            textValue={opt.label}
            hideSelectedIcon
            startContent={
              <Checkbox
                isSelected={isSelected}
                size="sm"
                classNames={{
                  base: "pointer-events-none flex-shrink-0",
                  icon: "!text-black",
                }}
              />
            }
            classNames={{
              base: "!bg-white !text-black data-[hover=true]:!bg-gray-100 [&[data-selected=true]]:!bg-gray-100 !pointer-events-auto transition-colors duration-200 ease-in-out",
            }}
          >
            {opt.label}
          </SelectItem>
        )
      })}
    </Select>
  )
}

function SetupAccountContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const cardRef = useRef<HTMLDivElement>(null)
  const [isSelectOpen, setIsSelectOpen] = useState(false)

  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string
    confirmPassword?: string
  }>({})
  const [touchedFields, setTouchedFields] = useState<{
    password?: boolean
    confirmPassword?: boolean
  }>({})

  // Validate fields when they change after being touched
  useEffect(() => {
    if (touchedFields.password) {
      if (formData.password.trim().length > 0 && formData.password.trim().length < 8) {
        setFieldErrors((prev) => ({ ...prev, password: "Password must be at least 8 characters" }))
      } else {
        setFieldErrors((prev) => ({ ...prev, password: undefined }))
      }
    }
  }, [formData.password, touchedFields.password])

  useEffect(() => {
    if (touchedFields.confirmPassword) {
      if (formData.confirmPassword.trim().length > 0 && formData.password !== formData.confirmPassword) {
        setFieldErrors((prev) => ({ ...prev, confirmPassword: "Passwords do not match" }))
      } else {
        setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }))
      }
    }
  }, [formData.confirmPassword, formData.password, touchedFields.confirmPassword])

  // Prevent body scroll when select popover is open
  useEffect(() => {
    if (isSelectOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isSelectOpen])

  // Set body and html background to black for setup page
  useEffect(() => {
    const originalBodyBg = document.body.style.backgroundColor
    const originalHtmlBg = document.documentElement.style.backgroundColor
    
    document.body.style.backgroundColor = "#000000"
    document.documentElement.style.backgroundColor = "#000000"
    
    return () => {
      document.body.style.backgroundColor = originalBodyBg
      document.documentElement.style.backgroundColor = originalHtmlBg
    }
  }, [])

  // Ensure page is at top and prevent scrolling on mobile
  useEffect(() => {
    // Scroll to top immediately
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    
    // Prevent body scrolling on mobile
    const originalOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow
    const originalPosition = document.body.style.position
    
    // Prevent scrolling
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    
    return () => {
      // Restore original styles
      document.body.style.overflow = originalOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
      document.body.style.position = originalPosition
      document.body.style.width = ''
    }
  }, [])

  // Validate compulsory fields
  const isFormValid = () => {
    return (
      formData.password.trim().length >= 8 &&
      formData.confirmPassword.trim().length >= 8 &&
      formData.password === formData.confirmPassword &&
      formData.notify_channels.length > 0 &&
      (!formData.notify_channels.includes("sms") || formData.mobile.trim().length > 0)
    )
  }

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link")
      setLoading(false)
      return
    }

    // Test mode - use mock data for visual testing
    if (token === "test") {
      const mockProfile = {
        first_name: "John",
        last_name: "Doe",
        email: "john.doe@example.com",
      }
      setProfile(mockProfile)
      setFormData((prev) => ({
        ...prev,
        notify_outage_types: OUTAGE_TYPES.map((o: any) => o.value),
        notify_providers: [],
      }))
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


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Test mode - prevent actual submission
    if (token === "test") {
      setToastMessage("This is test mode - form submission is disabled")
      return
    }
    
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
      <div className="min-h-mobile flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="min-h-mobile flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
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
    <div className="relative flex h-[100dvh] w-full items-center justify-center bg-[#000000] p-6 md:p-10 overflow-hidden fixed inset-0 md:static md:bg-[#050505]">
      <div className="pointer-events-none absolute inset-0 hidden md:block">
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
      </div>

      <div className="relative w-full max-w-3xl">
        <Card ref={cardRef} className="relative w-full border border-white/10 md:border-gray-200 bg-black/70 md:bg-white shadow-2xl p-8 md:p-10">
          <div className="mb-6 md:mb-8 space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold text-white md:text-slate-900">Setup Your Account</h1>
            <p className="text-sm md:text-base text-gray-400 md:text-slate-600">
              Welcome, {profile?.first_name || "there"}! Finish your profile to access GridAlert.
            </p>
          </div>

          <form 
            onSubmit={handleSubmit} 
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
                e.preventDefault()
                ;(e.target as HTMLElement).blur()
              }
            }}
            className="space-y-6"
          >
            {error && <div className="p-4 bg-red-900/20 border border-red-700 rounded text-red-400 md:bg-red-50 md:border-red-200 md:text-red-700">{error}</div>}

            <div className="grid gap-4 md:gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <div className="md:hidden">
                  <div className="relative">
                    <MobileInput
                      label="Password *"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => {
                        setFormData({ ...formData, password: e.target.value })
                      }}
                      onFocus={() => {
                        setTouchedFields((prev) => ({ ...prev, password: true }))
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          e.currentTarget.blur()
                          if (document.activeElement instanceof HTMLElement) {
                            document.activeElement.blur()
                          }
                        }
                      }}
                      isInvalid={!!fieldErrors.password}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="relative">
                    <DesktopInput
                      label="Password *"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => {
                        setFormData({ ...formData, password: e.target.value })
                      }}
                      onFocus={() => {
                        setTouchedFields((prev) => ({ ...prev, password: true }))
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          e.currentTarget.blur()
                          if (document.activeElement instanceof HTMLElement) {
                            document.activeElement.blur()
                          }
                        }
                      }}
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
                {fieldErrors.password && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="md:hidden">
                  <div className="relative">
                    <MobileInput
                      label="Confirm Password *"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => {
                        setFormData({ ...formData, confirmPassword: e.target.value })
                      }}
                      onFocus={() => {
                        setTouchedFields((prev) => ({ ...prev, confirmPassword: true }))
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          e.currentTarget.blur()
                          if (document.activeElement instanceof HTMLElement) {
                            document.activeElement.blur()
                          }
                        }
                      }}
                      isInvalid={!!fieldErrors.confirmPassword}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="relative">
                    <DesktopInput
                      label="Confirm Password *"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => {
                        setFormData({ ...formData, confirmPassword: e.target.value })
                      }}
                      onFocus={() => {
                        setTouchedFields((prev) => ({ ...prev, confirmPassword: true }))
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          e.currentTarget.blur()
                          if (document.activeElement instanceof HTMLElement) {
                            document.activeElement.blur()
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="md:hidden">
                  <MobileInput
                    label="Mobile Number (optional)"
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        e.stopPropagation()
                        e.currentTarget.blur()
                        if (document.activeElement instanceof HTMLElement) {
                          document.activeElement.blur()
                        }
                      }
                    }}
                  />
                </div>
                <div className="hidden md:block">
                  <DesktopInput
                    label="Mobile Number (optional)"
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        e.stopPropagation()
                        e.currentTarget.blur()
                        if (document.activeElement instanceof HTMLElement) {
                          document.activeElement.blur()
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="md:hidden">
                  <MobileDropdownMultiselect
                    value={formData.notify_channels}
                    options={NOTIFICATION_CHANNELS}
                    onChange={(vals) => setFormData((prev) => ({ ...prev, notify_channels: vals }))}
                    placeholder="Select channels"
                    portalContainer={cardRef.current}
                    onOpenChange={setIsSelectOpen}
                  />
                </div>
                <div className="hidden md:block">
                  <DesktopDropdownMultiselect
                    value={formData.notify_channels}
                    options={NOTIFICATION_CHANNELS}
                    onChange={(vals) => setFormData((prev) => ({ ...prev, notify_channels: vals }))}
                    placeholder="Select channels"
                    portalContainer={cardRef.current}
                    onOpenChange={setIsSelectOpen}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="md:hidden">
                  <MobileDropdownMultiselect
                    value={formData.notify_outage_types}
                    options={OUTAGE_TYPES_MOBILE}
                    onChange={(vals) => setFormData((prev) => ({ ...prev, notify_outage_types: vals }))}
                    placeholder="Outage Types"
                    portalContainer={cardRef.current}
                    onOpenChange={setIsSelectOpen}
                  />
                </div>
                <div className="hidden md:block">
                  <DesktopDropdownMultiselect
                    value={formData.notify_outage_types}
                    options={OUTAGE_TYPES}
                    onChange={(vals) => setFormData((prev) => ({ ...prev, notify_outage_types: vals }))}
                    placeholder="Outage Types"
                    portalContainer={cardRef.current}
                    onOpenChange={setIsSelectOpen}
                  />
                </div>
              </div>
            </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" isDisabled={submitting || !isFormValid()} color="primary" variant="solid">
                {submitting ? "Setting up..." : "Complete Setup"}
              </Button>
              <Button type="button" variant="bordered" onClick={() => router.push("/login")} className="flex-1 bg-black md:bg-transparent text-white md:text-inherit">
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

export const dynamic = 'force-dynamic'

export default function SetupAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-mobile flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SetupAccountContent />
    </Suspense>
  )
}

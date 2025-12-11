"use client"
import { getSupabaseClient } from "@/lib/supabase"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useJsApiLoader } from "@react-google-maps/api"
import { AppSidebar } from "@/components/sidebar"
import { Loader2, Bell, Zap, Building2, Pencil } from "lucide-react"
import { OnboardingWizard } from "@/components/onboarding-wizard"
import { CompanyMembersTable } from "@/components/company-members-table"
import { CreateCompanyDialog } from "@/components/create-company-dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { EditCompanyIconDialog } from "@/components/edit-company-icon-dialog"
import { InviteUserDialog } from "@/components/invite-user-dialog"

type NotificationChoice = "unplanned" | "planned" | "future"
type ProviderChoice = "Ausgrid" | "Endeavour" | "Energex" | "Ergon" | "SA Power"
type ChannelChoice = "email" | "sms"
type RoleChoice = "admin" | "manager" | "member"
type MultiSelectOption = { value: string; label: string }

interface CompanyInfo {
  id: string
  name: string
  location: string
  latitude: number | null
  longitude: number | null
  logoLetters: string
  logoBgColor: string
  logoTextColor: string
}

interface ProfileRecord {
  user_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  mobile: string | null
  role: RoleChoice
  notify_outage_types: NotificationChoice[]
  notify_providers: ProviderChoice[]
  notify_channels: ChannelChoice[]
  company: CompanyInfo | null
  company_id?: string | null
  region_access?: string[]
}

const outageOptions: { value: NotificationChoice; label: string }[] = [
  { value: "unplanned", label: "Unplanned" },
  { value: "planned", label: "Current planned" },
  { value: "future", label: "Future planned" },
]

const providerOptions: { value: ProviderChoice; label: string; color: string }[] = [
  { value: "Ausgrid", label: "Ausgrid", color: "bg-blue-500" },
  { value: "Endeavour", label: "Endeavour", color: "bg-green-500" },
  { value: "Energex", label: "Energex", color: "bg-cyan-500" },
  { value: "Ergon", label: "Ergon", color: "bg-red-500" },
  { value: "SA Power", label: "SA Power", color: "bg-orange-500" },
]

const channelOptions: { value: ChannelChoice; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
]

const regionOptions = ["NSW", "QLD", "VIC", "SA", "WA", "NT", "ACT", "TAS"]

const PROVIDER_COLORS = {
  Ausgrid: "bg-blue-500",
  Endeavour: "bg-green-500",
  Energex: "bg-cyan-500",
  Ergon: "bg-red-500",
  "SA Power": "bg-orange-500",
}

const libraries: ("places" | "geometry" | "drawing")[] = ["places"]

function MultiSelect({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string[]
  options: MultiSelectOption[]
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
      ? placeholder
      : value.length === options.length
        ? "All"
        : options
            .filter((o) => value.includes(o.value))
            .map((o) => o.label)
            .join(", ")

  return <div>{/* Placeholder for MultiSelect component */}</div>
}

const emptyProfile: ProfileRecord = {
  user_id: "",
  first_name: "",
  last_name: "",
  email: "",
  mobile: "",
  role: "member",
  notify_outage_types: ["unplanned", "planned", "future"],
  notify_providers: ["Ausgrid", "Endeavour", "Energex", "Ergon", "SA Power"],
  notify_channels: ["email"],
  company: null,
  company_id: null,
  region_access: [],
}

const normalizeProfile = (raw: any): ProfileRecord => ({
  user_id: raw?.user_id ?? "",
  first_name: raw?.first_name ?? "",
  last_name: raw?.last_name ?? "",
  email: raw?.email ?? "",
  mobile: (raw?.mobile ?? "").trim(),
  role: (raw?.role as RoleChoice) ?? "member",
  notify_outage_types: (raw?.notify_outage_types as NotificationChoice[]) ?? ["unplanned", "planned", "future"],
  notify_providers: (raw?.notify_providers as ProviderChoice[]) ?? [
    "Ausgrid",
    "Endeavour",
    "Energex",
    "Ergon",
    "SA Power",
  ],
  notify_channels: (raw?.notify_channels as ChannelChoice[]) ?? ["email"],
  company: raw?.company
    ? {
        id: raw.company.id,
        name: raw.company.name,
        location: raw.company.location ?? "",
        latitude: raw.company.latitude ?? null,
        longitude: raw.company.longitude ?? null,
        logoLetters: raw.company.logo_letters ?? "",
        logoBgColor: raw.company.logo_bg_color ?? "",
        logoTextColor: raw.company.logo_text_color ?? "",
      }
    : null,
  company_id: raw?.company_id ?? raw?.company?.id ?? null,
  region_access: (raw?.region_access as string[]) ?? [],
})

export default function ProfilePage() {
  const { isLoaded: mapsLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  })

  const router = useRouter()
  const supabase = getSupabaseClient()
  const [profile, setProfile] = useState<ProfileRecord | null>(null)
  const [members, setMembers] = useState<ProfileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false)
  const [editIconOpen, setEditIconOpen] = useState(false)
  const [inviteState, setInviteState] = useState({
    first_name: "",
    last_name: "",
    email: "",
    mobile: "",
    password: "",
    role: "member" as RoleChoice,
    notify_outage_types: ["unplanned", "planned", "future"] as NotificationChoice[],
    notify_providers: ["Ausgrid", "Endeavour", "Energex", "Ergon"] as ProviderChoice[],
    notify_channels: ["email"] as ChannelChoice[],
    region_access: ["NSW", "QLD", "VIC", "SA", "WA", "NT", "ACT", "TAS"] as string[],
  })
  const [editMember, setEditMember] = useState<ProfileRecord | null>(null)

  const isAdmin = useMemo(() => profile?.role === "admin", [profile])
  const companyId = useMemo(() => profile?.company_id || profile?.company?.id || null, [profile])

  const isProfileIncomplete = useMemo(() => {
    if (!profile) return false
    return (
      !profile.first_name?.trim() ||
      !profile.last_name?.trim() ||
      !profile.email?.trim() ||
      !profile.mobile?.trim() ||
      !profile.notify_providers?.length ||
      !profile.region_access?.length
    )
  }, [profile])

  const profileInitials = useMemo(() => {
    const first = profile?.first_name?.trim()?.[0]
    const last = profile?.last_name?.trim()?.[0]
    if (first || last) return `${first ?? ""}${last ?? ""}`.toUpperCase()
    const emailFirst = profile?.email?.[0]
    return (emailFirst ?? "U").toUpperCase()
  }, [profile])

  useEffect(() => {
    const bootstrap = async () => {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData?.user) {
        router.replace("/login")
        return
      }
      await fetchProfile(authData.user.id, authData.user.email ?? undefined)
      setLoading(false)
    }
    bootstrap()
  }, [router])

  const fetchProfile = async (userId: string, userEmail?: string) => {
    const { data, error: fetchError } = await supabase
      .from("user_profiles")
      .select(
        `
        user_id,
        first_name,
        last_name,
        email,
        mobile,
        role,
        notify_outage_types,
        notify_providers,
        notify_channels,
        region_access,
        company:companies(id,name,location,latitude,longitude,logo_letters,logo_bg_color,logo_text_color)
      `,
      )
      .eq("user_id", userId)
      .maybeSingle()

    if (fetchError) {
      setError(fetchError.message)
      return
    }

    const profileRecord = data ? normalizeProfile(data) : { ...emptyProfile, user_id: userId, email: userEmail ?? "" }
    setProfile(profileRecord)

    const companyId = profileRecord.company_id || profileRecord.company?.id
    if (companyId && profileRecord.role === "admin") {
      await fetchCompanyMembers(companyId)
    }
  }

  const fetchCompanyMembers = async (companyId: string) => {
    const { data, error: memberError } = await supabase
      .from("user_profiles")
      .select(
        `
        user_id,
        first_name,
        last_name,
        email,
        mobile,
        role,
        notify_outage_types,
        notify_providers,
        notify_channels,
        region_access,
        company_id
      `,
      )
      .eq("company_id", companyId)
      .order("first_name", { nullsFirst: true })

    if (memberError) {
      setError(memberError.message)
      return
    }

    setMembers((data || []).map((row: any) => normalizeProfile(row)))
  }

  const validateProfile = (current: ProfileRecord) => {
    const nextErrors: Record<string, string> = {}
    if (!current.first_name?.trim()) nextErrors.first_name = "First name is required."
    if (!current.last_name?.trim()) nextErrors.last_name = "Last name is required."
    if (!current.email?.trim()) nextErrors.email = "Email is required."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(current.email)) nextErrors.email = "Enter a valid email."
    if (!current.mobile?.trim()) nextErrors.mobile = "Mobile number is required."
    return nextErrors
  }

  const updateProfile = async (updates: Partial<ProfileRecord>) => {
    if (!profile) return

    const updatedProfile = { ...profile, ...updates }
    setProfile(updatedProfile)

    const { error: updateError } = await supabase.from("user_profiles").upsert(
      {
        user_id: updatedProfile.user_id,
        first_name: updatedProfile.first_name,
        last_name: updatedProfile.last_name,
        email: updatedProfile.email,
        mobile: updatedProfile.mobile,
        notify_outage_types: updatedProfile.notify_outage_types,
        notify_providers: updatedProfile.notify_providers,
        notify_channels: updatedProfile.notify_channels,
        role: updatedProfile.role,
        company_id: updatedProfile.company_id ?? updatedProfile.company?.id ?? null,
        region_access: updatedProfile.region_access ?? [],
      },
      { onConflict: "user_id" },
    )

    if (updateError) {
      setError(updateError.message)
    }
  }

  const completeOnboarding = async () => {
    if (!profile) return
    await updateProfile(profile)
  }

  const updateOwnProfile = async () => {
    if (!profile) return
    setSaving(true)
    setError(null)
    const validation = validateProfile(profile)
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      setSaving(false)
      return
    }

    const { error: updateError } = await supabase.from("user_profiles").upsert(
      {
        user_id: profile.user_id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        mobile: profile.mobile,
        notify_outage_types: profile.notify_outage_types,
        notify_providers: profile.notify_providers,
        notify_channels: profile.notify_channels,
        role: profile.role,
        company_id: profile.company_id ?? profile.company?.id ?? null,
        region_access: profile.region_access ?? [],
      },
      { onConflict: "user_id" },
    )

    if (updateError) {
      setError(updateError.message)
    }

    setErrors({})
    setSaving(false)
  }

  const saveMember = async (member: ProfileRecord) => {
    setSaving(true)
    setError(null)
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        role: member.role,
        notify_outage_types: member.notify_outage_types,
        notify_providers: member.notify_providers,
        notify_channels: member.notify_channels,
        region_access: member.region_access ?? [],
      })
      .eq("user_id", member.user_id)

    if (updateError) {
      setError(updateError.message)
    } else if (profile?.company?.id) {
      await fetchCompanyMembers(profile.company.id)
    }
    setSaving(false)
    setEditMember(null)
  }

  const inviteUser = async () => {
    if (!profile?.company?.id) return
    setSaving(true)
    setError(null)

    // Create auth user with email/password
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: inviteState.email,
      password: inviteState.password,
    })

    if (signUpError || !signUpData.user) {
      setError(signUpError?.message || "Unable to create user.")
      setSaving(false)
      return
    }

    const { error: insertError } = await supabase.from("user_profiles").insert({
      user_id: signUpData.user.id,
      first_name: inviteState.first_name,
      last_name: inviteState.last_name,
      email: inviteState.email,
      mobile: inviteState.mobile,
      company_id: profile.company.id,
      role: inviteState.role,
      notify_outage_types: inviteState.notify_outage_types,
      notify_providers: inviteState.notify_providers,
      notify_channels: inviteState.notify_channels,
      region_access: inviteState.region_access,
    })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    await fetchCompanyMembers(profile.company.id)
    setInviteOpen(false)
    setInviteState({
      first_name: "",
      last_name: "",
      email: "",
      mobile: "",
      password: "",
      role: "member",
      notify_outage_types: ["unplanned", "planned", "future"],
      notify_providers: ["Ausgrid", "Endeavour", "Energex", "Ergon"],
      notify_channels: ["email"],
      region_access: ["NSW", "QLD", "VIC", "SA", "WA", "NT", "ACT", "TAS"],
    })
    setSaving(false)
  }

  const createCompany = async (data: {
    name: string
    location: string
    latitude: number
    longitude: number
    logoLetters: string
    logoBgColor: string
    logoTextColor: string
  }) => {
    if (!profile) return

    setSaving(true)
    setError(null)

    const { data: newCompany, error: companyError } = await supabase
      .from("companies")
      .insert({
        name: data.name,
        location: data.location,
        latitude: data.latitude,
        longitude: data.longitude,
        logo_letters: data.logoLetters,
        logo_bg_color: data.logoBgColor,
        logo_text_color: data.logoTextColor,
      })
      .select("id,name,location,latitude,longitude,logo_letters,logo_bg_color,logo_text_color")
      .single()

    if (companyError || !newCompany) {
      setError(companyError?.message || "Unable to create company.")
      setSaving(false)
      throw new Error(companyError?.message || "Unable to create company.")
    }

    await supabase.from("user_profiles").upsert(
      {
        user_id: profile.user_id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        mobile: profile.mobile,
        company_id: newCompany.id,
        role: "admin",
        notify_outage_types: profile.notify_outage_types,
        notify_providers: profile.notify_providers,
        notify_channels: profile.notify_channels,
        region_access: profile.region_access ?? [],
      },
      { onConflict: "user_id" },
    )

    setProfile((p) =>
      p
        ? {
            ...p,
            company: {
              id: newCompany.id,
              name: newCompany.name,
              location: newCompany.location,
              latitude: newCompany.latitude,
              longitude: newCompany.longitude,
              logoLetters: newCompany.logo_letters,
              logoBgColor: newCompany.logo_bg_color,
              logoTextColor: newCompany.logo_text_color,
            },
            company_id: newCompany.id,
            role: "admin",
          }
        : p,
    )
    await fetchCompanyMembers(newCompany.id)
    setSaving(false)
  }

  const handleUpdateCompanyIcon = async (letters: string, bgColor: string, textColor: string) => {
    if (!profile?.company?.id) return

    const { error } = await supabase
      .from("companies")
      .update({
        logo_letters: letters,
        logo_bg_color: bgColor,
        logo_text_color: textColor,
      })
      .eq("id", profile.company.id)

    if (error) {
      console.error("Failed to update company icon:", error)
      setError("Failed to update company icon")
      throw error
    }

    // Update local state
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            company: prev.company
              ? {
                  ...prev.company,
                  logoLetters: letters,
                  logoBgColor: bgColor,
                  logoTextColor: textColor,
                }
              : null,
          }
        : null,
    )
  }

  const toggleProvider = (value: ProviderChoice) => {
    if (!profile) return
    const current = profile.notify_providers || []
    const updated = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    setProfile({ ...profile, notify_providers: updated })
  }

  const toggleOutage = (value: NotificationChoice) => {
    if (!profile) return
    const current = profile.notify_outage_types || []
    const updated = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    setProfile({ ...profile, notify_outage_types: updated })
  }

  const saveEditProfile = async () => {
    await updateProfile(profile!)
    setEditProfileOpen(false)
  }

  const handleInviteUser = async (data: {
    email: string
    first_name: string
    last_name: string
    role: string
    region_access: string[]
    notify_providers: string[]
    notify_outage_types: string[]
  }) => {
    if (!profile?.company?.id || !profile?.user_id) {
      throw new Error("Company or user not found")
    }

    const response = await fetch("/api/invite-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        company_id: profile.company.id,
        invited_by: profile.user_id,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to invite user")
    }

    // Refresh the company members list
    await fetchCompanyMembers(profile.company.id)
  }

  if (loading) {
    return (
      <div className="min-h-svh bg-slate-50 flex">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (isProfileIncomplete && profile) {
    return (
      <OnboardingWizard
        profile={profile}
        onUpdate={(updates) => setProfile({ ...profile, ...updates })}
        onComplete={completeOnboarding}
      />
    )
  }

  if (!companyId && profile) {
    return (
      <div className="min-h-svh bg-slate-50 flex">
        <AppSidebar />
        <div className="flex w-full flex-col">
          <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold">My Profile</h1>
                <p className="text-muted-foreground text-sm">Manage your preferences and notification settings</p>
              </div>
              <CreateCompanyDialog onCreateCompany={createCompany} saving={saving} mapsLoaded={mapsLoaded} />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Profile Card */}
              <Card className="md:col-span-2 lg:col-span-1">
                <CardHeader className="flex flex-col items-center text-center space-y-3 pb-3">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="bg-orange-500 text-white font-bold text-2xl">
                      {profileInitials}
                    </AvatarFallback>
                  </Avatar>
                </CardHeader>
                <CardContent className="space-y-3 text-center">
                  <div className="space-y-1">
                    <p className="text-xl font-semibold">
                      {profile.first_name} {profile.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">User Role: </span>
                      <span className="font-medium capitalize">{profile.role}</span>
                    </div>
                    <Badge variant="outline" className="mx-auto">
                      Individual User
                    </Badge>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Mobile: </span>
                      <span className="font-medium">{profile.mobile}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Energy Providers */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-orange-500" />
                    <CardTitle className="text-lg">Energy Providers</CardTitle>
                  </div>
                  <CardDescription>Select providers to track</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {providerOptions.map((provider) => (
                      <label key={provider.value} className="flex items-center gap-3 cursor-pointer group">
                        <Checkbox
                          checked={profile.notify_providers.includes(provider.value)}
                          onCheckedChange={() => {
                            toggleProvider(provider.value)
                            updateProfile({
                              notify_providers: profile.notify_providers.includes(provider.value)
                                ? profile.notify_providers.filter((p) => p !== provider.value)
                                : [...profile.notify_providers, provider.value],
                            })
                          }}
                        />
                        <div
                          className={`h-8 w-8 rounded-full ${provider.color} flex items-center justify-center text-white font-bold`}
                        >
                          {provider.label[0]}
                        </div>
                        <span className="text-sm font-medium group-hover:text-orange-500 transition-colors">
                          {provider.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Outage Types */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-orange-500" />
                    <CardTitle className="text-lg">Outage Types</CardTitle>
                  </div>
                  <CardDescription>Choose what to monitor</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {outageOptions.map((option) => (
                      <label key={option.value} className="flex items-center gap-3 cursor-pointer group">
                        <Checkbox
                          checked={profile.notify_outage_types.includes(option.value)}
                          onCheckedChange={() => {
                            toggleOutage(option.value)
                            updateProfile({
                              notify_outage_types: profile.notify_outage_types.includes(option.value)
                                ? profile.notify_outage_types.filter((t) => t !== option.value)
                                : [...profile.notify_outage_types, option.value],
                            })
                          }}
                        />
                        <span className="text-sm font-medium group-hover:text-orange-500 transition-colors">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Region Access */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Region Access</CardTitle>
                  <CardDescription>States and territories you want to monitor</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {regionOptions.map((region) => {
                      const hasAccess = profile.region_access?.includes(region) ?? false
                      return (
                        <Badge
                          key={region}
                          variant={hasAccess ? "default" : "outline"}
                          className="cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => {
                            const newRegions = hasAccess
                              ? (profile.region_access || []).filter((r) => r !== region)
                              : [...(profile.region_access || []), region]
                            updateProfile({ region_access: newRegions })
                          }}
                        >
                          {region}
                          {hasAccess && " ✓"}
                        </Badge>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Create Company CTA */}
              <Card className="md:col-span-2 lg:col-span-1 border-2 border-dashed border-orange-200 bg-orange-50/50">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-orange-500" />
                    <CardTitle className="text-lg">Create a Company</CardTitle>
                  </div>
                  <CardDescription>Invite team members and manage access</CardDescription>
                </CardHeader>
                <CardContent>
                  <CreateCompanyDialog
                    onCreateCompany={createCompany}
                    saving={saving}
                    mapsLoaded={mapsLoaded}
                    trigger={<Button className="w-full">Get Started</Button>}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-svh bg-slate-50 flex">
        <AppSidebar />
        <div className="flex w-full flex-col">
          <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold">Profile & Team</h1>
                <p className="text-muted-foreground text-sm">
                  Manage your company, team members, and notification settings
                </p>
              </div>
              {isAdmin && (
                <Button onClick={() => setInviteOpen(true)} disabled={saving}>
                  Invite User
                </Button>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Company Info */}
            {profile?.company && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="relative group">
                      <div
                        className="h-12 w-12 rounded-lg flex items-center justify-center font-bold text-xl"
                        style={{
                          backgroundColor: profile.company.logoBgColor || "#f97316",
                          color: profile.company.logoTextColor || "#ffffff",
                        }}
                      >
                        {profile.company.logoLetters || profile.company.name[0]}
                      </div>
                      <button
                        onClick={() => setEditIconOpen(true)}
                        className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50"
                        aria-label="Edit company icon"
                      >
                        <Pencil className="h-3 w-3 text-slate-600" />
                      </button>
                    </div>
                    <div>
                      <CardTitle>{profile.company.name}</CardTitle>
                      <CardDescription>{members.length} team members</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )}

            {/* Admin Table View */}
            {isAdmin && members.length > 0 && (
              <CompanyMembersTable members={members} onUpdateMember={saveMember} saving={saving} />
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <div>{/* Placeholder for Edit Profile Dialog */}</div>

      {/* Invite User Dialog */}
      {isAdmin && profile?.company?.id && profile?.user_id && (
        <InviteUserDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          onInvite={handleInviteUser}
          companyId={profile.company.id}
          adminId={profile.user_id}
        />
      )}

      {/* Edit Company Icon Dialog */}
      {profile?.company && (
        <EditCompanyIconDialog
          open={editIconOpen}
          onOpenChange={setEditIconOpen}
          currentLetters={profile.company.logoLetters || profile.company.name[0]}
          currentBgColor={profile.company.logoBgColor || "#f97316"}
          currentTextColor={profile.company.logoTextColor || "#ffffff"}
          companyName={profile.company.name}
          onSave={handleUpdateCompanyIcon}
        />
      )}
    </>
  )
}

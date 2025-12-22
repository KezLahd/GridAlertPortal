"use client"
import type { MemberRecord } from "@/components/company-members-table"
import { googleMapsApiKey } from "@/lib/config"
import { getSupabaseClient } from "@/lib/supabase"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useJsApiLoader } from "@react-google-maps/api"
import { AppSidebar } from "@/components/sidebar"
import { Bell, Zap, Building2, Pencil } from "lucide-react"
import { OnboardingWizard } from "@/components/onboarding-wizard"
import { CompanyMembersTable } from "@/components/company-members-table"
import { CreateCompanyDialog } from "@/components/create-company-dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ToastContainer, type Toast } from "@/components/ui/toast"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { EditCompanyIconDialog } from "@/components/edit-company-icon-dialog"
import { InviteUserDialog } from "@/components/invite-user-dialog"
import { EditUserIconDialog } from "@/components/edit-user-icon-dialog"
import { EditCompanyDetailsDialog } from "@/components/edit-company-details-dialog"
import { EditUserDetailsDialog } from "@/components/edit-user-details-dialog"
import { AddPoiDialog } from "@/components/add-poi-dialog"
import { PoiLocationsTable, type PoiLocation } from "@/components/poi-locations-table"
import { ImportCsvDialog } from "@/components/import-csv-dialog"
import { ProfilePageSkeleton } from "@/components/skeleton-components"

type NotificationChoice = "unplanned" | "planned" | "future"
type ProviderChoice = "Ausgrid" | "Endeavour" | "Energex" | "Ergon" | "SA Power" | "Horizon Power" | "WPower" | "AusNet" | "CitiPowerCor" | "Essential Energy" | "Jemena" | "UnitedEnergy" | "TasNetworks"
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
  icon_letters?: string | null
  icon_bg_color?: string | null
  icon_text_color?: string | null
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
  { value: "Horizon Power", label: "Horizon Power", color: "bg-rose-500" },
  { value: "WPower", label: "WPower", color: "bg-amber-500" },
  { value: "AusNet", label: "AusNet", color: "bg-emerald-500" },
  { value: "CitiPowerCor", label: "CitiPowerCor", color: "bg-blue-500" },
  { value: "Essential Energy", label: "Essential Energy", color: "bg-orange-500" },
  { value: "Jemena", label: "Jemena", color: "bg-cyan-500" },
  { value: "UnitedEnergy", label: "UnitedEnergy", color: "bg-purple-500" },
  { value: "TasNetworks", label: "TasNetworks", color: "bg-purple-500" },
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
  "Horizon Power": "bg-rose-500",
  WPower: "bg-amber-500",
  AusNet: "bg-emerald-500",
  CitiPowerCor: "bg-blue-500",
  "Essential Energy": "bg-orange-500",
  Jemena: "bg-cyan-500",
  UnitedEnergy: "bg-purple-500",
  TasNetworks: "bg-purple-500",
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
  notify_providers: ["Ausgrid", "Endeavour", "Energex", "Ergon", "SA Power", "Horizon Power", "WPower", "AusNet", "CitiPowerCor", "Essential Energy", "Jemena", "UnitedEnergy", "TasNetworks"],
  notify_channels: ["email"],
  company: null,
  company_id: null,
  region_access: [],
  icon_letters: null,
  icon_bg_color: null,
  icon_text_color: null,
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
    "UnitedEnergy",
    "TasNetworks",
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
  icon_letters: raw?.icon_letters ?? null,
  icon_bg_color: raw?.icon_bg_color ?? null,
  icon_text_color: raw?.icon_text_color ?? null,
})

export const dynamic = 'force-dynamic'

export default function ProfilePage() {
  const { isLoaded: mapsLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey,
    libraries,
  })

  const router = useRouter()
  const supabase = getSupabaseClient()
  const [profile, setProfile] = useState<ProfileRecord | null>(null)
  const [members, setMembers] = useState<MemberRecord[]>([])
  const [poiCount, setPoiCount] = useState<number>(0)
  const [poiLocations, setPoiLocations] = useState<PoiLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false)
  const [editIconOpen, setEditIconOpen] = useState(false)
  const [editUserIconOpen, setEditUserIconOpen] = useState(false)
  const [editCompanyDetailsOpen, setEditCompanyDetailsOpen] = useState(false)
  const [editUserDetailsOpen, setEditUserDetailsOpen] = useState(false)
  const [addPoiOpen, setAddPoiOpen] = useState(false)
  const [importCsvOpen, setImportCsvOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [inviteState, setInviteState] = useState({
    first_name: "",
    last_name: "",
    email: "",
    mobile: "",
    password: "",
    role: "member" as RoleChoice,
    notify_outage_types: ["unplanned", "planned", "future"] as NotificationChoice[],
    notify_providers: ["Ausgrid", "Endeavour", "Energex", "Ergon", "SA Power", "Horizon Power", "WPower", "AusNet", "CitiPowerCor", "Essential Energy", "Jemena", "UnitedEnergy", "TasNetworks"] as ProviderChoice[],
    notify_channels: ["email"] as ChannelChoice[],
    region_access: ["NSW", "QLD", "VIC", "SA", "WA", "NT", "ACT", "TAS"] as string[],
  })
  const [editMember, setEditMember] = useState<MemberRecord | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE")

  const isAdmin = useMemo(() => profile?.role === "admin", [profile])
  const companyId = useMemo(() => profile?.company_id || profile?.company?.id || null, [profile])

  // Show toast message
  const showToast = (message: string, type: "success" | "warning" | "error" = "success") => {
    const toast: Toast = {
      id: crypto.randomUUID(),
      title: message,
      type,
    }
    setToasts((prev) => [...prev, toast])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id))
    }, 5000)
  }

  // Handle invite user with admin check
  const handleInviteUserClick = () => {
    if (!isAdmin) {
      showToast("You must be an administrator to invite users")
      return
    }
    setInviteOpen(true)
  }

  // Handle opening POI add dialog with admin check
  const handleOpenAddPoi = () => {
    if (!isAdmin) {
      showToast("You must be an administrator to add POIs")
      return
    }
    setAddPoiOpen(true)
  }

  // Handle opening CSV import dialog with admin check
  const handleOpenImportCsv = () => {
    if (!isAdmin) {
      showToast("You must be an administrator to import POIs")
      return
    }
    setImportCsvOpen(true)
  }

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
    if (profile?.icon_letters) return profile.icon_letters
    const first = profile?.first_name?.trim()?.[0]
    const last = profile?.last_name?.trim()?.[0]
    if (first || last) return `${first ?? ""}${last ?? ""}`.toUpperCase()
    const emailFirst = profile?.email?.[0]
    return (emailFirst ?? "U").toUpperCase()
  }, [profile])

  const profileIconBgColor = useMemo(() => {
    return profile?.icon_bg_color || "#f97316"
  }, [profile])

  const profileIconTextColor = useMemo(() => {
    return profile?.icon_text_color || "#ffffff"
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
        icon_letters,
        icon_bg_color,
        icon_text_color,
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
    if (companyId) {
      await fetchCompanyMembers(companyId)
      await fetchPoiCount(companyId)
      await fetchPoiLocations(companyId)
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
        icon_letters,
        icon_bg_color,
        icon_text_color,
        company_id,
        created_at
      `,
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: true })

    if (memberError) {
      setError(memberError.message)
      return
    }

    const normalizeMember = (row: any): MemberRecord => ({
      user_id: row?.user_id ?? "",
      first_name: row?.first_name ?? "",
      last_name: row?.last_name ?? "",
      email: row?.email ?? "",
      mobile: (row?.mobile ?? "").trim(),
      role: (row?.role as RoleChoice) ?? "member",
      notify_outage_types: (row?.notify_outage_types as NotificationChoice[]) ?? ["unplanned", "planned", "future"],
      notify_providers: ((row?.notify_providers ?? ["Ausgrid", "Endeavour", "Energex", "Ergon", "SA Power", "Horizon Power", "WPower", "AusNet", "CitiPowerCor", "Essential Energy", "Jemena", "UnitedEnergy", "TasNetworks"]) as ProviderChoice[]),
      notify_channels: (row?.notify_channels as string[]) ?? ["email"],
      region_access: (row?.region_access as string[]) ?? [],
      icon_letters: row?.icon_letters ?? null,
      icon_bg_color: row?.icon_bg_color ?? null,
      icon_text_color: row?.icon_text_color ?? null,
    })

    setMembers((data || []).map((row: any) => normalizeMember(row)))
  }

  const fetchPoiCount = async (companyId: string) => {
    const { count, error: poiError } = await supabase
      .from("locations")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("institutionstatus", "ACTIVE")

    if (poiError) {
      console.error("Failed to fetch POI count:", poiError)
      return
    }

    setPoiCount(count || 0)
  }

  const fetchPoiLocations = async (companyId: string) => {
    // Fetch all locations (not just ACTIVE) so status filter can work
    const { data, error: locationsError } = await supabase
      .from("locations")
      .select("*")
      .eq("company_id", companyId)

    if (locationsError) {
      console.error("Failed to fetch POI locations:", locationsError)
      // Only set error if there's an actual error message
      if (locationsError.message) {
        setError(locationsError.message)
      }
      return
    }

    const normalizedLocations: PoiLocation[] = (data || []).map((row: any) => ({
      id: row.id,
      institution_code: row.institutioncode,
      poi_name: row.institutionname,
      street_address: row.addressline1,
      city: row.addresssuburb,
      state: row.addressstate,
      postcode: row.addresspostcode,
      country: "Australia",
      contact_name: null,
      contact_email: row.institutionemail,
      contact_phone: row.institutionphoneno,
      latitude: row.addresslatitude,
      longitude: row.addresslongitude,
      created_at: row.created_at,
      institutionstatus: row.institutionstatus || null,
    }))

    // Sort numerically by institution code
    normalizedLocations.sort((a, b) => {
      const getNumericCode = (code: string | null): number => {
        if (!code) return Infinity // Put nulls at the end
        // Extract numeric part (remove any non-numeric characters)
        const numeric = parseInt(code.replace(/\D/g, ''), 10)
        return isNaN(numeric) ? Infinity : numeric
      }
      
      const numA = getNumericCode(a.institution_code)
      const numB = getNumericCode(b.institution_code)
      return numA - numB
    })

    setPoiLocations(normalizedLocations)
  }

  const handleAddPoi = async (
    poiName: string,
    location: string,
    latitude: number,
    longitude: number,
    contactName?: string,
    contactEmail?: string,
    contactPhone?: string
  ) => {
    if (!profile?.company?.id) return

    setSaving(true)
    setError(null)

    // Map to new schema: poi_name -> institutionname, street_address -> addressline1, etc.
    const { error: insertError } = await supabase
      .from("locations")
      .insert({
        company_id: profile.company.id,
        institutionname: poiName,
        addressline1: location,
        addresslatitude: latitude,
        addresslongitude: longitude,
        institutionemail: contactEmail || null,
        institutionphoneno: contactPhone || null,
      })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      throw insertError
    }

    // Refresh the POI locations and count
    await fetchPoiLocations(profile.company.id)
    await fetchPoiCount(profile.company.id)
    setSaving(false)
  }

  const handleImportCsv = () => {
    if (!isAdmin) {
      showToast("You must be an administrator to import POIs")
      return
    }
    setImportCsvOpen(true)
  }

  const handleImportCsvSuccess = async () => {
    if (profile?.company?.id) {
      await fetchPoiLocations(profile.company.id)
      await fetchPoiCount(profile.company.id)
    }
    setImportCsvOpen(false)
  }

  const handleDeletePoi = async (poiIds: string[]) => {
    console.log("handleDeletePoi called with:", poiIds)
    
    if (!profile?.company?.id) {
      console.error("No company ID found")
      return
    }

    if (!poiIds || poiIds.length === 0) {
      console.error("No POI IDs provided")
      return
    }

    setSaving(true)
    setError(null)

    try {
      console.log("Deleting POIs via API:", poiIds, "for company:", profile.company.id)
      
      const response = await fetch("/api/delete-poi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poiIds,
          companyId: profile.company.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error("API delete error:", result.error)
        setError(result.error || "Failed to delete POIs")
        showToast(result.error || "Failed to delete POIs", "error")
        throw new Error(result.error || "Failed to delete POIs")
      }

      const deletedCount = result.deletedCount || 0
      console.log(`Successfully deleted ${deletedCount} POI(s), refreshing...`)

      if (deletedCount === 0) {
        console.error("No rows were deleted")
        setError("No POIs were deleted. They may have already been deleted or you don't have permission.")
        showToast("No POIs were deleted", "error")
        return
      }

      // Refresh the POI locations and count
      await fetchPoiLocations(profile.company.id)
      await fetchPoiCount(profile.company.id)
      showToast(`${deletedCount} POI${deletedCount !== 1 ? 's' : ''} deleted successfully`, "success")
    } catch (error) {
      console.error("Failed to delete POIs:", error)
      showToast("Failed to delete POIs", "error")
    } finally {
      setSaving(false)
    }
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

  const deleteMember = async (userId: string) => {
    if (!profile?.company?.id) return

    setSaving(true)
    setError(null)

    // Delete the user profile
    const { error: deleteError } = await supabase
      .from("user_profiles")
      .delete()
      .eq("user_id", userId)

    if (deleteError) {
      setError(deleteError.message)
      setSaving(false)
      throw deleteError
    }

    // Also delete the auth user (requires admin privileges)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId)
    if (authError) {
      console.error("Failed to delete auth user:", authError)
      // Continue anyway as the profile is deleted
    }

    // Refresh the members list
    if (profile.company.id) {
      await fetchCompanyMembers(profile.company.id)
    }
    setSaving(false)
  }

  const saveMember = async (member: MemberRecord) => {
    setSaving(true)
    setError(null)
    
    // Members can't change their own role, only admins can change roles
    const updateData: any = {
      notify_providers: member.notify_providers,
      notify_channels: member.notify_channels,
      region_access: member.region_access ?? [],
    }
    
    // Only allow role update if current user is admin and editing someone else
    if (isAdmin && member.user_id !== profile?.user_id) {
      updateData.role = member.role
    }
    
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update(updateData)
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
      notify_providers: ["Ausgrid", "Endeavour", "Energex", "Ergon", "SA Power", "Horizon Power", "WPower", "AusNet", "CitiPowerCor", "Essential Energy", "Jemena", "UnitedEnergy", "TasNetworks"],
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

  const handleUpdateUserDetails = async (firstName: string, lastName: string, mobile: string) => {
    if (!profile?.user_id) return

    const { error } = await supabase
      .from("user_profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        mobile: mobile,
      })
      .eq("user_id", profile.user_id)

    if (error) {
      console.error("Failed to update user details:", error)
      setError("Failed to update user details")
      throw error
    }

    // Update local state
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            first_name: firstName,
            last_name: lastName,
            mobile: mobile,
          }
        : null,
    )

    // Refresh company members to update their display
    if (profile.company_id || profile.company?.id) {
      const companyId = profile.company_id || profile.company?.id
      if (companyId) {
        await fetchCompanyMembers(companyId)
      }
    }

    // Trigger sidebar refresh
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("userIconUpdated"))
    }
  }

  const handleUpdateUserNotifications = async (channels: ChannelChoice[], outageTypes: NotificationChoice[]) => {
    if (!profile?.user_id) return

    const { error } = await supabase
      .from("user_profiles")
      .update({
        notify_channels: channels,
        notify_outage_types: outageTypes,
      })
      .eq("user_id", profile.user_id)

    if (error) {
      console.error("Failed to update notification preferences:", error)
      setError("Failed to update notification preferences")
      throw error
    }

    // Update local state
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            notify_channels: channels,
            notify_outage_types: outageTypes,
          }
        : null,
    )
  }

  const handleChangePassword = async (newPassword: string) => {
    if (!profile?.user_id) return

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      console.error("Failed to change password:", error)
      setError("Failed to change password")
      throw error
    }
  }

  const handleUpdateCompanyDetails = async (name: string, location: string) => {
    if (!profile?.company?.id) return

    const { error } = await supabase
      .from("companies")
      .update({
        name: name,
        location: location,
      })
      .eq("id", profile.company.id)

    if (error) {
      console.error("Failed to update company details:", error)
      setError("Failed to update company details")
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
                  name: name,
                  location: location,
                }
              : null,
          }
        : null,
    )
  }

  const handleUpdateUserIcon = async (letters: string, bgColor: string, textColor: string) => {
    if (!profile?.user_id) return

    const { error } = await supabase
      .from("user_profiles")
      .update({
        icon_letters: letters,
        icon_bg_color: bgColor,
        icon_text_color: textColor,
      })
      .eq("user_id", profile.user_id)

    if (error) {
      console.error("Failed to update user icon:", error)
      setError("Failed to update user icon")
      throw error
    }

    // Update local state
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            icon_letters: letters,
            icon_bg_color: bgColor,
            icon_text_color: textColor,
          }
        : null,
    )

    // Refresh company members to update their icons in the table
    if (profile.company_id || profile.company?.id) {
      const companyId = profile.company_id || profile.company?.id
      if (companyId) {
        await fetchCompanyMembers(companyId)
      }
    }

    // Trigger sidebar refresh by dispatching a custom event
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("userIconUpdated"))
    }
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

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || "Failed to invite user")
    }

    // Show appropriate toast based on email sending status
    if (result.emailSent) {
      showToast(`Invitation sent successfully to ${data.email}!`, "success")
    } else {
      showToast(`Invitation created but email failed to send. Please contact administrator to resend the invitation.`, "warning")
    }

    // Refresh the company members list
    await fetchCompanyMembers(profile.company.id)
  }

  if (loading) {
    return (
      <div className="min-h-svh bg-slate-50 flex">
        <AppSidebar />
        <div className="flex w-full flex-col">
          <ProfilePageSkeleton />
        </div>
      </div>
    )
  }

  if (isProfileIncomplete && profile) {
    return (
      <OnboardingWizard
        profile={{
          ...profile,
          notify_outage_types: profile.notify_outage_types ?? [],
          notify_providers: profile.notify_providers ?? [],
          notify_channels: profile.notify_channels ?? [],
          region_access: profile.region_access ?? [],
        }}
        onUpdate={(updates) =>
          setProfile({
            ...profile,
            ...updates,
            notify_outage_types: (updates.notify_outage_types ?? profile.notify_outage_types ?? []) as NotificationChoice[],
            notify_providers: (updates.notify_providers ?? profile.notify_providers ?? []) as ProviderChoice[],
            notify_channels: (updates.notify_channels ?? profile.notify_channels ?? []) as ChannelChoice[],
            region_access: updates.region_access ?? profile.region_access ?? [],
          })
        }
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
              <Button onClick={handleInviteUserClick} disabled={saving || !isAdmin}>
                Invite User
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Company Info and User Profile Side by Side */}
            {profile && companyId && (
              <div className="grid gap-6 md:grid-cols-2">
                {/* User Profile Card */}
                <Card>
                  <CardHeader className="flex flex-col items-center text-center space-y-3 pb-3">
                    <div className="relative group">
                      <Avatar className="h-20 w-20">
                        <AvatarFallback
                          className="font-bold text-2xl"
                          style={{
                            backgroundColor: profileIconBgColor,
                            color: profileIconTextColor,
                          }}
                        >
                          {profileInitials}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        onClick={() => setEditUserIconOpen(true)}
                        className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50"
                        aria-label="Edit user icon"
                      >
                        <Pencil className="h-3 w-3 text-slate-600" />
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-center">
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-2">
                        <p className="text-xl font-semibold">
                          {profile.first_name} {profile.last_name}
                        </p>
                        <button
                          onClick={() => setEditUserDetailsOpen(true)}
                          className="flex items-center justify-center hover:opacity-70 transition-opacity"
                          aria-label="Edit user details"
                        >
                          <Pencil className="h-4 w-4 text-black" />
                        </button>
                      </div>
                      <p className="text-sm text-muted-foreground">{profile.email}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-muted-foreground">User Role: </span>
                        <span className="font-medium capitalize">{profile.role}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Mobile: </span>
                        <span className="font-medium">{profile.mobile}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Company Info */}
                {profile?.company && (
                  <Card>
                    <CardHeader className="flex flex-col items-center text-center space-y-3 pb-3">
                      <div className="relative group">
                        <div
                          className="h-20 w-20 rounded-lg flex items-center justify-center font-bold text-2xl"
                          style={{
                            backgroundColor: profile.company.logoBgColor || "#f97316",
                            color: profile.company.logoTextColor || "#ffffff",
                          }}
                        >
                          {profile.company.logoLetters || profile.company.name[0]}
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => setEditIconOpen(true)}
                            className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50"
                            aria-label="Edit company icon"
                          >
                            <Pencil className="h-3 w-3 text-slate-600" />
                          </button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-center">
                      <div className="space-y-1">
                        <div className="flex items-center justify-center gap-2">
                          <p className="text-xl font-semibold">{profile.company.name}</p>
                          {isAdmin && (
                            <button
                              onClick={() => setEditCompanyDetailsOpen(true)}
                              className="flex items-center justify-center hover:opacity-70 transition-opacity"
                              aria-label="Edit company details"
                            >
                              <Pencil className="h-4 w-4 text-black" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{profile.company.location}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Team Members: </span>
                          <span className="font-medium">{members.length}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Number of POIs: </span>
                          <span className="font-medium">{poiCount}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* POI Locations Section */}
            {profile && companyId && (
              <PoiLocationsTable
                locations={poiLocations}
                onAddPoi={handleOpenAddPoi}
                onImportCsv={handleOpenImportCsv}
                onDeletePoi={isAdmin ? handleDeletePoi : undefined}
                loading={saving}
                isAdmin={isAdmin}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
              />
            )}

            {/* Team Members Table View */}
            {members.length > 0 && (
              <CompanyMembersTable 
                members={members} 
                onUpdateMember={(member) => { void saveMember(member); }}
                onDeleteMember={isAdmin ? deleteMember : undefined}
                saving={saving}
                currentUserId={profile?.user_id}
                currentUserRole={profile?.role}
              />
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

      {/* Edit User Icon Dialog */}
      {profile && (
        <EditUserIconDialog
          open={editUserIconOpen}
          onOpenChange={setEditUserIconOpen}
          currentLetters={profile.icon_letters || profileInitials}
          currentBgColor={profile.icon_bg_color || profileIconBgColor}
          currentTextColor={profile.icon_text_color || profileIconTextColor}
          userName={`${profile.first_name} ${profile.last_name}`.trim() || profile.email || "User"}
          onSave={handleUpdateUserIcon}
        />
      )}

      {/* Edit User Details Dialog */}
      {profile && (
        <EditUserDetailsDialog
          open={editUserDetailsOpen}
          onOpenChange={setEditUserDetailsOpen}
          currentFirstName={profile.first_name}
          currentLastName={profile.last_name}
          currentMobile={profile.mobile}
          currentEmail={profile.email}
          currentNotifyChannels={profile.notify_channels || ["email"]}
          currentNotifyOutageTypes={profile.notify_outage_types || ["unplanned", "planned", "future"]}
          onSave={handleUpdateUserDetails}
          onUpdateNotifications={handleUpdateUserNotifications}
          onChangePassword={handleChangePassword}
        />
      )}

      {/* Toast Notification */}
      <ToastContainer
        toasts={toasts}
        onClose={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
        position="bottom-right"
      />

      {/* Edit Company Details Dialog */}
      {profile?.company && isAdmin && (
        <EditCompanyDetailsDialog
          open={editCompanyDetailsOpen}
          onOpenChange={setEditCompanyDetailsOpen}
          currentName={profile.company.name}
          currentLocation={profile.company.location}
          onSave={handleUpdateCompanyDetails}
        />
      )}

      {/* Add POI Dialog */}
      {profile?.company && (
        <AddPoiDialog
          open={addPoiOpen}
          onOpenChange={setAddPoiOpen}
          onSave={handleAddPoi}
          saving={saving}
        />
      )}

      {/* Import CSV Dialog */}
      {profile?.company && (
        <ImportCsvDialog
          open={importCsvOpen}
          onOpenChange={setImportCsvOpen}
          companyId={profile.company.id}
          onSuccess={handleImportCsvSuccess}
        />
      )}
    </>
  )
}

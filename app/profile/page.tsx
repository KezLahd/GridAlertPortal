"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandInput,
} from "@/components/ui/command"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AppSidebar } from "@/components/sidebar"
import { PhoneInput } from "@/components/phone-input"
import { ChevronsUpDown, Check, Loader2 } from "lucide-react"

type NotificationChoice = "unplanned" | "planned" | "future"
type ProviderChoice = "Ausgrid" | "Endeavour" | "Energex" | "Ergon" | "SA Power"
type ChannelChoice = "email" | "sms"
type RoleChoice = "admin" | "manager" | "member"
type MultiSelectOption = { value: string; label: string }

interface CompanyInfo {
  id: string
  name: string
  logo_url: string | null
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

const providerOptions: { value: ProviderChoice; label: string }[] = [
  { value: "Ausgrid", label: "Ausgrid" },
  { value: "Endeavour", label: "Endeavour" },
  { value: "Energex", label: "Energex" },
  { value: "Ergon", label: "Ergon" },
  { value: "SA Power", label: "SA Power" },
]

const channelOptions: { value: ChannelChoice; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
]

const regionOptions = ["NSW", "QLD", "VIC", "SA", "WA", "NT", "ACT", "TAS"]

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between rounded-none border-0 border-b-2 border-gray-200 bg-white px-2 py-3 text-sm text-slate-900 shadow-none hover:bg-muted/50 focus:border-primary focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
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
  notify_providers: (raw?.notify_providers as ProviderChoice[]) ?? ["Ausgrid", "Endeavour", "Energex", "Ergon", "SA Power"],
  notify_channels: (raw?.notify_channels as ChannelChoice[]) ?? ["email"],
  company: raw?.company
    ? { id: raw.company.id, name: raw.company.name, logo_url: raw.company.logo_url ?? null }
    : null,
  company_id: raw?.company_id ?? raw?.company?.id ?? null,
  region_access: (raw?.region_access as string[]) ?? [],
})

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileRecord | null>(null)
  const [members, setMembers] = useState<ProfileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [companyForm, setCompanyForm] = useState({ name: "", logo_url: "" })
  const [inviteOpen, setInviteOpen] = useState(false)
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
        company:companies(id,name,logo_url)
      `,
      )
      .eq("user_id", userId)
      .maybeSingle()

    if (fetchError) {
      setError(fetchError.message)
      return
    }

    const profileRecord = data
      ? normalizeProfile(data)
      : { ...emptyProfile, user_id: userId, email: userEmail ?? "" }
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

    const { error: updateError } = await supabase
      .from("user_profiles")
      .upsert(
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

  const createCompany = async () => {
    if (!profile) return
    const trimmedName = companyForm.name.trim()
    const trimmedLogo = companyForm.logo_url.trim()
    if (!trimmedName) {
      setError("Company name is required.")
      return
    }

    setSaving(true)
    setError(null)

    const { data: newCompany, error: companyError } = await supabase
      .from("companies")
      .insert({ name: trimmedName, logo_url: trimmedLogo || null })
      .select("id,name,logo_url")
      .single()

    if (companyError || !newCompany) {
      setError(companyError?.message || "Unable to create company.")
      setSaving(false)
      return
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
            company: { id: newCompany.id, name: newCompany.name, logo_url: newCompany.logo_url ?? null },
            company_id: newCompany.id,
            role: "admin",
          }
        : p,
    )
    await fetchCompanyMembers(newCompany.id)
    setCompanyForm({ name: "", logo_url: "" })
    setSaving(false)
  }

  const toggleArrayValue = <T,>(arr: T[], value: T) => {
    return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
  }

  const renderProviderPicker = (values: ProviderChoice[], onChange: (vals: ProviderChoice[]) => void) => (
    <div className="flex flex-wrap gap-3">
      {providerOptions.map((opt) => (
        <label key={opt.value} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={values.includes(opt.value)}
            onCheckedChange={() => onChange(toggleArrayValue(values, opt.value))}
          />
          {opt.label}
        </label>
      ))}
    </div>
  )

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

  const outageSummary =
    profile?.notify_outage_types?.length === outageOptions.length
      ? "All outages"
      : (profile?.notify_outage_types || []).join(", ") || "None"

  const channelSummary =
    profile?.notify_channels?.length === channelOptions.length
      ? "All channels"
      : (profile?.notify_channels || []).join(", ") || "None"

  return (
    <>
      <div className="min-h-svh bg-slate-50 flex">
        <AppSidebar />
        <div className="flex w-full flex-col">
          <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Profile & team</h1>
            <p className="text-muted-foreground text-sm">
              Manage your details, company, and what teammates can see.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setEditProfileOpen(true)}>
              Edit my profile
            </Button>
            {isAdmin && companyId && (
              <Button onClick={() => setInviteOpen(true)} disabled={saving}>
                Invite user
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-orange-500 text-white font-semibold">
                  {profileInitials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <CardTitle className="text-xl">
                  {profile?.first_name || profile?.last_name
                    ? `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim()
                    : "Your profile"}
                </CardTitle>
                <CardDescription>{profile?.email || "Email not set"}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{profile?.role ?? "member"}</Badge>
                <Badge variant="outline">{companyId ? profile?.company?.name ?? "Company user" : "No company"}</Badge>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>
                  <span className="text-foreground font-medium">Mobile: </span>
                  {profile?.mobile || "Not set"}
                </div>
                <div>
                  <span className="text-foreground font-medium">Outages: </span>
                  {outageSummary}
                </div>
                <div>
                  <span className="text-foreground font-medium">Channels: </span>
                  {channelSummary}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            {companyId ? (
              <>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle>Company</CardTitle>
                    <CardDescription>Manage your organisation and team.</CardDescription>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => fetchCompanyMembers(companyId)} disabled={saving}>
                        Refresh
                      </Button>
                      <Button onClick={() => setInviteOpen(true)} disabled={saving}>
                        Invite user
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-lg font-semibold">{profile?.company?.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {members.length} member{members.length === 1 ? "" : "s"}
                  </div>
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader>
                  <CardTitle>Create your company</CardTitle>
                  <CardDescription>Add your company to invite teammates and control access.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company name</Label>
                    <Input
                      id="companyName"
                      placeholder="GridAlert Pty Ltd"
                      value={companyForm.name}
                      onChange={(e) => setCompanyForm((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyLogo">Logo URL (optional)</Label>
                    <Input
                      id="companyLogo"
                      placeholder="https://example.com/logo.svg"
                      value={companyForm.logo_url}
                      onChange={(e) => setCompanyForm((prev) => ({ ...prev, logo_url: e.target.value }))}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={createCompany} disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Create company
                    </Button>
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        </div>

        {companyId && (
          <Card>
            <CardHeader>
              <CardTitle>Team members</CardTitle>
              <CardDescription>Assign roles and region access.</CardDescription>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">No teammates yet. Invite someone to get started.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Regions</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.user_id}>
                        <TableCell>
                          <div className="font-medium">
                            {member.first_name || member.last_name
                              ? `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim()
                              : "Unnamed"}
                          </div>
                          <div className="text-xs text-muted-foreground">{member.email}</div>
                        </TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{member.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(member.region_access ?? []).length > 0 ? (
                              member.region_access?.map((r) => (
                                <Badge key={r} variant="outline">
                                  {r}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">All regions</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!isAdmin}
                            onClick={() => setEditMember(member)}
                          >
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          )}
          </div>
        </div>
      </div>

      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Update your contact and notification preferences.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                placeholder="John"
                className={cn(
                  "rounded-none border-0 border-b-2 bg-white px-2 py-3 pr-8 text-sm text-slate-900 shadow-none focus:border-primary focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
                  errors.first_name ? "border-red-500 focus:border-red-500" : "border-gray-200",
                )}
                value={profile?.first_name || ""}
                onChange={(e) => {
                  setErrors((prev) => ({ ...prev, first_name: "" }))
                  setProfile((p) => (p ? { ...p, first_name: e.target.value } : p))
                }}
              />
              {errors.first_name && <p className="text-xs text-red-500">{errors.first_name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                placeholder="Smith"
                className={cn(
                  "rounded-none border-0 border-b-2 bg-white px-2 py-3 pr-8 text-sm text-slate-900 shadow-none focus:border-primary focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
                  errors.last_name ? "border-red-500 focus:border-red-500" : "border-gray-200",
                )}
                value={profile?.last_name || ""}
                onChange={(e) => {
                  setErrors((prev) => ({ ...prev, last_name: "" }))
                  setProfile((p) => (p ? { ...p, last_name: e.target.value } : p))
                }}
              />
              {errors.last_name && <p className="text-xs text-red-500">{errors.last_name}</p>}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                className={cn(
                  "rounded-none border-0 border-b-2 bg-white px-2 py-3 pr-8 text-sm text-slate-900 shadow-none focus:border-primary focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
                  errors.email ? "border-red-500 focus:border-red-500" : "border-gray-200",
                )}
                value={profile?.email || ""}
                onChange={(e) => {
                  setErrors((prev) => ({ ...prev, email: "" }))
                  setProfile((p) => (p ? { ...p, email: e.target.value } : p))
                }}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="mobile">Mobile</Label>
              <PhoneInput
                value={profile?.mobile || ""}
                onChange={(val) => {
                  setErrors((prev) => ({ ...prev, mobile: "" }))
                  setProfile((p) => (p ? { ...p, mobile: val || "" } : p))
                }}
                defaultCountry="AU"
                placeholder="Enter phone number"
                error={errors.mobile}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Outage notifications</Label>
              <MultiSelect
                value={profile?.notify_outage_types || []}
                options={outageOptions}
                onChange={(vals) =>
                  setProfile((p) => (p ? { ...p, notify_outage_types: vals as NotificationChoice[] } : p))
                }
                placeholder="All outages"
              />
            </div>

            <div className="space-y-2">
              <Label>Notification channels</Label>
              <MultiSelect
                value={profile?.notify_channels || []}
                options={channelOptions}
                onChange={(vals) =>
                  setProfile((p) => (p ? { ...p, notify_channels: vals as ChannelChoice[] } : p))
                }
                placeholder="Email, SMS"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setEditProfileOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={updateOwnProfile} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invite a teammate</DialogTitle>
            <DialogDescription>Create an account for someone in your company.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="inviteFirst">First name</Label>
              <Input
                id="inviteFirst"
                value={inviteState.first_name}
                onChange={(e) => setInviteState((p) => ({ ...p, first_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteLast">Last name</Label>
              <Input
                id="inviteLast"
                value={inviteState.last_name}
                onChange={(e) => setInviteState((p) => ({ ...p, last_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="inviteEmail">Email</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteState.email}
                onChange={(e) => setInviteState((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="inviteMobile">Mobile</Label>
              <PhoneInput
                value={inviteState.mobile}
                onChange={(val) => setInviteState((p) => ({ ...p, mobile: val || "" }))}
                defaultCountry="AU"
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="invitePassword">Temporary password</Label>
              <Input
                id="invitePassword"
                type="password"
                value={inviteState.password}
                onChange={(e) => setInviteState((p) => ({ ...p, password: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={inviteState.role}
                onValueChange={(role) => setInviteState((p) => ({ ...p, role: role as RoleChoice }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Regions they can see</Label>
              <div className="flex flex-wrap gap-2 text-sm">
                {regionOptions.map((region) => {
                  const selected = inviteState.region_access.includes(region)
                  return (
                    <button
                      key={region}
                      type="button"
                      onClick={() =>
                        setInviteState((p) => ({
                          ...p,
                          region_access: toggleArrayValue(p.region_access, region),
                        }))
                      }
                      className={cn(
                        "rounded-full border px-3 py-1 transition",
                        selected
                          ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {region}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={inviteUser} disabled={saving || !profile?.company?.id}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editMember)} onOpenChange={(open) => (!open ? setEditMember(null) : undefined)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Manage teammate</DialogTitle>
            <DialogDescription>Update role and what they can access.</DialogDescription>
          </DialogHeader>
          {editMember && (
            <div className="space-y-4">
              <div>
                <div className="font-semibold">
                  {editMember.first_name || editMember.last_name
                    ? `${editMember.first_name ?? ""} ${editMember.last_name ?? ""}`.trim()
                    : "Unnamed"}
                </div>
                <div className="text-sm text-muted-foreground">{editMember.email}</div>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={editMember.role}
                  onValueChange={(role) => setEditMember((prev) => (prev ? { ...prev, role: role as RoleChoice } : prev))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Regions</Label>
                <div className="flex flex-wrap gap-2 text-sm">
                  {regionOptions.map((region) => {
                    const selected = editMember.region_access?.includes(region)
                    return (
                      <button
                        key={region}
                        type="button"
                        onClick={() =>
                          setEditMember((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  region_access: toggleArrayValue(prev.region_access ?? [], region),
                                }
                              : prev,
                          )
                        }
                        className={cn(
                          "rounded-full border px-3 py-1 transition",
                          selected
                            ? "border-orange-500 bg-orange-50 text-orange-700"
                            : "border-border text-muted-foreground",
                        )}
                      >
                        {region}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setEditMember(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => editMember && saveMember(editMember)} disabled={saving || !editMember}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  )
}


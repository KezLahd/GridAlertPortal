"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Pencil, ChevronsUpDown, Check, X, Trash2 } from "lucide-react"
import { DeleteUserConfirmationDialog } from "@/components/delete-user-confirmation-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"

type NotificationChoice = "unplanned" | "planned" | "future"
type ProviderChoice = "Ausgrid" | "Endeavour" | "Energex" | "Ergon" | "SA Power" | "Horizon Power" | "WPower" | "AusNet" | "CitiPowerCor" | "Essential Energy" | "Jemena" | "UnitedEnergy" | "TasNetworks"

export interface MemberRecord {
  user_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  mobile: string | null
  role: "admin" | "manager" | "member"
  notify_outage_types: NotificationChoice[]
  notify_providers: ProviderChoice[]
  notify_channels: string[]
  region_access: string[]
  icon_letters?: string | null
  icon_bg_color?: string | null
  icon_text_color?: string | null
}

interface CompanyMembersTableProps {
  members: MemberRecord[]
  onUpdateMember: (member: MemberRecord) => void
  onDeleteMember?: (memberId: string) => Promise<void>
  saving: boolean
  currentUserId?: string
  currentUserRole?: "admin" | "manager" | "member"
}

const providerOptions = [
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

const outageOptions = [
  { value: "unplanned", label: "Unplanned" },
  { value: "planned", label: "Current Planned" },
  { value: "future", label: "Future Planned" },
]

const regionOptions = ["NSW", "QLD", "VIC", "SA", "WA", "NT", "ACT", "TAS"]

function MultiSelect({
  value,
  options,
  onChange,
  placeholder,
  renderDisplay,
}: {
  value: string[]
  options: { value: string; label: string }[]
  onChange: (vals: string[]) => void
  placeholder: string
  renderDisplay?: (value: string[], options: { value: string; label: string }[]) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const toggle = (v: string) => {
    const next = value.includes(v) ? value.filter((i) => i !== v) : [...value, v]
    onChange(next)
  }
  const display = renderDisplay
    ? renderDisplay(value, options)
    : value.length === 0
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

export function CompanyMembersTable({ members, onUpdateMember, onDeleteMember, saving, currentUserId, currentUserRole = "member" }: CompanyMembersTableProps) {
  const [editMember, setEditMember] = useState<MemberRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState<MemberRecord | null>(null)
  const isAdmin = currentUserRole === "admin"

  const getInitials = (member: MemberRecord) => {
    if (member.icon_letters) return member.icon_letters
    const first = member.first_name?.trim()?.[0]
    const last = member.last_name?.trim()?.[0]
    if (first || last) return `${first ?? ""}${last ?? ""}`.toUpperCase()
    return (member.email?.[0] ?? "U").toUpperCase()
  }

  const getIconBgColor = (member: MemberRecord) => {
    return member.icon_bg_color || "#f97316"
  }

  const getIconTextColor = (member: MemberRecord) => {
    return member.icon_text_color || "#ffffff"
  }

  const getMemberName = (member: MemberRecord) => {
    if (member.first_name || member.last_name) {
      return `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim()
    }
    return member.email || "Unknown User"
  }

  const toggleArray = <T,>(arr: T[], value: T): T[] => {
    return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Manage your team's access and notification preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Regions</TableHead>
                  <TableHead>Providers</TableHead>
                  <TableHead>Outage Types</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const name = getMemberName(member)
                  return (
                    <TableRow key={member.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                            style={{
                              backgroundColor: getIconBgColor(member),
                              color: getIconTextColor(member),
                            }}
                          >
                            {getInitials(member)}
                          </div>
                          <div>
                            <div className="font-medium">{name}</div>
                            <div className="text-sm text-muted-foreground">{member.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isAdmin || member.user_id === currentUserId ? (
                          <div className="flex flex-wrap gap-1">
                            {member.region_access.slice(0, 3).map((region) => (
                              <Badge key={region} variant="outline" className="text-xs">
                                {region}
                              </Badge>
                            ))}
                            {member.region_access.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{member.region_access.length - 3}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-xs opacity-50">—</Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isAdmin || member.user_id === currentUserId ? (
                          <div className="flex flex-wrap gap-1">
                            {[...member.notify_providers].sort().map((provider) => {
                              const providerOption = providerOptions.find((p) => p.value === provider)
                              return (
                                <div
                                  key={provider}
                                  className={`h-6 w-6 rounded-full ${providerOption?.color} flex items-center justify-center text-white text-xs font-bold`}
                                  title={provider}
                                >
                                  {provider[0]}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-bold opacity-50">
                              —
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {member.user_id === currentUserId ? (
                          <div className="flex flex-wrap gap-1">
                            {member.notify_outage_types.map((type) => (
                              <Badge key={type} variant="outline" className="text-xs capitalize">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-xs opacity-50">—</Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {(isAdmin || member.user_id === currentUserId) && (
                          <Button variant="ghost" size="sm" onClick={() => setEditMember(member)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Member Dialog */}
      <Dialog open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)}>
        <DialogContent className="max-w-2xl p-0 gap-0 border-0">
        <DialogTitle className="sr-only">Edit Member Permissions</DialogTitle>
          <div className="relative bg-white rounded-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 border-b px-8 py-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {isAdmin && editMember && editMember.user_id !== currentUserId
                    ? "Edit Member Permissions"
                    : "Edit Your Preferences"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {isAdmin && editMember && editMember.user_id !== currentUserId
                    ? `Manage ${editMember && getMemberName(editMember)}'s access and notification settings`
                    : "Manage your access and notification settings"}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setEditMember(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {editMember && (
              <div className="px-8 py-6 space-y-6">
                {isAdmin && editMember.user_id !== currentUserId && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-900">Role</Label>
                    <MultiSelect
                      value={[editMember.role]}
                      options={[
                        { value: "admin", label: "Admin" },
                        { value: "manager", label: "Manager" },
                        { value: "member", label: "Member" },
                      ]}
                      onChange={(vals) => setEditMember({ ...editMember, role: (vals[0] as any) || "member" })}
                      placeholder="Select role"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-900">Region Access</Label>
                    <MultiSelect
                      value={editMember.region_access}
                      options={regionOptions.map((r) => ({ value: r, label: r }))}
                      onChange={(vals) => setEditMember({ ...editMember, region_access: vals })}
                      placeholder="Select regions"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-900">Energy Providers</Label>
                    <MultiSelect
                      value={editMember.notify_providers}
                      options={providerOptions.map((p) => ({ value: p.value, label: p.label }))}
                      onChange={(vals) => setEditMember({ ...editMember, notify_providers: vals as ProviderChoice[] })}
                      placeholder="Select providers"
                      renderDisplay={(value, options) => {
                        if (value.length === 0) return "Select providers"
                        if (value.length === options.length) {
                          return (
                              <div className="flex items-center gap-2">
                              <span>All</span>
                              <div className="flex gap-1">
                                {providerOptions.slice().sort((a, b) => a.value.localeCompare(b.value)).map((provider) => (
                                  <div
                                    key={provider.value}
                                    className={`h-5 w-5 rounded-full ${provider.color} flex items-center justify-center text-white text-[10px] font-bold`}
                                    title={provider.label}
                                  >
                                    {provider.value[0]}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        }
                        return options
                          .filter((o) => value.includes(o.value))
                          .sort((a, b) => a.label.localeCompare(b.label))
                          .map((o) => o.label)
                          .join(", ")
                      }}
                    />
                  </div>
                </div>

              </div>
            )}

            <div className="sticky bottom-0 bg-white border-t px-8 py-4 flex justify-between items-center">
              {isAdmin && editMember && editMember.user_id !== currentUserId && onDeleteMember && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    setMemberToDelete(editMember)
                    setDeleteConfirmOpen(true)
                  }}
                  disabled={deleting || saving}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete User
                </Button>
              )}
              <div className="flex gap-3 ml-auto">
                <Button variant="outline" onClick={() => setEditMember(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (editMember) {
                      onUpdateMember(editMember)
                    }
                  }}
                  disabled={saving || deleting}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      {memberToDelete && onDeleteMember && (
        <DeleteUserConfirmationDialog
          open={deleteConfirmOpen}
          onOpenChange={(open) => {
            setDeleteConfirmOpen(open)
            if (!open) {
              setMemberToDelete(null)
            }
          }}
          userName={getMemberName(memberToDelete)}
          userEmail={memberToDelete.email || ""}
          onConfirm={async () => {
            setDeleting(true)
            try {
              await onDeleteMember(memberToDelete.user_id)
              setEditMember(null)
              setDeleteConfirmOpen(false)
              setMemberToDelete(null)
            } catch (error) {
              console.error("Failed to delete user:", error)
              throw error
            } finally {
              setDeleting(false)
            }
          }}
          deleting={deleting}
        />
      )}
    </>
  )
}

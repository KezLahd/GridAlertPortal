"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Pencil, ChevronsUpDown, Check, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"

type NotificationChoice = "unplanned" | "planned" | "future"
type ProviderChoice = "Ausgrid" | "Endeavour" | "Energex" | "Ergon" | "SA Power"

interface MemberRecord {
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
}

interface CompanyMembersTableProps {
  members: MemberRecord[]
  onUpdateMember: (member: MemberRecord) => void
  saving: boolean
}

const providerOptions = [
  { value: "Ausgrid", label: "Ausgrid", color: "bg-blue-500" },
  { value: "Endeavour", label: "Endeavour", color: "bg-green-500" },
  { value: "Energex", label: "Energex", color: "bg-cyan-500" },
  { value: "Ergon", label: "Ergon", color: "bg-red-500" },
  { value: "SA Power", label: "SA Power", color: "bg-orange-500" },
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

export function CompanyMembersTable({ members, onUpdateMember, saving }: CompanyMembersTableProps) {
  const [editMember, setEditMember] = useState<MemberRecord | null>(null)

  const getInitials = (member: MemberRecord) => {
    const first = member.first_name?.trim()?.[0]
    const last = member.last_name?.trim()?.[0]
    if (first || last) return `${first ?? ""}${last ?? ""}`.toUpperCase()
    return (member.email?.[0] ?? "U").toUpperCase()
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

  // Group members by name
  const groupedMembers = members.reduce(
    (acc, member) => {
      const name = getMemberName(member)
      if (!acc[name]) {
        acc[name] = []
      }
      acc[name].push(member)
      return acc
    },
    {} as Record<string, MemberRecord[]>,
  )

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
                {Object.entries(groupedMembers).map(([name, groupMembers]) =>
                  groupMembers.map((member, index) => (
                    <TableRow key={member.user_id}>
                      <TableCell>
                        {index === 0 ? (
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-orange-500 text-white text-sm font-semibold">
                                {getInitials(member)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{name}</div>
                              <div className="text-sm text-muted-foreground">{member.email}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="pl-12 text-sm text-muted-foreground">{member.email}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {member.notify_providers.map((provider) => {
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
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {member.notify_outage_types.map((type) => (
                            <Badge key={type} variant="outline" className="text-xs capitalize">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setEditMember(member)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )),
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Member Dialog */}
      <Dialog open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)}>
        <DialogContent className="max-w-2xl p-0 gap-0 border-0">
          <div className="relative bg-white rounded-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 border-b px-8 py-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Edit Member Permissions</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage {editMember && getMemberName(editMember)}'s access and notification settings
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setEditMember(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {editMember && (
              <div className="px-8 py-6 space-y-6">
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
                                {providerOptions.map((provider) => (
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
                          .map((o) => o.label)
                          .join(", ")
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-900">Outage Types</Label>
                  <MultiSelect
                    value={editMember.notify_outage_types}
                    options={outageOptions.map((o) => ({ value: o.value, label: o.label }))}
                    onChange={(vals) =>
                      setEditMember({ ...editMember, notify_outage_types: vals as NotificationChoice[] })
                    }
                    placeholder="Select outage types"
                  />
                </div>
              </div>
            )}

            <div className="sticky bottom-0 bg-white border-t px-8 py-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditMember(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (editMember) {
                    onUpdateMember(editMember)
                  }
                }}
                disabled={saving}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

const REGIONS = ["NSW", "QLD", "VIC", "SA", "WA", "NT", "ACT", "TAS"]
const PROVIDERS = [
  { value: "Ausgrid", label: "Ausgrid", color: "bg-blue-500" },
  { value: "Endeavour", label: "Endeavour", color: "bg-green-500" },
  { value: "Energex", label: "Energex", color: "bg-cyan-500" },
  { value: "Ergon", label: "Ergon", color: "bg-red-500" },
  { value: "SA Power", label: "SA Power", color: "bg-orange-500" },
]

function MultiSelect({
  value,
  options,
  onChange,
  placeholder,
  renderDisplay,
}: {
  value: string[]
  options: { value: string; label: string; color?: string }[]
  onChange: (vals: string[]) => void
  placeholder: string
  renderDisplay?: (value: string[], options: { value: string; label: string; color?: string }[]) => React.ReactNode
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
          <span className="truncate flex items-center gap-2">{display}</span>
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
                        ? opt.color || "border-orange-500 bg-orange-500 text-white"
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

interface InviteUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvite: (data: {
    email: string
    first_name: string
    last_name: string
    role: string
    region_access: string[]
    notify_providers: string[]
    notify_outage_types: string[]
  }) => Promise<void>
  companyId: string
  adminId: string
}

export function InviteUserDialog({ open, onOpenChange, onInvite, companyId, adminId }: InviteUserDialogProps) {
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    role: "member" as string,
    region_access: REGIONS as string[],
    notify_providers: PROVIDERS.map((p) => p.value) as string[],
    notify_outage_types: [] as string[],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!formData.email || !formData.first_name || !formData.last_name) {
      setError("Please fill in all required fields")
      return
    }

    setLoading(true)
    setError(null)

    try {
      await onInvite(formData)
      setFormData({
        email: "",
        first_name: "",
        last_name: "",
        role: "member",
        region_access: REGIONS,
        notify_providers: PROVIDERS.map((p) => p.value),
        notify_outage_types: [],
      })
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || "Failed to send invitation")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 border-0">
        <div className="relative bg-white rounded-lg max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white z-10 border-b px-8 py-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Invite User</h2>
              <p className="text-sm text-muted-foreground mt-1">Add a new team member to your company</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="px-8 py-6 space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-sm font-medium text-slate-900">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="John"
                  className="rounded-none border-0 border-b-2 border-gray-200 bg-white px-2 py-3 text-sm text-slate-900 shadow-none hover:bg-white focus:border-orange-500 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:border-orange-500 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-sm font-medium text-slate-900">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Smith"
                  className="rounded-none border-0 border-b-2 border-gray-200 bg-white px-2 py-3 text-sm text-slate-900 shadow-none hover:bg-white focus:border-orange-500 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:border-orange-500 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-900">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john.smith@example.com"
                className="rounded-none border-0 border-b-2 border-gray-200 bg-white px-2 py-3 text-sm text-slate-900 shadow-none hover:bg-white focus:border-orange-500 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:border-orange-500 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-900">Role</Label>
              <MultiSelect
                value={[formData.role]}
                options={[
                  { value: "admin", label: "Admin" },
                  { value: "manager", label: "Manager" },
                  { value: "member", label: "Member" },
                ]}
                onChange={(vals) => setFormData({ ...formData, role: vals[0] || "member" })}
                placeholder="Select role"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-900">Region Access</Label>
                <MultiSelect
                  value={formData.region_access}
                  options={REGIONS.map((r) => ({ value: r, label: r }))}
                  onChange={(vals) => setFormData({ ...formData, region_access: vals })}
                  placeholder="Select regions"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-900">Energy Providers</Label>
                <MultiSelect
                  value={formData.notify_providers}
                  options={PROVIDERS}
                  onChange={(vals) => setFormData({ ...formData, notify_providers: vals })}
                  placeholder="Select providers"
                  renderDisplay={(value, options) => {
                    if (value.length === 0) return "Select providers"
                    if (value.length === options.length) {
                      return (
                        <div className="flex items-center gap-2">
                          <span>All</span>
                          <div className="flex gap-1">
                            {PROVIDERS.map((provider) => (
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
          </div>

          <div className="sticky bottom-0 bg-white border-t px-8 py-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !formData.email || !formData.first_name || !formData.last_name}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {loading ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

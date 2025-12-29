"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button, Input } from "@/components/ui/heroui"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

const REGIONS = ["NSW", "QLD", "VIC", "SA", "WA", "NT", "ACT", "TAS"]
const PROVIDERS = [
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

function SingleSelect({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (val: string) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const selectedOption = options.find((opt) => opt.value === value)

  const display = selectedOption ? selectedOption.label : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="bordered"
          className="w-full justify-between rounded-none border-0 border-b-2 border-gray-700 md:border-gray-200 bg-black md:bg-white px-2 py-2 md:py-3 text-xs md:text-sm text-white md:text-slate-900 shadow-none hover:bg-gray-900 md:hover:bg-white focus:border-orange-500 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:border-orange-500 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <span className="truncate text-white md:text-slate-900">{display}</span>
          <ChevronsUpDown className="h-3 w-3 md:h-4 md:w-4 opacity-60 text-white md:text-slate-900" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[280px] md:w-[320px] bg-black md:bg-white border-gray-800 md:border-[hsl(var(--border))]">
        <Command>
          <CommandEmpty className="text-gray-400 md:text-muted-foreground">No results.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  onSelect={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                  className="flex items-center gap-2 bg-black md:bg-white text-gray-300 md:text-foreground hover:!bg-gray-800 md:hover:!bg-muted/70 data-[highlighted]:!bg-gray-800 md:data-[highlighted]:!bg-muted/70 data-[highlighted]:!text-gray-300 md:data-[highlighted]:!text-foreground data-[selected]:bg-gray-800 md:data-[selected]:bg-white data-[selected]:text-gray-300 md:data-[selected]:text-foreground"
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border text-[10px]",
                      value === opt.value
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
          variant="bordered"
          className="w-full justify-between rounded-none border-0 border-b-2 border-gray-700 md:border-gray-200 bg-black md:bg-white px-2 py-2 md:py-3 text-xs md:text-sm text-white md:text-slate-900 shadow-none hover:bg-gray-900 md:hover:bg-white focus:border-orange-500 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:border-orange-500 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <span className="truncate flex items-center gap-2 text-white md:text-slate-900">{display}</span>
          <ChevronsUpDown className="h-3 w-3 md:h-4 md:w-4 opacity-60 text-white md:text-slate-900" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[280px] md:w-[320px] bg-black md:bg-white border-gray-800 md:border-[hsl(var(--border))]">
        <Command>
          <CommandEmpty className="text-gray-400 md:text-muted-foreground">No results.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  onSelect={() => toggle(opt.value)}
                  className="flex items-center gap-2 bg-black md:bg-white text-gray-300 md:text-foreground hover:!bg-gray-800 md:hover:!bg-muted/70 data-[highlighted]:!bg-gray-800 md:data-[highlighted]:!bg-muted/70 data-[highlighted]:!text-gray-300 md:data-[highlighted]:!text-foreground data-[selected]:bg-gray-800 md:data-[selected]:bg-white data-[selected]:text-gray-300 md:data-[selected]:text-foreground"
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
      <DialogContent className="max-w-[95vw] sm:max-w-[500px] bg-black md:bg-white border-gray-800 md:border-[hsl(var(--border))] p-3 md:p-6">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg text-white md:text-foreground">Invite User</DialogTitle>
          <DialogDescription className="text-xs md:text-sm text-gray-400 md:text-muted-foreground">Add a new team member to your company</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:gap-6 py-2 md:py-4 bg-black md:bg-white">
          {error && (
            <div className="bg-red-900/50 border border-red-700 md:bg-red-50 md:border-red-200 text-red-300 md:text-red-800 px-3 md:px-4 py-2 md:py-3 rounded-md text-xs md:text-sm">
              {error}
            </div>
          )}

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Input
                label="First Name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder=""
                variant="underlined"
                labelPlacement="inside"
                isRequired
                className="w-full"
                classNames={{
                  base: "bg-transparent",
                  mainWrapper: "bg-transparent",
                  inputWrapper:
                    "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-gray-600 md:border-b-orange-200 border-x-0 border-t-0 data-[hover=true]:border-b-gray-500 md:data-[hover=true]:border-b-orange-400 data-[focus=true]:border-b-orange-500 data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-0 data-[focus-visible=true]:ring-offset-0",
                  input: "bg-transparent text-base !text-white md:!text-slate-900 placeholder:text-gray-400 md:placeholder:text-slate-500 caret-orange-500",
                  label: "text-gray-300 md:text-slate-700 data-[inside=true]:text-gray-400 md:data-[inside=true]:text-slate-500",
                }}
              />
            </div>
            <div className="space-y-2">
              <Input
                label="Last Name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder=""
                variant="underlined"
                labelPlacement="inside"
                isRequired
                className="w-full"
                classNames={{
                  base: "bg-transparent",
                  mainWrapper: "bg-transparent",
                  inputWrapper:
                    "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-gray-600 md:border-b-orange-200 border-x-0 border-t-0 data-[hover=true]:border-b-gray-500 md:data-[hover=true]:border-b-orange-400 data-[focus=true]:border-b-orange-500 data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-0 data-[focus-visible=true]:ring-offset-0",
                  input: "bg-transparent text-base !text-white md:!text-slate-900 placeholder:text-gray-400 md:placeholder:text-slate-500 caret-orange-500",
                  label: "text-gray-300 md:text-slate-700 data-[inside=true]:text-gray-400 md:data-[inside=true]:text-slate-500",
                }}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder=""
              variant="underlined"
              labelPlacement="inside"
              isRequired
              className="w-full"
                classNames={{
                  base: "bg-transparent",
                  mainWrapper: "bg-transparent",
                  inputWrapper:
                    "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-gray-600 md:border-b-orange-200 border-x-0 border-t-0 data-[hover=true]:border-b-gray-500 md:data-[hover=true]:border-b-orange-400 data-[focus=true]:border-b-orange-500 data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-0 data-[focus-visible=true]:ring-offset-0",
                  input: "bg-transparent text-base !text-white md:!text-slate-900 placeholder:text-gray-400 md:placeholder:text-slate-500 caret-orange-500",
                  label: "text-gray-300 md:text-slate-700 data-[inside=true]:text-gray-400 md:data-[inside=true]:text-slate-500",
                }}
              />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <label className="text-xs md:text-sm font-semibold text-gray-300 md:text-slate-700">Role</label>
            <SingleSelect
              value={formData.role}
              options={[
                { value: "admin", label: "Admin" },
                { value: "manager", label: "Manager" },
                { value: "member", label: "Member" },
              ]}
              onChange={(val) => setFormData({ ...formData, role: val })}
              placeholder="Select role"
            />
          </div>

          {/* Region Access and Providers */}
          <div className="grid grid-cols-2 gap-2 md:gap-4">
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-semibold text-gray-300 md:text-slate-700">Region Access</label>
              <MultiSelect
                value={formData.region_access}
                options={REGIONS.map((r) => ({ value: r, label: r }))}
                onChange={(vals) => setFormData({ ...formData, region_access: vals })}
                placeholder="Select regions"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs md:text-sm font-semibold text-gray-300 md:text-slate-700">Energy Providers</label>
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
                        <span className="text-white md:text-foreground">All</span>
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
                  return <span className="text-white md:text-foreground">{options
                    .filter((o) => value.includes(o.value))
                    .map((o) => o.label)
                    .join(", ")}</span>
                }}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 md:gap-0">
          <Button variant="bordered" onClick={() => onOpenChange(false)} disabled={loading} className="text-xs md:text-sm text-white md:text-foreground border-gray-600 md:border-gray-200">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !formData.email || !formData.first_name || !formData.last_name}
            className="text-xs md:text-sm text-white md:text-foreground"
          >
            {loading ? "Sending..." : "Send Invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

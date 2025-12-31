"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/heroui"
import { Select, SelectItem, Checkbox } from "@heroui/react"
import { DesktopInput } from "@/components/desktop-input"
import { MobileInput } from "@/components/mobile-input"

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

// Mobile Dropdown Select Component
function MobileDropdownSelect({
  value,
  options,
  onChange,
  placeholder,
  portalContainer,
  onOpenChange,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (val: string) => void
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
      selectedKeys={value ? new Set([value]) : new Set()}
      onSelectionChange={(keys) => {
        const selectedKey = Array.from(keys)[0] as string
        if (selectedKey) {
          onChange(selectedKey)
        }
      }}
      onOpenChange={onOpenChange}
      popoverProps={{
        portalContainer: portalContainer ?? undefined,
        shouldBlockScroll: true,
        classNames: {
          base: "!z-[9999] !pointer-events-auto !bg-black !border-gray-700",
          content: "!z-[9999] !pointer-events-auto !bg-black !border !border-gray-700 !rounded-md",
        },
      }}
      classNames={{
        base: "bg-transparent group",
        mainWrapper: "bg-transparent",
        trigger: "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-gray-600 border-x-0 border-t-0 group-data-[focus-within=true]:border-b-orange-500 transition-[border-color] duration-200 ease-in-out [&::after]:!bg-white group-data-[focus-within=true]:[&::after]:!bg-white [&::after]:!transition-all [&::after]:!duration-300 [&::after]:!ease-in-out",
        value: "bg-transparent text-base !text-white",
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
    >
      {options.map((opt) => (
        <SelectItem
          key={opt.value}
          textValue={opt.label}
          classNames={{
            base: "!bg-black !text-white data-[hover=true]:!bg-gray-800 [&[data-selected=true]]:!bg-gray-900 [&[data-selected=true]]:!border [&[data-selected=true]]:!border-gray-700 !pointer-events-auto [&>span]:!text-white [&>svg]:!text-orange-500 transition-colors duration-200 ease-in-out",
          }}
        >
          {opt.label}
        </SelectItem>
      ))}
    </Select>
  )
}

// Desktop Dropdown Select Component
function DesktopDropdownSelect({
  value,
  options,
  onChange,
  placeholder,
  portalContainer,
  onOpenChange,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (val: string) => void
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
      selectedKeys={value ? new Set([value]) : new Set()}
      onSelectionChange={(keys) => {
        const selectedKey = Array.from(keys)[0] as string
        if (selectedKey) {
          onChange(selectedKey)
        }
      }}
      onOpenChange={onOpenChange}
      popoverProps={{
        portalContainer: portalContainer ?? undefined,
        shouldBlockScroll: true,
        classNames: {
          base: "!z-[9999] !pointer-events-auto",
          content: "!z-[9999] !pointer-events-auto",
        },
      }}
      classNames={{
        base: "bg-transparent group",
        mainWrapper: "bg-transparent",
        trigger: "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-orange-200 border-x-0 border-t-0 data-[hover=true]:border-b-orange-400 group-data-[focus-within=true]:!border-b-black transition-[border-color] duration-200 ease-in-out",
        value: "bg-transparent text-base !text-slate-900",
        label: "text-slate-700 data-[inside=true]:text-slate-500 group-data-[filled=true]:text-slate-700 group-data-[focus-within=true]:text-slate-700",
        listbox: "!bg-white !z-[9999] !pointer-events-auto",
        popoverContent: "!bg-white !z-[9999] !pointer-events-auto",
      }}
      listboxProps={{
        classNames: {
          base: "!bg-white !z-[9999] !pointer-events-auto",
          list: "p-1 max-h-[200px] overflow-y-auto overflow-x-hidden overscroll-contain !pointer-events-auto touch-pan-y -webkit-overflow-scrolling-touch",
        },
      }}
    >
      {options.map((opt) => (
        <SelectItem
          key={opt.value}
          textValue={opt.label}
          classNames={{
            base: "!bg-white !text-black data-[hover=true]:!bg-gray-100 [&[data-selected=true]]:!bg-gray-100 !pointer-events-auto [&>svg]:!text-black transition-colors duration-200 ease-in-out",
          }}
        >
          {opt.label}
        </SelectItem>
      ))}
    </Select>
  )
}

// Mobile Dropdown Multiselect Component
function MobileDropdownMultiselect({
  value,
  options,
  onChange,
  placeholder,
  renderDisplay,
  portalContainer,
  onOpenChange,
}: {
  value: string[]
  options: { value: string; label: string; color?: string }[]
  onChange: (vals: string[]) => void
  placeholder: string
  renderDisplay?: (value: string[], options: { value: string; label: string; color?: string }[]) => React.ReactNode
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
        shouldBlockScroll: true,
        classNames: {
          base: "!z-[9999] !pointer-events-auto !bg-black !border-gray-700",
          content: "!z-[9999] !pointer-events-auto !bg-black !border !border-gray-700 !rounded-md",
        },
      }}
      classNames={{
        base: "bg-transparent group",
        mainWrapper: "bg-transparent",
        trigger: "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-gray-600 border-x-0 border-t-0 group-data-[focus-within=true]:border-b-orange-500 transition-[border-color] duration-200 ease-in-out [&::after]:!bg-white group-data-[focus-within=true]:[&::after]:!bg-white [&::after]:!transition-all [&::after]:!duration-300 [&::after]:!ease-in-out",
        value: "bg-transparent text-base !text-white",
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
        if (renderDisplay) {
          return renderDisplay(value, options)
        }
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
              base: "!bg-black !text-white data-[hover=true]:!bg-gray-800 [&[data-selected=true]]:!bg-gray-900 [&[data-selected=true]]:!border [&[data-selected=true]]:!border-gray-700 !pointer-events-auto [&>span]:!text-white transition-colors duration-200 ease-in-out",
            }}
          >
            {opt.label}
          </SelectItem>
        )
      })}
    </Select>
  )
}

// Desktop Dropdown Multiselect Component
function DesktopDropdownMultiselect({
  value,
  options,
  onChange,
  placeholder,
  renderDisplay,
  portalContainer,
  onOpenChange,
}: {
  value: string[]
  options: { value: string; label: string; color?: string }[]
  onChange: (vals: string[]) => void
  placeholder: string
  renderDisplay?: (value: string[], options: { value: string; label: string; color?: string }[]) => React.ReactNode
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
        shouldBlockScroll: true,
        classNames: {
          base: "!z-[9999] !pointer-events-auto",
          content: "!z-[9999] !pointer-events-auto",
        },
      }}
      classNames={{
        base: "bg-transparent group",
        mainWrapper: "bg-transparent",
        trigger: "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-orange-200 border-x-0 border-t-0 data-[hover=true]:border-b-orange-400 group-data-[focus-within=true]:!border-b-black transition-[border-color] duration-200 ease-in-out",
        value: "bg-transparent text-base !text-slate-900",
        label: "text-slate-700 data-[inside=true]:text-slate-500 group-data-[filled=true]:text-slate-700 group-data-[focus-within=true]:text-slate-700",
        listbox: "!bg-white !z-[9999] !pointer-events-auto",
        popoverContent: "!bg-white !z-[9999] !pointer-events-auto",
      }}
      listboxProps={{
        classNames: {
          base: "!bg-white !z-[9999] !pointer-events-auto",
          list: "p-1 max-h-[200px] overflow-y-auto overflow-x-hidden overscroll-contain !pointer-events-auto touch-pan-y -webkit-overflow-scrolling-touch",
        },
      }}
      renderValue={(items) => {
        if (renderDisplay) {
          return renderDisplay(value, options)
        }
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
  const dialogContentRef = useRef<HTMLDivElement>(null)
  const [isSelectOpen, setIsSelectOpen] = useState(false)
  
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
  const [validationErrors, setValidationErrors] = useState({
    email: false,
    first_name: false,
    last_name: false,
  })

  const handleSubmit = async () => {
    // Prevent submission if button should be disabled
    if (!formData.email.trim() || !formData.first_name.trim() || !formData.last_name.trim()) {
      // Check required fields and set validation errors
      const errors = {
        email: !formData.email.trim(),
        first_name: !formData.first_name.trim(),
        last_name: !formData.last_name.trim(),
      }
      
      setValidationErrors(errors)
      setError("Please fill in all required fields")
      return
    }

    setLoading(true)
    setError(null)
    setValidationErrors({ email: false, first_name: false, last_name: false })

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
      setValidationErrors({ email: false, first_name: false, last_name: false })
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || "Failed to send invitation")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={dialogContentRef} className="max-w-[95vw] sm:max-w-[500px] bg-black md:bg-white border-gray-800 md:border-[hsl(var(--border))] p-3 md:p-6">
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
              <div className="md:hidden">
                <MobileInput
                  label="First Name"
                  value={formData.first_name}
                  onChange={(e) => {
                    setFormData({ ...formData, first_name: e.target.value })
                    setValidationErrors({ ...validationErrors, first_name: false })
                  }}
                  isRequired
                  isInvalid={validationErrors.first_name}
                  errorMessage={validationErrors.first_name ? "You must fill out this field" : undefined}
                />
              </div>
              <div className="hidden md:block">
                <DesktopInput
                label="First Name"
                value={formData.first_name}
                onChange={(e) => {
                  setFormData({ ...formData, first_name: e.target.value })
                  setValidationErrors({ ...validationErrors, first_name: false })
                }}
                isRequired
                isInvalid={validationErrors.first_name}
                errorMessage={validationErrors.first_name ? "You must fill out this field" : undefined}
              />
              </div>
            </div>
            <div className="space-y-2">
              <div className="md:hidden">
                <MobileInput
                  label="Last Name"
                  value={formData.last_name}
                  onChange={(e) => {
                    setFormData({ ...formData, last_name: e.target.value })
                    setValidationErrors({ ...validationErrors, last_name: false })
                  }}
                  isRequired
                  isInvalid={validationErrors.last_name}
                  errorMessage={validationErrors.last_name ? "You must fill out this field" : undefined}
                />
              </div>
              <div className="hidden md:block">
                <DesktopInput
                label="Last Name"
                value={formData.last_name}
                onChange={(e) => {
                  setFormData({ ...formData, last_name: e.target.value })
                  setValidationErrors({ ...validationErrors, last_name: false })
                }}
                isRequired
                isInvalid={validationErrors.last_name}
                errorMessage={validationErrors.last_name ? "You must fill out this field" : undefined}
              />
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <div className="md:hidden">
              <MobileInput
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value })
                  setValidationErrors({ ...validationErrors, email: false })
                }}
                isRequired
                isInvalid={validationErrors.email}
                errorMessage={validationErrors.email ? "You must fill out this field" : undefined}
              />
            </div>
            <div className="hidden md:block">
              <DesktopInput
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value })
                setValidationErrors({ ...validationErrors, email: false })
              }}
              isRequired
              isInvalid={validationErrors.email}
              errorMessage={validationErrors.email ? "You must fill out this field" : undefined}
              />
            </div>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <div className="md:hidden">
              <MobileDropdownSelect
                value={formData.role}
                options={[
                  { value: "admin", label: "Admin" },
                  { value: "manager", label: "Manager" },
                  { value: "member", label: "Member" },
                ]}
                onChange={(val) => setFormData({ ...formData, role: val })}
                placeholder="Select role"
                portalContainer={dialogContentRef.current}
                onOpenChange={setIsSelectOpen}
              />
            </div>
            <div className="hidden md:block">
              <DesktopDropdownSelect
              value={formData.role}
              options={[
                { value: "admin", label: "Admin" },
                { value: "manager", label: "Manager" },
                { value: "member", label: "Member" },
              ]}
              onChange={(val) => setFormData({ ...formData, role: val })}
              placeholder="Select role"
              portalContainer={dialogContentRef.current}
              onOpenChange={setIsSelectOpen}
            />
            </div>
          </div>

          {/* Region Access and Providers */}
          <div className="grid grid-cols-2 gap-2 md:gap-4">
            <div className="space-y-2">
              <div className="md:hidden">
                <MobileDropdownMultiselect
                  value={formData.region_access}
                  options={REGIONS.map((r) => ({ value: r, label: r }))}
                  onChange={(vals) => setFormData({ ...formData, region_access: vals })}
                  placeholder="Select regions"
                  portalContainer={dialogContentRef.current}
                  onOpenChange={setIsSelectOpen}
                />
              </div>
              <div className="hidden md:block">
                <DesktopDropdownMultiselect
                value={formData.region_access}
                options={REGIONS.map((r) => ({ value: r, label: r }))}
                onChange={(vals) => setFormData({ ...formData, region_access: vals })}
                placeholder="Select regions"
                portalContainer={dialogContentRef.current}
                onOpenChange={setIsSelectOpen}
              />
              </div>
            </div>

            <div className="space-y-2">
              <div className="md:hidden">
                <MobileDropdownMultiselect
                  value={formData.notify_providers}
                  options={PROVIDERS}
                  onChange={(vals) => setFormData({ ...formData, notify_providers: vals })}
                  placeholder="Select providers"
                  portalContainer={dialogContentRef.current}
                  onOpenChange={setIsSelectOpen}
                  renderDisplay={(value, options) => {
                    if (value.length === 0) return <span className="text-gray-400">Select providers</span>
                    if (value.length === options.length) {
                      return (
                        <div className="flex items-center gap-2">
                          <span className="text-white">All</span>
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
                    return <span className="text-white">{options
                      .filter((o) => value.includes(o.value))
                      .map((o) => o.label)
                      .join(", ")}</span>
                  }}
                />
              </div>
              <div className="hidden md:block">
                <DesktopDropdownMultiselect
                value={formData.notify_providers}
                options={PROVIDERS}
                onChange={(vals) => setFormData({ ...formData, notify_providers: vals })}
                placeholder="Select providers"
                portalContainer={dialogContentRef.current}
                onOpenChange={setIsSelectOpen}
                renderDisplay={(value, options) => {
                    if (value.length === 0) return <span className="text-slate-500">Select providers</span>
                  if (value.length === options.length) {
                    return (
                      <div className="flex items-center gap-2">
                          <span className="text-foreground">All</span>
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
                    return <span className="text-foreground">{options
                    .filter((o) => value.includes(o.value))
                    .map((o) => o.label)
                    .join(", ")}</span>
                }}
              />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 md:gap-2">
          <Button variant="bordered" onClick={() => onOpenChange(false)} disabled={loading} className="text-xs md:text-sm text-white md:text-foreground border-gray-600 md:border-gray-200">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !formData.email.trim() || !formData.first_name.trim() || !formData.last_name.trim()}
            className="text-xs md:text-sm text-white md:text-foreground bg-[#FF8E32] md:bg-[hsl(var(--primary))] hover:bg-[#FFAA5B] md:hover:bg-[hsl(var(--primary))] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send Invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

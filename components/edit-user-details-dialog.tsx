"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/heroui"
import { Input } from "@/components/ui/heroui"
import { Select, SelectItem, Checkbox } from "@heroui/react"
import { DesktopInput } from "@/components/desktop-input"
import { MobileInput } from "@/components/mobile-input"
import { Accordion, AccordionItem } from "@/components/ui/heroui"

type NotificationChoice = "unplanned" | "planned" | "future"
type ChannelChoice = "email" | "sms"

interface EditUserDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentFirstName: string | null
  currentLastName: string | null
  currentMobile: string | null
  currentEmail: string | null
  currentNotifyChannels: ChannelChoice[]
  currentNotifyOutageTypes: NotificationChoice[]
  onSave: (firstName: string, lastName: string, mobile: string) => Promise<void>
  onUpdateNotifications: (channels: ChannelChoice[], outageTypes: NotificationChoice[]) => Promise<void>
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

const outageOptions: { value: NotificationChoice; label: string }[] = [
  { value: "unplanned", label: "Unplanned" },
  { value: "planned", label: "Current Planned" },
  { value: "future", label: "Future Planned" },
]

const channelOptions: { value: ChannelChoice; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
]

export function EditUserDetailsDialog({
  open,
  onOpenChange,
  currentFirstName,
  currentLastName,
  currentMobile,
  currentEmail,
  currentNotifyChannels,
  currentNotifyOutageTypes,
  onSave,
  onUpdateNotifications,
  onChangePassword,
}: EditUserDetailsDialogProps) {
  const [firstName, setFirstName] = useState(currentFirstName || "")
  const [lastName, setLastName] = useState(currentLastName || "")
  const [mobile, setMobile] = useState(currentMobile || "")
  const [notifyChannels, setNotifyChannels] = useState<ChannelChoice[]>(currentNotifyChannels || ["email"])
  const [notifyOutageTypes, setNotifyOutageTypes] = useState<NotificationChoice[]>(currentNotifyOutageTypes || ["unplanned", "planned", "future"])
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [updatingNotifications, setUpdatingNotifications] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFirstName(currentFirstName || "")
      setLastName(currentLastName || "")
      setMobile(currentMobile || "")
      setNotifyChannels(currentNotifyChannels || ["email"])
      setNotifyOutageTypes(currentNotifyOutageTypes || ["unplanned", "planned", "future"])
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setError(null)
    }
  }, [open, currentFirstName, currentLastName, currentMobile, currentNotifyChannels, currentNotifyOutageTypes])

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required")
      return
    }

    setSaving(true)
    setError(null)
    try {
      // Save personal details
      await onSave(firstName.trim(), lastName.trim(), mobile.trim())
      
      // Save notification preferences if changed
      if (notifyChannels.length > 0 && notifyOutageTypes.length > 0) {
        await onUpdateNotifications(notifyChannels, notifyOutageTypes)
      }
      
      // Save password if changed (require all three fields)
      if (currentPassword || newPassword || confirmPassword) {
        if (!currentPassword || !newPassword || !confirmPassword) {
          setError("All password fields are required to change your password")
          setSaving(false)
          return
        }
        if (newPassword.length < 6) {
          setError("New password must be at least 6 characters")
          setSaving(false)
          return
        }
        if (newPassword !== confirmPassword) {
          setError("New passwords do not match")
          setSaving(false)
          return
        }
        await onChangePassword(currentPassword, newPassword)
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      }
      
      onOpenChange(false)
    } catch (error: any) {
      setError(error.message || "Failed to update user details")
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateNotifications = async () => {
    if (notifyChannels.length === 0) {
      setError("Please select at least one notification channel")
      return
    }

    if (notifyOutageTypes.length === 0) {
      setError("Please select at least one outage type")
      return
    }

    setUpdatingNotifications(true)
    setError(null)
    try {
      await onUpdateNotifications(notifyChannels, notifyOutageTypes)
      setError(null)
    } catch (error: any) {
      setError(error.message || "Failed to update notification preferences")
    } finally {
      setUpdatingNotifications(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All password fields are required")
      return
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match")
      return
    }

    setChangingPassword(true)
    setError(null)
    try {
      await onChangePassword(currentPassword, newPassword)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setError(null)
    } catch (error: any) {
      setError(error.message || "Failed to change password")
    } finally {
      setChangingPassword(false)
    }
  }

  // Mobile Dropdown Multiselect Component
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
    const [isOpen, setIsOpen] = useState(false)

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
        isOpen={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open)
          onOpenChange?.(open)
        }}
        onSelectionChange={(keys) => {
          onChange(Array.from(keys) as string[])
          // Keep dropdown open after selection for multiselect
          setIsOpen(true)
        }}
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
    const [isOpen, setIsOpen] = useState(false)

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
        isOpen={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open)
          onOpenChange?.(open)
        }}
        onSelectionChange={(keys) => {
          onChange(Array.from(keys) as string[])
          // Keep dropdown open after selection for multiselect
          setIsOpen(true)
        }}
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px] bg-black md:bg-white border-gray-800 md:border-[hsl(var(--border))] p-3 md:p-6">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg text-white md:text-foreground">Edit Your Details</DialogTitle>
          <DialogDescription className="text-xs md:text-sm text-gray-400 md:text-muted-foreground">Update your name, mobile number, or change your password</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:gap-6 py-2 md:py-4 bg-black md:bg-white">
          {error && (
            <div className="bg-red-900/50 border border-red-700 md:bg-red-50 md:border-red-200 text-red-300 md:text-red-800 px-3 md:px-4 py-2 md:py-3 rounded-md text-xs md:text-sm">
              {error}
            </div>
          )}

          {/* Accordion Sections */}
          <Accordion defaultExpandedKeys={[]} selectionMode="single" className="w-full">
            {/* Personal Details */}
            <AccordionItem key="personal" aria-label="Personal Details" title="Personal Details" classNames={{
              base: "border-t border-gray-300 md:border-t-[0.5px] md:border-gray-300 first:border-t-0",
              title: "text-sm md:text-base font-semibold md:font-semibold text-gray-300 md:text-foreground",
              content: "text-gray-300 md:text-foreground"
            }}>
              <div className="space-y-3 md:space-y-6 py-1 md:py-2 bg-black md:bg-white">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="md:hidden">
                      <MobileInput
                        label="First Name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder=""
                      />
                    </div>
                    <div className="hidden md:block">
                      <DesktopInput
                      label="First Name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder=""
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="md:hidden">
                      <MobileInput
                        label="Last Name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder=""
                      />
                    </div>
                    <div className="hidden md:block">
                      <DesktopInput
                      label="Last Name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder=""
                      />
                    </div>
                  </div>
                </div>

                {/* Mobile */}
                <div className="space-y-2">
                  <div className="md:hidden">
                    <MobileInput
                      label="Mobile Number"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder=""
                    />
                  </div>
                  <div className="hidden md:block">
                    <DesktopInput
                    label="Mobile Number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder=""
                    />
                  </div>
                </div>

                {/* Email (read-only) */}
                <div className="space-y-2">
                  <Input
                    label="Email"
                    value={currentEmail || ""}
                    isDisabled
                    variant="underlined"
                    labelPlacement="inside"
                    className="w-full"
                    classNames={{
                      base: "bg-transparent",
                      mainWrapper: "bg-transparent",
                      inputWrapper:
                        "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-gray-600 md:border-b-gray-300 border-x-0 border-t-0 opacity-60",
                      input: "bg-transparent text-base !text-white md:!text-slate-900",
                      label: "text-gray-300 md:text-slate-700 data-[inside=true]:text-gray-400 md:data-[inside=true]:text-slate-500",
                    }}
                  />
                  <p className="text-xs text-gray-400 md:text-muted-foreground">Email cannot be changed</p>
                </div>
              </div>
            </AccordionItem>

            {/* Notification Preferences */}
            <AccordionItem key="notifications" aria-label="Notification Preferences" title="Notification Preferences" classNames={{
              base: "border-t border-gray-300 md:border-t-[0.5px] md:border-gray-300",
              title: "text-sm md:text-base font-semibold md:font-semibold text-gray-300 md:text-foreground",
              content: "text-gray-300 md:text-foreground"
            }}>
              <div className="space-y-3 md:space-y-6 py-1 md:py-2 bg-black md:bg-white">
                <div className="space-y-3">
                  <div className="md:hidden">
                    <MobileDropdownMultiselect
                      value={notifyChannels}
                      options={channelOptions}
                      onChange={(vals) => setNotifyChannels(vals as ChannelChoice[])}
                      placeholder="Select channels"
                    />
                  </div>
                  <div className="hidden md:block">
                    <DesktopDropdownMultiselect
                    value={notifyChannels}
                    options={channelOptions}
                    onChange={(vals) => setNotifyChannels(vals as ChannelChoice[])}
                    placeholder="Select channels"
                  />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="md:hidden">
                    <MobileDropdownMultiselect
                      value={notifyOutageTypes}
                      options={outageOptions}
                      onChange={(vals) => setNotifyOutageTypes(vals as NotificationChoice[])}
                      placeholder="Select outage types"
                    />
                  </div>
                  <div className="hidden md:block">
                    <DesktopDropdownMultiselect
                    value={notifyOutageTypes}
                    options={outageOptions}
                    onChange={(vals) => setNotifyOutageTypes(vals as NotificationChoice[])}
                    placeholder="Select outage types"
                  />
                  </div>
                </div>
              </div>
            </AccordionItem>

            {/* Change Password */}
            <AccordionItem key="password" aria-label="Change Password" title="Change Password" classNames={{
              base: "border-t border-gray-300 md:border-t-[0.5px] md:border-gray-300",
              title: "text-sm md:text-base font-semibold md:font-semibold text-gray-300 md:text-foreground",
              content: "text-gray-300 md:text-foreground"
            }}>
              <div className="space-y-3 md:space-y-4 py-1 md:py-2 bg-black md:bg-white">
                <p className="text-xs md:text-sm text-gray-400 md:text-muted-foreground">Enter your current password and a new password to change it</p>
                <div className="space-y-2">
                  <div className="md:hidden">
                    <MobileInput
                      label="Current Password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder=""
                    />
                  </div>
                  <div className="hidden md:block">
                    <DesktopInput
                      label="Current Password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder=""
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="md:hidden">
                    <MobileInput
                      label="New Password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder=""
                    />
                  </div>
                  <div className="hidden md:block">
                    <DesktopInput
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder=""
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="md:hidden">
                    <MobileInput
                      label="Confirm New Password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder=""
                    />
                  </div>
                  <div className="hidden md:block">
                    <DesktopInput
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder=""
                    />
                  </div>
                </div>
              </div>
            </AccordionItem>
          </Accordion>
        </div>

        <DialogFooter className="gap-2 md:gap-0">
          <Button variant="bordered" onClick={() => onOpenChange(false)} disabled={saving} className="text-xs md:text-sm text-white md:text-foreground border-gray-600 md:border-gray-200">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !firstName.trim() || !lastName.trim()} className="text-xs md:text-sm text-white md:text-foreground bg-[#FF8E32] md:bg-[hsl(var(--primary))] hover:bg-[#FFAA5B] md:hover:bg-[hsl(var(--primary))] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#FF8E32] md:disabled:hover:bg-[hsl(var(--primary))]">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

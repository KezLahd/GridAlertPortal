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
import { Button, Input } from "@/components/ui/heroui"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionItem } from "@/components/ui/heroui"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { ChevronsUpDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

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
  onChangePassword: (newPassword: string) => Promise<void>
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
      await onSave(firstName.trim(), lastName.trim(), mobile.trim())
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
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setChangingPassword(true)
    setError(null)
    try {
      await onChangePassword(newPassword)
      setNewPassword("")
      setConfirmPassword("")
      setError(null)
    } catch (error: any) {
      setError(error.message || "Failed to change password")
    } finally {
      setChangingPassword(false)
    }
  }

  const toggleChannel = (channel: ChannelChoice) => {
    setNotifyChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    )
  }

  const toggleOutageType = (type: NotificationChoice) => {
    setNotifyOutageTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  // MultiSelect component for dropdowns
  function MultiSelect({
    value,
    options,
    onChange,
    placeholder,
  }: {
    value: string[]
    options: { value: string; label: string }[]
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
            type="button"
            variant="bordered"
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white">
        <DialogHeader>
          <DialogTitle>Edit Your Details</DialogTitle>
          <DialogDescription>Update your name, mobile number, or change your password</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4 bg-white">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Accordion Sections */}
          <Accordion defaultExpandedKeys={[]} selectionMode="single" className="w-full">
            {/* Personal Details */}
            <AccordionItem key="personal" aria-label="Personal Details" title="Personal Details">
              <div className="space-y-6 py-4 bg-white">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Input
                      label="First Name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder=""
                      variant="underlined"
                      labelPlacement="inside"
                      className="w-full"
                      classNames={{
                        base: "bg-transparent",
                        mainWrapper: "bg-transparent",
                        inputWrapper:
                          "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-orange-200 border-x-0 border-t-0 data-[hover=true]:border-b-orange-400 data-[focus=true]:border-b-orange-500 data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-0 data-[focus-visible=true]:ring-offset-0",
                        input: "bg-transparent text-base text-slate-900 placeholder:text-slate-500 caret-orange-500",
                        label: "text-slate-700 data-[inside=true]:text-slate-500",
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Input
                      label="Last Name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder=""
                      variant="underlined"
                      labelPlacement="inside"
                      className="w-full"
                      classNames={{
                        base: "bg-transparent",
                        mainWrapper: "bg-transparent",
                        inputWrapper:
                          "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-orange-200 border-x-0 border-t-0 data-[hover=true]:border-b-orange-400 data-[focus=true]:border-b-orange-500 data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-0 data-[focus-visible=true]:ring-offset-0",
                        input: "bg-transparent text-base text-slate-900 placeholder:text-slate-500 caret-orange-500",
                        label: "text-slate-700 data-[inside=true]:text-slate-500",
                      }}
                    />
                  </div>
                </div>

                {/* Mobile */}
                <div className="space-y-2">
                  <Input
                    label="Mobile Number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder=""
                    variant="underlined"
                    labelPlacement="inside"
                    className="w-full"
                    classNames={{
                      base: "bg-transparent",
                      mainWrapper: "bg-transparent",
                      inputWrapper:
                        "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-orange-200 border-x-0 border-t-0 data-[hover=true]:border-b-orange-400 data-[focus=true]:border-b-orange-500 data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-0 data-[focus-visible=true]:ring-offset-0",
                      input: "bg-transparent text-base text-slate-900 placeholder:text-slate-500 caret-orange-500",
                      label: "text-slate-700 data-[inside=true]:text-slate-500",
                    }}
                  />
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
                        "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-gray-300 border-x-0 border-t-0 opacity-60",
                      input: "bg-transparent text-base text-slate-900",
                      label: "text-slate-700 data-[inside=true]:text-slate-500",
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
              </div>
            </AccordionItem>

            {/* Notification Preferences */}
            <AccordionItem key="notifications" aria-label="Notification Preferences" title="Notification Preferences">
              <div className="space-y-6 py-4 bg-white">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Notification Channels</Label>
                  <MultiSelect
                    value={notifyChannels}
                    options={channelOptions}
                    onChange={(vals) => setNotifyChannels(vals as ChannelChoice[])}
                    placeholder="Select channels"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Outage Types</Label>
                  <MultiSelect
                    value={notifyOutageTypes}
                    options={outageOptions}
                    onChange={(vals) => setNotifyOutageTypes(vals as NotificationChoice[])}
                    placeholder="Select outage types"
                  />
                </div>

                <Button
                  type="button"
                  variant="bordered"
                  onClick={handleUpdateNotifications}
                  disabled={updatingNotifications || notifyChannels.length === 0 || notifyOutageTypes.length === 0}
                  className="w-full"
                >
                  {updatingNotifications ? "Updating..." : "Update Notification Preferences"}
                </Button>
              </div>
            </AccordionItem>

            {/* Change Password */}
            <AccordionItem key="password" aria-label="Change Password" title="Change Password">
              <div className="space-y-4 py-4 bg-white">
                <p className="text-sm text-muted-foreground">Enter a new password to change your current one</p>
                <div className="space-y-2">
                  <Input
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder=""
                    variant="underlined"
                    labelPlacement="inside"
                    className="w-full"
                    classNames={{
                      base: "bg-transparent",
                      mainWrapper: "bg-transparent",
                      inputWrapper:
                        "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-orange-200 border-x-0 border-t-0 data-[hover=true]:border-b-orange-400 data-[focus=true]:border-b-orange-500 data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-0 data-[focus-visible=true]:ring-offset-0",
                      input: "bg-transparent text-base text-slate-900 placeholder:text-slate-500 caret-orange-500",
                      label: "text-slate-700 data-[inside=true]:text-slate-500",
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder=""
                    variant="underlined"
                    labelPlacement="inside"
                    className="w-full"
                    classNames={{
                      base: "bg-transparent",
                      mainWrapper: "bg-transparent",
                      inputWrapper:
                        "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-orange-200 border-x-0 border-t-0 data-[hover=true]:border-b-orange-400 data-[focus=true]:border-b-orange-500 data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-0 data-[focus-visible=true]:ring-offset-0",
                      input: "bg-transparent text-base text-slate-900 placeholder:text-slate-500 caret-orange-500",
                      label: "text-slate-700 data-[inside=true]:text-slate-500",
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="bordered"
                  onClick={handleChangePassword}
                  disabled={changingPassword || !newPassword || newPassword !== confirmPassword}
                  className="w-full"
                >
                  {changingPassword ? "Changing Password..." : "Change Password"}
                </Button>
              </div>
            </AccordionItem>
          </Accordion>
        </div>

        <DialogFooter>
          <Button variant="bordered" onClick={() => onOpenChange(false)} disabled={saving || changingPassword || updatingNotifications}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || changingPassword || updatingNotifications || !firstName.trim() || !lastName.trim()}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

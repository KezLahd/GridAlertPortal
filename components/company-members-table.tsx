"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
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
  companyBgColor?: string
  companyTextColor?: string
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
          className="w-full justify-between rounded-none border-0 border-b-2 border-gray-600 md:border-gray-200 bg-black md:bg-white px-2 py-3 text-sm text-white md:text-slate-900 shadow-none hover:bg-gray-900 md:hover:bg-white focus:border-orange-500 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:border-orange-500 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <span className="truncate text-white md:text-slate-900">{display}</span>
          <ChevronsUpDown className="h-4 w-4 opacity-60 text-white md:text-slate-900" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[320px] bg-black md:bg-white border-gray-800 md:border-[hsl(var(--border))]">
        <Command>
          <CommandEmpty className="text-gray-400 md:text-muted-foreground">No results.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  onSelect={() => toggle(opt.value)}
                  className="flex items-center gap-2 bg-black md:bg-white text-white md:text-foreground hover:!bg-gray-700 md:hover:!bg-muted/70 data-[highlighted]:!bg-gray-700 md:data-[highlighted]:!bg-muted/70 data-[highlighted]:!text-white md:data-[highlighted]:!text-foreground data-[selected]:bg-gray-700 md:data-[selected]:bg-white data-[selected]:text-white md:data-[selected]:text-foreground"
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

export function CompanyMembersTable({ members, onUpdateMember, onDeleteMember, saving, currentUserId, currentUserRole = "member", companyBgColor, companyTextColor }: CompanyMembersTableProps) {
  const [editMember, setEditMember] = useState<MemberRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState<MemberRecord | null>(null)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [isMobile, setIsMobile] = useState(false)
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number; memberId: string } | null>(null)
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number } | null>(null)
  const [selectionOrder, setSelectionOrder] = useState<string[]>([]) // Track selection order
  const isAdmin = currentUserRole === "admin"

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Update popover coordinates when selection changes
  useEffect(() => {
    if (!isMobile || !isAdmin || !popoverPosition?.memberId) {
      setPopoverCoords(null)
      return
    }
    
    const updatePosition = () => {
      const rowElement = document.querySelector(`[data-member-id="${popoverPosition.memberId}"]`) as HTMLElement
      if (rowElement) {
        // Find the first data column (Member column) in this row
        const firstColumn = rowElement.querySelector('[data-first-column="true"]') as HTMLElement
        if (firstColumn) {
          const rect = firstColumn.getBoundingClientRect()
          setPopoverCoords({
            top: rect.bottom + 4,
            left: rect.left
          })
        } else {
          // Fallback to row position
          const rect = rowElement.getBoundingClientRect()
          setPopoverCoords({
            top: rect.bottom + 4,
            left: rect.left + 8
          })
        }
      }
    }
    
    // Small delay to ensure DOM is updated
    const timeoutId = setTimeout(() => {
      updatePosition()
    }, 50)
    
    // Update on scroll/resize
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [popoverPosition, isMobile, isAdmin, selectedRows])

  // Close popover when clicking outside
  useEffect(() => {
    if (!popoverPosition || !isMobile) return
    
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement
      // Don't close if clicking on the popover itself or buttons inside it
      const isPopoverContent = target.closest('[class*="shadow-lg"]')
      const isPopoverButton = target.closest('button') && target.closest('[class*="bg-gray-900"]')
      
      if (!isPopoverContent && !isPopoverButton) {
        setPopoverPosition(null)
      }
    }

    // Use setTimeout to avoid immediate trigger from the touch that opened it
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true)
      document.addEventListener('touchstart', handleClickOutside, true)
    }, 150)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleClickOutside, true)
      document.removeEventListener('touchstart', handleClickOutside, true)
    }
  }, [popoverPosition, isMobile])

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

  const handleSelectRow = (memberId: string) => {
    const newSelected = new Set(selectedRows)
    const wasSelected = newSelected.has(memberId)
    
    if (wasSelected) {
      // Deselecting
      newSelected.delete(memberId)
      // Remove from selection order
      const newSelectionOrder = selectionOrder.filter(id => id !== memberId)
      setSelectionOrder(newSelectionOrder)
      
      // If this was the popover row, move popover to the previously most recently selected row
      if (popoverPosition?.memberId === memberId) {
        if (newSelectionOrder.length > 0 && isMobile) {
          // Show popover on the last item in selection order (most recently selected remaining row)
          const newPopoverRowId = newSelectionOrder[newSelectionOrder.length - 1]
          setPopoverPosition({
            top: 0,
            left: 0,
            memberId: newPopoverRowId
          })
        } else {
          setPopoverPosition(null)
        }
      }
    } else {
      // Selecting
      newSelected.add(memberId)
      // Add to selection order (append to end)
      const newSelectionOrder = [...selectionOrder, memberId]
      setSelectionOrder(newSelectionOrder)
      
      // Set popover position when selecting on mobile
      if (isMobile) {
        setPopoverPosition({
          top: 0,
          left: 0,
          memberId: memberId
        })
      }
    }
    setSelectedRows(newSelected)
  }
  
  // Clean up selectionOrder to only include IDs that are still selected
  useEffect(() => {
    const validSelectionOrder = selectionOrder.filter(id => selectedRows.has(id))
    if (validSelectionOrder.length !== selectionOrder.length) {
      setSelectionOrder(validSelectionOrder)
    }
  }, [selectedRows, selectionOrder])

  const handleDeleteSelected = async () => {
    if (!onDeleteMember || selectedRows.size === 0) return
    const idsToDelete = Array.from(selectedRows)
    if (idsToDelete.length === 1) {
      const member = members.find((m) => m.user_id === idsToDelete[0])
      if (member) {
        setMemberToDelete(member)
        setDeleteConfirmOpen(true)
      }
    } else {
      // For multiple, show confirmation for first one as representative
      const member = members.find((m) => m.user_id === idsToDelete[0])
      if (member) {
        setMemberToDelete(member)
        setDeleteConfirmOpen(true)
      }
    }
  }

  const handleConfirmDelete = async () => {
    if (!onDeleteMember) return
    const idsToDelete = Array.from(selectedRows)
    if (idsToDelete.length === 0) return

    setDeleting(true)
    try {
      // Delete all selected members
      for (const id of idsToDelete) {
        await onDeleteMember(id)
      }
      setSelectedRows(new Set())
      setSelectionOrder([])
      setDeleteConfirmOpen(false)
      setMemberToDelete(null)
      setPopoverPosition(null)
    } catch (error) {
      console.error("Failed to delete member(s):", error)
      throw error
    } finally {
      setDeleting(false)
    }
  }

  const handleEditSelected = () => {
    if (selectedRows.size !== 1) return
    const selectedId = Array.from(selectedRows)[0]
    const member = members.find((m) => m.user_id === selectedId)
    if (member) {
      setEditMember(member)
      setPopoverPosition(null)
    }
  }


  return (
    <>
      <Card className="bg-black md:bg-[hsl(var(--card))] border-gray-900 md:border-[hsl(var(--border))]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardDescription className="hidden md:block">Manage your team's access and notification preferences</CardDescription>
            </div>
            {isAdmin && (
              <div className="hidden md:flex gap-2">
                {selectedRows.size === 1 && (
                  <Button 
                    onClick={handleEditSelected} 
                    disabled={saving} 
                    variant="outline" 
                    className="text-xs md:text-sm h-8 md:h-10 border-gray-700 md:border-[hsl(var(--border))] text-white md:text-foreground hover:bg-gray-800 md:hover:bg-muted"
                  >
                    Edit
                  </Button>
                )}
                {selectedRows.size > 0 && (
                  <Button
                    onClick={handleDeleteSelected}
                    disabled={deleting || saving}
                    variant="outline"
                    className="text-xs md:text-sm h-8 md:h-10 border-red-500 text-red-400 md:text-red-600 hover:bg-red-900/20 md:hover:bg-red-50 hover:text-red-300 md:hover:text-red-700 bg-transparent"
                  >
                    <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Delete ({selectedRows.size})</span>
                    <span className="sm:hidden">({selectedRows.size})</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border-0 md:border border-gray-900 md:border-[hsl(var(--border))] overflow-visible">
            <div className="overflow-visible">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-900 md:bg-gray-100 border-gray-900 md:border-[hsl(var(--border))]">
                  {isAdmin && <TableHead className="w-12 hidden md:table-cell"></TableHead>}
                  <TableHead className="font-semibold text-gray-300 md:text-foreground uppercase text-sm py-3">TEAM MEMBER</TableHead>
                  <TableHead className="font-semibold text-gray-300 md:text-foreground uppercase text-sm py-3">Role</TableHead>
                  <TableHead className="font-semibold text-gray-300 md:text-foreground uppercase text-sm py-3">Regions</TableHead>
                  <TableHead className="font-semibold text-gray-300 md:text-foreground uppercase text-sm py-3 min-w-[240px]">Providers</TableHead>
                  <TableHead className="font-semibold text-gray-300 md:text-foreground uppercase text-sm py-3">Outage Types</TableHead>
                  <TableHead className="text-right font-semibold text-gray-300 md:text-foreground uppercase text-sm py-3 hidden md:table-cell">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const name = getMemberName(member)
                  const isSelected = selectedRows.has(member.user_id)
                  return (
                    <TableRow 
                      key={member.user_id}
                      data-member-id={member.user_id}
                      className={`border-gray-900 md:border-[hsl(var(--border))] ${isSelected ? "bg-[#FF8E32]/30 md:bg-blue-50 hover:!bg-[#FF8E32]/30 md:hover:!bg-blue-50" : "bg-gray-800 md:bg-transparent hover:!bg-gray-800 md:hover:!bg-transparent"} ${isAdmin ? "md:cursor-pointer cursor-pointer" : ""}`}
                      style={{
                        WebkitTapHighlightColor: 'transparent',
                        userSelect: 'none',
                      } as React.CSSProperties}
                      onClick={isAdmin ? (e) => {
                        // Don't trigger if clicking the checkbox button itself
                        if ((e.target as HTMLElement).closest('button[type="button"]')) {
                          return
                        }
                        handleSelectRow(member.user_id)
                      } : undefined}
                    >
                      {isAdmin && (
                        <TableCell className="w-12 hidden md:table-cell">
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSelectRow(member.user_id)
                              }}
                              className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] transition-colors ${
                                isSelected
                                  ? "border-[#FF8E32] bg-[#FF8E32] text-white"
                                  : "border-gray-800 md:border-gray-300 bg-black md:bg-white hover:border-gray-700 md:hover:border-gray-400"
                              }`}
                            >
                              {isSelected && (
                                <svg
                                  className="h-3 w-3"
                                  fill="none"
                                  strokeWidth={3}
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="font-medium text-white md:text-foreground" data-first-column="true">
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
                            <div className="text-sm text-gray-400 md:text-muted-foreground">{member.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-white md:text-foreground">
                        <Badge 
                          variant="secondary" 
                          className="capitalize border-gray-800 md:border-[hsl(var(--border))]"
                          style={{
                            backgroundColor: member.role === "admin" 
                              ? (companyTextColor || "#ffffff") 
                              : (companyBgColor || "#f97316"),
                            color: member.role === "admin" 
                              ? (companyBgColor || "#f97316") 
                              : (companyTextColor || "#ffffff"),
                          }}
                        >
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white md:text-foreground">
                        {isAdmin || member.user_id === currentUserId ? (
                          member.region_access.length === regionOptions.length ? (
                            <span className="text-white md:text-foreground text-sm">All States</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {member.region_access.slice(0, 3).map((region) => (
                                <Badge key={region} variant="outline" className="text-xs border-gray-800 md:border-[hsl(var(--border))] text-white md:text-foreground">
                                  {region}
                                </Badge>
                              ))}
                              {member.region_access.length > 3 && (
                                <Badge variant="outline" className="text-xs border-gray-800 md:border-[hsl(var(--border))] text-white md:text-foreground">
                                  +{member.region_access.length - 3}
                                </Badge>
                              )}
                            </div>
                          )
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-xs border-gray-800 md:border-[hsl(var(--border))] text-white md:text-foreground opacity-50">—</Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="min-w-[240px]">
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
                            <div className="h-6 w-6 rounded-full bg-gray-800 md:bg-gray-300 flex items-center justify-center text-white text-xs font-bold opacity-50">
                              —
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-white md:text-foreground">
                        {member.user_id === currentUserId ? (
                          <div className="flex flex-wrap gap-1">
                            {member.notify_outage_types.map((type) => (
                              <Badge key={type} variant="outline" className="text-xs capitalize border-gray-800 md:border-[hsl(var(--border))] text-white md:text-foreground">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-xs border-gray-800 md:border-[hsl(var(--border))] text-white md:text-foreground opacity-50">—</Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        {(isAdmin || member.user_id === currentUserId) && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditMember(member)
                            }} 
                            className="text-white md:text-foreground hover:bg-gray-900 md:hover:bg-muted"
                          >
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
          </div>
          
          {/* Mobile: Popover portal - renders outside table */}
          {isAdmin && isMobile && popoverPosition && popoverCoords && selectedRows.has(popoverPosition.memberId) && typeof window !== 'undefined' 
            ? createPortal(
                <div 
                  className="fixed z-[9999]"
                  style={{
                    top: `${popoverCoords.top}px`,
                    left: `${popoverCoords.left}px`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-auto min-w-[140px] max-w-[200px] p-1 bg-gray-900 border border-gray-800 rounded-md shadow-lg">
                    <div className="flex flex-col gap-1">
                      {selectedRows.size === 1 && selectedRows.has(popoverPosition.memberId) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-white hover:bg-gray-800 h-8 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditSelected()
                            setPopoverPosition(null)
                          }}
                        >
                          Edit
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-red-400 hover:bg-red-900/20 h-8 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteSelected()
                          setPopoverPosition(null)
                        }}
                      >
                        {selectedRows.size > 1 ? `Delete ${selectedRows.size} members` : 'Delete'}
                      </Button>
                    </div>
                  </div>
                </div>,
                document.body
              )
            : null}
        </CardContent>
      </Card>

      {/* Edit Member Dialog */}
      <Dialog open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)}>
        <DialogContent className="max-w-2xl p-0 gap-0 border-0 bg-black md:bg-white">
        <DialogTitle className="sr-only">Edit Member Permissions</DialogTitle>
          <div className="relative bg-black md:bg-white rounded-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-black md:bg-white z-10 border-b border-gray-800 md:border-[hsl(var(--border))] px-8 py-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white md:text-foreground">
                  {isAdmin && editMember && editMember.user_id !== currentUserId
                    ? "Edit Member Permissions"
                    : "Edit Your Preferences"}
                </h2>
                <p className="text-sm text-gray-400 md:text-muted-foreground mt-1">
                  {isAdmin && editMember && editMember.user_id !== currentUserId
                    ? `Manage ${editMember && getMemberName(editMember)}'s access and notification settings`
                    : "Manage your access and notification settings"}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white md:text-foreground hover:bg-gray-800 md:hover:bg-gray-100" onClick={() => setEditMember(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {editMember && (
              <div className="px-8 py-6 space-y-6 bg-black md:bg-white">
                {isAdmin && editMember.user_id !== currentUserId && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-300 md:text-slate-900">Role</Label>
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
                    <Label className="text-sm font-medium text-gray-300 md:text-slate-900">Region Access</Label>
                    <MultiSelect
                      value={editMember.region_access}
                      options={regionOptions.map((r) => ({ value: r, label: r }))}
                      onChange={(vals) => setEditMember({ ...editMember, region_access: vals })}
                      placeholder="Select regions"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-300 md:text-slate-900">Energy Providers</Label>
                    <MultiSelect
                      value={editMember.notify_providers}
                      options={providerOptions.map((p) => ({ value: p.value, label: p.label }))}
                      onChange={(vals) => setEditMember({ ...editMember, notify_providers: vals as ProviderChoice[] })}
                      placeholder="Select providers"
                      renderDisplay={(value, options) => {
                        if (value.length === 0) return <span className="text-white md:text-slate-900">Select providers</span>
                        if (value.length === options.length) {
                          return (
                              <div className="flex items-center gap-2">
                              <span className="text-white md:text-slate-900">All</span>
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
                        return <span className="text-white md:text-slate-900">{options
                          .filter((o) => value.includes(o.value))
                          .sort((a, b) => a.label.localeCompare(b.label))
                          .map((o) => o.label)
                          .join(", ")}</span>
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
                <Button 
                  variant="outline" 
                  onClick={() => setEditMember(null)}
                  className="bg-[#FF8E32] hover:bg-[#FFAA5B] text-black border-0"
                >
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
          onConfirm={handleConfirmDelete}
          deleting={deleting}
        />
      )}

    </>
  )
}

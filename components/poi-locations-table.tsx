"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import type React from "react"
import { createPortal } from "react-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MapPin, ChevronUp, ChevronDown, Search, Trash2, Filter, X } from "lucide-react"
import { Pagination } from "@heroui/react"
import { PoiDeleteDialog } from "@/components/poi-delete-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export interface PoiLocation {
  id: string
  institution_code: string | null
  poi_name: string | null
  street_address: string | null
  city: string | null
  state: string | null
  postcode: string | null
  country: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  latitude: number | null
  longitude: number | null
  created_at: string
  institutionstatus?: string | null
  provider?: string | null
}

interface PoiLocationsTableProps {
  locations: PoiLocation[]
  onAddPoi: () => void
  onImportCsv?: () => void
  loading?: boolean
  isAdmin?: boolean
  onEditPoi?: (location: PoiLocation) => void
  onDeletePoi?: (locationIds: string[]) => Promise<void>
  statusFilter: string // Added statusFilter prop
  onStatusFilterChange: (filter: string) => void // Added filter change handler
}

type SortField =
  | "centre_number"
  | "institution_name"
  | "state"
  | "postcode"
  | "contact_email"
  | "contact_phone"
  | "provider"
type SortDirection = "asc" | "desc"

export function PoiLocationsTable({
  locations,
  onAddPoi,
  onImportCsv,
  loading = false,
  isAdmin = false,
  onEditPoi,
  onDeletePoi,
  statusFilter, // Destructure new props
  onStatusFilterChange, // Destructure new props
}: PoiLocationsTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [sortField, setSortField] = useState<SortField>("centre_number")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number; locationId: string } | null>(null)
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number } | null>(null)
  const [selectionOrder, setSelectionOrder] = useState<string[]>([]) // Track selection order

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Clean up selectionOrder to only include IDs that are still selected
  useEffect(() => {
    const validSelectionOrder = selectionOrder.filter(id => selectedRows.has(id))
    if (validSelectionOrder.length !== selectionOrder.length) {
      setSelectionOrder(validSelectionOrder)
    }
  }, [selectedRows, selectionOrder])

  // Update popover coordinates when selection changes
  useEffect(() => {
    if (!isMobile || !isAdmin || !popoverPosition?.locationId) {
      setPopoverCoords(null)
      return
    }
    
    const updatePosition = () => {
      const rowElement = document.querySelector(`[data-location-id="${popoverPosition.locationId}"]`) as HTMLElement
      if (rowElement) {
        // Find the first data column (Centre Number column) in this row
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
    
    // Small delay to ensure DOM is updated after selection
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

  const filteredLocations = useMemo(() => {
    // First filter by status
    let statusFiltered = locations
    if (statusFilter !== "ALL") {
      statusFiltered = locations.filter((location) => {
        const locationStatus = location.institutionstatus?.toUpperCase() || ""
        return locationStatus === statusFilter.toUpperCase()
      })
    }

    // Then filter by search query
    const query = searchQuery.trim().toLowerCase()
    if (!query) return statusFiltered

    return statusFiltered.filter((location) => {
      const centreNumber = location.institution_code ? `C${location.institution_code}` : ""
      const institutionName = location.poi_name || ""
      const state = location.state || ""
      const postcode = location.postcode || ""
      const email = location.contact_email || ""
      const phone = location.contact_phone || ""

      return (
        centreNumber.toLowerCase().includes(query) ||
        institutionName.toLowerCase().includes(query) ||
        state.toLowerCase().includes(query) ||
        postcode.toLowerCase().includes(query) ||
        email.toLowerCase().includes(query) ||
        phone.toLowerCase().includes(query)
      )
    })
  }, [locations, searchQuery, statusFilter])

  const sortedLocations = useMemo(() => {
    return [...filteredLocations].sort((a, b) => {
      let valA: any
      let valB: any

      switch (sortField) {
        case "centre_number":
          const getNumericCode = (code: string | null): number => {
            if (!code) return Number.POSITIVE_INFINITY
            const numeric = Number.parseInt(code.replace(/\D/g, ""), 10)
            return isNaN(numeric) ? Number.POSITIVE_INFINITY : numeric
          }
          valA = getNumericCode(a.institution_code)
          valB = getNumericCode(b.institution_code)
          return sortDirection === "asc" ? valA - valB : valB - valA

        case "institution_name":
          valA = (a.poi_name || "").toLowerCase()
          valB = (b.poi_name || "").toLowerCase()
          break

        case "state":
          valA = (a.state || "").toLowerCase()
          valB = (b.state || "").toLowerCase()
          break

        case "postcode":
          valA = (a.postcode || "").toLowerCase()
          valB = (b.postcode || "").toLowerCase()
          break

        case "contact_email":
          valA = (a.contact_email || "").toLowerCase()
          valB = (b.contact_email || "").toLowerCase()
          break

        case "contact_phone":
          valA = (a.contact_phone || "").toLowerCase()
          valB = (b.contact_phone || "").toLowerCase()
          break

        case "provider":
          valA = (a.provider || "").toLowerCase()
          valB = (b.provider || "").toLowerCase()
          break

        default:
          return 0
      }

      if (valA === undefined || valA === null) valA = ""
      if (valB === undefined || valB === null) valB = ""

      if (valA < valB) return sortDirection === "asc" ? -1 : 1
      if (valA > valB) return sortDirection === "asc" ? 1 : -1
      return 0
    })
  }, [filteredLocations, sortField, sortDirection])

  const { rowsPerPage, totalPages, startIndex, endIndex, paginatedLocations } = useMemo(() => {
    const rowsPerPage = isMobile ? 10 : 25
    const totalPages = Math.ceil(sortedLocations.length / rowsPerPage)
    const startIndex = (currentPage - 1) * rowsPerPage
    const endIndex = Math.min(startIndex + rowsPerPage, sortedLocations.length)
    const paginatedLocations = sortedLocations.slice(startIndex, endIndex)
    return { rowsPerPage, totalPages, startIndex, endIndex, paginatedLocations }
  }, [sortedLocations, isMobile, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortField, sortDirection, statusFilter]) // Added statusFilter to dependencies


  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const handleSelectRow = (locationId: string) => {
    const newSelected = new Set(selectedRows)
    const wasSelected = newSelected.has(locationId)
    
    if (wasSelected) {
      // Deselecting
      newSelected.delete(locationId)
      // Remove from selection order
      const newSelectionOrder = selectionOrder.filter(id => id !== locationId)
      setSelectionOrder(newSelectionOrder)
      
      // If this was the popover row, move popover to the previously most recently selected row
      if (popoverPosition?.locationId === locationId) {
        if (newSelectionOrder.length > 0 && isMobile) {
          // Show popover on the last item in selection order (most recently selected remaining row)
          const newPopoverRowId = newSelectionOrder[newSelectionOrder.length - 1]
          setPopoverPosition({
            top: 0,
            left: 0,
            locationId: newPopoverRowId
          })
        } else {
          setPopoverPosition(null)
        }
      }
    } else {
      // Selecting
      newSelected.add(locationId)
      // Add to selection order (append to end)
      const newSelectionOrder = [...selectionOrder, locationId]
      setSelectionOrder(newSelectionOrder)
      
      // Set popover position when selecting on mobile
      if (isMobile) {
        setPopoverPosition({
          top: 0,
          left: 0,
          locationId: locationId
        })
      }
    }
    setSelectedRows(newSelected)
  }

  const handleDeleteSelected = async () => {
    if (!onDeletePoi || selectedRows.size === 0) return

    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    console.log("handleConfirmDelete called, selectedRows:", Array.from(selectedRows))
    
    if (!onDeletePoi) {
      console.error("onDeletePoi is not defined")
      return
    }
    
    if (selectedRows.size === 0) {
      console.error("No rows selected")
      return
    }

    setIsDeleting(true)
    try {
      // Pass all selected IDs at once for bulk delete
      const idsToDelete = Array.from(selectedRows)
      console.log("Calling onDeletePoi with IDs:", idsToDelete)
      await onDeletePoi(idsToDelete)
      console.log("Delete completed successfully")
      setSelectedRows(new Set())
      setSelectionOrder([]) // Clear selection order
    } catch (error) {
      console.error("Failed to delete POIs:", error)
      throw error
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSelectAll = () => {
    // Force select all - overwrite any manual selections
    const allIds = new Set(sortedLocations.map((l) => l.id))
    const allIdsArray = sortedLocations.map((l) => l.id)
    setSelectedRows(allIds)
    setSelectionOrder(allIdsArray) // Set selection order to all IDs in order
    setOpenMenuId(null)
    setOpenPopoverId(null)
    // Set popover position at first row when select all
    if (isMobile && sortedLocations.length > 0) {
      setPopoverPosition({
        top: 0,
        left: 0,
        locationId: sortedLocations[0].id
      })
    } else {
      setPopoverPosition(null)
    }
  }

  const handleUnselectAll = () => {
    // Force unselect all - clear everything
    setSelectedRows(new Set())
    setSelectionOrder([]) // Clear selection order
    setOpenMenuId(null)
    setOpenPopoverId(null)
    setPopoverPosition(null)
  }

  const handleEdit = () => {
    if (!onEditPoi || selectedRows.size !== 1) return
    const selectedId = Array.from(selectedRows)[0]
    const location = sortedLocations.find((l) => l.id === selectedId)
    if (location) {
      onEditPoi(location)
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="w-4 h-4 ml-1 opacity-30" />
    return sortDirection === "asc" ? (
      <ChevronUp className="w-4 h-4 ml-1 text-primary" />
    ) : (
      <ChevronDown className="w-4 h-4 ml-1 text-primary" />
    )
  }

  const allSelected = sortedLocations.length > 0 && selectedRows.size === sortedLocations.length

  const getFilterLabel = () => {
    switch (statusFilter) {
      case "ACTIVE":
        return "Active Locations"
      case "RESERVED":
        return "Reserved"
      case "RETIRED":
        return "Retired"
      case "ALL":
        return "All Locations"
      default:
        return "Active Locations"
    }
  }

  const getMobileFilterLabel = () => {
    switch (statusFilter) {
      case "ACTIVE":
        return "Active POIs"
      case "RESERVED":
        return "Reserved POIs"
      case "RETIRED":
        return "Retired POIs"
      case "ALL":
        return "All POIs"
      default:
        return "Active POIs"
    }
  }

  const getStatusColor = (status: string | null | undefined) => {
    if (!status) return "text-gray-600"
    const normalizedStatus = status.toUpperCase()
    if (normalizedStatus === "ACTIVE") return "text-green-600 font-semibold"
    if (normalizedStatus === "RESERVED") return "text-orange-600 font-semibold"
    if (normalizedStatus === "RETIRED") return "text-red-600 font-semibold"
    return "text-gray-600"
  }

  const getStatusBadgeVariant = (status: string) => {
    if (status === "ACTIVE") return "bg-green-100 text-green-700 hover:bg-green-100"
    if (status === "RESERVED") return "bg-orange-100 text-orange-700 hover:bg-orange-100"
    if (status === "RETIRED") return "bg-red-100 text-red-700 hover:bg-red-100"
    return "bg-gray-100 text-gray-700 hover:bg-gray-100"
  }

  const getMobileFilterButtonClass = () => {
    const base = "text-xs h-8 border-gray-800"
    
    switch (statusFilter) {
      case "ACTIVE":
        return `${base} bg-green-100 text-green-700 hover:bg-green-100`
      case "RESERVED":
        return `${base} bg-orange-100 text-orange-700 hover:bg-orange-100`
      case "RETIRED":
        return `${base} bg-red-100 text-red-700 hover:bg-red-100`
      case "ALL":
      default:
        return `${base} bg-gray-900 text-white hover:bg-gray-800`
    }
  }

  const getDesktopFilterButtonClass = () => {
    const base = "text-xs md:text-sm h-8 md:h-10 border-gray-800 md:border-[hsl(var(--border))] bg-gray-900 md:bg-transparent hover:bg-gray-800 md:hover:bg-muted text-white md:text-foreground"
    
    switch (statusFilter) {
      case "ACTIVE":
        return `${base} md:bg-green-100 md:text-green-700 md:hover:bg-green-100`
      case "RESERVED":
        return `${base} md:bg-orange-100 md:text-orange-700 md:hover:bg-orange-100`
      case "RETIRED":
        return `${base} md:bg-red-100 md:text-red-700 md:hover:bg-red-100`
      case "ALL":
      default:
        return base
    }
  }

  const getProviderBadgeClass = (provider: string): string => {
    const providerColors: Record<string, string> = {
      Ausgrid: "bg-blue-100 text-blue-800",
      Endeavour: "bg-green-100 text-green-800",
      Energex: "bg-cyan-100 text-lime-700 border-lime-200",
      Ergon: "bg-red-100 text-red-800",
      "SA Power": "bg-orange-100 text-orange-800",
      "Horizon Power": "bg-amber-100 text-amber-900",
      WPower: "bg-amber-200 text-black",
      AusNet: "bg-emerald-50 text-emerald-900 border-emerald-200",
      CitiPowerCor: "bg-blue-50 text-red-700 border-blue-200",
      "Essential Energy": "bg-orange-50 text-blue-700 border-orange-200",
      Jemena: "bg-cyan-50 text-indigo-900 border-cyan-200",
      UnitedEnergy: "bg-purple-100 text-purple-800 border-purple-200",
      TasNetworks: "bg-pink-100 text-pink-700 border-pink-200",
    }
    return providerColors[provider] || "bg-gray-100 text-gray-800"
  }

  return (
    <>
      <Card className="bg-black md:bg-[hsl(var(--card))] border-gray-900 md:border-[hsl(var(--border))]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="hidden md:block">
              <CardTitle className="text-foreground">Points of Interest (POIs)</CardTitle>
              <CardDescription>Locations you want to monitor for outages</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 flex-1 md:hidden">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" disabled={loading} className={getMobileFilterButtonClass()}>
                          <Filter className={`w-3 h-3 mr-1 ${statusFilter === "ALL" ? "text-white" : ""}`} />
                          <span className={statusFilter === "ALL" ? "text-white" : ""}>{getMobileFilterLabel()}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800 md:bg-popover md:border-border">
                        <DropdownMenuItem onClick={() => onStatusFilterChange("ACTIVE")} className="text-white md:text-foreground focus:bg-gray-800 md:focus:bg-accent">
                          <div className="flex items-center gap-2 w-full">
                            <Badge className={getStatusBadgeVariant("ACTIVE")}>Active</Badge>
                            {statusFilter === "ACTIVE" && <span className="ml-auto text-[#FF8E32] md:text-primary">✓</span>}
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStatusFilterChange("RESERVED")} className="text-white md:text-foreground focus:bg-gray-800 md:focus:bg-accent">
                          <div className="flex items-center gap-2 w-full">
                            <Badge className={getStatusBadgeVariant("RESERVED")}>Reserved</Badge>
                            {statusFilter === "RESERVED" && <span className="ml-auto text-[#FF8E32] md:text-primary">✓</span>}
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStatusFilterChange("RETIRED")} className="text-white md:text-foreground focus:bg-gray-800 md:focus:bg-accent">
                          <div className="flex items-center gap-2 w-full">
                            <Badge className={getStatusBadgeVariant("RETIRED")}>Retired</Badge>
                            {statusFilter === "RETIRED" && <span className="ml-auto text-[#FF8E32] md:text-primary">✓</span>}
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStatusFilterChange("ALL")} className="text-white md:text-foreground focus:bg-gray-800 md:focus:bg-accent">
                          <div className="flex items-center gap-2 w-full">
                            <span className="flex-1 text-white md:text-foreground">All Locations</span>
                            {statusFilter === "ALL" && <span className="text-[#FF8E32] md:text-primary">✓</span>}
                          </div>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button onClick={onAddPoi} disabled={loading || !isAdmin} variant="outline" className="text-xs h-8 border-gray-800 text-white bg-gray-900 hover:bg-gray-800">
                      <span className="text-white">Add</span>
                    </Button>
                    {isAdmin && (
                      <Button
                        onClick={allSelected ? handleUnselectAll : handleSelectAll}
                        disabled={loading || sortedLocations.length === 0}
                        variant="outline"
                        className="text-xs h-8 border-gray-800 text-white bg-gray-900 hover:bg-gray-800"
                      >
                        <span className="text-white">{allSelected ? "Unselect All" : "Select All"}</span>
                      </Button>
                    )}
                  </div>
              {/* Desktop: Always show controls */}
              <div className="hidden md:flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" disabled={loading} className={getDesktopFilterButtonClass()}>
                      <Filter className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                      <span>{getFilterLabel()}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onStatusFilterChange("ACTIVE")}>
                      <div className="flex items-center gap-2 w-full">
                        <Badge className={getStatusBadgeVariant("ACTIVE")}>Active</Badge>
                        {statusFilter === "ACTIVE" && <span className="ml-auto text-primary">✓</span>}
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onStatusFilterChange("RESERVED")}>
                      <div className="flex items-center gap-2 w-full">
                        <Badge className={getStatusBadgeVariant("RESERVED")}>Reserved</Badge>
                        {statusFilter === "RESERVED" && <span className="ml-auto text-primary">✓</span>}
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onStatusFilterChange("RETIRED")}>
                      <div className="flex items-center gap-2 w-full">
                        <Badge className={getStatusBadgeVariant("RETIRED")}>Retired</Badge>
                        {statusFilter === "RETIRED" && <span className="ml-auto text-primary">✓</span>}
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onStatusFilterChange("ALL")}>
                      <div className="flex items-center gap-2 w-full">
                        <span className="flex-1">All Locations</span>
                        {statusFilter === "ALL" && <span className="text-primary">✓</span>}
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {onImportCsv && (
                  <Button onClick={onImportCsv} disabled={loading || !isAdmin} variant="outline" className="text-xs md:text-sm h-8 md:h-10 border-gray-800 md:border-[hsl(var(--border))] text-white md:text-foreground hover:bg-gray-900 md:hover:bg-muted">
                    Import CSV
                  </Button>
                )}
                <Button onClick={onAddPoi} disabled={loading || !isAdmin} variant="outline" className="text-xs md:text-sm h-8 md:h-10 border-gray-800 md:border-[hsl(var(--border))] text-white md:text-foreground bg-gray-900 md:bg-transparent hover:bg-gray-800 md:hover:bg-muted">
                  <span className="hidden md:inline">Quick Add</span>
                </Button>
                {isAdmin && (
                  <Button
                    onClick={allSelected ? handleUnselectAll : handleSelectAll}
                    disabled={loading || sortedLocations.length === 0}
                    variant="outline"
                    className="text-xs md:text-sm h-8 md:h-10 border-gray-800 md:border-[hsl(var(--border))] text-white md:text-foreground hover:bg-gray-900 md:hover:bg-muted"
                  >
                    {allSelected ? "Unselect All" : "Select All"}
                  </Button>
                )}
                {isAdmin && selectedRows.size === 1 && (
                  <Button onClick={handleEdit} disabled={loading} variant="outline" className="text-xs md:text-sm h-8 md:h-10 border-gray-700 md:border-[hsl(var(--border))] text-white md:text-foreground hover:bg-gray-800 md:hover:bg-muted">
                    Edit
                  </Button>
                )}
                {isAdmin && selectedRows.size > 0 && (
                  <Button
                    onClick={handleDeleteSelected}
                    disabled={isDeleting || loading}
                    variant="outline"
                    className="text-xs md:text-sm h-8 md:h-10 border-red-500 text-red-400 md:text-red-600 hover:bg-red-900/20 md:hover:bg-red-50 hover:text-red-300 md:hover:text-red-700 bg-transparent"
                  >
                    <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Delete ({selectedRows.size})</span>
                    <span className="sm:hidden">({selectedRows.size})</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No POIs added yet. Click "Quick Add" to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                {/* Desktop: Always show search */}
                <div className="hidden md:block relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search POIs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background border-input text-foreground"
                  />
                </div>
                {totalPages > 1 && (
                  <div className="hidden md:flex items-center gap-4 bg-white/50 rounded-lg px-4 py-2">
                    <div className="text-sm text-muted-foreground">
                      Showing {startIndex + 1} to {endIndex} of {sortedLocations.length} locations
                    </div>
                    <Pagination
                      total={totalPages}
                      page={currentPage}
                      onChange={setCurrentPage}
                      isCompact
                      showControls={true}
                      siblings={1}
                      boundaries={1}
                    />
                  </div>
                )}
                {totalPages === 1 && filteredLocations.length > 0 && (
                  <div className="hidden md:block text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {endIndex} of {sortedLocations.length} locations
                  </div>
                )}
              </div>
              {/* Mobile: Text showing count - always visible */}
              {(totalPages > 1 || filteredLocations.length > 0) && (
                <div className="md:hidden text-sm text-gray-400">
                  Showing {startIndex + 1} to {endIndex} of {sortedLocations.length} locations
                </div>
              )}
              {/* Mobile: Pagination and Search */}
              <div className="md:hidden flex items-center justify-between gap-2">
                {totalPages > 1 && !isSearchExpanded && (
                  <div className="[&_.heroui-pagination-wrapper]:bg-black [&_button]:!bg-gray-900 [&_button]:!text-white [&_button]:!border-gray-800 [&_button[data-selected=true]]:!bg-[#FF8E32] [&_button[data-selected=true]]:!text-black [&_button[data-selected=true]]:!border-[#FF8E32] [&_span]:!text-white [&_svg]:!text-white [&_button[data-slot=prev]]:!hidden [&_button[data-slot=next]]:!hidden">
                    <Pagination
                      total={totalPages}
                      page={currentPage}
                      onChange={setCurrentPage}
                      isCompact
                      showControls={false}
                      siblings={1}
                      boundaries={1}
                      classNames={{
                        wrapper: "bg-black",
                        item: "bg-gray-900 text-white border-gray-800 data-[selected=true]:bg-[#FF8E32] data-[selected=true]:text-black data-[selected=true]:border-[#FF8E32]",
                      }}
                    />
                  </div>
                )}
                {isSearchExpanded ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      placeholder="Search POIs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={(e) => {
                        setTimeout(() => {
                          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }, 100)
                      }}
                      className="bg-black border-gray-600 text-white placeholder:text-gray-500 h-8"
                      style={{ fontSize: '16px' }}
                      autoFocus
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30 h-8"
                      onClick={() => {
                        setIsSearchExpanded(false)
                        setSearchQuery("")
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30 h-8"
                    onClick={() => setIsSearchExpanded(true)}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="rounded-md border-0 md:border md:border-[hsl(var(--border))] overflow-visible md:overflow-auto">
                <div className="overflow-visible">
                  <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-900 md:bg-gray-100 border-gray-900 md:border-[hsl(var(--border))]">
                      {isAdmin && <TableHead className="w-12 hidden md:table-cell"></TableHead>}
                      <TableHead className="font-semibold text-gray-300 md:text-foreground uppercase text-sm py-3">
                        <button className="flex items-center gap-1 text-gray-300 md:text-foreground" onClick={() => handleSort("centre_number")}>
                          Centre Number
                          <SortIcon field="centre_number" />
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-300 md:text-foreground uppercase text-sm py-3">
                        <button className="flex items-center gap-1 text-gray-300 md:text-foreground" onClick={() => handleSort("institution_name")}>
                          Institution Name
                          <SortIcon field="institution_name" />
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-300 md:text-foreground uppercase text-sm py-3">
                        <button className="flex items-center gap-1 text-gray-300 md:text-foreground" onClick={() => handleSort("provider")}>
                          Provider
                          <SortIcon field="provider" />
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-300 md:text-foreground uppercase text-sm py-3">
                        <button className="flex items-center gap-1 text-gray-300 md:text-foreground" onClick={() => handleSort("state")}>
                          State
                          <SortIcon field="state" />
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-300 md:text-foreground uppercase text-sm py-3">
                        <button className="flex items-center gap-1 text-gray-300 md:text-foreground" onClick={() => handleSort("postcode")}>
                          Postcode
                          <SortIcon field="postcode" />
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-300 md:text-foreground uppercase text-sm py-3">
                        <button className="flex items-center gap-1 text-gray-300 md:text-foreground" onClick={() => handleSort("contact_email")}>
                          Contact Email
                          <SortIcon field="contact_email" />
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-300 md:text-foreground uppercase text-sm py-3">
                        <button className="flex items-center gap-1 text-gray-300 md:text-foreground" onClick={() => handleSort("contact_phone")}>
                          Contact Phone
                          <SortIcon field="contact_phone" />
                        </button>
                      </TableHead>
                      {isAdmin && <TableHead className="w-16 hidden md:table-cell"></TableHead>}
                      {isAdmin && <TableHead className="w-12 md:hidden"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLocations.length === 0 ? (
                      <TableRow className="border-gray-900 md:border-[hsl(var(--border))]">
                        <TableCell colSpan={isAdmin ? 10 : 8} className="text-center py-8 text-gray-400 md:text-muted-foreground">
                          No locations found matching your search.
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {/* Mobile: Delete button popover above top row when all selected */}
                        {isAdmin && allSelected && paginatedLocations.length > 0 && (
                          <tr className="md:hidden relative">
                            <td colSpan={8} className="p-0">
                              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full pb-1">
                                <Popover open={openPopoverId === 'all-selected'} onOpenChange={(open) => setOpenPopoverId(open ? 'all-selected' : null)}>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 px-3 text-red-400 hover:bg-red-900/20 text-xs"
                                    >
                                      Delete ({selectedRows.size})
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-32 p-1 bg-gray-900 border-gray-800 md:hidden z-50" side="top" align="center" sideOffset={8}>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-full justify-start text-red-400 hover:bg-red-900/20 h-8 text-xs"
                                      onClick={() => {
                                        handleDeleteSelected()
                                        setOpenPopoverId(null)
                                      }}
                                    >
                                      Delete ({selectedRows.size})
                                    </Button>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </td>
                          </tr>
                        )}
                        {paginatedLocations.map((location) => (
                        <TableRow 
                          key={location.id}
                          data-location-id={location.id}
                          className={`border-gray-900 md:border-[hsl(var(--border))] ${selectedRows.has(location.id) ? "bg-[#FF8E32]/30 md:bg-blue-50 hover:!bg-[#FF8E32]/30 md:hover:!bg-blue-50" : "bg-gray-800 md:bg-transparent hover:!bg-gray-800 md:hover:!bg-transparent"} ${isAdmin ? "md:cursor-pointer cursor-pointer" : ""}`}
                          style={{
                            WebkitTapHighlightColor: 'transparent',
                            userSelect: 'none',
                          } as React.CSSProperties}
                          onClick={isAdmin ? (e) => {
                            // Don't trigger if clicking the checkbox button itself
                            if ((e.target as HTMLElement).closest('button[type="button"]')) {
                              return
                            }
                            handleSelectRow(location.id)
                          } : undefined}
                        >
                          {isAdmin && (
                            <TableCell className="w-12 hidden md:table-cell">
                              <div className="flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleSelectRow(location.id)
                                  }}
                                  className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] transition-colors ${
                                    selectedRows.has(location.id)
                                      ? "border-[#FF8E32] bg-[#FF8E32] text-white"
                                      : "border-gray-800 md:border-gray-300 bg-black md:bg-white hover:border-gray-700 md:hover:border-gray-400"
                                  }`}
                                >
                                  {selectedRows.has(location.id) && (
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
                            {location.institution_code ? (
                              <Badge className={getStatusBadgeVariant(location.institutionstatus || "")}>
                                C{location.institution_code}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-white md:text-foreground">{location.poi_name || "Unnamed POI"}</TableCell>
                          <TableCell>
                            {location.provider ? (
                              <Badge className={getProviderBadgeClass(location.provider)} variant="outline">
                                {location.provider}
                              </Badge>
                            ) : (
                              <span className="text-gray-400 md:text-muted-foreground italic">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-white md:text-foreground">{location.state || "—"}</TableCell>
                          <TableCell className="text-white md:text-foreground">{location.postcode || "—"}</TableCell>
                          <TableCell className="text-white md:text-foreground">{location.contact_email || "—"}</TableCell>
                          <TableCell className="text-white md:text-foreground">{location.contact_phone || "—"}</TableCell>
                          {isAdmin && (
                            <TableCell className="w-16 hidden md:table-cell"></TableCell>
                          )}
                          {isAdmin && (
                            <TableCell className="w-12 md:hidden">
                              {/* Hidden checkbox column on mobile - functionality handled by row click */}
                            </TableCell>
                          )}
                        </TableRow>
                        ))}
                      </>
                    )}
                  </TableBody>
                </Table>
                </div>
              </div>

              {totalPages > 1 && !isSearchExpanded && (
                <div className="hidden md:flex items-center justify-center pt-4">
                  <div className="bg-white/50 rounded-lg px-4 py-2">
                    <Pagination
                      total={totalPages}
                      page={currentPage}
                      onChange={setCurrentPage}
                      isCompact
                      showControls={true}
                      siblings={1}
                      boundaries={1}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <PoiDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        count={selectedRows.size}
        onConfirm={handleConfirmDelete}
      />
      
      {/* Mobile: Popover portal - renders outside table */}
      {isAdmin && isMobile && popoverPosition && popoverCoords && selectedRows.has(popoverPosition.locationId) && typeof window !== 'undefined' 
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
                  {selectedRows.size === 1 && selectedRows.has(popoverPosition.locationId) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-white hover:bg-gray-800 h-8 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit()
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
                    {selectedRows.size > 1 ? `Delete ${selectedRows.size} locations` : 'Delete'}
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}

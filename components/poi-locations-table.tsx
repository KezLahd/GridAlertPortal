"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MapPin, ChevronUp, ChevronDown, Search, Trash2, Filter } from "lucide-react"
import { Pagination } from "@heroui/react"
import { PoiDeleteDialog } from "@/components/poi-delete-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
  | "created_at"
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
  const [sortField, setSortField] = useState<SortField>("centre_number")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const rowsPerPage = 25

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

        case "created_at":
          valA = new Date(a.created_at).getTime()
          valB = new Date(b.created_at).getTime()
          return sortDirection === "asc" ? valA - valB : valB - valA

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

  const totalPages = Math.ceil(sortedLocations.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = Math.min(startIndex + rowsPerPage, sortedLocations.length)
  const paginatedLocations = sortedLocations.slice(startIndex, endIndex)

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
    if (newSelected.has(locationId)) {
      newSelected.delete(locationId)
    } else {
      newSelected.add(locationId)
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
    } catch (error) {
      console.error("Failed to delete POIs:", error)
      throw error
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSelectAll = () => {
    const newSelected = new Set(sortedLocations.map((l) => l.id))
    setSelectedRows(newSelected)
    setOpenMenuId(null)
  }

  const handleUnselectAll = () => {
    setSelectedRows(new Set())
    setOpenMenuId(null)
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Points of Interest (POIs)</CardTitle>
              <CardDescription>Locations you want to monitor for outages</CardDescription>
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={loading}>
                    <Filter className="w-4 h-4 mr-2" />
                    {getFilterLabel()}
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
                <Button onClick={onImportCsv} disabled={loading || !isAdmin} variant="outline">
                  Import CSV
                </Button>
              )}
              <Button onClick={onAddPoi} disabled={loading || !isAdmin} variant="outline">
                Quick Add
              </Button>
              {isAdmin && (
                <Button
                  onClick={allSelected ? handleUnselectAll : handleSelectAll}
                  disabled={loading || sortedLocations.length === 0}
                  variant="outline"
                >
                  {allSelected ? "Unselect All" : "Select All"}
                </Button>
              )}
              {isAdmin && selectedRows.size === 1 && (
                <Button onClick={handleEdit} disabled={loading} variant="outline">
                  Edit
                </Button>
              )}
              {isAdmin && selectedRows.size > 0 && (
                <Button
                  onClick={handleDeleteSelected}
                  disabled={isDeleting || loading}
                  variant="outline"
                  className="border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700 bg-transparent"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete ({selectedRows.size})
                </Button>
              )}
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
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search POIs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {startIndex + 1} to {endIndex} of {sortedLocations.length} locations
                    </div>
                    <Pagination
                      total={totalPages}
                      page={currentPage}
                      onChange={setCurrentPage}
                      isCompact
                      showControls
                      siblings={1}
                      boundaries={1}
                    />
                  </div>
                )}
                {totalPages === 1 && filteredLocations.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {endIndex} of {sortedLocations.length} locations
                  </div>
                )}
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      {isAdmin && <TableHead className="w-12"></TableHead>}
                      <TableHead className="font-semibold text-foreground uppercase text-sm py-3">
                        <button className="flex items-center gap-1" onClick={() => handleSort("centre_number")}>
                          Centre Number
                          <SortIcon field="centre_number" />
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold text-foreground uppercase text-sm py-3">
                        <button className="flex items-center gap-1" onClick={() => handleSort("institution_name")}>
                          Institution Name
                          <SortIcon field="institution_name" />
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold text-foreground uppercase text-sm py-3">
                        <button className="flex items-center gap-1" onClick={() => handleSort("state")}>
                          State
                          <SortIcon field="state" />
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold text-foreground uppercase text-sm py-3">
                        <button className="flex items-center gap-1" onClick={() => handleSort("postcode")}>
                          Postcode
                          <SortIcon field="postcode" />
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold text-foreground uppercase text-sm py-3">
                        <button className="flex items-center gap-1" onClick={() => handleSort("contact_email")}>
                          Contact Email
                          <SortIcon field="contact_email" />
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold text-foreground uppercase text-sm py-3">
                        <button className="flex items-center gap-1" onClick={() => handleSort("contact_phone")}>
                          Contact Phone
                          <SortIcon field="contact_phone" />
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold text-foreground uppercase text-sm py-3">
                        <button className="flex items-center gap-1" onClick={() => handleSort("created_at")}>
                          Added
                          <SortIcon field="created_at" />
                        </button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLocations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 9 : 8} className="text-center py-8 text-muted-foreground">
                          No locations found matching your search.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedLocations.map((location) => (
                        <TableRow key={location.id} className={selectedRows.has(location.id) ? "bg-blue-50" : ""}>
                          {isAdmin && (
                            <TableCell className="w-12">
                              <div className="flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleSelectRow(location.id)}
                                  className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] transition-colors ${
                                    selectedRows.has(location.id)
                                      ? "border-black bg-black text-orange-500"
                                      : "border-gray-300 bg-white hover:border-gray-400"
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
                          <TableCell className="font-medium">
                            {location.institution_code ? (
                              <Badge className={getStatusBadgeVariant(location.institutionstatus || "")}>
                                C{location.institution_code}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{location.poi_name || "Unnamed POI"}</TableCell>
                          <TableCell>{location.state || "—"}</TableCell>
                          <TableCell>{location.postcode || "—"}</TableCell>
                          <TableCell>{location.contact_email || "—"}</TableCell>
                          <TableCell>{location.contact_phone || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(location.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center pt-4">
                  <Pagination
                    total={totalPages}
                    page={currentPage}
                    onChange={setCurrentPage}
                    isCompact
                    showControls
                    siblings={1}
                    boundaries={1}
                  />
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
    </>
  )
}

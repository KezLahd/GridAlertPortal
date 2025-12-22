"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { MapPin, ChevronUp, ChevronDown, Search, Trash2, CheckSquare, Square } from "lucide-react"
import { Pagination } from "@heroui/react"

export interface PoiLocation {
  id: string
  institution_code: string | null // mapped from institutioncode
  poi_name: string | null // mapped from institutionname
  street_address: string | null // mapped from addressline1
  city: string | null // mapped from addresssuburb
  state: string | null // mapped from addressstate
  postcode: string | null // mapped from addresspostcode
  country: string | null
  contact_name: string | null
  contact_email: string | null // mapped from institutionemail
  contact_phone: string | null // mapped from institutionphoneno
  latitude: number | null // mapped from addresslatitude
  longitude: number | null // mapped from addresslongitude
  created_at: string
}

interface PoiLocationsTableProps {
  locations: PoiLocation[]
  onAddPoi: () => void
  onImportCsv?: () => void
  onDeletePoi?: (poiIds: string[]) => void
  loading?: boolean
  isAdmin?: boolean
}

type SortField = "centre_number" | "institution_name" | "state" | "postcode" | "contact_email" | "contact_phone" | "created_at"
type SortDirection = "asc" | "desc"

export function PoiLocationsTable({ locations, onAddPoi, onImportCsv, onDeletePoi, loading = false, isAdmin = false }: PoiLocationsTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<SortField>("centre_number")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const rowsPerPage = 25

  // Filter locations based on search query
  const filteredLocations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return locations

    return locations.filter((location) => {
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
  }, [locations, searchQuery])

  // Sort locations
  const sortedLocations = useMemo(() => {
    return [...filteredLocations].sort((a, b) => {
      let valA: any
      let valB: any

      switch (sortField) {
        case "centre_number":
          const getNumericCode = (code: string | null): number => {
            if (!code) return Infinity
            const numeric = parseInt(code.replace(/\D/g, ''), 10)
            return isNaN(numeric) ? Infinity : numeric
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

  // Paginate locations
  const totalPages = Math.ceil(sortedLocations.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = Math.min(startIndex + rowsPerPage, sortedLocations.length)
  const paginatedLocations = sortedLocations.slice(startIndex, endIndex)

  // Reset to page 1 when search or sort changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection("asc")
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

  // Row selection handlers
  const handleSelectRow = (poiId: string) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(poiId)) {
      newSelected.delete(poiId)
    } else {
      newSelected.add(poiId)
    }
    setSelectedRows(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedRows.size === paginatedLocations.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(paginatedLocations.map(location => location.id)))
    }
  }

  const handleDeleteSelected = () => {
    if (onDeletePoi && selectedRows.size > 0) {
      onDeletePoi(Array.from(selectedRows))
      setSelectedRows(new Set())
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Points of Interest (POIs)</CardTitle>
            <CardDescription>Locations you want to monitor for outages</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={onAddPoi} disabled={loading || !isAdmin} variant="outline">
              Quick Add
            </Button>
            {onImportCsv && (
              <Button onClick={onImportCsv} disabled={loading || !isAdmin} variant="outline">
                Import CSV
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
            {/* Bulk Actions */}
            {selectedRows.size > 0 && onDeletePoi && isAdmin && (
              <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <span className="text-sm font-medium text-orange-800">
                  {selectedRows.size} POI{selectedRows.size !== 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteSelected}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Selected
                  </Button>
                </div>
              </div>
            )}

            {/* Search Bar and Top Pagination */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {isAdmin && onDeletePoi && (
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {selectedRows.size === paginatedLocations.length && paginatedLocations.length > 0 ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    {selectedRows.size === paginatedLocations.length && paginatedLocations.length > 0 ? 'Deselect All' : 'Select All'}
                  </button>
                )}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search POIs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
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

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    {isAdmin && onDeletePoi && (
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedRows.size === paginatedLocations.length && paginatedLocations.length > 0}
                          onCheckedChange={handleSelectAll}
                          className="rounded-md"
                        />
                      </TableHead>
                    )}
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
                      <TableCell colSpan={isAdmin && onDeletePoi ? 8 : 7} className="text-center py-8 text-muted-foreground">
                        No locations found matching your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedLocations.map((location) => (
                      <TableRow key={location.id}>
                        {isAdmin && onDeletePoi && (
                          <TableCell>
                            <Checkbox
                              checked={selectedRows.has(location.id)}
                              onCheckedChange={() => handleSelectRow(location.id)}
                              className="rounded-md"
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium">
                          {location.institution_code ? `C${location.institution_code}` : "—"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {location.poi_name || "Unnamed POI"}
                        </TableCell>
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

            {/* Pagination */}
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
  )
}

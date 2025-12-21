"use client"

import React, { useState, useRef, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Upload, FileText, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase"
import { Pagination } from "@heroui/react"

interface CsvRow {
  [key: string]: string
}

interface ParsedLocation {
  institutionCode: string | null
  institutionName: string | null
  institutionNickname: string | null
  pharmacyId: string | null
  institutionEmail: string | null
  institutionMappedState: string | null
  institutionStatus: string | null
  siteKeyAccess: string | null
  institutionPhoneNo: string | null
  addressLine1: string | null
  addressLine2: string | null
  addressLine3: string | null
  addressSuburb: string | null
  addressPostcode: string | null
  addressState: string | null
  addressLongitude: number | null
  addressLatitude: number | null
  rowNumber: number
  originalRow: CsvRow
}

interface ImportCsvDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  onSuccess?: () => void
}

// Columns allowed for import/preview (must match Supabase locations table)
const allowedColumns = [
  "institutionCode",
  "institutionName",
  "institutionNickname",
  "pharmacyId",
  "institutionEmail",
  "institutionMappedState",
  "institutionStatus",
  "siteKeyAccess",
  "institutionPhoneNo",
  "addressLine1",
  "addressLine2",
  "addressLine3",
  "addressSuburb",
  "addressPostcode",
  "addressState",
  "addressLongitude",
  "addressLatitude",
] as const

// Helper to normalize column names for flexible matching
const normalizeColumnName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[_\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
}

// Map normalized column names to our field names
const columnMapping: Record<string, keyof ParsedLocation> = {
  institutioncode: "institutionCode",
  institution_code: "institutionCode",
  instcode: "institutionCode",
  code: "institutionCode",
  institutionname: "institutionName",
  name: "institutionName",
  institutionnickname: "institutionNickname",
  nickname: "institutionNickname",
  pharmacyid: "pharmacyId",
  institutionemail: "institutionEmail",
  email: "institutionEmail",
  institutionmappedstate: "institutionMappedState",
  mappedstate: "institutionMappedState",
  institutionstatus: "institutionStatus",
  status: "institutionStatus",
  sitekeyaccess: "siteKeyAccess",
  accesskey: "siteKeyAccess",
  institutionphoneno: "institutionPhoneNo",
  phone: "institutionPhoneNo",
  phone_number: "institutionPhoneNo",
  addressline1: "addressLine1",
  address1: "addressLine1",
  street_address: "addressLine1",
  addressline2: "addressLine2",
  address2: "addressLine2",
  addressline3: "addressLine3",
  address3: "addressLine3",
  addresssuburb: "addressSuburb",
  suburb: "addressSuburb",
  city: "addressSuburb",
  addresspostcode: "addressPostcode",
  postcode: "addressPostcode",
  postal_code: "addressPostcode",
  addressstate: "addressState",
  state: "addressState",
  addresslongitude: "addressLongitude",
  longitude: "addressLongitude",
  lng: "addressLongitude",
  addresslatitude: "addressLatitude",
  latitude: "addressLatitude",
  lat: "addressLatitude",
}

// Simple CSV parser that handles quoted fields
const parseCsvLine = (line: string): string[] => {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === "," && !inQuotes) {
      // End of field
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }

  // Add last field
  result.push(current.trim())
  return result
}

// Parse CSV file
const parseCsv = (file: File): Promise<CsvRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split(/\r?\n/).filter((line) => line.trim())
        if (lines.length === 0) {
          reject(new Error("CSV file is empty"))
          return
        }

        // Parse header
        const headerLine = lines[0]
        const headers = parseCsvLine(headerLine).map((h) => h.replace(/^"|"$/g, ""))

        if (headers.length === 0) {
          reject(new Error("CSV file has no headers"))
          return
        }

        // Parse rows
        const rows: CsvRow[] = []
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i]
          if (!line.trim()) continue

          const values = parseCsvLine(line).map((v) => v.replace(/^"|"$/g, ""))
          const row: CsvRow = {}
          headers.forEach((header, index) => {
            row[header] = values[index] || ""
          })
          // Only add non-empty rows
          if (Object.values(row).some((v) => v && v.trim())) {
            rows.push(row)
          }
        }

        resolve(rows)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsText(file)
  })
}

// Geocode an address using Google Maps Geocoder
const geocodeAddress = (
  addressParts: {
    street_address?: string | null
    street_address2?: string | null
    street_address3?: string | null
    city?: string | null
    state?: string | null
    postcode?: string | null
  },
  cache: Map<string, { lat: number; lng: number }>
): Promise<{ lat: number; lng: number } | null> => {
  return new Promise((resolve) => {
    // Build address string
    const addressPartsArray: string[] = []
    if (addressParts.street_address) addressPartsArray.push(addressParts.street_address)
    if (addressParts.street_address2) addressPartsArray.push(addressParts.street_address2)
    if (addressParts.street_address3) addressPartsArray.push(addressParts.street_address3)
    if (addressParts.city) addressPartsArray.push(addressParts.city)
    if (addressParts.postcode) addressPartsArray.push(addressParts.postcode)
    if (addressParts.state) addressPartsArray.push(addressParts.state)
    addressPartsArray.push("Australia")

    const addressString = addressPartsArray.join(", ")

    // Check cache first
    if (cache.has(addressString)) {
      resolve(cache.get(addressString)!)
      return
    }

    // Check if Google Maps is loaded
    if (
      typeof window === "undefined" ||
      !window.google ||
      !window.google.maps ||
      !window.google.maps.Geocoder
    ) {
      console.warn("Google Maps Geocoder not available")
      resolve(null)
      return
    }

    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode(
      {
        address: addressString,
        componentRestrictions: { country: "au" },
      },
      (results, status) => {
        if (status === "OK" && results && results[0]) {
          const location = results[0].geometry.location
          const result = {
            lat: location.lat(),
            lng: location.lng(),
          }
          // Cache the result
          cache.set(addressString, result)
          resolve(result)
        } else {
          console.warn(`Geocoding failed for "${addressString}": ${status}`)
          resolve(null)
        }
      },
    )
  })
}

export function ImportCsvDialog({ open, onOpenChange, companyId, onSuccess }: ImportCsvDialogProps) {
  const expectedColumns = [
    "institutionCode*",
    "institutionName*",
    "institutionNickname",
    "pharmacyId*",
    "institutionEmail*",
    "institutionMappedState*",
    "institutionStatus*",
    "siteKeyAccess*",
    "institutionPhoneNo",
    "addressLine1",
    "addressLine2",
    "addressLine3",
    "addressSuburb",
    "addressPostcode",
    "addressState",
    "addressLongitude",
    "addressLatitude",
  ]

  const formatHeaderLabel = (key: string) =>
    key
      .replace(/\*/g, "")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/^./, (c) => c.toUpperCase()) + (key.endsWith("*") ? "*" : "")

  const [file, setFile] = useState<File | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedLocation[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<string>("")
  const [errors, setErrors] = useState<string[]>([])
  const [successCount, setSuccessCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [showReview, setShowReview] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const geocodeCache = useRef<Map<string, { lat: number; lng: number }>>(new Map())
  const rowsPerPage = 50

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setFile(null)
      setParsedRows([])
      setCsvHeaders([])
      setIsProcessing(false)
      setProgress(0)
      setStatus("")
      setErrors([])
      setSuccessCount(0)
      setFailedCount(0)
      setShowReview(false)
      setCurrentPage(1)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }, [open])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setErrors(["Please select a CSV file"])
      return
    }

    setFile(selectedFile)
    setErrors([])
    setStatus("Parsing CSV file...")

    try {
      const rows = await parseCsv(selectedFile)
      if (rows.length === 0) {
        setErrors(["CSV file contains no data rows"])
        setFile(null)
        return
      }

      // Map CSV columns to our location fields (only allow expected columns)
      const headers = Object.keys(rows[0])
        .filter((h) => {
        const normalized = normalizeColumnName(h)
        const mapped = columnMapping[normalized] as keyof ParsedLocation | undefined
        return mapped ? (allowedColumns as readonly (keyof ParsedLocation)[]).includes(mapped) : false
        })
        .slice(0, 17)
      setCsvHeaders(headers)
      const normalizedHeaders = headers.map((h) => ({
        original: h,
        normalized: normalizeColumnName(h),
      }))

      const mappedRows: ParsedLocation[] = rows.map((row, index) => {
        const mapped: ParsedLocation = {
          institutionCode: null,
          institutionName: null,
          institutionNickname: null,
          pharmacyId: null,
          institutionEmail: null,
          institutionMappedState: null,
          institutionStatus: null,
          siteKeyAccess: null,
          institutionPhoneNo: null,
          addressLine1: null,
          addressLine2: null,
          addressLine3: null,
          addressSuburb: null,
          addressPostcode: null,
          addressState: null,
          addressLongitude: null,
          addressLatitude: null,
          rowNumber: index + 2, // +2 because index is 0-based and we skip header
          originalRow: row,
        }

        // Map each column
        normalizedHeaders.forEach(({ original, normalized }) => {
          const field = columnMapping[normalized]
          if (field && row[original]) {
            const value = row[original].trim()
            if (value) {
              // Handle numeric fields (latitude, longitude)
              if (field === "addressLatitude" || field === "addressLongitude") {
                const numValue = parseFloat(value)
                if (!isNaN(numValue)) {
                  ;(mapped as any)[field] = numValue
                }
              } else {
                ;(mapped as any)[field] = value
              }
            }
          }
        })

        return mapped
      })

      setParsedRows(mappedRows)
      setStatus(`Parsed ${mappedRows.length} rows. Ready to import.`)
    } catch (error) {
      setErrors([`Failed to parse CSV: ${error instanceof Error ? error.message : "Unknown error"}`])
      setFile(null)
    }
  }

  const handleImport = async () => {
    if (parsedRows.length === 0) return

    setIsProcessing(true)
    setProgress(0)
    setStatus("Preparing to geocode addresses...")
    setErrors([])

    // Filter rows that need geocoding: ACTIVE status AND (lat = 1 OR lng = 1, not actual coordinates)
    const locationsToGeocode = parsedRows.filter(
      (row) => {
        if (row.institutionStatus !== "ACTIVE") return false
        
        // Check if lat or lng equals exactly 1 (needs geocoding)
        const latIsOne = row.addressLatitude === 1
        const lngIsOne = row.addressLongitude === 1
        
        // Only geocode if lat OR lng is exactly 1
        // Don't geocode if both already have real coordinates (not 1 and not null)
        if (!latIsOne && !lngIsOne) return false
        
        // Don't geocode if both lat and lng already have real coordinates (not 1, not null)
        const hasRealLat = row.addressLatitude !== null && row.addressLatitude !== 1
        const hasRealLng = row.addressLongitude !== null && row.addressLongitude !== 1
        if (hasRealLat && hasRealLng) return false
        
        // Check if we have address data to geocode
        const hasAddress = row.addressLine1 || row.addressLine2 || row.addressLine3 || row.addressSuburb || row.addressPostcode || row.addressState
        return hasAddress
      }
    )

    if (locationsToGeocode.length > 0) {
      setStatus("Waiting for Google Maps to load...")
      // Wait up to 10 seconds for Google Maps to load
      let attempts = 0
      while (
        attempts < 100 &&
        (typeof window === "undefined" ||
          !window.google ||
          !window.google.maps ||
          !window.google.maps.Geocoder)
      ) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        attempts++
      }

      if (
        typeof window === "undefined" ||
        !window.google ||
        !window.google.maps ||
        !window.google.maps.Geocoder
      ) {
        setErrors([
          "Google Maps API is not loaded. Please refresh the page and try again.",
        ])
        setIsProcessing(false)
        return
      }

      // Geocode all addresses that need geocoding
      setStatus("Geocoding addresses...")

      for (let i = 0; i < locationsToGeocode.length; i++) {
        const row = locationsToGeocode[i]
        const addressParts = {
          street_address: row.addressLine1,
          street_address2: row.addressLine2,
          street_address3: row.addressLine3,
          city: row.addressSuburb,
          state: row.addressState,
          postcode: row.addressPostcode,
        }

        // Only geocode if we have some address data
        if (addressParts.street_address || addressParts.city || addressParts.postcode || addressParts.state) {
          const geocodeResult = await geocodeAddress(addressParts, geocodeCache.current)
          if (geocodeResult) {
            row.addressLatitude = geocodeResult.lat
            row.addressLongitude = geocodeResult.lng
          }
        }

        // Update progress
        const geocodeProgress = Math.floor(((i + 1) / locationsToGeocode.length) * 100)
        setProgress(geocodeProgress)
        setStatus(`Geocoding addresses... ${i + 1}/${locationsToGeocode.length}`)

        // Small delay to avoid rate limiting
        if (i < locationsToGeocode.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }
    }

    // Update the parsed rows with geocoded data
    setParsedRows([...parsedRows])
    setProgress(100)
    setStatus("Geocoding complete. Please review the data.")
    setIsProcessing(false)
    setShowReview(true)
    setCurrentPage(1)
  }

  const handleApproveImport = async () => {
    if (parsedRows.length === 0) return

    setIsProcessing(true)
    setProgress(0)
    setStatus("Inserting locations into database...")
    setErrors([])
    setSuccessCount(0)
    setFailedCount(0)

    const supabase = getSupabaseClient()
    let processed = 0
    const batchSize = 10 // Process in batches to avoid overwhelming the API
    const insertErrors: string[] = []
    let success = 0
    let failed = 0

    // Process in batches
    for (let i = 0; i < parsedRows.length; i += batchSize) {
      const batch = parsedRows.slice(i, i + batchSize)
      const insertData = batch.map((row) => ({
        company_id: companyId,
        institutioncode: row.institutionCode || null,
        institutionname: row.institutionName || null,
        institutionnickname: row.institutionNickname || null,
        pharmacyid: row.pharmacyId || null,
        institutionemail: row.institutionEmail || null,
        institutionmappedstate: row.institutionMappedState || null,
        institutionstatus: row.institutionStatus || null,
        sitekeyaccess: row.siteKeyAccess || null,
        institutionphoneno: row.institutionPhoneNo || null,
        addressline1: row.addressLine1 || null,
        addressline2: row.addressLine2 || null,
        addressline3: row.addressLine3 || null,
        addresssuburb: row.addressSuburb || null,
        addresspostcode: row.addressPostcode || null,
        addressstate: row.addressState || null,
        addresslongitude: row.addressLongitude || null,
        addresslatitude: row.addressLatitude || null,
      }))

      const { error: insertError } = await supabase.from("locations").insert(insertData)

      if (insertError) {
        insertErrors.push(`Rows ${batch[0].rowNumber}-${batch[batch.length - 1].rowNumber}: ${insertError.message}`)
        failed += batch.length
      } else {
        success += batch.length
      }

      processed += batch.length
      const insertProgress = Math.floor((processed / parsedRows.length) * 100)
      setProgress(insertProgress)
      setStatus(`Inserting locations... ${processed}/${parsedRows.length}`)
    }

    setSuccessCount(success)
    setFailedCount(failed)
    setErrors(insertErrors)
    setProgress(100)
    setStatus(failed > 0 ? `Import completed with ${failed} errors` : "Import completed successfully!")

    if (success > 0 && onSuccess) {
      // Small delay to let the UI update
      setTimeout(() => {
        onSuccess()
      }, 1000)
    }

    setIsProcessing(false)
  }

  const canImport = parsedRows.length > 0 && !isProcessing && !showReview

  // Pagination calculations
  const totalPages = Math.ceil(parsedRows.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = Math.min(startIndex + rowsPerPage, parsedRows.length)
  const currentPageRows = parsedRows.slice(startIndex, endIndex)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[1200px] max-h-[90vh] mx-4 sm:mx-6 overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Locations from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with location data. The system will automatically detect columns and geocode addresses.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 flex-1 min-h-0 overflow-hidden">
          {/* Expected Columns Header */}
          <div className="space-y-2">
            <div className="text-sm font-semibold">Expected columns</div>
            <div className="text-xs text-muted-foreground whitespace-normal break-words">
              {expectedColumns.map((c) => formatHeaderLabel(c)).join(", ")}
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={isProcessing}
                className="hidden"
                id="csv-file-input"
              />
              <label
                htmlFor="csv-file-input"
                className={`flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  isProcessing
                    ? "border-gray-300 cursor-not-allowed opacity-50"
                    : "border-gray-300 hover:border-orange-400 hover:bg-orange-50"
                }`}
              >
                <Upload className="h-5 w-5" />
                <span className="text-sm">
                  {file ? file.name : "Choose CSV file..."}
                </span>
              </label>
            </div>
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{parsedRows.length} locations found</span>
              </div>
            )}
          </div>


          {/* Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{status}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Results */}
          {!isProcessing && (successCount > 0 || failedCount > 0) && (
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm">
                {successCount > 0 && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{successCount} imported</span>
                  </div>
                )}
                {failedCount > 0 && (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-4 w-4" />
                    <span>{failedCount} failed</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {errors.map((error, index) => (
                    <div key={index} className="text-sm">
                      {error}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview Table - only show before review */}
          {parsedRows.length > 0 && !isProcessing && !showReview && errors.length === 0 && csvHeaders.length > 0 && (
            <div className="border rounded-t-lg w-full max-w-full flex flex-col max-h-[50vh] overflow-hidden">
              <div className="text-sm font-medium p-4 border-b bg-gray-50 rounded-t-lg">
                Import Preview (showing first {Math.min(parsedRows.length, 20)} of {parsedRows.length} rows)
              </div>
              <div className="flex-1 min-h-0 overflow-auto table-scrollbar" style={{
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(0,0,0,0.3) transparent",
                scrollbarGutter: "stable",
              }}>
                <table className="w-full caption-bottom text-sm" style={{ minWidth: `${Math.max(expectedColumns.length * 160, 1200)}px` }}>
                  <thead className="[&_tr]:border-b sticky top-0 bg-gray-50 z-10">
                    <tr className="border-b transition-colors">
                      {expectedColumns.map((column, index) => {
                        const fieldName = column.replace(/\*/g, "") as keyof ParsedLocation
                        return (
                          <th
                            key={index}
                            className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap"
                            style={{ minWidth: "140px" }}
                          >
                            {formatHeaderLabel(column)}
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {parsedRows.slice(0, 20).map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b transition-colors hover:bg-muted/50">
                        {expectedColumns.map((column, colIndex) => {
                          const fieldName = column.replace(/\*/g, "") as keyof ParsedLocation
                          const value = row[fieldName] ?? ""
                          return (
                            <td
                              key={colIndex}
                              className="p-4 align-middle whitespace-nowrap overflow-hidden text-ellipsis"
                              style={{ maxWidth: "200px" }}
                              title={String(value)}
                            >
                              {String(value)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Review Table with Pagination */}
          {showReview && parsedRows.length > 0 && !isProcessing && csvHeaders.length > 0 && (
            <div className="flex flex-col flex-1 min-h-0 space-y-4 overflow-hidden">
              <div className="text-sm text-muted-foreground flex-shrink-0">
                Review all {parsedRows.length} locations before importing. Geocoding has been completed for ACTIVE locations.
              </div>

              {/* Table Container */}
              <div className="border rounded-lg w-full max-w-full flex flex-col flex-1 min-h-0 max-h-[calc(90vh-480px)] overflow-hidden">
                <div className="text-sm font-medium p-4 border-b bg-gray-50 rounded-t-lg flex items-center justify-between flex-shrink-0">
                  <span>Review Dataset</span>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground font-normal">
                        Showing {startIndex + 1} to {Math.min(endIndex, parsedRows.length)} of {parsedRows.length} locations
                      </span>
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
                <div className="flex-1 min-h-0 overflow-auto table-scrollbar" style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgba(0,0,0,0.3) transparent",
                  scrollbarGutter: "stable",
                }}>
                  <table className="w-full caption-bottom text-sm" style={{ minWidth: `${Math.max(expectedColumns.length * 160, 1200)}px` }}>
                    <thead className="[&_tr]:border-b sticky top-0 bg-gray-50 z-10">
                      <tr className="border-b transition-colors">
                        {expectedColumns.map((column, index) => {
                          const fieldName = column.replace(/\*/g, "") as keyof ParsedLocation
                          return (
                            <th
                              key={index}
                              className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap"
                              style={{ minWidth: "140px" }}
                            >
                              {formatHeaderLabel(column)}
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {currentPageRows.map((row, rowIndex) => (
                        <tr key={startIndex + rowIndex} className="border-b transition-colors hover:bg-muted/50">
                          {expectedColumns.map((column, colIndex) => {
                            const fieldName = column.replace(/\*/g, "") as keyof ParsedLocation
                            const value = row[fieldName] ?? ""
                            return (
                              <td
                                key={colIndex}
                                className="p-4 align-middle whitespace-nowrap overflow-hidden text-ellipsis"
                                style={{ maxWidth: "200px" }}
                                title={String(value)}
                              >
                                {String(value)}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {showReview ? (
            <>
              <Button variant="outline" onClick={() => setShowReview(false)} disabled={isProcessing}>
                Back
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={handleApproveImport} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Approve & Import"
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
                {isProcessing ? "Processing..." : "Cancel"}
              </Button>
              <Button onClick={handleImport} disabled={!canImport}>
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Import Locations"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import React, { useState, useEffect, useRef } from "react"
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
import { MapPin, Check, ChevronDown, ChevronUp, Pencil, X } from "lucide-react"
import type { PoiLocation } from "@/components/poi-locations-table"
import { getSupabaseClient } from "@/lib/supabase"
import { determineProviderForLocation } from "@/lib/provider-assignment"

const PROVIDERS = [
  { value: "Ausgrid", label: "Ausgrid" },
  { value: "Endeavour", label: "Endeavour" },
  { value: "Energex", label: "Energex" },
  { value: "Ergon", label: "Ergon" },
  { value: "SA Power", label: "SA Power" },
  { value: "Horizon Power", label: "Horizon Power" },
  { value: "WPower", label: "WPower" },
  { value: "AusNet", label: "AusNet" },
  { value: "CitiPowerCor", label: "CitiPowerCor" },
  { value: "Essential Energy", label: "Essential Energy" },
  { value: "Jemena", label: "Jemena" },
  { value: "UnitedEnergy", label: "UnitedEnergy" },
  { value: "TasNetworks", label: "TasNetworks" },
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
        placement: "top",
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
        placement: "top",
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

interface PlacePrediction {
  description: string
  place_id: string
}

interface AddPoiDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: {
    poiName: string
    location: string
    latitude: number
    longitude: number
    contactEmail?: string
    contactPhone?: string
    state?: string
    postcode?: string
    institutionCode?: string
    institutionNickname?: string
    pharmacyId?: string
    institutionStatus?: string
    siteKeyAccess?: number | null
    addressLine1?: string
    addressLine2?: string
    addressLine3?: string
    addressSuburb?: string
  }) => Promise<void>
  saving?: boolean
  location?: PoiLocation | null // For edit mode
  companyId: string
}

export function AddPoiDialog({
  open,
  onOpenChange,
  onSave,
  saving = false,
  location = null,
  companyId,
}: AddPoiDialogProps) {
  const isEditMode = !!location
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
  
  // Required fields
  const [poiName, setPoiName] = useState("")
  const [searchValue, setSearchValue] = useState("")
  const [locationAddress, setLocationAddress] = useState("")
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  
  // Compulsory fields
  const [institutionCode, setInstitutionCode] = useState("")
  const [pharmacyId, setPharmacyId] = useState("")
  const [institutionStatus, setInstitutionStatus] = useState("ACTIVE")
  const [siteKeyAccess, setSiteKeyAccess] = useState<boolean>(false)
  
  // Optional fields
  const [institutionNickname, setInstitutionNickname] = useState("")
  
  // Address fields (auto-filled from Google Maps)
  const [addressLine1, setAddressLine1] = useState("")
  const [addressLine2, setAddressLine2] = useState("")
  const [addressLine3, setAddressLine3] = useState("")
  const [addressSuburb, setAddressSuburb] = useState("")
  const [state, setState] = useState("")
  const [postcode, setPostcode] = useState("")
  const [provider, setProvider] = useState<string | null>(null)
  
  // Address details visibility
  const [showAddressDetails, setShowAddressDetails] = useState(false)
  
  // Address field editing state
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string | undefined>>({})
  
  // Pharmacy ID options
  const [pharmacyIdOptions, setPharmacyIdOptions] = useState<string[]>([])
  const [loadingPharmacyIds, setLoadingPharmacyIds] = useState(false)
  
  // Institution code validation
  const [institutionCodeError, setInstitutionCodeError] = useState("")
  const [existingCodes, setExistingCodes] = useState<string[]>([])
  
  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState({
    poiName: "",
    location: "",
    contactEmail: "",
    contactPhone: "",
    institutionCode: "",
    pharmacyId: "",
    siteKeyAccess: "",
  })
  
  const [autocompleteReady, setAutocompleteReady] = useState(false)
  const [predictions, setPredictions] = useState<PlacePrediction[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false)
  const autocompleteServiceRef = React.useRef<any>(null)
  const placesServiceRef = React.useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch unique pharmacy IDs for this company
  useEffect(() => {
    if (!open || !companyId) return
    
    const fetchPharmacyIds = async () => {
      setLoadingPharmacyIds(true)
      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
          .from("locations")
          .select("pharmacyid")
          .eq("company_id", companyId)
          .not("pharmacyid", "is", null)
        
        if (error) {
          console.error("Error fetching pharmacy IDs:", error)
          return
        }
        
        // Get unique pharmacy IDs
        const uniqueIds = [...new Set((data || []).map((row: any) => row.pharmacyid).filter(Boolean))]
        setPharmacyIdOptions(uniqueIds.sort())
      } catch (error) {
        console.error("Error fetching pharmacy IDs:", error)
      } finally {
        setLoadingPharmacyIds(false)
      }
    }
    
    fetchPharmacyIds()
  }, [open, companyId])

  // Fetch highest institution code and auto-fill, and get all existing codes for validation
  useEffect(() => {
    if (!open || !companyId) return
    
    const fetchCodes = async () => {
      try {
        const supabase = getSupabaseClient()
        // Fetch all codes since they're stored as text
        const { data, error } = await supabase
          .from("locations")
          .select("institutioncode")
          .eq("company_id", companyId)
          .not("institutioncode", "is", null)
        
        if (error) {
          console.error("Error fetching institution codes:", error)
          return
        }
        
        // Store all existing codes (without C prefix) for validation
        const codes = (data || []).map((row: any) => {
          const codeStr = String(row.institutioncode || "")
          return codeStr.replace(/^C/i, "")
        })
        setExistingCodes(codes)
        
        if (!isEditMode && data && data.length > 0) {
          // Parse all codes as numbers (they're stored as text but are numeric)
          const numericCodes = codes
            .map((codeStr: string) => {
              const num = parseInt(codeStr, 10)
              return isNaN(num) ? null : num
            })
            .filter((num): num is number => num !== null && num > 0)
          
          if (numericCodes.length > 0) {
            const maxCode = Math.max(...numericCodes)
            const nextCode = (maxCode + 1).toString()
            setInstitutionCode(nextCode)
          } else {
            setInstitutionCode("1")
          }
        } else if (!isEditMode) {
          // No existing codes, start at 1
          setInstitutionCode("1")
        }
      } catch (error) {
        console.error("Error fetching institution codes:", error)
        if (!isEditMode) {
          setInstitutionCode("1")
        }
      }
    }
    
    fetchCodes()
  }, [open, companyId, isEditMode])

  // Initialize Google Places services
  useEffect(() => {
    if (!open) return

    const initServices = () => {
      if (
        typeof window !== "undefined" &&
        window.google?.maps?.places?.AutocompleteService &&
        window.google?.maps?.places?.PlacesService
      ) {
        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
        const div = document.createElement("div")
        placesServiceRef.current = new window.google.maps.places.PlacesService(div)
        setAutocompleteReady(true)
        return true
      }
      return false
    }

    if (initServices()) return

    let attempts = 0
    const maxAttempts = 50
    const checkInterval = setInterval(() => {
      attempts++
      if (initServices()) {
        clearInterval(checkInterval)
      } else if (attempts >= maxAttempts) {
        console.error("Failed to load Google Places API")
        clearInterval(checkInterval)
      }
    }, 100)

    return () => clearInterval(checkInterval)
  }, [open])

  // Get place predictions
  useEffect(() => {
    if (!searchValue.trim() || !autocompleteServiceRef.current || !autocompleteReady) {
      setPredictions([])
      setShowSuggestions(false)
      return
    }

    setIsLoadingPredictions(true)

    const timeoutId = setTimeout(() => {
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: searchValue,
          componentRestrictions: { country: "au" },
          types: ["address"],
        },
        (results: PlacePrediction[] | null, status: string) => {
          setIsLoadingPredictions(false)
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results)
            setShowSuggestions(true)
          } else {
            setPredictions([])
            setShowSuggestions(false)
          }
        },
      )
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchValue, autocompleteReady])

  const handleSelectPlace = async (placeId: string, description: string) => {
    if (!placesServiceRef.current) return

    placesServiceRef.current.getDetails(
      {
        placeId,
        fields: ["formatted_address", "geometry", "name", "address_components"],
      },
      async (place: any, status: string) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          if (!place.geometry?.location) {
            return
          }

          const formattedAddress = place.formatted_address || description
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()
          
          setLocationAddress(formattedAddress)
          setSearchValue(formattedAddress)
          setAddressLine1(formattedAddress)
          setLatitude(lat)
          setLongitude(lng)
          // Clear location error when place is selected
          setFieldErrors(prev => ({ ...prev, location: "" }))
          
          // Extract address components
          let extractedState = ""
          let extractedPostcode = ""
          let extractedSuburb = ""
          let streetNumber = ""
          let route = ""
          
          if (place.address_components) {
            for (const component of place.address_components) {
              if (component.types.includes("street_number")) {
                streetNumber = component.long_name
              }
              if (component.types.includes("route")) {
                route = component.long_name
              }
              if (component.types.includes("administrative_area_level_1")) {
                const stateMap: Record<string, string> = {
                  "New South Wales": "NSW",
                  "Victoria": "VIC",
                  "Queensland": "QLD",
                  "South Australia": "SA",
                  "Western Australia": "WA",
                  "Tasmania": "TAS",
                  "Northern Territory": "NT",
                  "Australian Capital Territory": "ACT",
                }
                const stateName = component.short_name || component.long_name
                extractedState = stateMap[stateName] || stateName
              }
              if (component.types.includes("postal_code")) {
                extractedPostcode = component.short_name || component.long_name
              }
              // Prioritize locality (suburb) over administrative_area_level_2 (LGA)
              if (component.types.includes("locality")) {
                extractedSuburb = component.long_name || component.short_name
              } else if (component.types.includes("administrative_area_level_2") && !extractedSuburb) {
                // Only use LGA if we haven't found a suburb
                extractedSuburb = component.long_name || component.short_name
              }
            }
          }
          
          // Build address line 1 from street number and route
          if (streetNumber && route) {
            setAddressLine1(`${streetNumber} ${route}`)
          } else {
            setAddressLine1(formattedAddress)
          }
          
          setState(extractedState)
          setPostcode(extractedPostcode)
          setAddressSuburb(extractedSuburb)
          setShowSuggestions(false)
          
          // Auto-detect provider based on lat/long
          try {
            const detectedProvider = await determineProviderForLocation(lat, lng, extractedPostcode || null, extractedState || null)
            setProvider(detectedProvider)
            console.log("Auto-detected provider:", detectedProvider)
          } catch (error) {
            console.error("Error determining provider:", error)
            setProvider(null)
          }
        }
      },
    )
  }

  // Reset or populate form when dialog opens
  useEffect(() => {
    if (open) {
      if (isEditMode && location) {
        // Populate with existing data
        const loc = location as any
        setPoiName(location.poi_name || "")
        setLocationAddress(location.street_address || "")
        
        // Build full address string for autocomplete: address lines + suburb + state + postcode
        const addressParts: string[] = []
        if (location.street_address) addressParts.push(location.street_address)
        if (loc.addressline2) addressParts.push(loc.addressline2)
        if (loc.addressline3) addressParts.push(loc.addressline3)
        if (location.city) addressParts.push(location.city)
        if (location.state) addressParts.push(location.state)
        if (location.postcode) addressParts.push(location.postcode)
        const fullAddress = addressParts.join(", ")
        setSearchValue(fullAddress || location.street_address || "")
        
        setLatitude(location.latitude)
        setLongitude(location.longitude)
        setContactEmail(location.contact_email || "")
        setContactPhone(location.contact_phone || "")
        
        // Institution code - remove "C" prefix if present
        const code = location.institution_code || ""
        setInstitutionCode(code.startsWith("C") ? code.substring(1) : code)
        
        setPharmacyId(loc.pharmacyid || "")
        setInstitutionStatus(location.institutionstatus || "ACTIVE")
        setSiteKeyAccess(loc.sitekeyaccess === 1 || loc.sitekeyaccess === "1" || loc.sitekeyaccess === true)
        setInstitutionNickname(loc.institutionnickname || "")
        setAddressLine1(location.street_address || "")
        setAddressLine2(loc.addressline2 || "")
        setAddressLine3(loc.addressline3 || "")
        setAddressSuburb(location.city || "")
        setState(location.state || "")
        setPostcode(location.postcode || "")
        setProvider(loc.provider || null)
      } else {
        // Reset for new POI
        setPoiName("")
        setLocationAddress("")
        setSearchValue("")
        setLatitude(null)
        setLongitude(null)
        setContactEmail("")
        setContactPhone("")
        // Institution code will be auto-filled by useEffect
        setPharmacyId("")
        setInstitutionStatus("ACTIVE")
        setSiteKeyAccess(false)
        setInstitutionNickname("")
        setAddressLine1("")
        setAddressLine2("")
        setAddressLine3("")
        setAddressSuburb("")
        setState("")
        setPostcode("")
        setProvider(null)
      }
      setShowSuggestions(false)
      setShowAddressDetails(false)
      setPredictions([])
      // Clear all field errors when dialog opens
      setFieldErrors({
        poiName: "",
        location: "",
        contactEmail: "",
        contactPhone: "",
        institutionCode: "",
        pharmacyId: "",
        siteKeyAccess: "",
      })
      setInstitutionCodeError("")
    }
  }, [open, isEditMode, location])

  // Handle institution code input - only allow numbers, max 3 digits, check for duplicates
  const handleInstitutionCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 3) // Remove non-digits and limit to 3
    setInstitutionCode(value)
    
    // Clear error when user types
    setFieldErrors(prev => ({ ...prev, institutionCode: "" }))
    setInstitutionCodeError("")
    
    // Check for duplicate code (only in add mode, check for any length)
    if (!isEditMode && value.length > 0) {
      if (existingCodes.includes(value)) {
        const errorMsg = "This code is already taken"
        setInstitutionCodeError(errorMsg)
        setFieldErrors(prev => ({ ...prev, institutionCode: errorMsg }))
      }
    }
  }

  const handleSave = async () => {
    // Refresh existing codes right before validation to ensure we have the latest data
    let currentExistingCodes = existingCodes
    if (!isEditMode && companyId) {
      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
          .from("locations")
          .select("institutioncode")
          .eq("company_id", companyId)
          .not("institutioncode", "is", null)
        
        if (!error && data) {
          currentExistingCodes = data.map((row: any) => {
            const codeStr = String(row.institutioncode || "")
            return codeStr.replace(/^C/i, "").trim()
          })
        }
      } catch (error) {
        console.error("Error refreshing institution codes:", error)
      }
    }
    
    // Validate all compulsory fields
    const errors = {
      poiName: !poiName.trim() ? "POI Name is required" : "",
      location: !locationAddress.trim() || latitude === null || longitude === null ? "Location is required" : "",
      contactEmail: !contactEmail.trim() ? "Contact Email is required" : "",
      contactPhone: !contactPhone.trim() ? "Contact Phone is required" : "",
      institutionCode: !institutionCode.trim() ? "Code is required" : "",
      pharmacyId: !pharmacyId.trim() ? "Pharmacy ID is required" : "",
      siteKeyAccess: "",
    }
    
    // Check for duplicate institution code (check for any length, not just 3)
    const trimmedCode = institutionCode.trim()
    if (!isEditMode && trimmedCode && currentExistingCodes.includes(trimmedCode)) {
      errors.institutionCode = "This code is already taken"
      setInstitutionCodeError("This code is already taken")
    }
    
    setFieldErrors(errors)
    
    // Check if there are any errors
    const hasErrors = Object.values(errors).some(error => error !== "")
    if (hasErrors) {
      return
    }

    // At this point, we know latitude and longitude are not null due to validation
    if (latitude === null || longitude === null) {
      return
    }

    try {
      await onSave({
        poiName: poiName.trim(),
        location: locationAddress.trim(),
        latitude,
        longitude,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        state: state || undefined,
        postcode: postcode || undefined,
        institutionCode: institutionCode.trim() || undefined,
        institutionNickname: institutionNickname.trim() || undefined,
        pharmacyId: pharmacyId.trim() || undefined,
        institutionStatus: isEditMode ? institutionStatus : undefined,
        siteKeyAccess: siteKeyAccess ? 1 : null,
        addressLine1: addressLine1.trim() || undefined,
        addressLine2: addressLine2.trim() || undefined,
        addressLine3: addressLine3.trim() || undefined,
        addressSuburb: addressSuburb.trim() || undefined,
      })
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save POI:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={dialogContentRef} className="max-w-[95vw] sm:max-w-[600px] bg-black md:bg-white border-gray-800 md:border-[hsl(var(--border))] p-3 md:p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg text-white md:text-foreground">
            {isEditMode ? "Edit POI" : "Add POI"}
          </DialogTitle>
          <DialogDescription className="text-xs md:text-sm text-gray-400 md:text-muted-foreground">
            {isEditMode ? "Update the point of interest location information" : "Add a new point of interest location to monitor"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:gap-6 py-2 md:py-4 bg-black md:bg-white">
          <div className="space-y-3 md:space-y-4">
                {/* POI Name and Institution Code - Same Row */}
                <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_120px] gap-3 md:gap-4">
                  {/* POI Name */}
                  <div className="space-y-2 min-w-0">
                    <div className="md:hidden">
                      <MobileInput
                        label="POI Name"
                      value={poiName}
                      onChange={(e) => {
                        setPoiName(e.target.value)
                        setFieldErrors(prev => ({ ...prev, poiName: "" }))
                      }}
                        isRequired
                      isInvalid={!!fieldErrors.poiName}
                      errorMessage={fieldErrors.poiName}
                        className="min-w-0"
                      />
                    </div>
                    <div className="hidden md:block">
                      <DesktopInput
                        label="POI Name"
                        value={poiName}
                        onChange={(e) => {
                          setPoiName(e.target.value)
                          setFieldErrors(prev => ({ ...prev, poiName: "" }))
                        }}
                        isRequired
                        isInvalid={!!fieldErrors.poiName}
                        errorMessage={fieldErrors.poiName}
                        className="min-w-0"
                      />
                    </div>
                  </div>

                  {/* Institution Code */}
                  <div className="space-y-2 w-20 md:w-auto">
                    <div className="md:hidden">
                      <MobileInput
                        label="Code"
                      value={institutionCode}
                      onChange={handleInstitutionCodeChange}
                        type="text"
                        isRequired
                      isInvalid={!!fieldErrors.institutionCode || !!institutionCodeError}
                      errorMessage={fieldErrors.institutionCode || institutionCodeError}
                      />
                    </div>
                    <div className="hidden md:block">
                      <DesktopInput
                        label="Code"
                        value={institutionCode}
                        onChange={handleInstitutionCodeChange}
                        type="text"
                        isRequired
                        isInvalid={!!fieldErrors.institutionCode || !!institutionCodeError}
                        errorMessage={fieldErrors.institutionCode || institutionCodeError}
                    />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2 relative">
                  <div className="relative">
                    <MapPin className="absolute left-1 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                    <div className="md:hidden">
                      <MobileInput
                        label="Location"
                      value={searchValue}
                      onChange={(e) => {
                        setSearchValue(e.target.value)
                        setFieldErrors(prev => ({ ...prev, location: "" }))
                        if (latitude !== null || longitude !== null) {
                          setLatitude(null)
                          setLongitude(null)
                          setLocationAddress("")
                          setProvider(null)
                        }
                      }}
                      onFocus={() => {
                        if (predictions.length > 0) {
                          setShowSuggestions(true)
                        }
                      }}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                        }
                      }}
                      placeholder={autocompleteReady ? "Start typing the address..." : "Loading autocomplete..."}
                        isRequired
                      isInvalid={!!fieldErrors.location}
                      errorMessage={fieldErrors.location}
                        className="pl-8"
                      />
                    </div>
                    <div className="hidden md:block">
                      <DesktopInput
                        label="Location"
                        value={searchValue}
                        onChange={(e) => {
                          setSearchValue(e.target.value)
                          setFieldErrors(prev => ({ ...prev, location: "" }))
                          if (latitude !== null || longitude !== null) {
                            setLatitude(null)
                            setLongitude(null)
                            setLocationAddress("")
                            setProvider(null)
                          }
                        }}
                        onFocus={() => {
                          if (predictions.length > 0) {
                            setShowSuggestions(true)
                          }
                        }}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                          }
                        }}
                        placeholder={autocompleteReady ? "Start typing the address..." : "Loading autocomplete..."}
                        isRequired
                        isInvalid={!!fieldErrors.location}
                        errorMessage={fieldErrors.location}
                        className="pl-8"
                      />
                    </div>
                    {latitude && longitude && (
                      <Check className="absolute right-1 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-400 md:text-green-600 z-10" />
                    )}
                  </div>
                  {showSuggestions && predictions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-black md:bg-white border border-gray-700 md:border-gray-200 rounded-md shadow-lg max-h-48 md:max-h-60 overflow-auto">
                      {isLoadingPredictions ? (
                        <div className="p-2 md:p-3 text-xs md:text-sm text-gray-400 md:text-gray-500">Searching addresses...</div>
                      ) : (
                        <div className="py-1">
                          {predictions.map((prediction) => (
                            <button
                              key={prediction.place_id}
                              type="button"
                              onClick={() => handleSelectPlace(prediction.place_id, prediction.description)}
                              className="w-full text-left px-2 md:px-3 py-1.5 md:py-2 hover:bg-gray-800 md:hover:bg-gray-100 flex items-start gap-2 cursor-pointer"
                            >
                              <MapPin className="h-3 w-3 md:h-4 md:w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <span className="text-xs md:text-sm !text-white md:!text-gray-900">{prediction.description}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Show Address Details Dropdown */}
                  {latitude && longitude && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddressDetails(!showAddressDetails)}
                        className="w-full flex items-center justify-between px-2 py-2 text-xs md:text-sm text-white md:text-slate-700 hover:text-gray-200 md:hover:text-slate-900 border-b border-gray-600 md:border-gray-200"
                      >
                        <span className="text-white md:text-slate-700">Show Address Details</span>
                        {showAddressDetails ? (
                          <ChevronUp className="h-4 w-4 text-white md:text-slate-700" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-white md:text-slate-700" />
                        )}
                      </button>
                      {showAddressDetails && (
                        <div className="mt-2 space-y-2 p-3 bg-gray-900 md:bg-gray-50 rounded-md border border-gray-700 md:border-gray-200">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {/* Address Line 1 */}
                            <div className="group relative flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <span className="text-gray-400 md:text-slate-600">Address Line 1:</span>
                                {editingField === "addressLine1" ? (
                                  <div className="mt-1 flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={editValues.addressLine1 ?? addressLine1}
                                      onChange={(e) => setEditValues({ ...editValues, addressLine1: e.target.value })}
                                      className="flex-1 px-2 py-1 bg-gray-800 md:bg-white text-white md:text-slate-900 border border-gray-600 md:border-gray-300 rounded text-xs"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          setAddressLine1(editValues.addressLine1 ?? addressLine1)
                                          setEditingField(null)
                                          const { addressLine1: _, ...rest } = editValues
                                          setEditValues(rest)
                                        } else if (e.key === "Escape") {
                                          setEditingField(null)
                                          const { addressLine1: _, ...rest } = editValues
                                          setEditValues(rest)
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={() => {
                                        setAddressLine1(editValues.addressLine1 ?? addressLine1)
                                        setEditingField(null)
                                        const { addressLine1: _, ...rest } = editValues
                                        setEditValues(rest)
                                      }}
                                      className="p-1 text-green-400 hover:text-green-300"
                                    >
                                      <Check className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingField(null)
                                        const { addressLine1: _, ...rest } = editValues
                                        setEditValues(rest)
                                      }}
                                      className="p-1 text-red-400 hover:text-red-300"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="mt-1 flex items-center gap-2">
                                    <span className="text-white md:text-slate-900">{addressLine1 || "N/A"}</span>
                                    <button
                                      onClick={() => {
                                        setEditingField("addressLine1")
                                        setEditValues({ ...editValues, addressLine1: addressLine1 })
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-white md:hover:text-slate-900"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Address Line 2 */}
                            <div className="group relative flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <span className="text-gray-400 md:text-slate-600">Address Line 2:</span>
                                {editingField === "addressLine2" ? (
                                  <div className="mt-1 flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={editValues.addressLine2 ?? addressLine2}
                                      onChange={(e) => setEditValues({ ...editValues, addressLine2: e.target.value })}
                                      className="flex-1 px-2 py-1 bg-gray-800 md:bg-white text-white md:text-slate-900 border border-gray-600 md:border-gray-300 rounded text-xs"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          setAddressLine2(editValues.addressLine2 ?? addressLine2)
                                          setEditingField(null)
                                          const { addressLine2: _, ...rest } = editValues
                                          setEditValues(rest)
                                        } else if (e.key === "Escape") {
                                          setEditingField(null)
                                          const { addressLine2: _, ...rest } = editValues
                                          setEditValues(rest)
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={() => {
                                        setAddressLine2(editValues.addressLine2 ?? addressLine2)
                                        setEditingField(null)
                                        const { addressLine2: _, ...rest } = editValues
                                        setEditValues(rest)
                                      }}
                                      className="p-1 text-green-400 hover:text-green-300"
                                    >
                                      <Check className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingField(null)
                                        const { addressLine2: _, ...rest } = editValues
                                        setEditValues(rest)
                                      }}
                                      className="p-1 text-red-400 hover:text-red-300"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="mt-1 flex items-center gap-2">
                                    <span className="text-white md:text-slate-900">{addressLine2 || "N/A"}</span>
                                    <button
                                      onClick={() => {
                                        setEditingField("addressLine2")
                                        setEditValues({ ...editValues, addressLine2: addressLine2 })
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-white md:hover:text-slate-900"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Address Line 3 */}
                            <div className="group relative flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <span className="text-gray-400 md:text-slate-600">Address Line 3:</span>
                                {editingField === "addressLine3" ? (
                                  <div className="mt-1 flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={editValues.addressLine3 ?? addressLine3}
                                      onChange={(e) => setEditValues({ ...editValues, addressLine3: e.target.value })}
                                      className="flex-1 px-2 py-1 bg-gray-800 md:bg-white text-white md:text-slate-900 border border-gray-600 md:border-gray-300 rounded text-xs"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          setAddressLine3(editValues.addressLine3 ?? addressLine3)
                                          setEditingField(null)
                                          const { addressLine3: _, ...rest } = editValues
                                          setEditValues(rest)
                                        } else if (e.key === "Escape") {
                                          setEditingField(null)
                                          const { addressLine3: _, ...rest } = editValues
                                          setEditValues(rest)
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={() => {
                                        setAddressLine3(editValues.addressLine3 ?? addressLine3)
                                        setEditingField(null)
                                        const { addressLine3: _, ...rest } = editValues
                                        setEditValues(rest)
                                      }}
                                      className="p-1 text-green-400 hover:text-green-300"
                                    >
                                      <Check className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingField(null)
                                        const { addressLine3: _, ...rest } = editValues
                                        setEditValues(rest)
                                      }}
                                      className="p-1 text-red-400 hover:text-red-300"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="mt-1 flex items-center gap-2">
                                    <span className="text-white md:text-slate-900">{addressLine3 || "N/A"}</span>
                                    <button
                                      onClick={() => {
                                        setEditingField("addressLine3")
                                        setEditValues({ ...editValues, addressLine3: addressLine3 })
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-white md:hover:text-slate-900"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Suburb */}
                            <div className="group relative flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <span className="text-gray-400 md:text-slate-600">Suburb:</span>
                                {editingField === "addressSuburb" ? (
                                  <div className="mt-1 flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={editValues.addressSuburb ?? addressSuburb}
                                      onChange={(e) => setEditValues({ ...editValues, addressSuburb: e.target.value })}
                                      className="flex-1 px-2 py-1 bg-gray-800 md:bg-white text-white md:text-slate-900 border border-gray-600 md:border-gray-300 rounded text-xs"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          setAddressSuburb(editValues.addressSuburb ?? addressSuburb)
                                          setEditingField(null)
                                          const { addressSuburb: _, ...rest } = editValues
                                          setEditValues(rest)
                                        } else if (e.key === "Escape") {
                                          setEditingField(null)
                                          const { addressSuburb: _, ...rest } = editValues
                                          setEditValues(rest)
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={() => {
                                        setAddressSuburb(editValues.addressSuburb ?? addressSuburb)
                                        setEditingField(null)
                                        const { addressSuburb: _, ...rest } = editValues
                                        setEditValues(rest)
                                      }}
                                      className="p-1 text-green-400 hover:text-green-300"
                                    >
                                      <Check className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingField(null)
                                        const { addressSuburb: _, ...rest } = editValues
                                        setEditValues(rest)
                                      }}
                                      className="p-1 text-red-400 hover:text-red-300"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="mt-1 flex items-center gap-2">
                                    <span className="text-white md:text-slate-900">{addressSuburb || "N/A"}</span>
                                    <button
                                      onClick={() => {
                                        setEditingField("addressSuburb")
                                        setEditValues({ ...editValues, addressSuburb: addressSuburb })
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-white md:hover:text-slate-900"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* State */}
                            <div className="group relative flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <span className="text-gray-400 md:text-slate-600">State:</span>
                                {editingField === "state" ? (
                                  <div className="mt-1 flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={editValues.state ?? state}
                                      onChange={(e) => setEditValues({ ...editValues, state: e.target.value })}
                                      className="flex-1 px-2 py-1 bg-gray-800 md:bg-white text-white md:text-slate-900 border border-gray-600 md:border-gray-300 rounded text-xs"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          setState(editValues.state ?? state)
                                          setEditingField(null)
                                          const { state: _, ...rest } = editValues
                                          setEditValues(rest)
                                        } else if (e.key === "Escape") {
                                          setEditingField(null)
                                          const { state: _, ...rest } = editValues
                                          setEditValues(rest)
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={() => {
                                        setState(editValues.state ?? state)
                                        setEditingField(null)
                                        const { state: _, ...rest } = editValues
                                        setEditValues(rest)
                                      }}
                                      className="p-1 text-green-400 hover:text-green-300"
                                    >
                                      <Check className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingField(null)
                                        const { state: _, ...rest } = editValues
                                        setEditValues(rest)
                                      }}
                                      className="p-1 text-red-400 hover:text-red-300"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="mt-1 flex items-center gap-2">
                                    <span className="text-white md:text-slate-900">{state || "N/A"}</span>
                                    <button
                                      onClick={() => {
                                        setEditingField("state")
                                        setEditValues({ ...editValues, state: state })
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-white md:hover:text-slate-900"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Postcode */}
                            <div className="group relative flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <span className="text-gray-400 md:text-slate-600">Postcode:</span>
                                {editingField === "postcode" ? (
                                  <div className="mt-1 flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={editValues.postcode ?? postcode}
                                      onChange={(e) => setEditValues({ ...editValues, postcode: e.target.value })}
                                      className="flex-1 px-2 py-1 bg-gray-800 md:bg-white text-white md:text-slate-900 border border-gray-600 md:border-gray-300 rounded text-xs"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          setPostcode(editValues.postcode ?? postcode)
                                          setEditingField(null)
                                          const { postcode: _, ...rest } = editValues
                                          setEditValues(rest)
                                        } else if (e.key === "Escape") {
                                          setEditingField(null)
                                          const { postcode: _, ...rest } = editValues
                                          setEditValues(rest)
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={() => {
                                        setPostcode(editValues.postcode ?? postcode)
                                        setEditingField(null)
                                        const { postcode: _, ...rest } = editValues
                                        setEditValues(rest)
                                      }}
                                      className="p-1 text-green-400 hover:text-green-300"
                                    >
                                      <Check className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingField(null)
                                        const { postcode: _, ...rest } = editValues
                                        setEditValues(rest)
                                      }}
                                      className="p-1 text-red-400 hover:text-red-300"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="mt-1 flex items-center gap-2">
                                    <span className="text-white md:text-slate-900">{postcode || "N/A"}</span>
                                    <button
                                      onClick={() => {
                                        setEditingField("postcode")
                                        setEditValues({ ...editValues, postcode: postcode })
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-white md:hover:text-slate-900"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Latitude */}
                            <div className="group relative flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <span className="text-gray-400 md:text-slate-600">Latitude:</span>
                                {editingField === "latitude" ? (
                                  <div className="mt-1 flex items-center gap-1">
                                    <input
                                      type="number"
                                      step="any"
                                      value={editValues.latitude ?? (latitude?.toString() ?? "")}
                                      onChange={(e) => setEditValues({ ...editValues, latitude: e.target.value })}
                                      className="flex-1 px-2 py-1 bg-gray-800 md:bg-white text-white md:text-slate-900 border border-gray-600 md:border-gray-300 rounded text-xs"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          const newLat = editValues.latitude ? parseFloat(editValues.latitude) : latitude
                                          setLatitude(newLat)
                                          setEditingField(null)
                                          const { latitude: _, ...rest } = editValues
                                          setEditValues(rest)
                                        } else if (e.key === "Escape") {
                                          setEditingField(null)
                                          const { latitude: _, ...rest } = editValues
                                          setEditValues(rest)
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={() => {
                                        const newLat = editValues.latitude ? parseFloat(editValues.latitude) : latitude
                                        setLatitude(newLat)
                                        setEditingField(null)
                                        const { latitude: _, ...rest } = editValues
                                        setEditValues(rest)
                                      }}
                                      className="p-1 text-green-400 hover:text-green-300"
                                    >
                                      <Check className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingField(null)
                                        const { latitude: _, ...rest } = editValues
                                        setEditValues(rest)
                                      }}
                                      className="p-1 text-red-400 hover:text-red-300"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="mt-1 flex items-center gap-2">
                                    <span className="text-white md:text-slate-900">{latitude?.toFixed(6) || "N/A"}</span>
                                    <button
                                      onClick={() => {
                                        setEditingField("latitude")
                                        setEditValues({ ...editValues, latitude: latitude?.toString() ?? "" })
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-white md:hover:text-slate-900"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Longitude */}
                            <div className="group relative flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <span className="text-gray-400 md:text-slate-600">Longitude:</span>
                                {editingField === "longitude" ? (
                                  <div className="mt-1 flex items-center gap-1">
                                    <input
                                      type="number"
                                      step="any"
                                      value={editValues.longitude ?? (longitude?.toString() ?? "")}
                                      onChange={(e) => setEditValues({ ...editValues, longitude: e.target.value })}
                                      className="flex-1 px-2 py-1 bg-gray-800 md:bg-white text-white md:text-slate-900 border border-gray-600 md:border-gray-300 rounded text-xs"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          const newLng = editValues.longitude ? parseFloat(editValues.longitude) : longitude
                                          setLongitude(newLng)
                                          setEditingField(null)
                                          const { longitude: _, ...rest } = editValues
                                          setEditValues(rest)
                                        } else if (e.key === "Escape") {
                                          setEditingField(null)
                                          const { longitude: _, ...rest } = editValues
                                          setEditValues(rest)
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={() => {
                                        const newLng = editValues.longitude ? parseFloat(editValues.longitude) : longitude
                                        setLongitude(newLng)
                                        setEditingField(null)
                                        const { longitude: _, ...rest } = editValues
                                        setEditValues(rest)
                                      }}
                                      className="p-1 text-green-400 hover:text-green-300"
                                    >
                                      <Check className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingField(null)
                                        const { longitude: _, ...rest } = editValues
                                        setEditValues(rest)
                                      }}
                                      className="p-1 text-red-400 hover:text-red-300"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="mt-1 flex items-center gap-2">
                                    <span className="text-white md:text-slate-900">{longitude?.toFixed(6) || "N/A"}</span>
                                    <button
                                      onClick={() => {
                                        setEditingField("longitude")
                                        setEditValues({ ...editValues, longitude: longitude?.toString() ?? "" })
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-white md:hover:text-slate-900"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Provider */}
                            <div className="group relative flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <span className="text-gray-400 md:text-slate-600">Provider:</span>
                                {editingField === "provider" ? (
                                  <div className="mt-1 flex items-center gap-1">
                                    <div className="flex-1 min-w-0">
                                      <div className="md:hidden">
                                        <MobileDropdownSelect
                                          value={editValues.provider ?? provider ?? ""}
                                          options={PROVIDERS}
                                          onChange={(val) => setEditValues({ ...editValues, provider: val })}
                                          placeholder="Select Provider"
                                          portalContainer={dialogContentRef.current}
                                          onOpenChange={setIsSelectOpen}
                                        />
                                      </div>
                                      <div className="hidden md:block">
                                        <DesktopDropdownSelect
                                          value={editValues.provider ?? provider ?? ""}
                                          options={PROVIDERS}
                                          onChange={(val) => setEditValues({ ...editValues, provider: val })}
                                          placeholder="Select Provider"
                                          portalContainer={dialogContentRef.current}
                                          onOpenChange={setIsSelectOpen}
                                        />
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => {
                                        setProvider(editValues.provider ?? provider ?? null)
                                        setEditingField(null)
                                        const { provider: _, ...rest } = editValues
                                        setEditValues(rest)
                                      }}
                                      className="p-1 text-green-400 hover:text-green-300"
                                    >
                                      <Check className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingField(null)
                                        const { provider: _, ...rest } = editValues
                                        setEditValues(rest)
                                      }}
                                      className="p-1 text-red-400 hover:text-red-300"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="mt-1 flex items-center gap-2">
                                    <span className="text-white md:text-slate-900">{provider || "N/A"}</span>
                                    <button
                                      onClick={() => {
                                        setEditingField("provider")
                                        setEditValues({ ...editValues, provider: provider ?? "" })
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-white md:hover:text-slate-900"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Contact Email */}
                <div className="space-y-2">
                  <div className="md:hidden">
                    <MobileInput
                      label="Contact Email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => {
                      setContactEmail(e.target.value)
                      setFieldErrors(prev => ({ ...prev, contactEmail: "" }))
                    }}
                      isRequired
                    isInvalid={!!fieldErrors.contactEmail}
                    errorMessage={fieldErrors.contactEmail}
                    />
                  </div>
                  <div className="hidden md:block">
                    <DesktopInput
                      label="Contact Email"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => {
                        setContactEmail(e.target.value)
                        setFieldErrors(prev => ({ ...prev, contactEmail: "" }))
                      }}
                      isRequired
                      isInvalid={!!fieldErrors.contactEmail}
                      errorMessage={fieldErrors.contactEmail}
                  />
                  </div>
                </div>

                {/* Contact Phone */}
                <div className="space-y-2">
                  <div className="md:hidden">
                    <MobileInput
                      label="Contact Phone"
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => {
                      setContactPhone(e.target.value)
                      setFieldErrors(prev => ({ ...prev, contactPhone: "" }))
                    }}
                      isRequired
                    isInvalid={!!fieldErrors.contactPhone}
                    errorMessage={fieldErrors.contactPhone}
                    />
                  </div>
                  <div className="hidden md:block">
                    <DesktopInput
                      label="Contact Phone"
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => {
                        setContactPhone(e.target.value)
                        setFieldErrors(prev => ({ ...prev, contactPhone: "" }))
                      }}
                      isRequired
                      isInvalid={!!fieldErrors.contactPhone}
                      errorMessage={fieldErrors.contactPhone}
                  />
                  </div>
                </div>

                {/* Pharmacy ID */}
                <div className="space-y-2">
                  <div className="md:hidden">
                    <MobileDropdownSelect
                      value={pharmacyId}
                      options={pharmacyIdOptions.map((id) => ({ value: id, label: id }))}
                      onChange={(val) => {
                        setPharmacyId(val)
                      setFieldErrors(prev => ({ ...prev, pharmacyId: "" }))
                    }}
                      placeholder="Select Pharmacy ID *"
                      portalContainer={dialogContentRef.current}
                      onOpenChange={setIsSelectOpen}
                    />
                  </div>
                  <div className="hidden md:block">
                    <DesktopDropdownSelect
                      value={pharmacyId}
                      options={pharmacyIdOptions.map((id) => ({ value: id, label: id }))}
                      onChange={(val) => {
                        setPharmacyId(val)
                        setFieldErrors(prev => ({ ...prev, pharmacyId: "" }))
                      }}
                      placeholder="Select Pharmacy ID *"
                      portalContainer={dialogContentRef.current}
                      onOpenChange={setIsSelectOpen}
                    />
                  </div>
                  {fieldErrors.pharmacyId && (
                    <div className="text-red-400 md:text-red-600 text-xs mt-1">{fieldErrors.pharmacyId}</div>
                  )}
                </div>


                {/* Site Key Access */}
                <div className="space-y-2">
                  <div className="md:hidden">
                    <MobileDropdownSelect
                      value={siteKeyAccess ? "true" : "false"}
                      options={[
                        { value: "true", label: "True" },
                        { value: "false", label: "False" },
                      ]}
                      onChange={(val) => {
                        setSiteKeyAccess(val === "true")
                      setFieldErrors(prev => ({ ...prev, siteKeyAccess: "" }))
                    }}
                      placeholder="Select Site Key Access *"
                      portalContainer={dialogContentRef.current}
                      onOpenChange={setIsSelectOpen}
                    />
                  </div>
                  <div className="hidden md:block">
                    <DesktopDropdownSelect
                      value={siteKeyAccess ? "true" : "false"}
                      options={[
                        { value: "true", label: "True" },
                        { value: "false", label: "False" },
                      ]}
                      onChange={(val) => {
                        setSiteKeyAccess(val === "true")
                        setFieldErrors(prev => ({ ...prev, siteKeyAccess: "" }))
                      }}
                      placeholder="Select Site Key Access *"
                      portalContainer={dialogContentRef.current}
                      onOpenChange={setIsSelectOpen}
                    />
                  </div>
                  {fieldErrors.siteKeyAccess && (
                    <div className="text-red-400 md:text-red-600 text-xs mt-1">{fieldErrors.siteKeyAccess}</div>
                  )}
                </div>

                {/* Institution Status - only show for edit mode */}
                {isEditMode && (
                  <div className="space-y-2">
                    <div className="md:hidden">
                      <MobileDropdownSelect
                        value={institutionStatus}
                        options={[
                          { value: "ACTIVE", label: "ACTIVE" },
                          { value: "RETIRED", label: "RETIRED" },
                          { value: "RESERVED", label: "RESERVED" },
                        ]}
                        onChange={(val) => setInstitutionStatus(val || "ACTIVE")}
                        placeholder="Institution Status"
                        portalContainer={dialogContentRef.current}
                        onOpenChange={setIsSelectOpen}
                      />
                    </div>
                    <div className="hidden md:block">
                      <DesktopDropdownSelect
                        value={institutionStatus}
                        options={[
                          { value: "ACTIVE", label: "ACTIVE" },
                          { value: "RETIRED", label: "RETIRED" },
                          { value: "RESERVED", label: "RESERVED" },
                        ]}
                        onChange={(val) => setInstitutionStatus(val || "ACTIVE")}
                        placeholder="Institution Status"
                        portalContainer={dialogContentRef.current}
                        onOpenChange={setIsSelectOpen}
                      />
                    </div>
                  </div>
                )}

                {/* Institution Nickname - Optional Field */}
                <div className="space-y-2">
                  <div className="md:hidden">
                    <MobileInput
                    label="Institution Nickname"
                    value={institutionNickname}
                    onChange={(e) => setInstitutionNickname(e.target.value)}
                    />
                  </div>
                  <div className="hidden md:block">
                    <DesktopInput
                      label="Institution Nickname"
                      value={institutionNickname}
                      onChange={(e) => setInstitutionNickname(e.target.value)}
                  />
                  </div>
                </div>
              </div>
        </div>

        <DialogFooter className="gap-2 md:gap-2">
          <Button variant="bordered" onClick={() => onOpenChange(false)} disabled={saving} className="text-xs md:text-sm text-white md:text-foreground border-gray-600 md:border-gray-200 bg-black md:bg-transparent hover:bg-gray-800 md:hover:bg-gray-50">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={
              saving || 
              !poiName.trim() || 
              !locationAddress.trim() || 
              latitude === null || 
              longitude === null ||
              !institutionCode.trim() ||
              !pharmacyId.trim() ||
              !!institutionCodeError
            } 
            className="text-xs md:text-sm text-white md:text-foreground bg-[#FF8E32] md:bg-[hsl(var(--primary))] hover:bg-[#FFAA5B] md:hover:bg-[hsl(var(--primary))] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (isEditMode ? "Saving..." : "Adding...") : (isEditMode ? "Save Changes" : "Add POI")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

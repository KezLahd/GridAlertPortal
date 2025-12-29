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
import { Button, Input } from "@/components/ui/heroui"
import { MapPin, Check } from "lucide-react"

interface PlacePrediction {
  description: string
  place_id: string
}

interface AddPoiDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (
    poiName: string,
    location: string,
    latitude: number,
    longitude: number,
    contactName?: string,
    contactEmail?: string,
    contactPhone?: string,
    state?: string,
    postcode?: string
  ) => Promise<void>
  saving?: boolean
}

export function AddPoiDialog({
  open,
  onOpenChange,
  onSave,
  saving = false,
}: AddPoiDialogProps) {
  const [poiName, setPoiName] = useState("")
  const [location, setLocation] = useState("")
  const [searchValue, setSearchValue] = useState("")
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [state, setState] = useState<string>("")
  const [postcode, setPostcode] = useState<string>("")
  const [autocompleteReady, setAutocompleteReady] = useState(false)
  const [predictions, setPredictions] = useState<PlacePrediction[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false)
  const autocompleteServiceRef = React.useRef<any>(null)
  const placesServiceRef = React.useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

  const handleSelectPlace = (placeId: string, description: string) => {
    if (!placesServiceRef.current) return

    placesServiceRef.current.getDetails(
      {
        placeId,
        fields: ["formatted_address", "geometry", "name", "address_components"],
      },
      (place: any, status: string) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          if (!place.geometry?.location) {
            return
          }

          setLocation(place.formatted_address || description)
          setSearchValue(place.formatted_address || description)
          setLatitude(place.geometry.location.lat())
          setLongitude(place.geometry.location.lng())
          
          // Extract state and postcode from address components
          let extractedState = ""
          let extractedPostcode = ""
          if (place.address_components) {
            for (const component of place.address_components) {
              if (component.types.includes("administrative_area_level_1")) {
                // Map full state names to abbreviations
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
            }
          }
          setState(extractedState)
          setPostcode(extractedPostcode)
          setShowSuggestions(false)
        }
      },
    )
  }

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setPoiName("")
      setLocation("")
      setSearchValue("")
      setLatitude(null)
      setLongitude(null)
      setContactName("")
      setContactEmail("")
      setContactPhone("")
      setState("")
      setPostcode("")
      setShowSuggestions(false)
      setPredictions([])
    }
  }, [open])

  const handleSave = async () => {
    if (!poiName || !poiName.trim()) {
      return
    }
    if (!location || !location.trim()) {
      return
    }
    if (latitude === null || longitude === null) {
      return
    }

    try {
      await onSave(
        poiName.trim(),
        location.trim(),
        latitude,
        longitude,
        contactName.trim() || undefined,
        contactEmail.trim() || undefined,
        contactPhone.trim() || undefined,
        state || undefined,
        postcode || undefined
      )
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to add POI:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px] bg-black md:bg-white border-gray-800 md:border-[hsl(var(--border))] p-3 md:p-6">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg text-white md:text-foreground">Add POI</DialogTitle>
          <DialogDescription className="text-xs md:text-sm text-gray-400 md:text-muted-foreground">Add a new point of interest location to monitor</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:gap-6 py-2 md:py-4 bg-black md:bg-white">
          {/* POI Name */}
          <div className="space-y-2">
            <Input
              label="POI Name"
              value={poiName}
              onChange={(e) => setPoiName(e.target.value)}
              placeholder=""
              variant="underlined"
              labelPlacement="inside"
              className="w-full"
              classNames={{
                base: "bg-transparent",
                mainWrapper: "bg-transparent",
                inputWrapper:
                  "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-gray-600 md:border-b-orange-200 border-x-0 border-t-0 data-[hover=true]:border-b-gray-500 md:data-[hover=true]:border-b-orange-400 data-[focus=true]:border-b-orange-500 data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-0 data-[focus-visible=true]:ring-offset-0",
                input: "bg-transparent text-base text-white md:text-slate-900 placeholder:text-gray-400 md:placeholder:text-slate-500 caret-orange-500",
                label: "text-gray-300 md:text-slate-700 data-[inside=true]:text-gray-400 md:data-[inside=true]:text-slate-500",
              }}
            />
          </div>

          {/* Location */}
          <div className="space-y-2 relative">
            <div className="relative">
              <MapPin className="absolute left-1 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
              <Input
                ref={inputRef}
                label="Location"
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value)
                  if (latitude !== null || longitude !== null) {
                    setLatitude(null)
                    setLongitude(null)
                    setLocation("")
                  }
                }}
                onFocus={() => {
                  if (predictions.length > 0) {
                    setShowSuggestions(true)
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                  }
                }}
                placeholder={autocompleteReady ? "Start typing the address..." : "Loading autocomplete..."}
                disabled={!autocompleteReady}
                variant="underlined"
                labelPlacement="inside"
                className="w-full pl-8"
                classNames={{
                  base: "bg-transparent",
                  mainWrapper: "bg-transparent",
                  inputWrapper:
                    "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-gray-600 md:border-b-orange-200 border-x-0 border-t-0 data-[hover=true]:border-b-gray-500 md:data-[hover=true]:border-b-orange-400 data-[focus=true]:border-b-orange-500 data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-0 data-[focus-visible=true]:ring-offset-0",
                  input: "bg-transparent text-base !text-white md:!text-slate-900 placeholder:text-gray-400 md:placeholder:text-slate-500 caret-orange-500",
                  label: "text-gray-300 md:text-slate-700 data-[inside=true]:text-gray-400 md:data-[inside=true]:text-slate-500",
                }}
              />
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
                        <span className="text-xs md:text-sm text-gray-300 md:text-gray-900">{prediction.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Contact Name */}
          <div className="space-y-2">
            <Input
              label="Contact Name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder=""
              variant="underlined"
              labelPlacement="inside"
              className="w-full"
              classNames={{
                base: "bg-transparent",
                mainWrapper: "bg-transparent",
                inputWrapper:
                  "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-gray-600 md:border-b-orange-200 border-x-0 border-t-0 data-[hover=true]:border-b-gray-500 md:data-[hover=true]:border-b-orange-400 data-[focus=true]:border-b-orange-500 data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-0 data-[focus-visible=true]:ring-offset-0",
                input: "bg-transparent text-base text-white md:text-slate-900 placeholder:text-gray-400 md:placeholder:text-slate-500 caret-orange-500",
                label: "text-gray-300 md:text-slate-700 data-[inside=true]:text-gray-400 md:data-[inside=true]:text-slate-500",
              }}
            />
          </div>

          {/* Contact Email */}
          <div className="space-y-2">
            <Input
              label="Contact Email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder=""
              variant="underlined"
              labelPlacement="inside"
              className="w-full"
              classNames={{
                base: "bg-transparent",
                mainWrapper: "bg-transparent",
                inputWrapper:
                  "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-gray-600 md:border-b-orange-200 border-x-0 border-t-0 data-[hover=true]:border-b-gray-500 md:data-[hover=true]:border-b-orange-400 data-[focus=true]:border-b-orange-500 data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-0 data-[focus-visible=true]:ring-offset-0",
                input: "bg-transparent text-base text-white md:text-slate-900 placeholder:text-gray-400 md:placeholder:text-slate-500 caret-orange-500",
                label: "text-gray-300 md:text-slate-700 data-[inside=true]:text-gray-400 md:data-[inside=true]:text-slate-500",
              }}
            />
          </div>

          {/* Contact Phone */}
          <div className="space-y-2">
            <Input
              label="Contact Phone"
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder=""
              variant="underlined"
              labelPlacement="inside"
              className="w-full"
              classNames={{
                base: "bg-transparent",
                mainWrapper: "bg-transparent",
                inputWrapper:
                  "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-gray-600 md:border-b-orange-200 border-x-0 border-t-0 data-[hover=true]:border-b-gray-500 md:data-[hover=true]:border-b-orange-400 data-[focus=true]:border-b-orange-500 data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-0 data-[focus-visible=true]:ring-offset-0",
                input: "bg-transparent text-base text-white md:text-slate-900 placeholder:text-gray-400 md:placeholder:text-slate-500 caret-orange-500",
                label: "text-gray-300 md:text-slate-700 data-[inside=true]:text-gray-400 md:data-[inside=true]:text-slate-500",
              }}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 md:gap-0">
          <Button variant="bordered" onClick={() => onOpenChange(false)} disabled={saving} className="text-xs md:text-sm text-white md:text-foreground border-gray-600 md:border-gray-200">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !poiName.trim() || !location.trim() || latitude === null || longitude === null} className="text-xs md:text-sm text-white md:text-foreground">
            {saving ? "Adding..." : "Add POI"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

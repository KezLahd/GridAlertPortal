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
    contactPhone?: string
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
        fields: ["formatted_address", "geometry", "name"],
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
        contactPhone.trim() || undefined
      )
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to add POI:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white">
        <DialogHeader>
          <DialogTitle>Add POI</DialogTitle>
          <DialogDescription>Add a new point of interest location to monitor</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4 bg-white">
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
                  "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-orange-200 border-x-0 border-t-0 data-[hover=true]:border-b-orange-400 data-[focus=true]:border-b-orange-500 data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-0 data-[focus-visible=true]:ring-offset-0",
                input: "bg-transparent text-base text-slate-900 placeholder:text-slate-500 caret-orange-500",
                label: "text-slate-700 data-[inside=true]:text-slate-500",
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
                    "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-orange-200 border-x-0 border-t-0 data-[hover=true]:border-b-orange-400 data-[focus=true]:border-b-orange-500 data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-0 data-[focus-visible=true]:ring-offset-0",
                  input: "bg-transparent text-base text-slate-900 placeholder:text-slate-500 caret-orange-500",
                  label: "text-slate-700 data-[inside=true]:text-slate-500",
                }}
              />
              {latitude && longitude && (
                <Check className="absolute right-1 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-600 z-10" />
              )}
            </div>
            {showSuggestions && predictions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                {isLoadingPredictions ? (
                  <div className="p-3 text-sm text-gray-500">Searching addresses...</div>
                ) : (
                  <div className="py-1">
                    {predictions.map((prediction) => (
                      <button
                        key={prediction.place_id}
                        type="button"
                        onClick={() => handleSelectPlace(prediction.place_id, prediction.description)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-start gap-2 cursor-pointer"
                      >
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-900">{prediction.description}</span>
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
                  "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-orange-200 border-x-0 border-t-0 data-[hover=true]:border-b-orange-400 data-[focus=true]:border-b-orange-500 data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-0 data-[focus-visible=true]:ring-offset-0",
                input: "bg-transparent text-base text-slate-900 placeholder:text-slate-500 caret-orange-500",
                label: "text-slate-700 data-[inside=true]:text-slate-500",
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
                  "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-orange-200 border-x-0 border-t-0 data-[hover=true]:border-b-orange-400 data-[focus=true]:border-b-orange-500 data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-0 data-[focus-visible=true]:ring-offset-0",
                input: "bg-transparent text-base text-slate-900 placeholder:text-slate-500 caret-orange-500",
                label: "text-slate-700 data-[inside=true]:text-slate-500",
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
                  "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-orange-200 border-x-0 border-t-0 data-[hover=true]:border-b-orange-400 data-[focus=true]:border-b-orange-500 data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-0 data-[focus-visible=true]:ring-offset-0",
                input: "bg-transparent text-base text-slate-900 placeholder:text-slate-500 caret-orange-500",
                label: "text-slate-700 data-[inside=true]:text-slate-500",
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="bordered" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !poiName.trim() || !location.trim() || latitude === null || longitude === null}>
            {saving ? "Adding..." : "Add POI"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


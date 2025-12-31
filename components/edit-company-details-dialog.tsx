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
import { DesktopInput } from "@/components/desktop-input"
import { MobileInput } from "@/components/mobile-input"
import { MapPin, Check } from "lucide-react"


interface PlacePrediction {
  description: string
  place_id: string
}

interface EditCompanyDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentName: string
  currentLocation: string
  onSave: (name: string, location: string) => Promise<void>
}

export function EditCompanyDetailsDialog({
  open,
  onOpenChange,
  currentName,
  currentLocation,
  onSave,
}: EditCompanyDetailsDialogProps) {
  const [name, setName] = useState(currentName)
  const [location, setLocation] = useState(currentLocation)
  const [searchValue, setSearchValue] = useState(currentLocation)
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
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
      setName(currentName)
      setLocation(currentLocation)
      setSearchValue(currentLocation)
      setLatitude(null)
      setLongitude(null)
      setShowSuggestions(false)
      setPredictions([])
    }
  }, [open, currentName, currentLocation])

  const handleSave = async () => {
    if (!name || !name.trim()) {
      return
    }

    setSaving(true)
    try {
      await onSave(name.trim(), location.trim())
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to update company details:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px] bg-black md:bg-white border-gray-800 md:border-[hsl(var(--border))] p-3 md:p-6">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg text-white md:text-foreground">Edit Company Details</DialogTitle>
          <DialogDescription className="text-xs md:text-sm text-gray-400 md:text-muted-foreground">Update your company's name and location</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:gap-6 py-2 md:py-4 bg-black md:bg-white">
          {/* Company Name */}
          <div className="space-y-2">
            <div className="md:hidden">
              <MobileInput
                label="Company Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder=""
              />
            </div>
            <div className="hidden md:block">
              <DesktopInput
              label="Company Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder=""
              />
            </div>
          </div>

          {/* Company Location */}
          <div className="space-y-2 relative">
            <div className="relative">
              <MapPin className="absolute left-1 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 md:text-gray-500 z-10 pointer-events-none" />
              <div className="md:hidden">
                <MobileInput
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
                  placeholder=""
                  className="pl-8"
                />
              </div>
              <div className="hidden md:block">
                <DesktopInput
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
                  placeholder=""
                  className="pl-8"
                />
              </div>
              {latitude && longitude && (
                <Check className="absolute right-1 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-400 md:text-green-600 z-10 pointer-events-none" />
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
            <p className="text-xs text-gray-400 md:text-gray-500">
              {!autocompleteReady
                ? "Initializing address autocomplete..."
                : "Select your address from the dropdown to ensure accurate map centering"}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 md:gap-2">
          <Button variant="bordered" onClick={() => onOpenChange(false)} disabled={saving} className="text-xs md:text-sm text-white md:text-foreground border-gray-600 md:border-gray-200">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || !name.trim() || !searchValue.trim() || latitude === null || longitude === null} 
            className="text-xs md:text-sm text-white md:text-foreground bg-[#FF8E32] md:bg-[hsl(var(--primary))] hover:bg-[#FFAA5B] md:hover:bg-[hsl(var(--primary))] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#FF8E32] md:disabled:hover:bg-[hsl(var(--primary))]"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

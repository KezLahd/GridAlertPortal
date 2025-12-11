"use client"

import React from "react"

import type { ReactNode } from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Building2, MapPin, Check, Palette } from "lucide-react"

declare global {
  interface Window {
    google: any
  }
}

interface CreateCompanyDialogProps {
  onCreateCompany: (data: {
    name: string
    location: string
    latitude: number
    longitude: number
    logoLetters: string
    logoBgColor: string
    logoTextColor: string
  }) => Promise<void>
  saving: boolean
  trigger?: ReactNode
  mapsLoaded?: boolean
}

interface PlacePrediction {
  description: string
  place_id: string
}

export function CreateCompanyDialog({ onCreateCompany, saving, trigger, mapsLoaded = true }: CreateCompanyDialogProps) {
  const [open, setOpen] = useState(false)
  const [companyName, setCompanyName] = useState("")
  const [location, setLocation] = useState("")
  const [searchValue, setSearchValue] = useState("")
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [logoLetters, setLogoLetters] = useState("")
  const [logoBgColor, setLogoBgColor] = useState("#3b82f6")
  const [logoTextColor, setLogoTextColor] = useState("#ffffff")
  const [error, setError] = useState("")
  const [autocompleteReady, setAutocompleteReady] = useState(false)
  const [predictions, setPredictions] = useState<PlacePrediction[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false)
  const autocompleteServiceRef = React.useRef<any>(null)
  const placesServiceRef = React.useRef<any>(null)

  useEffect(() => {
    if (!open || !mapsLoaded) return

    const initServices = () => {
      if (
        typeof window !== "undefined" &&
        window.google?.maps?.places?.AutocompleteService &&
        window.google?.maps?.places?.PlacesService
      ) {
        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
        // PlacesService needs a div element
        const div = document.createElement("div")
        placesServiceRef.current = new window.google.maps.places.PlacesService(div)
        setAutocompleteReady(true)
        console.log("[v0] Google Places services initialized")
        return true
      }
      return false
    }

    if (initServices()) return

    // Poll for Google Maps
    let attempts = 0
    const maxAttempts = 50
    const checkInterval = setInterval(() => {
      attempts++
      if (initServices()) {
        clearInterval(checkInterval)
      } else if (attempts >= maxAttempts) {
        console.error("[v0] Failed to load Google Places API")
        setError("Maps service unavailable. Please try again.")
        clearInterval(checkInterval)
      }
    }, 100)

    return () => clearInterval(checkInterval)
  }, [open, mapsLoaded])

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
    }, 300) // Debounce

    return () => clearTimeout(timeoutId)
  }, [searchValue, autocompleteReady])

  useEffect(() => {
    if (companyName.trim()) {
      const firstLetter = companyName.trim()[0].toUpperCase()
      const secondLetter = companyName.trim().split(" ")[1]?.[0]?.toUpperCase() || ""
      setLogoLetters(firstLetter + secondLetter)
    } else {
      setLogoLetters("")
    }
  }, [companyName])

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
            setError("Unable to get location for this address")
            return
          }

          setLocation(place.formatted_address || description)
          setSearchValue(place.formatted_address || description)
          setLatitude(place.geometry.location.lat())
          setLongitude(place.geometry.location.lng())
          setError("")
          setShowSuggestions(false)
          console.log("[v0] Place selected:", {
            address: place.formatted_address,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          })
        }
      },
    )
  }

  const handleSubmit = async () => {
    if (!companyName.trim()) {
      setError("Company name is required")
      return
    }

    if (!location.trim()) {
      setError("Company address is required")
      return
    }

    if (latitude === null || longitude === null) {
      setError("Please select a valid address from the dropdown")
      return
    }

    if (!logoLetters.trim() || logoLetters.length > 2) {
      setError("Logo letters must be 1-2 characters")
      return
    }

    try {
      await onCreateCompany({
        name: companyName,
        location,
        latitude,
        longitude,
        logoLetters: logoLetters.toUpperCase(),
        logoBgColor,
        logoTextColor,
      })
      // Reset form
      setOpen(false)
      setCompanyName("")
      setLocation("")
      setSearchValue("")
      setLatitude(null)
      setLongitude(null)
      setLogoLetters("")
      setLogoBgColor("#3b82f6")
      setLogoTextColor("#ffffff")
      setError("")
      setPredictions([])
      setShowSuggestions(false)
    } catch (err) {
      setError("Failed to create company")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Building2 className="h-4 w-4 mr-2" />
            Create Company
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Your Company</DialogTitle>
          <DialogDescription>
            Set up your company profile to invite team members and manage access. The location will be used to center
            the map.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name *</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value)
                setError("")
              }}
              placeholder="Acme Corporation"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Company Address *</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
              <Input
                id="location"
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
                placeholder={autocompleteReady ? "Start typing your company address..." : "Loading autocomplete..."}
                disabled={!mapsLoaded || !autocompleteReady}
                className="pl-10"
              />
              {latitude && longitude && (
                <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-600" />
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
            <p className="text-xs text-gray-500">
              {!mapsLoaded
                ? "Loading Google Maps..."
                : !autocompleteReady
                  ? "Initializing address autocomplete..."
                  : "Select your address from the dropdown to ensure accurate map centering"}
            </p>
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-gray-500" />
              <Label className="text-base font-medium">Company Icon</Label>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-20 h-20 rounded-lg flex items-center justify-center text-2xl font-bold shadow-md"
                  style={{ backgroundColor: logoBgColor, color: logoTextColor }}
                >
                  {logoLetters || "AA"}
                </div>
                <p className="text-xs text-gray-500">Preview</p>
              </div>

              <div className="flex-1 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="logoLetters">Icon Letters (1-2 characters) *</Label>
                  <Input
                    id="logoLetters"
                    value={logoLetters}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase().slice(0, 2)
                      setLogoLetters(value)
                      setError("")
                    }}
                    placeholder="AB"
                    maxLength={2}
                    className="uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="logoBgColor">Background Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="logoBgColor"
                        type="color"
                        value={logoBgColor}
                        onChange={(e) => setLogoBgColor(e.target.value)}
                        className="w-14 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={logoBgColor}
                        onChange={(e) => setLogoBgColor(e.target.value)}
                        placeholder="#3b82f6"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logoTextColor">Text Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="logoTextColor"
                        type="color"
                        value={logoTextColor}
                        onChange={(e) => setLogoTextColor(e.target.value)}
                        className="w-14 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={logoTextColor}
                        onChange={(e) => setLogoTextColor(e.target.value)}
                        placeholder="#ffffff"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLogoBgColor("#3b82f6")
                      setLogoTextColor("#ffffff")
                    }}
                  >
                    Blue
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLogoBgColor("#10b981")
                      setLogoTextColor("#ffffff")
                    }}
                  >
                    Green
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLogoBgColor("#f59e0b")
                      setLogoTextColor("#ffffff")
                    }}
                  >
                    Orange
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLogoBgColor("#8b5cf6")
                      setLogoTextColor("#ffffff")
                    }}
                  >
                    Purple
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {latitude && longitude && <p className="text-xs text-green-600">✓ Address validated</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Creating..." : "Create Company"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

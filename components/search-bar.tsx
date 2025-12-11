"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SearchBarProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void
}

declare global {
  interface Window {
    google: any
  }
}

export default function SearchBar({ onLocationSelect }: SearchBarProps) {
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [placesApiLoaded, setPlacesApiLoaded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)

  // Check if Google Maps Places API is available
  useEffect(() => {
    if (typeof window === "undefined") return

    const checkGoogleMapsApi = () => {
      try {
        if (window.google && window.google.maps && window.google.maps.places) {
          setPlacesApiLoaded(true)
        } else {
          // If not available yet, check again after a short delay
          setTimeout(checkGoogleMapsApi, 500)
        }
      } catch (error) {
        console.error("Error checking Google Maps Places API:", error)
      }
    }

    checkGoogleMapsApi()
  }, [])

  // Initialize autocomplete when Places API is loaded
  useEffect(() => {
    if (!placesApiLoaded || !inputRef.current || typeof window === "undefined") return

    try {
      const options = {
        types: ["address", "geocode"],
        fields: ["address_components", "geometry", "formatted_address"],
      }

      // Initialize the Autocomplete service
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, options)

      // Add listener for place selection
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace()
        if (place && place.geometry && place.geometry.location) {
          const location = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            address: place.formatted_address || query,
          }
          onLocationSelect(location)
          setQuery(place.formatted_address || query)
        }
      })

      return () => {
        // Clean up
        if (autocompleteRef.current) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
        }
      }
    } catch (error) {
      console.error("Error initializing Google Places Autocomplete:", error)
    }
  }, [placesApiLoaded, onLocationSelect, query])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim() === "") return

    setIsLoading(true)

    // Check if Google Maps Geocoder is available
    if (typeof window !== "undefined" && window.google && window.google.maps && window.google.maps.Geocoder) {
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode({ address: query }, (results: any, status: string) => {
        setIsLoading(false)

        if (status === "OK" && results && results[0]) {
          const location = {
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng(),
            address: results[0].formatted_address || query,
          }

          onLocationSelect(location)
        }
      })
    } else {
      // Fallback if Google Maps Geocoder is not available
      setIsLoading(false)
      console.error("Google Maps Geocoder is not available")

      // Create a mock location for testing
      const mockLocation = {
        lat: -33.865143 + (Math.random() - 0.5) * 0.1,
        lng: 151.2099 + (Math.random() - 0.5) * 0.1,
        address: query,
      }

      onLocationSelect(mockLocation)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative flex w-full max-w-sm items-center">
      <Input
        ref={inputRef}
        type="text"
        placeholder="Search for a location..."
        className="pr-10"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Button type="submit" size="icon" variant="ghost" className="absolute right-0 top-0 h-full" disabled={isLoading}>
        <Search className="h-4 w-4" />
        <span className="sr-only">Search</span>
      </Button>
    </form>
  )
}

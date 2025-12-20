"use client"

import type React from "react"
import { useState, useRef, useEffect, useMemo } from "react"
import { Search, MapPin, Building2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SearchBarProps {
  onSearch: (query: string) => void
  onSelectOutage?: (outage: any) => void
  onSelectPoi?: (poi: any) => void
  outages?: any[]
  poiLocations?: any[]
  showPoiMarkers?: boolean
  placeholder?: string
}

export default function SearchBar({ 
  onSearch, 
  onSelectOutage, 
  onSelectPoi, 
  outages = [], 
  poiLocations = [],
  showPoiMarkers = false,
  placeholder = "Search outages and POIs..." 
}: SearchBarProps) {
  const [query, setQuery] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter and rank results
  const searchResults = useMemo(() => {
    if (!query.trim()) return []

    const searchQuery = query.trim().toLowerCase()
    // Check if this is a centre number search (must start with 'c' followed by digits)
    const isCentreNumberSearch = /^c\d+/.test(searchQuery)
    const results: Array<{ type: 'outage' | 'poi'; data: any; score: number; display: string; sortKey?: string }> = []

    // Search outages - only search area_suburb
    outages.forEach((outage) => {
      const areaSuburb = (outage.area_suburb || '').toLowerCase()
      
      if (areaSuburb.includes(searchQuery)) {
        const score = areaSuburb.indexOf(searchQuery) // Lower index = better match
        const display = `${outage.provider || 'Outage'}: ${outage.area_suburb || 'Unknown location'}`
        results.push({ type: 'outage', data: outage, score, display })
      }
    })

    // Search POIs - only if showPoiMarkers is enabled
    if (showPoiMarkers) {
      poiLocations.forEach((poi) => {
        const poiName = (poi.poi_name || '').toLowerCase()
        const centreNumber = poi.institution_code ? `C${poi.institution_code}` : ''
        const centreNumberLower = centreNumber.toLowerCase()
        
        // For centre number searches, require C prefix
        if (isCentreNumberSearch) {
          if (centreNumberLower.startsWith(searchQuery)) {
            const score = centreNumberLower.indexOf(searchQuery)
            const display = `${centreNumber} ${poi.poi_name || 'POI'}`.trim()
            // Use alphanumeric sort key for centre numbers
            const sortKey = poi.institution_code || ''
            results.push({ type: 'poi', data: poi, score, display, sortKey })
          }
        } else {
          // For name searches, only search poi_name
          if (poiName.includes(searchQuery)) {
            const score = poiName.indexOf(searchQuery)
            const display = `${centreNumber} ${poi.poi_name || 'POI'}`.trim()
            results.push({ type: 'poi', data: poi, score, display })
          }
        }
      })
    }

    // Sort results
    if (isCentreNumberSearch) {
      // For centre number searches, sort alphanumerically by institution_code
      return results
        .sort((a, b) => {
          if (a.type === 'poi' && b.type === 'poi' && a.sortKey && b.sortKey) {
            // Alphanumeric sort for centre numbers
            return a.sortKey.localeCompare(b.sortKey, undefined, { numeric: true, sensitivity: 'base' })
          }
          return a.score - b.score
        })
        .slice(0, 3)
    } else {
      // For other searches, sort by score
      return results.sort((a, b) => a.score - b.score).slice(0, 3)
    }
  }, [query, outages, poiLocations, showPoiMarkers])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim() === "") return

    onSearch(query.trim())
    setShowDropdown(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setShowDropdown(value.trim().length > 0)
  }

  const handleSelectResult = (result: { type: 'outage' | 'poi'; data: any }) => {
    if (result.type === 'outage' && onSelectOutage) {
      onSelectOutage(result.data)
    } else if (result.type === 'poi' && onSelectPoi) {
      onSelectPoi(result.data)
    }
    setShowDropdown(false)
    setQuery("")
  }

  return (
    <div className="relative w-full max-w-sm">
      <form onSubmit={handleSubmit} className="relative flex w-full items-center">
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          className="pr-10"
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.trim().length > 0 && setShowDropdown(true)}
        />
        <Button type="submit" size="icon" variant="ghost" className="absolute right-0 top-0 h-full">
          <Search className="h-4 w-4" />
          <span className="sr-only">Search</span>
        </Button>
      </form>

      {showDropdown && searchResults.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {searchResults.map((result, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectResult(result)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-b-0"
            >
              {result.type === 'outage' ? (
                <MapPin className="h-4 w-4 text-red-500 flex-shrink-0" />
              ) : (
                <Building2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
              )}
              <span className="text-sm truncate">{result.display}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

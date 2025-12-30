"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { PoiLocation } from "@/components/poi-locations-table"
import { Loader2 } from "lucide-react"

interface PoiEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  location: PoiLocation | null
  onSave: (locationId: string, updates: Partial<PoiLocation>) => Promise<void>
}

export function PoiEditDialog({ open, onOpenChange, location, onSave }: PoiEditDialogProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<PoiLocation>>({})

  useEffect(() => {
    if (location) {
      setFormData({
        institution_code: location.institution_code || "",
        poi_name: location.poi_name || "",
        street_address: location.street_address || "",
        city: location.city || "",
        state: location.state || "",
        postcode: location.postcode || "",
        country: location.country || "",
        contact_name: location.contact_name || "",
        contact_email: location.contact_email || "",
        contact_phone: location.contact_phone || "",
        latitude: location.latitude,
        longitude: location.longitude,
      })
    }
  }, [location])

  const handleChange = (field: keyof PoiLocation, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!location) return

    setIsSaving(true)
    try {
      await onSave(location.id, formData)
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save POI:", error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!location) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-3xl max-h-[90vh] overflow-y-auto bg-black md:bg-white border-gray-800 md:border-[hsl(var(--border))] p-3 md:p-6">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg text-white md:text-foreground">Edit Point of Interest</DialogTitle>
          <DialogDescription className="text-xs md:text-sm text-gray-400 md:text-muted-foreground">Update the information for this POI location</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 md:gap-x-6 gap-y-3 md:gap-y-4 py-2 md:py-4">
          {/* Institution Code */}
          <div className="space-y-1.5 md:space-y-2">
            <Label htmlFor="institution_code" className="text-xs md:text-sm text-gray-300 md:text-foreground">Centre Number</Label>
            <Input
              id="institution_code"
              value={formData.institution_code || ""}
              onChange={(e) => handleChange("institution_code", e.target.value)}
              placeholder="e.g., 12345"
              className="bg-black md:bg-white !text-white md:!text-foreground text-xs md:text-sm placeholder:text-gray-400 md:placeholder:text-muted-foreground"
            />
          </div>

          {/* POI Name */}
          <div className="space-y-1.5 md:space-y-2">
            <Label htmlFor="poi_name" className="text-xs md:text-sm text-gray-300 md:text-foreground">Institution Name</Label>
            <Input
              id="poi_name"
              value={formData.poi_name || ""}
              onChange={(e) => handleChange("poi_name", e.target.value)}
              placeholder="Enter institution name"
              className="bg-black md:bg-white !text-white md:!text-foreground text-xs md:text-sm placeholder:text-gray-400 md:placeholder:text-muted-foreground"
            />
          </div>

          {/* Street Address */}
          <div className="space-y-1.5 md:space-y-2 md:col-span-2">
            <Label htmlFor="street_address">Street Address</Label>
            <Input
              id="street_address"
              value={formData.street_address || ""}
              onChange={(e) => handleChange("street_address", e.target.value)}
              placeholder="Enter street address"
              className="bg-black md:bg-white !text-white md:!text-foreground text-xs md:text-sm placeholder:text-gray-400 md:placeholder:text-muted-foreground"
            />
          </div>

          {/* City */}
          <div className="space-y-1.5 md:space-y-2">
            <Label htmlFor="city" className="text-xs md:text-sm text-gray-300 md:text-foreground">Suburb/City</Label>
            <Input
              id="city"
              value={formData.city || ""}
              onChange={(e) => handleChange("city", e.target.value)}
              placeholder="Enter suburb"
              className="bg-black md:bg-white !text-white md:!text-foreground text-xs md:text-sm placeholder:text-gray-400 md:placeholder:text-muted-foreground"
            />
          </div>

          {/* State */}
          <div className="space-y-1.5 md:space-y-2">
            <Label htmlFor="state" className="text-xs md:text-sm text-gray-300 md:text-foreground">State</Label>
            <Input
              id="state"
              value={formData.state || ""}
              onChange={(e) => handleChange("state", e.target.value)}
              placeholder="e.g., NSW"
              className="bg-black md:bg-white !text-white md:!text-foreground text-xs md:text-sm placeholder:text-gray-400 md:placeholder:text-muted-foreground"
            />
          </div>

          {/* Postcode */}
          <div className="space-y-1.5 md:space-y-2">
            <Label htmlFor="postcode" className="text-xs md:text-sm text-gray-300 md:text-foreground">Postcode</Label>
            <Input
              id="postcode"
              value={formData.postcode || ""}
              onChange={(e) => handleChange("postcode", e.target.value)}
              placeholder="e.g., 2000"
              className="bg-black md:bg-white !text-white md:!text-foreground text-xs md:text-sm placeholder:text-gray-400 md:placeholder:text-muted-foreground"
            />
          </div>

          {/* Country */}
          <div className="space-y-1.5 md:space-y-2">
            <Label htmlFor="country" className="text-xs md:text-sm text-gray-300 md:text-foreground">Country</Label>
            <Input
              id="country"
              value={formData.country || ""}
              onChange={(e) => handleChange("country", e.target.value)}
              placeholder="e.g., Australia"
              className="bg-black md:bg-white !text-white md:!text-foreground text-xs md:text-sm placeholder:text-gray-400 md:placeholder:text-muted-foreground"
            />
          </div>

          {/* Contact Name */}
          <div className="space-y-1.5 md:space-y-2">
            <Label htmlFor="contact_name" className="text-xs md:text-sm text-gray-300 md:text-foreground">Contact Name</Label>
            <Input
              id="contact_name"
              value={formData.contact_name || ""}
              onChange={(e) => handleChange("contact_name", e.target.value)}
              placeholder="Enter contact name"
              className="bg-black md:bg-white !text-white md:!text-foreground text-xs md:text-sm placeholder:text-gray-400 md:placeholder:text-muted-foreground"
            />
          </div>

          {/* Contact Email */}
          <div className="space-y-1.5 md:space-y-2">
            <Label htmlFor="contact_email" className="text-xs md:text-sm text-gray-300 md:text-foreground">Contact Email</Label>
            <Input
              id="contact_email"
              type="email"
              value={formData.contact_email || ""}
              onChange={(e) => handleChange("contact_email", e.target.value)}
              placeholder="email@example.com"
              className="bg-black md:bg-white !text-white md:!text-foreground text-xs md:text-sm placeholder:text-gray-400 md:placeholder:text-muted-foreground"
            />
          </div>

          {/* Contact Phone */}
          <div className="space-y-1.5 md:space-y-2">
            <Label htmlFor="contact_phone" className="text-xs md:text-sm text-gray-300 md:text-foreground">Contact Phone</Label>
            <Input
              id="contact_phone"
              value={formData.contact_phone || ""}
              onChange={(e) => handleChange("contact_phone", e.target.value)}
              placeholder="Enter phone number"
              className="bg-black md:bg-white !text-white md:!text-foreground text-xs md:text-sm placeholder:text-gray-400 md:placeholder:text-muted-foreground"
            />
          </div>

          {/* Latitude */}
          <div className="space-y-1.5 md:space-y-2">
            <Label htmlFor="latitude" className="text-xs md:text-sm text-gray-300 md:text-foreground">Latitude</Label>
            <Input
              id="latitude"
              type="number"
              step="any"
              value={formData.latitude ?? ""}
              onChange={(e) => handleChange("latitude", e.target.value ? Number.parseFloat(e.target.value) : null)}
              placeholder="e.g., -33.8688"
              className="bg-black md:bg-white !text-white md:!text-foreground text-xs md:text-sm placeholder:text-gray-400 md:placeholder:text-muted-foreground"
            />
          </div>

          {/* Longitude */}
          <div className="space-y-1.5 md:space-y-2">
            <Label htmlFor="longitude" className="text-xs md:text-sm text-gray-300 md:text-foreground">Longitude</Label>
            <Input
              id="longitude"
              type="number"
              step="any"
              value={formData.longitude ?? ""}
              onChange={(e) => handleChange("longitude", e.target.value ? Number.parseFloat(e.target.value) : null)}
              placeholder="e.g., 151.2093"
              className="bg-black md:bg-white !text-white md:!text-foreground text-xs md:text-sm placeholder:text-gray-400 md:placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="flex flex-row justify-end gap-2 pt-3 md:pt-4 border-t border-gray-700 md:border-gray-200">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving} className="text-xs md:text-sm text-white md:text-foreground border-gray-600 md:border-gray-200">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="text-xs md:text-sm text-white md:text-foreground bg-[#FF8E32] md:bg-[hsl(var(--primary))] hover:bg-[#FFAA5B] md:hover:bg-[hsl(var(--primary))]">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 md:h-4 md:w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Point of Interest</DialogTitle>
          <DialogDescription>Update the information for this POI location</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-4">
          {/* Institution Code */}
          <div className="space-y-2">
            <Label htmlFor="institution_code">Centre Number</Label>
            <Input
              id="institution_code"
              value={formData.institution_code || ""}
              onChange={(e) => handleChange("institution_code", e.target.value)}
              placeholder="e.g., 12345"
            />
          </div>

          {/* POI Name */}
          <div className="space-y-2">
            <Label htmlFor="poi_name">Institution Name</Label>
            <Input
              id="poi_name"
              value={formData.poi_name || ""}
              onChange={(e) => handleChange("poi_name", e.target.value)}
              placeholder="Enter institution name"
            />
          </div>

          {/* Street Address */}
          <div className="space-y-2 col-span-2">
            <Label htmlFor="street_address">Street Address</Label>
            <Input
              id="street_address"
              value={formData.street_address || ""}
              onChange={(e) => handleChange("street_address", e.target.value)}
              placeholder="Enter street address"
            />
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label htmlFor="city">Suburb/City</Label>
            <Input
              id="city"
              value={formData.city || ""}
              onChange={(e) => handleChange("city", e.target.value)}
              placeholder="Enter suburb"
            />
          </div>

          {/* State */}
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={formData.state || ""}
              onChange={(e) => handleChange("state", e.target.value)}
              placeholder="e.g., NSW"
            />
          </div>

          {/* Postcode */}
          <div className="space-y-2">
            <Label htmlFor="postcode">Postcode</Label>
            <Input
              id="postcode"
              value={formData.postcode || ""}
              onChange={(e) => handleChange("postcode", e.target.value)}
              placeholder="e.g., 2000"
            />
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={formData.country || ""}
              onChange={(e) => handleChange("country", e.target.value)}
              placeholder="e.g., Australia"
            />
          </div>

          {/* Contact Name */}
          <div className="space-y-2">
            <Label htmlFor="contact_name">Contact Name</Label>
            <Input
              id="contact_name"
              value={formData.contact_name || ""}
              onChange={(e) => handleChange("contact_name", e.target.value)}
              placeholder="Enter contact name"
            />
          </div>

          {/* Contact Email */}
          <div className="space-y-2">
            <Label htmlFor="contact_email">Contact Email</Label>
            <Input
              id="contact_email"
              type="email"
              value={formData.contact_email || ""}
              onChange={(e) => handleChange("contact_email", e.target.value)}
              placeholder="email@example.com"
            />
          </div>

          {/* Contact Phone */}
          <div className="space-y-2">
            <Label htmlFor="contact_phone">Contact Phone</Label>
            <Input
              id="contact_phone"
              value={formData.contact_phone || ""}
              onChange={(e) => handleChange("contact_phone", e.target.value)}
              placeholder="Enter phone number"
            />
          </div>

          {/* Latitude */}
          <div className="space-y-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              type="number"
              step="any"
              value={formData.latitude ?? ""}
              onChange={(e) => handleChange("latitude", e.target.value ? Number.parseFloat(e.target.value) : null)}
              placeholder="e.g., -33.8688"
            />
          </div>

          {/* Longitude */}
          <div className="space-y-2">
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              type="number"
              step="any"
              value={formData.longitude ?? ""}
              onChange={(e) => handleChange("longitude", e.target.value ? Number.parseFloat(e.target.value) : null)}
              placeholder="e.g., 151.2093"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

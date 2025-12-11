"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface EditCompanyIconDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentLetters: string
  currentBgColor: string
  currentTextColor: string
  companyName: string
  onSave: (letters: string, bgColor: string, textColor: string) => Promise<void>
}

const COLOR_PRESETS = [
  { name: "Blue", bg: "#3b82f6", text: "#ffffff" },
  { name: "Green", bg: "#10b981", text: "#ffffff" },
  { name: "Orange", bg: "#f97316", text: "#ffffff" },
  { name: "Purple", bg: "#a855f7", text: "#ffffff" },
  { name: "Red", bg: "#ef4444", text: "#ffffff" },
  { name: "Teal", bg: "#14b8a6", text: "#ffffff" },
]

export function EditCompanyIconDialog({
  open,
  onOpenChange,
  currentLetters,
  currentBgColor,
  currentTextColor,
  companyName,
  onSave,
}: EditCompanyIconDialogProps) {
  const [letters, setLetters] = useState(currentLetters)
  const [bgColor, setBgColor] = useState(currentBgColor)
  const [textColor, setTextColor] = useState(currentTextColor)
  const [saving, setSaving] = useState(false)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setLetters(currentLetters)
      setBgColor(currentBgColor)
      setTextColor(currentTextColor)
    }
  }, [open, currentLetters, currentBgColor, currentTextColor])

  const handleLettersChange = (value: string) => {
    // Only allow uppercase letters, max 2 characters
    const formatted = value
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 2)
    setLetters(formatted)
  }

  const handleSave = async () => {
    if (!letters || letters.length === 0) {
      return
    }

    setSaving(true)
    try {
      await onSave(letters, bgColor, textColor)
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to update company icon:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Customize Company Icon</DialogTitle>
          <DialogDescription>Personalize your company's icon with custom letters and colors</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Icon Preview */}
          <div className="flex justify-center">
            <div
              className="h-24 w-24 rounded-lg flex items-center justify-center text-3xl font-bold shadow-md"
              style={{
                backgroundColor: bgColor,
                color: textColor,
              }}
            >
              {letters || "?"}
            </div>
          </div>

          {/* Letters Input */}
          <div className="space-y-2">
            <Label htmlFor="letters">Icon Letters (1-2 characters)</Label>
            <Input
              id="letters"
              value={letters}
              onChange={(e) => handleLettersChange(e.target.value)}
              placeholder="AB"
              maxLength={2}
              className="text-center text-2xl font-bold uppercase"
            />
          </div>

          {/* Background Color */}
          <div className="space-y-2">
            <Label htmlFor="bgColor">Background Color</Label>
            <div className="flex gap-2">
              <Input
                id="bgColor"
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="h-10 w-20 cursor-pointer"
              />
              <Input
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                placeholder="#3b82f6"
                className="flex-1"
              />
            </div>
          </div>

          {/* Text Color */}
          <div className="space-y-2">
            <Label htmlFor="textColor">Text Color</Label>
            <div className="flex gap-2">
              <Input
                id="textColor"
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="h-10 w-20 cursor-pointer"
              />
              <Input
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                placeholder="#ffffff"
                className="flex-1"
              />
            </div>
          </div>

          {/* Color Presets */}
          <div className="space-y-2">
            <Label>Quick Presets</Label>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_PRESETS.map((preset) => (
                <Button
                  key={preset.name}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBgColor(preset.bg)
                    setTextColor(preset.text)
                  }}
                  className="justify-start gap-2"
                >
                  <div className="h-4 w-4 rounded" style={{ backgroundColor: preset.bg }} />
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !letters}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

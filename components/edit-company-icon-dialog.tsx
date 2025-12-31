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
import { Button } from "@/components/ui/heroui"
import { Input } from "@/components/ui/heroui"
import { DesktopInput } from "@/components/desktop-input"
import { MobileInput } from "@/components/mobile-input"

interface EditCompanyIconDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentLetters: string
  currentBgColor: string
  currentTextColor: string
  companyName: string
  onSave: (letters: string, bgColor: string, textColor: string) => Promise<void>
}

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
  const [lettersError, setLettersError] = useState("")

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setLetters(currentLetters)
      setBgColor(currentBgColor)
      setTextColor(currentTextColor)
      setLettersError("")
    }
  }, [open, currentLetters, currentBgColor, currentTextColor])

  const handleLettersChange = (value: string) => {
    // Only allow uppercase letters
    const formatted = value
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
    
    // Show error if more than 2 characters
    if (formatted.length > 2) {
      setLettersError("1-2 characters only")
      setLetters(formatted.slice(0, 2))
    } else {
      setLettersError("")
      setLetters(formatted)
    }
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
      <DialogContent className="max-w-[95vw] sm:max-w-[500px] bg-black md:bg-white border-gray-800 md:border-[hsl(var(--border))] p-3 md:p-6">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg text-white md:text-foreground">Customize Company Icon</DialogTitle>
          <DialogDescription className="text-xs md:text-sm text-gray-400 md:text-muted-foreground">Personalize your company's icon with custom letters and colors</DialogDescription>
        </DialogHeader>

        <div className="py-2 md:py-4">
          {/* Desktop: 2x2 Grid Layout */}
          <div className="hidden md:grid grid-cols-2 gap-4">
            {/* Left Column: Icon spanning all rows */}
            <div className="row-span-3 flex items-center justify-center">
              <div
                className="h-28 w-28 rounded-lg flex items-center justify-center text-3xl font-bold shadow-md"
                style={{
                  backgroundColor: bgColor,
                  color: textColor,
                }}
              >
                {letters || "?"}
              </div>
            </div>

            {/* Top Right: Initials Input */}
            <div className="flex items-center">
              <div className="w-full">
                <DesktopInput
                  label="Initials"
                  value={letters}
                  onChange={(e) => handleLettersChange(e.target.value)}
                  placeholder=""
                  className="text-center text-2xl font-bold uppercase"
                />
                {lettersError && (
                  <p className="text-xs text-red-500 mt-1">{lettersError}</p>
                )}
              </div>
            </div>

            {/* Middle Row Right: Background */}
            <div className="flex gap-2 items-end">
              <input
                id="bgColor"
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="h-10 w-20 cursor-pointer"
                style={{ 
                  backgroundColor: bgColor,
                  border: 'none',
                  outline: 'none',
                  padding: 0,
                  borderRadius: '0.25rem',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  appearance: 'none'
                }}
              />
              <div className="flex-1">
                <DesktopInput
                  label="Background"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  placeholder=""
                />
              </div>
            </div>

            {/* Bottom Right: Text */}
            <div className="flex gap-2 items-end">
              <input
                id="textColor"
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="h-10 w-20 cursor-pointer"
                style={{ 
                  backgroundColor: textColor,
                  border: 'none',
                  outline: 'none',
                  padding: 0,
                  borderRadius: '0.25rem',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  appearance: 'none'
                }}
              />
              <div className="flex-1">
                <DesktopInput
                  label="Text"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  placeholder=""
                />
              </div>
            </div>
          </div>

          {/* Mobile: 2x2 Grid Layout */}
          <div className="md:hidden grid grid-cols-2 gap-3">
            {/* Top Left: Icon Preview */}
            <div className="flex items-center justify-center">
              <div
                className="h-16 w-16 rounded-lg flex items-center justify-center text-2xl font-bold shadow-md"
                style={{
                  backgroundColor: bgColor,
                  color: textColor,
                }}
              >
                {letters || "?"}
              </div>
            </div>

            {/* Top Right: Initials Input */}
            <div className="flex items-center">
              <div className="w-full [&_input]:!text-center [&_input]:text-center">
                <MobileInput
                  label="Initials"
                  value={letters}
                  onChange={(e) => handleLettersChange(e.target.value)}
                  placeholder=""
                  className="text-center text-xl font-bold uppercase"
                />
                {lettersError && (
                  <p className="text-xs text-red-500 mt-1 text-center">{lettersError}</p>
                )}
              </div>
            </div>

            {/* Bottom Left: Background */}
            <div className="flex gap-2 items-end">
              <input
                id="bgColor"
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="h-8 w-16 cursor-pointer"
                style={{ 
                  backgroundColor: bgColor,
                  border: 'none',
                  outline: 'none',
                  padding: 0,
                  borderRadius: '0.25rem',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  appearance: 'none'
                }}
              />
              <div className="flex-1">
                <MobileInput
                  label="Background"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  placeholder=""
                />
              </div>
            </div>

            {/* Bottom Right: Text */}
            <div className="flex gap-2 items-end">
              <input
                id="textColor"
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="h-8 w-16 cursor-pointer"
                style={{ 
                  backgroundColor: textColor,
                  border: 'none',
                  outline: 'none',
                  padding: 0,
                  borderRadius: '0.25rem',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  appearance: 'none'
                }}
              />
              <div className="flex-1">
                <MobileInput
                  label="Text"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  placeholder=""
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
            disabled={saving || !letters} 
            className="text-xs md:text-sm text-white md:text-foreground bg-[#FF8E32] md:bg-[hsl(var(--primary))] hover:bg-[#FFAA5B] md:hover:bg-[hsl(var(--primary))] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#FF8E32] md:disabled:hover:bg-[hsl(var(--primary))]"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

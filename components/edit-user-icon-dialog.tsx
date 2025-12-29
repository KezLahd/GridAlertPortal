"use client"

import { useState, useEffect } from "react"
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@/components/ui/heroui"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface EditUserIconDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentLetters: string
  currentBgColor: string
  currentTextColor: string
  userName: string
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

export function EditUserIconDialog({
  open,
  onOpenChange,
  currentLetters,
  currentBgColor,
  currentTextColor,
  userName,
  onSave,
}: EditUserIconDialogProps) {
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
      console.error("Failed to update user icon:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={open} onOpenChange={onOpenChange} classNames={{
      base: "bg-black md:bg-white border-gray-800 md:border-[hsl(var(--border))]",
      header: "text-white md:text-foreground text-base md:text-lg",
      body: "text-gray-300 md:text-foreground",
      footer: "text-gray-300 md:text-foreground"
    }}>
      <ModalContent className="max-w-[95vw] sm:max-w-[500px]">
        <ModalHeader className="text-base md:text-lg">Customize Your Icon</ModalHeader>
        <ModalBody className="p-3 md:p-6">
          <div className="grid gap-3 md:gap-6 py-2 md:py-4">
            {/* Icon Preview */}
            <div className="flex justify-center">
              <div
                className="h-16 w-16 md:h-24 md:w-24 rounded-lg flex items-center justify-center text-2xl md:text-3xl font-bold shadow-md"
                style={{
                  backgroundColor: bgColor,
                  color: textColor,
                }}
              >
                {letters || "?"}
              </div>
            </div>

            {/* Letters Input */}
            <div className="space-y-1.5 md:space-y-2">
              <label htmlFor="letters" className="text-xs md:text-sm font-medium text-gray-300 md:text-foreground">
                Icon Letters (1-2 characters)
              </label>
              <Input
                id="letters"
                value={letters}
                onChange={(e) => handleLettersChange(e.target.value)}
                placeholder="AB"
                maxLength={2}
                className="text-center text-xl md:text-2xl font-bold uppercase bg-black md:bg-white !text-white md:!text-foreground placeholder:text-gray-400 md:placeholder:text-muted-foreground"
              />
            </div>

            {/* Background Color */}
            <div className="space-y-1.5 md:space-y-2">
              <label htmlFor="bgColor" className="text-xs md:text-sm font-medium text-gray-300 md:text-foreground">
                Background Color
              </label>
              <div className="flex gap-2">
                <Input
                  id="bgColor"
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-8 w-16 md:h-10 md:w-20 cursor-pointer"
                />
                <Input
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  placeholder="#3b82f6"
                  className="flex-1 bg-black md:bg-white !text-white md:!text-foreground text-xs md:text-sm placeholder:text-gray-400 md:placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Text Color */}
            <div className="space-y-1.5 md:space-y-2">
              <label htmlFor="textColor" className="text-xs md:text-sm font-medium text-gray-300 md:text-foreground">
                Text Color
              </label>
              <div className="flex gap-2">
                <Input
                  id="textColor"
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="h-8 w-16 md:h-10 md:w-20 cursor-pointer"
                />
                <Input
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  placeholder="#ffffff"
                  className="flex-1 bg-black md:bg-white !text-white md:!text-foreground text-xs md:text-sm placeholder:text-gray-400 md:placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Color Presets */}
            <div className="space-y-1.5 md:space-y-2">
              <label className="text-xs md:text-sm font-medium text-gray-300 md:text-foreground">Quick Presets</label>
              <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <Button
                    key={preset.name}
                    type="button"
                    variant="bordered"
                    size="sm"
                    onClick={() => {
                      setBgColor(preset.bg)
                      setTextColor(preset.text)
                    }}
                    className="justify-start gap-2 text-white md:text-foreground border-gray-600 md:border-gray-200"
                  >
                    <div className="h-4 w-4 rounded" style={{ backgroundColor: preset.bg }} />
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="gap-2 md:gap-0">
          <Button variant="light" onPress={() => onOpenChange(false)} disabled={saving} className="text-xs md:text-sm text-white md:text-foreground">
            Cancel
          </Button>
          <Button onPress={handleSave} disabled={saving || !letters} color="primary" className="text-xs md:text-sm text-white md:text-foreground">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

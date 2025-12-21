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
    <Modal isOpen={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>Customize Your Icon</ModalHeader>
        <ModalBody>
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
              <label htmlFor="letters" className="text-sm font-medium">
                Icon Letters (1-2 characters)
              </label>
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
              <label htmlFor="bgColor" className="text-sm font-medium">
                Background Color
              </label>
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
              <label htmlFor="textColor" className="text-sm font-medium">
                Text Color
              </label>
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
              <label className="text-sm font-medium">Quick Presets</label>
              <div className="grid grid-cols-3 gap-2">
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
                    className="justify-start gap-2"
                  >
                    <div className="h-4 w-4 rounded" style={{ backgroundColor: preset.bg }} />
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onPress={handleSave} disabled={saving || !letters} color="primary">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

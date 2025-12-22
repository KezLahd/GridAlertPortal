"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"

interface PoiDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  count: number
  onConfirm: () => Promise<void>
}

export function PoiDeleteDialog({ open, onOpenChange, count, onConfirm }: PoiDeleteDialogProps) {
  const [confirmText, setConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const requiredText = "delete locations"

  const handleConfirm = async () => {
    if (confirmText.toLowerCase() !== requiredText) return

    setIsDeleting(true)
    try {
      await onConfirm()
      setConfirmText("")
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to delete POIs:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmText("")
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Delete {count} POI{count !== 1 ? "s" : ""}?
          </DialogTitle>
          <DialogDescription asChild>
            <div className="pt-3 space-y-3">
              <span className="block text-foreground font-medium">This action cannot be undone.</span>
              <span className="block">
                This will permanently delete <span className="font-semibold text-foreground">{count}</span> point
                {count !== 1 ? "s" : ""} of interest from your company's monitoring list.
              </span>
              <span className="block text-sm">
                Please type{" "}
                <span className="font-mono font-semibold bg-muted px-1.5 py-0.5 rounded">delete locations</span> to
                confirm.
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="confirm-text" className="sr-only">
            Confirmation text
          </Label>
          <Input
            id="confirm-text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type 'delete locations' to confirm"
            className="border-red-300 focus-visible:ring-red-500"
            disabled={isDeleting}
            autoComplete="off"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={confirmText.toLowerCase() !== requiredText || isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? "Deleting..." : `Delete ${count} POI${count !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

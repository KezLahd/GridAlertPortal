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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"

interface DeleteUserConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userName: string
  userEmail: string
  onConfirm: () => Promise<void>
  deleting: boolean
}

export function DeleteUserConfirmationDialog({
  open,
  onOpenChange,
  userName,
  userEmail,
  onConfirm,
  deleting,
}: DeleteUserConfirmationDialogProps) {
  const [emailInput, setEmailInput] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setEmailInput("")
      setError(null)
    }
  }, [open])

  const handleConfirm = async () => {
    if (emailInput.trim().toLowerCase() !== userEmail.toLowerCase()) {
      setError("Email does not match. Please type the email address exactly as shown.")
      return
    }

    setError(null)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (error: any) {
      setError(error.message || "Failed to delete user")
    }
  }

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(userEmail)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px] bg-black md:bg-white border-gray-800 md:border-[hsl(var(--border))] p-3 md:p-6">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg text-red-400 md:text-destructive">Delete User</DialogTitle>
          <DialogDescription className="text-xs md:text-sm text-gray-400 md:text-muted-foreground">This action cannot be undone</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:gap-6 py-2 md:py-4">
          <Alert variant="destructive" className="bg-red-900/50 md:bg-red-50 border-red-700 md:border-red-200">
            <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-red-300 md:text-red-600" />
            <AlertDescription className="text-gray-300 md:text-red-800">
              You are about to permanently delete this user. This will remove all their data and cannot be undone.
            </AlertDescription>
          </Alert>

          <div className="space-y-3 md:space-y-4">
            <div>
              <Label className="text-xs md:text-sm font-medium text-gray-300 md:text-foreground">User Name</Label>
              <p className="text-sm md:text-base font-semibold mt-1 text-gray-300 md:text-foreground">{userName}</p>
            </div>
            <div>
              <Label className="text-xs md:text-sm font-medium text-gray-300 md:text-foreground">Email Address</Label>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm md:text-base font-semibold flex-1 text-gray-300 md:text-foreground">{userEmail}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyEmail}
                  className="shrink-0"
                >
                  Copy
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmEmail" className="text-xs md:text-sm text-gray-300 md:text-foreground">
              To confirm deletion, please type the email address: <span className="font-semibold">{userEmail}</span>
            </Label>
            <Input
              id="confirmEmail"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value)
                setError(null)
              }}
              placeholder="Type email address to confirm"
              className={`text-xs md:text-sm bg-black md:bg-white !text-white md:!text-foreground placeholder:text-gray-400 md:placeholder:text-muted-foreground ${error ? "border-red-500" : ""}`}
            />
            {error && (
              <p className="text-xs md:text-sm text-red-400 md:text-red-600">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 md:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting} className="text-xs md:text-sm text-white md:text-foreground border-gray-600 md:border-gray-200">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleting || emailInput.trim().toLowerCase() !== userEmail.toLowerCase()}
            className="text-xs md:text-sm text-white"
          >
            {deleting ? "Deleting..." : "Delete User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

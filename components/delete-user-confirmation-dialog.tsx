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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-destructive">Delete User</DialogTitle>
          <DialogDescription>This action cannot be undone</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You are about to permanently delete this user. This will remove all their data and cannot be undone.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">User Name</Label>
              <p className="text-base font-semibold mt-1">{userName}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Email Address</Label>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-base font-semibold flex-1">{userEmail}</p>
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
            <Label htmlFor="confirmEmail">
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
              className={error ? "border-red-500" : ""}
            />
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleting || emailInput.trim().toLowerCase() !== userEmail.toLowerCase()}
          >
            {deleting ? "Deleting..." : "Delete User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


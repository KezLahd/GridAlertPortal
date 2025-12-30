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
import { Input } from "@/components/ui/heroui"
import { AlertCircle } from "lucide-react"

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px] bg-black md:bg-white border-gray-800 md:border-[hsl(var(--border))] p-3 md:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400 md:text-red-600 text-base md:text-lg">
            <AlertCircle className="h-4 w-4 md:h-5 md:w-5" />
            Delete User?
          </DialogTitle>
          <DialogDescription asChild>
            <div className="pt-2 md:pt-3 space-y-2 md:space-y-3">
              <span className="block text-gray-300 md:text-foreground font-medium text-xs md:text-sm">This action cannot be undone.</span>
              <span className="block text-xs md:text-sm text-gray-400 md:text-muted-foreground">
                You are about to permanently delete <span className="font-semibold text-gray-300 md:text-foreground">{userName}</span> ({userEmail}). This will remove all their data and cannot be undone.
              </span>
              <span className="block text-xs md:text-sm text-gray-400 md:text-muted-foreground">
                To confirm deletion, please type the email address: <span className="font-mono font-semibold bg-gray-800 md:bg-muted px-1.5 py-0.5 rounded text-gray-300 md:text-foreground">{userEmail}</span>
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 md:py-4">
            <Input
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value)
                setError(null)
              }}
              placeholder="Type email address to confirm"
            variant="underlined"
            labelPlacement="inside"
            className="w-full"
            classNames={{
              base: "bg-transparent group",
              mainWrapper: "bg-transparent",
              inputWrapper:
                "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-gray-600 md:border-b-red-300 border-x-0 border-t-0 data-[hover=true]:border-b-orange-500 md:data-[hover=true]:border-b-red-400 group-data-[focus-within=true]:border-b-orange-500 md:group-data-[focus-within=true]:!border-b-black transition-[border-color] duration-200 ease-in-out group-data-[focus-within=true]:outline group-data-[focus-within=true]:outline-2 group-data-[focus-within=true]:outline-black md:group-data-[focus-within=true]:outline-0 data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-offset-0 [&::after]:!bg-orange-500 group-data-[focus-within=true]:[&::after]:!bg-white md:[&::after]:!bg-black [&::after]:!transition-all [&::after]:!duration-300 [&::after]:!ease-in-out",
              input: "bg-transparent text-base !text-white md:!text-slate-900 placeholder:text-gray-400 md:placeholder:text-slate-500 caret-red-500 outline-none focus:outline-none focus-visible:outline-none",
              label: "text-gray-300 md:text-slate-700 data-[inside=true]:text-gray-400 md:data-[inside=true]:text-slate-500",
            }}
            isInvalid={!!error}
            errorMessage={error || undefined}
          />
          </div>
        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={deleting} 
            className="text-xs md:text-sm bg-[#FF8E32] hover:bg-[#FFAA5B] text-black border-0"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={deleting || emailInput.trim().toLowerCase() !== userEmail.toLowerCase()}
            className="bg-red-600 hover:bg-red-700 text-white text-xs md:text-sm"
          >
            {deleting ? "Deleting..." : "Delete User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

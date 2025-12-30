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
import { Input } from "@/components/ui/heroui"
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
      <DialogContent className="max-w-[95vw] sm:max-w-[500px] bg-black md:bg-white border-gray-800 md:border-[hsl(var(--border))] p-3 md:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400 md:text-red-600 text-base md:text-lg">
            <AlertCircle className="h-4 w-4 md:h-5 md:w-5" />
            Delete {count} POI{count !== 1 ? "s" : ""}?
          </DialogTitle>
          <DialogDescription asChild>
            <div className="pt-2 md:pt-3 space-y-2 md:space-y-3">
              <span className="block text-gray-300 md:text-foreground font-medium text-xs md:text-sm">This action cannot be undone.</span>
              <span className="block text-xs md:text-sm text-gray-400 md:text-muted-foreground">
                This will permanently delete <span className="font-semibold text-gray-300 md:text-foreground">{count}</span> point
                {count !== 1 ? "s" : ""} of interest from your company's monitoring list.
              </span>
              <span className="block text-xs md:text-sm text-gray-400 md:text-muted-foreground">
                Please type{" "}
                <span className="font-mono font-semibold bg-gray-800 md:bg-muted px-1.5 py-0.5 rounded text-gray-300 md:text-foreground">delete locations</span> to
                confirm.
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 md:py-4">
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type 'delete locations' to confirm"
            variant="underlined"
            labelPlacement="inside"
            className="w-full"
            disabled={isDeleting}
            autoComplete="off"
            classNames={{
              base: "bg-transparent group",
              mainWrapper: "bg-transparent",
              inputWrapper:
                "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-gray-600 md:border-b-red-300 border-x-0 border-t-0 data-[hover=true]:border-b-orange-500 md:data-[hover=true]:border-b-red-400 group-data-[focus-within=true]:border-b-orange-500 md:group-data-[focus-within=true]:!border-b-black transition-[border-color] duration-200 ease-in-out group-data-[focus-within=true]:outline group-data-[focus-within=true]:outline-2 group-data-[focus-within=true]:outline-black md:group-data-[focus-within=true]:outline-0 data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-offset-0 [&::after]:!bg-orange-500 group-data-[focus-within=true]:[&::after]:!bg-white md:[&::after]:!bg-black [&::after]:!transition-all [&::after]:!duration-300 [&::after]:!ease-in-out",
              input: "bg-transparent text-base !text-white md:!text-slate-900 placeholder:text-gray-400 md:placeholder:text-slate-500 caret-red-500 outline-none focus:outline-none focus-visible:outline-none",
              label: "text-gray-300 md:text-slate-700 data-[inside=true]:text-gray-400 md:data-[inside=true]:text-slate-500",
            }}
          />
        </div>
        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={isDeleting} 
            className="text-xs md:text-sm bg-[#FF8E32] hover:bg-[#FFAA5B] text-black border-0"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={confirmText.toLowerCase() !== requiredText || isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white text-xs md:text-sm"
          >
            {isDeleting ? "Deleting..." : `Delete ${count} POI${count !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

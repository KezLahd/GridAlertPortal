"use client"

import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/heroui"
import { DesktopInput } from "@/components/desktop-input"
import { MobileInput } from "@/components/mobile-input"
import { AlertCircle, Copy, Check } from "lucide-react"

interface PoiDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  count: number
  onConfirm: () => Promise<void>
}

export function PoiDeleteDialog({ open, onOpenChange, count, onConfirm }: PoiDeleteDialogProps) {
  const [confirmText, setConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const requiredText = "delete locations"
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset form when dialog opens and prevent auto-focus on mobile
  useEffect(() => {
    if (open) {
      setConfirmText("")
      setError(null)
      // Prevent auto-focus on mobile - blur any focused input elements
      if (window.innerWidth < 768) {
        // Use multiple timeouts to catch any auto-focus attempts
        const blurInput = () => {
          const activeElement = document.activeElement as HTMLElement
          if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            activeElement.blur()
          }
          if (inputRef.current) {
            inputRef.current.blur()
          }
        }
        // Blur immediately and after a short delay to catch delayed focus
        blurInput()
        const timeout1 = setTimeout(blurInput, 50)
        const timeout2 = setTimeout(blurInput, 150)
        const timeout3 = setTimeout(blurInput, 300)
        return () => {
          clearTimeout(timeout1)
          clearTimeout(timeout2)
          clearTimeout(timeout3)
        }
      }
    }
  }, [open])

  const handleCopyText = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const text = requiredText
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    
    // For iOS Safari, select the visible text element instead
    if (isIOS) {
      const textElement = document.getElementById('text-to-copy')
      if (textElement) {
        // Select the text in the visible element
        const range = document.createRange()
        range.selectNodeContents(textElement)
        const selection = window.getSelection()
        if (selection) {
          selection.removeAllRanges()
          selection.addRange(range)
        }
        
        // Try to copy
        try {
          const successful = document.execCommand('copy')
          if (successful) {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
            // Clear selection after a moment
            setTimeout(() => {
              if (selection) {
                selection.removeAllRanges()
              }
            }, 500)
          } else {
            // If execCommand fails, show the text is selected so user can manually copy
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }
        } catch (err) {
          // Show selection so user can manually copy
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }
      }
    } else {
      // For non-iOS, try clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }).catch(() => {
          // Fallback to execCommand
          execCommandCopy(text)
        })
      } else {
        execCommandCopy(text)
      }
    }
  }

  const execCommandCopy = (text: string) => {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    textArea.style.top = '0'
    textArea.setAttribute('readonly', '')
    
    document.body.appendChild(textArea)
    textArea.select()
    textArea.setSelectionRange(0, text.length)
    
    try {
      const successful = document.execCommand('copy')
      if (successful) {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (err) {
      console.error("Copy failed:", err)
    }
    
    document.body.removeChild(textArea)
  }

  const handleConfirm = async () => {
    if (confirmText.trim().toLowerCase() !== requiredText) {
      setError(`Please type "${requiredText}" exactly to confirm.`)
      return
    }

    setError(null)
    setIsDeleting(true)
    try {
      await onConfirm()
      setConfirmText("")
      onOpenChange(false)
    } catch (error: any) {
      setError(error.message || "Failed to delete POIs")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmText("")
      setError(null)
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
            <div className="pt-1 md:pt-2 space-y-1 md:space-y-2">
              <span className="block text-gray-300 md:text-foreground font-medium text-xs md:text-sm">This action cannot be undone.</span>
              <span className="block text-xs md:text-sm text-gray-400 md:text-muted-foreground">
                This will permanently delete <span className="font-semibold text-gray-300 md:text-foreground">{count}</span> point
                {count !== 1 ? "s" : ""} of interest from your company's monitoring list.
              </span>
              <span className="block text-xs md:text-sm text-gray-400 md:text-muted-foreground">
                To confirm deletion, please type:{" "}
                <span className="inline-flex items-center gap-1.5 ml-1.5">
                  <span 
                    id="text-to-copy"
                    className="font-mono font-semibold bg-gray-800 md:bg-muted px-1.5 py-0.5 rounded text-gray-300 md:text-foreground select-all cursor-text"
                    style={{ userSelect: 'all', WebkitUserSelect: 'all' }}
                  >
                    {requiredText}
                  </span>
                  <button
                    onClick={handleCopyText}
                    className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-gray-700 md:hover:bg-gray-200 transition-colors"
                    title="Copy text"
                    type="button"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-green-400 md:text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3 text-gray-400 md:text-muted-foreground" />
                    )}
                  </button>
                </span>
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="py-1 md:py-2">
          <div className="md:hidden">
            <MobileInput
              ref={inputRef}
              label="Type to confirm"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value)
                setError(null)
              }}
              placeholder=""
              isInvalid={!!error}
              errorMessage={error || undefined}
              autoFocus={false}
            />
          </div>
          <div className="hidden md:block">
            <DesktopInput
              label="Type to confirm"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value)
                setError(null)
              }}
              placeholder=""
              isInvalid={!!error}
              errorMessage={error || undefined}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button 
            variant="bordered" 
            onClick={handleClose} 
            disabled={isDeleting} 
            className="text-xs md:text-sm text-white md:text-foreground border-gray-600 md:border-gray-200 bg-black md:bg-transparent hover:bg-gray-800 md:hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={confirmText.trim().toLowerCase() !== requiredText || isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white text-xs md:text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600"
          >
            {isDeleting ? "Deleting..." : `Delete ${count} POI${count !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

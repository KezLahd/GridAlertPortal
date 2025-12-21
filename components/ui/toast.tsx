"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface Toast {
  id: string
  title: string
  type?: "default" | "success" | "error" | "warning"
  description?: string
  outages?: { suburb: string; provider: string; id: string }[]
}

interface ToastProps {
  toast: Toast
  onClose: (id: string) => void
}

function ToastItem({ toast, onClose }: ToastProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md border shadow-lg px-4 py-3 min-w-[300px] max-w-[500px]",
        "animate-in slide-in-from-top-2 fade-in duration-300",
        toast.type === "success" && "bg-green-50 border-green-200",
        toast.type === "error" && "bg-red-50 border-red-200",
        toast.type === "warning" && "bg-orange-50 border-orange-200",
        !toast.type && "bg-red-50 border-red-200"
      )}
    >
      <div className="flex-1">
        <p
          className={cn(
            "text-sm font-semibold text-center",
            toast.type === "success" && "text-green-800",
            toast.type === "error" && "text-red-800",
            toast.type === "warning" && "text-orange-800",
            !toast.type && "text-red-800",
          )}
        >
          {toast.title}
        </p>
        {toast.outages && toast.outages.length > 0 ? (
          <ul className="mt-1 text-xs text-left text-[#5e5a55] space-y-0.5">
            {toast.outages.map((item) => (
              <li key={`${item.id}-${item.suburb}-${item.provider}`}>
                <span className="font-semibold">{item.suburb}</span> — {item.provider} ({item.id})
              </li>
            ))}
          </ul>
        ) : (
          toast.description && (
            <p className="mt-1 text-xs whitespace-pre-line text-left text-[#5e5a55]">
              {toast.description}
            </p>
          )
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onClose(toast.id)}
        className={cn(
          "h-6 w-6 flex-shrink-0",
          toast.type === "success" && "text-green-700 hover:text-green-900 hover:bg-green-100",
          toast.type === "error" && "text-red-600 hover:text-red-800 hover:bg-red-100",
          toast.type === "warning" && "text-orange-600 hover:text-orange-800 hover:bg-orange-100",
          !toast.type && "text-red-600 hover:text-red-800 hover:bg-red-100"
        )}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onClose: (id: string) => void
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onClose={onClose} />
        </div>
      ))}
    </div>
  )
}

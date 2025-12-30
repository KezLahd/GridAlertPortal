"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@heroui/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandList, CommandGroup } from "@/components/ui/command"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileDropdownMultiselectProps {
  value: string[]
  options: { value: string; label: string; color?: string }[]
  onChange: (vals: string[]) => void
  placeholder: string
  renderDisplay?: (value: string[], options: { value: string; label: string; color?: string }[]) => React.ReactNode
  portalContainer?: HTMLElement | null
}

export function MobileDropdownMultiselect({
  value,
  options,
  onChange,
  placeholder,
  renderDisplay,
  portalContainer,
}: MobileDropdownMultiselectProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [triggerWidth, setTriggerWidth] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth)
    }
  }, [open])

  const handleOpenChange = (newOpen: boolean) => {
    if (typeof document !== 'undefined' && newOpen) {
      setTimeout(() => {
        const activeElement = document.activeElement as HTMLElement | null
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          activeElement.blur()
        }
      }, 0)
    }
    setOpen(newOpen)
  }
  
  const display = renderDisplay
    ? renderDisplay(value, options)
    : value.length === 0
      ? <span className="text-gray-400">{placeholder}</span>
      : value.length === options.length
        ? "All"
        : options
            .filter((o) => value.includes(o.value))
            .map((o) => o.label)
            .join(", ")

  const toggle = (val: string) => {
    const next = value.includes(val)
      ? value.filter((v) => v !== val)
      : [...value, val]
    onChange(next)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="bordered"
          disableRipple
          disableAnimation
          onTouchStart={(e) => {
            if (typeof document !== 'undefined') {
              const activeElement = document.activeElement as HTMLElement | null
              if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                activeElement.blur()
              }
            }
          }}
          className={cn(
            "!w-full !justify-between !rounded-none !border-0 !border-b-2 !border-transparent !bg-black !px-2 !py-3 !text-sm !text-white !shadow-none !outline-none !ring-0 !ring-offset-0 focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0 relative",
            "!h-[40px] !min-h-[40px] !max-h-[40px] !scale-100 data-[pressed=true]:!scale-100",
            "data-[pressed=true]:!opacity-100 data-[hover=true]:!opacity-100 aria-expanded:!opacity-100",
            "data-[pressed=true]:!text-white aria-expanded:!text-white",
            "after:absolute after:bottom-0 after:left-0 after:w-full",
            open
              ? "after:!h-[2.5px] after:!bg-[#ffffff] after:!opacity-100"
              : "after:!h-[2px] after:!bg-gray-600 after:!opacity-100",
            !open && "hover:after:!bg-orange-500"
          )}
          style={{ height: "40px", minHeight: "40px", maxHeight: "40px" }}
        >
          <span className="truncate flex items-center gap-2 !text-white">{display}</span>
          <ChevronDown className="h-4 w-4 opacity-60 !text-white flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 !bg-black md:!bg-white"
        align="start"
        style={triggerWidth ? { width: `${triggerWidth}px` } : undefined}
      >
        <Command className="!bg-black md:!bg-white">
          <CommandList className="!bg-black md:!bg-white">
            <CommandGroup className="!bg-black md:!bg-white">
              {options.map((opt) => (
                <div
              key={opt.value}
                  onClick={() => toggle(opt.value)}
                  className={cn(
                    "flex items-center gap-2 !cursor-pointer px-2 py-1.5 rounded-sm hover:!opacity-100",
                    "!bg-black !text-white hover:!bg-gray-800 hover:!text-white md:!bg-white md:!text-gray-900 md:hover:!bg-gray-100 md:hover:!text-gray-900"
                  )}
            >
                  <div
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border",
                      value.includes(opt.value)
                        ? "border-orange-500 bg-orange-500 text-white"
                        : "border-gray-600 text-transparent md:border-gray-300"
                    )}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </div>
                  {opt.label}
                </div>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

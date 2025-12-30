"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@heroui/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandList, CommandGroup } from "@/components/ui/command"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface DesktopDropdownMultiselectProps {
  value: string[]
  options: { value: string; label: string; color?: string }[]
  onChange: (vals: string[]) => void
  placeholder: string
  renderDisplay?: (value: string[], options: { value: string; label: string; color?: string }[]) => React.ReactNode
  portalContainer?: HTMLElement | null
}

export function DesktopDropdownMultiselect({
  value,
  options,
  onChange,
  placeholder,
  renderDisplay,
  portalContainer,
}: DesktopDropdownMultiselectProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [triggerWidth, setTriggerWidth] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth)
    }
  }, [open])

  const display = renderDisplay
    ? renderDisplay(value, options)
    : value.length === 0
      ? <span className="text-slate-500">{placeholder}</span>
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="bordered"
          className={cn(
            "!w-full !justify-between !rounded-none !border-0 !border-b-2 !border-transparent !bg-white !px-2 !py-3 !text-sm !text-black !shadow-none hover:!bg-white focus:!bg-white !outline-none !ring-0 !ring-offset-0 focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0 relative overflow-hidden",
            "!h-[40px] !min-h-[40px] !max-h-[40px] !scale-100",
            "data-[pressed=true]:!scale-100 data-[pressed=false]:!scale-100",
            "after:absolute after:bottom-0 after:left-0 after:w-full after:transition-all after:duration-300 after:ease-in-out",
            open ? "after:!h-[2.5px] after:!bg-black" : "after:!h-[2px] after:!bg-orange-200",
            !open && "hover:after:!bg-orange-500",
            "focus:after:!bg-black focus-visible:after:!bg-black"
          )}
          style={{ height: '40px', minHeight: '40px', maxHeight: '40px', transform: 'scale(1)' }}
        >
          <span className="truncate flex items-center gap-2 !text-black">{display}</span>
          <ChevronDown className="h-4 w-4 opacity-60 !text-black flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 !bg-white"
        align="start"
        style={triggerWidth ? { width: `${triggerWidth}px` } : undefined}
      >
        <Command className="!bg-white">
          <CommandList className="!bg-white">
            <CommandGroup className="!bg-white">
              {options.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => toggle(opt.value)}
                  className={cn(
                    "flex items-center gap-2 !cursor-pointer px-2 py-1.5 rounded-sm hover:!opacity-100",
                    "!bg-white !text-gray-900 hover:!bg-gray-100 hover:!text-gray-900"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border",
                      value.includes(opt.value)
                        ? "border-orange-500 bg-orange-500 text-white"
                        : "border-gray-300 text-transparent"
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

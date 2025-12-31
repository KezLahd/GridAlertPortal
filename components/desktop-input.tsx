"use client"

/**
 * ⚠️ LOCKED COMPONENT - DO NOT EDIT ⚠️
 * This component is considered perfect and should not be modified unless
 * explicit permission is given. Any changes require approval.
 */

import React, { forwardRef } from "react"
import { Input } from "@/components/ui/heroui"

interface DesktopInputProps {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  type?: string
  isRequired?: boolean
  className?: string
  isInvalid?: boolean
  errorMessage?: string
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export const DesktopInput = forwardRef<HTMLInputElement, DesktopInputProps>(({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  isRequired = false,
  className = "",
  isInvalid = false,
  errorMessage,
  onFocus,
  onKeyDown,
}, ref) => {
  return (
    <Input
      ref={ref}
      label={label}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      type={type}
      variant="underlined"
      labelPlacement="inside"
      isRequired={isRequired}
      isInvalid={isInvalid}
      errorMessage={errorMessage}
      className={`w-full ${className}`}
      classNames={{
        base: "bg-transparent group",
        mainWrapper: "bg-transparent",
        inputWrapper:
          "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-orange-200 border-x-0 border-t-0 data-[hover=true]:border-b-orange-400 data-[hover=true]:group-data-[focus-within=true]:border-b-orange-400 group-data-[focus-within=true]:border-b-black group-data-[focus-within=true]:border-b-[2.5px] transition-[border-color,border-width] duration-200 ease-in-out group-data-[focus-within=true]:outline group-data-[focus-within=true]:outline-2 group-data-[focus-within=true]:outline-0 data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-offset-0",
        input: "bg-transparent text-base !text-slate-900 placeholder:text-slate-500 caret-orange-500 outline-none focus:outline-none focus-visible:outline-none",
        label: "text-slate-700 data-[inside=true]:text-slate-500 group-data-[filled=true]:text-slate-700 group-data-[focus-within=true]:text-slate-700",
      }}
    />
  )
})

DesktopInput.displayName = "DesktopInput"


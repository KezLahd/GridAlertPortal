"use client"

import React from "react"
import { Input } from "@/components/ui/heroui"

interface MobileInputProps {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  type?: string
  isRequired?: boolean
  className?: string
  isInvalid?: boolean
  errorMessage?: string
}

export function MobileInput({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  isRequired = false,
  className = "",
  isInvalid = false,
  errorMessage,
}: MobileInputProps) {
  return (
    <Input
      label={label}
      value={value}
      onChange={onChange}
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
          "bg-transparent shadow-none data-[hover=true]:shadow-none data-[focus=true]:shadow-none px-1 rounded-none border-b-2 border-b-gray-600 border-x-0 border-t-0 data-[hover=true]:border-b-orange-500 group-data-[focus-within=true]:border-b-orange-500 transition-[border-color] duration-200 ease-in-out group-data-[focus-within=true]:outline group-data-[focus-within=true]:outline-2 group-data-[focus-within=true]:outline-black data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-offset-0 [&::after]:!bg-orange-500 group-data-[focus-within=true]:[&::after]:!bg-white [&::after]:!transition-all [&::after]:!duration-300 [&::after]:!ease-in-out",
        input: "bg-transparent text-base !text-white placeholder:text-gray-400 caret-orange-500 outline-none focus:outline-none focus-visible:outline-none",
        label: "text-gray-300 data-[inside=true]:text-gray-400 group-data-[filled=true]:text-white group-data-[focus-within=true]:text-white",
      }}
    />
  )
}


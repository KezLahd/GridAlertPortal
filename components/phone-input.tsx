"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type PhoneInputProps = {
  value?: string
  onChange?: (value?: string) => void
  defaultCountry?: string
  placeholder?: string
  disabled?: boolean
  error?: string
  className?: string
}

const countryCodes = [
  { code: "+61", country: "AU", name: "Australia" },
  { code: "+1", country: "US", name: "United States" },
  { code: "+44", country: "GB", name: "United Kingdom" },
  { code: "+64", country: "NZ", name: "New Zealand" },
  { code: "+65", country: "SG", name: "Singapore" },
  { code: "+91", country: "IN", name: "India" },
  { code: "+86", country: "CN", name: "China" },
  { code: "+81", country: "JP", name: "Japan" },
  { code: "+82", country: "KR", name: "South Korea" },
]

export function PhoneInput({
  value = "",
  onChange,
  defaultCountry = "AU",
  placeholder = "Enter phone number",
  disabled,
  error,
  className,
}: PhoneInputProps) {
  // Parse the value to extract country code and number
  const parseValue = (val: string) => {
    if (!val) return { countryCode: "+61", number: "" }

    // Find matching country code
    const matchingCountry = countryCodes.find((c) => val.startsWith(c.code))
    if (matchingCountry) {
      return {
        countryCode: matchingCountry.code,
        number: val.substring(matchingCountry.code.length).replace(/\D/g, ""),
      }
    }

    // Default to AU if no match
    return { countryCode: "+61", number: val.replace(/\D/g, "") }
  }

  const { countryCode: initialCode, number: initialNumber } = parseValue(value)
  const [countryCode, setCountryCode] = React.useState(initialCode)
  const [phoneNumber, setPhoneNumber] = React.useState(initialNumber)

  // Update when value changes externally
  React.useEffect(() => {
    const { countryCode: newCode, number: newNumber } = parseValue(value)
    setCountryCode(newCode)
    setPhoneNumber(newNumber)
  }, [value])

  const handleCountryChange = (newCode: string) => {
    setCountryCode(newCode)
    if (onChange) {
      onChange(phoneNumber ? `${newCode}${phoneNumber}` : newCode)
    }
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits
    const numeric = e.target.value.replace(/\D/g, "")
    setPhoneNumber(numeric)
    if (onChange) {
      onChange(numeric ? `${countryCode}${numeric}` : "")
    }
  }

  return (
    <div className={cn("space-y-2 w-full", className)}>
      <div className="grid w-full grid-cols-[140px_1fr] items-center gap-3">
        <Select value={countryCode} onValueChange={handleCountryChange} disabled={disabled}>
          <SelectTrigger
            className={cn(
              "rounded-none border-0 border-b-2 bg-white px-2 py-3 text-sm text-slate-900 shadow-none hover:bg-muted/50 focus:border-primary focus:outline-none focus:ring-0 focus:ring-offset-0",
              error ? "border-red-500" : "border-gray-200",
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {countryCodes.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                {country.code} {country.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="tel"
          value={phoneNumber}
          onChange={handleNumberChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full rounded-none border-0 border-b-2 bg-white px-2 py-3 text-sm text-slate-900 shadow-none focus:border-primary focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
            error ? "border-red-500 focus:border-red-500" : "border-gray-200",
          )}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

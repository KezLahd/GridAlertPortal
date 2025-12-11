"use client"

import * as React from "react"
import { CheckIcon, ChevronsUpDown } from "lucide-react"
import * as RPNInput from "react-phone-number-input"
import flags from "react-phone-number-input/flags"
import countryNames from "react-phone-number-input/locale/en.json"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

import "react-phone-number-input/style.css"

type PhoneInputProps = {
  value?: RPNInput.Value | string
  onChange?: (value?: RPNInput.Value | string) => void
  defaultCountry?: RPNInput.Country
  placeholder?: string
  disabled?: boolean
  error?: string
  className?: string
}

type CountrySelectProps = {
  value?: RPNInput.Country
  onChange: (country?: RPNInput.Country) => void
  options: { value: RPNInput.Country; label: string }[]
  disabled?: boolean
}

const CountrySelect = ({ value, onChange, options, disabled }: CountrySelectProps) => {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const normalizedOptions = React.useMemo(() => options.filter((opt) => Boolean(opt.value)), [options])

  const selected = React.useMemo(() => normalizedOptions.find((opt) => opt.value === value), [normalizedOptions, value])

  const filtered = React.useMemo(() => {
    if (!search) return normalizedOptions
    return normalizedOptions.filter((opt) => opt.label.toLowerCase().includes(search.toLowerCase()))
  }, [normalizedOptions, search])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="flex h-10 w-full max-w-[200px] items-center justify-between gap-2 rounded-none border-0 border-b-2 border-gray-200 bg-white px-3 py-2 text-left text-sm text-slate-900 shadow-none hover:bg-muted/50 focus:border-primary focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 min-w-0"
          disabled={disabled}
        >
          <span className="flex items-center gap-2 truncate">
            {selected ? (
              (() => {
                const Flag = flags[selected.value] as React.ComponentType<{ title: string }> | undefined
                return Flag ? <Flag title={selected.label} /> : <span className="h-4 w-4 rounded-full bg-muted" />
              })()
            ) : (
              <span className="h-4 w-4 rounded-full bg-muted" />
            )}
            <span className="truncate max-w-[140px] sm:max-w-[200px]">{selected?.label ?? "Select country"}</span>
            {selected && (
              <span className="text-xs text-muted-foreground">+{RPNInput.getCountryCallingCode(selected.value)}</span>
            )}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] max-h-[340px] p-0">
        <Command>
          <CommandInput placeholder="Search country..." value={search} onValueChange={setSearch} />
          <ScrollArea className="max-h-[280px]">
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {filtered.map((opt: { value: RPNInput.Country; label: string }) => {
                  if (!opt.value) return null
                  const code = RPNInput.getCountryCallingCode(opt.value)
                  const Flag = flags[opt.value] as React.ComponentType<{ title: string }> | undefined
                  const isSelected = value === opt.value
                  return (
                    <CommandItem
                      key={opt.value}
                      onSelect={() => {
                        onChange(opt.value)
                        setOpen(false)
                      }}
                      className="flex flex-wrap items-center gap-2 bg-white text-foreground hover:!bg-muted/70 data-[highlighted]:!bg-muted/70 data-[highlighted]:!text-foreground data-[selected]:bg-white data-[selected]:text-foreground"
                    >
                      {Flag ? <Flag title={opt.label} /> : <span className="h-4 w-4 rounded-full bg-muted" />}
                      <span className="flex-1 text-sm truncate">{opt.label}</span>
                      <span className="text-xs text-muted-foreground">+{code}</span>
                      <CheckIcon
                        className={cn("h-4 w-4", isSelected ? "opacity-100" : "opacity-0")}
                        aria-hidden="true"
                      />
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

const PhoneNumberInput = React.forwardRef<
  HTMLInputElement,
  RPNInput.DefaultInputComponentProps & {
    error?: string
    inputClassName?: string
    inputValue?: string
    onInputValueChange?: (val?: string) => void
  }
>(({ className, inputClassName, inputValue: _iv, onInputValueChange: _ic, disabled, error, ...props }, ref) => (
  <Input
    ref={ref}
    disabled={disabled}
    {...props}
    className={cn(
      "w-full rounded-none border-0 border-b-2 bg-white px-2 py-3 pr-8 text-sm text-slate-900 shadow-none focus:border-primary focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
      error ? "border-red-500 focus-border-red-500" : "border-gray-200",
      className,
      inputClassName,
    )}
  />
))
PhoneNumberInput.displayName = "PhoneNumberInput"

const PhoneInputContainer = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("grid w-full grid-cols-[minmax(145px,200px)_1fr] items-center gap-3 min-w-0", className)}
      {...props}
    />
  ),
)
PhoneInputContainer.displayName = "PhoneInputContainer"

export function PhoneInput({
  value,
  onChange,
  defaultCountry = "AU",
  placeholder = "Enter phone number",
  disabled,
  error,
  className,
}: PhoneInputProps) {
  const [country, setCountry] = React.useState<RPNInput.Country | undefined>(defaultCountry)

  React.useEffect(() => {
    setCountry(defaultCountry)
  }, [defaultCountry])

  const callingCode = React.useMemo(
    () => (country ? RPNInput.getCountryCallingCode(country) : defaultCountry ? RPNInput.getCountryCallingCode(defaultCountry) : ""),
    [country, defaultCountry],
  )

  const stripCallingCode = React.useCallback(
    (val?: RPNInput.Value | string | null) => {
      if (!val) return ""
      const raw = typeof val === "string" ? val : String(val)
      const numeric = raw.replace(/[^\d+]/g, "")
      if (!callingCode) return numeric.replace(/\D/g, "")
      return numeric.replace(new RegExp(`^\\+?${callingCode}`), "").replace(/\D/g, "")
    },
    [callingCode],
  )

  const [inputValue, setInputValue] = React.useState<string>(() => stripCallingCode(value))

  React.useEffect(() => {
    setInputValue(stripCallingCode(value))
  }, [stripCallingCode, value])

  const handleNumberChange = React.useCallback(
    (val: string) => {
      const numeric = (val ?? "").replace(/[^\d]/g, "")
      setInputValue(numeric)
      if (!onChange) return
      if (!numeric) {
        onChange("")
        return
      }
      onChange(callingCode ? `+${callingCode}${numeric}` : numeric)
    },
    [callingCode, onChange],
  )

  const options = React.useMemo(() => {
    const c = country ?? defaultCountry
    if (!c) return []
    return [{ value: c, label: (countryNames as Record<string, string>)[c] ?? c }]
  }, [country, defaultCountry])

  return (
    <div className="space-y-2 w-full">
      <PhoneInputContainer className={className}>
        <CountrySelect
          value={country}
          onChange={(c) => {
            setCountry(c)
            // When country changes, recompute calling code and propagate a rebuilt value.
            const digits = stripCallingCode(value)
            if (onChange) {
              onChange(c && digits ? (`+${RPNInput.getCountryCallingCode(c)}${digits}` as RPNInput.Value) : digits)
            }
          }}
          options={options}
          disabled={disabled}
        />
        <PhoneNumberInput
          value={inputValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNumberChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          error={error}
        />
      </PhoneInputContainer>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}


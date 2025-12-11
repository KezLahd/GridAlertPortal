"use client"

import * as React from "react"

import { type DateRange } from "react-day-picker"

import { Calendar } from "@/components/ui/calendar"

type Calendar05Props = {
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
  defaultMonth?: Date
  numberOfMonths?: number
}

const defaultRange: DateRange = {
  from: new Date(2025, 5, 12),
  to: new Date(2025, 6, 15),
}

export function Calendar05({ value, onChange, defaultMonth, numberOfMonths = 2 }: Calendar05Props) {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(() => value ?? defaultRange)

  const selectedRange = value ?? dateRange

  const handleSelect = (range: DateRange | undefined) => {
    setDateRange(range)
    onChange?.(range)
  }

  return (
    <Calendar
      mode="range"
      defaultMonth={defaultMonth ?? selectedRange?.from}
      selected={selectedRange}
      onSelect={handleSelect}
      numberOfMonths={numberOfMonths}
      className="rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm"
      classNames={{
        caption_label: "text-sm font-semibold text-[#111]",
        head_cell: "text-xs font-medium text-[#6b7280] w-9",
        row: "flex w-full mt-2",
        cell:
          "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-outside)]:bg-[#fff3e6] [&:has([aria-selected])]:bg-[#fff3e6] [&:has(.rdp-day_range_start)]:!rounded-l-md [&:has(.rdp-day_range_end)]:!rounded-r-md [&:has(.rdp-day_selected)]:!rounded-md focus-within:relative focus-within:z-20",
        day: "h-9 w-9 p-0 font-medium text-sm rounded-md aria-selected:opacity-100 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
        day_selected:
          "bg-[#FF8E32] text-white hover:bg-[#ff993f] hover:text-white focus:bg-[#FF8E32] focus:text-white rounded-md focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
        day_today:
          "border border-[#FF8E32]/40 text-[#111] rounded-md aria-selected:!bg-[#FF8E32] aria-selected:!text-white focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
        day_range_start: "bg-[#fff3e6] text-[#111] rounded-l-md",
        day_range_end: "bg-[#fff3e6] text-[#111] rounded-r-md",
        day_range_middle: "bg-[#fff3e6] text-[#111] !rounded-none",
        nav_button:
          "h-8 w-8 text-[#111] bg-transparent border-transparent hover:bg-[#f5f5f5] hover:border-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
      }}
    />
  )
}


"use client"

import { useState } from "react"
import { format, parse } from "date-fns"
import { CalendarIcon, X } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Filters } from "@/lib/types"
import type { SalesRep } from "@/hooks/use-dashboard-data"

// Safe local date parsing (avoids UTC timezone issues)
function parseLocalDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined
  return parse(dateStr, "yyyy-MM-dd", new Date())
}

// Safe local date formatting (returns YYYY-MM-DD in local time)
function formatLocalDate(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

// Format for display in the button
function formatDisplayDate(date: Date): string {
  return format(date, "MMM d, yyyy")
}

interface FilterBarProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  salesReps?: SalesRep[]
  utmSources?: string[]
  utmMediums?: string[]
  utmCampaigns?: string[]
  utmContents?: string[]
}

export function FilterBar({ 
  filters, 
  onFiltersChange,
  salesReps = [],
  utmSources = [],
  utmMediums = [],
  utmCampaigns = [],
  utmContents = [],
}: FilterBarProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  // Convert filter strings to DateRange for the Calendar
  const dateRange: DateRange | undefined = 
    filters.startDate || filters.endDate
      ? {
          from: parseLocalDate(filters.startDate),
          to: parseLocalDate(filters.endDate),
        }
      : undefined

  // Handle date range selection from Calendar
  const handleDateRangeSelect = (range: DateRange | undefined) => {
    if (!range) {
      // Clear both dates
      onFiltersChange({ ...filters, startDate: "", endDate: "" })
      return
    }

    const startDate = range.from ? formatLocalDate(range.from) : ""
    // If only start date selected, set end date equal to start for single-day filtering
    const endDate = range.to 
      ? formatLocalDate(range.to) 
      : (range.from ? formatLocalDate(range.from) : "")

    onFiltersChange({ ...filters, startDate, endDate })
  }

  // Clear dates and close popover
  const handleClearDates = () => {
    onFiltersChange({ ...filters, startDate: "", endDate: "" })
    setIsCalendarOpen(false)
  }

  // Format the display text for the button
  const getDateRangeDisplayText = () => {
    if (!filters.startDate && !filters.endDate) {
      return "Select date range"
    }
    const from = parseLocalDate(filters.startDate)
    const to = parseLocalDate(filters.endDate)
    if (from && to) {
      if (filters.startDate === filters.endDate) {
        return formatDisplayDate(from)
      }
      return `${formatDisplayDate(from)} - ${formatDisplayDate(to)}`
    }
    if (from) {
      return formatDisplayDate(from)
    }
    return "Select date range"
  }

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Label htmlFor="date-toggle" className="text-sm text-muted-foreground">
          Booking Date
        </Label>
        <Switch
          id="date-toggle"
          checked={filters.dateType === "call_date"}
          onCheckedChange={(checked) =>
            updateFilter("dateType", checked ? "call_date" : "booking_date")
          }
        />
        <Label htmlFor="date-toggle" className="text-sm text-muted-foreground">
          Call Date
        </Label>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-sm text-muted-foreground">Date Range</Label>
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              aria-label="Date range"
              className="w-[240px] justify-start text-left font-normal bg-secondary"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              <span className={!filters.startDate && !filters.endDate ? "text-muted-foreground" : ""}>
                {getDateRangeDisplayText()}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleDateRangeSelect}
              numberOfMonths={1}
              captionLayout="dropdown"
            />
            <div className="border-t border-border p-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-muted-foreground"
                onClick={handleClearDates}
              >
                <X className="mr-2 h-4 w-4" />
                Clear dates
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Select value={filters.salesRep} onValueChange={(v) => updateFilter("salesRep", v)}>
        <SelectTrigger className="w-40 bg-secondary">
          <SelectValue placeholder="Sales Rep" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Reps</SelectItem>
          {salesReps.map((rep) => (
            <SelectItem key={rep.id} value={rep.name}>
              {rep.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.utmSource} onValueChange={(v) => updateFilter("utmSource", v)}>
        <SelectTrigger className="w-32 bg-secondary">
          <SelectValue placeholder="UTM Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sources</SelectItem>
          {utmSources.map((source) => (
            <SelectItem key={source} value={source}>
              {source}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.utmMedium} onValueChange={(v) => updateFilter("utmMedium", v)}>
        <SelectTrigger className="w-32 bg-secondary">
          <SelectValue placeholder="UTM Medium" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Mediums</SelectItem>
          {utmMediums.map((medium) => (
            <SelectItem key={medium} value={medium}>
              {medium}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.utmCampaign} onValueChange={(v) => updateFilter("utmCampaign", v)}>
        <SelectTrigger className="w-36 bg-secondary">
          <SelectValue placeholder="UTM Campaign" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Campaigns</SelectItem>
          {utmCampaigns.map((campaign) => (
            <SelectItem key={campaign} value={campaign}>
              {campaign}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.utmContent} onValueChange={(v) => updateFilter("utmContent", v)}>
        <SelectTrigger className="w-32 bg-secondary">
          <SelectValue placeholder="UTM Content" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Content</SelectItem>
          {utmContents.map((content) => (
            <SelectItem key={content} value={content}>
              {content}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

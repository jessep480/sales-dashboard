"use client"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Filters } from "@/lib/types"
import type { SalesRep } from "@/hooks/use-dashboard-data"

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
  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onFiltersChange({ ...filters, [key]: value })
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

      <div className="flex items-center gap-2">
        <Label className="text-sm text-muted-foreground">From</Label>
        <Input
          type="date"
          value={filters.startDate}
          onChange={(e) => updateFilter("startDate", e.target.value)}
          className="w-36 bg-secondary"
        />
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-sm text-muted-foreground">To</Label>
        <Input
          type="date"
          value={filters.endDate}
          onChange={(e) => updateFilter("endDate", e.target.value)}
          className="w-36 bg-secondary"
        />
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

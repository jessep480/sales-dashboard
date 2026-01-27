"use client"

import { useState, useMemo, useCallback } from "react"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { AddCallModal, AddCallData } from "@/components/dashboard/add-call-modal"
import { useFilteredCalls } from "@/hooks/use-filtered-calls"
import { useCalls, useLeads, useDropdownOptions, addCall, updateCall } from "@/hooks/use-dashboard-data"
import type { Filters } from "@/lib/types"
import type { Call } from "@/hooks/use-dashboard-data"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"

const defaultFilters: Filters = {
  dateType: "booking_date",
  startDate: "2026-01-01",
  endDate: "2026-01-31",
  salesRep: "all",
  utmSource: "all",
  utmMedium: "all",
  utmCampaign: "all",
  utmContent: "all",
}

type SortKey = keyof Call
type SortDirection = "asc" | "desc"

export default function CallsPage() {
  // Fetch data from Supabase
  const { calls: supabaseCalls, loading: callsLoading, error: callsError } = useCalls()
  const { leads, loading: leadsLoading } = useLeads()
  const { options, loading: optionsLoading } = useDropdownOptions()

  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [sortKey, setSortKey] = useState<SortKey>("booking_date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Use Supabase data directly
  const calls = supabaseCalls
  const filteredCalls = useFilteredCalls(calls, filters)

  const sortedCalls = useMemo(() => {
    return [...filteredCalls].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      const modifier = sortDirection === "asc" ? 1 : -1
      if (typeof aVal === "string" && typeof bVal === "string") {
        return aVal.localeCompare(bVal) * modifier
      }
      return ((aVal as number) - (bVal as number)) * modifier
    })
  }, [filteredCalls, sortKey, sortDirection])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDirection("desc")
    }
  }

  const handleAddCall = useCallback(async (callData: AddCallData) => {
    setSaving(true)
    setSaveError(null)
    try {
      await addCall(callData)
      // Refresh the page to show new data
      window.location.reload()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to add call')
    } finally {
      setSaving(false)
    }
  }, [])

  const handleUpdateCall = useCallback(async (id: string, field: string, value: string | number) => {
    setSaving(true)
    setSaveError(null)
    try {
      // Handle sales_rep field - need to convert name to ID
      if (field === 'sales_rep') {
        const rep = options.salesReps.find(r => r.name === value)
        if (rep) {
          await updateCall(id, { sales_rep_id: rep.id })
        }
      } else {
        await updateCall(id, { [field]: value })
      }
      // Refresh the page to show updated data
      window.location.reload()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update call')
    } finally {
      setSaving(false)
    }
  }, [options.salesReps])

  const SortableHeader = ({ column, label }: { column: SortKey; label: string }) => (
    <Button
      variant="ghost"
      onClick={() => handleSort(column)}
      className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground hover:bg-transparent"
    >
      {label}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const isLoading = callsLoading || leadsLoading || optionsLoading

  return (
    <div className="space-y-6">
      {saveError && (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
          Error: {saveError}
        </div>
      )}
      
      {callsError && (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
          Error loading calls: {callsError}
        </div>
      )}

      <div className="flex items-center justify-between">
        <FilterBar 
          filters={filters} 
          onFiltersChange={setFilters}
          salesReps={options.salesReps}
          utmSources={options.utmSources}
          utmMediums={options.utmMediums}
          utmCampaigns={options.utmCampaigns}
          utmContents={options.utmContents}
        />
        <AddCallModal 
          onAdd={handleAddCall}
          leads={leads}
          salesReps={options.salesReps}
          callTypes={options.callTypes}
          utmSources={options.utmSources}
          utmMediums={options.utmMediums}
          utmCampaigns={options.utmCampaigns}
          utmContents={options.utmContents}
          loading={saving || isLoading}
        />
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">
            All Calls ({sortedCalls.length})
            {isLoading && <span className="ml-2 text-sm text-muted-foreground">Loading...</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead><SortableHeader column="id" label="ID" /></TableHead>
                  <TableHead><SortableHeader column="lead_name" label="Lead Name" /></TableHead>
                  <TableHead><SortableHeader column="sales_rep" label="Sales Rep" /></TableHead>
                  <TableHead><SortableHeader column="booking_date" label="Booking Date" /></TableHead>
                  <TableHead><SortableHeader column="call_date" label="Call Date" /></TableHead>
                  <TableHead>Booking Status</TableHead>
                  <TableHead>Confirmation</TableHead>
                  <TableHead>Show Up</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="text-right"><SortableHeader column="quality_score" label="Quality" /></TableHead>
                  <TableHead className="text-right"><SortableHeader column="upfront_revenue" label="Revenue" /></TableHead>
                  <TableHead><SortableHeader column="call_type" label="Type" /></TableHead>
                  <TableHead><SortableHeader column="utm_source" label="Source" /></TableHead>
                  <TableHead><SortableHeader column="utm_medium" label="Medium" /></TableHead>
                  <TableHead><SortableHeader column="utm_campaign" label="Campaign" /></TableHead>
                  <TableHead><SortableHeader column="utm_content" label="Content" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCalls.map((call) => (
                  <TableRow key={call.id} className="border-border">
                    <TableCell className="font-mono text-xs text-muted-foreground">{call.id}</TableCell>
                    <TableCell className="font-medium text-card-foreground">{call.lead_name}</TableCell>
                    <TableCell>
                      <Select
                        value={call.sales_rep}
                        onValueChange={(v) => handleUpdateCall(call.id, "sales_rep", v)}
                        disabled={saving}
                      >
                        <SelectTrigger className="h-8 w-32 bg-secondary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {options.salesReps.map((rep) => (
                            <SelectItem key={rep.id} value={rep.name}>
                              {rep.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-card-foreground">{call.booking_date}</TableCell>
                    <TableCell className="text-card-foreground">{call.call_date}</TableCell>
                    <TableCell>
                      <Select
                        value={call.booking_status}
                        onValueChange={(v) => handleUpdateCall(call.id, "booking_status", v)}
                        disabled={saving}
                      >
                        <SelectTrigger className="h-8 w-28 bg-secondary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="canceled">Canceled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={call.confirmation_status}
                        onValueChange={(v) => handleUpdateCall(call.id, "confirmation_status", v)}
                        disabled={saving}
                      >
                        <SelectTrigger className="h-8 w-24 bg-secondary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={call.show_up_status}
                        onValueChange={(v) => handleUpdateCall(call.id, "show_up_status", v)}
                        disabled={saving}
                      >
                        <SelectTrigger className="h-8 w-24 bg-secondary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={call.call_outcome}
                        onValueChange={(v) => handleUpdateCall(call.id, "call_outcome", v)}
                        disabled={saving}
                      >
                        <SelectTrigger className="h-8 w-28 bg-secondary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="closed_won">Closed Won</SelectItem>
                          <SelectItem value="closed_lost">Closed Lost</SelectItem>
                          <SelectItem value="no_show">No Show</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right text-card-foreground">{call.quality_score}</TableCell>
                    <TableCell className="text-right text-chart-2">{formatCurrency(call.upfront_revenue)}</TableCell>
                    <TableCell className="text-card-foreground capitalize">{call.call_type}</TableCell>
                    <TableCell className="text-muted-foreground">{call.utm_source}</TableCell>
                    <TableCell className="text-muted-foreground">{call.utm_medium}</TableCell>
                    <TableCell className="text-muted-foreground">{call.utm_campaign}</TableCell>
                    <TableCell className="text-muted-foreground">{call.utm_content}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

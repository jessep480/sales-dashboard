"use client"

import { useState, useEffect } from "react"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { AddCallModal, AddCallData } from "@/components/dashboard/add-call-modal"
import { useCallsQuery, useDropdownOptions, useAddCall, useUpdateCall } from "@/hooks/use-dashboard-data"
import { normalizeHttpUrl, parseDbError } from "@/lib/utils"
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
import { ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Inline edit input component with commit-on-blur pattern
// Note: onCommit always receives a string; the caller is responsible for parsing
function InlineEditInput({ 
  value, 
  onCommit, 
  type = "text",
  className = "",
  disabled = false,
  ...props 
}: { 
  value: string | number | null
  onCommit: (value: string) => void
  type?: "text" | "number" | "date"
  className?: string
  disabled?: boolean
  min?: number
  max?: number
  step?: number
  placeholder?: string
}) {
  const [localValue, setLocalValue] = useState(String(value ?? ""))
  
  // Sync external value changes
  useEffect(() => {
    setLocalValue(String(value ?? ""))
  }, [value])
  
  const handleCommit = () => {
    if (localValue !== String(value ?? "")) {
      onCommit(localValue)
    }
  }
  
  return (
    <Input
      type={type}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleCommit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur()
        }
        if (e.key === "Escape") {
          setLocalValue(String(value ?? ""))
          e.currentTarget.blur()
        }
      }}
      className={className}
      disabled={disabled}
      {...props}
    />
  )
}

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

const PAGE_SIZE = 50

type SortKey = keyof Call
type SortDirection = "asc" | "desc"

export default function CallsPage() {
  // UI state
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [sortKey, setSortKey] = useState<SortKey>("booking_date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [page, setPage] = useState(0)
  const [leadNameErrors, setLeadNameErrors] = useState<Record<string, string>>({})
  const [hubspotErrors, setHubspotErrors] = useState<Record<string, string>>({})

  // Fetch data with server-side filtering, sorting, and pagination
  const { data: callsData, loading: callsLoading, isFetching, error: callsError } = useCallsQuery({
    filters,
    sortKey,
    sortDirection,
    page,
    pageSize: PAGE_SIZE,
  })
  const { options, loading: optionsLoading } = useDropdownOptions()

  // Mutations
  const addCallMutation = useAddCall()
  const updateCallMutation = useUpdateCall()

  // Mutation states
  const saving = addCallMutation.isPending || updateCallMutation.isPending
  const saveError = addCallMutation.error || updateCallMutation.error

  // Reset page when filters change
  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters)
    setPage(0) // Reset to first page when filters change
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDirection("desc")
    }
    setPage(0) // Reset to first page when sort changes
  }

  const handleAddCall = (callData: AddCallData) => {
    addCallMutation.mutate(callData, {
      onSuccess: () => setPage(0), // Go to first page to see new call
    })
  }

  const handleUpdateCall = (id: string, field: string, value: string | number | null) => {
    if (field === "lead_name") {
      const trimmed = String(value ?? "").trim()
      if (!trimmed) {
        setLeadNameErrors((prev) => ({ ...prev, [id]: "Lead name is required." }))
        return
      }
      setLeadNameErrors((prev) => {
        if (!prev[id]) return prev
        const next = { ...prev }
        delete next[id]
        return next
      })
      updateCallMutation.mutate({ id, updates: { lead_name: trimmed } })
      return
    }

    if (field === "hubspot_contact_url") {
      const raw = String(value ?? "")
      const normalized = normalizeHttpUrl(raw)
      if (raw.trim() && !normalized) {
        setHubspotErrors((prev) => ({ ...prev, [id]: "Enter a valid http(s) URL." }))
        return
      }
      setHubspotErrors((prev) => {
        if (!prev[id]) return prev
        const next = { ...prev }
        delete next[id]
        return next
      })
      updateCallMutation.mutate({ id, updates: { hubspot_contact_url: normalized } })
      return
    }

    // Handle sales_rep field - need to convert name to ID
    if (field === 'sales_rep') {
      const rep = options.salesReps.find(r => r.name === value)
      if (rep) {
        updateCallMutation.mutate({ id, updates: { sales_rep_id: rep.id } })
      }
      return
    }
    
    updateCallMutation.mutate({ id, updates: { [field]: value } })
  }

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

  const formatCurrency = (amount: number | null) => {
    if (amount == null) return null
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const isLoading = callsLoading || optionsLoading

  // Pagination helpers
  const { rows: calls, totalCount, totalPages } = callsData
  const canGoBack = page > 0
  const canGoForward = page < totalPages - 1

  return (
    <div className="space-y-6">
      {saveError && (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
          Error: {parseDbError(saveError)}
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
          onFiltersChange={handleFiltersChange}
          salesReps={options.salesReps}
          utmSources={options.utmSources}
          utmMediums={options.utmMediums}
          utmCampaigns={options.utmCampaigns}
          utmContents={options.utmContents}
        />
        <AddCallModal 
          onAdd={handleAddCall}
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-card-foreground">
              All Calls ({totalCount})
              {(isLoading || isFetching) && (
                <Loader2 className="ml-2 h-4 w-4 animate-spin inline" />
              )}
            </CardTitle>
            
            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {Math.max(1, totalPages)}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage(0)}
                  disabled={!canGoBack || isFetching}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage(p => p - 1)}
                  disabled={!canGoBack || isFetching}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage(p => p + 1)}
                  disabled={!canGoForward || isFetching}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage(totalPages - 1)}
                  disabled={!canGoForward || isFetching}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead><SortableHeader column="id" label="ID" /></TableHead>
                  <TableHead><SortableHeader column="lead_name" label="Lead Name" /></TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>HubSpot</TableHead>
                  <TableHead><SortableHeader column="sales_rep" label="Sales Rep" /></TableHead>
                  <TableHead><SortableHeader column="booking_date" label="Booking Date" /></TableHead>
                  <TableHead><SortableHeader column="call_date" label="Call Date" /></TableHead>
                  <TableHead>Booking Status</TableHead>
                  <TableHead>Confirmation</TableHead>
                  <TableHead>Show Up</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead><SortableHeader column="close_date" label="Close Date" /></TableHead>
                  <TableHead>Demo Type</TableHead>
                  <TableHead className="text-right"><SortableHeader column="quality_score" label="Quality" /></TableHead>
                  <TableHead className="text-right"><SortableHeader column="upfront_revenue" label="Revenue" /></TableHead>
                  <TableHead><SortableHeader column="call_type" label="Type" /></TableHead>
                  <TableHead>Recording</TableHead>
                  <TableHead><SortableHeader column="utm_source" label="Source" /></TableHead>
                  <TableHead><SortableHeader column="utm_medium" label="Medium" /></TableHead>
                  <TableHead><SortableHeader column="utm_campaign" label="Campaign" /></TableHead>
                  <TableHead><SortableHeader column="utm_content" label="Content" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call) => (
                  <TableRow key={call.id} className="border-border">
                    <TableCell className="font-mono text-xs text-muted-foreground">{call.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <InlineEditInput
                          value={call.lead_name}
                          onCommit={(v) => handleUpdateCall(call.id, "lead_name", v)}
                          className="h-8 w-36 bg-secondary"
                          disabled={saving}
                          placeholder="Lead name"
                        />
                        {leadNameErrors[call.id] && (
                          <p className="text-xs text-destructive">{leadNameErrors[call.id]}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <InlineEditInput
                        value={call.lead_email || ""}
                        onCommit={(v) => handleUpdateCall(call.id, "lead_email", v || null)}
                        className="h-8 w-40 bg-secondary text-muted-foreground"
                        disabled={saving}
                        placeholder="email@..."
                      />
                    </TableCell>
                    <TableCell>
                      <InlineEditInput
                        value={call.lead_phone || ""}
                        onCommit={(v) => handleUpdateCall(call.id, "lead_phone", v || null)}
                        className="h-8 w-32 bg-secondary text-muted-foreground"
                        disabled={saving}
                        placeholder="(555)..."
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <InlineEditInput
                            value={call.hubspot_contact_url || ""}
                            onCommit={(v) => handleUpdateCall(call.id, "hubspot_contact_url", v || null)}
                            className="h-8 w-36 bg-secondary text-muted-foreground"
                            disabled={saving}
                            placeholder="https://..."
                          />
                          {call.hubspot_contact_url && /^https?:\/\//i.test(call.hubspot_contact_url) && (
                            <a
                              href={call.hubspot_contact_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-600"
                            >
                              <ExternalLink className="h-4 w-4" />
                              <span className="sr-only">Open HubSpot</span>
                            </a>
                          )}
                        </div>
                        {hubspotErrors[call.id] && (
                          <p className="text-xs text-destructive">{hubspotErrors[call.id]}</p>
                        )}
                      </div>
                    </TableCell>
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
                    <TableCell>
                      <InlineEditInput
                        type="date"
                        value={call.booking_date}
                        onCommit={(v) => handleUpdateCall(call.id, "booking_date", v)}
                        className="h-8 w-32 bg-secondary"
                        disabled={saving}
                      />
                    </TableCell>
                    <TableCell>
                      <InlineEditInput
                        type="date"
                        value={call.call_date}
                        onCommit={(v) => handleUpdateCall(call.id, "call_date", v)}
                        className="h-8 w-32 bg-secondary"
                        disabled={saving}
                      />
                    </TableCell>
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
                          <SelectItem value="canceled">Canceled</SelectItem>
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
                          <SelectItem value="disqualified">Disqualified</SelectItem>
                          <SelectItem value="follow_up">Follow Up</SelectItem>
                          <SelectItem value="closed_won">Closed Won</SelectItem>
                          <SelectItem value="closed_lost">Closed Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <InlineEditInput
                        type="date"
                        value={call.close_date || ""}
                        onCommit={(v) => handleUpdateCall(call.id, "close_date", v || null)}
                        className="h-8 w-32 bg-secondary"
                        disabled={saving}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={call.demo_type || ""}
                        onValueChange={(v) => handleUpdateCall(call.id, "demo_type", v)}
                        disabled={saving}
                      >
                        <SelectTrigger className="h-8 w-44 bg-secondary">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="marketing_system_demo">Marketing System</SelectItem>
                          <SelectItem value="inbound_leads_demo">Inbound Leads</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <InlineEditInput
                        type="number"
                        value={call.quality_score}
                        onCommit={(v) => {
                          const num = v === "" ? null : Math.min(5, Math.max(1, parseInt(v)))
                          handleUpdateCall(call.id, "quality_score", num)
                        }}
                        min={1}
                        max={5}
                        className="h-8 w-16 bg-secondary text-right"
                        disabled={saving}
                        placeholder="—"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <InlineEditInput
                        type="number"
                        value={call.upfront_revenue}
                        onCommit={(v) => {
                          const num = v === "" ? null : Math.max(0, parseFloat(v))
                          handleUpdateCall(call.id, "upfront_revenue", num)
                        }}
                        min={0}
                        step={100}
                        className="h-8 w-24 bg-secondary text-right text-chart-2"
                        disabled={saving}
                        placeholder="—"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={call.call_type || ""}
                        onValueChange={(v) => handleUpdateCall(call.id, "call_type", v)}
                        disabled={saving}
                      >
                        <SelectTrigger className="h-8 w-28 bg-secondary">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {options.callTypes.length > 0 ? (
                            options.callTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))
                          ) : (
                            <>
                              <SelectItem value="first_call">First Call</SelectItem>
                              <SelectItem value="second_call">Second Call</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <InlineEditInput
                        type="text"
                        value={call.zoom_recording_url || ""}
                        onCommit={(v) => handleUpdateCall(call.id, "zoom_recording_url", v || null)}
                        className="h-8 w-32 bg-secondary text-blue-500"
                        disabled={saving}
                        placeholder="URL..."
                      />
                    </TableCell>
                    <TableCell>
                      {options.utmSources.length > 0 ? (
                        <Select
                          value={call.utm_source || ""}
                          onValueChange={(v) => handleUpdateCall(call.id, "utm_source", v)}
                          disabled={saving}
                        >
                          <SelectTrigger className="h-8 w-28 bg-secondary">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {options.utmSources.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <InlineEditInput
                          value={call.utm_source || ""}
                          onCommit={(v) => handleUpdateCall(call.id, "utm_source", v)}
                          className="h-8 w-28 bg-secondary text-muted-foreground"
                          disabled={saving}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {options.utmMediums.length > 0 ? (
                        <Select
                          value={call.utm_medium || ""}
                          onValueChange={(v) => handleUpdateCall(call.id, "utm_medium", v)}
                          disabled={saving}
                        >
                          <SelectTrigger className="h-8 w-28 bg-secondary">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {options.utmMediums.map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <InlineEditInput
                          value={call.utm_medium || ""}
                          onCommit={(v) => handleUpdateCall(call.id, "utm_medium", v)}
                          className="h-8 w-28 bg-secondary text-muted-foreground"
                          disabled={saving}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {options.utmCampaigns.length > 0 ? (
                        <Select
                          value={call.utm_campaign || ""}
                          onValueChange={(v) => handleUpdateCall(call.id, "utm_campaign", v)}
                          disabled={saving}
                        >
                          <SelectTrigger className="h-8 w-28 bg-secondary">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {options.utmCampaigns.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <InlineEditInput
                          value={call.utm_campaign || ""}
                          onCommit={(v) => handleUpdateCall(call.id, "utm_campaign", v)}
                          className="h-8 w-28 bg-secondary text-muted-foreground"
                          disabled={saving}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {options.utmContents.length > 0 ? (
                        <Select
                          value={call.utm_content || ""}
                          onValueChange={(v) => handleUpdateCall(call.id, "utm_content", v)}
                          disabled={saving}
                        >
                          <SelectTrigger className="h-8 w-28 bg-secondary">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {options.utmContents.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <InlineEditInput
                          value={call.utm_content || ""}
                          onCommit={(v) => handleUpdateCall(call.id, "utm_content", v)}
                          className="h-8 w-28 bg-secondary text-muted-foreground"
                          disabled={saving}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Bottom pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <span className="text-sm text-muted-foreground">
                Showing {page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount} calls
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p - 1)}
                  disabled={!canGoBack || isFetching}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={!canGoForward || isFetching}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

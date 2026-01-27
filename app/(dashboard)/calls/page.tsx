"use client"

import { useState } from "react"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { AddCallModal, AddCallData } from "@/components/dashboard/add-call-modal"
import { useCallsQuery, useLeads, useDropdownOptions, useAddCall, useUpdateCall } from "@/hooks/use-dashboard-data"
import { parseDbError } from "@/lib/utils"
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
import { ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react"
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

const PAGE_SIZE = 50

type SortKey = keyof Call
type SortDirection = "asc" | "desc"

export default function CallsPage() {
  // UI state
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [sortKey, setSortKey] = useState<SortKey>("booking_date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [page, setPage] = useState(0)

  // Fetch data with server-side filtering, sorting, and pagination
  const { data: callsData, loading: callsLoading, isFetching, error: callsError } = useCallsQuery({
    filters,
    sortKey,
    sortDirection,
    page,
    pageSize: PAGE_SIZE,
  })
  const { leads, loading: leadsLoading } = useLeads()
  const { options, loading: optionsLoading } = useDropdownOptions()

  // Mutations
  const addCallMutation = useAddCall()
  const updateCallMutation = useUpdateCall()

  // Mutation states
  const saving = addCallMutation.isPending || updateCallMutation.isPending
  const saveError = addCallMutation.error || updateCallMutation.error

  // Reset page when filters change
  const handleFiltersChange = (newFilters: Filters) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c234b52f-e0bd-48ce-ad7e-257f6bed2945',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H1',location:'calls/page.tsx:handleFiltersChange',message:'filters change',data:{prevFilters:filters,nextFilters:newFilters,prevPage:page},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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

  const handleUpdateCall = (id: string, field: string, value: string | number) => {
    // Handle sales_rep field - need to convert name to ID
    if (field === 'sales_rep') {
      const rep = options.salesReps.find(r => r.name === value)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c234b52f-e0bd-48ce-ad7e-257f6bed2945',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H2',location:'calls/page.tsx:handleUpdateCall',message:'update sales_rep',data:{field,value,repFound:Boolean(rep),page,sortKey,sortDirection,filters},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (rep) {
        updateCallMutation.mutate({ id, updates: { sales_rep_id: rep.id } })
      }
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c234b52f-e0bd-48ce-ad7e-257f6bed2945',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H1',location:'calls/page.tsx:handleUpdateCall',message:'update field',data:{field,value,page,sortKey,sortDirection,filters},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      updateCallMutation.mutate({ id, updates: { [field]: value } })
    }
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const isLoading = callsLoading || leadsLoading || optionsLoading

  // Pagination helpers
  const { rows: calls, totalCount, totalPages } = callsData
  const canGoBack = page > 0
  const canGoForward = page < totalPages - 1

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c234b52f-e0bd-48ce-ad7e-257f6bed2945',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H1',location:'calls/page.tsx:render',message:'render state',data:{filters,sortKey,sortDirection,page,totalCount,totalPages,isLoading,isFetching},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

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
                    <TableCell className="text-card-foreground">{call.close_date || "—"}</TableCell>
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
                    <TableCell className="text-right text-card-foreground">{call.quality_score}</TableCell>
                    <TableCell className="text-right text-chart-2">{formatCurrency(call.upfront_revenue)}</TableCell>
                    <TableCell className="text-card-foreground capitalize">{call.call_type}</TableCell>
                    <TableCell>
                      {call.zoom_recording_url ? (
                        <a 
                          href={call.zoom_recording_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-400 underline"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{call.utm_source}</TableCell>
                    <TableCell className="text-muted-foreground">{call.utm_medium}</TableCell>
                    <TableCell className="text-muted-foreground">{call.utm_campaign}</TableCell>
                    <TableCell className="text-muted-foreground">{call.utm_content}</TableCell>
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

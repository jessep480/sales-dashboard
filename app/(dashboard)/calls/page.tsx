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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Label } from "@/components/ui/label"

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
const COLUMN_STORAGE_KEY = "calls.visibleColumns.v1"

type SortKey = keyof Call
type SortDirection = "asc" | "desc"

type Column = {
  id: string
  label: string
  sortable?: SortKey
  headerClassName?: string
  cellClassName?: string
  render: (call: Call) => React.ReactNode
}

const PRESET_1_COLUMNS = [
  "id",
  "lead_name",
  "lead_email",
  "lead_phone",
  "sales_rep",
  "booking_date",
  "call_date",
  "booking_status",
  "confirmation_status",
  "show_up_status",
  "call_outcome",
  "close_date",
  "quality_score",
  "upfront_revenue",
]

export default function CallsPage() {
  // UI state
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [sortKey, setSortKey] = useState<SortKey>("booking_date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [page, setPage] = useState(0)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(PRESET_1_COLUMNS)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)
  const [modalErrors, setModalErrors] = useState<{
    lead_name?: string
    hubspot_contact_url?: string
    quality_score?: string
    upfront_revenue?: string
  }>({})
  const [draft, setDraft] = useState<{
    lead_name: string
    lead_email: string
    lead_phone: string
    hubspot_contact_url: string
    sales_rep: string
    booking_date: string
    call_date: string
    booking_status: Call["booking_status"]
    confirmation_status: Call["confirmation_status"]
    show_up_status: Call["show_up_status"]
    call_outcome: Call["call_outcome"]
    close_date: string
    demo_type: Call["demo_type"] | ""
    quality_score: string
    upfront_revenue: string
    call_type: string
    utm_source: string
    utm_medium: string
    utm_campaign: string
    utm_content: string
    zoom_recording_url: string
  } | null>(null)

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

  const openCallModal = (call: Call) => {
    setSelectedCallId(call.id)
    setDraft({
      lead_name: call.lead_name || "",
      lead_email: call.lead_email || "",
      lead_phone: call.lead_phone || "",
      hubspot_contact_url: call.hubspot_contact_url || "",
      sales_rep: call.sales_rep || "",
      booking_date: call.booking_date || "",
      call_date: call.call_date || "",
      booking_status: call.booking_status,
      confirmation_status: call.confirmation_status,
      show_up_status: call.show_up_status,
      call_outcome: call.call_outcome,
      close_date: call.close_date || "",
      demo_type: call.demo_type || "",
      quality_score: call.quality_score?.toString() ?? "",
      upfront_revenue: call.upfront_revenue?.toString() ?? "",
      call_type: call.call_type || "",
      utm_source: call.utm_source || "",
      utm_medium: call.utm_medium || "",
      utm_campaign: call.utm_campaign || "",
      utm_content: call.utm_content || "",
      zoom_recording_url: call.zoom_recording_url || "",
    })
    setModalErrors({})
    setIsModalOpen(true)
  }

  const closeCallModal = () => {
    setIsModalOpen(false)
    setSelectedCallId(null)
    setDraft(null)
    setModalErrors({})
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

  const isLoading = callsLoading || optionsLoading

  // Pagination helpers
  const { rows: calls, totalCount, totalPages } = callsData
  const canGoBack = page > 0
  const canGoForward = page < totalPages - 1
  const selectedCall = calls.find((call) => call.id === selectedCallId) || null

  const handleModalSave = () => {
    if (!selectedCall || !draft) return

    const nextErrors: {
      lead_name?: string
      hubspot_contact_url?: string
      quality_score?: string
      upfront_revenue?: string
    } = {}
    const trimmedName = draft.lead_name.trim()

    if (!trimmedName) {
      nextErrors.lead_name = "Lead name is required."
    }

    const rawHubspot = draft.hubspot_contact_url
    const normalizedHubspot = rawHubspot.trim() ? normalizeHttpUrl(rawHubspot) : null
    if (rawHubspot.trim() && !normalizedHubspot) {
      nextErrors.hubspot_contact_url = "Enter a valid http(s) URL."
    }

    const qualityScoreValue = draft.quality_score.trim()
    const parsedQualityScore = qualityScoreValue === "" ? null : Number(qualityScoreValue)
    if (qualityScoreValue !== "" && (!Number.isFinite(parsedQualityScore) || parsedQualityScore < 1 || parsedQualityScore > 5)) {
      nextErrors.quality_score = "Quality score must be between 1 and 5."
    }

    const upfrontRevenueValue = draft.upfront_revenue.trim()
    const parsedUpfrontRevenue = upfrontRevenueValue === "" ? null : Number(upfrontRevenueValue)
    if (upfrontRevenueValue !== "" && (!Number.isFinite(parsedUpfrontRevenue) || parsedUpfrontRevenue < 0)) {
      nextErrors.upfront_revenue = "Revenue cannot be negative."
    }

    if (Object.keys(nextErrors).length > 0) {
      setModalErrors(nextErrors)
      return
    }

    const updates: {
      lead_name?: string
      lead_email?: string | null
      lead_phone?: string | null
      hubspot_contact_url?: string | null
      sales_rep_id?: number
      booking_date?: string
      call_date?: string
      booking_status?: Call["booking_status"]
      confirmation_status?: Call["confirmation_status"]
      show_up_status?: Call["show_up_status"]
      call_outcome?: Call["call_outcome"]
      close_date?: string | null
      demo_type?: Call["demo_type"]
      quality_score?: number | null
      upfront_revenue?: number | null
      call_type?: string
      utm_source?: string
      utm_medium?: string
      utm_campaign?: string
      utm_content?: string
      zoom_recording_url?: string | null
    } = {}
    if (trimmedName !== selectedCall.lead_name) {
      updates.lead_name = trimmedName
    }

    const emailValue = draft.lead_email === "" ? null : draft.lead_email
    if (emailValue !== selectedCall.lead_email) {
      updates.lead_email = emailValue
    }

    const phoneValue = draft.lead_phone === "" ? null : draft.lead_phone
    if (phoneValue !== selectedCall.lead_phone) {
      updates.lead_phone = phoneValue
    }

    if (normalizedHubspot !== selectedCall.hubspot_contact_url) {
      updates.hubspot_contact_url = normalizedHubspot
    }

    if (draft.sales_rep && draft.sales_rep !== selectedCall.sales_rep) {
      const rep = options.salesReps.find((option) => option.name === draft.sales_rep)
      if (rep) {
        updates.sales_rep_id = rep.id
      }
    }

    if (draft.booking_date !== selectedCall.booking_date) {
      updates.booking_date = draft.booking_date
    }

    if (draft.call_date !== selectedCall.call_date) {
      updates.call_date = draft.call_date
    }

    if (draft.booking_status !== selectedCall.booking_status) {
      updates.booking_status = draft.booking_status
    }

    if (draft.confirmation_status !== selectedCall.confirmation_status) {
      updates.confirmation_status = draft.confirmation_status
    }

    if (draft.show_up_status !== selectedCall.show_up_status) {
      updates.show_up_status = draft.show_up_status
    }

    if (draft.call_outcome !== selectedCall.call_outcome) {
      updates.call_outcome = draft.call_outcome
    }

    const closeDateValue = draft.close_date.trim() === "" ? null : draft.close_date
    if (closeDateValue !== selectedCall.close_date) {
      updates.close_date = closeDateValue
    }

    const demoTypeValue = draft.demo_type === "" ? null : draft.demo_type
    if (demoTypeValue !== selectedCall.demo_type) {
      updates.demo_type = demoTypeValue
    }

    const qualityScoreUpdate = parsedQualityScore === null ? null : Math.min(5, Math.max(1, Math.round(parsedQualityScore)))
    if (qualityScoreUpdate !== selectedCall.quality_score) {
      updates.quality_score = qualityScoreUpdate
    }

    const upfrontRevenueUpdate = parsedUpfrontRevenue === null ? null : Math.max(0, parsedUpfrontRevenue)
    if (upfrontRevenueUpdate !== selectedCall.upfront_revenue) {
      updates.upfront_revenue = upfrontRevenueUpdate
    }

    if (draft.call_type !== selectedCall.call_type) {
      updates.call_type = draft.call_type
    }

    if (draft.utm_source !== selectedCall.utm_source) {
      updates.utm_source = draft.utm_source
    }

    if (draft.utm_medium !== selectedCall.utm_medium) {
      updates.utm_medium = draft.utm_medium
    }

    if (draft.utm_campaign !== selectedCall.utm_campaign) {
      updates.utm_campaign = draft.utm_campaign
    }

    if (draft.utm_content !== selectedCall.utm_content) {
      updates.utm_content = draft.utm_content
    }

    const zoomRecordingValue = draft.zoom_recording_url.trim() === "" ? null : draft.zoom_recording_url
    if (zoomRecordingValue !== selectedCall.zoom_recording_url) {
      updates.zoom_recording_url = zoomRecordingValue
    }

    if (Object.keys(updates).length === 0) {
      closeCallModal()
      return
    }

    updateCallMutation.mutate(
      { id: selectedCall.id, updates },
      {
        onSuccess: () => {
          closeCallModal()
        },
      }
    )
  }

  const columns: Column[] = [
    {
      id: "id",
      label: "ID",
      sortable: "id",
      cellClassName: "font-mono text-xs text-muted-foreground",
      render: (call) => call.id.slice(0, 8),
    },
    {
      id: "lead_name",
      label: "Lead Name",
      sortable: "lead_name",
      render: (call) => (
        <Button
          variant="link"
          className="h-auto p-0 text-left text-foreground"
          onClick={() => openCallModal(call)}
        >
          {call.lead_name || "—"}
        </Button>
      ),
    },
    {
      id: "lead_email",
      label: "Email",
      render: (call) => (
        <span className="text-sm text-muted-foreground">
          {call.lead_email || "—"}
        </span>
      ),
    },
    {
      id: "lead_phone",
      label: "Phone",
      render: (call) => (
        <span className="text-sm text-muted-foreground">
          {call.lead_phone || "—"}
        </span>
      ),
    },
    {
      id: "hubspot_contact_url",
      label: "HubSpot",
      render: (call) => (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {call.hubspot_contact_url || "—"}
          </span>
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
      ),
    },
    {
      id: "sales_rep",
      label: "Sales Rep",
      sortable: "sales_rep",
      render: (call) => (
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
      ),
    },
    {
      id: "booking_date",
      label: "Booking Date",
      sortable: "booking_date",
      render: (call) => (
        <InlineEditInput
          type="date"
          value={call.booking_date}
          onCommit={(v) => handleUpdateCall(call.id, "booking_date", v)}
          className="h-8 w-32 bg-secondary"
          disabled={saving}
        />
      ),
    },
    {
      id: "call_date",
      label: "Call Date",
      sortable: "call_date",
      render: (call) => (
        <InlineEditInput
          type="date"
          value={call.call_date}
          onCommit={(v) => handleUpdateCall(call.id, "call_date", v)}
          className="h-8 w-32 bg-secondary"
          disabled={saving}
        />
      ),
    },
    {
      id: "booking_status",
      label: "Booking Status",
      render: (call) => (
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
      ),
    },
    {
      id: "confirmation_status",
      label: "Confirmation",
      render: (call) => (
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
      ),
    },
    {
      id: "show_up_status",
      label: "Show Up",
      render: (call) => (
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
      ),
    },
    {
      id: "call_outcome",
      label: "Outcome",
      render: (call) => (
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
      ),
    },
    {
      id: "close_date",
      label: "Close Date",
      sortable: "close_date",
      render: (call) => (
        <InlineEditInput
          type="date"
          value={call.close_date || ""}
          onCommit={(v) => handleUpdateCall(call.id, "close_date", v || null)}
          className="h-8 w-32 bg-secondary"
          disabled={saving}
        />
      ),
    },
    {
      id: "demo_type",
      label: "Demo Type",
      render: (call) => (
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
      ),
    },
    {
      id: "quality_score",
      label: "Quality",
      sortable: "quality_score",
      headerClassName: "text-right",
      cellClassName: "text-right",
      render: (call) => (
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
      ),
    },
    {
      id: "upfront_revenue",
      label: "Revenue",
      sortable: "upfront_revenue",
      headerClassName: "text-right",
      cellClassName: "text-right",
      render: (call) => (
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
      ),
    },
    {
      id: "call_type",
      label: "Type",
      sortable: "call_type",
      render: (call) => (
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
      ),
    },
    {
      id: "zoom_recording_url",
      label: "Recording",
      render: (call) => (
        <InlineEditInput
          type="text"
          value={call.zoom_recording_url || ""}
          onCommit={(v) => handleUpdateCall(call.id, "zoom_recording_url", v || null)}
          className="h-8 w-32 bg-secondary text-blue-500"
          disabled={saving}
          placeholder="URL..."
        />
      ),
    },
    {
      id: "utm_source",
      label: "Source",
      sortable: "utm_source",
      render: (call) => (
        options.utmSources.length > 0 ? (
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
        )
      ),
    },
    {
      id: "utm_medium",
      label: "Medium",
      sortable: "utm_medium",
      render: (call) => (
        options.utmMediums.length > 0 ? (
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
        )
      ),
    },
    {
      id: "utm_campaign",
      label: "Campaign",
      sortable: "utm_campaign",
      render: (call) => (
        options.utmCampaigns.length > 0 ? (
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
        )
      ),
    },
    {
      id: "utm_content",
      label: "Content",
      sortable: "utm_content",
      render: (call) => (
        options.utmContents.length > 0 ? (
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
        )
      ),
    },
  ]

  const allColumnIds = columns.map((column) => column.id)
  const visibleColumnSet = new Set(visibleColumns)
  const visibleColumnsOrdered = columns.filter((column) => visibleColumnSet.has(column.id))

  useEffect(() => {
    const stored = localStorage.getItem(COLUMN_STORAGE_KEY)
    if (!stored) return
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        const next = parsed.filter((id) => allColumnIds.includes(id))
        if (next.length > 0) {
          setVisibleColumns(next)
        }
      }
    } catch {
      // ignore invalid stored data
    }
  }, [allColumnIds.join("|")])

  useEffect(() => {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [visibleColumns])

  const updateVisibleColumns = (next: string[]) => {
    setVisibleColumns(next.filter((id) => allColumnIds.includes(id)))
  }

  const handleToggleColumn = (columnId: string, checked: boolean) => {
    setVisibleColumns((prev) => {
      const nextSet = new Set(prev)
      if (checked) {
        nextSet.add(columnId)
      } else {
        nextSet.delete(columnId)
      }
      return allColumnIds.filter((id) => nextSet.has(id))
    })
  }

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

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeCallModal()
          } else {
            setIsModalOpen(true)
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Call Details</DialogTitle>
          </DialogHeader>
          {selectedCall && draft ? (
            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="lead-name">Lead name</Label>
                <Input
                  id="lead-name"
                  value={draft.lead_name}
                  onChange={(e) => {
                    setDraft((prev) =>
                      prev ? { ...prev, lead_name: e.target.value } : prev
                    )
                    if (modalErrors.lead_name) {
                      setModalErrors((prev) => ({ ...prev, lead_name: undefined }))
                    }
                  }}
                  placeholder="Lead name"
                />
                {modalErrors.lead_name && (
                  <p className="text-xs text-destructive">{modalErrors.lead_name}</p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="lead-email">Email</Label>
                  <Input
                    id="lead-email"
                    value={draft.lead_email}
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev ? { ...prev, lead_email: e.target.value } : prev
                      )
                    }
                    placeholder="email@..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lead-phone">Phone</Label>
                  <Input
                    id="lead-phone"
                    value={draft.lead_phone}
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev ? { ...prev, lead_phone: e.target.value } : prev
                      )
                    }
                    placeholder="(555)..."
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="hubspot-url">HubSpot URL</Label>
                  <Input
                    id="hubspot-url"
                    value={draft.hubspot_contact_url}
                    onChange={(e) => {
                      setDraft((prev) =>
                        prev ? { ...prev, hubspot_contact_url: e.target.value } : prev
                      )
                      if (modalErrors.hubspot_contact_url) {
                        setModalErrors((prev) => ({ ...prev, hubspot_contact_url: undefined }))
                      }
                    }}
                    placeholder="https://..."
                  />
                  {modalErrors.hubspot_contact_url && (
                    <p className="text-xs text-destructive">
                      {modalErrors.hubspot_contact_url}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="sales-rep">Sales rep</Label>
                  <Select
                    value={draft.sales_rep}
                    onValueChange={(value) =>
                      setDraft((prev) => (prev ? { ...prev, sales_rep: value } : prev))
                    }
                  >
                    <SelectTrigger id="sales-rep" className="bg-secondary">
                      <SelectValue placeholder="Select rep" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.salesReps.map((rep) => (
                        <SelectItem key={rep.id} value={rep.name}>
                          {rep.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="call-type">Call type</Label>
                  <Select
                    value={draft.call_type}
                    onValueChange={(value) =>
                      setDraft((prev) => (prev ? { ...prev, call_type: value } : prev))
                    }
                  >
                    <SelectTrigger id="call-type" className="bg-secondary">
                      <SelectValue placeholder="Select type" />
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
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="booking-date">Booking date</Label>
                  <Input
                    id="booking-date"
                    type="date"
                    value={draft.booking_date}
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev ? { ...prev, booking_date: e.target.value } : prev
                      )
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="call-date">Call date</Label>
                  <Input
                    id="call-date"
                    type="date"
                    value={draft.call_date}
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev ? { ...prev, call_date: e.target.value } : prev
                      )
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="close-date">Close date</Label>
                  <Input
                    id="close-date"
                    type="date"
                    value={draft.close_date}
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev ? { ...prev, close_date: e.target.value } : prev
                      )
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="demo-type">Demo type</Label>
                  <Select
                    value={draft.demo_type}
                    onValueChange={(value) =>
                      setDraft((prev) => (prev ? { ...prev, demo_type: value } : prev))
                    }
                  >
                    <SelectTrigger id="demo-type" className="bg-secondary">
                      <SelectValue placeholder="Select demo type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="marketing_system_demo">Marketing System</SelectItem>
                      <SelectItem value="inbound_leads_demo">Inbound Leads</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="booking-status">Booking status</Label>
                  <Select
                    value={draft.booking_status}
                    onValueChange={(value) =>
                      setDraft((prev) =>
                        prev ? { ...prev, booking_status: value as Call["booking_status"] } : prev
                      )
                    }
                  >
                    <SelectTrigger id="booking-status" className="bg-secondary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="canceled">Canceled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmation-status">Confirmation</Label>
                  <Select
                    value={draft.confirmation_status}
                    onValueChange={(value) =>
                      setDraft((prev) =>
                        prev
                          ? { ...prev, confirmation_status: value as Call["confirmation_status"] }
                          : prev
                      )
                    }
                  >
                    <SelectTrigger id="confirmation-status" className="bg-secondary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="canceled">Canceled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="show-up-status">Show up</Label>
                  <Select
                    value={draft.show_up_status}
                    onValueChange={(value) =>
                      setDraft((prev) =>
                        prev ? { ...prev, show_up_status: value as Call["show_up_status"] } : prev
                      )
                    }
                  >
                    <SelectTrigger id="show-up-status" className="bg-secondary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="call-outcome">Outcome</Label>
                  <Select
                    value={draft.call_outcome}
                    onValueChange={(value) =>
                      setDraft((prev) =>
                        prev ? { ...prev, call_outcome: value as Call["call_outcome"] } : prev
                      )
                    }
                  >
                    <SelectTrigger id="call-outcome" className="bg-secondary">
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
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="quality-score">Quality score</Label>
                  <Input
                    id="quality-score"
                    type="number"
                    min={1}
                    max={5}
                    value={draft.quality_score}
                    onChange={(e) => {
                      setDraft((prev) =>
                        prev ? { ...prev, quality_score: e.target.value } : prev
                      )
                      if (modalErrors.quality_score) {
                        setModalErrors((prev) => ({ ...prev, quality_score: undefined }))
                      }
                    }}
                    placeholder="1-5"
                  />
                  {modalErrors.quality_score && (
                    <p className="text-xs text-destructive">{modalErrors.quality_score}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="upfront-revenue">Upfront revenue</Label>
                  <Input
                    id="upfront-revenue"
                    type="number"
                    min={0}
                    step={100}
                    value={draft.upfront_revenue}
                    onChange={(e) => {
                      setDraft((prev) =>
                        prev ? { ...prev, upfront_revenue: e.target.value } : prev
                      )
                      if (modalErrors.upfront_revenue) {
                        setModalErrors((prev) => ({ ...prev, upfront_revenue: undefined }))
                      }
                    }}
                    placeholder="0"
                  />
                  {modalErrors.upfront_revenue && (
                    <p className="text-xs text-destructive">{modalErrors.upfront_revenue}</p>
                  )}
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="zoom-recording">Zoom recording URL</Label>
                  <Input
                    id="zoom-recording"
                    value={draft.zoom_recording_url}
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev ? { ...prev, zoom_recording_url: e.target.value } : prev
                      )
                    }
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="utm-source">UTM source</Label>
                  {options.utmSources.length > 0 ? (
                    <Select
                      value={draft.utm_source}
                      onValueChange={(value) =>
                        setDraft((prev) => (prev ? { ...prev, utm_source: value } : prev))
                      }
                    >
                      <SelectTrigger id="utm-source" className="bg-secondary">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {options.utmSources.map((source) => (
                          <SelectItem key={source} value={source}>
                            {source}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="utm-source"
                      value={draft.utm_source}
                      onChange={(e) =>
                        setDraft((prev) =>
                          prev ? { ...prev, utm_source: e.target.value } : prev
                        )
                      }
                    />
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="utm-medium">UTM medium</Label>
                  {options.utmMediums.length > 0 ? (
                    <Select
                      value={draft.utm_medium}
                      onValueChange={(value) =>
                        setDraft((prev) => (prev ? { ...prev, utm_medium: value } : prev))
                      }
                    >
                      <SelectTrigger id="utm-medium" className="bg-secondary">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {options.utmMediums.map((medium) => (
                          <SelectItem key={medium} value={medium}>
                            {medium}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="utm-medium"
                      value={draft.utm_medium}
                      onChange={(e) =>
                        setDraft((prev) =>
                          prev ? { ...prev, utm_medium: e.target.value } : prev
                        )
                      }
                    />
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="utm-campaign">UTM campaign</Label>
                  {options.utmCampaigns.length > 0 ? (
                    <Select
                      value={draft.utm_campaign}
                      onValueChange={(value) =>
                        setDraft((prev) => (prev ? { ...prev, utm_campaign: value } : prev))
                      }
                    >
                      <SelectTrigger id="utm-campaign" className="bg-secondary">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {options.utmCampaigns.map((campaign) => (
                          <SelectItem key={campaign} value={campaign}>
                            {campaign}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="utm-campaign"
                      value={draft.utm_campaign}
                      onChange={(e) =>
                        setDraft((prev) =>
                          prev ? { ...prev, utm_campaign: e.target.value } : prev
                        )
                      }
                    />
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="utm-content">UTM content</Label>
                  {options.utmContents.length > 0 ? (
                    <Select
                      value={draft.utm_content}
                      onValueChange={(value) =>
                        setDraft((prev) => (prev ? { ...prev, utm_content: value } : prev))
                      }
                    >
                      <SelectTrigger id="utm-content" className="bg-secondary">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {options.utmContents.map((content) => (
                          <SelectItem key={content} value={content}>
                            {content}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="utm-content"
                      value={draft.utm_content}
                      onChange={(e) =>
                        setDraft((prev) =>
                          prev ? { ...prev, utm_content: e.target.value } : prev
                        )
                      }
                    />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select a call to edit.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeCallModal} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleModalSave} disabled={saving || !selectedCall || !draft}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Presets</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => updateVisibleColumns(PRESET_1_COLUMNS)}>
                    Preset 1
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => updateVisibleColumns(allColumnIds)}>
                    Select all
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Columns</DropdownMenuLabel>
                  {columns.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={visibleColumnSet.has(column.id)}
                      onCheckedChange={(checked) =>
                        handleToggleColumn(column.id, Boolean(checked))
                      }
                    >
                      {column.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
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
                  {visibleColumnsOrdered.map((column) => (
                    <TableHead key={column.id} className={column.headerClassName}>
                      {column.sortable ? (
                        <SortableHeader column={column.sortable} label={column.label} />
                      ) : (
                        column.label
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call) => (
                  <TableRow key={call.id} className="border-border">
                    {visibleColumnsOrdered.map((column) => (
                      <TableCell key={column.id} className={column.cellClassName}>
                        {column.render(call)}
                      </TableCell>
                    ))}
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

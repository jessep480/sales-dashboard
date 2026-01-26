"use client"

import { useState, useMemo } from "react"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { AddCallModal } from "@/components/dashboard/add-call-modal"
import { useFilteredCalls } from "@/hooks/use-filtered-calls"
import { mockCalls, salesReps } from "@/lib/mock-data"
import type { Filters, Call } from "@/lib/types"
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
  startDate: "2025-01-01",
  endDate: "2025-01-31",
  salesRep: "all",
  utmSource: "all",
  utmMedium: "all",
  utmCampaign: "all",
  utmContent: "all",
}

type SortKey = keyof Call
type SortDirection = "asc" | "desc"

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>(mockCalls)
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [sortKey, setSortKey] = useState<SortKey>("booking_date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

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

  const handleAddCall = (newCall: Call) => {
    setCalls([newCall, ...calls])
  }

  const handleUpdateCall = (id: string, field: keyof Call, value: string | number) => {
    setCalls(
      calls.map((call) => (call.id === id ? { ...call, [field]: value } : call))
    )
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <FilterBar filters={filters} onFiltersChange={setFilters} />
        <AddCallModal onAdd={handleAddCall} />
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">All Calls ({sortedCalls.length})</CardTitle>
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
                      >
                        <SelectTrigger className="h-8 w-32 bg-secondary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {salesReps.map((rep) => (
                            <SelectItem key={rep} value={rep}>
                              {rep}
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

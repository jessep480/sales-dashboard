"use client"

import { useState, useMemo } from "react"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { useFilteredCalls } from "@/hooks/use-filtered-calls"
import { useCalls, useSalesReps } from "@/hooks/use-dashboard-data"
import type { Filters } from "@/lib/types"

// Local type for sales rep data with computed metrics
interface SalesRepMetrics {
  name: string
  totalCalls: number
  callsExclCanceled: number
  canceledCalls: number
  confirmedCalls: number
  showUps: number
  totalRevenue: number
  cancellationRate: number
  confirmationRate: number
  showUpRate: number
}
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

type SortKey = keyof SalesRepMetrics
type SortDirection = "asc" | "desc"

export default function SalesRepsPage() {
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [sortKey, setSortKey] = useState<SortKey>("totalCalls")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  // Fetch data from Supabase
  const { calls: supabaseCalls } = useCalls()
  const { salesReps } = useSalesReps()

  const filteredCalls = useFilteredCalls(supabaseCalls, { ...filters, salesRep: "all" })

  const salesRepData = useMemo(() => {
    const data: SalesRepMetrics[] = salesReps.map((rep) => {
      const repCalls = filteredCalls.filter((c) => c.sales_rep === rep.name)
      const totalCalls = repCalls.length
      const canceledCalls = repCalls.filter((c) => c.booking_status === "canceled").length
      const callsExclCanceled = totalCalls - canceledCalls
      const confirmedCalls = repCalls.filter((c) => c.confirmation_status === "yes").length
      const showUps = repCalls.filter((c) => c.show_up_status === "yes").length
      const totalRevenue = repCalls.reduce((sum, c) => sum + c.upfront_revenue, 0)

      return {
        name: rep.name,
        totalCalls,
        callsExclCanceled,
        canceledCalls,
        confirmedCalls,
        showUps,
        totalRevenue,
        cancellationRate: totalCalls > 0 ? (canceledCalls / totalCalls) * 100 : 0,
        confirmationRate: callsExclCanceled > 0 ? (confirmedCalls / callsExclCanceled) * 100 : 0,
        showUpRate: confirmedCalls > 0 ? (showUps / confirmedCalls) * 100 : 0,
      }
    })

    return data.sort((a, b) => {
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

  const formatPercent = (value: number) => `${value.toFixed(1)}%`

  return (
    <div className="space-y-6">
      <FilterBar filters={filters} onFiltersChange={setFilters} />

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">Sales Rep Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead><SortableHeader column="name" label="Rep Name" /></TableHead>
                  <TableHead className="text-right"><SortableHeader column="totalCalls" label="Total Calls" /></TableHead>
                  <TableHead className="text-right"><SortableHeader column="callsExclCanceled" label="Calls Excl. Canceled" /></TableHead>
                  <TableHead className="text-right"><SortableHeader column="canceledCalls" label="Canceled" /></TableHead>
                  <TableHead className="text-right"><SortableHeader column="confirmedCalls" label="Confirmed" /></TableHead>
                  <TableHead className="text-right"><SortableHeader column="showUps" label="Show Ups" /></TableHead>
                  <TableHead className="text-right"><SortableHeader column="totalRevenue" label="Revenue" /></TableHead>
                  <TableHead className="text-right"><SortableHeader column="cancellationRate" label="Cancel %" /></TableHead>
                  <TableHead className="text-right"><SortableHeader column="confirmationRate" label="Confirm %" /></TableHead>
                  <TableHead className="text-right"><SortableHeader column="showUpRate" label="Show Up %" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesRepData.map((rep) => (
                  <TableRow key={rep.name} className="border-border">
                    <TableCell className="font-medium text-card-foreground">{rep.name}</TableCell>
                    <TableCell className="text-right text-card-foreground">{rep.totalCalls}</TableCell>
                    <TableCell className="text-right text-card-foreground">{rep.callsExclCanceled}</TableCell>
                    <TableCell className="text-right text-card-foreground">{rep.canceledCalls}</TableCell>
                    <TableCell className="text-right text-card-foreground">{rep.confirmedCalls}</TableCell>
                    <TableCell className="text-right text-card-foreground">{rep.showUps}</TableCell>
                    <TableCell className="text-right text-chart-2">{formatCurrency(rep.totalRevenue)}</TableCell>
                    <TableCell className={`text-right ${rep.cancellationRate > 20 ? "text-destructive" : "text-card-foreground"}`}>
                      {formatPercent(rep.cancellationRate)}
                    </TableCell>
                    <TableCell className={`text-right ${rep.confirmationRate >= 70 ? "text-chart-2" : "text-card-foreground"}`}>
                      {formatPercent(rep.confirmationRate)}
                    </TableCell>
                    <TableCell className={`text-right ${rep.showUpRate >= 70 ? "text-chart-2" : "text-card-foreground"}`}>
                      {formatPercent(rep.showUpRate)}
                    </TableCell>
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

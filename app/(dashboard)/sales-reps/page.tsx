"use client"

import { useState, useMemo } from "react"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { useFilteredCalls } from "@/hooks/use-filtered-calls"
import { useCalls, useDropdownOptions, useSalesReps } from "@/hooks/use-dashboard-data"
import type { Filters } from "@/lib/types"

// Local type for sales rep data with computed metrics
interface SalesRepMetrics {
  name: string
  confirmedCalls: number
  showUps: number
  closes: number
  totalRevenue: number
  closeRateOfShowUps: number
  revenuePerShowUp: number
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
import { Users } from "lucide-react"

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

export default function SalesRepsPage() {
  const [filters, setFilters] = useState<Filters>(defaultFilters)

  // Fetch data from Supabase
  const { calls: supabaseCalls } = useCalls()
  const { options } = useDropdownOptions()
  const { salesReps } = useSalesReps()

  const filteredCalls = useFilteredCalls(supabaseCalls, { ...filters, salesRep: "all" })

  const salesRepData = useMemo(() => {
    return salesReps.map((rep) => {
      const repCalls = filteredCalls.filter((c) => c.sales_rep === rep.name)
      const confirmedCalls = repCalls.filter((c) => c.confirmation_status === "yes").length
      const showUps = repCalls.filter((c) => c.show_up_status === "yes").length
      const closes = repCalls.filter((c) => c.call_outcome === "closed_won").length
      const totalRevenue = repCalls.reduce((sum, c) => sum + (c.upfront_revenue ?? 0), 0)
      const closeRateOfShowUps = showUps > 0 ? (closes / showUps) * 100 : 0
      const revenuePerShowUp = showUps > 0 ? totalRevenue / showUps : 0

      return {
        name: rep.name,
        confirmedCalls,
        showUps,
        closes,
        totalRevenue,
        closeRateOfShowUps,
        revenuePerShowUp,
      }
    }).sort((a, b) => b.totalRevenue - a.totalRevenue)
  }, [filteredCalls, salesReps])

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
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        showSalesRepFilter={false}
        utmSources={options.utmSources}
        utmMediums={options.utmMediums}
        utmCampaigns={options.utmCampaigns}
        utmContents={options.utmContents}
      />

      {/* Sales Rep Cards Overview */}
      <section className="rounded-xl bg-secondary/30 p-6">
        <h2 className="text-lg font-semibold text-foreground mb-5">Sales Rep Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 justify-items-center">
          {salesRepData.map((rep) => (
            <Card key={rep.name} className="w-full max-w-[240px] border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-card-foreground">{rep.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Featured Revenue Metric */}
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-chart-2">
                    {formatCurrency(rep.totalRevenue)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Total Revenue</div>
                </div>
                
                {/* Secondary Metrics 2x2 Grid */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div className="text-center">
                    <div className="text-xl font-semibold text-card-foreground">{rep.showUps}</div>
                    <div className="text-xs text-muted-foreground">Show Ups</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-semibold text-card-foreground">{rep.closes}</div>
                    <div className="text-xs text-muted-foreground">Closes</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-xl font-semibold ${rep.closeRateOfShowUps >= 50 ? "text-chart-2" : "text-card-foreground"}`}>
                      {formatPercent(rep.closeRateOfShowUps)}
                    </div>
                    <div className="text-xs text-muted-foreground">Close Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-semibold text-card-foreground">
                      {formatCurrency(rep.revenuePerShowUp)}
                    </div>
                    <div className="text-xs text-muted-foreground">Rev/Show Up</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-secondary/30 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Sales Rep Performance</h2>
        </div>
        <Card className="border-border bg-card">
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Rep Name</TableHead>
                  <TableHead className="text-right text-muted-foreground">Confirmed</TableHead>
                  <TableHead className="text-right text-muted-foreground">Show Ups</TableHead>
                  <TableHead className="text-right text-muted-foreground">Closes</TableHead>
                  <TableHead className="text-right text-muted-foreground">Close Rate</TableHead>
                  <TableHead className="text-right text-muted-foreground">Revenue</TableHead>
                  <TableHead className="text-right text-muted-foreground">Rev/Show Up</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesRepData.map((rep) => (
                  <TableRow key={rep.name} className="border-border">
                    <TableCell className="font-medium text-card-foreground">{rep.name}</TableCell>
                    <TableCell className="text-right text-card-foreground">{rep.confirmedCalls}</TableCell>
                    <TableCell className="text-right text-card-foreground">{rep.showUps}</TableCell>
                    <TableCell className="text-right text-card-foreground">{rep.closes}</TableCell>
                    <TableCell className={`text-right ${rep.closeRateOfShowUps >= 50 ? "text-chart-2" : "text-card-foreground"}`}>
                      {formatPercent(rep.closeRateOfShowUps)}
                    </TableCell>
                    <TableCell className="text-right text-chart-2">{formatCurrency(rep.totalRevenue)}</TableCell>
                    <TableCell className="text-right text-card-foreground">{formatCurrency(rep.revenuePerShowUp)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

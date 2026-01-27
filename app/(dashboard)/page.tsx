"use client"

import { useState, useMemo } from "react"
import { MetricCard } from "@/components/dashboard/metric-card"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { useFilteredCalls, useMetrics } from "@/hooks/use-filtered-calls"
import { useDashboardStats, useCalls, useSalesReps } from "@/hooks/use-dashboard-data"
import { mockCalls, salesReps as mockSalesReps } from "@/lib/mock-data"
import type { Filters } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Phone,
  PhoneOff,
  CalendarCheck,
  UserCheck,
  CheckCircle,
  DollarSign,
  XCircle,
  Percent,
  TrendingUp,
  Users,
} from "lucide-react"

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

export default function DashboardPage() {
  const [filters, setFilters] = useState<Filters>(defaultFilters)

  // Fetch data from Supabase
  const { stats, loading: statsLoading, error: statsError } = useDashboardStats()
  const { calls: supabaseCalls, loading: callsLoading } = useCalls()
  const { salesReps: supabaseSalesReps, loading: repsLoading } = useSalesReps()

  // Use Supabase data if available, otherwise fall back to mock data
  const calls = supabaseCalls.length > 0 ? supabaseCalls : mockCalls
  const salesReps = supabaseSalesReps.length > 0 ? supabaseSalesReps : mockSalesReps

  const filteredCalls = useFilteredCalls(calls, filters)
  const metrics = useMetrics(filteredCalls)

  const salesRepData = useMemo(() => {
    return salesReps.map((rep) => {
      const repCalls = filteredCalls.filter((c) => c.sales_rep === rep)
      const confirmedCalls = repCalls.filter((c) => c.confirmation_status === "yes").length
      const showUps = repCalls.filter((c) => c.show_up_status === "yes").length
      const closes = repCalls.filter((c) => c.close_status === "yes").length
      const totalRevenue = repCalls.reduce((sum, c) => sum + c.upfront_revenue, 0)
      const closeRateOfShowUps = showUps > 0 ? (closes / showUps) * 100 : 0
      const revenuePerShowUp = showUps > 0 ? totalRevenue / showUps : 0

      return {
        name: rep,
        confirmedCalls,
        showUps,
        closes,
        closeRateOfShowUps,
        totalRevenue,
        revenuePerShowUp,
      }
    }).sort((a, b) => b.totalRevenue - a.totalRevenue)
  }, [filteredCalls])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const isLoading = statsLoading || callsLoading || repsLoading

  return (
    <div className="space-y-8">
      <FilterBar filters={filters} onFiltersChange={setFilters} />

      {statsError && (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
          Error loading data: {statsError}. Showing mock data instead.
        </div>
      )}

      {/* Key Metrics Section */}
      <section className="rounded-xl bg-secondary/30 p-6">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Key Metrics</h2>
        </div>
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-6">
          <MetricCard
            title="Total Calls"
            value={metrics.totalCalls}
            subtitle="All calls including canceled"
            icon={<Phone className="h-4 w-4" />}
            size="large"
          />
          <MetricCard
            title="Calls Excl. Canceled"
            value={metrics.callsExclCanceled}
            subtitle="Scheduled calls only"
            icon={<PhoneOff className="h-4 w-4" />}
            size="large"
          />
          <MetricCard
            title="Confirmed Calls"
            value={metrics.confirmedCalls}
            subtitle="Confirmed appointments"
            icon={<CalendarCheck className="h-4 w-4" />}
            size="large"
          />
          <MetricCard
            title="Show Ups"
            value={metrics.showUps}
            subtitle="Attended calls"
            icon={<UserCheck className="h-4 w-4" />}
            size="large"
          />
          <MetricCard
            title="Closes"
            value={metrics.closes}
            subtitle="Successful deals"
            icon={<CheckCircle className="h-4 w-4" />}
            size="large"
          />
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(metrics.totalRevenue)}
            subtitle="From closed deals"
            valueClassName="text-chart-2"
            icon={<DollarSign className="h-4 w-4" />}
            size="large"
          />
        </div>
      </section>

      {/* Conversion Rates Section */}
      <section className="rounded-xl bg-card border border-border p-6">
        <div className="flex items-center gap-2 mb-5">
          <Percent className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Conversion Rates</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
          <MetricCard
            title="Cancellation Rate"
            value={formatPercent(metrics.cancellationRate)}
            subtitle="% of total calls"
            valueClassName={metrics.cancellationRate > 20 ? "text-destructive" : "text-chart-2"}
            icon={<XCircle className="h-4 w-4" />}
          />
          <MetricCard
            title="Confirmation Rate"
            value={formatPercent(metrics.confirmationRate)}
            subtitle="% of non-canceled"
            valueClassName={metrics.confirmationRate >= 70 ? "text-chart-2" : "text-chart-3"}
            icon={<CalendarCheck className="h-4 w-4" />}
          />
          <MetricCard
            title="Show Up Rate (of Confirmed)"
            value={formatPercent(metrics.showUpRateOfConfirmed)}
            subtitle="Show Ups / Confirmed"
            valueClassName={metrics.showUpRateOfConfirmed >= 70 ? "text-chart-2" : "text-chart-3"}
            icon={<UserCheck className="h-4 w-4" />}
          />
          <MetricCard
            title="Show Rate (of Calls)"
            value={formatPercent(metrics.showRateOfCalls)}
            subtitle="Show Ups / Excl. Canceled"
            valueClassName={metrics.showRateOfCalls >= 50 ? "text-chart-2" : "text-chart-3"}
            icon={<UserCheck className="h-4 w-4" />}
          />
          <MetricCard
            title="Close Rate (of Show Ups)"
            value={formatPercent(metrics.closeRateOfShowUps)}
            subtitle="Closes / Show Ups"
            valueClassName={metrics.closeRateOfShowUps >= 50 ? "text-chart-2" : "text-chart-3"}
            icon={<CheckCircle className="h-4 w-4" />}
          />
          <MetricCard
            title="Close Rate (of Calls)"
            value={formatPercent(metrics.closeRateOfCalls)}
            subtitle="Closes / Excl. Canceled"
            valueClassName={metrics.closeRateOfCalls >= 30 ? "text-chart-2" : "text-chart-3"}
            icon={<CheckCircle className="h-4 w-4" />}
          />
          <MetricCard
            title="Revenue per Show Up"
            value={formatCurrency(metrics.revenuePerShowUp)}
            subtitle="Avg revenue per attended"
            valueClassName="text-chart-2"
            icon={<DollarSign className="h-4 w-4" />}
          />
        </div>
      </section>

      {/* Sales Rep Performance Section */}
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

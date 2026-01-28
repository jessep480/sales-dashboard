"use client"

import { useMemo } from "react"
import type { Call, Filters } from "@/lib/types"

export function useFilteredCalls(calls: Call[], filters: Filters) {
  return useMemo(() => {
    return calls.filter((call) => {
      const dateField = filters.dateType === "booking_date" ? call.booking_date : call.call_date

      if (filters.startDate && dateField < filters.startDate) return false
      if (filters.endDate && dateField > filters.endDate) return false
      if (filters.salesRep !== "all" && call.sales_rep !== filters.salesRep) return false
      if (filters.utmSource !== "all" && call.utm_source !== filters.utmSource) return false
      if (filters.utmMedium !== "all" && call.utm_medium !== filters.utmMedium) return false
      if (filters.utmCampaign !== "all" && call.utm_campaign !== filters.utmCampaign) return false
      if (filters.utmContent !== "all" && call.utm_content !== filters.utmContent) return false

      return true
    })
  }, [calls, filters])
}

export function useMetrics(calls: Call[]) {
  return useMemo(() => {
    const totalCalls = calls.length
    const canceledCalls = calls.filter((c) => c.booking_status === "canceled").length
    const callsExclCanceled = totalCalls - canceledCalls
    const confirmedCalls = calls.filter((c) => c.confirmation_status === "yes").length
    const showUps = calls.filter((c) => c.show_up_status === "yes").length
    const closes = calls.filter((c) => c.call_outcome === "closed_won").length
    const totalRevenue = calls.reduce((sum, c) => sum + (c.upfront_revenue ?? 0), 0)

    const cancellationRate = totalCalls > 0 ? (canceledCalls / totalCalls) * 100 : 0
    const confirmationRate = callsExclCanceled > 0 ? (confirmedCalls / callsExclCanceled) * 100 : 0
    const showUpRateOfConfirmed = confirmedCalls > 0 ? (showUps / confirmedCalls) * 100 : 0
    const showRateOfCalls = callsExclCanceled > 0 ? (showUps / callsExclCanceled) * 100 : 0
    const closeRateOfShowUps = showUps > 0 ? (closes / showUps) * 100 : 0
    const closeRateOfCalls = callsExclCanceled > 0 ? (closes / callsExclCanceled) * 100 : 0
    const revenuePerShowUp = showUps > 0 ? totalRevenue / showUps : 0

    return {
      totalCalls,
      callsExclCanceled,
      confirmedCalls,
      showUps,
      closes,
      totalRevenue,
      cancellationRate,
      confirmationRate,
      showUpRateOfConfirmed,
      showRateOfCalls,
      closeRateOfShowUps,
      closeRateOfCalls,
      revenuePerShowUp,
    }
  }, [calls])
}

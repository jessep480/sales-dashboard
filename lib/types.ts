export interface Lead {
  id: string
  name: string
  email: string
  phone: string
  lead_source: string
  hubspot_id: string
  created_at: string
}

export interface Call {
  id: string
  lead_id: string
  lead_name: string
  sales_rep: string
  booking_date: string
  call_date: string
  booking_status: "scheduled" | "canceled"
  confirmation_status: "pending" | "yes" | "no"
  show_up_status: "pending" | "yes" | "no"
  call_outcome: "pending" | "closed_won" | "closed_lost" | "no_show"
  quality_score: number
  upfront_revenue: number
  call_type: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_content: string
}

export interface SalesRep {
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

export interface Filters {
  dateType: "booking_date" | "call_date"
  startDate: string
  endDate: string
  salesRep: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmContent: string
}
